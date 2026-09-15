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
