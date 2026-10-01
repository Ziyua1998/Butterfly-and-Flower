(() => {
const D=window.GAME_DATA, N=D.nodes, STAT_KEYS=["LOVE","TRUST","SELF","AMB","MOMI","REB","RISK"];
const PREFIX="butterfly-flower:v2", OLD="butterfly-flower:v1";
const K={auto:`${PREFIX}:autosave`,slot:n=>`${PREFIX}:slot${n}`,oldAuto:`${OLD}:autosave`,oldSlot:n=>`${OLD}:slot${n}`};
let state=null, modal=null, debug=false, toast=null, chapterTransition=false;
const clamp=n=>Math.max(0,Math.min(100,n));
function fresh(){let now=Date.now();return{version:2,currentNode:"N01",stats:{...D.initialStats},flags:{},choiceHistory:[],visitedNodes:["N01"],startedAt:now,updatedAt:now}}
function normalize(raw){
 if(!raw||typeof raw!=="object")return null; const s=raw.state||raw;
 if(!N[s.currentNode]) return null;
 const out=fresh(); out.currentNode=s.currentNode;
 for(const k of STAT_KEYS){const v=s.stats?.[k];if(Number.isFinite(v))out.stats[k]=clamp(v)}
 out.flags=(s.flags&&typeof s.flags==="object")?s.flags:{};
 out.choiceHistory=Array.isArray(s.choiceHistory)?s.choiceHistory:[];
 out.visitedNodes=Array.isArray(s.visitedNodes)?s.visitedNodes:[s.currentNode];
 out.startedAt=Number.isFinite(s.startedAt)?s.startedAt:Date.now();
 out.updatedAt=Number.isFinite(s.updatedAt)?s.updatedAt:Date.now(); return out;
}
function readKey(k){try{const x=localStorage.getItem(k);if(!x)return null;const p=JSON.parse(x);const s=normalize(p);return s?{state:s,savedAt:Number.isFinite(p.savedAt)?p.savedAt:s.updatedAt}:null}catch{return null}}
function writeKey(k,s){try{localStorage.setItem(k,JSON.stringify({state:s,savedAt:Date.now()}));return true}catch{return false}}
function autosave(){if(state)writeKey(K.auto,state)}
function migrate(){if(readKey(K.auto))return;const a=readKey(K.oldAuto);if(a)writeKey(K.auto,a.state);for(let i=1;i<=3;i++){if(!readKey(K.slot(i))){const x=readKey(K.oldSlot(i));if(x)writeKey(K.slot(i),x.state)}}}
function hasAuto(){return !!readKey(K.auto)}
function available(){const node=N[state.currentNode];return (node?.choices||[]).filter(c=>(c.requireFlags||[]).every(f=>state.flags[f]))}
function choose(id){const node=N[state.currentNode], c=node.choices.find(x=>x.id===id);if(!c)return;
 const stats={...state.stats};for(const k of STAT_KEYS)stats[k]=clamp(stats[k]+(c.delta?.[k]||0));
 const flags={...state.flags,...(c.setFlags||{})};const next=c.nextNode;
 state={...state,stats,flags,currentNode:next,visitedNodes:state.visitedNodes.includes(next)?state.visitedNodes:[...state.visitedNodes,next],
 choiceHistory:[...state.choiceHistory,{nodeId:node.id,nodeTitle:node.title,choiceId:c.id,choiceLabel:c.label,at:Date.now()}],updatedAt:Date.now()};
 if(node.id==="N16"&&next==="N17") chapterTransition=true; autosave();render();
}
function ending(){
 const s=state.stats,f=state.flags;
 const rules=[
 ["E01",()=>s.LOVE>=65&&s.TRUST>=60&&s.SELF>=55&&s.AMB<=70&&s.REB>=35&&f.F_REUNION&&f.F_LOVE_CONFESSED],
 ["E02",()=>s.TRUST>=60&&s.SELF>=60&&s.MOMI>=50&&s.REB>=60&&s.AMB<=65&&f.F_MOMI_ALLY&&f.F_REUNION&&s.RISK<90],
 ["E05",()=>s.LOVE>=65&&s.AMB>=75&&s.SELF<50],
 ["E07",()=>s.RISK>=85&&s.TRUST<45&&f.F_BLACKSHIP&&!f.F_REUNION],
 ["E08",()=>s.LOVE>=40&&s.TRUST>=40&&s.AMB>=35&&s.AMB<=80&&f.F_BLACKSHIP&&f.F_CANON_CHOICE],
 ["E03",()=>s.SELF>=75&&s.REB>=55&&f.F_FREE_CONTRACT],
 ["E04",()=>s.MOMI>=65&&s.TRUST>=45&&s.AMB>=35&&s.AMB<=75&&f.F_MOMI_ALLY],
 ["E06",()=>s.TRUST<35&&s.LOVE<45],
 ["E09",()=>true]];
 const hit=rules.find(x=>x[1]())[0];return D.endings.find(e=>e.id===hit);
}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function fmt(ts){return new Date(ts).toLocaleString("zh-CN",{hour12:false})}
function nodeNum(id){const m=/^N(\d+)$/.exec(id);return m?m[1].padStart(2,"0"):"33"}
function title(){
 return `<div class="screen paper"><section class="title-card"><div class="title-art"></div><div class="title-copy paper"><div class="title-seal">蝶花</div><div class="title-kana">ちょう　と　はな</div><h1 class="title">蝶与花</h1><p class="subtitle">幕末幻想 · 双主角视觉小说</p><div class="title-actions"><button class="btn" data-act="new">始　开始游戏</button>${hasAuto()?'<button class="btn" data-act="continue">续　继续游戏</button>':""}<button class="btn" data-act="load-title">录　存档读取</button></div><p class="title-note">第一部 · 小粽 / 暗绯<br>第二部 · 阿麦 / 月蓝<br>角色立绘与正式背景尚未置入，本版仅验证美术语言与交互。</p></div></section></div>`;
}
function play(){
 if(state.currentNode==="END")return endingPage();
 const n=N[state.currentNode],choices=available(),p=protagonist(n.id),[part,chapter]=chapterLabel(n.id),blue=nodeIndex(n.id)>=17;
 return `<div class="game-shell"><section class="stage ${blue?"theme-blue":""}"><div class="scene-space"><header class="topbar"><div class="act">${esc(part)} · ${esc(chapter)}</div><div class="protagonist">玩家主控 <b>${p}</b></div><div class="progress">${nodeNum(n.id)} / 33</div></header><div class="chapter-mark"><strong>${esc(chapter)}</strong>${esc(part)}</div><h1 class="node-title">${esc(n.title)}</h1><div class="node-meta">${esc(n.id)} · 原作锚点：${esc(n.anchor)}</div><div class="visual-space"><div class="portrait-placeholder" aria-label="角色立绘预留区"></div></div><section class="dialogue"><div class="speaker">${p}</div><p class="scene">${esc(n.scene)}</p><div class="placeholder">正式场景叙述与人物对白将在脚本阶段加入。</div><div class="choices">${choices.map(c=>`<button class="choice" data-choice="${esc(c.id)}">${esc(c.label)}</button>`).join("")}</div></section></div>${toolbar()}</section></div>`;
}
function toolbar(){return `<nav class="side-menu"><div class="brand">蝶与花<small>ちょうとはな</small></div><button class="btn tool" data-act="save">SAVE<span>存档</span></button><button class="btn tool" data-act="load">LOAD<span>读档</span></button><button class="btn tool" data-act="log">LOG<span>履历</span></button><button class="btn tool" data-act="debug">DEBUG<span>调试</span></button><button class="btn tool" data-act="title">TITLE<span>标题</span></button></nav>`}
function transitionHTML(){if(!chapterTransition)return"";return `<div class="transition"><section class="half red"><div><p>第一部</p><h2>吉原尘泥录</h2><p>—— 终 ——</p></div></section><section class="half blue"><div><p>第二部</p><h2>大奥通真录</h2><p>—— 始 ——</p></div></section><button class="switch-btn" data-act="transition-close">主控切换 · 阿麦</button></div>`}
function endingPage(){
 const e=ending(),flags=Object.keys(state.flags).filter(k=>state.flags[k]);
 return `<div class="ending"><div class="ending-content"><div class="ending-type">${esc(e.id)} · ${esc(e.type)}</div><h1>${esc(e.name)}</h1><p class="ending-core">${esc(e.core)}</p><div class="ending-section"><h3>最终数值</h3><div class="statgrid">${STAT_KEYS.map(k=>`<div class="stat mono">${k}<br><b>${state.stats[k]}</b></div>`).join("")}</div></div><div class="ending-section"><h3>关键 Flags</h3>${flags.length?flags.map(f=>`<span class="flag">${esc(f)}</span>`).join(""):'<span class="small">无</span>'}</div><div class="ending-section"><h3>选择历史</h3>${state.choiceHistory.map((x,i)=>`<div class="logitem"><span class="small">${String(i+1).padStart(2,"0")} · ${esc(x.nodeId)} ${esc(x.nodeTitle)}</span><br>${esc(x.choiceLabel)}</div>`).join("")}</div><div class="toolbar" style="justify-content:flex-start;margin-top:28px"><button class="btn" data-act="new">重新开始</button><button class="btn secondary" data-act="title">返回标题</button></div></div></div>`;
}
function modalHTML(){
 if(!modal&&!debug)return "";
 if(debug){
  const flags=Object.keys(state?.flags||{}).filter(k=>state.flags[k]);
  return `<div class="overlay" data-act="close"><div class="modal" onclick="event.stopPropagation()"><button class="btn close" data-act="close">关闭</button><h2>DEBUG</h2><div class="small mono">Node: ${esc(state.currentNode)} · Ending match: ${esc(state.currentNode==="END"?ending().id:"尚未结算")}</div><div class="statgrid" style="margin-top:14px">${STAT_KEYS.map(k=>`<div class="stat mono">${k}: <b>${state.stats[k]}</b></div>`).join("")}</div><h3>Flags</h3>${flags.length?flags.map(f=>`<span class="flag">${esc(f)}</span>`).join(""):'<div class="small">无</div>'}<h3>Visited Nodes</h3><div class="small mono">${esc(state.visitedNodes.join(" → "))}</div><h3>Choice History</h3>${state.choiceHistory.map(x=>`<div class="logitem small">${esc(x.nodeId)} · ${esc(x.choiceLabel)}</div>`).join("")||'<div class="small">无</div>'}</div></div>`;
 }
 if(modal==="log")return `<div class="overlay" data-act="close"><div class="modal" onclick="event.stopPropagation()"><button class="btn close" data-act="close">关闭</button><h2>LOG · 选择记录</h2>${state.choiceHistory.map((x,i)=>`<div class="logitem"><span class="small">${String(i+1).padStart(2,"0")} · ${esc(x.nodeId)} ${esc(x.nodeTitle)}</span><br>${esc(x.choiceLabel)}</div>`).join("")||'<div class="small">尚无选择记录</div>'}</div></div>`;
 if(modal==="save"||modal==="load"){
  let slots="";for(let i=1;i<=3;i++){const r=readKey(K.slot(i)),n=r?N[r.state.currentNode]:null;slots+=`<div class="slot"><div><b>SAVE ${i}</b>${r?`<div>${esc(r.state.currentNode)} · ${esc(n?.title||"未知节点")}</div><div class="small">${esc(n?.act||"")} · ${fmt(r.savedAt)}</div><div class="small mono">LOVE ${r.state.stats.LOVE} · TRUST ${r.state.stats.TRUST} · SELF ${r.state.stats.SELF} · AMB ${r.state.stats.AMB} · RISK ${r.state.stats.RISK}</div>`:'<div class="small">— 空存档位 —</div>'}</div><div>${modal==="save"?`<button class="btn" data-slot-save="${i}">${r?"覆盖":"保存"}</button>`:`<button class="btn" ${r?"":'disabled'} data-slot-load="${i}">读取</button>`}${r?` <button class="btn secondary" data-slot-del="${i}">删除</button>`:""}</div></div>`}
  return `<div class="overlay" data-act="close"><div class="modal" onclick="event.stopPropagation()"><button class="btn close" data-act="close">关闭</button><h2>${modal==="save"?"保存":"读取"}</h2>${slots}</div></div>`;
 }
 return "";
}
function render(){document.getElementById("app").innerHTML=(state?play():title())+modalHTML()+transitionHTML()+(toast?`<div class="notice">${esc(toast)}</div>`:"");bind()}
function notify(t){toast=t;render();setTimeout(()=>{toast=null;render()},1400)}
function bind(){
 document.querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>choose(b.dataset.choice));
 document.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{
  const a=b.dataset.act;
  if(a==="new"){state=fresh();autosave();modal=null;debug=false;chapterTransition=false;render()}
  if(a==="continue"){const r=readKey(K.auto);if(r){state=r.state;chapterTransition=false;render()}} if(a==="load-title"){state=fresh();modal="load";render()}
  if(a==="save"&&state){modal="save";render()} if(a==="load"&&state){modal="load";render()}
  if(a==="log"&&state){modal="log";render()} if(a==="debug"&&state){debug=true;render()}
  if(a==="close"){modal=null;debug=false;render()} if(a==="title"){state=null;modal=null;debug=false;chapterTransition=false;render()} if(a==="transition-close"){chapterTransition=false;render()}
 });
 document.querySelectorAll("[data-slot-save]").forEach(b=>b.onclick=()=>{writeKey(K.slot(+b.dataset.slotSave),state);modal=null;notify(`已保存到 SAVE ${b.dataset.slotSave}`)});
 document.querySelectorAll("[data-slot-load]").forEach(b=>b.onclick=()=>{const r=readKey(K.slot(+b.dataset.slotLoad));if(r){state=r.state;autosave();modal=null;chapterTransition=false;notify(`已读取 SAVE ${b.dataset.slotLoad}`)}});
 document.querySelectorAll("[data-slot-del]").forEach(b=>b.onclick=()=>{localStorage.removeItem(K.slot(+b.dataset.slotDel));render()});
}
migrate();render();
})();