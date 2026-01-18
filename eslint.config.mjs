import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

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

  // Common rules for ALL TypeScript files
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
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
