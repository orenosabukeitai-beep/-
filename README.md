# 進学支援ナビ Ver.0

高校生が、進学にかかるお金の支援制度を知り、次にやることを整理するためのWebアプリ。

## 動かすまで（初めての人向け）

### 1. Node.js を入れる

まだ入っていなければ https://nodejs.org/ から LTS 版をダウンロードしてインストールする。
入っているか確かめるには、ターミナル（Windowsなら PowerShell）で次を実行する。

```
node -v
```

`v20.x.x` のような数字が出れば入っている。

### 2. このフォルダに移動する

zipを展開した場所に合わせてパスを書き換える。

```
cd ~/Downloads/shingaku-navi
```

### 3. 必要な部品を取ってくる（初回だけ）

```
npm install
```

数十秒かかる。`node_modules` というフォルダができるが、これは自動生成されるものなので中身を触らなくてよい。

### 4. 起動する

```
npm run dev
```

`http://localhost:5173` のようなURLが表示されるので、ブラウザで開く。
コードを保存すると、画面が自動で更新される。止めるときはターミナルで `Ctrl + C`。

スマホでの見え方を確認したいときは、ブラウザの開発者ツールでスマホ表示に切り替える（Chromeなら `Cmd/Ctrl + Shift + M`）。

## Claude Code で開発を続ける

このフォルダを指定して Claude Code を起動する。

```
cd ~/Downloads/shingaku-navi
claude
```

同じフォルダにある `CLAUDE.md` を Claude Code が自動で読む。
プロジェクトの目的、守るべき安全上の原則、ファイルの役割が書いてあるので、毎回説明し直さなくてよい。

インストール手順は https://code.claude.com/docs を参照。

## 最初にやるとよいこと

`src/ShingakuNavi.jsx` の一番上にある `SHIENDATA` が支援制度のデータ。
いま入っている7件はすべてサンプルで、`verified: false` になっているため画面上に「サンプルデータ」と表示される。

公式サイトで内容を確認した制度から `verified: true` に変え、実際の制度に置き換えていく。
書き方と、使える条件の一覧は `SHIENDATA` の直前のコメントに書いてある。

金額・所得基準・締切はデータに入れない。古い情報が残ると、利用者が判断を誤るため。

## ファイル構成

```
index.html              ページの入れ物
package.json            使っている部品の一覧
vite.config.js          ビルドの設定
CLAUDE.md               Claude Code 向けのプロジェクト説明
src/main.jsx            アプリの起動
src/index.css           背景と高さだけの最小限のCSS
src/ShingakuNavi.jsx    アプリ本体
```

## 公開するとき

```
npm run build
```

`dist` フォルダができる。これを Vercel や Netlify にアップロードすると、URLで他の人がスマホから開ける。
