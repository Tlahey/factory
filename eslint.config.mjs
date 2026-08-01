import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

const TS_RULES = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unused-vars": "off",
  "unused-imports/no-unused-imports": "warn",
  "unused-imports/no-unused-vars": [
    "warn",
    {
      vars: "all",
      varsIgnorePattern: "^_",
      args: "after-used",
      argsIgnorePattern: "^_",
    },
  ],
};

const eslintConfig = defineConfig([
  // Global ignores must be the first object in the array OR use globalIgnores helper correctly
  // In v9, an object with only 'ignores' is a global ignore if it has no other keys
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/dist/**",
      "**/next-env.d.ts",
      "src_backup/**",
      "**/package-lock.json",
      "**/.agent/**",
      "**/.gemini/**",
    ],
  },

  // Rules for Game app (Next.js)
  ...nextVitals.map((config) => ({
    ...config,
    files: ["apps/game/**/*.{js,ts,jsx,tsx}"],
    rules: {
      ...config.rules,
      "@next/next/no-html-link-for-pages": ["error", "apps/game/src/app"],
    },
  })),
  ...nextTs.map((config) => ({
    ...config,
    files: ["apps/game/**/*.{js,ts,jsx,tsx}"],
  })),

  // Common rules for ALL TypeScript files.
  // The @typescript-eslint plugin is only registered for the files
  // eslint-config-next does not already cover: flat config forbids defining the
  // same plugin namespace twice with two different plugin instances.
  {
    files: ["apps/game/**/*.{ts,tsx}"],
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: TS_RULES,
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["apps/game/**"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: TS_RULES,
  },
  // Override for test files to allow 'any'
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
