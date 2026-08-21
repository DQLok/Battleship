import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchGameLifecycleSettings } from "@/api/gameLifecycle";
import {
  GAME_LIFECYCLE_DEFAULTS,
  type GameLifecycleKey,
  type GameLifecycleSettings,
} from "@/constants/game-lifecycle";

type GameLifecycleContextValue = {
  settings: GameLifecycleSettings;
  /** true after first fetch attempt (success or fallback) */
  loaded: boolean;
  get: (key: GameLifecycleKey) => number;
};

const GameLifecycleContext = createContext<GameLifecycleContextValue>({
  settings: { ...GAME_LIFECYCLE_DEFAULTS },
  loaded: false,
  get: (key) => GAME_LIFECYCLE_DEFAULTS[key],
});

export const GameLifecycleProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<GameLifecycleSettings>({
    ...GAME_LIFECYCLE_DEFAULTS,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await fetchGameLifecycleSettings();
      if (!cancelled) {
        setSettings(next);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GameLifecycleContext.Provider
      value={{
        settings,
        loaded,
        get: (key) => settings[key] ?? GAME_LIFECYCLE_DEFAULTS[key],
      }}
    >
      {children}
    </GameLifecycleContext.Provider>
  );
};

export const useGameLifecycle = () => useContext(GameLifecycleContext);
