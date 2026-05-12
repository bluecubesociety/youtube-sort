import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["src/browser-polyfill.min.js"] },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        browser: "readonly",
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["debug", "warn", "error"] }],
      "no-unused-vars": "error",
    },
  },
];
