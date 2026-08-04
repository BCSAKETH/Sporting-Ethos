const expoConfig = require("eslint-config-expo/flat");
const { defineConfig, globalIgnores } = require("eslint/config");

module.exports = defineConfig([
  expoConfig,
  // Standalone Node CLI dev tooling, not part of the Expo/RN app bundle.
  globalIgnores(["dist/*", "assets/counter-qr/*", "assets/images/*", "scripts/**"]),
]);
