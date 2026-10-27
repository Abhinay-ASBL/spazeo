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
    "next-env.d.ts",
    // Build output and vendored third-party bundles (not our source).
    ".vercel/**",
    "public/lib/**",
    "public/libs/**",
    "convex/_generated/**",
  ]),
  // react-three-fiber hands back live three.js objects (camera, controls) that
  // are mutated imperatively by design — they are not React state.
  {
    files: ["src/components/viewer/**"],
    rules: { "react-hooks/immutability": "off" },
  },
  // A leading underscore marks a binding that exists only to be discarded
  // (stub params, destructure-and-drop).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // CommonJS build scripts legitimately use require().
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
