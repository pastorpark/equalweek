/* 환대의 항해 · 2026 따뜻한 소란 평등한 우리
   행사 내용은 data/events.json 에서 수정합니다. */
(async () => {
  let CATS, E;
  try {
    const res = await fetch('data/events.json');
    if (!res.ok) throw new Error(res.status);
    ({ categories: CATS, events: E } = await res.json());
  } catch (err) {
    document.getElementById('loaderr').hidden = false;
    return;
  }

  /* ===== 렌더링 ===== */
  const $ = s => document.querySelector(s);
  const WD = ['일','월','화','수','목','금','토'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const dateLabel = e => {
    const d = e.dates, f = n => `11/${n}(${WD[new Date(2026,10,n).getDay()]})`;
    return d.length === 1 ? f(d[0]) : `${f(d[0])} – ${f(d[d.length-1])}`;
  };
  const safeUrl = u => /^https?:\/\//i.test(u) ? u : '';
  const mapUrl = e => `https://map.naver.com/p/search/${encodeURIComponent(e.addr || e.place)}`;

  let openDetail = () => {}; // 아래 프로그램 블록에서 연결

  // 캘린더 (2026년 11월 1일 = 일요일)
  (function(){
    const cal = $('#cal'), start = new Date(2026,10,1).getDay();
    cal.innerHTML = WD.map(w=>`<div class="dow">${w}</div>`).join('');
    for(let i=0;i<start;i++) cal.insertAdjacentHTML('beforeend','<div class="day empty"></div>');
    for(let n=1;n<=28;n++){
      const chips = E.filter(e=>e.dates.includes(n)).map(e=>
        `<button class="chip${e.star?' star':''}" data-cat="${e.cat}" data-go="${e.id}">${esc(e.short)}</button>`).join('');
      cal.insertAdjacentHTML('beforeend',`<div class="day"><span class="n">${n}<span class="w">(${WD[new Date(2026,10,n).getDay()]})</span></span>${chips}</div>`);
    }
    cal.addEventListener('click', ev=>{
      const b = ev.target.closest('[data-go]'); if(!b) return;
      openDetail(b.dataset.go);
    });
    $('#legend').innerHTML = Object.entries(CATS).map(([k,c])=>
      `<span><i class="lg-dot" data-cat="${k}"></i>${esc(c.label)}</span>`).join('') +
      '<span><i class="lg-dot lg-star"></i>오픈 포럼 · 클로징 예배</span>';
  })();

  // 프로그램 카드 + 필터 + 상세 모달
  const split = t => { const k = t.indexOf(' – '); return k<0 ? ['',t] : [t.slice(0,k),t.slice(k+3)]; };
  const dayLabel = n => `11/${n}(${WD[new Date(2026,10,n).getDay()]})`;
  const POSTER = 'assets/img/poster-title.png'; // 행사별 포스터가 나오면 각 항목에 poster:'파일경로'를 추가
  const poster = e => `<div class="poster"><img src="${esc(e.poster||POSTER)}" alt="${e.poster?esc(e.title)+' ':''}포스터" loading="lazy"></div>`;

  (function(){
    const grid = $('#grid');
    const byId = Object.fromEntries(E.map(e=>[e.id,e]));
    const sorted = [...E].sort((a,b)=>a.dates[0]-b.dates[0]);
    grid.innerHTML = sorted.map(e=>{
      const [pre,name] = split(e.title);
      return `<article class="card" id="p-${e.id}" data-cat="${e.cat}" data-open="${e.id}" tabindex="0" role="button" aria-label="${esc(e.title)} 상세 보기">
        ${poster(e)}
        <div class="info">
          <span class="eyebrow-s">${esc(pre||CATS[e.cat].label)}</span>
          <h3>${esc(name)}</h3>
          <p class="line">${esc(e.line)}</p>
          <div class="when"><b>${dateLabel(e)}</b>${esc(e.time)}</div>
          <span class="more">상세 보기 →</span>
        </div>
      </article>`;}).join('');

    const f = $('#filters');
    f.innerHTML = `<button data-f="all" aria-pressed="true">전체 ${E.length}</button>` +
      Object.entries(CATS).map(([k,c])=>`<button data-f="${k}" aria-pressed="false">${c.label}</button>`).join('');
    f.addEventListener('click', ev=>{
      const b = ev.target.closest('button'); if(!b) return;
      f.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed', x===b));
      grid.querySelectorAll('.card').forEach(c=>c.hidden = b.dataset.f!=='all' && c.dataset.cat!==b.dataset.f);
    });

    // 모달
    const dlg = $('#modal');
    const open = openDetail = id => {
      const e = byId[id], [pre,name] = split(e.title);
      const sess = e.dates.length>1 ? `<h4>커리큘럼</h4><ul class="sess">${e.dates.map((n,i)=>
        `<li><b>${i+1}회</b><span>${dayLabel(n)}</span><em>${e.themes?esc(e.themes[i]):'주제 추후 공개'}</em></li>`).join('')}</ul>` : '';
      dlg.innerHTML = `<button class="x" data-close aria-label="닫기">✕</button>
      <div class="m">
        <div class="side">${poster(e)}</div>
        <div>
          <span class="eyebrow-s">${esc(pre||CATS[e.cat].label)}</span>
          <h2>${esc(name)}</h2>
          ${e.sub?`<p class="sub">${esc(e.sub)}</p>`:''}
          <h4>행사 소개</h4><p>${esc(e.desc)}</p>
          ${sess}
          ${e.speaker?`<h4>강사</h4><p>${esc(e.speaker)}</p>`:''}
          <h4>정보</h4>
          <dl>
            <dt>일시</dt><dd>${dateLabel(e)} · ${esc(e.time)}</dd>
            <dt>장소</dt><dd>${e.addr?`<a href="${mapUrl(e)}" target="_blank" rel="noopener">${esc(e.place)}</a><br><small>${esc(e.addr)}</small>`:esc(e.place)}</dd>
            ${e.fee?`<dt>참가비</dt><dd>${esc(e.fee.replace('참가비 ',''))}</dd>`:''}
            <dt>주관</dt><dd>${esc(e.host)}</dd>
            ${e.contact?`<dt>문의</dt><dd>${esc(e.contact)}</dd>`:''}
          </dl>
          <div class="apply">${safeUrl(e.apply)
            ? `<a class="btn fill" href="${esc(safeUrl(e.apply))}" target="_blank" rel="noopener">신청하기</a>`
            : `<span class="btn off">신청 링크 준비 중</span>`}</div>
        </div></div>`;
      dlg.showModal(); dlg.scrollTop = 0;
    };
    grid.addEventListener('click', ev=>{ const c = ev.target.closest('[data-open]'); if(c) open(c.dataset.open); });
    grid.addEventListener('keydown', ev=>{ if((ev.key==='Enter'||ev.key===' ') && ev.target.matches('[data-open]')){ ev.preventDefault(); open(ev.target.dataset.open); }});
    dlg.addEventListener('click', ev=>{ if(ev.target===dlg || ev.target.closest('[data-close]')) dlg.close(); });
  })();

  // 스탬프: 누를 때마다 없음 → 참가 예정 → 참가 → 없음
  (function(){
    const KEY='equalweek2026-stamps';
    const RANKS=[[7,'베테랑 항해자'],[5,'항해자'],[3,'출항자']];
    const LABEL={plan:'참가 예정',done:'참가'};
    let got = {};
    try{
      const v = JSON.parse(localStorage.getItem(KEY));
      // 예전 형식(참가한 id 배열)은 '참가'로 옮긴다
      if(Array.isArray(v)) v.forEach(id=>got[id]='done');
      else if(v && typeof v==='object') got = v;
    }catch(e){}
    const box = $('#postcard');
    const sorted = [...E].sort((a,b)=>a.dates[0]-b.dates[0]);
    const draw = ()=>{
      box.innerHTML = sorted.map(e=>{
        const st = got[e.id] || '';
        return `<button class="slot" data-id="${esc(e.id)}" data-state="${st}" aria-label="${esc(e.short)} ${LABEL[st]||'미참가'}"><span>${esc(e.short)}</span>${st?`<em>${LABEL[st]}</em>`:''}</button>`;
      }).join('');
      const n = E.filter(e=>got[e.id]==='done').length;
      const planned = E.filter(e=>got[e.id]==='plan').length;
      const r = RANKS.find(x=>n>=x[0]);
      const next = [...RANKS].reverse().find(x=>n<x[0]);
      $('#rank').innerHTML = r ? `<small>현재 등급</small><b>${r[1]}</b>` : `<small>현재 등급</small><b class="none">아직 출항 전</b>`;
      $('#progress').textContent = `참가 ${n}곳 · 참가 예정 ${planned}곳` + (next ? ` · ${next[1]}까지 ${next[0]-n}곳 남음` : ' · 최고 등급에 도달했습니다! ⛵');
    };
    box.addEventListener('click', ev=>{
      const b = ev.target.closest('.slot'); if(!b) return;
      const id = b.dataset.id, cur = got[id];
      if(!cur) got[id]='plan'; else if(cur==='plan') got[id]='done'; else delete got[id];
      try{ localStorage.setItem(KEY, JSON.stringify(got)); }catch(e){}
      draw();
    });
    draw();
  })();

  // 메뉴 패널 (떠다니는 섬 → 모달)
  (function(){
    const open = key => {
      const d = document.getElementById('d-'+key); if(!d) return;
      if(!d.open){ d.showModal(); d.scrollTop = 0; }
      history.replaceState(null,'','#'+key);
    };
    document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.panel)));
    document.querySelectorAll('dialog.panel').forEach(d=>{
      d.addEventListener('click', ev=>{ if(ev.target===d || ev.target.closest('[data-close]')) d.close(); });
      d.addEventListener('close', ()=>{ if(!d.id || d.id==='modal') return; history.replaceState(null,'',location.pathname+location.search); });
    });
    const h = location.hash.slice(1);
    if(h) open(h);
  })();

  // 섬 메뉴: 접속할 때마다 위치를 조금씩 바꾼다 (세로 화면은 가로 전체에 흩어 배치)
  (function(){
    const nav = $('.isles'), isles = [...document.querySelectorAll('.isle')];
    if(!nav || !isles.length) return;
    const r = (a,b)=>a+Math.random()*(b-a);
    const set = (el,x,y)=>{ el.style.setProperty('--jx',x.toFixed(1)+'px'); el.style.setProperty('--jy',y.toFixed(1)+'px'); };
    const scatter = ()=>{
      if(matchMedia('(orientation:landscape)').matches){
        const v = Math.min(innerWidth,innerHeight)/100;
        isles.forEach(el=>set(el, r(-4,4)*v, r(-4,4)*v));
        return;
      }
      const half = nav.clientWidth/2, s = isles[0].offsetWidth;
      const free = Math.max(0,(half-s)/2-10);                 // 각 칸 안에서 움직일 수 있는 폭
      const gap = parseFloat(getComputedStyle(nav).rowGap)||40;
      const sp = Math.min(gap*.35,20);                         // 위아래로 어긋나는 정도
      isles.forEach((el,i)=>{
        const left = i%2===0;                                  // 바깥쪽으로는 끝까지, 안쪽으로는 60%까지만
        const x = left ? r(-free,.6*free) : r(-.6*free,free);
        const y = left ? r(0,sp) : r(sp*1.2,sp*2);
        set(el,x,y);
      });
    };
    scatter();
    matchMedia('(orientation:landscape)').addEventListener('change',scatter);
  })();

  // 주관 단체
  $('#orgs').innerHTML = '<b>함께하는 단체</b><br>' + [...new Set(E.flatMap(e=>e.host.split(' & ')))].map(esc).join(' · ');
})();
