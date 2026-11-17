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
.note{margin:10px 0 0;font-size:12px;color:var(--muted);text-align:center}
#msg{min-height:1.4em;margin:10px 0 0;font-size:13px;text-align:center}#msg.err{color:var(--err)}
.done{text-align:center;padding:28px 8px}
.done svg{color:var(--ok)}
.done h2{font-size:18px;margin:10px 0 4px}.done p{color:var(--muted);margin:0 0 18px}
.done a{color:var(--accent)}
button.ghost{background:none;border:1.5px solid var(--line);border-radius:10px;padding:9px 16px;color:var(--fg);font:inherit;cursor:pointer}
footer{margin-top:14px;text-align:center;color:var(--muted);font-size:12px}footer a{color:var(--muted)}
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
<p class="note" data-t="note"></p>
<p id="msg" role="status" aria-live="polite"></p>
</div>
</form>
<div class="card done" id="done" hidden>${OK_ICON}<h2 data-t="thanks"></h2><p id="doneText"></p>
<button type="button" class="ghost" id="again" data-t="again"></button></div>
<footer><span data-t="foot"></span> · <a href="/privacy" target="_blank" rel="noopener" data-t="privacy"></a></footer>
</div>
<script nonce="${o.nonce}">
(function(){
var C=${cfg},t0=Date.now(),L=C.lang||((navigator.language||"").slice(0,2)==="ja"?"ja":"en");
var T={title:["Title","タイトル"],send:["Send report","送信する"],thanks:["Thank you!","送信しました"],again:["Send another","もう一件送る"],
note:["Your report, the page URL and browser info will be posted as an issue in this repository.","送信した内容と、ページの URL・ブラウザの情報が、このリポジトリの Issue に掲載されます。"],
privacy:["Privacy","プライバシー"],
foot:["No GitHub account needed · Powered by PosIssue","GitHub アカウントは不要です · Powered by PosIssue"],h:["Send feedback","フィードバックを送る"],
held:["It will be published as an issue after the maintainer reviews it.","作者が確認したあとに、Issue として公開されます。"],
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
.then(function(r){return r.json()}).then(function(r){if(r.ok&&r.pending){f.hidden=true;$("done").hidden=false;$("doneText").textContent=t("held");post("posissue:done",{pending:true});return}
if(r.ok){f.hidden=true;$("done").hidden=false;
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
nav .links{display:flex;gap:18px;font-size:14px;align-items:center}nav .links a.lang{font-weight:700;font-size:12.5px;border:1px solid var(--line);border-radius:999px;padding:4px 10px;color:var(--fg)}nav .links a.lang:hover{border-color:var(--accent)}nav .sep{width:1px;height:18px;background:var(--line);margin:0 -4px}nav .links a.ib{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;margin:0 -8px}nav .links a.ib:hover{background:var(--soft);color:var(--accent)}nav .links a.ib:focus-visible{outline:2px solid var(--accent);outline-offset:1px}nav .links a{text-decoration:none;color:var(--muted)}nav .links a:hover{color:var(--fg)}
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
.author{display:flex;gap:28px;align-items:center;border:1px solid var(--line);border-radius:24px;padding:32px;background:var(--card);box-shadow:0 20px 50px rgba(20,20,60,.06);position:relative;overflow:hidden}
.author:before{content:"";position:absolute;right:-120px;top:-120px;width:320px;height:320px;background:radial-gradient(closest-side,var(--soft),transparent);pointer-events:none}
.av{width:96px;height:96px;border-radius:50%;flex-shrink:0;object-fit:cover;box-shadow:0 0 0 4px var(--card),0 0 0 6px var(--accent),0 12px 30px rgba(91,91,214,.3)}
.ab{position:relative;min-width:0}
.eyebrow{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--accent);margin-bottom:4px}
.author h2{margin:0;font-size:26px}
.role{margin:0 0 10px;color:var(--muted);font-size:14px}
.bio{margin:0 0 16px;line-height:1.8;max-width:34em}
.links{display:flex;gap:8px;flex-wrap:wrap}
.pill{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;border:1px solid var(--line);text-decoration:none;font-size:14px;font-weight:600;background:var(--bg);transition:border-color .15s,transform .15s}
.pill:hover{border-color:var(--accent);transform:translateY(-1px)}
@media (max-width:860px){.author{flex-direction:column;text-align:center;padding:28px 20px}.links{justify-content:center}.bio{margin-left:auto;margin-right:auto}}
.final{text-align:center;border:1px solid var(--line);border-radius:24px;padding:56px 20px;background:linear-gradient(135deg,var(--soft),transparent)}
.final .cta{justify-content:center}
footer{border-top:1px solid var(--line);padding:28px 0;color:var(--muted);font-size:14px}footer .fl{display:flex;gap:6px 16px;flex-wrap:wrap}footer .fl a{white-space:nowrap}footer .w{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
@media (max-width:860px){.hero .w,.two{grid-template-columns:1fr}.grid,.steps{grid-template-columns:1fr}.hero{padding-top:48px}nav .links a.h,nav .sep{display:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}`;

/** 公式ホストのトップページ。demoKey があればフォームの実物を埋め込み、ウィジェットも置く（自分自身への報告になる）。 */
export type Lang = "ja" | "en";
/** 日英の切り替え。t("日本語", "English") */
export const tr = (lang: Lang) => (ja: string, en: string) => (lang === "en" ? en : ja);
/** プライバシーポリシーなど静的ページの言語別 URL（英語は /en/ の下） */
export const docPath = (lang: Lang, page: "privacy" | "terms" | "changelog") => (lang === "en" ? `/en/${page}` : `/${page}`);
const DESC_JA = "サイトやアプリに 1 行置くだけ。利用者のバグ報告や要望が、あなたの OSS リポジトリに GitHub Issue として届きます。";
const DESC_EN = "Add one line to your site or app. Bug reports and feature requests from your users arrive in your open-source repository as GitHub issues — no GitHub account needed.";

export function landingPage(o: { origin: string; appSlug: string; demoKey?: string; repoUrl: string; nonce: string; lang: Lang }) {
  const t = tr(o.lang);
  const other: Lang = o.lang === "ja" ? "en" : "ja";
  const install = `https://github.com/apps/${encodeURIComponent(o.appSlug)}/installations/new`;
  const demo = o.demoKey
    ? `<iframe src="/r/${esc(o.demoKey)}?kinds=bug,feature,other&amp;lang=${o.lang}" title="${t("PosIssue デモフォーム", "PosIssue demo form")}" loading="lazy"></iframe>`
    : `<div class="mock" aria-hidden="true"><b>${t("フィードバックを送る", "Send feedback")}</b><span></span><span class="t"></span><span class="t"></span><span class="s"></span></div>`;
  const o_ = esc(o.origin);
  const codes: [string, string][] = [
    [t("Web サイト", "Website"), `<span class="c">&lt;!-- ${t("&lt;/body&gt; の前に 1 行", "One line before &lt;/body&gt;")} --&gt;</span>
&lt;script src=<span class="s">"${o_}/widget.js"</span>
        data-key=<span class="s">"pk_xxx"</span> async&gt;&lt;/script&gt;`],
    ["npm", `<span class="k">import</span> { init } <span class="k">from</span> <span class="s">"posissue"</span>;

init({
  projectKey: <span class="s">"pk_xxx"</span>,
  endpoint: <span class="s">"${o_}"</span>,
  meta: { appVersion: <span class="s">"1.2.0"</span> },
});`],
    [t("アプリ", "Apps"), `<span class="c">// iOS / Android / Flutter / Electron … ${t("WebView で開くだけ", "just open it in a WebView")}</span>
${o_}/r/pk_xxx?app_version=1.2.0&amp;os=ios`],
  ];
  return `<!doctype html><html lang="${o.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>${t("PosIssue — GitHub アカウントなしで Issue を送れるウィジェット", "PosIssue — Let anyone file GitHub issues, no account needed")}</title>
<meta name="description" content="${t(DESC_JA, DESC_EN)}">
<link rel="alternate" hreflang="ja" href="${esc(o.origin)}/?lang=ja"><link rel="alternate" hreflang="en" href="${esc(o.origin)}/?lang=en">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta property="og:type" content="website"><meta property="og:site_name" content="PosIssue">
<meta property="og:url" content="${esc(o.origin)}/">
<meta property="og:title" content="${t("PosIssue — アカウントがなくても、だれでも Issue を。", "PosIssue — No account? Anyone can file an issue.")}">
<meta property="og:description" content="${t(DESC_JA, DESC_EN)}">
<meta property="og:image" content="${esc(o.origin)}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="PosIssue">
<meta name="twitter:card" content="summary_large_image"><link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-friendly docs"><style>${LANDING_STYLE}</style></head><body>
<nav><div class="w"><a class="logo" href="/"><img src="/icon.svg" alt="" width="28" height="28">PosIssue</a><div class="links">
<a class="h" href="#features">${t("特長", "Features")}</a><a class="h" href="#start">${t("はじめかた", "Get started")}</a><a class="h" href="${docPath(o.lang, "changelog")}">${t("リリースノート", "Changelog")}</a><a class="h" href="#author">${t("作った人", "Author")}</a><span class="sep" aria-hidden="true"></span>
<a class="lang" href="/?lang=${other}" hreflang="${other}" lang="${other}" title="${other === "en" ? "English" : "日本語"}">${other === "en" ? "EN" : "日本語"}</a>
<a class="ib" href="/admin" aria-label="${t("管理画面", "Dashboard")}" title="${t("管理画面", "Dashboard")}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg></a>
<a class="ib" href="${esc(o.repoUrl)}" aria-label="GitHub" title="GitHub">${GH_ICON.replace('width="14" height="14"', 'width="18" height="18"')}</a></div></div></nav>
<header class="hero"><div class="w"><div>
<img src="/icon.svg" alt="PosIssue" width="72" height="72" style="display:block;margin-bottom:18px;filter:drop-shadow(0 12px 28px rgba(91,91,214,.35))"><span class="pill">${t("OSS のための報告ウィジェット", "A feedback widget for open source")}</span>
<h1>${t("<span>アカウントがなくても、</span><br><em>だれでも Issue を。</em>", "<span>No account needed.</span><br><em>Anyone can file an issue.</em>")}</h1>
<p class="lead">${t("サイトやアプリにウィジェットを 1 行置くだけ。利用者からのバグ報告や要望が、あなたのリポジトリに GitHub Issue として届きます。", "Add one line to your site or app. Bug reports and feature requests from your users arrive in your repository as GitHub issues.")}</p>
<div class="cta"><a class="btn p" href="${esc(install)}">${t("GitHub App をインストール →", "Install the GitHub App →")}</a><a class="btn" href="/admin">${t("管理画面", "Dashboard")}</a><a class="btn" href="${esc(o.repoUrl)}">${t("ソースを見る", "View source")}</a></div>
</div><div class="demo">${demo}</div></div></header>

<section id="features"><div class="w">
<h2>${t("報告のハードルを、ゼロに。", "Zero friction for reporters.")}</h2><p class="sub">${t("GitHub に登録していない利用者の声も、取りこぼさずに集められます。", "Hear from users who don’t have a GitHub account, too.")}</p>
<div class="grid">
<div class="card"><div class="ic">🙋</div><h3>${t("アカウント不要", "No account needed")}</h3><p>${t("報告する人は GitHub に登録しなくても送れます。個人情報も集めません。", "Reporters don’t need a GitHub account, and no personal data is collected.")}</p></div>
<div class="card"><div class="ic">🧩</div><h3>${t("1 行で導入", "One-line setup")}</h3><p>${t("script タグを貼るか init() を呼ぶだけ。アプリは WebView で URL を開くだけです。", "Paste a script tag or call init(). In apps, just open a URL in a WebView.")}</p></div>
<div class="card"><div class="ic">📐</div><h3>${t("フォームは型で決まる", "Typed forms")}</h3><p>${t("FormTemplate を渡すと、画面・入力チェック・Issue 本文の形がそろって決まります。", "One FormTemplate defines the UI, the validation and the issue body — always in sync.")}</p></div>
<div class="card"><div class="ic">🛡️</div><h3>${t("スパム対策つき", "Built-in spam protection")}</h3><p>${t("Turnstile、投稿数の制限、重複検出、@メンションの無効化を最初から備えています。承認モードも選べます。", "Turnstile, rate limits, duplicate detection and neutralized @mentions out of the box, plus an optional approval mode.")}</p></div>
<div class="card"><div class="ic">🌗</div><h3>${t("きれいなフォーム", "A beautiful form")}</h3><p>${t("ライト/ダーク自動切替、日本語・英語対応。どのサイトにもなじみます。", "Automatic light/dark mode and Japanese/English. Fits any site.")}</p></div>
<div class="card"><div class="ic">🔓</div><h3>${t("オープンソース", "Open source")}</h3><p>${t("MIT ライセンス。Cloudflare Workers に自分でデプロイすることもできます。", "MIT licensed. You can also self-host it on Cloudflare Workers.")}</p></div>
</div></div></section>

<section id="start"><div class="w">
<h2>${t("3 ステップではじめる", "Get started in 3 steps")}</h2><p class="sub">${t("数分で、最初の報告が届きます。", "Your first report arrives in minutes.")}</p>
<div class="steps">
<div class="card"><h3>${t("App をインストール", "Install the App")}</h3><p>${t("GitHub App をリポジトリに入れると、projectKey が発行されます。", "Install the GitHub App on your repository to get a project key.")}</p></div>
<div class="card"><h3>${t("ウィジェットを置く", "Add the widget")}</h3><p>${t("サイトなら 1 行、アプリなら URL を開くだけ。", "One line on a website, or open a URL in an app.")}</p></div>
<div class="card"><h3>${t("Issue が届く", "Receive issues")}</h3><p>${t("via-widget ラベル付きで、環境情報もそろった Issue になります。", "Issues arrive labeled via-widget, with environment details attached.")}</p></div>
</div>
<div style="margin-top:28px"><div class="tabs" role="tablist">${codes.map(([n], i) =>
  `<button role="tab" aria-selected="${i === 0}" data-i="${i}">${n}</button>`).join("")}</div>
${codes.map(([, c], i) => `<pre role="tabpanel" data-p="${i}"${i ? " hidden" : ""}>${c}</pre>`).join("")}</div>
</div></section>

<section><div class="w two"><div>
<h2>${t("フォームは、型を書くだけ。", "Just write a type.")}</h2>
<p class="sub">${t("項目の種類は text / textarea / select / checkbox。書き間違いはエディタが教えてくれて、起動時にもチェックされます。", "Fields can be text, textarea, select or checkbox. Your editor catches mistakes, and they are checked again at startup.")}</p>
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
<h2>${t("スパムは、届く前に止める。", "Stop spam before it lands.")}</h2><p class="sub">${t("安い検査から順に行い、どれかに引っかかった時点で止めます。", "Cheap checks run first, and a report stops at the first one it fails.")}</p>
<div class="flow">${(o.lang === "en" ? ["Validation", "Honeypot", "Speed", "Link count", "Origin", "Per-IP limit", "Turnstile", "Daily limit", "Duplicates", "Issue"] : ["入力チェック", "ハニーポット", "送信速度", "URL の数", "埋め込み元", "IP ごとの制限", "Turnstile", "1 日の上限", "重複検出", "Issue 作成"]).map((x) => `<span>${x}</span>`).join("")}</div>
</div></section>

<section id="author" style="padding-bottom:0"><div class="w"><div class="author">
<img class="av" src="/author.png" alt="${t("ninjin のアイコン", "ninjin’s avatar")}" width="96" height="96" loading="lazy">
<div class="ab"><span class="eyebrow">${t("作った人", "Made by")}</span>
<h2>ninjin</h2><p class="role">${t("個人開発者", "Indie developer")}</p>
<p class="bio">${t("個人開発者です。Web アプリ、Android アプリ、プログラミング言語まで、気になったものは作って確かめています。", "An indie developer. From web apps and Android apps to programming languages, I build whatever catches my interest to see how it works.")}</p>
<div class="links"><a class="pill" href="https://github.com/ninjin0802" rel="me noopener" target="_blank">${GH_ICON}<span>GitHub</span></a>
<a class="pill" href="https://2nj.lol" rel="me noopener" target="_blank"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>2nj.lol</span></a></div>
</div></div></div></section>

<section><div class="w"><div class="final">
<h2>${t("利用者の声を、もっと近くに。", "Bring your users’ voices closer.")}</h2><p class="sub">${t("無料で、いますぐ始められます。", "Free. Start right now.")}</p>
<div class="cta"><a class="btn p" href="${esc(install)}">${t("GitHub App をインストール →", "Install the GitHub App →")}</a><a class="btn" href="/admin">${t("管理画面", "Dashboard")}</a><a class="btn" href="${esc(o.repoUrl)}#readme">${t("ドキュメント", "Docs")}</a></div>
</div></div></section>

<footer><div class="w"><span>© 2026 <a href="https://github.com/ninjin0802">ninjin0802</a> · PosIssue is MIT licensed</span><span class="fl"><a href="${docPath(o.lang, "changelog")}">${t("リリースノート", "Changelog")}</a><a href="${docPath(o.lang, "privacy")}">${t("プライバシーポリシー", "Privacy")}</a><a href="${docPath(o.lang, "terms")}">${t("利用規約", "Terms")}</a><a href="${esc(o.repoUrl)}">GitHub</a></span></div></footer>
<script nonce="${o.nonce}">
document.querySelectorAll("[role=tab]").forEach(function(b){b.addEventListener("click",function(){
document.querySelectorAll("[role=tab]").forEach(function(x){x.setAttribute("aria-selected",x===b)});
document.querySelectorAll("[data-p]").forEach(function(p){p.hidden=p.dataset.p!==b.dataset.i})})});
</script>
${o.demoKey ? `<script src="/widget.js" data-key="${esc(o.demoKey)}" data-lang="${o.lang}" async></script>` : ""}
</body></html>`;
}

// docs/images/icon.svg と同じ内容（README 用と配信用）。アイコンを変えるときは両方を更新する
export const ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\" role=\"img\" aria-label=\"PosIssue\">\n  <defs>\n    <linearGradient id=\"bg\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n      <stop offset=\"0\" stop-color=\"#6d6af0\"/>\n      <stop offset=\".55\" stop-color=\"#7c5ce6\"/>\n      <stop offset=\"1\" stop-color=\"#c25bd6\"/>\n    </linearGradient>\n    <radialGradient id=\"glow\" cx=\".28\" cy=\".2\" r=\".75\">\n      <stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".35\"/>\n      <stop offset=\"1\" stop-color=\"#fff\" stop-opacity=\"0\"/>\n    </radialGradient>\n    <filter id=\"sh\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"150%\">\n      <feDropShadow dx=\"0\" dy=\"10\" stdDeviation=\"14\" flood-color=\"#2a1170\" flood-opacity=\".35\"/>\n    </filter>\n  </defs>\n  <rect width=\"512\" height=\"512\" rx=\"116\" fill=\"url(#bg)\"/>\n  <rect width=\"512\" height=\"512\" rx=\"116\" fill=\"url(#glow)\"/>\n  <!-- 吹き出し（フィードバック） -->\n  <path filter=\"url(#sh)\" fill=\"#fff\"\n    d=\"M146 112h220c41 0 74 33 74 74v118c0 41-33 74-74 74H262l-74 62c-9 8-22 1-22-10v-52h-20c-41 0-74-33-74-74V186c0-41 33-74 74-74z\"/>\n  <!-- Issue のマーク（開いた Issue の丸） -->\n  <circle cx=\"256\" cy=\"245\" r=\"54\" fill=\"none\" stroke=\"url(#bg)\" stroke-width=\"22\"/>\n  <circle cx=\"256\" cy=\"245\" r=\"19\" fill=\"url(#bg)\"/>\n</svg>";

/** key=null は運営が停止中。origins は埋め込みを許すサイト（空なら制限なし）、dailyLimit は 1 日の上限（null は既定値） */
export interface PendingItem { id: string; title: string; body: string; createdAt: number }
export interface KeyRow {
  repo: string; key: string | null; origins: string[]; dailyLimit: number | null;
  approval: boolean; // true = 承認してから起票（4.7）
  canEdit?: boolean; installationId?: number; pending?: PendingItem[];
}

const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;

const ADMIN_STYLE = `
:root{--bg:#f6f6fb;--card:#fff;--fg:#16161d;--muted:#6b6b7b;--line:#e7e7ef;--field:#fafafd;--accent:#5b5bd6;--accent2:#c05bd6;--accent-fg:#fff;
--soft:rgba(91,91,214,.1);--err:#d1344b;--ok:#1f9d63;--warn:#b7791f;--shadow:0 1px 2px rgba(20,20,40,.04),0 10px 30px rgba(20,20,40,.06)}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b11;--card:#14141c;--fg:#ececf3;--muted:#9d9db0;--line:#25252f;--field:#1a1a24;--accent:#8b8bf5;--accent2:#d58bf5;
--accent-fg:#0b0b11;--soft:rgba(139,139,245,.14);--err:#ff6b81;--ok:#4cd498;--warn:#f0b35a;--shadow:none}}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:var(--bg);color:var(--fg)}
body{font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
.bar{position:sticky;top:0;z-index:5;backdrop-filter:saturate(1.6) blur(12px);background:color-mix(in srgb,var(--bg) 82%,transparent);border-bottom:1px solid var(--line)}
.bar .in{max-width:880px;margin:0 auto;padding:0 20px;height:58px;display:flex;align-items:center;gap:12px}
.logo{display:flex;align-items:center;gap:9px;font-weight:800;text-decoration:none;color:inherit}.logo img{width:28px;height:28px}
.crumb{color:var(--muted);font-size:14px}.crumb:before{content:"/";margin:0 10px 0 2px;opacity:.5}
.bar .sp{flex:1}.bar a.lk{font-size:14px;color:var(--muted);text-decoration:none}.bar a.lk:hover{color:var(--fg)}
main{max-width:880px;margin:0 auto;padding:28px 20px 64px}
.hero{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px}
h1{font-size:28px;letter-spacing:-.02em;margin:0 0 4px}.lead{margin:0;color:var(--muted);font-size:14px;max-width:34em}
.stats{display:flex;gap:10px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 16px;min-width:108px;box-shadow:var(--shadow)}
.stat b{display:block;font-size:22px;line-height:1.2;font-variant-numeric:tabular-nums}.stat span{font-size:12px;color:var(--muted)}
.stat.hot b{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.ok-banner{display:flex;gap:10px;align-items:center;background:var(--soft);color:var(--fg);border-radius:14px;padding:12px 16px;margin-bottom:18px;font-size:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);margin-bottom:10px;overflow:hidden}
.head{display:flex;align-items:center;gap:10px;padding:14px 20px;flex-wrap:wrap;width:100%;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.head.static{cursor:default;padding-bottom:0}
.head:hover h2{color:var(--accent)}.head:focus-visible{outline:2px solid var(--accent);outline-offset:-2px;border-radius:18px}
.head[aria-expanded=true]{padding-bottom:0}
.chev{margin-left:auto;width:10px;height:10px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .2s;flex-shrink:0}
.head[aria-expanded=true] .chev{transform:rotate(-135deg)}
.badge.hot{color:var(--accent-fg);background:var(--accent);border-color:transparent}
.tools{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 14px}
#q{flex:1;min-width:200px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--fg);font:inherit;font-size:14px}
#q:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px var(--soft)}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:var(--card);color:var(--muted);border-radius:999px;padding:6px 12px;font:600 12.5px/1 inherit;font-family:inherit;cursor:pointer}
.chip[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.chip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.none{text-align:center;color:var(--muted);padding:24px}
.card[hidden]{display:none}
.head h2{display:flex;align-items:center;gap:8px;font-size:16px;margin:0;word-break:break-all}
.badge{font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.badge.ap{color:var(--accent);background:var(--soft);border-color:transparent}
.badge.off{color:var(--err);border-color:currentColor}
.tabs{display:flex;gap:4px;padding:12px 16px 0;border-bottom:1px solid var(--line);overflow-x:auto;overflow-y:hidden;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}
.tab{border:0;background:none;color:var(--muted);font:600 14px/1 inherit;font-family:inherit;padding:10px 12px 12px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;display:flex;gap:6px;align-items:center}
.tab:hover{color:var(--fg)}.tab[aria-selected=true]{color:var(--fg);border-bottom-color:var(--accent)}
.tab:focus-visible{outline:2px solid var(--accent);outline-offset:-2px;border-radius:8px}
.n{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--line);color:var(--muted);font-size:11.5px;display:inline-grid;place-items:center}
.n.hot{background:var(--accent);color:var(--accent-fg)}
.panel{padding:18px 20px 20px}
.lbl{display:block;font-size:12.5px;font-weight:600;color:var(--muted);margin:0 0 6px}
.lbl+.row,.row+.lbl{margin-top:0}.blk{margin-bottom:16px}.blk:last-child{margin-bottom:0}
.row{display:flex;gap:8px;align-items:stretch}
.row code{flex:1;min-width:0;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:10px 14px;font:13px/1.55 ui-monospace,Menlo,monospace;word-break:break-all}
.row code.key{font-size:16px;font-weight:700;letter-spacing:.02em}
.cp{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:12px;padding:0 14px;font:600 13px/1 inherit;font-family:inherit;cursor:pointer;transition:border-color .15s,background .15s}
.cp:hover{border-color:var(--accent)}.cp.done{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
.cp:focus-visible,.btn:focus-visible,.ghost:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.more{font-size:13px;font-weight:600;text-decoration:none}
.empty{text-align:center;padding:28px 12px;color:var(--muted)}
.empty .ic{font-size:28px;display:block;margin-bottom:6px}
.list{display:flex;flex-direction:column;gap:10px}
.item{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--field)}
.it-top{display:flex;gap:10px;align-items:flex-start}
.it-main{flex:1;min-width:0}
.it-title{font-weight:700;font-size:14.5px;word-break:break-word}
.it-meta{font-size:12px;color:var(--muted)}
.it-body{margin:8px 0 0;font-size:13px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;word-break:break-word}
.item.open .it-body{-webkit-line-clamp:unset;color:var(--fg)}
.it-act{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
.btn{border:0;background:var(--accent);color:var(--accent-fg);border-radius:10px;padding:8px 16px;font:600 13.5px/1 inherit;font-family:inherit;cursor:pointer}
.ghost{border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:10px;padding:7px 14px;font:600 13.5px/1 inherit;font-family:inherit;cursor:pointer}
.ghost.toggle{border:0;background:none;color:var(--accent);padding:7px 4px}
.btn:disabled,.ghost:disabled{opacity:.55;cursor:default}
.st{font-size:13px;color:var(--muted)}.st.err{color:var(--err)}.st.ok{color:var(--ok)}
.seg{display:inline-flex;background:var(--field);border:1px solid var(--line);border-radius:12px;padding:3px;gap:3px;flex-wrap:wrap}
.seg label{position:relative}.seg input{position:absolute;opacity:0;inset:0;cursor:pointer}
.seg span{display:block;padding:8px 14px;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--muted);transition:background .15s,color .15s}
.seg input:checked+span{background:var(--card);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.seg input:focus-visible+span{outline:2px solid var(--accent)}
.hint{font-size:12.5px;color:var(--muted);margin:6px 0 0}
textarea,input[type=number]{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--field);color:var(--fg);font:13.5px/1.55 ui-monospace,Menlo,monospace}
input[type=number]{max-width:180px;font-family:inherit;font-size:14px}
textarea:focus,input:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px var(--soft)}
.save-row{display:flex;align-items:center;gap:12px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
.note{font-size:13px;color:var(--muted);padding:0 20px 18px}
.addcard{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1.5px dashed var(--line);border-radius:18px;padding:16px 20px;color:var(--muted);font-size:14px}
footer{max-width:880px;margin:0 auto;padding:0 20px 40px;display:flex;flex-wrap:wrap;gap:8px 18px;color:var(--muted);font-size:13px}footer a{color:var(--muted)}
@media (max-width:600px){.hero{display:block}.stats{margin-top:14px}.stat{flex:1;min-width:0}h1{font-size:24px}.bar .lk.h{display:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}`;

/** ログインした作者向けの管理画面（/admin・/setup）。キーの確認、設定、承認待ちの処理。 */
export function keysPage(o: { origin: string; appSlug: string; rows: KeyRow[]; nonce: string; session: string; defaultDailyLimit: number; justInstalled: boolean; lang: Lang }) {
  const t = tr(o.lang);
  const install = `https://github.com/apps/${encodeURIComponent(o.appSlug)}/installations/new`;
  const copyBtn = (v: string, label: string) =>
    `<button type="button" class="cp" data-copy="${esc(v)}" aria-label="${esc(t(`${label}をコピー`, `Copy ${label}`))}">${COPY_ICON}<span>${t("コピー", "Copy")}</span></button>`;
  const totalPending = o.rows.reduce((n, r) => n + (r.pending?.length ?? 0), 0);
  // 承認待ちの表示用に、Issue 本文の Markdown の記号を読みやすく整える（中身は変えない）
  const readable = (b: string) => b.replace(/^### /gm, "■ ").replace(/<\/?details>|<\/?summary>/g, "").replace(/\n---\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const fmt = (t: number) => new Date(t * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  let uid = 0;
  // 承認待ちが多い順 → 停止中は最後 → 名前順。リポジトリが少なければ全部開き、多ければ承認待ちのあるものだけ開く
  const rows = [...o.rows].sort((a, b) =>
    (b.pending?.length ?? 0) - (a.pending?.length ?? 0) || Number(!a.key) - Number(!b.key) || a.repo.localeCompare(b.repo));
  const openAll = rows.length <= 3;
  const cards = rows.map((r) => {
    const id = `c${uid++}`;
    if (!r.key) {
      return `<section class="card" data-name="${esc(r.repo.toLowerCase())}" data-f="stopped"><div class="head static"><h2>${GH_ICON}<span>${esc(r.repo)}</span></h2><span class="badge off">${t("停止中", "Suspended")}</span></div>
<p class="note" style="padding-top:12px">${t("このリポジトリは運営により停止されています。", "This repository has been suspended by the operator.")}</p></section>`;
    }
    const tag = `<script src="${o.origin}/widget.js" data-key="${r.key}" async></script>`;
    const app = `${o.origin}/r/${r.key}`;
    const pend = r.pending ?? [];
    const tabs: [string, string, string][] = [["setup", t("導入", "Setup"), ""]];
    if (r.canEdit) {
      tabs.push(["pending", t("承認待ち", "Pending"), `<span class="n${pend.length ? " hot" : ""}">${pend.length}</span>`]);
      tabs.push(["settings", t("設定", "Settings"), ""]);
    }
    const first = r.canEdit && pend.length ? "pending" : "setup";
    const panel = (k: string, body: string) =>
      `<div class="panel" role="tabpanel" id="${id}-${k}" aria-labelledby="${id}-t-${k}"${k === first ? "" : " hidden"}>${body}</div>`;
    const setupPanel = panel("setup", `
<div class="blk"><span class="lbl">${t("プロジェクトキー", "Project key")}</span><div class="row"><code class="key">${esc(r.key)}</code>${copyBtn(r.key, t("キー", "key"))}</div></div>
<div class="blk"><span class="lbl">${t("サイトに貼る（&lt;/body&gt; の前）", "Add to your site (before &lt;/body&gt;)")}</span><div class="row"><code>${esc(tag)}</code>${copyBtn(tag, t("script タグ", "script tag"))}</div></div>
<div class="blk"><span class="lbl">${t("アプリの WebView で開く URL", "URL to open in an app WebView")}</span><div class="row"><code>${esc(app)}</code>${copyBtn(app, "URL")}</div></div>
<a class="more" href="${esc(app)}" target="_blank" rel="noopener">${t("フォームを開いて確かめる ↗", "Open the form ↗")}</a>`);
    const pendingPanel = !r.canEdit ? "" : panel("pending", pend.length
      ? `<div class="list">${pend.map((x) => `<article class="item" data-id="${esc(x.id)}" data-repo="${esc(r.repo)}">
<div class="it-top"><div class="it-main"><div class="it-title">${esc(x.title)}</div><div class="it-meta">${esc(fmt(x.createdAt))}</div></div></div>
<p class="it-body">${esc(readable(x.body))}</p>
<div class="it-act"><button type="button" class="btn" data-action="approve">${t("起票する", "Publish")}</button><button type="button" class="ghost" data-action="reject">${t("捨てる", "Discard")}</button>
<button type="button" class="ghost toggle" data-more>${t("全文を見る", "Show all")}</button><span class="st" role="status" aria-live="polite"></span></div></article>`).join("")}</div>`
      : `<div class="empty"><span class="ic" aria-hidden="true">📭</span>${t("承認待ちの報告はありません。", "No pending reports.")}${r.approval ? "" : `<br>${t("今は「すぐに起票」なので、報告はそのまま Issue になります。", "Reports are published immediately in this mode.")}`}</div>`);
    const settingsPanel = !r.canEdit ? "" : panel("settings", `<form class="set" data-repo="${esc(r.repo)}">
<div class="blk"><span class="lbl" id="${id}-m">${t("届いた報告の扱い", "When a report arrives")}</span>
<div class="seg" role="radiogroup" aria-labelledby="${id}-m">
<label><input type="radio" name="approval" value="1"${r.approval ? " checked" : ""}><span>${t("承認してから起票", "Review first")}</span></label>
<label><input type="radio" name="approval" value="0"${r.approval ? "" : " checked"}><span>${t("すぐに起票", "Publish immediately")}</span></label></div>
<p class="hint">${t("公開リポジトリでは「承認してから起票」がおすすめです。承認待ちは 14 日で自動的に消えます。", "Recommended for public repositories. Pending reports are deleted after 14 days.")}</p></div>
<div class="blk"><label class="lbl" for="${id}-o">${t("埋め込みを許すサイト（1 行に 1 つ、最大 10）", "Allowed sites (one per line, up to 10)")}</label>
<textarea id="${id}-o" name="origins" rows="3" placeholder="https://example.com" spellcheck="false">${esc(r.origins.join("\n"))}</textarea>
<p class="hint">${t("空にすると、どのサイトにも埋め込めます。アプリの WebView から開く場合は影響しません。", "Leave empty to allow any site. Opening the form in an app WebView is not affected.")}</p></div>
<div class="blk"><label class="lbl" for="${id}-l">${t("1 日に受け付ける件数の上限（1〜1000）", "Daily limit (1–1000)")}</label>
<input id="${id}-l" name="limit" type="number" min="1" max="1000" inputmode="numeric" placeholder="${t("既定", "Default")} ${o.defaultDailyLimit}" value="${r.dailyLimit ?? ""}"></div>
<div class="save-row"><button type="submit" class="btn">${t("保存", "Save")}</button><span class="st" role="status" aria-live="polite"></span></div></form>`);
    const open = openAll || pend.length > 0;
    const flags = [pend.length ? "pending" : "", r.approval ? "approval" : "instant"].filter(Boolean).join(" ");
    return `<section class="card" aria-label="${esc(r.repo)}" data-name="${esc(r.repo.toLowerCase())}" data-f="${flags}">
<button type="button" class="head" aria-expanded="${open}" aria-controls="${id}-body"><h2>${GH_ICON}<span>${esc(r.repo)}</span></h2>
${r.canEdit ? `<span class="badge${r.approval ? " ap" : ""}" data-mode>${r.approval ? t("承認モード", "Review first") : t("すぐに起票", "Instant")}</span>` : ""}
${pend.length ? `<span class="badge hot" data-pcount>${t("承認待ち", "Pending")} ${pend.length}</span>` : ""}<span class="chev" aria-hidden="true"></span></button>
<div class="body" id="${id}-body"${open ? "" : " hidden"}>
<div class="tabs" role="tablist">${tabs.map(([k, label, extra]) =>
  `<button type="button" class="tab" role="tab" id="${id}-t-${k}" aria-controls="${id}-${k}" aria-selected="${k === first}" tabindex="${k === first ? 0 : -1}">${label}${extra}</button>`).join("")}</div>
${setupPanel}${pendingPanel}${settingsPanel}
${r.canEdit ? "" : `<p class="note">${t("設定の変更と承認は、このリポジトリの管理者だけができます。", "Only repository admins can change settings and review reports.")}</p>`}</div></section>`;
  }).join("");
  const empty = `<section class="card"><div class="empty" style="padding:44px 20px"><span class="ic" aria-hidden="true">🧩</span>
${t("まだ PosIssue を入れたリポジトリがありません。", "You haven’t installed PosIssue on any repository yet.")}<br><br><a class="btn" style="text-decoration:none;display:inline-block" href="${esc(install)}">${t("GitHub App をインストール", "Install the GitHub App")}</a></div></section>`;
  return `<!doctype html><html lang="${o.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="robots" content="noindex"><title>${t("管理画面", "Dashboard")} | PosIssue</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml"><style>${ADMIN_STYLE}</style></head><body>
<header class="bar"><div class="in"><a class="logo" href="/"><img src="/icon.svg" alt="" width="28" height="28">PosIssue</a><span class="crumb">${t("管理画面", "Dashboard")}</span>
<span class="sp"></span><a class="lk h" href="${esc(install)}">${t("リポジトリを追加・変更", "Manage repositories")}</a><a class="lk" href="/">${t("トップ", "Home")}</a></div></header>
<main>
${o.justInstalled ? `<div class="ok-banner" role="status">✅ ${t("インストールが完了しました。「導入」のコードをサイトに貼るだけで使えます。", "Installed! Paste the code from “Setup” into your site to start.")}</div>` : ""}
<div class="hero"><div><h1>${t("管理画面", "Dashboard")}</h1><p class="lead">${t("GitHub で確認できた、あなたがアクセスできるリポジトリだけを表示しています。", "Only repositories you can access on GitHub are shown.")}</p></div>
<div class="stats"><div class="stat"><b>${o.rows.filter((r) => r.key).length}</b><span>${t("リポジトリ", "Repositories")}</span></div>
<div class="stat${totalPending ? " hot" : ""}"><b>${totalPending}</b><span>${t("承認待ち", "Pending")}</span></div></div></div>
${rows.length > 3 ? `<div class="tools"><input type="search" id="q" placeholder="${t("リポジトリを検索", "Search repositories")}" aria-label="${t("リポジトリを検索", "Search repositories")}" autocomplete="off">
<div class="chips" role="group" aria-label="${t("絞り込み", "Filter")}"><button type="button" class="chip" aria-pressed="true" data-f="">${t("すべて", "All")}</button><button type="button" class="chip" aria-pressed="false" data-f="pending">${t("承認待ちあり", "Has pending")}</button><button type="button" class="chip" aria-pressed="false" data-f="approval">${t("承認モード", "Review first")}</button><button type="button" class="chip" aria-pressed="false" data-f="instant">${t("すぐに起票", "Instant")}</button></div>
<button type="button" class="ghost toggle" id="all">${t("すべて開く", "Expand all")}</button></div>
<p class="none" id="none" hidden>${t("条件に合うリポジトリはありません。", "No repositories match.")}</p>` : ""}
${o.rows.length ? `<div id="cards">${cards}</div>` : empty}
${o.rows.length ? `<div class="addcard"><span>${t("別のリポジトリにも入れる・外す", "Add or remove repositories")}</span><a class="ghost" style="text-decoration:none" href="${esc(install)}">${t("リポジトリを追加・変更", "Manage repositories")}</a></div>` : ""}
</main>
<footer><a href="${docPath(o.lang, "changelog")}">${t("リリースノート", "Changelog")}</a><a href="${docPath(o.lang, "privacy")}">${t("プライバシーポリシー", "Privacy")}</a><a href="${docPath(o.lang, "terms")}">${t("利用規約", "Terms")}</a><a href="https://github.com/ninjin0802/posissue">GitHub</a><span>© 2026 ninjin0802</span></footer>
<script nonce="${o.nonce}">
(function(){
var SESSION=${JSON.stringify(o.session)};
var M=${JSON.stringify({collapse: t("たたむ", "Collapse"),more: t("全文を見る", "Show all"),copy: t("コピー", "Copy"),copied: t("コピー済み", "Copied"),copyFail: t("選択してコピー", "Select to copy"),expand: t("すべて開く", "Expand all"),collapseAll: t("すべて閉じる", "Collapse all"),saving: t("保存しています…", "Saving…"),saved: t("保存しました", "Saved"),saveFail: t("保存できませんでした。", "Could not save."),net: t("通信に失敗しました。", "Network error."),working: t("処理しています…", "Working…"),fail: t("処理できませんでした。", "Could not complete."),discarded: t("捨てました", "Discarded"),created: t(" を作成しました ↗", " created ↗"),pending: t("承認待ち", "Pending"),review: t("承認モード", "Review first"),instant: t("すぐに起票", "Instant"),invalid_input: t("入力を確かめてください（サイトは https://example.com の形、上限は 1〜1000）。", "Please check your input (sites like https://example.com, limit 1–1000)."),session_expired: t("時間が経ちました。ページを開き直してください。", "Session expired. Please reload the page."),forbidden: t("このリポジトリは変更できません。", "You can’t change this repository."),rate_limited: t("少し待ってからもう一度お試しください。", "Please wait a moment and try again."),not_found: t("すでに処理されています。", "Already handled."),upstream_error: t("GitHub への起票に失敗しました。時間をおいてお試しください。", "Could not create the issue on GitHub. Please try again later.")}).replace(/</g, "\\u003c")};
var ERR=M;
function call(path,body){return fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.assign({session:SESSION},body))}).then(function(r){return r.json()})}
function say(st,cls,text){st.className="st"+(cls?" "+cls:"");st.textContent=text}
// タブ（矢印キーでも移動できる）
document.querySelectorAll("[role=tablist]").forEach(function(list){var tabs=[].slice.call(list.querySelectorAll("[role=tab]"));
function sel(t){tabs.forEach(function(x){var on=x===t;x.setAttribute("aria-selected",on);x.tabIndex=on?0:-1;document.getElementById(x.getAttribute("aria-controls")).hidden=!on})}
tabs.forEach(function(t,i){t.addEventListener("click",function(){sel(t)});t.addEventListener("keydown",function(e){var j=e.key==="ArrowRight"?i+1:e.key==="ArrowLeft"?i-1:-1;
if(j<0&&e.key!=="ArrowLeft")return;j=(j+tabs.length)%tabs.length;sel(tabs[j]);tabs[j].focus();e.preventDefault()})})});
// 開閉
function setOpen(h,on){h.setAttribute("aria-expanded",on);document.getElementById(h.getAttribute("aria-controls")).hidden=!on}
document.querySelectorAll("button.head").forEach(function(h){h.addEventListener("click",function(){setOpen(h,h.getAttribute("aria-expanded")!=="true")})});
var all=document.getElementById("all");if(all)all.addEventListener("click",function(){var open=all.textContent===M.expand;
document.querySelectorAll(".card:not([hidden]) button.head").forEach(function(h){setOpen(h,open)});all.textContent=open?M.collapseAll:M.expand});
// 検索と絞り込み
var q=document.getElementById("q"),fl="";
function apply(){var s=(q&&q.value||"").trim().toLowerCase(),n=0;document.querySelectorAll("#cards>.card").forEach(function(c){
var ok=(!s||c.dataset.name.indexOf(s)>=0)&&(!fl||(" "+c.dataset.f+" ").indexOf(" "+fl+" ")>=0);c.hidden=!ok;if(ok)n++});
var none=document.getElementById("none");if(none)none.hidden=n>0}
if(q)q.addEventListener("input",apply);
document.querySelectorAll(".chip").forEach(function(b){b.addEventListener("click",function(){fl=b.dataset.f;
document.querySelectorAll(".chip").forEach(function(x){x.setAttribute("aria-pressed",x===b)});apply()})});
// コピー
document.querySelectorAll("[data-copy]").forEach(function(b){b.addEventListener("click",function(){var s=b.querySelector("span");
navigator.clipboard.writeText(b.dataset.copy).then(function(){b.classList.add("done");s.textContent=M.copied;setTimeout(function(){b.classList.remove("done");s.textContent=M.copy},1600)},
function(){s.textContent=M.copyFail})})});
// 設定
document.querySelectorAll("form.set").forEach(function(f){f.addEventListener("submit",function(e){e.preventDefault();
var st=f.querySelector(".st"),btn=f.querySelector("[type=submit]"),lim=f.elements.limit.value.trim(),ap=f.querySelector("[name=approval]:checked").value==="1";
var origins=f.elements.origins.value.split("\\n").map(function(x){return x.trim()}).filter(Boolean);btn.disabled=true;say(st,"",M.saving);
call("/api/settings",{repo:f.dataset.repo,allowedOrigins:origins,dailyLimit:lim?Number(lim):null,approval:ap}).then(function(r){
if(r.ok){f.elements.origins.value=r.allowedOrigins.join("\\n");say(st,"ok",M.saved);
var b=f.closest(".card").querySelector("[data-mode]");if(b){b.textContent=r.approval?M.review:M.instant;b.classList.toggle("ap",r.approval)}}
else say(st,"err",ERR[r.error]||M.saveFail)}).catch(function(){say(st,"err",M.net)}).finally(function(){btn.disabled=false})})});
// 承認待ち
var total=document.querySelector(".stat:nth-child(2) b");
document.querySelectorAll(".item").forEach(function(it){var st=it.querySelector(".st"),bs=it.querySelectorAll("[data-action]");
it.querySelector("[data-more]").addEventListener("click",function(e){var o=it.classList.toggle("open");e.target.textContent=o?M.collapse:M.more});
bs.forEach(function(b){b.addEventListener("click",function(){bs.forEach(function(x){x.disabled=true});say(st,"",M.working);
call("/api/pending",{repo:it.dataset.repo,id:it.dataset.id,action:b.dataset.action}).then(function(r){
if(!r.ok){say(st,"err",ERR[r.error]||M.fail);bs.forEach(function(x){x.disabled=false});return}
st.className="st ok";st.textContent="";if(r.issueUrl){var a=document.createElement("a");a.href=r.issueUrl;a.target="_blank";a.rel="noopener";a.textContent="Issue #"+r.issueNumber+M.created;st.append(a)}else st.textContent=M.discarded;
it.querySelector("[data-more]").remove();bs.forEach(function(x){x.remove()});it.style.opacity=".6";
var card=it.closest(".card"),n=card.querySelector(".n");var c=Math.max(0,Number(n.textContent)-1);n.textContent=c;if(!c)n.classList.remove("hot");
var pb=card.querySelector("[data-pcount]");if(pb){if(c)pb.textContent=M.pending+" "+c;else{pb.remove();card.dataset.f=card.dataset.f.replace("pending","").trim()}}
if(total){var t=Math.max(0,Number(total.textContent)-1);total.textContent=t;if(!t)total.parentNode.classList.remove("hot")}})
.catch(function(){say(st,"err",M.net);bs.forEach(function(x){x.disabled=false})})})})});
})();
</script></body></html>`;
}
