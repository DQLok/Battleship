import { copyFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const indexHtml = path.join(dist, "index.html");
const config = path.join(root, "fbapp-config.json");
const zipPath = path.join(root, "battleship-instant.zip");

if (!existsSync(indexHtml)) {
  console.error(
    "dist/index.html is missing. Build the web bundle first, then run npm run bundle:meta.",
  );
  process.exit(1);
}

if (!existsSync(config)) {
  console.error("fbapp-config.json is missing at the repo root.");
  process.exit(1);
}

copyFileSync(config, path.join(dist, "fbapp-config.json"));
rmSync(zipPath, { force: true });

execFileSync("zip", ["-r", "-X", zipPath, "."], {
  cwd: dist,
  stdio: "inherit",
});

console.log(`Wrote ${zipPath} with index.html and fbapp-config.json at the zip root.`);
