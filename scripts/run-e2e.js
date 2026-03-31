#!/usr/bin/env node
/**
 * Run Playwright E2E tests with transform cache and temp dir in project directory.
 * Avoids EPERM when these would otherwise be written to Cursor's install path.
 */
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");

process.env.NODE_ENV = process.env.NODE_ENV ?? "development";

const stressTestDir = path.join(projectRoot, "stress-test");
const cacheDir = path.join(stressTestDir, ".playwright-cache");
const tmpDir = path.join(cacheDir, "tmp");

fs.mkdirSync(tmpDir, { recursive: true });

process.env.PWTEST_CACHE_DIR = cacheDir;
process.env.TMP = tmpDir;
process.env.TEMP = tmpDir;
process.env.TMPDIR = tmpDir;

const args = process.argv.slice(2);
const cli = path.join(projectRoot, "node_modules", "@playwright", "test", "cli.js");
const env = {
  ...process.env,
  PWTEST_CACHE_DIR: cacheDir,
  TMP: tmpDir,
  TEMP: tmpDir,
  TMPDIR: tmpDir,
};

const result = fs.existsSync(cli)
  ? spawnSync(process.execPath, [cli, "test", ...args], {
      stdio: "inherit",
      cwd: projectRoot,
      env,
    })
  : spawnSync("npx", ["playwright", "test", ...args], {
      stdio: "inherit",
      cwd: projectRoot,
      shell: true,
      env,
    });

process.exit(result.status ?? 1);
