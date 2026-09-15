/**
 * Ver.0 の画面と動作を固定するためのテストです。
 *
 * このテストの目的は「今できていることを、これから先も壊さない」ことです。
 * Ver.1 で中身を作り替えていきますが、ここに書いてあることは
 * 作り替えたあとも同じように動かなければいけません。
 *
 * 注意：このテストは画面を実際に操作して確かめています。
 * そのため、内部の作りを変えても（たとえばファイルを分割しても）
 * 利用者から見た動きが同じなら、テストは通り続けます。
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import ShingakuNavi from "../src/ShingakuNavi.jsx";

/** 回答パターンA：家から学費を出してもらうのが難しく、施設で暮らした経験がある人 */
const 回答パターンA = [
  "高校2年生",
  "私立を考えている",
  "一人暮らしの予定",
  "難しいと思う",
  "まだ調べていない",
  "ある / いま暮らしている",
];

/** 回答パターンB：学費を出してもらえそうで、施設の質問には答えない人 */
const 回答パターンB = [
  "高校3年生",
  "国公立を考えている",
  "自宅から通う予定",
  "だいたい出してもらえそう",
  "申し込みを考えている制度がある",
  "答えない",
];

let user;

beforeEach(() => {
  user = userEvent.setup();
});

/** 選択肢のボタンを押す */
async function 選ぶ(ラベル) {
  await user.click(screen.getByRole("button", { name: ラベル }));
}

/** 「質問を始める」を押してから、渡された回答を順番に選ぶ */
async function 最後まで回答する(回答リスト) {
  await user.click(screen.getByRole("button", { name: "質問を始める" }));
  for (const 回答 of 回答リスト) {
    await 選ぶ(回答);
  }
}

/** いま表示されている制度カードの制度名を集める */
function 表示中の制度名() {
  return screen
    .queryAllByRole("article")
    .map((カード) => within(カード).getByRole("heading").textContent);
}

describe("トップページ", () => {
  it("サービスの目的と開始ボタンが表示される", () => {
    render(<ShingakuNavi />);

    expect(
      screen.getByRole("heading", { name: /あきらめないために/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "質問を始める" })
    ).toBeInTheDocument();
  });

  it("入力内容を保存しないことが書かれている", () => {
    render(<ShingakuNavi />);

    expect(screen.getByText(/入力した内容は保存されません/)).toBeInTheDocument();
  });

  it("受給を断定するサービスではないと書かれている", () => {
    render(<ShingakuNavi />);

    expect(
      screen.getByText(/受けられるかどうかを決めるものではありません/)
    ).toBeInTheDocument();
  });
});

describe("質問画面", () => {
  it("開始ボタンを押すと最初の質問が表示される", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));

    expect(
      screen.getByRole("heading", { name: "いまの学年を教えてください" })
    ).toBeInTheDocument();
  });

  it("質問は一度に1問ずつ表示される", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));

    // 1問目が出ているとき、2問目の質問文は画面に無い
    expect(screen.getByText("質問 1 / 6")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "進学先はどう考えていますか" })
    ).not.toBeInTheDocument();
  });

  it("答えると次の質問へ進む", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));
    await 選ぶ("高校2年生");

    expect(screen.getByText("質問 2 / 6")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "進学先はどう考えていますか" })
    ).toBeInTheDocument();
  });

  it("全部答えると結果画面になる", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(
      screen.getByRole("heading", { name: "確認してみるとよい支援" })
    ).toBeInTheDocument();
  });
});

describe("前の質問にもどる", () => {
  it("1問目には「もどる」ボタンが無い", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));

    expect(
      screen.queryByRole("button", { name: "前の質問にもどる" })
    ).not.toBeInTheDocument();
  });

  it("2問目以降では前の質問にもどれる", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));
    await 選ぶ("高校2年生");
    await 選ぶ("私立を考えている");

    // いま3問目。2回もどると1問目に戻る
    expect(screen.getByText("質問 3 / 6")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "前の質問にもどる" }));
    expect(screen.getByText("質問 2 / 6")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "前の質問にもどる" }));
    expect(
      screen.getByRole("heading", { name: "いまの学年を教えてください" })
    ).toBeInTheDocument();
  });

  it("もどっても、それまでの回答は消えない", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));
    await 選ぶ("高校2年生");
    await user.click(screen.getByRole("button", { name: "前の質問にもどる" }));

    // 選んだ「高校2年生」が選択済みとして残っている
    expect(screen.getByRole("button", { name: "高校2年生" })).toHaveClass(
      "sn-option-selected"
    );
  });

  it("もどって選び直すと、その内容が結果に反映される", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));

    // いったん「難しいと思う」以外を選んでおいて、あとで選び直す
    await 選ぶ("高校2年生");
    await 選ぶ("私立を考えている");
    await 選ぶ("一人暮らしの予定");
    await 選ぶ("だいたい出してもらえそう");

    // 4問目にもどって「難しいと思う」に変更する
    await user.click(screen.getByRole("button", { name: "前の質問にもどる" }));
    await 選ぶ("難しいと思う");

    await 選ぶ("まだ調べていない");
    await 選ぶ("ない");

    // 「難しいと思う」で表示される制度が出ている
    expect(表示中の制度名()).toContain("高等教育の修学支援新制度");
  });
});

describe("任意の質問をスキップできる", () => {
  it("施設の質問には「この質問をとばす」ボタンがある", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));
    for (const 回答 of 回答パターンA.slice(0, 5)) {
      await 選ぶ(回答);
    }

    expect(screen.getByText("答えなくても大丈夫です")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "この質問をとばす" })
    ).toBeInTheDocument();
  });

  it("とばしても結果画面が表示される", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));
    for (const 回答 of 回答パターンA.slice(0, 5)) {
      await 選ぶ(回答);
    }
    await user.click(screen.getByRole("button", { name: "この質問をとばす" }));

    expect(
      screen.getByRole("heading", { name: "確認してみるとよい支援" })
    ).toBeInTheDocument();
    expect(表示中の制度名().length).toBeGreaterThan(0);
  });

  it("【重要】答えなかったことを理由に制度が減らされない", async () => {
    // 施設の質問に「答えない」を選んだ人と、「ない」と答えた人で、
    // 表示される制度が同じであることを確認する。
    // 「答えなかったから候補が減る」という設計にしてはいけない。
    const { unmount } = render(<ShingakuNavi />);
    await 最後まで回答する([...回答パターンA.slice(0, 5), "答えない"]);
    const とばした場合 = 表示中の制度名();
    unmount();

    render(<ShingakuNavi />);
    await 最後まで回答する([...回答パターンA.slice(0, 5), "ない"]);
    const 答えた場合 = 表示中の制度名();

    expect(とばした場合).toEqual(答えた場合);
  });
});

describe("結果画面", () => {
  it("回答によって表示される制度が変わる", async () => {
    const { unmount } = render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);
    const A = 表示中の制度名();
    unmount();

    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンB);
    const B = 表示中の制度名();

    // 同じ結果になってしまうなら、質問した意味がない
    expect(A).not.toEqual(B);
  });

  it("施設経験があると答えた人には、専用の支援が表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(表示中の制度名()).toContain(
      "児童養護施設等で暮らした経験のある人への進学支援"
    );
  });

  it("施設経験が「ない」人には、その専用支援は表示されない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンB);

    expect(表示中の制度名()).not.toContain(
      "児童養護施設等で暮らした経験のある人への進学支援"
    );
  });

  it("制度カードに、制度名・分類・運営主体・概要・確認理由が表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const カード = screen.queryAllByRole("article")[0];
    expect(within(カード).getByRole("heading")).toBeInTheDocument();
    expect(within(カード).getByText("確認するとよい理由")).toBeInTheDocument();
    expect(within(カード).getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("公式サイトへのリンクが表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const リンク = screen.getAllByRole("link", { name: "公式サイトを開く" });
    expect(リンク.length).toBeGreaterThan(0);
    for (const l of リンク) {
      expect(l.getAttribute("href")).toMatch(/^https:\/\//);
      // 別タブで開くリンクは、安全のため rel を付ける必要がある
      expect(l).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });

  it("次にやることが3〜5件、番号つきで表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(
      screen.getByRole("heading", { name: "次にやること" })
    ).toBeInTheDocument();

    const 行動 = document.querySelectorAll(".sn-action");
    expect(行動.length).toBeGreaterThanOrEqual(3);
    expect(行動.length).toBeLessThanOrEqual(5);
  });

  it("相談先が案内される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    // 注意：Ver.0 では、この見出しが h2 などではなく div で作られています。
    // 読み上げソフトから見出しとして認識されないため、第3段階で直す予定です。
    // いまは Ver.0 を変更しないため、現状に合わせて文字で探しています。
    expect(
      screen.getByText("一人で判断する必要はありません")
    ).toBeInTheDocument();

    // 相談先が4件挙がっている
    const 相談先 = document.querySelectorAll(".sn-closing li");
    expect(相談先.length).toBeGreaterThanOrEqual(3);
  });

  it("公式サイトでの確認を促す注意書きがある", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(
      screen.getByText(/必ず公式サイトか窓口で確認してください/)
    ).toBeInTheDocument();
  });

  it("未確認のデータには「サンプルデータ」と表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(screen.getAllByText("サンプルデータ").length).toBeGreaterThan(0);
  });

  it("もう一度やり直せる", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);
    await user.click(screen.getByRole("button", { name: "もう一度やり直す" }));

    expect(
      screen.getByRole("button", { name: "質問を始める" })
    ).toBeInTheDocument();
  });

  it("やり直すと前の回答は残らない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);
    await user.click(screen.getByRole("button", { name: "もう一度やり直す" }));
    await user.click(screen.getByRole("button", { name: "質問を始める" }));

    // どの選択肢も選ばれていない状態に戻っている
    expect(document.querySelectorAll(".sn-option-selected")).toHaveLength(0);
  });
});

describe("第2段階で有効にするテスト", () => {
  // Ver.0 は制度データが ShingakuNavi.jsx の中に直接書かれているため、
  // テストから別のデータを渡すことができません。
  // 第2段階でデータを data/ フォルダへ分離したあとに、ここを実装します。

  it.todo("制度が0件でも結果画面が正常に表示される");
  it.todo("制度データに必要な項目がすべて揃っている");
  it.todo("制度データの公式URLが正しい形式である");
  it.todo("情報確認日が古い制度を検出できる");
});
