/**
 * 制度が1件も見つからなかったときのテストです。
 *
 * Ver.0 では、制度データがアプリ本体に直接書かれていたため、
 * このテストを書くことができませんでした（第1段階では todo にしていました）。
 *
 * 第2段階でデータを別ファイルへ移したので、
 * テストのときだけ「制度が0件のデータ」を渡せるようになりました。
 *
 * このファイルでは、制度データを空にして画面を動かします。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

// このファイルの中だけ、制度データを「0件」に差し替える
vi.mock("../src/lib/loadPrograms.js", () => ({
  default: [],
  制度データ: [],
}));

const ShingakuNavi = (await import("../src/ShingakuNavi.jsx")).default;

const 回答パターン = [
  "高校2年生",
  "私立を考えている",
  "一人暮らしの予定",
  "難しいと思う",
  "まだ調べていない",
  "ある / いま暮らしている",
];

let user;

beforeEach(() => {
  user = userEvent.setup();
});

async function 最後まで回答する() {
  await user.click(screen.getByRole("button", { name: "質問を始める" }));
  for (const 回答 of 回答パターン) {
    await user.click(screen.getByRole("button", { name: 回答 }));
  }
}

describe("制度が0件でもアプリが壊れない", () => {
  it("トップページが表示される", () => {
    render(<ShingakuNavi />);
    expect(
      screen.getByRole("button", { name: "質問を始める" })
    ).toBeInTheDocument();
  });

  it("最後まで回答でき、結果画面が表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(
      screen.getByRole("heading", { name: "確認してみるとよい支援" })
    ).toBeInTheDocument();
  });

  it("制度カードは1枚も出ない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("行き止まりにせず、先生に相談するよう案内する", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(
      screen.getByText("まずは学校の先生に聞いてみましょう")
    ).toBeInTheDocument();
  });

  it("制度が0件でも「次にやること」は表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(
      screen.getByRole("heading", { name: "次にやること" })
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".sn-action").length).toBeGreaterThan(0);
  });

  it("制度が0件でも相談先と注意書きは表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(
      screen.getByText("一人で判断する必要はありません")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/必ず公式サイトか窓口で確認してください/)
    ).toBeInTheDocument();
  });

  it("やり直しもできる", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();
    await user.click(screen.getByRole("button", { name: "もう一度やり直す" }));

    expect(
      screen.getByRole("button", { name: "質問を始める" })
    ).toBeInTheDocument();
  });
});
