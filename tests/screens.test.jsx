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

import { render, screen, within, waitFor } from "@testing-library/react";
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

/** 回答パターンB：学費を出してもらえそうで、施設経験は「ない」と答えた人 */
const 回答パターンB = [
  "高校3年生",
  "国公立を考えている",
  "自宅から通う予定",
  "だいたい出してもらえそう",
  "申し込みを考えている制度がある",
  "ない",
];

/** 回答パターンC：パターンAと同じだが、施設の質問には答えない人 */
const 回答パターンC = [
  "高校2年生",
  "私立を考えている",
  "一人暮らしの予定",
  "難しいと思う",
  "まだ調べていない",
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

/** 画面にある制度カードの制度名を集める（折りたたみの中も含む） */
function 表示中の制度名() {
  return screen
    .queryAllByRole("article")
    .map((カード) => within(カード).getByRole("heading").textContent);
}

/** 指定したグループに入っている制度名 */
function グループの制度名(見出し) {
  const グループ = [...document.querySelectorAll(".sn-group")].find(
    (要素) => 要素.querySelector(".sn-group-title")?.textContent === 見出し
  );
  if (!グループ) return [];
  return [...グループ.querySelectorAll("article")].map(
    (カード) => within(カード).getByRole("heading").textContent
  );
}

/** 折りたたみ（知っておくとよい制度）の中の制度名 */
function 折りたたみの中の制度名() {
  return [...document.querySelectorAll(".sn-more article")].map(
    (カード) => within(カード).getByRole("heading").textContent
  );
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

  it("【重要】答えた内容を保存も送信もしないと書かれている", () => {
    render(<ShingakuNavi />);

    expect(
      screen.getByText(/答えた内容は、保存も送信もしていません/)
    ).toBeInTheDocument();
  });

  it("【重要】試作版であることが書かれている", () => {
    render(<ShingakuNavi />);

    expect(screen.getByText(/これは試作版です/)).toBeInTheDocument();
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
    // 施設の質問に「答えない」を選んだ人に、制度が少なく出てはいけない。
    // 答えたくなかっただけの人に、情報が届かなくなるのを防ぐため。
    const { unmount } = render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンC);
    const とばした場合 = 表示中の制度名();
    unmount();

    render(<ShingakuNavi />);
    await 最後まで回答する([...回答パターンA.slice(0, 5), "ない"]);
    const 答えた場合 = 表示中の制度名();

    expect(とばした場合.length).toBeGreaterThanOrEqual(答えた場合.length);
    for (const 制度 of 答えた場合) {
      expect(とばした場合).toContain(制度);
    }
  });

  it("【重要】施設の質問をとばしても、専用の支援は隠されない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンC);

    expect(表示中の制度名()).toContain(
      "施設等で暮らした経験のある人向けの支援を相談する"
    );
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
      "施設等で暮らした経験のある人向けの支援を相談する"
    );
  });

  it("施設経験が「ない」人には、その専用支援は表示されない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンB);

    expect(表示中の制度名()).not.toContain(
      "施設等で暮らした経験のある人向けの支援を相談する"
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

describe("結果画面：3つのグループ分け（Ver.1）", () => {
  it("グループの見出しが表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(
      screen.getByRole("heading", { name: "特に確認したほうがよい制度" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "確認する価値がある制度" })
    ).toBeInTheDocument();
  });

  it("strong シグナルのある制度が「特に確認したほうがよい」に入る", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 優先 = グループの制度名("特に確認したほうがよい制度");
    expect(優先).toContain("高等教育の修学支援新制度");
  });

  it("normal だけの制度が「確認する価値がある」に入る", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 価値あり = グループの制度名("確認する価値がある制度");
    expect(価値あり).toContain("JASSO 貸与奨学金（第一種・第二種）");
  });

  it("【重要】受給の見込みを思わせる表現を使っていない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 画面の文字 = document.body.textContent;
    for (const 禁止語 of ["おすすめ度", "適合度", "受給可能性", "マッチ度", "％"]) {
      expect(画面の文字, `「${禁止語}」は使ってはいけません`).not.toContain(禁止語);
    }
  });

  // 「折りたたみがあるぶん最初に見える数が少ない」ことは、
  // いまの制度2件では再現できないため tests/collapse.test.jsx で確認しています。
});

describe("結果画面：学校・地域・民間の支援（guide）", () => {
  it("制度とは別のまとまりとして案内される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(
      screen.getByRole("heading", { name: "学校・地域・民間の支援も確認する" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/学校や住んでいる地域、民間団体にも独自の支援がある場合があります/)
    ).toBeInTheDocument();
  });

  it("案内は制度のグループに混ざらない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 制度グループ = [
      ...グループの制度名("特に確認したほうがよい制度"),
      ...グループの制度名("確認する価値がある制度"),
      ...折りたたみの中の制度名(),
    ];

    for (const 名前 of [
      "志望校独自の支援を確認する",
      "住んでいる自治体の支援を確認する",
      "民間団体・財団の奨学金を確認する",
    ]) {
      expect(制度グループ, `「${名前}」が制度の並びに混ざっています`).not.toContain(名前);
    }
  });

  it("【重要】案内には「確認先の案内」と表示され、特定の制度に見えない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 案内セクション = document.querySelector(".sn-guide-group");
    expect(案内セクション).not.toBeNull();

    for (const カード of 案内セクション.querySelectorAll("article")) {
      expect(カード.textContent).toContain("確認先の案内");
      // 案内は制度データではないので、確認状態のバッジは出さない
      expect(カード.querySelector(".sn-tag-sample")).toBeNull();
      // 給付型・貸与型のような制度の分類も付けない
      expect(カード.textContent).not.toMatch(/給付型・|貸与型・|減免・/);
    }
  });

  it("案内のカード名が、行動が分かる書き方になっている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 案内の名前 = [
      ...document.querySelectorAll(".sn-guide-group article h4"),
    ].map((要素) => 要素.textContent);

    expect(案内の名前.length).toBeGreaterThan(0);
    for (const 名前 of 案内の名前) {
      expect(名前, `「${名前}」が行動の形になっていません`).toMatch(
        /確認する$|探す$|相談する$/
      );
    }
  });

  it("施設経験の案内は、答えなかった人にも表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンC);

    expect(表示中の制度名()).toContain(
      "施設等で暮らした経験のある人向けの支援を相談する"
    );
  });

  it("施設経験が「ない」人には、その案内を出さない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンB);

    expect(表示中の制度名()).not.toContain(
      "施設等で暮らした経験のある人向けの支援を相談する"
    );
  });
});

describe("公式確認済みの制度（verified）の見せ方", () => {
  it("確認済みの制度には「サンプルデータ」が付かない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const カード = [...document.querySelectorAll("article")].find((要素) =>
      要素.textContent.includes("高等教育の修学支援新制度")
    );
    expect(カード.querySelector(".sn-tag-sample")).toBeNull();
  });


  it("給付奨学金と授業料減免が1枚のカードにまとまっている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    // 別々のカードとして二重に出さない
    expect(表示中の制度名()).not.toContain(
      "日本学生支援機構（JASSO）の給付型奨学金"
    );

    const カード = [...document.querySelectorAll("article")].find((要素) =>
      要素.textContent.includes("高等教育の修学支援新制度")
    );
    expect(カード.textContent).toContain("給付型奨学金");
  });

  it("家計の基準を数字で判定せず、公式の確認先へ案内している", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 画面の文字 = document.body.textContent;
    expect(画面の文字).toMatch(/進学資金シミュレーター/);
    // 「世帯年収○○万円以下」のような数字での線引きを出さない
    expect(画面の文字).not.toMatch(/年収\s*\d/);
  });
});

describe("候補になった理由が回答と連動する", () => {
  it("家計が苦しいと答えると、その回答にふれた理由が出る", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    // 複数の制度に、回答と結びついた理由が付く
    expect(
      screen.getAllByText(/学費を家の人に出してもらうのが難しい.*と答えたため/).length
    ).toBeGreaterThan(0);
  });

  it("施設経験があると答えると、その回答にふれた理由が出る", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(
      screen.getByText(/施設や里親家庭で暮らした経験があると答えたため/)
    ).toBeInTheDocument();
  });

  it("回答が変わると、出てくる理由も変わる", async () => {
    const { unmount } = render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);
    const Aの理由 = [...document.querySelectorAll(".sn-why-linked li")].map(
      (要素) => 要素.textContent
    );
    unmount();

    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンB);
    const Bの理由 = [...document.querySelectorAll(".sn-why-linked li")].map(
      (要素) => 要素.textContent
    );

    expect(Aの理由).not.toEqual(Bの理由);
    expect(Aの理由.length).toBeGreaterThan(0);
  });

  it("制度ごとの固定の理由も、あわせて表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(
      screen.getByText(
        "家庭の経済状況にかかわらず進学できるようにするための、国の制度です。"
      )
    ).toBeInTheDocument();
  });
});

describe("見出しの階層（読み上げソフト対応）", () => {
  it("どの画面にも h1 がある", async () => {
    render(<ShingakuNavi />);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector("h1").textContent).toBe("進学支援ナビ");

    await user.click(screen.getByRole("button", { name: "質問を始める" }));
    expect(document.querySelectorAll("h1")).toHaveLength(1);

    for (const 回答 of 回答パターンA) await 選ぶ(回答);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
  });

  it("相談先の見出しが、見出しタグになっている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    // 第1・第2段階では div だった。第3段階で修正した。
    const 見出し = screen.getByRole("heading", {
      name: "一人で判断する必要はありません",
    });
    expect(見出し.tagName).toBe("H2");
  });

  it("見出しの深さが飛び級していない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 深さ = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((要素) =>
      Number(要素.tagName[1])
    );

    expect(深さ[0]).toBe(1);
    for (let i = 1; i < 深さ.length; i++) {
      // h2 のあとに h4 が来るような飛び方をしていないか
      expect(深さ[i] - 深さ[i - 1]).toBeLessThanOrEqual(1);
    }
  });
});

describe("ブラウザの戻るボタン", () => {
  it("質問の途中で戻ると、1つ前の質問に戻る", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));
    await 選ぶ("高校2年生");
    await 選ぶ("私立を考えている");
    expect(screen.getByText("質問 3 / 6")).toBeInTheDocument();

    window.history.back();
    await waitFor(() =>
      expect(screen.getByText("質問 2 / 6")).toBeInTheDocument()
    );
  });

  it("【重要】戻っても回答が消えない", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));
    await 選ぶ("高校2年生");

    window.history.back();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "いまの学年を教えてください" })
      ).toBeInTheDocument()
    );

    expect(screen.getByRole("button", { name: "高校2年生" })).toHaveClass(
      "sn-option-selected"
    );
  });

  it("最初の質問から戻ると、トップページに戻る", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));

    window.history.back();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "質問を始める" })
      ).toBeInTheDocument()
    );
  });

  it("結果画面から戻ると、最後の質問に戻る", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);
    expect(
      screen.getByRole("heading", { name: "確認してみるとよい支援" })
    ).toBeInTheDocument();

    window.history.back();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: "児童養護施設や里親家庭で暮らした経験はありますか",
        })
      ).toBeInTheDocument()
    );
  });

  it("画面の「前の質問にもどる」も同じように動く", async () => {
    render(<ShingakuNavi />);
    await user.click(screen.getByRole("button", { name: "質問を始める" }));
    await 選ぶ("高校2年生");

    await user.click(screen.getByRole("button", { name: "前の質問にもどる" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "いまの学年を教えてください" })
      ).toBeInTheDocument()
    );
  });
});

// 第1段階で todo にしていた4件は、第2段階で制度データを分離したことで
// 実装できるようになりました。いまは次の場所にあります。
//
//   制度が0件でも結果画面が正常に表示される → tests/empty-programs.test.jsx
//   制度データに必要な項目がすべて揃っている → tests/data.test.js
//   制度データの公式URLが正しい形式である   → tests/data.test.js
//   情報確認日が古い制度を検出できる         → tests/data.test.js

describe("JASSO 貸与奨学金のカード", () => {
  /** 貸与奨学金のカードを取り出す */
  function 貸与カード() {
    return [...document.querySelectorAll("article")].find((要素) =>
      要素.textContent.includes("JASSO 貸与奨学金")
    );
  }

  it("公式確認済みなので「サンプルデータ」が付かない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(貸与カード().querySelector(".sn-tag-sample")).toBeNull();
  });

  it("第一種が「無利子」と表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const カード = 貸与カード();
    expect(カード.textContent).toContain("第一種奨学金");
    expect(カード.textContent).toContain("無利子");
    expect(カード.textContent).toMatch(/第一種[\s\S]{0,80}利子は付きません/);
  });

  it("第二種が「有利子」と表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const カード = 貸与カード();
    expect(カード.textContent).toContain("第二種奨学金");
    expect(カード.textContent).toContain("有利子");
    expect(カード.textContent).toMatch(/第二種[\s\S]{0,80}利子も付きます/);
  });

  it("【重要】返す必要があることが明示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const カード = 貸与カード();
    expect(カード.textContent).toMatch(/返す必要/);
    // 「貸与」という言葉だけで終わらせず、意味を書いている
    expect(カード.textContent).toMatch(/卒業後などに返していくお金/);
  });

  it("【重要】第二種の具体的な利率を固定表示していない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const カード = 貸与カード();
    // 「年0.3％」のような数字を画面に出さない（利率は変わるため）
    expect(カード.textContent).not.toMatch(/\d\s*[%％]/);
    expect(カード.textContent).not.toMatch(/利率は\s*[\d.]/);
    // 代わりに、いつ決まるかと公式確認を案内する
    expect(カード.textContent).toMatch(/借り終わるときに決まります/);
  });

  it("【重要】第一種か第二種かを判定していない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 画面 = document.body.textContent;
    for (const 危険な言い方 of [
      "第一種の対象です",
      "第二種なら借りられます",
      "第一種を利用できます",
      "第二種が利用できます",
    ]) {
      expect(画面).not.toContain(危険な言い方);
    }
    // 判定できないことを、はっきり書いている
    expect(貸与カード().textContent).toMatch(
      /どちらに当てはまるかは、このアプリでは判断できません/
    );
  });

  it("【重要】給付奨学金との併給調整の注意が表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const カード = 貸与カード();
    expect(カード.textContent).toMatch(/給付奨学金と第一種奨学金を併せて利用する場合/);
    expect(カード.textContent).toMatch(/貸与月額が調整されます/);
    expect(カード.textContent).toMatch(/0円になることもあります/);
  });

  it("注意事項が、専用の見出しつきで表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    expect(貸与カード().querySelector(".sn-cautions")).not.toBeNull();
    expect(貸与カード().textContent).toContain("申し込む前に知っておきたいこと");
  });

  it("【重要】貸与制度が「特に確認したほうがよい」に入らない", async () => {
    // 返済が必要な制度を、給付・減免より強くすすめているように見せない
    for (const パターン of [回答パターンA, 回答パターンB, 回答パターンC]) {
      const { unmount } = render(<ShingakuNavi />);
      await 最後まで回答する(パターン);

      expect(グループの制度名("特に確認したほうがよい制度")).not.toContain(
        "JASSO 貸与奨学金（第一種・第二種）"
      );
      unmount();
    }
  });

  it("給付・減免の制度より後ろに表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 並び = 表示中の制度名();
    expect(並び.indexOf("高等教育の修学支援新制度")).toBeLessThan(
      並び.indexOf("JASSO 貸与奨学金（第一種・第二種）")
    );
  });

  it("具体的な貸与月額の一覧を画面に載せていない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    // 「月額54,000円」のような金額を出さない
    expect(貸与カード().textContent).not.toMatch(/\d{1,3},\d{3}\s*円/);
    expect(貸与カード().textContent).not.toMatch(/月額\s*\d/);
  });

  it("申込期限を全国共通の日付で書いていない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const カード = 貸与カード();
    expect(カード.textContent).not.toMatch(/\d{1,2}月\d{1,2}日(まで|締切)/);
  });
});

describe("案内（guide）の画面表示", () => {
  /** 案内セクションのカードを名前で取り出す */
  function 案内カード(名前) {
    return [...document.querySelectorAll(".sn-guide-group article")].find((要素) =>
      要素.textContent.includes(名前)
    );
  }

  it("4件の案内が表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 名前 = [...document.querySelectorAll(".sn-guide-group h4")].map(
      (h) => h.textContent
    );
    expect(名前).toEqual([
      "志望校独自の支援を確認する",
      "住んでいる自治体の支援を確認する",
      "民間団体・財団の奨学金を確認する",
      "施設等で暮らした経験のある人向けの支援を相談する",
    ]);
  });

  it("【重要】案内に「確認のしかた」が番号つきで表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    for (const 名前 of [
      "志望校独自の支援を確認する",
      "住んでいる自治体の支援を確認する",
      "民間団体・財団の奨学金を確認する",
      "施設等で暮らした経験のある人向けの支援を相談する",
    ]) {
      const カード = 案内カード(名前);
      expect(カード.textContent).toContain("確認のしかた");
      expect(カード.querySelectorAll(".sn-steps li")).toHaveLength(3);
    }
  });

  it("JASSOの検索ページへのリンクが表示される", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    for (const 名前 of [
      "志望校独自の支援を確認する",
      "住んでいる自治体の支援を確認する",
      "民間団体・財団の奨学金を確認する",
    ]) {
      const リンク = 案内カード(名前).querySelector("a");
      expect(リンク.getAttribute("href")).toBe(
        "https://www.jasso.go.jp/shogakukin/dantaiseido/"
      );
      expect(リンク.textContent).toBe("探し方を見る");
    }
  });

  it("【重要】案内は「確認先の案内」と表示され、制度の分類が付かない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    for (const カード of document.querySelectorAll(".sn-guide-group article")) {
      expect(カード.textContent).toContain("確認先の案内");
      expect(カード.querySelector(".sn-tag-sample")).toBeNull();
      expect(カード.textContent).not.toMatch(/給付型・|貸与型・|減免・/);
    }
  });

  it("【重要】「必ず制度がある」と読める表示になっていない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 案内の文 = document.querySelector(".sn-guide-group").textContent;
    for (const 断定 of ["必ずあります", "必ず存在します", "全員が使えます"]) {
      expect(案内の文).not.toContain(断定);
    }
  });

  it("施設経験者向けの案内に、判定しないことが書かれている", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const カード = 案内カード("施設等で暮らした経験のある人向けの支援を相談する");
    expect(カード.textContent).toMatch(/決めるものではありません/);
    expect(カード.textContent).not.toMatch(/あなたは利用できます/);
  });

  it("【重要】施設の質問をとばしても、案内が消えない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンC);

    expect(
      案内カード("施設等で暮らした経験のある人向けの支援を相談する")
    ).toBeTruthy();
    expect(document.querySelectorAll(".sn-guide-group article")).toHaveLength(4);
  });

  it("施設経験が「ない」と答えたときだけ、その案内が消える", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンB);

    expect(
      案内カード("施設等で暮らした経験のある人向けの支援を相談する")
    ).toBeUndefined();
    expect(document.querySelectorAll(".sn-guide-group article")).toHaveLength(3);
  });

  it("【重要】制度と案内が混ざらない", async () => {
    render(<ShingakuNavi />);
    await 最後まで回答する(回答パターンA);

    const 制度側 = [
      ...グループの制度名("特に確認したほうがよい制度"),
      ...グループの制度名("確認する価値がある制度"),
      ...折りたたみの中の制度名(),
    ];
    const 案内側 = [...document.querySelectorAll(".sn-guide-group h4")].map(
      (h) => h.textContent
    );

    // 同じものが両方に出ていない
    for (const 名前 of 案内側) {
      expect(制度側).not.toContain(名前);
    }
    // 制度側には program だけが並んでいる
    expect(制度側).toEqual([
      "高等教育の修学支援新制度",
      "JASSO 貸与奨学金（第一種・第二種）",
    ]);
  });
});
