/**
 * 制度データが正しい形をしているかを調べるための決まりごとです。
 *
 * ここに書いてある内容は、tests/data.test.js から自動で検査されます。
 * 項目が足りないデータを追加すると、`npm test` が日本語で教えてくれます。
 *
 * ■ 2種類のデータがあります
 *
 *   program … 実施主体がはっきりしていて、公式情報で内容を確認できる制度
 *             例：高等教育の修学支援新制度
 *
 *   guide   … 学校・自治体・民間団体によって内容が変わるため、
 *             特定の1つの制度を指さない「確認先の案内」
 *             例：住んでいる自治体の支援を確認する
 *
 * guide を「公式確認済みの制度」として扱ってはいけません。
 * そのため guide には verified を使えないようにしてあります。
 */

/** データの種類 */
export const 使える種類 = ["program", "guide"];

/**
 * status に使ってよい値（データの種類ごとに違います）
 *
 *   program の verified … 公式ページと照らし合わせて内容を確認した
 *   guide   の checked  … 確認先と探し方が妥当であることを確認した
 *                         （制度の内容を公式確認した、という意味ではない）
 */
export const 種類ごとの使える状態 = {
  program: ["draft", "verified"],
  guide: ["draft", "checked"],
};

/**
 * シグナルの強さに使ってよい値。
 *
 * strong は「受け取れる見込みが高い」という意味ではありません。
 * 「その人の回答から見て、特に確認する価値がある」という意味だけです。
 */
export const 使えるシグナルの強さ = ["strong", "normal"];

/** 必ず値が入っていなければいけない項目 */
export const 必須の項目 = [
  "recordType",
  "id",
  "name",
  "provider",
  "summary",
  "officialText",
  "status",
];

/** すべての項目（この順番で JSON に書くと読みやすくなります） */
export const すべての項目 = [
  "recordType",
  "id",
  "name",
  "aliases",
  "replaces",
  "provider",
  "type",
  "educationStage",
  "summary",
  "whyCheck",
  "mainConditions",
  "incomeConditions",
  "otherConditions",
  "supportContent",
  "applicationPeriod",
  "officialUrl",
  "officialText",
  "sources",
  "checkedAt",
  "notes",
  "status",
  "matching",
];

/** 日付は「2026-09-16」の形で書く */
const 日付の形 = /^\d{4}-\d{2}-\d{2}$/;

const 日付として正しい = (値) =>
  typeof 値 === "string" && 日付の形.test(値) && !Number.isNaN(new Date(値).getTime());

/**
 * データを1件調べて、問題点の一覧を返します。
 * 問題が無ければ空の配列を返します。
 */
export function 制度データを調べる(制度) {
  const 問題 = [];

  for (const 項目 of 必須の項目) {
    const 値 = 制度[項目];
    if (値 === undefined || 値 === null || 値 === "") {
      問題.push(`「${項目}」が空です。必ず書いてください。`);
    }
  }

  for (const 項目 of すべての項目) {
    if (!(項目 in 制度)) {
      問題.push(`「${項目}」の行がありません。雛形ファイルを見て追加してください。`);
    }
  }

  問題.push(...種類と状態を調べる(制度));
  問題.push(...一覧の項目を調べる(制度));
  問題.push(...URLと日付を調べる(制度));
  問題.push(...sourcesを調べる(制度));
  問題.push(...matchingを調べる(制度.matching));

  return 問題;
}

/** recordType と status の組み合わせを調べる */
function 種類と状態を調べる(制度) {
  const 問題 = [];

  if (!使える種類.includes(制度.recordType)) {
    問題.push(
      `「recordType」は ${使える種類.join(" か ")} にしてください（いまは「${制度.recordType}」）。`
    );
    return 問題;
  }

  const 使える状態 = 種類ごとの使える状態[制度.recordType];
  if (!使える状態.includes(制度.status)) {
    問題.push(
      `${制度.recordType} の「status」は ${使える状態.join(" か ")} にしてください（いまは「${制度.status}」）。` +
        (制度.recordType === "guide" && 制度.status === "verified"
          ? " guide は特定の1つの制度ではないため、公式確認済みという意味の verified は使えません。"
          : "")
    );
  }

  if (制度.recordType === "guide" && 制度.type !== null) {
    問題.push(
      "guide は内容が相手によって変わるため、「type」（給付型・貸与型など）は null にしてください。"
    );
  }

  if (制度.recordType === "program" && (制度.type === null || 制度.type === undefined)) {
    問題.push("program には「type」（給付型・貸与型・減免など）を書いてください。");
  }

  return 問題;
}

/** 配列で書く項目を調べる */
function 一覧の項目を調べる(制度) {
  const 問題 = [];

  for (const 項目 of ["whyCheck", "aliases", "replaces", "sources"]) {
    if (制度[項目] !== undefined && !Array.isArray(制度[項目])) {
      問題.push(`「${項目}」は [ ] で囲んだ一覧にしてください。`);
    }
  }

  if (制度.educationStage !== null && 制度.educationStage !== undefined) {
    if (!Array.isArray(制度.educationStage)) {
      問題.push("「educationStage」は [ ] で囲んだ一覧か、分からなければ null にしてください。");
    }
  }

  return 問題;
}

/** URL と日付の形を調べる */
function URLと日付を調べる(制度) {
  const 問題 = [];

  if (制度.officialUrl !== null && 制度.officialUrl !== undefined) {
    if (typeof 制度.officialUrl !== "string" || !制度.officialUrl.startsWith("https://")) {
      問題.push(
        `「officialUrl」は https:// で始まる住所か、分からなければ null にしてください（いまは「${制度.officialUrl}」）。`
      );
    }
  }

  if (制度.checkedAt !== null && 制度.checkedAt !== undefined) {
    if (!日付として正しい(制度.checkedAt)) {
      問題.push(
        `「checkedAt」は 2026-09-16 のような形か、まだ確認していなければ null にしてください（いまは「${制度.checkedAt}」）。`
      );
    }
  }

  return 問題;
}

/**
 * sources（根拠にした公式ページの記録）を調べる。
 *
 * verified の program には、必ず根拠を残してもらいます。
 * どのページを見てこの内容を書いたのかを、後から追えるようにするためです。
 */
function sourcesを調べる(制度) {
  const 問題 = [];
  const sources = 制度.sources;

  if (!Array.isArray(sources)) return 問題;

  sources.forEach((source, 番号) => {
    const 場所 = `sources の ${番号 + 1} 件目`;

    if (typeof source.title !== "string" || source.title === "") {
      問題.push(`${場所}: 「title」にページの名前を書いてください。`);
    }
    if (typeof source.url !== "string" || !source.url.startsWith("https://")) {
      問題.push(`${場所}: 「url」は https:// で始まる住所にしてください。`);
    }
    if (!日付として正しい(source.checkedAt)) {
      問題.push(`${場所}: 「checkedAt」は 2026-09-16 のような形で、見た日を書いてください。`);
    }
  });

  // 公式確認済みの program だけ、根拠の整合性まで確認する
  if (制度.recordType === "program" && 制度.status === "verified") {
    if (sources.length === 0) {
      問題.push(
        "verified の制度には「sources」が1件以上必要です。どの公式ページを見て書いたかを残してください。"
      );
      return 問題;
    }

    const URL一覧 = sources.map((s) => s.url);
    if (!URL一覧.includes(制度.officialUrl)) {
      問題.push(
        "「officialUrl」は、sources に入っているURLのどれかと同じにしてください。" +
          "利用者に見せるリンクと、根拠にしたページがずれないようにするためです。"
      );
    }

    const 日付一覧 = sources.map((s) => s.checkedAt);
    if (!日付一覧.includes(制度.checkedAt)) {
      問題.push(
        "「checkedAt」は、sources のどれかの checkedAt と同じにしてください。" +
          "実際にページを見た日を制度全体の確認日にするためです。"
      );
    }

    if (制度.officialUrl === null) {
      問題.push("verified の制度には「officialUrl」が必要です。");
    }
  }

  return 問題;
}

/** matching（確認する順番の決め方）の書き方を調べる */
function matchingを調べる(matching) {
  const 問題 = [];

  if (
    matching === undefined ||
    typeof matching !== "object" ||
    matching === null ||
    Array.isArray(matching)
  ) {
    return ["「matching」は { } で囲んだ形にしてください。"];
  }

  const 知らない項目 = Object.keys(matching).filter(
    (項目) => !["excludeIf", "signals"].includes(項目)
  );
  if (知らない項目.length > 0) {
    問題.push(
      `「matching」に使えるのは excludeIf と signals だけです（いまは ${知らない項目.join(", ")} が入っています）。`
    );
  }

  if (
    matching.excludeIf !== undefined &&
    (typeof matching.excludeIf !== "object" ||
      matching.excludeIf === null ||
      Array.isArray(matching.excludeIf))
  ) {
    問題.push("「excludeIf」は { } で囲んだ形にしてください。");
  }

  if (matching.signals !== undefined && !Array.isArray(matching.signals)) {
    問題.push("「signals」は [ ] で囲んだ一覧にしてください。");
    return 問題;
  }

  (matching.signals || []).forEach((シグナル, 番号) => {
    const 場所 = `signals の ${番号 + 1} 件目`;

    if (
      typeof シグナル.when !== "object" ||
      シグナル.when === null ||
      Array.isArray(シグナル.when) ||
      Object.keys(シグナル.when).length === 0
    ) {
      問題.push(`${場所}: 「when」に、どの回答のときかを書いてください。`);
    }

    if (typeof シグナル.reason !== "string" || シグナル.reason === "") {
      問題.push(`${場所}: 「reason」に、確認するとよい理由を書いてください。`);
    }

    if (!使えるシグナルの強さ.includes(シグナル.strength)) {
      問題.push(
        `${場所}: 「strength」は ${使えるシグナルの強さ.join(" か ")} にしてください（いまは「${シグナル.strength}」）。`
      );
    }
  });

  return 問題;
}

/**
 * 情報が古くなっている制度を探します。
 *
 * 公式サイトでの確認が済んでいる（status が verified）制度だけを調べます。
 * まだ確認していない制度（draft）は、そもそも確認日が無いので調べません。
 *
 * @param 制度一覧  調べたいデータの配列
 * @param 何か月まで  これ以上たっていたら古いとみなす月数
 * @param 今日  比較の基準にする日（テストで日付を固定するために渡せます）
 */
export function 情報が古い制度を探す(制度一覧, 何か月まで = 12, 今日 = new Date()) {
  const 期限 = new Date(今日);
  期限.setMonth(期限.getMonth() - 何か月まで);

  return 制度一覧.filter((制度) => {
    if (制度.status !== "verified") return false;
    if (!制度.checkedAt) return false;
    return new Date(制度.checkedAt) < 期限;
  });
}
