/**
 * Launches `next build` with NODE_OPTIONS.
 * Picks a real Node binary when the runner is Bun’s Windows shim (avoids Next workers crashing).
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

function systemNode() {
  const pf = process.env["ProgramFiles"] || "C:\\Program Files";
  const pfx = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  for (const p of [join(pf, "nodejs", "node.exe"), join(pfx, "nodejs", "node.exe")]) {
    if (existsSync(p)) return p;
  }
  try {
    if (process.platform === "win32") {
      const lines = execSync("where.exe node", { encoding: "utf8" })
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const pick = lines.find(
        (line) => !/bun-node|\.bun[/\\]/i.test(line)
      );
      if (pick && existsSync(pick)) return pick;
    } else {
      const out = execSync("which -a node 2>/dev/null; exit 0", { encoding: "utf8" });
      const lines = out
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const pick = lines.find((line) => !/bun-node|\/\.bun\//.test(line));
      if (pick && existsSync(pick)) return pick;
    }
  } catch {
    // ignore
  }
  return process.execPath;
}

const node = systemNode();

process.env.NODE_OPTIONS = [
  process.env.NODE_OPTIONS,
  "--max-old-space-size=8192",
]
  .filter(Boolean)
  .join(" ");

const r = spawnSync(node, [nextBin, "build"], {
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});

process.exit(r.status ?? 1);
