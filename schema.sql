


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_move_logic"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  opp_ships jsonb;
  ship record;
  is_hit_res boolean := false;
  is_sunk boolean := true;
  i int;
  sx int; sy int;
begin
  select ships_data into opp_ships
  from public.game_boards
  where game_id = NEW.game_id and user_id != NEW.user_id
  limit 1;

  for ship in
    select * from jsonb_to_recordset(opp_ships)
      as x(size int, x int, y int, "isHorizontal" boolean, name text)
  loop
    is_hit_res := false;
    for i in 0..(ship.size - 1) loop
      sx := case when ship."isHorizontal" then ship.x + i else ship.x end;
      sy := case when ship."isHorizontal" then ship.y else ship.y + i end;
      if (sx = NEW.x and sy = NEW.y) then is_hit_res := true; end if;
    end loop;

    if is_hit_res then
      NEW.is_hit := true;
      is_sunk := true;

      for i in 0..(ship.size - 1) loop
        sx := case when ship."isHorizontal" then ship.x + i else ship.x end;
        sy := case when ship."isHorizontal" then ship.y else ship.y + i end;

        if not (sx = NEW.x and sy = NEW.y) and not exists (
          select 1 from public.moves
          where game_id = NEW.game_id and user_id = NEW.user_id
            and x = sx and y = sy and is_hit = true
        ) then
          is_sunk := false;
        end if;
      end loop;

      if is_sunk then
        NEW.sunk_ship_name := ship.name;
      end if;

      return NEW;
    end if;
  end loop;

  NEW.is_hit := false;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."check_move_logic"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_stale_games"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  waiting_ttl bigint := public.game_lifecycle_get('waiting_ttl', 172800);
  setup_ttl bigint := public.game_lifecycle_get('setup_ttl', 172800);
  playing_ttl bigint := public.game_lifecycle_get('playing_ttl', 172800);
  finished_ttl bigint := public.game_lifecycle_get('finished_ttl', 604800);
  games_ttl bigint := public.game_lifecycle_get('games_ttl', 2592000);
  deleted_waiting int := 0;
  deleted_setup int := 0;
  deleted_playing int := 0;
  deleted_finished int := 0;
  deleted_inactive int := 0;
begin
  with d as (
    delete from public.games
    where status = 'waiting'
      and updated_at < now() - make_interval(secs => waiting_ttl)
    returning 1
  )
  select count(*)::int into deleted_waiting from d;

  with d as (
    delete from public.games
    where status = 'setup'
      and updated_at < now() - make_interval(secs => setup_ttl)
    returning 1
  )
  select count(*)::int into deleted_setup from d;

  with d as (
    delete from public.games
    where status = 'playing'
      and updated_at < now() - make_interval(secs => playing_ttl)
    returning 1
  )
  select count(*)::int into deleted_playing from d;

  with d as (
    delete from public.games
    where status = 'finished'
      and updated_at < now() - make_interval(secs => finished_ttl)
    returning 1
  )
  select count(*)::int into deleted_finished from d;

  -- Catch-all: mọi status không update quá games_ttl (~1 tháng)
  with d as (
    delete from public.games
    where updated_at < now() - make_interval(secs => games_ttl)
    returning 1
  )
  select count(*)::int into deleted_inactive from d;

  -- match_results theo ON DELETE CASCADE từ games

  return jsonb_build_object(
    'deleted_waiting', deleted_waiting,
    'deleted_setup', deleted_setup,
    'deleted_playing', deleted_playing,
    'deleted_finished', deleted_finished,
    'deleted_inactive_games', deleted_inactive,
    'waiting_ttl', waiting_ttl,
    'setup_ttl', setup_ttl,
    'playing_ttl', playing_ttl,
    'finished_ttl', finished_ttl,
    'games_ttl', games_ttl
  );
end;
$$;


ALTER FUNCTION "public"."cleanup_stale_games"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_disconnected_leave"("p_game_id" "uuid", "p_force" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  leaving_id text;
  until_ts timestamptz;
begin
  select disconnected_user_id, reconnect_until
    into leaving_id, until_ts
  from public.games
  where id = p_game_id
  for update;

  if leaving_id is null then
    return;
  end if;

  if not p_force and until_ts > now() then
    return;
  end if;

  update public.games
  set disconnected_user_id = null, reconnect_until = null
  where id = p_game_id;

  perform public.forfeit_game_on_leave(p_game_id);
  perform public.leave_game_room(p_game_id, leaving_id);

  update public.games
  set
    status = 'waiting',
    current_turn = null,
    winner_id = null,
    ready_members = '{}',
    disconnected_user_id = null,
    reconnect_until = null,
    updated_at = now()
  where id = p_game_id;
end;
$$;


ALTER FUNCTION "public"."finalize_disconnected_leave"("p_game_id" "uuid", "p_force" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finish_game"("p_game_id" "uuid", "p_winner_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  player_ids text[];
  g public.games%rowtype;
begin
  select * into g
  from public.games
  where id = p_game_id
  for update;

  if not found then
    return;
  end if;

  -- Chỉ kết thúc khi đang chơi (idempotent nếu đã về waiting / setup).
  if g.status is distinct from 'playing' then
    return;
  end if;

  select array_agg(user_id) into player_ids
  from public.game_boards where game_id = p_game_id;

  if player_ids is null then
    player_ids := coalesce(g.members, '{}'::text[]);
  end if;

  update public.profiles
  set total_games = total_games + 1,
      updated_at = now()
  where id = any(player_ids);

  if p_winner_id is not null then
    update public.profiles
    set wins = wins + 1
    where id = p_winner_id;
  end if;

  insert into public.match_results (
    game_id,
    room_code,
    room_name,
    host_id,
    members,
    winner_id,
    game_mode,
    finished_at
  )
  values (
    g.id,
    g.room_code,
    g.room_name,
    g.host_id,
    coalesce(g.members, '{}'::text[]),
    p_winner_id,
    coalesce(g.game_mode, '1vs1'),
    now()
  );

  delete from public.moves where game_id = p_game_id;
  delete from public.game_boards where game_id = p_game_id;

  -- Đóng trận → waiting: giữ room_code / members / host; giữ winner_id để client hiện Modal.
  update public.games
  set status = 'waiting',
      winner_id = p_winner_id,
      current_turn = null,
      ready_members = '{}'::text[],
      disconnected_user_id = null,
      reconnect_until = null,
      updated_at = now()
  where id = p_game_id;
end;
$$;


ALTER FUNCTION "public"."finish_game"("p_game_id" "uuid", "p_winner_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."forfeit_game_on_leave"("p_game_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  member_ids text[];
begin
  select members into member_ids
  from public.games
  where id = p_game_id;

  if member_ids is null or cardinality(member_ids) = 0 then
    return;
  end if;

  update public.profiles
  set total_games = total_games + 1,
      updated_at = now()
  where id = any(member_ids);

  delete from public.moves where game_id = p_game_id;
  delete from public.game_boards where game_id = p_game_id;
end;
$$;


ALTER FUNCTION "public"."forfeit_game_on_leave"("p_game_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."game_lifecycle_get"("p_key" "text", "p_default" bigint) RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select value from public.game_lifecycle where key = p_key),
    p_default
  );
$$;


ALTER FUNCTION "public"."game_lifecycle_get"("p_key" "text", "p_default" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_game_room"("room_id" "uuid", "new_user_id" "text", "p_password" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  g public.games%rowtype;
  members_count int;
  max_1vs1 bigint := public.game_lifecycle_get('max_members_1vs1', 2);
  expected text;
begin
  select * into g
  from public.games
  where id = room_id
  for update;

  if not found then
    raise exception 'room_not_found';
  end if;

  if g.host_id = new_user_id or (g.members @> array[new_user_id]) then
    return;
  end if;

  if g.status is distinct from 'waiting' then
    raise exception 'Phòng đã bắt đầu (đang dàn trận hoặc chiến đấu).';
  end if;

  expected := nullif(btrim(coalesce(g.room_password, '')), '');
  if expected is not null then
    if nullif(btrim(coalesce(p_password, '')), '') is distinct from expected then
      raise exception 'Sai mật khẩu phòng.';
    end if;
  end if;

  members_count := coalesce(array_length(g.members, 1), 0);

  if coalesce(g.game_mode, '1vs1') = '1vs1' and members_count >= max_1vs1 then
    raise exception 'Phòng (1vs1) đã đủ % người.', max_1vs1;
  end if;

  update public.games
  set members = array_append(members, new_user_id),
      updated_at = now()
  where id = room_id
    and not (members @> array[new_user_id]);
end;
$$;


ALTER FUNCTION "public"."join_game_room"("room_id" "uuid", "new_user_id" "text", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."leave_game_room"("room_id" "uuid", "leaving_user_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  remaining text[];
  remaining_ready text[];
  current_host text;
begin
  select members, ready_members, host_id
    into remaining, remaining_ready, current_host
  from public.games
  where id = room_id
  for update;

  if not found then
    return;
  end if;

  remaining := array_remove(coalesce(remaining, '{}'::text[]), leaving_user_id);
  remaining_ready := array_remove(coalesce(remaining_ready, '{}'::text[]), leaving_user_id);

  if cardinality(remaining) = 0 then
    delete from public.games where id = room_id;
    return;
  end if;

  update public.games
  set
    members = remaining,
    ready_members = remaining_ready,
    host_id = case
      when current_host = leaving_user_id then remaining[1]
      else current_host
    end,
    updated_at = now()
  where id = room_id;
end;
$$;


ALTER FUNCTION "public"."leave_game_room"("room_id" "uuid", "leaving_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconnect_to_game"("p_game_id" "uuid", "p_user_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ok boolean := false;
begin
  update public.games
  set
    disconnected_user_id = null,
    reconnect_until = null,
    updated_at = now()
  where id = p_game_id
    and disconnected_user_id = p_user_id
    and reconnect_until > now()
    and p_user_id = any(members);

  ok := found;
  return ok;
end;
$$;


ALTER FUNCTION "public"."reconnect_to_game"("p_game_id" "uuid", "p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_leave_with_reconnect"("p_game_id" "uuid", "p_user_id" "text", "p_grace_seconds" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  grace int;
begin
  grace := coalesce(
    p_grace_seconds,
    public.game_lifecycle_get('reconnect_grace', 30)::int
  );

  update public.games
  set
    disconnected_user_id = p_user_id,
    reconnect_until = now() + make_interval(secs => greatest(grace, 1)),
    updated_at = now()
  where id = p_game_id
    and status = 'playing'
    and p_user_id = any(members);
end;
$$;


ALTER FUNCTION "public"."request_leave_with_reconnect"("p_game_id" "uuid", "p_user_id" "text", "p_grace_seconds" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."game_boards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "ships_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "hits_taken" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_ready" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."game_boards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_lifecycle" (
    "key" "text" NOT NULL,
    "value" bigint NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unit" "text" NOT NULL,
    CONSTRAINT "game_lifecycle_unit_check" CHECK (("unit" = ANY (ARRAY['seconds'::"text", 'count'::"text"])))
);


ALTER TABLE "public"."game_lifecycle" OWNER TO "postgres";


COMMENT ON COLUMN "public"."game_lifecycle"."unit" IS 'seconds = thời gian; count = số lượng (vd. max members)';



CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_name" "text" DEFAULT 'BattleShip'::"text" NOT NULL,
    "room_code" "text",
    "host_id" "text",
    "members" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "current_turn" "text",
    "winner_id" "text",
    "game_mode" "text" DEFAULT '1vs1'::"text" NOT NULL,
    "ready_members" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "disconnected_user_id" "text",
    "reconnect_until" timestamp with time zone,
    "room_password" "text",
    "has_password" boolean GENERATED ALWAYS AS ((("room_password" IS NOT NULL) AND ("btrim"("room_password") <> ''::"text"))) STORED,
    CONSTRAINT "games_game_mode_check" CHECK (("game_mode" = ANY (ARRAY['1vs1'::"text", 'team'::"text"]))),
    CONSTRAINT "games_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'setup'::"text", 'playing'::"text", 'finished'::"text"])))
);


ALTER TABLE "public"."games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "room_code" "text",
    "room_name" "text",
    "host_id" "text",
    "members" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "winner_id" "text",
    "game_mode" "text" DEFAULT '1vs1'::"text" NOT NULL,
    "finished_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moves" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "x" integer NOT NULL,
    "y" integer NOT NULL,
    "is_hit" boolean DEFAULT false NOT NULL,
    "sunk_ship_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "moves_x_check" CHECK ((("x" >= 0) AND ("x" < 10))),
    CONSTRAINT "moves_y_check" CHECK ((("y" >= 0) AND ("y" < 10)))
);


ALTER TABLE "public"."moves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "text" NOT NULL,
    "telegram_id" "text",
    "username" "text",
    "avatar_url" "text",
    "first_name" "text",
    "last_name" "text",
    "telegram_username" "text",
    "language_code" "text",
    "is_premium" boolean,
    "allows_write_to_pm" boolean,
    "wins" integer DEFAULT 0 NOT NULL,
    "total_games" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."game_boards"
    ADD CONSTRAINT "game_boards_game_id_user_id_key" UNIQUE ("game_id", "user_id");



ALTER TABLE ONLY "public"."game_boards"
    ADD CONSTRAINT "game_boards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_lifecycle"
    ADD CONSTRAINT "game_lifecycle_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_telegram_id_key" UNIQUE ("telegram_id");



CREATE UNIQUE INDEX "games_room_code_uidx" ON "public"."games" USING "btree" ("room_code") WHERE ("room_code" IS NOT NULL);



CREATE INDEX "idx_game_boards_game_id" ON "public"."game_boards" USING "btree" ("game_id");



CREATE INDEX "idx_games_status_created" ON "public"."games" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_moves_game_id" ON "public"."moves" USING "btree" ("game_id");



CREATE INDEX "match_results_finished_at_idx" ON "public"."match_results" USING "btree" ("finished_at" DESC);



CREATE INDEX "match_results_game_id_idx" ON "public"."match_results" USING "btree" ("game_id");



CREATE UNIQUE INDEX "profiles_telegram_id_uidx" ON "public"."profiles" USING "btree" ("telegram_id") WHERE ("telegram_id" IS NOT NULL);



CREATE UNIQUE INDEX "unique_waiting_room_per_user" ON "public"."games" USING "btree" ("host_id") WHERE ("status" = 'waiting'::"text");



CREATE OR REPLACE TRIGGER "trigger_check_hit" BEFORE INSERT ON "public"."moves" FOR EACH ROW EXECUTE FUNCTION "public"."check_move_logic"();



ALTER TABLE ONLY "public"."game_boards"
    ADD CONSTRAINT "game_boards_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_results"
    ADD CONSTRAINT "match_results_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



CREATE POLICY "anon_game_boards_all" ON "public"."game_boards" USING (true) WITH CHECK (true);



CREATE POLICY "anon_game_lifecycle_select" ON "public"."game_lifecycle" FOR SELECT USING (true);



CREATE POLICY "anon_games_all" ON "public"."games" USING (true) WITH CHECK (true);



CREATE POLICY "anon_match_results_select" ON "public"."match_results" FOR SELECT USING (true);



CREATE POLICY "anon_moves_all" ON "public"."moves" USING (true) WITH CHECK (true);



CREATE POLICY "anon_profiles_all" ON "public"."profiles" USING (true) WITH CHECK (true);



ALTER TABLE "public"."game_boards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_lifecycle" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."game_boards";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."games";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."moves";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_move_logic"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_move_logic"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_move_logic"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_stale_games"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_stale_games"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_stale_games"() TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_disconnected_leave"("p_game_id" "uuid", "p_force" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_disconnected_leave"("p_game_id" "uuid", "p_force" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_disconnected_leave"("p_game_id" "uuid", "p_force" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."finish_game"("p_game_id" "uuid", "p_winner_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."finish_game"("p_game_id" "uuid", "p_winner_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finish_game"("p_game_id" "uuid", "p_winner_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."forfeit_game_on_leave"("p_game_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."forfeit_game_on_leave"("p_game_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."forfeit_game_on_leave"("p_game_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."game_lifecycle_get"("p_key" "text", "p_default" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."game_lifecycle_get"("p_key" "text", "p_default" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."game_lifecycle_get"("p_key" "text", "p_default" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."join_game_room"("room_id" "uuid", "new_user_id" "text", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."join_game_room"("room_id" "uuid", "new_user_id" "text", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_game_room"("room_id" "uuid", "new_user_id" "text", "p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."leave_game_room"("room_id" "uuid", "leaving_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_game_room"("room_id" "uuid", "leaving_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_game_room"("room_id" "uuid", "leaving_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reconnect_to_game"("p_game_id" "uuid", "p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reconnect_to_game"("p_game_id" "uuid", "p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reconnect_to_game"("p_game_id" "uuid", "p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_leave_with_reconnect"("p_game_id" "uuid", "p_user_id" "text", "p_grace_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."request_leave_with_reconnect"("p_game_id" "uuid", "p_user_id" "text", "p_grace_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_leave_with_reconnect"("p_game_id" "uuid", "p_user_id" "text", "p_grace_seconds" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."game_boards" TO "anon";
GRANT ALL ON TABLE "public"."game_boards" TO "authenticated";
GRANT ALL ON TABLE "public"."game_boards" TO "service_role";



GRANT ALL ON TABLE "public"."game_lifecycle" TO "anon";
GRANT ALL ON TABLE "public"."game_lifecycle" TO "authenticated";
GRANT ALL ON TABLE "public"."game_lifecycle" TO "service_role";



GRANT ALL ON TABLE "public"."games" TO "anon";
GRANT ALL ON TABLE "public"."games" TO "authenticated";
GRANT ALL ON TABLE "public"."games" TO "service_role";



GRANT ALL ON TABLE "public"."match_results" TO "anon";
GRANT ALL ON TABLE "public"."match_results" TO "authenticated";
GRANT ALL ON TABLE "public"."match_results" TO "service_role";



GRANT ALL ON TABLE "public"."moves" TO "anon";
GRANT ALL ON TABLE "public"."moves" TO "authenticated";
GRANT ALL ON TABLE "public"."moves" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































