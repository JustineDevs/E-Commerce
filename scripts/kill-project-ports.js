#!/usr/bin/env node
/**
 * Kill processes on project dev ports (3000, 3001, 4000, 9000).
 * Fallback when npx kill-port fails (e.g. on Windows with orphan Node processes).
 */
const { execSync } = require("child_process");
const ports = [3000, 3001, 4000, 9000];
const isWin = process.platform === "win32";

function killPortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const lines = out.trim().split("\n").filter(Boolean);
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      if (last && /^\d+$/.test(last)) {
        pids.add(last);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Killed PID ${pid} (port ${port})`);
      } catch {
        // Ignore - process may already be gone
      }
    }
  } catch {
    // netstat returned nothing = no process on port
  }
}

function killPortUnix(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, {
      stdio: "ignore",
    });
    console.log(`Killed process on port ${port}`);
  } catch {
    // No process on port
  }
}

for (const port of ports) {
  if (isWin) {
    killPortWindows(port);
  } else {
    killPortUnix(port);
  }
}

console.log("Done. Ports 3000, 3001, 4000, 9000 should be free.");
