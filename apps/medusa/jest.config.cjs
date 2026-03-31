const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { loadEnv } = require("@medusajs/utils");
loadEnv("test", process.cwd());

module.exports = {
  /** Keep haste-map / Jest cache inside the app (avoids EPERM when Node runs from Cursor’s install dir on Windows). */
  cacheDirectory: path.join(__dirname, ".jest-cache"),
  transform: {
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
        },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
  setupFiles: ["./integration-tests/setup.cjs"],
};

if (process.env.TEST_TYPE === "integration:http") {
  module.exports.testMatch = ["**/integration-tests/http/*.spec.[jt]s"];
} else if (process.env.TEST_TYPE === "integration:modules") {
  module.exports.testMatch = ["**/src/modules/*/__tests__/**/*.[jt]s"];
} else if (process.env.TEST_TYPE === "unit") {
  module.exports.testMatch = ["**/src/**/__tests__/**/*.unit.spec.[jt]s"];
}
