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
    // Prisma client sinh tự động, không phải mã tay.
    "src/generated/**",
    // Script Node thuần dùng require, không đi vào bundle Next.
    "scripts/**/*.cjs",
  ]),
]);

export default eslintConfig;
