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
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--fg)}
body{font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;padding:20px 16px 28px;-webkit-font-smoothing:antialiased}
.wrap{max-width:520px;margin:0 auto}
header{margin-bottom:18px}
h1{font-size:19px;line-height:1.35;margin:0 0 4px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13px;margin:0;display:flex;align-items:center;gap:6px}
.sub svg{flex-shrink:0}
.kinds{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:0 0 18px;padding:0;border:0}
.kind{position:relative}
.kind input{position:absolute;opacity:0;inset:0;cursor:pointer}
.kind span{display:block;height:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:var(--r);background:var(--card);transition:border-color .15s,background .15s,box-shadow .15s}
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
export function formPage(o: { projectKey: string; repo: string; siteKey: string; forms: FormTemplate[]; meta: Record<string, string>; nonce: string }) {
  const cfg = JSON.stringify({ key: o.projectKey, repo: o.repo, forms: o.forms, meta: o.meta }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>Feedback</title><style>${STYLE}</style>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer nonce="${o.nonce}"></script></head><body>
<div class="wrap">
<header><h1 id="h"></h1><p class="sub">${GH_ICON}<span id="repo"></span></p></header>
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
var C=${cfg},t0=Date.now(),L=(navigator.language||"").slice(0,2)==="ja"?"ja":"en";
document.documentElement.lang=L;
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
document.querySelectorAll("[data-t]").forEach(function(e){e.textContent=t(e.dataset.t)});
$("h").textContent=t("h");$("repo").textContent=C.repo;
var f=$("f"),msg=$("msg"),box=$("fields"),title=$("title"),cur;
C.forms.forEach(function(tp,i){var w=el("label",{className:"kind"}),r=el("input",{type:"radio",name:"kind",value:tp.kind,checked:i===0}),s=el("span");
s.append(el("b",{textContent:lt(tp.label)}));if(tp.description)s.append(el("small",{textContent:lt(tp.description)}));
w.append(r,s);$("kinds").append(w);r.addEventListener("change",function(){render(tp)})});
if(C.forms.length<2)$("kinds").hidden=true;
function render(tp){cur=tp;box.textContent="";title.placeholder=lt(tp.titlePlaceholder);
tp.fields.forEach(function(fd){var w=el("div",{className:"f"}),id="f_"+fd.id,inp;
if(fd.type==="checkbox"){inp=el("input",{type:"checkbox",id:id,name:fd.id});var lb=el("label",{className:"check",htmlFor:id});lb.append(inp,document.createTextNode(lt(fd.label)));w.append(lb)}
else{var lb2=el("label",{htmlFor:id});lb2.append(el("span",{textContent:lt(fd.label)}));if(fd.required)lb2.append(el("span",{className:"req",textContent:"*",ariaHidden:"true"}));w.append(lb2);
if(fd.help)w.append(el("p",{className:"help",textContent:lt(fd.help)}));
if(fd.type==="select"){inp=el("select",{id:id,name:fd.id});inp.append(el("option",{value:"",textContent:"—"}));fd.options.forEach(function(op){inp.append(el("option",{value:op.value,textContent:lt(op.label)}))})}
else{var max=fd.maxLength||(fd.type==="textarea"?5000:200);inp=el(fd.type==="textarea"?"textarea":"input",{id:id,name:fd.id,maxLength:max,placeholder:lt(fd.placeholder)});if(fd.type==="text")inp.type="text"}
inp.required=!!fd.required;w.append(inp);
if(fd.type==="textarea"){var c=el("div",{className:"count",textContent:"0 / "+max});inp.addEventListener("input",function(){c.textContent=inp.value.length+" / "+max});w.append(c)}}
inp.addEventListener("input",function(){inp.removeAttribute("aria-invalid")});box.append(w)})}
render(C.forms[0]);
function say(k,err){msg.textContent=k?t(k):"";msg.className=err?"err":""}
function post(type,data){var m=Object.assign({type:type},data||{});try{if(parent!==window)parent.postMessage(m,"*")}catch(e){}
if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(m))}
document.addEventListener("keydown",function(e){if(e.key==="Escape")post("posissue:close")});
var meta=Object.assign({userAgent:navigator.userAgent.slice(0,200),language:navigator.language||""},C.meta);
$("again").addEventListener("click",function(){$("done").hidden=true;f.hidden=false;f.reset();render(C.forms[0]);t0=Date.now();window.turnstile&&turnstile.reset();title.focus()});
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
