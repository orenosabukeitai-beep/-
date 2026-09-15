/**
 * 制度データが正しい形をしているかを調べるための決まりごとです。
 *
 * ここに書いてある内容は、tests/data.test.js から自動で検査されます。
 * 項目が足りない制度を追加すると、`npm test` が日本語で教えてくれます。
 */

/** 必ず値が入っていなければいけない項目 */
export const 必須の項目 = [
  "id",
  "name",
  "provider",
  "type",
  "summary",
  "officialText",
  "status",
];

/** 値が無ければ null にしておく項目（推測で埋めてはいけない） */
export const 不明ならnullにする項目 = [
  "educationStage",
  "mainConditions",
  "incomeConditions",
  "otherConditions",
  "supportContent",
  "applicationPeriod",
  "officialUrl",
  "checkedAt",
  "notes",
];

/** すべての項目（この順番で JSON に書くと読みやすくなります） */
export const すべての項目 = [
  "id",
  "name",
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
  "checkedAt",
  "notes",
  "status",
  "matching",
];

/** status に使ってよい値 */
export const 使える状態 = ["draft", "verified"];

/**
 * シグナルの強さに使ってよい値。
 *
 * strong は「受け取れる見込みが高い」という意味ではありません。
 * 「その人の回答から見て、特に確認する価値がある」という意味だけです。
 */
export const 使えるシグナルの強さ = ["strong", "normal"];

/** 日付は「2026-09-15」の形で書く */
const 日付の形 = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 制度データを1件調べて、問題点の一覧を返します。
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
      問題.push(`「${項目}」の行がありません。_TEMPLATE.json を見て追加してください。`);
    }
  }

  if (!使える状態.includes(制度.status)) {
    問題.push(
      `「status」は ${使える状態.join(" か ")} のどちらかにしてください（いまは「${制度.status}」）。`
    );
  }

  // officialUrl は null か、https で始まる住所
  if (制度.officialUrl !== null && 制度.officialUrl !== undefined) {
    if (typeof 制度.officialUrl !== "string" || !制度.officialUrl.startsWith("https://")) {
      問題.push(
        `「officialUrl」は https:// で始まる住所か、分からなければ null にしてください（いまは「${制度.officialUrl}」）。`
      );
    }
  }

  // checkedAt は null か、2026-09-15 の形
  if (制度.checkedAt !== null && 制度.checkedAt !== undefined) {
    if (typeof 制度.checkedAt !== "string" || !日付の形.test(制度.checkedAt)) {
      問題.push(
        `「checkedAt」は 2026-09-15 のような形か、まだ確認していなければ null にしてください（いまは「${制度.checkedAt}」）。`
      );
    }
  }

  if (制度.whyCheck !== undefined && !Array.isArray(制度.whyCheck)) {
    問題.push("「whyCheck」は [ ] で囲んだ一覧にしてください。");
  }

  問題.push(...matchingを調べる(制度.matching));

  return 問題;
}

/** matching（どんな回答の人に出すか）の書き方を調べる */
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
 * @param 制度一覧  調べたい制度の配列
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
