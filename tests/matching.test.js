// @vitest-environment node

/**
 * マッチング結果が変わっていないことを確かめるテストです。
 *
 * 第2段階では、制度データを JSON ファイルへ移しただけで、
 * 「どの回答のときにどの制度を出すか」は一切変えていません。
 *
 * それを証明するために、回答の組み合わせ 1,728 通りすべてについて、
 * 移動する前に記録しておいた結果（tests/fixtures/matching-baseline.json）と
 * 1件ずつ突き合わせます。
 *
 * 第3段階でマッチングを改善するときは、結果が変わるのが正しいので、
 * そのときに基準データを作り直します。
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { matchPrograms } from "../src/ShingakuNavi.jsx";
import 制度データ from "../src/lib/loadPrograms.js";

const 基準 = JSON.parse(
  readFileSync(join(process.cwd(), "tests/fixtures/matching-baseline.json"), "utf-8")
);

const 選択肢 = {
  grade: ["hs1", "hs2", "hs3", "graduate"],
  schoolType: ["national", "private", "both", "undecided"],
  living: ["home", "alone", "undecided"],
  familySupport: ["difficult", "partial", "enough", "unknown"],
  researched: ["not_yet", "a_little", "already"],
  careBackground: ["yes", "no", "skip"],
};

/** 回答の組み合わせをすべて作る */
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

const 鍵にする = (回答) => 基準.質問の順番.map((k) => 回答[k]).join("|");

describe("1,728通りすべてで、Ver.0と同じ制度が出る", () => {
  const 回答パターン = すべての回答パターン();

  it("パターン数が基準データと同じ", () => {
    expect(回答パターン.length).toBe(基準.パターン数);
    expect(回答パターン.length).toBe(1728);
  });

  it("すべてのパターンで、表示される制度と順番が一致する", () => {
    const 違ったもの = [];

    for (const 回答 of 回答パターン) {
      const 鍵 = 鍵にする(回答);
      const いまの結果 = matchPrograms(回答)
        .map((制度) => 制度.id)
        .join(",");
      const 基準の結果 = 基準.結果[鍵];

      if (いまの結果 !== 基準の結果) {
        違ったもの.push(
          `  回答: ${鍵}\n    Ver.0: ${基準の結果}\n    いま : ${いまの結果}`
        );
      }
    }

    expect(
      違ったもの,
      `制度データを移したことで、マッチング結果が変わってしまいました。\n` +
        `第2段階では結果を変えてはいけません。\n\n` +
        違ったもの.slice(0, 10).join("\n") +
        (違ったもの.length > 10 ? `\n  ... ほか ${違ったもの.length - 10} 件` : "")
    ).toEqual([]);
  });

  it("基準データに無い回答パターンが無い", () => {
    const いまの鍵 = new Set(回答パターン.map(鍵にする));
    const 基準の鍵 = Object.keys(基準.結果);
    expect(基準の鍵.filter((鍵) => !いまの鍵.has(鍵))).toEqual([]);
  });
});

describe("マッチングの基本的な決まり", () => {
  it("matching が空の制度は、どんな回答でも必ず表示される", () => {
    const 条件なしの制度 = 制度データ
      .filter((制度) => Object.keys(制度.matching || {}).length === 0)
      .map((制度) => 制度.id);

    const 結果 = matchPrograms({
      grade: "hs1",
      schoolType: "undecided",
      living: "undecided",
      familySupport: "enough",
      researched: "already",
      careBackground: "no",
    }).map((制度) => 制度.id);

    for (const id of 条件なしの制度) {
      expect(結果).toContain(id);
    }
  });

  it("【重要】回答しなかった項目があっても、エラーにならない", () => {
    // 回答の途中でも、空の回答でも、アプリが落ちてはいけない
    expect(() => matchPrograms({})).not.toThrow();
    expect(() => matchPrograms({ grade: "hs1" })).not.toThrow();
  });
});
