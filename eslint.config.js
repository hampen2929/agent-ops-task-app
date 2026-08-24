// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/", "coverage/"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "no-console": ["error", { allow: ["error"] }],
    },
  },
  {
    files: ["src/server.ts"],
    rules: {
      // サーバーの起動ログのみ許可
      "no-console": "off",
    },
  },
);
