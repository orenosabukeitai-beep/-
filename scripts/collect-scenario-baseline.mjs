// 想定シナリオごとに、結果画面に出た情報量を数えて表にするスクリプトです。
//
// これは「利用者テスト」ではありません。
// 人に使ってもらう前に、同じ入力に対して画面の情報量が急に増減していないかを
// 機械的に見比べるための基準値（ベースライン）を作るものです。
//
// 使い方（ターミナルで2つ開く）
//   1つめ: npm run build && npm run preview
//   2つめ: node scripts/collect-scenario-baseline.mjs
//
// 開発サーバー（npm run dev）に向けたいときは URL を渡します。
//   node scripts/collect-scenario-baseline.mjs http://127.0.0.1:5173/
//
// ブラウザの場所を指定したいときは PLAYWRIGHT_CHROMIUM_PATH を設定します。

import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const プロジェクト = join(dirname(fileURLToPath(import.meta.url)), "..");
const 接続先 = process.argv[2] ?? "http://127.0.0.1:4173/";

const シナリオ集 = JSON.parse(
  readFileSync(join(プロジェクト, "tests/fixtures/scenarios.json"), "utf-8"),
);
const 本体 = readFileSync(join(プロジェクト, "src/ShingakuNavi.jsx"), "utf-8");

// 選択肢のラベルは画面の文言そのものなので、ここでは持たずにソースから読み取ります。
// （文言を変えたときに、このスクリプトを直さなくて済むようにするため）
function ラベル表をソースから作る() {
  const 開始 = 本体.indexOf("export const QUESTIONS = [");
  if (開始 < 0) throw new Error("QUESTIONS が見つかりませんでした");
  const 範囲 = 本体.slice(開始, 本体.indexOf("\n];", 開始));

  const 表 = {};
  let 現在のキー = null;
  for (const 行 of 範囲.split("\n")) {
    const キー = 行.match(/key: "([^"]+)"/);
    if (キー) {
      現在のキー = キー[1];
      表[現在のキー] = {};
    }
    const 選択肢 = 行.match(/\{ value: "([^"]+)", label: "([^"]+)" \}/);
    if (選択肢 && 現在のキー) 表[現在のキー][選択肢[1]] = 選択肢[2];
  }
  return 表;
}

const ラベル = ラベル表をソースから作る();
const 質問の順番 = Object.keys(ラベル);

const ブラウザ = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);

const 結果一覧 = [];

for (const シナリオ of シナリオ集.シナリオ) {
  // iPhone 相当の画面で確認します
  const ページ = await ブラウザ.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const JSエラー = [];
  ページ.on("pageerror", (e) => JSエラー.push(e.message));

  await ページ.goto(接続先, { waitUntil: "networkidle" });
  await ページ.getByRole("button", { name: "質問を始める" }).click();
  for (const キー of 質問の順番) {
    const 値 = シナリオ.回答[キー];
    await ページ.getByRole("button", { name: ラベル[キー][値], exact: true }).click();
  }
  await ページ.waitForSelector(".sn-section-title");

  const グループの制度名 = (見出し) =>
    ページ.evaluate((h) => {
      const g = [...document.querySelectorAll(".sn-group")].find(
        (e) => e.querySelector(".sn-group-title")?.textContent === h,
      );
      return g ? [...g.querySelectorAll("article h4")].map((x) => x.textContent) : [];
    }, 見出し);

  結果一覧.push({
    番号: シナリオ.番号,
    名前: シナリオ.名前,
    回答: シナリオ.回答,
    特に確認: await グループの制度名("特に確認したほうがよい制度"),
    確認する価値: await グループの制度名("確認する価値がある制度"),
    知っておく: await ページ.locator(".sn-more article h4").allInnerTexts(),
    案内: await ページ.locator(".sn-guide-group article h4").allInnerTexts(),
    回答連動の理由: await ページ.locator(".sn-why-linked li").allInnerTexts(),
    次にやること: await ページ.locator(".sn-action-text").allInnerTexts(),
    ヒント数: await ページ.locator(".sn-hint").count(),
    注意事項数: await ページ.locator(".sn-cautions li").count(),
    確認のしかた数: await ページ.locator(".sn-steps li").count(),
    画面の高さ: await ページ.evaluate(() => document.documentElement.scrollHeight),
    最初から見えるカード: await ページ.locator("article.sn-card:visible").count(),
    カード総数: await ページ.locator("article.sn-card").count(),
    横はみ出し: await ページ.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    JSエラー,
  });

  await ページ.close();
}

await ブラウザ.close();

console.log("番号 | 制度(特/価/知) | 案内 | 理由 | 行動 | ヒ | 注 | 手順 | 高さpx | 見/総 | はみ出し | JSエラー");
for (const r of 結果一覧) {
  console.log(
    String(r.番号).padStart(2) + "   | " +
    `${r.特に確認.length}/${r.確認する価値.length}/${r.知っておく.length}`.padEnd(14) + " | " +
    String(r.案内.length).padEnd(4) + " | " +
    String(r.回答連動の理由.length).padEnd(4) + " | " +
    String(r.次にやること.length).padEnd(4) + " | " +
    String(r.ヒント数).padEnd(2) + " | " +
    String(r.注意事項数).padEnd(2) + " | " +
    String(r.確認のしかた数).padEnd(4) + " | " +
    String(r.画面の高さ).padStart(6) + " | " +
    `${r.最初から見えるカード}/${r.カード総数}`.padEnd(5) + " | " +
    String(r.横はみ出し).padEnd(8) + " | " +
    (r.JSエラー.length ? r.JSエラー.join(",") : "なし"),
  );
}

// 詳しい内容を見たいときのために、JSON でも出しておきます。
if (process.env.SCENARIO_BASELINE_JSON) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.SCENARIO_BASELINE_JSON, JSON.stringify(結果一覧, null, 2));
  console.log("\n詳しい内容を書き出しました: " + process.env.SCENARIO_BASELINE_JSON);
}
