// 章の一覧はここだけで管理する（SSOT）。章を足すときはここに1行追加する。
const CHAPTERS = [
  ["index.html", "0. はじめに"],
  ["01-overview.html", "1. 概要と用語"],
  ["02-architecture.html", "2. アーキテクチャ"],
  ["03-packages.html", "3. パッケージと設定の型"],
  ["04-http-api.html", "4. HTTP API"],
  ["05-data-model.html", "5. データモデル (D1)"],
  ["06-github-app.html", "6. GitHub App 連携"],
  ["07-spam-security.html", "7. スパム対策とセキュリティ"],
  ["08-widget-ui.html", "8. ウィジェットとアプリ組み込み"],
  ["09-operations.html", "9. 運用・制限・費用"],
  ["10-roadmap.html", "10. 範囲外とロードマップ"],
];
const here = location.pathname.split("/").pop() || "index.html";
const nav = document.createElement("nav");
nav.innerHTML = '<div class="brand">PosIssue 仕様書</div>' +
  CHAPTERS.map(([f, t]) => `<a href="${f}"${f === here ? ' class="on" aria-current="page"' : ""}>${t}</a>`).join("");
document.body.prepend(nav);
const i = CHAPTERS.findIndex(([f]) => f === here);
const pager = document.createElement("div");
pager.className = "pager";
pager.innerHTML = (i > 0 ? `<a href="${CHAPTERS[i-1][0]}">← ${CHAPTERS[i-1][1]}</a>` : "<span></span>") +
  (i < CHAPTERS.length - 1 ? `<a href="${CHAPTERS[i+1][0]}">${CHAPTERS[i+1][1]} →</a>` : "<span></span>");
document.querySelector("main").append(pager);
