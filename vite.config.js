// アプリのビルド設定と、テストの設定をまとめたファイルです。
// "vitest/config" から読み込むことで、ビルドとテストで同じ設定を共有できます。

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  test: {
    // ブラウザのふりをする環境でテストを動かす（画面のテストに必要）
    environment: "jsdom",
    // テストの前に毎回読み込むファイル
    setupFiles: ["./tests/setup.js"],
    // describe や it を import なしで使えるようにする
    globals: true,
    // tests フォルダのテストだけを実行する（e2e は Playwright が担当）
    include: ["tests/**/*.test.{js,jsx}"],
  },
});
