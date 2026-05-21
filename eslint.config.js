import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "src/routeTree.gen.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "components", pattern: "src/components/**" },
        { type: "features", pattern: "src/features/**" },
        { type: "hooks", pattern: "src/hooks/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "i18n", pattern: "src/i18n/**" },
        { type: "routes", pattern: "src/routes/**" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "components", allow: ["lib", "hooks"] },
            { from: "features", allow: ["components", "lib", "hooks"] },
            { from: "hooks", allow: ["lib"] },
            { from: "routes", allow: ["components", "features", "lib", "hooks", "i18n"] },
            { from: "i18n", allow: [] },
            { from: "lib", allow: [] },
          ],
        },
      ],
    },
  },
]);
