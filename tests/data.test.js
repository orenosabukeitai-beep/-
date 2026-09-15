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
  使える種類,
  種類ごとの使える状態,
} from "../src/lib/schema.js";

const 制度フォルダ = join(process.cwd(), "data/programs");

const データファイル一覧 = () =>
  readdirSync(制度フォルダ).filter(
    (名前) => 名前.endsWith(".json") && !名前.startsWith("_")
  );

const programだけ = 制度データ.filter((d) => d.recordType === "program");
const guideだけ = 制度データ.filter((d) => d.recordType === "guide");

describe("制度データの読み込み", () => {
  it("データが読み込めている", () => {
    expect(制度データ.length).toBeGreaterThan(0);
  });

  it("雛形ファイル（_ で始まるもの）は読み込まれない", () => {
    expect(制度データ.map((制度) => 制度.id)).not.toContain("");
    expect(制度データ.some((制度) => 制度.name === "")).toBe(false);
  });

  it("ファイルの数と読み込まれた件数が合っている", () => {
    expect(制度データ.length).toBe(データファイル一覧().length);
  });

  it("id が重複していない", () => {
    const id一覧 = 制度データ.map((制度) => 制度.id);
    expect(new Set(id一覧).size).toBe(id一覧.length);
  });

  it("画面に出る順番が、ファイル名の順番と同じ", () => {
    const ファイル順のid = データファイル一覧()
      .sort()
      .map((名前) => JSON.parse(readFileSync(join(制度フォルダ, 名前), "utf-8")).id);

    expect(制度データ.map((制度) => 制度.id)).toEqual(ファイル順のid);
  });
});

describe("必要な項目がすべて揃っている", () => {
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

describe("recordType（program か guide か）", () => {
  it.each(制度データ.map((制度) => [制度.id, 制度.recordType]))(
    "%s の recordType: %s",
    (id, 種類) => {
      expect(使える種類).toContain(種類);
    }
  );

  it("program と guide の両方がある", () => {
    expect(programだけ.length).toBeGreaterThan(0);
    expect(guideだけ.length).toBeGreaterThan(0);
  });

  it("program には type（給付型・貸与型など）がある", () => {
    for (const 制度 of programだけ) {
      expect(制度.type, `${制度.id} に type がありません`).toBeTruthy();
    }
  });

  it("guide の type は null（内容が相手によって変わるため）", () => {
    for (const 案内 of guideだけ) {
      expect(案内.type, `${案内.id} の type は null にしてください`).toBeNull();
    }
  });
});

describe("status（確認の状態）", () => {
  it.each(制度データ.map((制度) => [制度.id, 制度.recordType, 制度.status]))(
    "%s（%s）の status: %s",
    (id, 種類, status) => {
      expect(種類ごとの使える状態[種類]).toContain(status);
    }
  );

  it("【重要】guide に verified は使えない", () => {
    // guide は特定の1つの制度ではないため、
    // 「公式確認済みの制度」として扱ってはいけない。
    for (const 案内 of guideだけ) {
      expect(
        案内.status,
        `${案内.id} は guide なので verified にできません`
      ).not.toBe("verified");
    }

    // 決まりごと自体も確認する
    expect(種類ごとの使える状態.guide).not.toContain("verified");
  });

  it("guide を verified にすると、検査が問題として報告する", () => {
    const だめな例 = { ...guideだけ[0], status: "verified" };
    const 問題 = 制度データを調べる(だめな例);
    expect(問題.join("")).toMatch(/verified/);
  });

  it("draft の制度は checkedAt が null（確認していないので日付が無い）", () => {
    for (const 制度 of 制度データ.filter((p) => p.status === "draft")) {
      expect(制度.checkedAt, `${制度.id} は draft なので checkedAt は null です`).toBeNull();
    }
  });
});

describe("verified の program は、根拠をたどれる", () => {
  const 確認済み = programだけ.filter((p) => p.status === "verified");

  it("verified の制度が1件以上ある", () => {
    expect(確認済み.length).toBeGreaterThan(0);
  });

  it.each(確認済み.map((p) => [p.id, p]))("%s に sources が1件以上ある", (id, 制度) => {
    expect(制度.sources.length).toBeGreaterThan(0);
  });

  it.each(確認済み.map((p) => [p.id, p]))(
    "%s の officialUrl が sources のどれかと一致する",
    (id, 制度) => {
      expect(制度.sources.map((s) => s.url)).toContain(制度.officialUrl);
    }
  );

  it.each(確認済み.map((p) => [p.id, p]))(
    "%s の checkedAt が sources のどれかと一致する",
    (id, 制度) => {
      expect(制度.sources.map((s) => s.checkedAt)).toContain(制度.checkedAt);
    }
  );

  it.each(確認済み.map((p) => [p.id, p]))(
    "%s の sources に title・url・checkedAt が揃っている",
    (id, 制度) => {
      for (const source of 制度.sources) {
        expect(source.title).toBeTruthy();
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  );

  it.each(確認済み.map((p) => [p.id, p]))(
    "%s の sources が公式ドメインである",
    (id, 制度) => {
      // まとめサイトやブログを根拠にしないための確認
      const 公式ドメイン = [".go.jp", ".ac.jp", ".lg.jp", ".or.jp"];
      for (const source of 制度.sources) {
        const ホスト = new URL(source.url).hostname;
        expect(
          公式ドメイン.some((末尾) => ホスト.endsWith(末尾)),
          `${id} の根拠 ${ホスト} が公式ドメインではありません`
        ).toBe(true);
      }
    }
  );
});

describe("officialUrl は null か、正しい https の住所", () => {
  it.each(制度データ.map((制度) => [制度.id, 制度.officialUrl]))(
    "%s の officialUrl: %s",
    (id, url) => {
      if (url === null) return;
      expect(url.startsWith("https://")).toBe(true);
      expect(() => new URL(url)).not.toThrow();
    }
  );
});

describe("checkedAt は null か、YYYY-MM-DD の形", () => {
  it.each(制度データ.map((制度) => [制度.id, 制度.checkedAt]))(
    "%s の checkedAt: %s",
    (id, 日付) => {
      if (日付 === null) return;
      expect(日付).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(日付).getTime())).toBe(false);
    }
  );
});

describe("統合の記録（replaces）", () => {
  it("replaces に書いた id が、いまのデータに残っていない", () => {
    // 統合したのに元のファイルが残っていると、二重に表示されてしまう
    const いまのid = 制度データ.map((制度) => 制度.id);
    for (const 制度 of 制度データ) {
      for (const 旧id of 制度.replaces || []) {
        expect(
          いまのid,
          `${制度.id} が ${旧id} を統合したはずですが、${旧id} がまだ残っています`
        ).not.toContain(旧id);
      }
    }
  });

  it("同じ旧 id を、2つの制度が統合していない", () => {
    const すべての旧id = 制度データ.flatMap((制度) => 制度.replaces || []);
    expect(new Set(すべての旧id).size).toBe(すべての旧id.length);
  });
});

describe("情報が古くなった制度を見つける仕組み", () => {
  // ここでは本物の制度データを書き換えず、テスト用の作り物を使います。
  const 基準日 = new Date("2026-09-16");

  const テスト用データ = [
    { id: "古い-確認済み", status: "verified", checkedAt: "2024-01-01" },
    { id: "新しい-確認済み", status: "verified", checkedAt: "2026-08-01" },
    { id: "ちょうど13か月前", status: "verified", checkedAt: "2025-08-15" },
    { id: "未確認-日付なし", status: "draft", checkedAt: null },
    { id: "未確認-日付あり", status: "draft", checkedAt: "2020-01-01" },
    { id: "案内-確認済み", status: "checked", checkedAt: "2020-01-01" },
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
    const 古いもの = 情報が古い制度を探す(テスト用データ, 12, 基準日).map((p) => p.id);
    expect(古いもの).not.toContain("未確認-日付なし");
    expect(古いもの).not.toContain("未確認-日付あり");
  });

  it("案内（guide）は対象にしない", () => {
    const 古いもの = 情報が古い制度を探す(テスト用データ, 12, 基準日).map((p) => p.id);
    expect(古いもの).not.toContain("案内-確認済み");
  });

  it("いまの制度データには、古くなったものが無い", () => {
    const 古いもの = 情報が古い制度を探す(制度データ, 12);
    expect(
      古いもの.map((p) => `${p.id}（最終確認 ${p.checkedAt}）`),
      "確認から12か月以上たった制度があります。公式サイトで最新かどうか確認し、checkedAt を更新してください。"
    ).toEqual([]);
  });
});

describe("雛形ファイル", () => {
  const 雛形一覧 = ["_TEMPLATE-program.json", "_TEMPLATE-guide.json"];

  it.each(雛形一覧)("%s が正しい JSON として読める", (名前) => {
    const 中身 = JSON.parse(readFileSync(join(制度フォルダ, 名前), "utf-8"));
    expect(中身).toBeTypeOf("object");
  });

  it.each(雛形一覧)("%s に必要な項目がすべて並んでいる", (名前) => {
    const 中身 = JSON.parse(readFileSync(join(制度フォルダ, 名前), "utf-8"));
    expect(Object.keys(中身)).toEqual(すべての項目);
  });

  it.each(雛形一覧)("%s にコメントが書かれていない", (名前) => {
    // JSON はコメントを書けないため
    const 中身 = readFileSync(join(制度フォルダ, 名前), "utf-8");
    expect(中身).not.toMatch(/\/\/|\/\*/);
  });

  it("雛形の recordType が、ファイル名と合っている", () => {
    const program雛形 = JSON.parse(
      readFileSync(join(制度フォルダ, "_TEMPLATE-program.json"), "utf-8")
    );
    const guide雛形 = JSON.parse(
      readFileSync(join(制度フォルダ, "_TEMPLATE-guide.json"), "utf-8")
    );
    expect(program雛形.recordType).toBe("program");
    expect(guide雛形.recordType).toBe("guide");
  });
});
