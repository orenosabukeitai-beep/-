import React, { useState, useMemo, useEffect, useCallback } from "react";
import 制度データ from "./lib/loadPrograms.js";
import { 制度を分類する } from "./lib/matching.js";

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

   質問はどれも「聞く理由」を持たせています。
     purpose         … この質問を何に使っているか
     usedForMatching … 制度の確認順を決めるのに使うかどうか

   パーソナライズされている感じを出すためだけに、
   制度の公式条件と関係のない質問を制度の絞り込みへ使わないこと。
   （living と researched は、あえて制度の確認順には使っていません）
   ============================================================ */

export const QUESTIONS = [
  {
    key: "grade",
    purpose: "行動計画の優先順位（3年生なら今週中に先生へ伝える、など）と、申し込み時期にかかわる制度の確認順",
    usedForMatching: true,
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
    purpose: "志望校独自の支援の確認順と、行動計画（志望校サイトを見る）、私立を選んだ人向けのヒント",
    usedForMatching: true,
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
    purpose: "ヒントのみ（一人暮らしは生活費もかかる）。制度の公式条件と結びつかないため、制度の確認順には使わない",
    usedForMatching: false,
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
    purpose: "制度の確認順（もっとも影響が大きい）と、行動計画（家の人と話す）、ヒント",
    usedForMatching: true,
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
    purpose: "行動計画のみ（給付型と貸与型のちがいを知る）。制度の公式条件と結びつかないため、制度の確認順には使わない",
    usedForMatching: false,
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
    purpose: "施設経験者向けの支援の確認順と、明確に対象外かどうかの判定、行動計画（施設の職員に相談する）",
    usedForMatching: true,
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
.sn-root p, .sn-root h1, .sn-root h2, .sn-root h3, .sn-root h4, .sn-root ul, .sn-root li { margin: 0; }
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

.sn-group { margin-bottom: 1.5rem; }
.sn-guide-group { border-top: 1px solid var(--line); padding-top: 1.5rem; margin-top: 1.5rem; }
.sn-group-head { margin-bottom: .75rem; }
.sn-group-title { font-size: 1.0625rem; font-weight: 700; line-height: 1.5; }
.sn-group-note { font-size: .8125rem; color: var(--ink-soft); margin-top: .25rem; }

.sn-more {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 1rem; margin-bottom: .875rem;
}
.sn-more > summary {
  cursor: pointer; list-style: none; padding: 1rem 1.125rem;
  font-size: .9375rem; font-weight: 600; color: var(--ink);
  display: flex; align-items: center; justify-content: space-between; gap: .5rem;
}
.sn-more > summary::-webkit-details-marker { display: none; }
.sn-more > summary:hover { background: #f6faf8; border-radius: 1rem; }
.sn-more > summary:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.sn-more-title { font-size: .9375rem; font-weight: 600; }
.sn-more-mark { flex: 0 0 auto; font-size: .8125rem; color: var(--primary); font-weight: 700; }
.sn-more[open] > summary { border-bottom: 1px solid var(--line); border-radius: 1rem 1rem 0 0; }
.sn-more-body { padding: 1rem 1.125rem .25rem; }
.sn-more-note { font-size: .8125rem; color: var(--ink-soft); margin-bottom: .875rem; }

.sn-card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 1rem; padding: 1.125rem; margin-bottom: .875rem;
}
.sn-card-top { display: flex; flex-wrap: wrap; gap: .375rem; margin-bottom: .625rem; }
.sn-tag { font-size: .75rem; font-weight: 700; border-radius: .375rem; padding: .125rem .5rem; }
.sn-tag-provider { background: #eef2f4; color: var(--ink-soft); font-weight: 600; }
.sn-tag-sample { background: var(--sun-soft); color: #8a6206; }
.sn-tag-guide { background: #eceff1; color: #46606b; }
.sn-card-name { font-size: 1.0625rem; font-weight: 700; line-height: 1.5; margin-bottom: .5rem; }
.sn-card-summary { font-size: .9375rem; color: #3d5760; margin-bottom: .875rem; }
.sn-variants { display: grid; gap: .5rem; margin-bottom: .875rem; }
.sn-variant {
  border: 1px solid var(--line); border-radius: .75rem;
  padding: .6875rem .875rem; background: #fbfdfc;
}
.sn-variant-head { display: flex; align-items: center; flex-wrap: wrap; gap: .375rem; margin-bottom: .25rem; }
.sn-variant-name { font-size: .9375rem; font-weight: 700; }
.sn-variant-mark {
  font-size: .75rem; font-weight: 700; border-radius: .375rem;
  padding: .125rem .5rem; background: var(--primary-soft); color: var(--primary);
}
.sn-variant-summary { font-size: .875rem; color: #3d5760; }

.sn-cautions {
  background: var(--sun-soft); border-radius: .75rem;
  padding: .8125rem .9375rem; margin-bottom: .875rem;
}
.sn-cautions-head { font-size: .8125rem; font-weight: 700; color: #6b5110; margin-bottom: .375rem; }
.sn-cautions li {
  font-size: .8125rem; color: #6b5110; padding-left: 1rem;
  position: relative; margin-bottom: .375rem; line-height: 1.7;
}
.sn-cautions li:last-child { margin-bottom: 0; }
.sn-cautions li::before {
  content: ""; position: absolute; left: 0; top: .5625rem;
  width: .375rem; height: .375rem; border-radius: 50%; background: #c08a1a;
}

.sn-why { background: #f6faf8; border-radius: .75rem; padding: .8125rem .9375rem; margin-bottom: .875rem; }
.sn-why-head { font-size: .8125rem; font-weight: 700; margin-bottom: .375rem; }
.sn-why li { font-size: .875rem; color: #3d5760; padding-left: 1rem; position: relative; margin-bottom: .25rem; }
.sn-why li:last-child { margin-bottom: 0; }
.sn-why li::before {
  content: ""; position: absolute; left: 0; top: .6875rem;
  width: .375rem; height: .375rem; border-radius: 50%; background: var(--primary);
}
/* 回答と結びついた理由は、印の色を変えて見分けられるようにする */
.sn-why .sn-why-linked li::before { background: var(--sun); }
.sn-why .sn-why-linked { margin-bottom: .25rem; }
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
.sn-closing .sn-closing-title { font-size: 1.125rem; font-weight: 700; margin-bottom: .625rem; }
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
  "減免＋給付型": { background: "#e7f0ea", color: "#2f6b57" },
  その他: { background: "#eef2f4", color: "#55707a" },
};

const CATEGORY_NOTE = {
  給付型: "返さなくてよいお金",
  貸与型: "あとで返すお金",
  減免: "払う学費が減る",
  "減免＋給付型": "学費が減る／返さなくてよいお金",
  その他: "内容は制度ごとに異なる",
};

/* ============================================================
   判定のロジック
   ============================================================ */

/**
 * 回答から制度を3つのグループに分けます。
 * 分け方の中身は src/lib/matching.js にあります。
 */
export function classifyForAnswers(answers) {
  return 制度を分類する(answers, SHIENDATA);
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
      <h2 className="sn-hero-title">
        <span className="sn-hero-underline">知らなかった</span>
        <br />
        で、あきらめないために。
      </h2>
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

function ProgramCard({ program, answerReasons = [] }) {
  const 案内である = program.recordType === "guide";
  const tagStyle = CATEGORY_STYLE[program.type] || CATEGORY_STYLE["その他"];

  return (
    <article className="sn-card">
      <div className="sn-card-top">
        {案内である ? (
          <span className="sn-tag sn-tag-guide">確認先の案内</span>
        ) : (
          <span className="sn-tag" style={tagStyle}>
            {program.type}・{CATEGORY_NOTE[program.type]}
          </span>
        )}
        <span className="sn-tag sn-tag-provider">{program.provider}</span>
        {/* 案内は特定の1つの制度ではないので、制度データとしての確認状態は出さない */}
        {!案内である && program.status !== "verified" && (
          <span className="sn-tag sn-tag-sample">サンプルデータ</span>
        )}
      </div>

      <h4 className="sn-card-name">{program.name}</h4>
      <p className="sn-card-summary">{program.summary}</p>

      {/* 1つの制度の中に種類があるとき（例：第一種＝無利子、第二種＝有利子）*/}
      {program.variants?.length > 0 && (
        <ul className="sn-variants">
          {program.variants.map((種類) => (
            <li className="sn-variant" key={種類.id}>
              <div className="sn-variant-head">
                <span className="sn-variant-name">{種類.name}</span>
                {種類.interest && (
                  <span className="sn-variant-mark">{種類.interest}</span>
                )}
              </div>
              <p className="sn-variant-summary">{種類.summary}</p>
            </li>
          ))}
        </ul>
      )}

      {program.cautions?.length > 0 && (
        <div className="sn-cautions">
          <div className="sn-cautions-head">申し込む前に知っておきたいこと</div>
          <ul>
            {program.cautions.map((注意, i) => (
              <li key={i}>{注意}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="sn-why">
        <div className="sn-why-head">
          {案内である ? "確認してみる価値がある理由" : "確認するとよい理由"}
        </div>
        {answerReasons.length > 0 && (
          <ul className="sn-why-linked">
            {answerReasons.map((reason, i) => (
              <li key={`linked-${i}`}>{reason}</li>
            ))}
          </ul>
        )}
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
            {案内である ? "探し方を見る" : "公式サイトを開く"}
          </a>
        )}
      </div>
    </article>
  );
}

/** 制度カードのかたまりを1グループぶん表示する */
function ProgramGroup({ title, note, items }) {
  if (items.length === 0) return null;
  return (
    <section className="sn-group">
      <div className="sn-group-head">
        <h3 className="sn-group-title">{title}</h3>
        <p className="sn-group-note">{note}</p>
      </div>
      {items.map((item) => (
        <ProgramCard
          key={item.制度.id}
          program={item.制度}
          answerReasons={item.回答にもとづく理由}
        />
      ))}
    </section>
  );
}

function Result({ answers, onRestart }) {
  const groups = useMemo(() => classifyForAnswers(answers), [answers]);
  const actions = useMemo(() => buildActions(answers), [answers]);
  const hints = useMemo(() => buildHints(answers), [answers]);

  const 優先 = groups.特に確認したほうがよい;
  const 価値あり = groups.確認する価値がある;
  const 知っておく = groups.知っておくとよい;
  const 案内 = groups.案内;
  const 制度の件数 = 優先.length + 価値あり.length + 知っておく.length;
  const 表示件数 = 制度の件数 + 案内.length;

  // 上の2グループが空のときは、残りを最初から開いておく
  const 最初から開く = 優先.length === 0 && 価値あり.length === 0;

  return (
    <div>
      <div className="sn-section-head" style={{ marginTop: 0 }}>
        <span className="sn-step-mark">STEP 2</span>
        <h2 className="sn-section-title">確認してみるとよい支援</h2>
        <p className="sn-section-note">
          あなたの答えから、{表示件数}件が見つかりました。これは「受けられる」という意味ではなく、「調べてみる価値がある」という意味です。確認する順番の目安として並べています。
        </p>
      </div>

      {hints.map((hint, i) => (
        <div className="sn-hint" key={i}>
          {hint}
        </div>
      ))}

      {表示件数 === 0 ? (
        <div className="sn-card">
          <h3 className="sn-card-name">まずは学校の先生に聞いてみましょう</h3>
          <p className="sn-card-summary">
            今回の答えに合う制度が見つかりませんでした。制度は毎年変わるので、高校の進路担当の先生に直接聞くのがいちばん確実です。
          </p>
        </div>
      ) : (
        <>
          <ProgramGroup
            title="特に確認したほうがよい制度"
            note="あなたの答えと関係の深い内容があったものです。まずここから見てみてください。"
            items={優先}
          />

          <ProgramGroup
            title="確認する価値がある制度"
            note="あなたの答えとつながる点があったものです。"
            items={価値あり}
          />

          {知っておく.length > 0 && (
            <details className="sn-more" open={最初から開く}>
              <summary>
                <span className="sn-more-title">
                  ほかにも確認できる制度があります（{知っておく.length}件）
                </span>
                <span className="sn-more-mark" aria-hidden="true">
                  ひらく
                </span>
              </summary>
              <div className="sn-more-body">
                <p className="sn-more-note">
                  今回の答えからは、あなたとのつながりを判断できませんでした。対象外という意味ではないので、気になるものがあれば確認してみてください。
                </p>
                {知っておく.map((item) => (
                  <ProgramCard
                    key={item.制度.id}
                    program={item.制度}
                    answerReasons={item.回答にもとづく理由}
                  />
                ))}
              </div>
            </details>
          )}

          {/* 学校・地域・民間の支援は、内容が相手によって変わるため、
              特定の1つの制度と同じ並びには混ぜず、別のまとまりとして案内する */}
          {案内.length > 0 && (
            <section className="sn-group sn-guide-group">
              <div className="sn-group-head">
                <h3 className="sn-group-title">学校・地域・民間の支援も確認する</h3>
                <p className="sn-group-note">
                  学校や住んでいる地域、民間団体にも独自の支援がある場合があります。ここでは、確認先と次に取る行動を案内します。
                </p>
              </div>
              {案内.map((item) => (
                <ProgramCard
                  key={item.制度.id}
                  program={item.制度}
                  answerReasons={item.回答にもとづく理由}
                />
              ))}
            </section>
          )}
        </>
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
        <h2 className="sn-closing-title">一人で判断する必要はありません</h2>
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

  /* ------------------------------------------------------------
     スマホの「戻る」ボタンへの対応

     画面を進むたびに、ブラウザの履歴に1つ印を残します。
     こうすると、戻るボタンで1つ前の質問に戻れるようになり、
     いきなりアプリの外へ出てしまうことがなくなります。

     回答の内容は React が持っているので、戻っても消えません。
     ライブラリは使わず、ブラウザに元からある機能だけで動きます。
     ------------------------------------------------------------ */

  /** 画面を進めて、履歴に印を残す */
  const 進む = useCallback((次の画面, 次の質問番号) => {
    setPhase(次の画面);
    setStep(次の質問番号);
    if (typeof window !== "undefined" && window.history) {
      window.history.pushState(
        { shingakuNavi: { phase: 次の画面, step: 次の質問番号 } },
        ""
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.history) return;

    // 最初の画面を履歴に記録しておく
    window.history.replaceState(
      { shingakuNavi: { phase: "intro", step: 0 } },
      ""
    );

    const 戻るときの処理 = (できごと) => {
      const 記録 = できごと.state?.shingakuNavi;
      if (記録) {
        setPhase(記録.phase);
        setStep(記録.step);
      } else {
        setPhase("intro");
        setStep(0);
      }
    };

    window.addEventListener("popstate", 戻るときの処理);
    return () => window.removeEventListener("popstate", 戻るときの処理);
  }, []);

  const handleAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (step < QUESTIONS.length - 1) {
      進む("questions", step + 1);
    } else {
      進む("result", step);
    }
  };

  // 画面の「前の質問にもどる」も、ブラウザの戻ると同じ動きにする
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history) {
      window.history.back();
    } else {
      setStep((前) => Math.max(0, 前 - 1));
    }
  };

  const handleRestart = () => {
    setAnswers({});
    進む("intro", 0);
  };

  return (
    <div className="sn-root">
      <style>{CSS}</style>
      <div className="sn-shell">
        <div className="sn-brand">
          <h1 className="sn-brand-name">進学支援ナビ</h1>
          <span className="sn-brand-ver">Ver.1</span>
        </div>

        {phase === "intro" && <Intro onStart={() => 進む("questions", 0)} />}

        {phase === "questions" && (
          <Question
            index={step}
            total={QUESTIONS.length}
            question={QUESTIONS[step]}
            current={answers[QUESTIONS[step].key]}
            onAnswer={handleAnswer}
            onBack={handleBack}
          />
        )}

        {phase === "result" && (
          <Result answers={answers} onRestart={handleRestart} />
        )}
      </div>
    </div>
  );
}
