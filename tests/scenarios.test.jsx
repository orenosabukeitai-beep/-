/**
 * 想定シナリオによる事前検証（段階A：機械的な不変条件）
 *
 * ■ これは何ではないか
 *
 * これは実際の利用者によるユーザーテストでは「ありません」。
 * ここで確かめられるのは
 *   「想定した状況に対して、設計どおり安全・一貫して動くか」
 * までです。
 *
 * 高校生が理解できるか、長いと感じるか、実際に行動につながるかは、
 * このテストでは分かりません。人に使ってもらわないと分かりません。
 *
 * ■ 何を確かめるか
 *
 * tests/fixtures/scenarios.json の10件について、
 * 画面を実際に操作して、次のことが崩れていないかを確かめます。
 *
 *   ・制度が0件にならない
 *   ・制度と案内が混ざらない
 *   ・「分からない」「答えない」で不利益が出ない
 *   ・貸与奨学金が「特に確認したほうがよい」に入らない
 *   ・資格を断定する表現が出ない
 *   ・出てくる理由が、その人の回答と矛盾しない
 */

import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ShingakuNavi, { QUESTIONS } from "../src/ShingakuNavi.jsx";
import 制度データ from "../src/lib/loadPrograms.js";
import { 分からないことを表す回答 } from "../src/lib/matching.js";

const シナリオ集 = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/scenarios.json"), "utf-8")
);
const シナリオ一覧 = シナリオ集.シナリオ;

/** 内部の値から、画面に出るラベルを引く（選択肢の文言が変わっても追随する） */
function ラベルを引く(質問キー, 値) {
  const 質問 = QUESTIONS.find((q) => q.key === 質問キー);
  const 選択肢 = 質問.options.find((o) => o.value === 値);
  if (!選択肢) {
    throw new Error(`${質問キー} に「${値}」という選択肢はありません`);
  }
  return 選択肢.label;
}

let user;

beforeEach(() => {
  user = userEvent.setup();
});

/** シナリオの回答どおりに最後まで操作する */
async function シナリオを実行する(回答) {
  render(<ShingakuNavi />);
  await user.click(screen.getByRole("button", { name: "質問を始める" }));

  for (const 質問 of QUESTIONS) {
    const 値 = 回答[質問.key];
    await user.click(
      screen.getByRole("button", { name: ラベルを引く(質問.key, 値) })
    );
  }

  await screen.findByRole("heading", { name: "確認してみるとよい支援" });
}

/** 画面から結果を読み取る */
function 画面の結果() {
  const グループの中身 = (見出し) => {
    const グループ = [...document.querySelectorAll(".sn-group")].find(
      (要素) => 要素.querySelector(".sn-group-title")?.textContent === 見出し
    );
    if (!グループ) return [];
    return [...グループ.querySelectorAll("article")].map(
      (カード) => within(カード).getByRole("heading").textContent
    );
  };

  return {
    特に確認: グループの中身("特に確認したほうがよい制度"),
    確認する価値: グループの中身("確認する価値がある制度"),
    知っておく: [...document.querySelectorAll(".sn-more article")].map(
      (カード) => within(カード).getByRole("heading").textContent
    ),
    案内: [...document.querySelectorAll(".sn-guide-group article h4")].map(
      (h) => h.textContent
    ),
    回答と連動した理由: [...document.querySelectorAll(".sn-why-linked li")].map(
      (要素) => 要素.textContent
    ),
    次にやること: [...document.querySelectorAll(".sn-action-text")].map(
      (要素) => 要素.textContent
    ),
    ヒント: [...document.querySelectorAll(".sn-hint")].map((要素) => 要素.textContent),
    注意事項: [...document.querySelectorAll(".sn-cautions li")].map(
      (要素) => 要素.textContent
    ),
    確認のしかた: [...document.querySelectorAll(".sn-steps li")].length,
    // スタイル（<style> の中のCSS）は本文ではないので、アプリの中身だけを読む
    画面全体の文字: document.querySelector(".sn-shell")?.textContent ?? "",
  };
}

/** 時間のかかるテスト用（10シナリオ × 画面操作を何度も行うため） */
const 長めの待ち時間 = 60_000;

const programのid = 制度データ
  .filter((d) => d.recordType === "program")
  .map((d) => d.id);
const programの名前 = 制度データ
  .filter((d) => d.recordType === "program")
  .map((d) => d.name);
const guideの名前 = 制度データ
  .filter((d) => d.recordType === "guide")
  .map((d) => d.name);

/* ============================================================
   まずシナリオ自体が、いまの選択肢と食い違っていないか
   ============================================================ */

describe("シナリオの前提", () => {
  it("10件ある", () => {
    expect(シナリオ一覧).toHaveLength(10);
  });

  it("これがユーザーテストではないことが、ファイルに明記されている", () => {
    expect(シナリオ集.注意).toMatch(/実際の利用者ではありません/);
  });

  it.each(シナリオ一覧.map((s) => [s.番号, s]))(
    "シナリオ%s の回答が、いまの質問と選択肢に存在する",
    (番号, シナリオ) => {
      expect(Object.keys(シナリオ.回答).sort()).toEqual(
        QUESTIONS.map((q) => q.key).sort()
      );
      for (const 質問 of QUESTIONS) {
        expect(() => ラベルを引く(質問.key, シナリオ.回答[質問.key])).not.toThrow();
      }
    }
  );
});

/* ============================================================
   段階A：10シナリオすべてで守られるべきこと
   ============================================================ */

describe("10シナリオすべてで守られる決まり", () => {
  it.each(シナリオ一覧.map((s) => [s.番号, s.名前, s]))(
    "シナリオ%s（%s）",
    async (番号, 名前, シナリオ) => {
      await シナリオを実行する(シナリオ.回答);
      const 結果 = 画面の結果();

      const 制度すべて = [
        ...結果.特に確認,
        ...結果.確認する価値,
        ...結果.知っておく,
      ];

      // ① 制度が0件にならない
      expect(制度すべて.length, "制度が1件も出ていません").toBeGreaterThan(0);

      // ② 制度と案内が混ざらない
      for (const 名 of 制度すべて) {
        expect(programの名前, `「${名}」は制度の並びに入るべきではありません`).toContain(名);
      }
      for (const 名 of 結果.案内) {
        expect(guideの名前, `「${名}」は案内の並びに入るべきではありません`).toContain(名);
      }

      // ③ 同じものが2か所に出ない
      const 全部 = [...制度すべて, ...結果.案内];
      expect(new Set(全部).size, "同じカードが2か所に出ています").toBe(全部.length);

      // ④ 貸与奨学金を「特に確認したほうがよい」に入れない
      expect(
        結果.特に確認,
        "返済が必要な制度を、給付・減免より強くすすめてはいけません"
      ).not.toContain("JASSO 貸与奨学金（第一種・第二種）");

      // ⑤ 資格を断定する表現が出ない
      for (const 危険 of [
        "受給できます",
        "あなたは対象です",
        "条件を満たしています",
        "対象になる可能性が高い",
        "第一種の対象です",
        "第二種なら借りられます",
        "おすすめ度",
        "適合度",
        "受給可能性",
      ]) {
        expect(
          結果.画面全体の文字,
          `「${危険}」が画面に出ています`
        ).not.toContain(危険);
      }

      // ⑥ 受給確率のような数字を出さない
      expect(結果.画面全体の文字).not.toMatch(/\d+\s*[%％]/);

      // ⑦ 「次にやること」が3〜5件ある
      expect(結果.次にやること.length).toBeGreaterThanOrEqual(3);
      expect(結果.次にやること.length).toBeLessThanOrEqual(5);
    },
    長めの待ち時間
  );
});

/* ============================================================
   「分からない」「答えない」で不利益が出ないこと
   ============================================================ */

describe("答えないことで不利益が出ない", () => {
  it("【重要】シナリオ5（答えない）は、シナリオ4（あり）より選択肢が減らない", async () => {
    const s4 = シナリオ一覧.find((s) => s.番号 === 4);
    const s5 = シナリオ一覧.find((s) => s.番号 === 5);

    await シナリオを実行する(s4.回答);
    const 結果4 = 画面の結果();
    cleanup();

    await シナリオを実行する(s5.回答);
    const 結果5 = 画面の結果();

    const 件数 = (r) =>
      r.特に確認.length + r.確認する価値.length + r.知っておく.length + r.案内.length;

    expect(件数(結果5), "答えないことで選択肢が減っています").toBeGreaterThanOrEqual(
      件数(結果4)
    );

    // 施設経験者向けの案内は、答えなかった人にも残る
    expect(結果5.案内).toContain(
      "施設等で暮らした経験のある人向けの支援を相談する"
    );
  });

  it("【重要】どのシナリオでも、施設の質問に「答えない」で案内が消えない", async () => {
    for (const シナリオ of シナリオ一覧) {
      const とばした回答 = { ...シナリオ.回答, careBackground: "skip" };
      await シナリオを実行する(とばした回答);
      const 結果 = 画面の結果();

      expect(
        結果.案内,
        `シナリオ${シナリオ.番号} で、答えないことで案内が消えました`
      ).toContain("施設等で暮らした経験のある人向けの支援を相談する");

      cleanup();
    }
  }, 長めの待ち時間);

  it("「ない」と明確に答えたときだけ、施設経験者向けの案内を出さない", async () => {
    const s1 = シナリオ一覧.find((s) => s.番号 === 1);
    await シナリオを実行する(s1.回答);
    const 結果 = 画面の結果();

    expect(s1.回答.careBackground).toBe("no");
    expect(結果.案内).not.toContain(
      "施設等で暮らした経験のある人向けの支援を相談する"
    );
  });

  it("【重要】分からない・未定に変えても、制度の件数が減らない", async () => {
    const 不明にできる = {
      schoolType: "undecided",
      living: "undecided",
      familySupport: "unknown",
      careBackground: "skip",
    };

    for (const シナリオ of シナリオ一覧) {
      await シナリオを実行する(シナリオ.回答);
      const もとの件数 =
        画面の結果().特に確認.length +
        画面の結果().確認する価値.length +
        画面の結果().知っておく.length;
      cleanup();

      for (const [質問, 不明の値] of Object.entries(不明にできる)) {
        await シナリオを実行する({ ...シナリオ.回答, [質問]: 不明の値 });
        const 結果 = 画面の結果();
        const 件数 =
          結果.特に確認.length + 結果.確認する価値.length + 結果.知っておく.length;

        expect(
          件数,
          `シナリオ${シナリオ.番号}：${質問} を「${不明の値}」にしたら制度が減りました`
        ).toBeGreaterThanOrEqual(もとの件数);
        cleanup();
      }
    }
  }, 長めの待ち時間);

  it("「分からない」を表す値が、いまの選択肢に実在する", () => {
    // matching.js の定義と、実際の選択肢がずれていないか
    const 選択肢の全値 = QUESTIONS.flatMap((q) => q.options.map((o) => o.value));
    for (const 値 of 分からないことを表す回答) {
      expect(選択肢の全値, `「${値}」という選択肢が無くなっています`).toContain(値);
    }
  });
});

/* ============================================================
   理由が回答と矛盾しないこと
   ============================================================ */

describe("出てくる理由が、その人の回答と矛盾しない", () => {
  it.each(シナリオ一覧.map((s) => [s.番号, s]))(
    "シナリオ%s の理由が、選んでいない回答に触れていない",
    async (番号, シナリオ) => {
      await シナリオを実行する(シナリオ.回答);
      const 結果 = 画面の結果();
      const 理由 = 結果.回答と連動した理由.join("\n");

      // 家計に余裕があると答えた人に、家計が厳しい前提の理由を出さない
      if (シナリオ.回答.familySupport === "enough") {
        expect(理由).not.toMatch(/難しい、または分からないと答えた/);
        expect(理由).not.toMatch(/進学費用の準備に不安がある/);
      }

      // 高校3年生以外に、3年生向けの理由を出さない
      if (シナリオ.回答.grade !== "hs3") {
        expect(理由).not.toMatch(/高校3年生と答えた/);
      }

      // 進学先が未定の人に、方向が決まっている前提の理由を出さない
      if (シナリオ.回答.schoolType === "undecided") {
        expect(理由).not.toMatch(/進学先の方向を考えていると答えた/);
      }

      // 施設経験を「あり」と答えていない人に、その理由を出さない
      if (シナリオ.回答.careBackground !== "yes") {
        expect(理由).not.toMatch(/施設や里親家庭で暮らした経験があると答えた/);
      }
    }
  );

  it("【重要】制度の確認順に使わない質問が、理由に使われていない", async () => {
    // living と researched は、制度の公式条件と結びつかないため
    // 制度の確認順には使わない、と決めてある
    const 使わない質問 = QUESTIONS.filter((q) => !q.usedForMatching).map((q) => q.key);
    expect(使わない質問).toEqual(["living", "researched"]);

    for (const 制度 of 制度データ) {
      const 見ているキー = [
        ...Object.keys(制度.matching.excludeIf || {}),
        ...(制度.matching.signals || []).flatMap((s) => Object.keys(s.when || {})),
      ];
      for (const キー of 使わない質問) {
        expect(
          見ているキー,
          `${制度.id} が「${キー}」を制度の確認順に使っています`
        ).not.toContain(キー);
      }
    }
  });

  it("調べた度合いは、行動計画にだけ反映される", async () => {
    const まだ = シナリオ一覧.find((s) => s.回答.researched === "not_yet");
    const もう = シナリオ一覧.find((s) => s.回答.researched === "already");

    await シナリオを実行する(まだ.回答);
    const 結果まだ = 画面の結果();
    cleanup();

    await シナリオを実行する(もう.回答);
    const 結果もう = 画面の結果();

    // 行動計画には差が出る
    expect(結果まだ.次にやること.join("")).toMatch(/ちがいを知る/);
    expect(結果もう.次にやること.join("")).not.toMatch(/ちがいを知る/);
  });

  it("通学方法は、ヒントにだけ反映される", async () => {
    const 一人暮らし = シナリオ一覧.find((s) => s.回答.living === "alone");
    await シナリオを実行する(一人暮らし.回答);
    const 結果 = 画面の結果();

    // 生活費の話はヒントに出る
    expect(結果.ヒント.join("")).toMatch(/家賃や生活費/);
    // 制度の理由には使われていない
    expect(結果.回答と連動した理由.join("")).not.toMatch(/一人暮らし/);
  });
});

/* ============================================================
   公式情報を超えた断定をしていないこと
   ============================================================ */

describe("公式情報を超えた断定をしていない", () => {
  it.each(シナリオ一覧.map((s) => [s.番号, s]))(
    "シナリオ%s の画面に、確認を促す表現がある",
    async (番号, シナリオ) => {
      await シナリオを実行する(シナリオ.回答);
      const 文字 = 画面の結果().画面全体の文字;

      expect(文字).toMatch(/公式サイト/);
      expect(文字).toMatch(/試作版/);
      expect(文字).toMatch(/保存も送信もしていません/);
      expect(文字).toMatch(/受けられるかどうかを決めることはできません/);
    }
  );

  it("貸与奨学金が出るときは、返す必要があることが必ず書かれている", async () => {
    for (const シナリオ of シナリオ一覧) {
      await シナリオを実行する(シナリオ.回答);
      const 文字 = 画面の結果().画面全体の文字;

      if (文字.includes("JASSO 貸与奨学金")) {
        expect(文字, `シナリオ${シナリオ.番号}`).toMatch(/返す必要/);
        expect(文字).toMatch(/卒業後などに返していくお金/);
      }
      cleanup();
    }
  }, 長めの待ち時間);

  it("案内が「必ず制度がある」と読めない", async () => {
    for (const シナリオ of シナリオ一覧) {
      await シナリオを実行する(シナリオ.回答);
      const 案内の文 = document.querySelector(".sn-guide-group")?.textContent || "";

      for (const 断定 of ["必ずあります", "必ず存在します", "全員が使えます"]) {
        expect(案内の文, `シナリオ${シナリオ.番号}`).not.toContain(断定);
      }
      cleanup();
    }
  }, 長めの待ち時間);
});

/* ============================================================
   シナリオ10（手がかりが最も少ない）の扱い
   ============================================================ */

describe("手がかりがほとんど無いとき", () => {
  it("【重要】「何もありません」にならない", async () => {
    const s10 = シナリオ一覧.find((s) => s.番号 === 10);
    await シナリオを実行する(s10.回答);
    const 結果 = 画面の結果();

    const 制度すべて = [...結果.特に確認, ...結果.確認する価値, ...結果.知っておく];
    expect(制度すべて.length).toBeGreaterThan(0);
    expect(結果.案内.length).toBeGreaterThan(0);
    expect(結果.次にやること.length).toBeGreaterThanOrEqual(3);
  });

  it("確認できる制度が残っていることが、画面の文章で伝わる", async () => {
    const s10 = シナリオ一覧.find((s) => s.番号 === 10);
    await シナリオを実行する(s10.回答);

    // 上のグループが空でも、折りたたみが開いた状態で案内される
    expect(
      screen.getByText(/対象外という意味ではないので/)
    ).toBeInTheDocument();
  });

  it("両方の制度が、消えずに残っている", async () => {
    const s10 = シナリオ一覧.find((s) => s.番号 === 10);
    await シナリオを実行する(s10.回答);
    const 結果 = 画面の結果();

    const 制度すべて = [...結果.特に確認, ...結果.確認する価値, ...結果.知っておく];
    expect(制度すべて.length).toBe(programのid.length);
  });
});
