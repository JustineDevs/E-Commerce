/**
 * Minimal argv parser for composable CLI commands.
 */

function parse(argv = process.argv.slice(2)) {
  const args = [];
  const opts = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--no-security-check') {
      opts.noSecurityCheck = true;
    } else if (arg === '--warn-only') {
      opts.warnOnly = true;
    } else if (arg === '--max' && argv[i + 1]) {
      const n = parseInt(argv[++i], 10);
      opts.max = Number.isNaN(n) || n < 1 ? 1 : n;
    } else if (arg === '--no-stage-all') {
      opts.noStageAll = true;
    } else if (arg === '--skip-preflight') {
      opts.skipPreflight = true;
    } else if (arg === '--issue' && argv[i + 1]) {
      opts.issue = argv[++i];
    } else if (!arg.startsWith('-')) {
      args.push(arg);
    }
  }

  return { args, opts };
}

module.exports = { parse };
