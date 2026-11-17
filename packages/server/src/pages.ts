// 仕様: docs/spec/08-widget-ui.html 8.2
import type { FormTemplate } from "@posissue/core";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const STYLE = `
:root{--bg:#f7f7fb;--card:#fff;--fg:#16161d;--muted:#6b6b7b;--line:#e4e4ec;--field:#fbfbfd;
--accent:#5b5bd6;--accent-fg:#fff;--accent-soft:rgba(91,91,214,.12);--err:#d1344b;--ok:#1f9d63;--r:12px;
--shadow:0 1px 2px rgba(20,20,40,.04),0 8px 24px rgba(20,20,40,.06)}
@media (prefers-color-scheme:dark){:root{--bg:#0e0e14;--card:#17171f;--fg:#ececf3;--muted:#9a9aab;--line:#2a2a36;--field:#1c1c26;
--accent:#8b8bf5;--accent-fg:#0e0e14;--accent-soft:rgba(139,139,245,.16);--err:#ff6b81;--ok:#4cd498;--shadow:none}}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}/* タップ時の水色の四角を消す。キーボード操作用のフォーカス表示は残す */
html,body{margin:0;background:var(--bg);color:var(--fg);overflow-x:hidden}
body{font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;padding:20px 16px 28px;-webkit-font-smoothing:antialiased}
.wrap{max-width:520px;margin:0 auto}
header{margin-bottom:18px}
h1{font-size:19px;line-height:1.35;margin:0 0 4px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13px;margin:0;display:flex;align-items:center;gap:6px}
.sub svg{flex-shrink:0}
header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.lang{display:inline-flex;flex-shrink:0;border:1.5px solid var(--line);border-radius:999px;padding:2px;background:var(--card)}
.lang button{border:0;background:none;color:var(--muted);font:600 12px/1 inherit;font-family:inherit;padding:6px 10px;border-radius:999px;cursor:pointer}
.lang button[aria-pressed=true]{background:var(--accent);color:var(--accent-fg)}
.lang button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.kinds{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:0 0 18px;padding:0;border:0}
.kind{position:relative}
.kind input{position:absolute;opacity:0;inset:0;cursor:pointer}
.kind span{display:block;user-select:none;-webkit-user-select:none;height:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:var(--r);background:var(--card);transition:border-color .15s,background .15s,box-shadow .15s}
.kind b{display:block;font-size:14px}
.kind small{display:block;color:var(--muted);font-size:12px;line-height:1.45;margin-top:2px}
.kind input:checked+span{border-color:var(--accent);background:var(--accent-soft)}
.kind input:focus-visible+span{box-shadow:0 0 0 3px var(--accent-soft)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:var(--shadow)}
.f{margin-bottom:16px}
.f>label,.f>.lbl{display:flex;align-items:baseline;gap:6px;font-weight:600;font-size:14px;margin-bottom:6px}
.req{color:var(--err);font-weight:700}
.help{color:var(--muted);font-size:12px;margin:-2px 0 6px}
input[type=text],textarea,select{width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;background:var(--field);color:var(--fg);font:inherit;transition:border-color .15s,box-shadow .15s;appearance:none}
textarea{min-height:96px;resize:vertical;line-height:1.55}
input:focus,textarea:focus,select:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
::placeholder{color:var(--muted);opacity:.7}
[aria-invalid=true]{border-color:var(--err)!important}
.count{text-align:right;color:var(--muted);font-size:11px;margin-top:3px;font-variant-numeric:tabular-nums}
.check{display:flex;gap:8px;align-items:center;font-weight:500}
.check input{width:18px;height:18px;accent-color:var(--accent)}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.ts{margin:4px 0 14px;min-height:65px}
button.send{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border:0;border-radius:10px;background:var(--accent);color:var(--accent-fg);font:600 15px/1 inherit;font-family:inherit;cursor:pointer;transition:filter .15s,transform .05s}
button.send:hover{filter:brightness(1.07)}button.send:active{transform:translateY(1px)}
button.send:disabled{opacity:.6;cursor:default}
.spin{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:s .7s linear infinite;display:none}
button.busy .spin{display:block}
@keyframes s{to{transform:rotate(360deg)}}
#msg{min-height:1.4em;margin:10px 0 0;font-size:13px;text-align:center}#msg.err{color:var(--err)}
.done{text-align:center;padding:28px 8px}
.done svg{color:var(--ok)}
.done h2{font-size:18px;margin:10px 0 4px}.done p{color:var(--muted);margin:0 0 18px}
.done a{color:var(--accent)}
button.ghost{background:none;border:1.5px solid var(--line);border-radius:10px;padding:9px 16px;color:var(--fg);font:inherit;cursor:pointer}
footer{margin-top:14px;text-align:center;color:var(--muted);font-size:12px}
[hidden]{display:none!important}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

const GH_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.66 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"/></svg>`;
const OK_ICON = `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 2.5 2.5L16 9.5"/></svg>`;

/** フォームの見た目はフォームの型（FormTemplate[]）から組み立てる。値は textContent で入れるので HTML 注入されない。 */
export function formPage(o: { projectKey: string; repo: string; siteKey: string; forms: FormTemplate[]; meta: Record<string, string>; nonce: string; lang?: "ja" | "en" }) {
  const cfg = JSON.stringify({ key: o.projectKey, repo: o.repo, forms: o.forms, meta: o.meta, lang: o.lang }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>Feedback</title><style>${STYLE}</style>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer nonce="${o.nonce}"></script></head><body>
<div class="wrap">
<header><div><h1 id="h"></h1><p class="sub">${GH_ICON}<span id="repo"></span></p></div>
<div class="lang" role="group" aria-label="Language"><button type="button" data-lang="ja" lang="ja">日本語</button><button type="button" data-lang="en" lang="en">English</button></div></header>
<form id="f" novalidate>
<fieldset class="kinds" id="kinds"></fieldset>
<div class="card">
<div class="f"><label for="title"><span data-t="title"></span><span class="req" aria-hidden="true">*</span></label>
<input type="text" id="title" name="title" maxlength="100" required autocomplete="off"></div>
<div id="fields"></div>
<div class="hp" aria-hidden="true"><input type="text" name="hp" tabindex="-1" autocomplete="off"></div>
<div class="ts"><div class="cf-turnstile" data-sitekey="${esc(o.siteKey)}" data-theme="auto" data-size="flexible"></div></div>
<button type="submit" class="send"><span class="spin" aria-hidden="true"></span><span data-t="send"></span></button>
<p id="msg" role="status" aria-live="polite"></p>
</div>
</form>
<div class="card done" id="done" hidden>${OK_ICON}<h2 data-t="thanks"></h2><p id="doneText"></p>
<button type="button" class="ghost" id="again" data-t="again"></button></div>
<footer data-t="foot"></footer>
</div>
<script nonce="${o.nonce}">
(function(){
var C=${cfg},t0=Date.now(),L=C.lang||((navigator.language||"").slice(0,2)==="ja"?"ja":"en");
var T={title:["Title","タイトル"],send:["Send report","送信する"],thanks:["Thank you!","送信しました"],again:["Send another","もう一件送る"],
foot:["No GitHub account needed · Powered by PosIssue","GitHub アカウントは不要です · Powered by PosIssue"],h:["Send feedback","フィードバックを送る"],
sent:["Your report was posted as issue #","Issue #"],sent2:[".","として登録されました。"],
required:["Please fill in the required fields.","必須項目を入力してください。"],
captcha_failed:["Verification failed. Please try again.","認証に失敗しました。もう一度お試しください。"],
rate_limited:["Too many reports. Please try again later.","送信が多すぎます。少し時間をおいてお試しください。"],
duplicate:["This report was already sent.","同じ内容はすでに送信されています。"],
spam:["Could not send. Please review your text (too many links?).","送信できませんでした。リンクが多すぎないか確認してください。"],
invalid_input:["Please check your input.","入力内容を確認してください。"],
forbidden_origin:["Reports are not accepted from this site.","このサイトからは送信できません。"],
unknown_project:["This project is not available.","このプロジェクトは利用できません。"],
upstream_error:["Something went wrong. Please try again later.","エラーが発生しました。時間をおいてお試しください。"]};
var t=function(k){return T[k][L==="ja"?1:0]},lt=function(x){return x==null?"":typeof x==="string"?x:(L==="ja"&&x.ja)||x.en};
var $=function(id){return document.getElementById(id)},el=function(tag,props){var e=document.createElement(tag);for(var k in props)e[k]=props[k];return e};
var f=$("f"),msg=$("msg"),box=$("fields"),title=$("title"),cur=C.forms[0],lastMsg=null;
$("repo").textContent=C.repo;
if(C.forms.length<2)$("kinds").hidden=true;
function kinds(){$("kinds").textContent="";C.forms.forEach(function(tp){var w=el("label",{className:"kind"}),r=el("input",{type:"radio",name:"kind",value:tp.kind,checked:tp===cur}),s=el("span");
s.append(el("b",{textContent:lt(tp.label)}));if(tp.description)s.append(el("small",{textContent:lt(tp.description)}));
w.append(r,s);$("kinds").append(w);r.addEventListener("change",function(){render(tp)})})}
// 言語を切り替えても、入力途中の値は残す
function setLang(l){L=l;document.documentElement.lang=L;
document.querySelectorAll("[data-t]").forEach(function(e){e.textContent=t(e.dataset.t)});$("h").textContent=t("h");
document.querySelectorAll("[data-lang]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.lang===L))});
var keep={};box.querySelectorAll("input,textarea,select").forEach(function(i){keep[i.name]=i.type==="checkbox"?i.checked:i.value});
kinds();render(cur,keep);if(lastMsg)say(lastMsg[0],lastMsg[1])}
document.querySelectorAll("[data-lang]").forEach(function(b){b.addEventListener("click",function(){setLang(b.dataset.lang)})});
function render(tp,keep){cur=tp;keep=keep||{};box.textContent="";title.placeholder=lt(tp.titlePlaceholder);
tp.fields.forEach(function(fd){var w=el("div",{className:"f"}),id="f_"+fd.id,inp;
if(fd.type==="checkbox"){inp=el("input",{type:"checkbox",id:id,name:fd.id});var lb=el("label",{className:"check",htmlFor:id});lb.append(inp,document.createTextNode(lt(fd.label)));w.append(lb)}
else{var lb2=el("label",{htmlFor:id});lb2.append(el("span",{textContent:lt(fd.label)}));if(fd.required)lb2.append(el("span",{className:"req",textContent:"*",ariaHidden:"true"}));w.append(lb2);
if(fd.help)w.append(el("p",{className:"help",textContent:lt(fd.help)}));
if(fd.type==="select"){inp=el("select",{id:id,name:fd.id});inp.append(el("option",{value:"",textContent:"—"}));fd.options.forEach(function(op){inp.append(el("option",{value:op.value,textContent:lt(op.label)}))})}
else{var max=fd.maxLength||(fd.type==="textarea"?5000:200);inp=el(fd.type==="textarea"?"textarea":"input",{id:id,name:fd.id,maxLength:max,placeholder:lt(fd.placeholder)});if(fd.type==="text")inp.type="text"}
if(fd.id in keep){if(fd.type==="checkbox")inp.checked=keep[fd.id];else inp.value=keep[fd.id]}
inp.required=!!fd.required;w.append(inp);
if(fd.type==="textarea"){var c=el("div",{className:"count",textContent:inp.value.length+" / "+max});inp.addEventListener("input",function(){c.textContent=inp.value.length+" / "+max});w.append(c)}}
inp.addEventListener("input",function(){inp.removeAttribute("aria-invalid")});box.append(w)})}
setLang(L);
function say(k,err){lastMsg=k?[k,err]:null;msg.textContent=k?t(k):"";msg.className=err?"err":""}
function post(type,data){var m=Object.assign({type:type},data||{});try{if(parent!==window)parent.postMessage(m,"*")}catch(e){}
if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(m))}
document.addEventListener("keydown",function(e){if(e.key==="Escape")post("posissue:close")});
var meta=Object.assign({userAgent:navigator.userAgent.slice(0,200),language:navigator.language||""},C.meta);
$("again").addEventListener("click",function(){$("done").hidden=true;f.hidden=false;f.reset();cur=C.forms[0];kinds();render(cur);t0=Date.now();window.turnstile&&turnstile.reset();title.focus()});
f.addEventListener("submit",function(e){e.preventDefault();var d=new FormData(f),fields={},bad=null;
[title].concat([].slice.call(box.querySelectorAll("input,textarea,select"))).forEach(function(i){
var v=i.type==="checkbox"?String(i.checked):i.value;if(i.required&&!v.trim()){i.setAttribute("aria-invalid","true");bad=bad||i}if(i!==title)fields[i.name]=v});
if(bad){say("required",true);bad.focus();return}
var btn=f.querySelector(".send");btn.disabled=true;btn.classList.add("busy");say("");
fetch("/api/report",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
projectKey:C.key,kind:cur.kind,title:title.value,fields:fields,hp:d.get("hp")||"",meta:meta,
turnstileToken:d.get("cf-turnstile-response")||"",elapsedMs:Date.now()-t0})})
.then(function(r){return r.json()}).then(function(r){if(r.ok){f.hidden=true;$("done").hidden=false;
var p=$("doneText");p.textContent=t("sent");var a=el("a",{href:r.issueUrl,target:"_blank",rel:"noopener",textContent:String(r.issueNumber)});p.append(a,document.createTextNode(t("sent2")));
post("posissue:done",{issueNumber:r.issueNumber})}
else{say(T[r.error]?r.error:"upstream_error",true);window.turnstile&&turnstile.reset()}})
.catch(function(){say("upstream_error",true)}).finally(function(){btn.disabled=false;btn.classList.remove("busy")})});
})();
</script></body></html>`;
}

export function messagePage(title: string, bodyHtml: string) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>${esc(title)}</title><style>${STYLE}
table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid var(--line);padding:8px 10px;text-align:left}
code,pre{background:var(--accent-soft);border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:13px}code{padding:2px 6px}pre{padding:12px;overflow-x:auto}pre code{padding:0;background:none}
a{color:var(--accent)}</style></head>
<body><div class="wrap"><div class="card"><h1>${esc(title)}</h1>${bodyHtml}</div></div></body></html>`;
}

const LANDING_STYLE = `
:root{--bg:#fbfbfe;--fg:#16161d;--muted:#5f5f70;--line:#e6e6ef;--card:#fff;--accent:#5b5bd6;--accent2:#c05bd6;--soft:rgba(91,91,214,.1);--code:#14141c;--codefg:#e6e6f0}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b11;--fg:#ececf3;--muted:#9d9db0;--line:#24242f;--card:#14141c;--accent:#8b8bf5;--accent2:#d58bf5;--soft:rgba(139,139,245,.12);--code:#101018}}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 ui-sans-serif,system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}.w{max-width:1080px;margin:0 auto;padding:0 20px}
nav{position:sticky;top:0;z-index:5;backdrop-filter:saturate(1.6) blur(12px);background:color-mix(in srgb,var(--bg) 80%,transparent);border-bottom:1px solid var(--line)}
nav .w{display:flex;align-items:center;justify-content:space-between;height:60px}
.logo{font-weight:800;letter-spacing:-.02em;font-size:18px;text-decoration:none;display:flex;gap:8px;align-items:center}
.logo img{width:28px;height:28px;display:block}
nav .links{display:flex;gap:18px;font-size:14px}nav .links a{text-decoration:none;color:var(--muted)}nav .links a:hover{color:var(--fg)}
.hero{position:relative;overflow:hidden;padding:88px 0 72px}
.hero:before{content:"";position:absolute;inset:-40% -10% auto;height:640px;background:radial-gradient(closest-side,var(--soft),transparent),radial-gradient(closest-side at 70% 40%,rgba(192,91,214,.10),transparent);pointer-events:none}
.hero .w{position:relative;display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.pill{display:inline-block;font-size:13px;padding:4px 12px;border-radius:999px;background:var(--soft);color:var(--accent);font-weight:600;margin-bottom:18px}
h1{font-size:clamp(30px,4.6vw,52px);line-height:1.12;letter-spacing:-.03em;margin:0 0 18px}
h1 span,h1 em{white-space:nowrap}h1 em{font-style:normal;background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{font-size:18px;color:var(--muted);margin:0 0 30px;max-width:34em}
.cta{display:flex;gap:12px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:12px;font-weight:600;text-decoration:none;font-size:15px;border:1.5px solid var(--line);background:var(--card)}
.btn.p{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 8px 24px rgba(91,91,214,.3)}
@media (prefers-color-scheme:dark){.btn.p{color:#0b0b11}}
.btn:hover{transform:translateY(-1px)}.btn{transition:transform .15s}
.demo{border:1px solid var(--line);border-radius:20px;background:var(--card);box-shadow:0 30px 80px rgba(20,20,60,.12);overflow:hidden;height:560px}
.demo iframe{border:0;width:100%;height:100%}
.mock{padding:22px}.mock b{display:block;margin-bottom:12px}.mock span{display:block;height:40px;border:1.5px solid var(--line);border-radius:10px;margin-bottom:12px}.mock span.t{height:110px}.mock span.s{background:var(--accent);border:0}
section{padding:72px 0}h2{font-size:clamp(26px,3.6vw,36px);letter-spacing:-.02em;margin:0 0 10px;line-height:1.25}
.sub{color:var(--muted);margin:0 0 36px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:22px}
.card .ic{font-size:24px}.card h3{font-size:17px;margin:8px 0 6px}.card p{margin:0;color:var(--muted);font-size:14px}
.steps{counter-reset:s;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.steps .card:before{counter-increment:s;content:counter(s);display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--soft);color:var(--accent);font-weight:800;margin-bottom:6px}
.tabs{display:flex;gap:6px;margin-bottom:-1px}
.tabs button{font:inherit;font-size:14px;padding:8px 14px;border:1px solid var(--line);border-bottom:0;border-radius:10px 10px 0 0;background:transparent;color:var(--muted);cursor:pointer}
.tabs button[aria-selected=true]{background:var(--code);color:var(--codefg);border-color:var(--code)}
pre{margin:0;background:var(--code);color:var(--codefg);border-radius:0 14px 14px 14px;padding:20px 22px;overflow-x:auto;font:13.5px/1.7 ui-monospace,Menlo,monospace}
pre.solo{border-radius:14px}.k{color:#c4a7ff}.s{color:#9ee6a8}.c{color:#7d7d92}
.two{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
.flow{display:flex;flex-wrap:wrap;gap:8px}.flow span{font-size:13px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--card)}
.flow span:last-child{background:var(--accent);color:#fff;border-color:var(--accent)}
.final{text-align:center;border:1px solid var(--line);border-radius:24px;padding:56px 20px;background:linear-gradient(135deg,var(--soft),transparent)}
.final .cta{justify-content:center}
footer{border-top:1px solid var(--line);padding:28px 0;color:var(--muted);font-size:14px}footer .w{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
@media (max-width:860px){.hero .w,.two{grid-template-columns:1fr}.grid,.steps{grid-template-columns:1fr}.hero{padding-top:48px}nav .links a.h{display:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}`;

/** 公式ホストのトップページ。demoKey があればフォームの実物を埋め込み、ウィジェットも置く（自分自身への報告になる）。 */
export function landingPage(o: { origin: string; appSlug: string; demoKey?: string; repoUrl: string; nonce: string }) {
  const install = `https://github.com/apps/${encodeURIComponent(o.appSlug)}/installations/new`;
  const demo = o.demoKey
    ? `<iframe src="/r/${esc(o.demoKey)}?kinds=bug,feature,other" title="PosIssue デモフォーム" loading="lazy"></iframe>`
    : `<div class="mock" aria-hidden="true"><b>フィードバックを送る</b><span></span><span class="t"></span><span class="t"></span><span class="s"></span></div>`;
  const o_ = esc(o.origin);
  const codes: [string, string][] = [
    ["Web サイト", `<span class="c">&lt;!-- &lt;/body&gt; の前に 1 行 --&gt;</span>
&lt;script src=<span class="s">"${o_}/widget.js"</span>
        data-key=<span class="s">"pk_xxx"</span> async&gt;&lt;/script&gt;`],
    ["npm", `<span class="k">import</span> { init } <span class="k">from</span> <span class="s">"posissue"</span>;

init({
  projectKey: <span class="s">"pk_xxx"</span>,
  endpoint: <span class="s">"${o_}"</span>,
  meta: { appVersion: <span class="s">"1.2.0"</span> },
});`],
    ["アプリ", `<span class="c">// iOS / Android / Flutter / Electron … WebView で開くだけ</span>
${o_}/r/pk_xxx?app_version=1.2.0&amp;os=ios`],
  ];
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>PosIssue — GitHub アカウントなしで Issue を送れるウィジェット</title>
<meta name="description" content="サイトやアプリに 1 行置くだけ。利用者のバグ報告や要望が、あなたの OSS リポジトリに GitHub Issue として届きます。">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta property="og:type" content="website"><meta property="og:site_name" content="PosIssue">
<meta property="og:url" content="${esc(o.origin)}/">
<meta property="og:title" content="PosIssue — アカウントがなくても、だれでも Issue を。">
<meta property="og:description" content="サイトやアプリに 1 行置くだけ。利用者のバグ報告や要望が、あなたの OSS リポジトリに GitHub Issue として届きます。">
<meta property="og:image" content="${esc(o.origin)}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="PosIssue — アカウントがなくても、だれでも Issue を。">
<meta name="twitter:card" content="summary_large_image"><style>${LANDING_STYLE}</style></head><body>
<nav><div class="w"><a class="logo" href="/"><img src="/icon.svg" alt="" width="28" height="28">PosIssue</a><div class="links">
<a class="h" href="#features">特長</a><a class="h" href="#start">はじめかた</a><a href="${esc(o.repoUrl)}">GitHub</a></div></div></nav>
<header class="hero"><div class="w"><div>
<img src="/icon.svg" alt="PosIssue" width="72" height="72" style="display:block;margin-bottom:18px;filter:drop-shadow(0 12px 28px rgba(91,91,214,.35))"><span class="pill">OSS のための報告ウィジェット</span>
<h1><span>アカウントがなくても、</span><br><em>だれでも Issue を。</em></h1>
<p class="lead">サイトやアプリにウィジェットを 1 行置くだけ。利用者からのバグ報告や要望が、あなたのリポジトリに GitHub Issue として届きます。</p>
<div class="cta"><a class="btn p" href="${esc(install)}">GitHub App をインストール →</a><a class="btn" href="${esc(o.repoUrl)}">ソースを見る</a></div>
</div><div class="demo">${demo}</div></div></header>

<section id="features"><div class="w">
<h2>報告のハードルを、ゼロに。</h2><p class="sub">GitHub に登録していない利用者の声も、取りこぼさずに集められます。</p>
<div class="grid">
<div class="card"><div class="ic">🙋</div><h3>アカウント不要</h3><p>報告する人は GitHub に登録しなくても送れます。個人情報も集めません。</p></div>
<div class="card"><div class="ic">🧩</div><h3>1 行で導入</h3><p>script タグを貼るか init() を呼ぶだけ。アプリは WebView で URL を開くだけです。</p></div>
<div class="card"><div class="ic">📐</div><h3>フォームは型で決まる</h3><p>FormTemplate を渡すと、画面・入力チェック・Issue 本文の形がそろって決まります。</p></div>
<div class="card"><div class="ic">🛡️</div><h3>スパム対策つき</h3><p>Turnstile、投稿数の制限、重複検出、@メンションの無効化を最初から備えています。</p></div>
<div class="card"><div class="ic">🌗</div><h3>きれいなフォーム</h3><p>ライト/ダーク自動切替、日本語・英語対応。どのサイトにもなじみます。</p></div>
<div class="card"><div class="ic">🔓</div><h3>オープンソース</h3><p>MIT ライセンス。Cloudflare Workers に自分でデプロイすることもできます。</p></div>
</div></div></section>

<section id="start"><div class="w">
<h2>3 ステップではじめる</h2><p class="sub">数分で、最初の報告が届きます。</p>
<div class="steps">
<div class="card"><h3>App をインストール</h3><p>GitHub App をリポジトリに入れると、projectKey が発行されます。</p></div>
<div class="card"><h3>ウィジェットを置く</h3><p>サイトなら 1 行、アプリなら URL を開くだけ。</p></div>
<div class="card"><h3>Issue が届く</h3><p>via-widget ラベル付きで、環境情報もそろった Issue になります。</p></div>
</div>
<div style="margin-top:28px"><div class="tabs" role="tablist">${codes.map(([n], i) =>
  `<button role="tab" aria-selected="${i === 0}" data-i="${i}">${n}</button>`).join("")}</div>
${codes.map(([, c], i) => `<pre role="tabpanel" data-p="${i}"${i ? " hidden" : ""}>${c}</pre>`).join("")}</div>
</div></section>

<section><div class="w two"><div>
<h2>フォームは、型を書くだけ。</h2>
<p class="sub">項目の種類は text / textarea / select / checkbox。書き間違いはエディタが教えてくれて、起動時にもチェックされます。</p>
</div><pre class="solo"><span class="k">const</span> forms: FormTemplate[] = [{
  kind: <span class="s">"bug"</span>,
  label: { en: <span class="s">"Bug"</span>, ja: <span class="s">"バグ報告"</span> },
  fields: [
    { id: <span class="s">"steps"</span>, type: <span class="s">"textarea"</span>, required: <span class="k">true</span>,
      label: { en: <span class="s">"Steps"</span>, ja: <span class="s">"再現手順"</span> } },
  ],
}];

<span class="k">export default</span> createHandler({ forms });</pre></div></section>

<section><div class="w">
<h2>スパムは、届く前に止める。</h2><p class="sub">安い検査から順に行い、どれかに引っかかった時点で止めます。</p>
<div class="flow"><span>入力チェック</span><span>ハニーポット</span><span>送信速度</span><span>URL の数</span><span>埋め込み元</span><span>IP ごとの制限</span><span>Turnstile</span><span>1 日の上限</span><span>重複検出</span><span>Issue 作成</span></div>
</div></section>

<section><div class="w"><div class="final">
<h2>利用者の声を、もっと近くに。</h2><p class="sub">無料で、いますぐ始められます。</p>
<div class="cta"><a class="btn p" href="${esc(install)}">GitHub App をインストール →</a><a class="btn" href="${esc(o.repoUrl)}#readme">ドキュメント</a></div>
</div></div></section>

<footer><div class="w"><span>© PosIssue · MIT License</span><a href="${esc(o.repoUrl)}">github.com/ninjin0802/posissue</a></div></footer>
<script nonce="${o.nonce}">
document.querySelectorAll("[role=tab]").forEach(function(b){b.addEventListener("click",function(){
document.querySelectorAll("[role=tab]").forEach(function(x){x.setAttribute("aria-selected",x===b)});
document.querySelectorAll("[data-p]").forEach(function(p){p.hidden=p.dataset.p!==b.dataset.i})})});
</script>
${o.demoKey ? `<script src="/widget.js" data-key="${esc(o.demoKey)}" async></script>` : ""}
</body></html>`;
}

// docs/images/icon.svg と同じ内容（README 用と配信用）。アイコンを変えるときは両方を更新する
export const ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\" role=\"img\" aria-label=\"PosIssue\">\n  <defs>\n    <linearGradient id=\"bg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n      <stop offset=\"0\" stop-color=\"#6d6af0\"/>\n      <stop offset=\".55\" stop-color=\"#7c5ce6\"/>\n      <stop offset=\"1\" stop-color=\"#c25bd6\"/>\n    </linearGradient>\n    <radialGradient id=\"glow\" cx=\".28\" cy=\".2\" r=\".75\">\n      <stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".35\"/>\n      <stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"0\"/>\n    </radialGradient>\n    <filter id=\"sh\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"150%\">\n      <feDropShadow dx=\"0\" dy=\"10\" stdDeviation=\"14\" flood-color=\"#2a1170\" flood-opacity=\".35\"/>\n    </filter>\n  </defs>\n  <rect width=\"512\" height=\"512\" rx=\"116\" fill=\"url(#bg)\"/>\n  <rect width=\"512\" height=\"512\" rx=\"116\" fill=\"url(#glow)\"/>\n  <!-- 吹き出し（フィードバック） -->\n  <path filter=\"url(#sh)\" fill=\"#fff\"\n    d=\"M146 112h220c41 0 74 33 74 74v118c0 41-33 74-74 74H262l-74 62c-9 8-22 1-22-10v-52h-20c-41 0-74-33-74-74V186c0-41 33-74 74-74z\"/>\n  <!-- Issue のマーク（開いた Issue の丸） -->\n  <circle cx=\"256\" cy=\"245\" r=\"54\" fill=\"none\" stroke=\"url(#bg)\" stroke-width=\"22\"/>\n  <circle cx=\"256\" cy=\"245\" r=\"19\" fill=\"url(#bg)\"/>\n</svg>";
