/**
 * どの制度にもシグナルが当たらなかったときのテストです。
 *
 * そのとき「特に確認したほうがよい」「確認する価値がある」の2グループが空になり、
 * 画面には折りたたみだけが残ります。何も見えない画面になってしまわないよう、
 * この場合は折りたたみを最初から開いておく作りにしています。
 *
 * いまの7制度では、どう答えても必ず上のグループに1件は入るため、
 * このファイルではテスト用の制度データに差し替えて確認します。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

const シグナルの無い制度 = [
  {
    id: "test-a",
    name: "確認用の制度A",
    provider: "テスト",
    type: "その他",
    educationStage: null,
    summary: "シグナルを持たない制度です。",
    whyCheck: ["確認用です。"],
    mainConditions: null,
    incomeConditions: null,
    otherConditions: null,
    supportContent: null,
    applicationPeriod: null,
    officialUrl: null,
    officialText: "確認用のため公式情報はありません。",
    checkedAt: null,
    notes: null,
    status: "draft",
    matching: { excludeIf: {}, signals: [] },
  },
  {
    id: "test-b",
    name: "確認用の制度B",
    provider: "テスト",
    type: "その他",
    educationStage: null,
    summary: "こちらもシグナルを持ちません。",
    whyCheck: ["確認用です。"],
    mainConditions: null,
    incomeConditions: null,
    otherConditions: null,
    supportContent: null,
    applicationPeriod: null,
    officialUrl: null,
    officialText: "確認用のため公式情報はありません。",
    checkedAt: null,
    notes: null,
    status: "draft",
    matching: { excludeIf: {}, signals: [] },
  },
];

vi.mock("../src/lib/loadPrograms.js", () => ({
  default: シグナルの無い制度,
  制度データ: シグナルの無い制度,
}));

const ShingakuNavi = (await import("../src/ShingakuNavi.jsx")).default;

let user;

beforeEach(() => {
  user = userEvent.setup();
});

async function 最後まで回答する() {
  await user.click(screen.getByRole("button", { name: "質問を始める" }));
  for (const 回答 of [
    "高校2年生",
    "私立を考えている",
    "一人暮らしの予定",
    "難しいと思う",
    "まだ調べていない",
    "ある / いま暮らしている",
  ]) {
    await user.click(screen.getByRole("button", { name: 回答 }));
  }
}

describe("上の2グループが空になったとき", () => {
  it("上の2グループの見出しは出ない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(
      screen.queryByRole("heading", { name: "特に確認したほうがよい制度" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "確認する価値がある制度" })
    ).not.toBeInTheDocument();
  });

  it("折りたたみが最初から開いている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    const 折りたたみ = document.querySelector(".sn-more");
    expect(折りたたみ).not.toBeNull();
    expect(折りたたみ.open).toBe(true);
  });

  it("制度が消えず、すべて表示されている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(screen.queryAllByRole("article")).toHaveLength(2);
    expect(screen.getByText("確認用の制度A")).toBeInTheDocument();
    expect(screen.getByText("確認用の制度B")).toBeInTheDocument();
  });

  it("対象外という意味ではないことが書かれている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(screen.getByText(/対象外という意味ではない/)).toBeInTheDocument();
  });

  it("次にやることは、いつもどおり表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(
      screen.getByRole("heading", { name: "次にやること" })
    ).toBeInTheDocument();
  });
});
