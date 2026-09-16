/**
 * 表示の言葉が、実際の画面の状態と食い違っていないかを確かめるテストです。
 *
 * ■ なぜこのファイルがあるか
 *
 * 事前検証（docs/pre-user-validation-v1.md）で、次の2点の食い違いが見つかりました。
 *
 *   1. 折りたたみが最初から開いているのに、つまみに「ひらく」と出ていた
 *   2. 制度が1つのまとまりにしか入らないときでも
 *      「確認する順番の目安として並べています」と出ていて、
 *      実際には付いていない順番があるように読めた
 *
 * どちらも受給資格の判定には関係しない表示上の問題ですが、
 * 画面に書いてあることと実際の状態が違うのは、読む人を迷わせます。
 * 直したあと、同じことが再び起きないようにここで見張ります。
 *
 * ■ テスト用のデータを使う理由
 *
 * いま入っている本物の制度2件では、
 *   ・折りたたみが閉じたまま出る状態
 *   ・制度が折りたたみにしか入らない状態
 * の両方を作れません。そこでこのファイルではテスト用の制度に差し替え、
 * 回答によって両方の状態を作り分けます。
 */

import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { 危険な言い回しを探す, 見つかったものを文章にする } from "./helpers/dangerousPhrases.js";

const 土台 = {
  recordType: "program",
  aliases: [],
  replaces: [],
  provider: "テスト",
  type: "給付型",
  variants: null,
  educationStage: null,
  whyCheck: ["確認用です。"],
  cautions: [],
  mainConditions: null,
  incomeConditions: null,
  otherConditions: null,
  supportContent: null,
  applicationPeriod: null,
  officialUrl: null,
  officialText: "確認用のため公式情報はありません。",
  sources: [],
  checkedAt: null,
  notes: null,
  status: "draft",
};

// 「難しいと思う」と答えたときだけ上のグループに入る制度を1件入れておく。
// これで、同じデータのまま
//   ・難しいと思う  → 上のグループが埋まり、折りたたみは閉じて出る
//   ・だいたい出してもらえそう → すべて折りたたみに入り、最初から開く
// の2つの状態を作れます。
const テスト用の制度 = [
  {
    ...土台,
    id: "test-signal",
    name: "確認用の制度A",
    summary: "回答によってシグナルが当たる確認用の制度です。",
    matching: {
      excludeIf: {},
      signals: [
        {
          when: { familySupport: ["difficult"] },
          strength: "strong",
          reason: "確認用の理由です。",
        },
      ],
    },
  },
  {
    ...土台,
    id: "test-quiet-a",
    name: "確認用の制度B",
    summary: "シグナルを持たない確認用の制度です。",
    matching: { excludeIf: {}, signals: [] },
  },
  {
    ...土台,
    id: "test-quiet-b",
    name: "確認用の制度C",
    summary: "こちらもシグナルを持ちません。",
    matching: { excludeIf: {}, signals: [] },
  },
];

vi.mock("../src/lib/loadPrograms.js", () => ({
  default: テスト用の制度,
  制度データ: テスト用の制度,
}));

const ShingakuNavi = (await import("../src/ShingakuNavi.jsx")).default;

let user;

beforeEach(() => {
  user = userEvent.setup();
});

/** 学費の質問だけ変えて、最後まで回答する */
async function 最後まで回答する(学費の答え) {
  render(<ShingakuNavi />);
  await user.click(screen.getByRole("button", { name: "質問を始める" }));
  for (const 回答 of [
    "高校2年生",
    "私立を考えている",
    "一人暮らしの予定",
    学費の答え,
    "まだ調べていない",
    "ない",
  ]) {
    await user.click(screen.getByRole("button", { name: 回答 }));
  }
}

/** 画面に出ている文字だけを取り出す（スタイルの文字列を拾わないようにする） */
function 画面の文字() {
  return document.querySelector(".sn-shell")?.textContent ?? "";
}

describe("折りたたみのつまみが、開閉の状態と食い違わない", () => {
  it("すべての制度が折りたたみに入るとき、最初から開いている", async () => {
    await 最後まで回答する("だいたい出してもらえそう");

    const 折りたたみ = document.querySelector(".sn-more");
    expect(折りたたみ).not.toBeNull();
    expect(折りたたみ.open).toBe(true);
  });

  it("【重要】開いているのに「ひらく」という案内を出さない", async () => {
    await 最後まで回答する("だいたい出してもらえそう");

    const 折りたたみ = document.querySelector(".sn-more");
    expect(折りたたみ.open).toBe(true);

    const つまみの文字 = 折りたたみ.querySelector("summary").textContent;
    expect(つまみの文字).not.toContain("ひらく");
  });

  it("閉じているときも「とじる」という案内を出さない", async () => {
    await 最後まで回答する("難しいと思う");

    const 折りたたみ = document.querySelector(".sn-more");
    expect(折りたたみ).not.toBeNull();
    expect(折りたたみ.open).toBe(false);

    const つまみの文字 = 折りたたみ.querySelector("summary").textContent;
    expect(つまみの文字).not.toContain("とじる");
    expect(つまみの文字).not.toContain("ひらく");
  });

  it("つまみの文字だけで、中に何があるかが分かる", async () => {
    await 最後まで回答する("難しいと思う");

    const つまみ = document.querySelector(".sn-more summary");
    // 件数まで書いてあるので、開かなくても中身の見当がつく
    expect(つまみ.textContent).toMatch(/ほかにも確認できる制度があります（\d+件）/);
  });

  it("開閉の仕組み自体（details / summary）は残っている", async () => {
    await 最後まで回答する("難しいと思う");

    const 折りたたみ = document.querySelector(".sn-more");
    expect(折りたたみ.tagName).toBe("DETAILS");
    expect(折りたたみ.querySelector("summary")).not.toBeNull();

    // キーボードでも開ける（summary は標準で操作できる要素）
    await user.click(折りたたみ.querySelector("summary"));
    expect(折りたたみ.open).toBe(true);
  });

  it("開いた状態でも、つまみの文字は変わらない（状態と矛盾しようがない）", async () => {
    await 最後まで回答する("難しいと思う");

    const 折りたたみ = document.querySelector(".sn-more");
    const 閉じているときの文字 = 折りたたみ.querySelector("summary").textContent;

    await user.click(折りたたみ.querySelector("summary"));
    expect(折りたたみ.open).toBe(true);

    expect(折りたたみ.querySelector("summary").textContent).toBe(閉じているときの文字);
  });
});

describe("制度が1つのまとまりにしか入らないときの説明文", () => {
  it("「順番」があるとは書かない", async () => {
    await 最後まで回答する("だいたい出してもらえそう");

    // 上の2グループが空＝並べる順番そのものが無い状態
    expect(
      screen.queryByRole("heading", { name: "特に確認したほうがよい制度" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "確認する価値がある制度" })
    ).not.toBeInTheDocument();

    const 説明 = document.querySelector(".sn-section-note").textContent;
    expect(説明).not.toContain("順番");
    expect(説明).not.toContain("並べています");
  });

  it("グループが複数あるときも、同じ説明文で不自然にならない", async () => {
    await 最後まで回答する("難しいと思う");

    expect(
      screen.getByRole("heading", { name: "特に確認したほうがよい制度" })
    ).toBeInTheDocument();

    const 説明 = document.querySelector(".sn-section-note").textContent;
    expect(説明).toContain("確認するとよい支援を整理しています");
  });

  it("どちらの状態でも、説明文は同じ（状態で書き分けていない）", async () => {
    await 最後まで回答する("だいたい出してもらえそう");
    const 説明A = document.querySelector(".sn-section-note").textContent;
    cleanup();

    await 最後まで回答する("難しいと思う");
    const 説明B = document.querySelector(".sn-section-note").textContent;

    expect(説明A).toBe(説明B);
  });

  it("「受けられる」という意味ではないことを、引き続き書いている", async () => {
    await 最後まで回答する("だいたい出してもらえそう");

    const 説明 = document.querySelector(".sn-section-note").textContent;
    expect(説明).toContain("「受けられる」という意味ではなく");
  });
});

describe("直したあとの画面に、資格や適合性を示唆する表現が入っていない", () => {
  const 使ってはいけない言葉 = [
    "あなたに合う",
    "あなたに合った",
    "おすすめ",
    "対象になりそう",
    "受給可能性",
    "適合度",
    "おすすめ度",
    "合格率",
    "採用されやすい",
  ];

  for (const 学費の答え of ["だいたい出してもらえそう", "難しいと思う"]) {
    it(`「${学費の答え}」と答えたとき、適合性を示唆する言葉が出ない`, async () => {
      await 最後まで回答する(学費の答え);

      const 文字 = 画面の文字();
      for (const 言葉 of 使ってはいけない言葉) {
        expect(文字).not.toContain(言葉);
      }
      // 「受給可能性○％」のような数字での見せ方も出さない
      expect(文字).not.toMatch(/\d+\s*%/);
    });

    it(`「${学費の答え}」と答えたとき、受給を断定する言い回しが出ない`, async () => {
      await 最後まで回答する(学費の答え);

      const 見つかったもの = 危険な言い回しを探す(画面の文字());
      expect(
        見つかったもの,
        見つかったものを文章にする("結果画面", 見つかったもの)
      ).toEqual([]);
    });
  }
});
