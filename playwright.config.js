// スマートフォンでの表示を、本物のブラウザで確認するための設定です。
// `npm run test:e2e` を実行すると、開発サーバーが自動で起動してテストが走ります。

import { defineConfig, devices } from "@playwright/test";

// ブラウザの場所を環境変数で指定できるようにしています。
// ふつうのパソコンでは指定不要です（`npx playwright install chromium` で入ります）。
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  // 失敗したときに原因を追えるようにする
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [
    {
      // iPhone 相当の画面サイズで確認する
      name: "スマートフォン",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
  // テストの前に開発サーバーを自動起動する
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
