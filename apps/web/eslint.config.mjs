import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  prettier,

  // src/locales/patch.js is a standalone one-off CommonJS maintenance
  // script (run manually with `node`, not part of the app bundle or build).
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/locales/patch.js"]),

  {
    rules: {
      // There's a large pre-existing backlog of `any` usage across the
      // codebase from before lint ran in CI. Keep it visible instead of
      // silencing it, but don't let the backlog block every future PR —
      // new `any` usage should still be cleaned up in review.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
