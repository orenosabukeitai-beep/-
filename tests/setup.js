// すべてのテストの前に読み込まれるファイルです。
// 「画面にこの文字が表示されている」といった書き方をできるようにします。

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// テストが1つ終わるたびに画面を片付ける（前のテストの影響を残さない）
afterEach(() => {
  cleanup();
});
