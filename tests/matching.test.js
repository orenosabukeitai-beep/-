// @vitest-environment node

/**
 * Ver.1 のマッチング仕様のテストです。
 *
 * Ver.1 では「条件に合う制度だけを残す」のをやめて、
 * 「確認する順番をつけて、どれも消さない」やり方に変えました。
 *
 * そのため Ver.0 と結果が一致することは求めません。
 * 代わりに、Ver.1 が守るべき決まりを1つずつ確かめます。
 *
 * とくに大事なのは次の2つです。
 *   ・「分からない」「答えない」で制度が減らないこと
 *   ・Ver.0 で見えていた制度が、Ver.1 で見えなくならないこと
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  制度を分類する,
  表示される制度,
  明らかに当てはまらない,
  分からないことを表す回答,
} from "../src/lib/matching.js";
import 制度データ from "../src/lib/loadPrograms.js";
import { QUESTIONS } from "../src/ShingakuNavi.jsx";

const 選択肢 = {
  grade: ["hs1", "hs2", "hs3", "graduate"],
  schoolType: ["national", "private", "both", "undecided"],
  living: ["home", "alone", "undecided"],
  familySupport: ["difficult", "partial", "enough", "unknown"],
  researched: ["not_yet", "a_little", "already"],
  careBackground: ["yes", "no", "skip"],
};

/** 回答の組み合わせをすべて作る（1,728通り） */
function すべての回答パターン() {
  const 一覧 = [];
  for (const grade of 選択肢.grade)
    for (const schoolType of 選択肢.schoolType)
      for (const living of 選択肢.living)
        for (const familySupport of 選択肢.familySupport)
          for (const researched of 選択肢.researched)
            for (const careBackground of 選択肢.careBackground)
              一覧.push({
                grade,
                schoolType,
                living,
                familySupport,
                researched,
                careBackground,
              });
  return 一覧;
}

const 回答パターン = すべての回答パターン();
const 分類する = (回答) => 制度を分類する(回答, 制度データ);
const 表示id = (回答) => 表示される制度(分類する(回答)).map((項目) => 項目.制度.id);

/* ============================================================
   1. グループ分けの決まり
   ============================================================ */

describe("3つのグループへの分け方", () => {
  const 家計が苦しい人 = {
    grade: "hs2",
    schoolType: "private",
    living: "alone",
    familySupport: "difficult",
    researched: "not_yet",
    careBackground: "yes",
  };

  it("strong のシグナルがある制度は「特に確認したほうがよい」に入る", () => {
    const 結果 = 分類する(家計が苦しい人);
    const id = 結果.特に確認したほうがよい.map((項目) => 項目.制度.id);

    expect(id).toContain("mext-shugaku");
    expect(id).toContain("jasso-kyufu");
    expect(id).toContain("care-leaver");
  });

  it("normal だけの制度は「確認する価値がある」に入る", () => {
    const 結果 = 分類する(家計が苦しい人);
    const id = 結果.確認する価値がある.map((項目) => 項目.制度.id);

    expect(id).toContain("jasso-taiyo");
    expect(id).toContain("school-genmen");
    expect(id).toContain("minkan");
  });

  it("シグナルが無い制度も、対象外でなければ「知っておくとよい」に残る", () => {
    const 結果 = 分類する(家計が苦しい人);
    const id = 結果.知っておくとよい.map((項目) => 項目.制度.id);

    // 住んでいる地域を聞いていないので、自治体の制度は関連を判断できない。
    // それでも消さずに残す。
    expect(id).toContain("local-gov");
  });

  it("strong と normal の両方があるときは「特に確認したほうがよい」に入る", () => {
    // jasso-kyufu は familySupport で strong、grade で normal のシグナルを持つ
    const 結果 = 分類する(家計が苦しい人);
    expect(結果.特に確認したほうがよい.map((項目) => 項目.制度.id)).toContain(
      "jasso-kyufu"
    );
    expect(結果.確認する価値がある.map((項目) => 項目.制度.id)).not.toContain(
      "jasso-kyufu"
    );
  });

  it("家計に余裕がある人でも、主要な制度が消えず順位が下がるだけ", () => {
    const 余裕がある人 = { ...家計が苦しい人, familySupport: "enough" };
    const 結果 = 分類する(余裕がある人);
    const 優先 = 結果.特に確認したほうがよい.map((項目) => 項目.制度.id);

    // Ver.0 ではこの2件は「そもそも表示されない」だった。
    // Ver.1 では消さず、優先グループから外すだけにする。
    expect(優先).not.toContain("mext-shugaku");
    expect(優先).not.toContain("jasso-kyufu");

    expect(表示id(余裕がある人)).toContain("mext-shugaku");
    expect(表示id(余裕がある人)).toContain("jasso-kyufu");

    // 家計の手がかりが無い mext-shugaku は、いちばん下のグループへ
    expect(結果.知っておくとよい.map((項目) => 項目.制度.id)).toContain(
      "mext-shugaku"
    );
  });
});

/* ============================================================
   2. 除外の決まり（いちばん慎重に扱う部分）
   ============================================================ */

describe("除外は、明らかに当てはまらないときだけ", () => {
  it("施設経験が「ない」と答えた人には、施設経験者向けの支援を出さない", () => {
    const 回答 = {
      grade: "hs2",
      schoolType: "private",
      living: "home",
      familySupport: "difficult",
      researched: "not_yet",
      careBackground: "no",
    };
    expect(表示id(回答)).not.toContain("care-leaver");
  });

  it("【重要】施設の質問に答えなかった人からは、その支援を隠さない", () => {
    const 回答 = {
      grade: "hs2",
      schoolType: "private",
      living: "home",
      familySupport: "difficult",
      researched: "not_yet",
      careBackground: "skip",
    };
    // 答えたくなかっただけの人に、情報が届かなくなってはいけない
    expect(表示id(回答)).toContain("care-leaver");
  });

  it("まだ答えていない項目を理由に除外しない", () => {
    expect(表示id({})).toContain("care-leaver");
    expect(表示id({ grade: "hs1" })).toContain("care-leaver");
  });

  it("「分からない」「答えない」では、けっして除外と判定しない", () => {
    for (const 値 of 分からないことを表す回答) {
      expect(明らかに当てはまらない({ careBackground: 値 }, { careBackground: [値] })).toBe(
        false
      );
    }
  });

  it("excludeIf が空の制度は、どんな回答でも除外されない", () => {
    const 除外条件なし = 制度データ
      .filter((制度) => Object.keys(制度.matching?.excludeIf || {}).length === 0)
      .map((制度) => 制度.id);

    for (const 回答 of 回答パターン) {
      const 出た = 表示id(回答);
      for (const id of 除外条件なし) {
        expect(出た).toContain(id);
      }
    }
  });
});

/* ============================================================
   3. 1,728通りすべてで守られる決まり
   ============================================================ */

describe("1,728通りすべてで守られる決まり", () => {
  it("パターン数が1,728通りである", () => {
    expect(回答パターン.length).toBe(1728);
  });

  it("同じ制度が2つ以上のグループに入らない", () => {
    const 違反 = [];
    for (const 回答 of 回答パターン) {
      const id = 表示id(回答);
      if (new Set(id).size !== id.length) 違反.push(回答);
    }
    expect(違反).toEqual([]);
  });

  it("除外されていない制度は、必ず3グループのどこかに入る", () => {
    const 違反 = [];
    for (const 回答 of 回答パターン) {
      const 結果 = 分類する(回答);
      const 合計 =
        結果.特に確認したほうがよい.length +
        結果.確認する価値がある.length +
        結果.知っておくとよい.length +
        結果.対象外.length;
      if (合計 !== 制度データ.length) 違反.push({ 回答, 合計 });
    }
    expect(違反).toEqual([]);
  });

  it("【重要】「分からない」「答えない」に変えても、制度が減らない", () => {
    const 不明にできる質問 = {
      schoolType: "undecided",
      living: "undecided",
      familySupport: "unknown",
      careBackground: "skip",
    };

    const 違反 = [];
    for (const 回答 of 回答パターン) {
      const もとの件数 = 表示id(回答).length;

      for (const [質問, 不明の値] of Object.entries(不明にできる質問)) {
        const 不明にした回答 = { ...回答, [質問]: 不明の値 };
        const 件数 = 表示id(不明にした回答).length;

        if (件数 < もとの件数) {
          違反.push(
            `${質問} を「${回答[質問]}」から「${不明の値}」に変えたら ` +
              `${もとの件数}件 → ${件数}件 に減りました`
          );
        }
      }
    }

    expect(
      [...new Set(違反)],
      "答えないことで支援が見えなくなってはいけません"
    ).toEqual([]);
  });

  it("どのパターンでも、表示される制度が0件にならない（いまのデータでは）", () => {
    for (const 回答 of 回答パターン) {
      expect(表示id(回答).length).toBeGreaterThan(0);
    }
  });

  it("strong があるのに下のグループへ落ちることがない", () => {
    for (const 回答 of 回答パターン) {
      const 結果 = 分類する(回答);
      for (const 項目 of [...結果.確認する価値がある, ...結果.知っておくとよい]) {
        const strongが当たっている = (項目.制度.matching?.signals || []).some(
          (シグナル) =>
            シグナル.strength === "strong" &&
            Object.entries(シグナル.when).every(([k, v]) => v.includes(回答[k]))
        );
        expect(strongが当たっている).toBe(false);
      }
    }
  });
});

/* ============================================================
   4. Ver.0 と比べて、情報が減っていないこと
   ============================================================ */

describe("Ver.0 で見えていた制度が、Ver.1 で見えなくなっていない", () => {
  const ver0 = JSON.parse(
    readFileSync(
      join(process.cwd(), "tests/fixtures/ver0-matching-baseline.json"),
      "utf-8"
    )
  );

  it("Ver.0 の記録が読み込めている", () => {
    expect(ver0.パターン数).toBe(1728);
  });

  it("【重要】Ver.0 で表示されていた制度は、すべて Ver.1 でも表示される", () => {
    const 消えたもの = [];

    for (const 回答 of 回答パターン) {
      const 鍵 = ver0.質問の順番.map((k) => 回答[k]).join("|");
      const ver0の制度 = (ver0.結果[鍵] || "").split(",").filter(Boolean);
      const ver1の制度 = 表示id(回答);

      for (const id of ver0の制度) {
        if (!ver1の制度.includes(id)) {
          消えたもの.push(`${鍵} で「${id}」が見えなくなりました`);
        }
      }
    }

    expect(
      [...new Set(消えたもの)],
      "Ver.1 は優先順位を下げるだけで、制度を消してはいけません"
    ).toEqual([]);
  });

  it("Ver.1 のほうが、見える制度が多いパターンがある", () => {
    // 「消していない」だけでなく、実際に見落としが減っていることを確かめる
    let 増えたパターン = 0;

    for (const 回答 of 回答パターン) {
      const 鍵 = ver0.質問の順番.map((k) => 回答[k]).join("|");
      const ver0の件数 = (ver0.結果[鍵] || "").split(",").filter(Boolean).length;
      if (表示id(回答).length > ver0の件数) 増えたパターン += 1;
    }

    expect(増えたパターン).toBeGreaterThan(0);
  });
});

/* ============================================================
   5. 質問の役割
   ============================================================ */

describe("質問は、何のために聞いているかを説明できる", () => {
  it("すべての質問に purpose が書かれている", () => {
    for (const 質問 of QUESTIONS) {
      expect(質問.purpose, `${質問.key} に purpose がありません`).toBeTruthy();
      expect(typeof 質問.usedForMatching).toBe("boolean");
    }
  });

  it("【重要】usedForMatching の記載が、制度データの実態と合っている", () => {
    // 制度データが実際に見ている質問を集める
    const 実際に使われている質問 = new Set();
    for (const 制度 of 制度データ) {
      const matching = 制度.matching || {};
      Object.keys(matching.excludeIf || {}).forEach((k) =>
        実際に使われている質問.add(k)
      );
      (matching.signals || []).forEach((シグナル) =>
        Object.keys(シグナル.when || {}).forEach((k) => 実際に使われている質問.add(k))
      );
    }

    const ずれ = [];
    for (const 質問 of QUESTIONS) {
      const 実際 = 実際に使われている質問.has(質問.key);
      if (質問.usedForMatching !== 実際) {
        ずれ.push(
          `${質問.key}: usedForMatching は ${質問.usedForMatching} と書いてありますが、` +
            `制度データでは ${実際 ? "使われています" : "使われていません"}`
        );
      }
    }

    expect(
      ずれ,
      "質問の説明と制度データがずれています。どちらかを直してください。"
    ).toEqual([]);
  });

  it("制度データが、質問に無いキーを見ていない", () => {
    const 質問のキー = QUESTIONS.map((質問) => 質問.key);
    const 知らないキー = [];

    for (const 制度 of 制度データ) {
      const matching = 制度.matching || {};
      const 見ているキー = [
        ...Object.keys(matching.excludeIf || {}),
        ...(matching.signals || []).flatMap((s) => Object.keys(s.when || {})),
      ];
      for (const キー of 見ているキー) {
        if (!質問のキー.includes(キー)) 知らないキー.push(`${制度.id}: ${キー}`);
      }
    }

    expect(知らないキー, "質問に無い項目を見ています（書き間違い？）").toEqual([]);
  });

  it("制度データが、質問に無い選択肢を見ていない", () => {
    const 選べる値 = Object.fromEntries(
      QUESTIONS.map((質問) => [質問.key, 質問.options.map((o) => o.value)])
    );
    const 知らない値 = [];

    for (const 制度 of 制度データ) {
      const matching = 制度.matching || {};
      const 条件すべて = [
        matching.excludeIf || {},
        ...(matching.signals || []).map((s) => s.when || {}),
      ];
      for (const 条件 of 条件すべて) {
        for (const [キー, 値一覧] of Object.entries(条件)) {
          for (const 値 of 値一覧) {
            if (!選べる値[キー]?.includes(値)) {
              知らない値.push(`${制度.id}: ${キー} の「${値}」は選択肢にありません`);
            }
          }
        }
      }
    }

    expect(知らない値).toEqual([]);
  });
});

/* ============================================================
   6. 候補になった理由
   ============================================================ */

describe("候補になった理由が、回答と結びついている", () => {
  it("家計が苦しいと答えた人には、その回答にふれた理由が出る", () => {
    const 結果 = 分類する({
      grade: "hs2",
      schoolType: "private",
      living: "alone",
      familySupport: "difficult",
      researched: "not_yet",
      careBackground: "no",
    });

    const 制度 = 結果.特に確認したほうがよい.find(
      (項目) => 項目.制度.id === "mext-shugaku"
    );
    expect(制度.回答にもとづく理由.length).toBeGreaterThan(0);
    expect(制度.回答にもとづく理由.join("")).toMatch(/答えた/);
  });

  it("回答が変わると、出てくる理由も変わる", () => {
    const 共通 = {
      grade: "hs2",
      schoolType: "private",
      living: "alone",
      researched: "not_yet",
      careBackground: "no",
    };

    const 苦しい = 分類する({ ...共通, familySupport: "difficult" });
    const 余裕あり = 分類する({ ...共通, familySupport: "enough" });

    const 理由を取る = (結果) =>
      表示される制度(結果)
        .find((項目) => 項目.制度.id === "mext-shugaku")
        .回答にもとづく理由.join("");

    expect(理由を取る(苦しい)).not.toBe(理由を取る(余裕あり));
    expect(理由を取る(余裕あり)).toBe("");
  });

  it("シグナルの無い制度には、回答にもとづく理由が付かない", () => {
    const 結果 = 分類する({
      grade: "hs2",
      schoolType: "private",
      living: "alone",
      familySupport: "difficult",
      researched: "not_yet",
      careBackground: "no",
    });

    const 自治体 = 結果.知っておくとよい.find(
      (項目) => 項目.制度.id === "local-gov"
    );
    expect(自治体.回答にもとづく理由).toEqual([]);
  });

  it("理由の文章が、受け取れることを断定していない", () => {
    const 禁止 = /受給でき|もらえます|支給されます|対象です|資格があ/;

    for (const 制度 of 制度データ) {
      for (const シグナル of 制度.matching?.signals || []) {
        expect(シグナル.reason, `${制度.id} の理由が断定的です`).not.toMatch(禁止);
      }
    }
  });
});
