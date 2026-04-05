#!/usr/bin/env node

const { mkdirSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const configHome = path.join(repoRoot, ".cache", "medusa-config");

mkdirSync(configHome, { recursive: true });

const cliPath = require.resolve("@medusajs/cli/cli.js", {
  paths: [projectRoot],
});

const result = spawnSync(
  process.execPath,
  [cliPath, "build", ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      // Prefer SWC when the platform binary is present (Windows: @swc/core-win32-x64-msvc).
      // If SWC is missing, ts-node falls back in ways that can pull TS sources from node_modules.
      TS_NODE_SWC: process.env.TS_NODE_SWC ?? "true",
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || configHome,
      APPDATA: process.env.APPDATA || configHome,
      LOCALAPPDATA: process.env.LOCALAPPDATA || configHome,
    },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
