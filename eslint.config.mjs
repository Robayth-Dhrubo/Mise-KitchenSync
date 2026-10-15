import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    ".wrangler/**",
    "coverage/**",
    "next-env.d.ts",
    // "scripts/**"
  ]),
  {
    files: ["src/app/product/**", "src/components/product/**", "src/components/workspace/**"],
    rules: {
      // Sites sign-in and document navigation use normal top-level anchors.
      "@next/next/no-html-link-for-pages": "off",
    }
  },
  {
    files: ["src/app/(dashboard)/**", "src/app/admin/**", "src/app/pos/**", "src/components/guest/**", "src/components/os/**", "src/components/pos/**", "src/components/ui/**", "src/hooks/**"],
    rules: {
      // Retained legacy modules do not use the React compiler. Keep these
      // optimization diagnostics visible while the new product stays strict.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
    }
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
    }
  }
]);

export default eslintConfig;
