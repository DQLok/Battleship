import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const mode = process.argv[2];

if (mode !== "dev" && mode !== "prod") {
  console.error("Usage: node scripts/launch.mjs <dev|prod>");
  process.exit(1);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${signal || code}`));
    });
  });
}

if (mode === "dev") {
  console.log("[launcher] dev → app local + Supabase local http://127.0.0.1:54331");
  await run("supabase", ["start"]);
  await run(process.execPath, [
    viteBin,
    "--mode",
    "development",
    "--port",
    "5173",
    "--strictPort",
  ]);
} else {
  console.log(
    "[launcher] prod → app local + Supabase cloud https://ngitfkvcrkrhwmxyefhu.supabase.co",
  );
  await run(process.execPath, [
    viteBin,
    "--mode",
    "production",
    "--port",
    "5173",
    "--strictPort",
  ]);
}
