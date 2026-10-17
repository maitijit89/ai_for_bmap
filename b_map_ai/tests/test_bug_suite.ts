/**
 * B Map AI - Enterprise Automated Bug Test Suite CLI Runner
 */

import { runBugTestSuite } from "../src/diagnostics/bug-tester";

export { runBugTestSuite };

// Run suite immediately and exit with appropriate code
runBugTestSuite({ exitOnError: false })
  .then((result) => {
    process.exit(result.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error("FATAL: Bug test runner exception:", err);
    process.exit(1);
  });
