import React, { useState, useMemo } from "react";
import 制度データ from "./lib/loadPrograms.js";

/* ============================================================
   進学支援ナビ

   【制度データの追加・修正のしかた】
   制度のデータは、このファイルではなく
     data/programs/
   フォルダにあります。制度1件が JSON ファイル1つです。

   新しく増やすときは _TEMPLATE.json をコピーしてください。
   フォルダにファイルを置くだけで、アプリが自動的に読み込みます。
   このファイルを書き換える必要はありません。

   くわしい手順は README.md の「制度データを追加・更新する」を見てください。

   ※ 金額・所得の基準・締切は、公式サイトで確認したものだけを書いてください。
     古い情報や推測が残ると、利用者が判断を誤ります。
   ============================================================ */

const SHIENDATA = 制度データ;

/* ============================================================
   質問（STEP 1）
   ============================================================ */

const QUESTIONS = [
  {
    key: "grade",
    title: "いまの学年を教えてください",
    help: "学年によって、申し込める時期が変わります。",
    options: [
      { value: "hs1", label: "高校1年生" },
      { value: "hs2", label: "高校2年生" },
      { value: "hs3", label: "高校3年生" },
      { value: "graduate", label: "高校を卒業している" },
    ],
  },
  {
    key: "schoolType",
    title: "進学先はどう考えていますか",
    help: "まだ決まっていなくて大丈夫です。",
    options: [
      { value: "national", label: "国公立を考えている" },
      { value: "private", label: "私立を考えている" },
      { value: "both", label: "どちらも考えている" },
      { value: "undecided", label: "まだ決めていない" },
    ],
  },
  {
    key: "living",
    title: "進学したら、どこから通う予定ですか",
    help: "必要なお金の大きさが変わります。",
    options: [
      { value: "home", label: "自宅から通う予定" },
      { value: "alone", label: "一人暮らしの予定" },
      { value: "undecided", label: "まだ分からない" },
    ],
  },
  {
    key: "familySupport",
    title: "学費を家の人に出してもらえそうですか",
    help: "正確でなくて大丈夫です。いまの感覚で選んでください。",
    options: [
      { value: "difficult", label: "難しいと思う" },
      { value: "partial", label: "一部なら出してもらえそう" },
      { value: "enough", label: "だいたい出してもらえそう" },
      { value: "unknown", label: "分からない / まだ話せていない" },
    ],
  },
  {
    key: "researched",
    title: "奨学金について、いまどのくらい調べていますか",
    help: "調べていなくても、ここから始められます。",
    options: [
      { value: "not_yet", label: "まだ調べていない" },
      { value: "a_little", label: "名前を聞いたことがある程度" },
      { value: "already", label: "申し込みを考えている制度がある" },
    ],
  },
  {
    key: "careBackground",
    title: "児童養護施設や里親家庭で暮らした経験はありますか",
    help:
      "その場合に使える専用の支援があるので聞いています。答えたくないときは「答えない」を選んでください。結果はどちらでも表示されます。",
    optional: true,
    options: [
      { value: "yes", label: "ある / いま暮らしている" },
      { value: "no", label: "ない" },
      { value: "skip", label: "答えない" },
    ],
  },
];

/* ============================================================
   次にやること（STEP 3）の候補
   priority が小さいほど先に表示されます
   ============================================================ */

const ACTION_POOL = [
  {
    id: "learn-basics",
    priority: 1,
    text: "「給付型（返さなくてよい）」と「貸与型（あとで返す）」のちがいを知る",
    detail: "この2つの区別がつくと、調べるときに迷わなくなります。",
    when: (a) => a.researched === "not_yet",
  },
  {
    id: "talk-teacher-hs3",
    priority: 2,
    text: "高校の進路担当の先生に「奨学金を申し込みたい」と今週中に伝える",
    detail: "3年生は申し込みの時期が限られます。まず先生に状況を知ってもらうことが最優先です。",
    when: (a) => a.grade === "hs3",
  },
  {
    id: "talk-teacher",
    priority: 3,
    text: "高校の進路担当の先生に「奨学金について聞きたい」と伝える",
    detail: "学校が窓口になる制度があります。相談した時点で不利になることはありません。",
    when: (a) => a.grade === "hs1" || a.grade === "hs2",
  },
  {
    id: "talk-school-office",
    priority: 3,
    text: "進学予定先の学生課、または出身高校に相談する",
    detail: "高校を卒業していても、申し込める制度があります。",
    when: (a) => a.grade === "graduate",
  },
  {
    id: "care-consult",
    priority: 4,
    text: "施設の職員や自治体の担当者に「進学したい」と伝えておく",
    detail: "専用の支援や、住む場所の相談につながることがあります。",
    when: (a) => a.careBackground === "yes",
  },
  {
    id: "check-official",
    priority: 5,
    text: "公式ページで、募集の条件と申し込み時期を自分の目で確認する",
    detail: "このアプリの情報は入口です。条件は公式サイトが正しい情報です。",
    when: () => true,
  },
  {
    id: "ask-family",
    priority: 6,
    text: "家の人に、学費についてどう考えているか一度きいてみる",
    detail: "申し込みには家の人の協力が必要な制度が多いので、早めに話せると進めやすくなります。",
    when: (a) => a.familySupport === "unknown",
  },
  {
    id: "check-school-site",
    priority: 7,
    text: "志望校の公式サイトで「学費」「奨学金」のページを見る",
    detail: "学校ごとの支援は、学校のサイトにしか書かれていません。",
    when: (a) => a.schoolType !== "undecided",
  },
  {
    id: "check-local",
    priority: 8,
    text: "住んでいる市区町村の名前と「奨学金」で検索して、窓口があるか確認する",
    detail: "地域限定の支援は見つけにくい代わりに、競争がゆるやかなことがあります。",
    when: () => true,
  },
  {
    id: "check-docs",
    priority: 9,
    text: "申し込みに必要な書類が何か、先生か公式ページで確認する",
    detail: "家の人に用意してもらう書類がある場合、時間がかかります。",
    when: () => true,
  },
  {
    id: "calendar",
    priority: 10,
    text: "締切をスマホのカレンダーに登録する",
    detail: "奨学金でいちばん多い失敗は、締切を過ぎてしまうことです。",
    when: () => true,
  },
];

/* ============================================================
   表示の見た目
   ============================================================ */

const CSS = `
.sn-root {
  --bg: #f1f6f4;
  --surface: #ffffff;
  --ink: #17313a;
  --ink-soft: #5a737c;
  --line: #dae7e2;
  --primary: #14746a;
  --primary-soft: #e2f0ec;
  --sun: #f5b731;
  --sun-soft: #fdf3da;
  background: var(--bg);
  color: var(--ink);
  font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP",
    "Yu Gothic Medium", Meiryo, system-ui, sans-serif;
  min-height: 100%;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}
.sn-shell { max-width: 30rem; margin: 0 auto; padding: 1.25rem 1.125rem 3rem; }
.sn-root * { box-sizing: border-box; }
.sn-root p, .sn-root h1, .sn-root h2, .sn-root h3, .sn-root ul, .sn-root li { margin: 0; }
.sn-root ul { padding: 0; list-style: none; }

.sn-brand { display: flex; align-items: baseline; gap: .5rem; margin-bottom: 1.75rem; }
.sn-brand-name { font-size: 1.0625rem; font-weight: 700; letter-spacing: .01em; }
.sn-brand-ver { font-size: .75rem; color: var(--ink-soft); }

.sn-hero-lead { font-size: .875rem; color: var(--ink-soft); margin-bottom: .5rem; }
.sn-hero-title {
  font-size: 1.75rem; font-weight: 700; line-height: 1.45;
  letter-spacing: -.01em; margin-bottom: 1rem;
}
.sn-hero-underline {
  display: inline-block; padding-bottom: .15rem;
  border-bottom: .45rem solid var(--sun-soft);
}
.sn-hero-body { font-size: .9375rem; color: var(--ink-soft); margin-bottom: 1.75rem; }

.sn-flow { display: grid; gap: .625rem; margin-bottom: 1.75rem; }
.sn-flow-item {
  display: flex; gap: .75rem; align-items: flex-start;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: .875rem; padding: .875rem 1rem;
}
.sn-flow-num {
  flex: 0 0 1.5rem; height: 1.5rem; border-radius: 50%;
  background: var(--primary-soft); color: var(--primary);
  font-size: .8125rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; margin-top: .15rem;
}
.sn-flow-label { font-size: .9375rem; font-weight: 600; }
.sn-flow-sub { font-size: .8125rem; color: var(--ink-soft); }

.sn-btn {
  width: 100%; border: none; border-radius: .75rem; cursor: pointer;
  font-family: inherit; font-size: 1rem; font-weight: 700;
  padding: .9375rem 1rem; background: var(--primary); color: #fff;
  transition: background .15s ease;
}
.sn-btn:hover { background: #10605a; }
.sn-btn-quiet {
  background: transparent; color: var(--ink-soft); font-weight: 600;
  font-size: .875rem; padding: .625rem; border: 1px solid var(--line);
  border-radius: .75rem; width: auto; cursor: pointer; font-family: inherit;
}
.sn-btn-quiet:hover { background: var(--surface); }
.sn-root button:focus-visible, .sn-root a:focus-visible {
  outline: 3px solid var(--primary); outline-offset: 2px;
}

.sn-progress-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: .625rem; font-size: .8125rem; color: var(--ink-soft);
}
.sn-progress-track {
  height: .3125rem; border-radius: 999px; background: #dfeae6; overflow: hidden;
  margin-bottom: 1.75rem;
}
.sn-progress-fill {
  height: 100%; background: var(--primary); border-radius: 999px;
  transition: width .3s ease;
}

.sn-q-title { font-size: 1.3125rem; font-weight: 700; line-height: 1.5; margin-bottom: .5rem; }
.sn-q-help { font-size: .875rem; color: var(--ink-soft); margin-bottom: 1.25rem; }
.sn-options { display: grid; gap: .625rem; }
.sn-option {
  width: 100%; text-align: left; font-family: inherit; font-size: 1rem;
  background: var(--surface); border: 1.5px solid var(--line);
  border-radius: .875rem; padding: 1rem 1.0625rem; cursor: pointer;
  color: var(--ink); transition: border-color .12s ease, background .12s ease;
}
.sn-option:hover { border-color: var(--primary); background: var(--primary-soft); }
.sn-option-selected { border-color: var(--primary); background: var(--primary-soft); font-weight: 700; }
.sn-nav { display: flex; gap: .75rem; margin-top: 1.5rem; }

.sn-section-head { margin: 2.25rem 0 1rem; }
.sn-step-mark {
  display: inline-block; font-size: .75rem; font-weight: 700; color: var(--primary);
  background: var(--primary-soft); border-radius: 999px; padding: .1875rem .625rem;
  margin-bottom: .5rem;
}
.sn-section-title { font-size: 1.25rem; font-weight: 700; line-height: 1.5; }
.sn-section-note { font-size: .875rem; color: var(--ink-soft); margin-top: .375rem; }

.sn-card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 1rem; padding: 1.125rem; margin-bottom: .875rem;
}
.sn-card-top { display: flex; flex-wrap: wrap; gap: .375rem; margin-bottom: .625rem; }
.sn-tag { font-size: .75rem; font-weight: 700; border-radius: .375rem; padding: .125rem .5rem; }
.sn-tag-provider { background: #eef2f4; color: var(--ink-soft); font-weight: 600; }
.sn-tag-sample { background: var(--sun-soft); color: #8a6206; }
.sn-card-name { font-size: 1.0625rem; font-weight: 700; line-height: 1.5; margin-bottom: .5rem; }
.sn-card-summary { font-size: .9375rem; color: #3d5760; margin-bottom: .875rem; }
.sn-why { background: #f6faf8; border-radius: .75rem; padding: .8125rem .9375rem; margin-bottom: .875rem; }
.sn-why-head { font-size: .8125rem; font-weight: 700; margin-bottom: .375rem; }
.sn-why li { font-size: .875rem; color: #3d5760; padding-left: 1rem; position: relative; margin-bottom: .25rem; }
.sn-why li:last-child { margin-bottom: 0; }
.sn-why li::before {
  content: ""; position: absolute; left: 0; top: .6875rem;
  width: .375rem; height: .375rem; border-radius: 50%; background: var(--primary);
}
.sn-official { border-top: 1px dashed var(--line); padding-top: .8125rem; }
.sn-official-text { font-size: .8125rem; color: var(--ink-soft); margin-bottom: .5rem; }
.sn-official-link {
  display: inline-block; font-size: .875rem; font-weight: 700; color: var(--primary);
  text-decoration: none; border: 1.5px solid var(--primary); border-radius: .625rem;
  padding: .5rem .875rem;
}
.sn-official-link:hover { background: var(--primary-soft); }

.sn-hint {
  background: var(--sun-soft); border-radius: .875rem; padding: .9375rem 1rem;
  font-size: .875rem; color: #6b5110; margin-bottom: 1.25rem;
}

.sn-action {
  display: flex; gap: .875rem; align-items: flex-start;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: .875rem; padding: .9375rem 1rem; margin-bottom: .625rem;
}
.sn-action-num {
  flex: 0 0 1.625rem; height: 1.625rem; border-radius: .5rem;
  background: var(--primary); color: #fff; font-size: .8125rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; margin-top: .125rem;
}
.sn-action-text { font-size: .9375rem; font-weight: 600; line-height: 1.6; }
.sn-action-detail { font-size: .8125rem; color: var(--ink-soft); margin-top: .25rem; }

.sn-closing {
  background: var(--primary); color: #fff; border-radius: 1rem;
  padding: 1.375rem 1.25rem; margin-top: 2rem;
}
.sn-closing-title { font-size: 1.125rem; font-weight: 700; margin-bottom: .625rem; }
.sn-closing p { font-size: .875rem; opacity: .92; margin-bottom: .875rem; }
.sn-closing li {
  font-size: .875rem; padding: .5rem 0; border-top: 1px solid rgba(255,255,255,.22);
}
.sn-disclaimer {
  font-size: .75rem; color: var(--ink-soft); line-height: 1.7;
  margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--line);
}
.sn-restart { margin-top: 1.25rem; }

@media (prefers-reduced-motion: reduce) {
  .sn-root * { transition: none !important; }
}
`;

const CATEGORY_STYLE = {
  給付型: { background: "#e3f0ec", color: "#14746a" },
  貸与型: { background: "#e7eef6", color: "#2b5f92" },
  減免: { background: "#efe9f7", color: "#5f4f96" },
  その他: { background: "#eef2f4", color: "#55707a" },
};

const CATEGORY_NOTE = {
  給付型: "返さなくてよいお金",
  貸与型: "あとで返すお金",
  減免: "払う学費が減る",
  その他: "内容は制度ごとに異なる",
};

/* ============================================================
   判定のロジック
   ============================================================ */

export function matchPrograms(answers) {
  return SHIENDATA.filter((program) => {
    const conditions = program.matching || {};
    return Object.keys(conditions).every((key) => {
      const allowed = conditions[key];
      if (!allowed || allowed.length === 0) return true;
      return allowed.includes(answers[key]);
    });
  });
}

function buildActions(answers) {
  return ACTION_POOL.filter((action) => action.when(answers))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);
}

function buildHints(answers) {
  const hints = [];
  if (answers.living === "alone") {
    hints.push(
      "一人暮らしの予定なら、学費だけでなく家賃や生活費も必要になります。自宅から通う場合より必要なお金が大きくなるので、複数の支援を組み合わせて考える人が多いです。"
    );
  }
  if (answers.schoolType === "private") {
    hints.push(
      "私立は学校ごとに学費の差が大きいです。志望校が決まったら、その学校のサイトで学費と支援制度をセットで見ておくと計画が立てやすくなります。"
    );
  }
  if (answers.familySupport === "enough") {
    hints.push(
      "いまは学費を出してもらえそうでも、家庭の状況は変わることがあります。どんな制度があるかだけ知っておくと、必要になったときに動けます。"
    );
  }
  return hints;
}

/* ============================================================
   画面
   ============================================================ */

function Intro({ onStart }) {
  return (
    <div>
      <p className="sn-hero-lead">大学進学とお金のこと</p>
      <h1 className="sn-hero-title">
        <span className="sn-hero-underline">知らなかった</span>
        <br />
        で、あきらめないために。
      </h1>
      <p className="sn-hero-body">
        かんたんな質問に答えると、確認してみるとよい支援制度と、今日からできることを整理します。3分ほどで終わります。
      </p>

      <div className="sn-flow">
        <div className="sn-flow-item">
          <div className="sn-flow-num">1</div>
          <div>
            <div className="sn-flow-label">あなたのことを教えてもらう</div>
            <div className="sn-flow-sub">6つの質問に答えるだけです</div>
          </div>
        </div>
        <div className="sn-flow-item">
          <div className="sn-flow-num">2</div>
          <div>
            <div className="sn-flow-label">確認するとよい支援を見る</div>
            <div className="sn-flow-sub">なぜ確認するとよいのかも一緒に表示します</div>
          </div>
        </div>
        <div className="sn-flow-item">
          <div className="sn-flow-num">3</div>
          <div>
            <div className="sn-flow-label">次にやることを受け取る</div>
            <div className="sn-flow-sub">順番どおりに進めれば大丈夫です</div>
          </div>
        </div>
      </div>

      <button className="sn-btn" onClick={onStart}>
        質問を始める
      </button>

      <p className="sn-disclaimer">
        このアプリは、受けられるかどうかを決めるものではありません。「確認してみるとよい制度」を知るための入口です。条件や金額、締切は必ず公式サイトで確認してください。
        <br />
        入力した内容は保存されません。画面を閉じると消えます。
      </p>
    </div>
  );
}

function Question({ index, total, question, current, onAnswer, onBack }) {
  return (
    <div>
      <div className="sn-progress-row">
        <span>
          質問 {index + 1} / {total}
        </span>
        <span>{question.optional ? "答えなくても大丈夫です" : "STEP 1"}</span>
      </div>
      <div className="sn-progress-track">
        <div
          className="sn-progress-fill"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <h2 className="sn-q-title">{question.title}</h2>
      <p className="sn-q-help">{question.help}</p>

      <div className="sn-options">
        {question.options.map((option) => (
          <button
            key={option.value}
            className={
              "sn-option" + (current === option.value ? " sn-option-selected" : "")
            }
            onClick={() => onAnswer(question.key, option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="sn-nav">
        {index > 0 && (
          <button className="sn-btn-quiet" onClick={onBack}>
            前の質問にもどる
          </button>
        )}
        {question.optional && (
          <button
            className="sn-btn-quiet"
            onClick={() => onAnswer(question.key, "skip")}
          >
            この質問をとばす
          </button>
        )}
      </div>
    </div>
  );
}

function ProgramCard({ program }) {
  const tagStyle = CATEGORY_STYLE[program.type] || CATEGORY_STYLE["その他"];
  return (
    <article className="sn-card">
      <div className="sn-card-top">
        <span className="sn-tag" style={tagStyle}>
          {program.type}・{CATEGORY_NOTE[program.type]}
        </span>
        <span className="sn-tag sn-tag-provider">{program.provider}</span>
        {program.status !== "verified" && (
          <span className="sn-tag sn-tag-sample">サンプルデータ</span>
        )}
      </div>

      <h3 className="sn-card-name">{program.name}</h3>
      <p className="sn-card-summary">{program.summary}</p>

      <div className="sn-why">
        <div className="sn-why-head">確認するとよい理由</div>
        <ul>
          {program.whyCheck.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      </div>

      <div className="sn-official">
        <p className="sn-official-text">{program.officialText}</p>
        {program.officialUrl && (
          <a
            className="sn-official-link"
            href={program.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            公式サイトを開く
          </a>
        )}
      </div>
    </article>
  );
}

function Result({ answers, onRestart }) {
  const programs = useMemo(() => matchPrograms(answers), [answers]);
  const actions = useMemo(() => buildActions(answers), [answers]);
  const hints = useMemo(() => buildHints(answers), [answers]);

  return (
    <div>
      <div className="sn-section-head" style={{ marginTop: 0 }}>
        <span className="sn-step-mark">STEP 2</span>
        <h2 className="sn-section-title">確認してみるとよい支援</h2>
        <p className="sn-section-note">
          あなたの答えから、{programs.length}件が見つかりました。これは「受けられる」という意味ではなく、「調べてみる価値がある」という意味です。
        </p>
      </div>

      {hints.map((hint, i) => (
        <div className="sn-hint" key={i}>
          {hint}
        </div>
      ))}

      {programs.length === 0 ? (
        <div className="sn-card">
          <h3 className="sn-card-name">まずは学校の先生に聞いてみましょう</h3>
          <p className="sn-card-summary">
            今回の答えに合う制度が見つかりませんでした。制度は毎年変わるので、高校の進路担当の先生に直接聞くのがいちばん確実です。
          </p>
        </div>
      ) : (
        programs.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))
      )}

      <div className="sn-section-head">
        <span className="sn-step-mark">STEP 3</span>
        <h2 className="sn-section-title">次にやること</h2>
        <p className="sn-section-note">
          上から順番に進めてください。1つ目だけでも今日中にできます。
        </p>
      </div>

      {actions.map((action, i) => (
        <div className="sn-action" key={action.id}>
          <div className="sn-action-num">{i + 1}</div>
          <div>
            <div className="sn-action-text">{action.text}</div>
            <div className="sn-action-detail">{action.detail}</div>
          </div>
        </div>
      ))}

      <div className="sn-closing">
        <div className="sn-closing-title">一人で判断する必要はありません</div>
        <p>
          奨学金は、条件が細かくて大人でも分かりにくい仕組みです。分からないまま相談するのが普通です。
        </p>
        <ul>
          <li>高校の進路担当・担任の先生（学校が窓口になる制度があります）</li>
          <li>志望校の入試広報・学生課（学校独自の支援について答えてくれます）</li>
          <li>市区町村・都道府県の役所の窓口（地域の支援について聞けます）</li>
          <li>日本学生支援機構（JASSO）の相談窓口</li>
        </ul>
      </div>

      <p className="sn-disclaimer">
        このアプリは、制度を知るきっかけをつくるものです。受けられるかどうかを決めることはできません。金額・条件・締切は必ず公式サイトか窓口で確認してください。
        <br />
        「サンプルデータ」と表示されている制度は、内容の確認がまだ済んでいないものです。
        <br />
        入力した内容は保存していません。
      </p>

      <div className="sn-restart">
        <button className="sn-btn" onClick={onRestart}>
          もう一度やり直す
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   本体
   ============================================================ */

export default function ShingakuNavi() {
  const [phase, setPhase] = useState("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setPhase("result");
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setStep(0);
    setPhase("intro");
  };

  return (
    <div className="sn-root">
      <style>{CSS}</style>
      <div className="sn-shell">
        <div className="sn-brand">
          <span className="sn-brand-name">進学支援ナビ</span>
          <span className="sn-brand-ver">Ver.0</span>
        </div>

        {phase === "intro" && <Intro onStart={() => setPhase("questions")} />}

        {phase === "questions" && (
          <Question
            index={step}
            total={QUESTIONS.length}
            question={QUESTIONS[step]}
            current={answers[QUESTIONS[step].key]}
            onAnswer={handleAnswer}
            onBack={() => setStep(Math.max(0, step - 1))}
          />
        )}

        {phase === "result" && (
          <Result answers={answers} onRestart={handleRestart} />
        )}
      </div>
    </div>
  );
}
