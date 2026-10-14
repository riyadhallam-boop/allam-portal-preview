import{h,j as b,u as p,b as g,v as y,g as $}from"./index-CrTuc4pM.js";const x={"no-webgl2":"جهازك لا يدعم العرض ثلاثي الأبعاد، فهذه صورة الشجرة؛ والعائلة كلها في المشجرة وفي الشجرة نصًّا.",weak:"عرضنا لك صورة الشجرة بدل المشهد الحي حتى لا يثقل على جهازك؛ والعائلة كلها في المشجرة وفي الشجرة نصًّا.",choice:"اخترتَ «العرض الخفيف»: صورة الشجرة بدل المشهد الحي؛ والعائلة كلها في المشجرة وفي الشجرة نصًّا."},w=(t,r)=>`<a class="branch-chip" href="${h.garden({branch:t.number,family:null,person:null})}" data-branch="${t.number}"${r?' aria-current="true"':""}>${b(p(t.number,t.name))}</a>`;function L(t,r){const e=t.branch===null?null:r.find(i=>i.number===t.branch)??null,s=e?` (${e.name})`:t.branch!==null?` (${g(t.branch)})`:"";return{chart:h.chart(t),text:h.text(t),chartLabel:`المشجرة${s}`,textLabel:`الشجرة نصًّا${s}`,line:e?`${e.name}: ${y(e.count)}`:""}}async function q(t){const r=t.assets.still(innerWidth>=innerHeight?"landscape":"portrait");t.outlet.innerHTML=`<div class="garden garden-lite" id="garden" data-state="overview">
  <div class="stage" data-state="overview">
    <img class="lite-still" src="${b(r)}" alt="" />
    <div class="overlay"><div class="top-veil" aria-hidden="true"></div><div class="far-title"><h1 class="far-name" tabindex="-1">آل علام</h1></div></div>
    <section class="lite-panel" aria-label="الشجرة بلا مشهد حي">
      <p class="lite-note" id="lite-note">${b(x[t.why])}</p>
      <nav class="lite-branches" id="lite-branches" aria-labelledby="lite-branches-label" hidden>
        <p id="lite-branches-label" class="branches-label">فروع السدرة</p>
        <div class="branch-rail" id="lite-rail"></div>
      </nav>
      <p class="lite-at" id="lite-at" role="status" aria-live="polite"></p>
      <div class="lite-links">
        <a class="btn btn-primary btn-block" id="lite-chart"></a>
        <a class="btn btn-block" id="lite-text"></a>
        <a class="btn btn-quiet btn-block" href="${b(t.replayHref)}">إعادة مشاهدة الافتتاح</a>
        ${t.why==="no-webgl2"?"":'<button type="button" class="btn btn-quiet btn-block" id="lite-off">اعرض المشهد الحي</button>'}
      </div>
    </section>
  </div>
</div>`;const e=a=>t.outlet.querySelector(`#${a}`),s=e("lite-branches"),i=e("lite-rail"),m=e("lite-at"),u=e("lite-chart"),v=e("lite-text");let c=[],o=t.place;const d=()=>{const a=L(o,c);u.href=a.chart,u.textContent=a.chartLabel,v.href=a.text,v.textContent=a.textLabel,m.textContent=a.line;for(const l of i.querySelectorAll(".branch-chip"))Number(l.dataset.branch)===o.branch?l.setAttribute("aria-current","true"):l.removeAttribute("aria-current")};return d(),t.outlet.querySelector("#lite-off")?.addEventListener("click",t.onLive,{signal:t.signal}),await t.outlet.querySelector(".lite-still")?.decode().catch(()=>{}),(t.data??$).overview(t.signal).then(a=>{if(t.signal.aborted||(c=a.branches.filter(n=>n.count>0).map(n=>({number:n.number,name:n.name,count:n.count})),!c.length))return;i.innerHTML=c.map(n=>w(n,n.number===o.branch)).join(""),s.hidden=!1,d();const l=i.querySelector("[aria-current]");if(l){const n=l.getBoundingClientRect(),f=i.getBoundingClientRect();i.scrollBy({left:n.left+n.width/2-(f.left+f.width/2),behavior:"instant"})}},()=>{}),{update(a){o=a,d()}}}export{x as LITE_NOTE,w as liteChip,L as liteTargets,q as mountLite};
