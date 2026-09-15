// コードの書き間違いを自動で見つけるための設定ファイルです。
// `npm run lint` を実行すると、この設定に従ってコードが検査されます。

import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

// JSX（画面を書く記法）の中で使われている変数を、ESLint に認識させるための設定。
// これが無いと「使われていない変数です」と誤って報告されてしまいます。
const jsxで使う変数を認識する = {
  plugins: { react },
  rules: {
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
  },
};

export default [
  // 検査しないフォルダ
  {
    ignores: ["dist/**", "node_modules/**", "playwright-report/**", "test-results/**"],
  },

  // JavaScript の基本的なチェック（未定義の変数、書き忘れなど）
  js.configs.recommended,

  // 画面を作るコード（src フォルダ）
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      ...jsxで使う変数を認識する.plugins,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...jsxで使う変数を認識する.rules,
      // React の使い方の間違いを検出する
      ...reactHooks.configs.recommended.rules,
      // スマホや読み上げソフトで使えなくなる書き方を検出する
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },

  // テストのコード
  {
    files: ["tests/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: jsxで使う変数を認識する.plugins,
    rules: jsxで使う変数を認識する.rules,
  },

  // 設定ファイル（Node.js で動くもの）
  {
    files: ["*.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },

  // 検証用スクリプト（Node.js で動くが、ブラウザの中で動かす処理も書く）
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
