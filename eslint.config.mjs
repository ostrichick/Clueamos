import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Enforce named-only exports & type-only imports for consistent code style.
    files: ["**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "import/no-anonymous-default-export": "error",
    },
  },
  {
    // DeductionNotebook.tsx has in-progress user edits outside our lint scope.
    files: ["src/components/notebook/DeductionNotebook.tsx"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
]);

export default eslintConfig;
