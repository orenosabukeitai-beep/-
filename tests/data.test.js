/**
 * 制度データのテストです。
 *
 * data/programs/ に置いた JSON が正しい形をしているかを確認します。
 * 項目を書き忘れたり、URLの形を間違えたりすると、ここで日本語で教えてくれます。
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import 制度データ from "../src/lib/loadPrograms.js";
import {
  制度データを調べる,
  情報が古い制度を探す,
  すべての項目,
  使える状態,
} from "../src/lib/schema.js";

const 制度フォルダ = join(process.cwd(), "data/programs");

describe("制度データの読み込み", () => {
  it("制度が読み込めている", () => {
    expect(制度データ.length).toBeGreaterThan(0);
  });

  it("_TEMPLATE.json は制度として読み込まれない", () => {
    // 雛形は id が空なので、もし読み込まれていたらここで分かる
    expect(制度データ.map((制度) => 制度.id)).not.toContain("");
    expect(制度データ.some((制度) => 制度.name === "")).toBe(false);
  });

  it("ファイルの数と読み込まれた制度の数が合っている", () => {
    const 制度ファイル = readdirSync(制度フォルダ).filter(
      (名前) => 名前.endsWith(".json") && !名前.startsWith("_")
    );
    expect(制度データ.length).toBe(制度ファイル.length);
  });

  it("id が重複していない", () => {
    const id一覧 = 制度データ.map((制度) => 制度.id);
    expect(new Set(id一覧).size).toBe(id一覧.length);
  });

  it("画面に出る順番が、ファイル名の順番と同じ", () => {
    const ファイル順のid = readdirSync(制度フォルダ)
      .filter((名前) => 名前.endsWith(".json") && !名前.startsWith("_"))
      .sort()
      .map((名前) => JSON.parse(readFileSync(join(制度フォルダ, 名前), "utf-8")).id);

    expect(制度データ.map((制度) => 制度.id)).toEqual(ファイル順のid);
  });
});

describe("制度データに必要な項目がすべて揃っている", () => {
  it.each(制度データ.map((制度) => [制度.id, 制度]))(
    "%s の項目が正しい",
    (id, 制度) => {
      const 問題 = 制度データを調べる(制度);
      expect(
        問題,
        `data/programs/ の「${id}」に問題があります:\n  - ${問題.join("\n  - ")}`
      ).toEqual([]);
    }
  );

  it.each(制度データ.map((制度) => [制度.id, 制度]))(
    "%s に余計な項目が入っていない",
    (id, 制度) => {
      const 知らない項目 = Object.keys(制度).filter(
        (項目) => !すべての項目.includes(項目)
      );
      expect(
        知らない項目,
        `「${id}」に見覚えのない項目があります。書き間違いかもしれません: ${知らない項目.join(", ")}`
      ).toEqual([]);
    }
  );
});

describe("officialUrl は null か、正しい https の住所", () => {
  it.each(制度データ.map((制度) => [制度.id, 制度.officialUrl]))(
    "%s の officialUrl: %s",
    (id, url) => {
      if (url === null) return;
      expect(typeof url).toBe("string");
      expect(url.startsWith("https://"), `${id} の officialUrl は https:// で始めてください`).toBe(true);
      expect(() => new URL(url)).not.toThrow();
    }
  );
});

describe("checkedAt は null か、YYYY-MM-DD の形", () => {
  it.each(制度データ.map((制度) => [制度.id, 制度.checkedAt]))(
    "%s の checkedAt: %s",
    (id, 日付) => {
      if (日付 === null) return;
      expect(日付, `${id} の checkedAt は 2026-09-15 のような形にしてください`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/
      );
      expect(Number.isNaN(new Date(日付).getTime())).toBe(false);
    }
  );
});

describe("status は draft か verified", () => {
  it.each(制度データ.map((制度) => [制度.id, 制度.status]))(
    "%s の status: %s",
    (id, status) => {
      expect(使える状態).toContain(status);
    }
  );

  it("いまの7制度は、まだ公式確認をしていないので draft", () => {
    // 公式サイトでの確認作業が済んだら verified に変えてください。
    // その時点でこのテストは失敗するので、期待値を書き換えてください。
    const 未確認 = 制度データ.filter((制度) => 制度.status === "draft");
    expect(未確認.length).toBe(制度データ.length);
  });

  it("draft の制度は checkedAt が null（確認していないので日付が無い）", () => {
    for (const 制度 of 制度データ.filter((p) => p.status === "draft")) {
      expect(制度.checkedAt, `${制度.id} は draft なので checkedAt は null です`).toBeNull();
    }
  });

  it("verified の制度には、必ず確認日と公式URLがある", () => {
    for (const 制度 of 制度データ.filter((p) => p.status === "verified")) {
      expect(制度.checkedAt, `${制度.id} を verified にするなら checkedAt が必要です`).not.toBeNull();
      expect(制度.officialUrl, `${制度.id} を verified にするなら officialUrl が必要です`).not.toBeNull();
    }
  });
});

describe("情報が古くなった制度を見つける仕組み", () => {
  // ここでは本物の制度データを書き換えず、テスト用の作り物を使います。
  const 基準日 = new Date("2026-09-15");

  const テスト用データ = [
    { id: "古い-確認済み", status: "verified", checkedAt: "2024-01-01" },
    { id: "新しい-確認済み", status: "verified", checkedAt: "2026-08-01" },
    { id: "ちょうど13か月前", status: "verified", checkedAt: "2025-08-15" },
    { id: "未確認-日付なし", status: "draft", checkedAt: null },
    { id: "未確認-日付あり", status: "draft", checkedAt: "2020-01-01" },
  ];

  it("確認から12か月以上たった制度を見つけられる", () => {
    const 古いもの = 情報が古い制度を探す(テスト用データ, 12, 基準日).map((p) => p.id);
    expect(古いもの).toContain("古い-確認済み");
    expect(古いもの).toContain("ちょうど13か月前");
  });

  it("最近確認した制度は古いと判定しない", () => {
    const 古いもの = 情報が古い制度を探す(テスト用データ, 12, 基準日).map((p) => p.id);
    expect(古いもの).not.toContain("新しい-確認済み");
  });

  it("【重要】まだ確認していない制度（draft）は対象にしない", () => {
    // draft はそもそも確認日が無い状態なので、「古い」と言うのはおかしい。
    // 日付が入っていても、verified でなければ対象外にする。
    const 古いもの = 情報が古い制度を探す(テスト用データ, 12, 基準日).map((p) => p.id);
    expect(古いもの).not.toContain("未確認-日付なし");
    expect(古いもの).not.toContain("未確認-日付あり");
  });

  it("いまの制度データには、古くなったものが無い", () => {
    // いまは全部 draft なので、ここは必ず空になります。
    // 将来 verified の制度が古くなると、このテストが失敗して気づけます。
    const 古いもの = 情報が古い制度を探す(制度データ, 12);
    expect(
      古いもの.map((p) => `${p.id}（最終確認 ${p.checkedAt}）`),
      "確認から12か月以上たった制度があります。公式サイトで最新かどうか確認し、checkedAt を更新してください。"
    ).toEqual([]);
  });
});

describe("_TEMPLATE.json", () => {
  const 雛形 = JSON.parse(
    readFileSync(join(制度フォルダ, "_TEMPLATE.json"), "utf-8")
  );

  it("正しい JSON として読める", () => {
    expect(雛形).toBeTypeOf("object");
  });

  it("必要な項目がすべて並んでいる", () => {
    expect(Object.keys(雛形)).toEqual(すべての項目);
  });

  it("コメントが書かれていない（JSON はコメントを書けないため）", () => {
    const 中身 = readFileSync(join(制度フォルダ, "_TEMPLATE.json"), "utf-8");
    expect(中身).not.toMatch(/\/\/|\/\*/);
  });
});
