/**
 * スマートフォンでの表示を、本物のブラウザで確認するテストです。
 *
 * 画面の「幅からはみ出していないか」「ボタンが指で押せる大きさか」は、
 * ふつうのテスト（tests/screens.test.jsx）では測れません。
 * 本物のブラウザで表示して、実際の大きさを測る必要があります。
 */

import { test, expect } from "@playwright/test";

const 回答パターンA = [
  "高校2年生",
  "私立を考えている",
  "一人暮らしの予定",
  "難しいと思う",
  "まだ調べていない",
  "ある / いま暮らしている",
];

/**
 * 上のグループと折りたたみが同時に出ることを期待していたパターン。
 * いまの制度2件はシグナルの条件が同じで、必ず同じグループに入るため、
 * この状態は本物のデータでは作れません（tests/collapse.test.jsx で確認しています）。
 * この定数を使うテストは、折りたたみが出ないときは自動でスキップされます。
 */
const 回答パターンB = [
  "高校3年生",
  "国公立を考えている",
  "自宅から通う予定",
  "だいたい出してもらえそう",
  "申し込みを考えている制度がある",
  "ない",
];

/** すべての制度が折りたたみに入るパターン（このとき折りたたみは最初から開く） */
const 回答パターンC = [
  "高校1年生",
  "まだ決めていない",
  "まだ分からない",
  "だいたい出してもらえそう",
  "申し込みを考えている制度がある",
  "ない",
];

/** 画面が横にはみ出していないかを測る（0 なら、はみ出していない） */
async function 横のはみ出し(page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

test("トップから結果まで、スマホで最後まで操作できる", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /あきらめないために/ })
  ).toBeVisible();

  await page.getByRole("button", { name: "質問を始める" }).click();

  for (const 回答 of 回答パターンA) {
    await page.getByRole("button", { name: 回答, exact: true }).click();
  }

  await expect(
    page.getByRole("heading", { name: "確認してみるとよい支援" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "次にやること" })).toBeVisible();
  await expect(page.locator("article.sn-card").first()).toBeVisible();
});

test("どの画面でも横にはみ出さない", async ({ page }) => {
  await page.goto("/");
  expect(await 横のはみ出し(page), "トップページが横にはみ出しています").toBe(0);

  await page.getByRole("button", { name: "質問を始める" }).click();
  expect(await 横のはみ出し(page), "質問画面が横にはみ出しています").toBe(0);

  for (const 回答 of 回答パターンA) {
    await page.getByRole("button", { name: 回答, exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "確認してみるとよい支援" })
  ).toBeVisible();
  expect(await 横のはみ出し(page), "結果画面が横にはみ出しています").toBe(0);
});

test("ボタンが指で押せる大きさ（高さ44px以上）である", async ({ page }) => {
  await page.goto("/");

  const 小さすぎるボタン = [];
  for (const ボタン of await page.getByRole("button").all()) {
    const 大きさ = await ボタン.boundingBox();
    if (大きさ && 大きさ.height < 44) {
      小さすぎるボタン.push(`${(await ボタン.textContent())?.trim()} (高さ ${Math.round(大きさ.height)}px)`);
    }
  }

  expect(小さすぎるボタン, "指で押しにくいボタンがあります").toEqual([]);
});

test("選択肢のボタンが指で押せる大きさである", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();

  const 小さすぎるボタン = [];
  for (const ボタン of await page.getByRole("button").all()) {
    const 大きさ = await ボタン.boundingBox();
    if (大きさ && 大きさ.height < 44) {
      小さすぎるボタン.push(`${(await ボタン.textContent())?.trim()} (高さ ${Math.round(大きさ.height)}px)`);
    }
  }

  expect(小さすぎるボタン, "指で押しにくいボタンがあります").toEqual([]);
});

test("公式サイトのリンクが安全な設定で開く", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 回答 of 回答パターンA) {
    await page.getByRole("button", { name: 回答, exact: true }).click();
  }

  const リンク = page.getByRole("link", { name: "公式サイトを開く" });
  await expect(リンク.first()).toBeVisible();

  for (const l of await リンク.all()) {
    await expect(l).toHaveAttribute("target", "_blank");
    await expect(l).toHaveAttribute("rel", /noopener/);
    await expect(l).toHaveAttribute("href", /^https:\/\//);
  }
});

// いま入っている制度は2件で、どちらも同じ条件でシグナルが当たるため、
// 「知っておくとよい制度」（折りたたみ）が出る状態を実データでは作れません。
// 仕組み自体は tests/collapse.test.jsx でデータを差し替えて確認しています。
// 制度が増えれば実データでも出るようになるので、テストは残しておきます。
test("折りたたみが出るときは、正しく開閉できる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 答え of 回答パターンB) {
    await page.getByRole("button", { name: 答え, exact: true }).click();
  }

  const 折りたたみ = page.locator(".sn-more");
  test.skip(
    (await 折りたたみ.count()) === 0,
    "いまの制度データでは折りたたみが出ないため（tests/collapse.test.jsx で確認済み）"
  );

  const つまみ = 折りたたみ.locator("summary");
  await expect(折りたたみ.locator("article").first()).toBeHidden();

  await つまみ.click();
  await expect(折りたたみ.locator("article").first()).toBeVisible();

  await つまみ.click();
  await expect(折りたたみ.locator("article").first()).toBeHidden();
});

test("折りたたみが最初から開くとき、つまみの表示が状態と食い違わない", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 答え of 回答パターンC) {
    await page.getByRole("button", { name: 答え, exact: true }).click();
  }

  const 折りたたみ = page.locator(".sn-more");
  await expect(折りたたみ).toHaveCount(1);
  // 上の2グループが空なので、最初から開いている
  await expect(折りたたみ.locator("article").first()).toBeVisible();

  // つまみの文字は開閉で変わらない。
  // 「ひらく」「とじる」のような言葉を持たせると、開いている状態と食い違ってしまう。
  const つまみ = 折りたたみ.locator("summary");
  await expect(つまみ).not.toContainText("ひらく");
  await expect(つまみ).not.toContainText("とじる");
  await expect(つまみ).toContainText("ほかにも確認できる制度があります");

  // かわりに、目印の向きで開いているかどうかが分かるようにしている
  const 目印の向き = () =>
    折りたたみ.locator(".sn-more-mark").evaluate((e) => getComputedStyle(e).transform);

  const 開いているときの向き = await 目印の向き();
  await つまみ.click();
  await expect(折りたたみ.locator("article").first()).toBeHidden();
  const 閉じたあとの向き = await 目印の向き();

  expect(開いているときの向き).not.toBe(閉じたあとの向き);

  // 文字のほうは変わっていない
  await expect(つまみ).not.toContainText("ひらく");
});

test("制度が1つのまとまりにしか入らないときでも、説明文が「順番」を示さない", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 答え of 回答パターンC) {
    await page.getByRole("button", { name: 答え, exact: true }).click();
  }

  await expect(page.getByRole("heading", { name: "特に確認したほうがよい制度" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "確認する価値がある制度" })).toHaveCount(0);

  const 説明 = page.locator(".sn-section-note").first();
  await expect(説明).not.toContainText("順番");
  await expect(説明).toContainText("確認するとよい支援を整理しています");
});

test("結果画面がひと目で読める長さにおさまっている", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 答え of 回答パターンA) {
    await page.getByRole("button", { name: 答え, exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "確認してみるとよい支援" })
  ).toBeVisible();

  // Ver.0 はこの回答で 11,154px あった。作り替えでそこまで戻さない。
  const 高さ = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(高さ).toBeLessThan(11000);
});

test("学校・地域・民間の支援が、制度とは別のまとまりで案内される", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 答え of 回答パターンA) {
    await page.getByRole("button", { name: 答え, exact: true }).click();
  }

  await expect(
    page.getByRole("heading", { name: "学校・地域・民間の支援も確認する" })
  ).toBeVisible();

  // 案内のカードは「確認先の案内」と表示され、制度の分類タグは付かない
  const 案内のカード = page.locator(".sn-guide-group article");
  await expect(案内のカード.first()).toBeVisible();

  for (const カード of await 案内のカード.all()) {
    await expect(カード.getByText("確認先の案内")).toBeVisible();
  }
});

test("公式確認済みの制度には「サンプルデータ」が付かない", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 答え of 回答パターンA) {
    await page.getByRole("button", { name: 答え, exact: true }).click();
  }

  const 確認済みカード = page
    .locator("article.sn-card")
    .filter({ hasText: "高等教育の修学支援新制度" });

  await expect(確認済みカード).toHaveCount(1);
  await expect(確認済みカード.locator(".sn-tag-sample")).toHaveCount(0);
});

test("ブラウザの戻るボタンでサイトから出ない", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  await page.getByRole("button", { name: "高校2年生", exact: true }).click();
  await page.getByRole("button", { name: "私立を考えている", exact: true }).click();
  await expect(page.getByText("質問 3 / 6")).toBeVisible();

  // 1回戻る → 2問目へ
  await page.goBack();
  await expect(page.getByText("質問 2 / 6")).toBeVisible();

  // もう1回戻る → 1問目へ。回答は残っている
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "いまの学年を教えてください" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "高校2年生", exact: true })
  ).toHaveClass(/sn-option-selected/);

  // さらに戻る → トップページ。まだサイトの中にいる
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "質問を始める" })
  ).toBeVisible();
});

test("結果画面から戻ると最後の質問に戻る", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 答え of 回答パターンA) {
    await page.getByRole("button", { name: 答え, exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "確認してみるとよい支援" })
  ).toBeVisible();

  await page.goBack();
  await expect(
    page.getByRole("heading", {
      name: "児童養護施設や里親家庭で暮らした経験はありますか",
    })
  ).toBeVisible();
});

test("見出しの階層が正しい", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 答え of 回答パターンA) {
    await page.getByRole("button", { name: 答え, exact: true }).click();
  }

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("進学支援ナビ");

  // 相談先の見出しが、見た目だけの文字ではなく見出しになっている
  await expect(
    page.getByRole("heading", { name: "一人で判断する必要はありません" })
  ).toBeVisible();
});

test("ページの読み込みでエラーが出ない", async ({ page }) => {
  const エラー = [];
  page.on("pageerror", (e) => エラー.push(`JavaScriptエラー: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) エラー.push(`${r.status()}: ${r.url()}`);
  });

  await page.goto("/");
  await page.getByRole("button", { name: "質問を始める" }).click();
  for (const 回答 of 回答パターンA) {
    await page.getByRole("button", { name: 回答, exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "確認してみるとよい支援" })
  ).toBeVisible();

  expect(エラー).toEqual([]);
});
