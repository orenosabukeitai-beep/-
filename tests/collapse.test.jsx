/**
 * 折りたたみの開閉と、確認状態の札のテストです。
 *
 * いま入っている本物の制度は2件（どちらも公式確認済み）で、
 * シグナルの当たり方も同じため、
 *   ・上のグループと折りたたみが同時に出る状態
 *   ・「サンプルデータ」の札が出る状態
 * を本物のデータでは作れません。
 *
 * そこでこのファイルでは、テスト用のデータに差し替えて確認します。
 * 制度が増えれば本物のデータでも起きる状態なので、仕組みとして確かめておきます。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

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

const テスト用データ = [
  {
    ...土台,
    id: "strong-one",
    name: "強いシグナルがある制度",
    summary: "確認用。",
    matching: {
      excludeIf: {},
      signals: [
        {
          when: { familySupport: ["difficult"] },
          reason: "家計が厳しいと答えたためです。",
          strength: "strong",
        },
      ],
    },
  },
  {
    ...土台,
    id: "normal-one",
    name: "ふつうのシグナルがある制度",
    summary: "確認用。",
    matching: {
      excludeIf: {},
      signals: [
        {
          when: { familySupport: ["difficult"] },
          reason: "家計が厳しいと答えたためです。",
          strength: "normal",
        },
      ],
    },
  },
  {
    ...土台,
    id: "no-signal",
    name: "シグナルが無い制度",
    summary: "確認用。",
    matching: { excludeIf: {}, signals: [] },
  },
  {
    ...土台,
    id: "verified-one",
    name: "公式確認済みの制度",
    summary: "確認用。",
    officialUrl: "https://www.jasso.go.jp/",
    sources: [
      {
        title: "確認用",
        url: "https://www.jasso.go.jp/",
        checkedAt: "2026-09-16",
      },
    ],
    checkedAt: "2026-09-16",
    status: "verified",
    matching: { excludeIf: {}, signals: [] },
  },
];

vi.mock("../src/lib/loadPrograms.js", () => ({
  default: テスト用データ,
  制度データ: テスト用データ,
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
    "ない",
  ]) {
    await user.click(screen.getByRole("button", { name: 回答 }));
  }
}

describe("3つのグループが同時に出るとき", () => {
  it("それぞれのグループに正しく振り分けられる", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    const グループの中身 = (見出し) => {
      const グループ = [...document.querySelectorAll(".sn-group")].find(
        (要素) => 要素.querySelector(".sn-group-title")?.textContent === 見出し
      );
      return [...(グループ?.querySelectorAll("h4") || [])].map((h) => h.textContent);
    };

    expect(グループの中身("特に確認したほうがよい制度")).toEqual([
      "強いシグナルがある制度",
    ]);
    expect(グループの中身("確認する価値がある制度")).toEqual([
      "ふつうのシグナルがある制度",
    ]);
  });

  it("折りたたみは最初は閉じている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    const 折りたたみ = document.querySelector(".sn-more");
    expect(折りたたみ).not.toBeNull();
    expect(折りたたみ.open).toBe(false);
  });

  it("件数つきの見出しが出ている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    expect(
      screen.getByText(/ほかにも確認できる制度があります（2件）/)
    ).toBeInTheDocument();
  });

  it("押すと開き、もう一度押すと閉じる", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    const 折りたたみ = document.querySelector(".sn-more");
    const つまみ = 折りたたみ.querySelector("summary");

    await user.click(つまみ);
    expect(折りたたみ.open).toBe(true);

    await user.click(つまみ);
    expect(折りたたみ.open).toBe(false);
  });

  it("シグナルの無い制度が、折りたたみの中に入っている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    const 中身 = [...document.querySelectorAll(".sn-more h4")].map(
      (h) => h.textContent
    );
    expect(中身).toContain("シグナルが無い制度");
  });

  it("最初に見える数が、全体より少ない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    const 最初から見える = document.querySelectorAll(".sn-group article").length;
    const 全部 = document.querySelectorAll("article").length;
    expect(最初から見える).toBeLessThan(全部);
  });
});

describe("確認状態の札", () => {
  it("未確認（draft）の制度には「サンプルデータ」が付く", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    const カード = [...document.querySelectorAll("article")].find((要素) =>
      要素.textContent.includes("強いシグナルがある制度")
    );
    expect(カード.querySelector(".sn-tag-sample")).not.toBeNull();
    expect(カード.textContent).toContain("サンプルデータ");
  });

  it("公式確認済み（verified）の制度には付かない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する();

    const カード = [...document.querySelectorAll("article")].find((要素) =>
      要素.textContent.includes("公式確認済みの制度")
    );
    expect(カード.querySelector(".sn-tag-sample")).toBeNull();
  });
});
