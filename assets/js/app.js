/* 환대의 항해 · 2026 따뜻한 소란 평등한 우리
   행사 내용은 data/events.json 에서 수정합니다. */
(async () => {
  let CATS, E;
  try {
    const res = await fetch('data/events.json');
    if (!res.ok) throw new Error(res.status);
    ({ categories: CATS, events: E } = await res.json());
  } catch (err) {
    document.getElementById('grid').textContent =
      '프로그램 정보를 불러오지 못했습니다. 파일을 직접 열었다면 로컬 서버(python3 -m http.server)로 확인해 주세요.';
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

  // 캘린더 (2026년 11월 1일 = 일요일)
  (function(){
    const cal = $('#cal'), start = new Date(2026,10,1).getDay();
    cal.innerHTML = WD.map(w=>`<div class="dow">${w}</div>`).join('');
    for(let i=0;i<start;i++) cal.insertAdjacentHTML('beforeend','<div class="day empty"></div>');
    for(let n=1;n<=30;n++){
      const chips = E.filter(e=>e.dates.includes(n)).map(e=>
        `<button class="chip${e.star?' star':''}" data-go="${e.id}">${esc(e.short)}</button>`).join('');
      cal.insertAdjacentHTML('beforeend',`<div class="day"><span class="n">${n}<span class="w">(${WD[new Date(2026,10,n).getDay()]})</span></span>${chips}</div>`);
    }
    cal.addEventListener('click', ev=>{
      const b = ev.target.closest('[data-go]'); if(!b) return;
      $('#filters [data-f="all"]').click();
      const card = document.getElementById('p-'+b.dataset.go);
      card.scrollIntoView({behavior:'smooth',block:'center'});
      card.classList.add('flash'); setTimeout(()=>card.classList.remove('flash'),1600);
    });
    $('#legend').innerHTML = '<span><i class="lg-open"></i>오픈 포럼 · 클로징 예배</span><span><i class="lg-etc"></i>프로그램</span>';
  })();

  // 프로그램 카드 + 필터 + 상세 모달
  const split = t => { const k = t.indexOf(' – '); return k<0 ? ['',t] : [t.slice(0,k),t.slice(k+3)]; };
  const dayLabel = n => `11/${n}(${WD[new Date(2026,10,n).getDay()]})`;
  const POSTER = 'assets/img/poster.jpeg'; // 행사별 포스터가 나오면 각 항목에 poster:'파일경로'를 추가
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
    const open = id => {
      const e = byId[id], [pre,name] = split(e.title);
      const sess = e.dates.length>1 ? `<h4>커리큘럼</h4><ul class="sess">${e.dates.map((n,i)=>
        `<li><b>${i+1}회</b><span>${dayLabel(n)}</span><em>${e.themes?esc(e.themes[i]):'주제 추후 공개'}</em></li>`).join('')}</ul>` : '';
      dlg.innerHTML = `<div class="m">
        <button class="x" data-close aria-label="닫기">✕</button>
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
          </dl>
          <div class="apply">${safeUrl(e.apply)
            ? `<a class="btn fill" href="${esc(safeUrl(e.apply))}" target="_blank" rel="noopener">신청하기</a>`
            : `<span class="btn off">신청 링크 준비 중</span>`}</div>
        </div></div>`;
      document.body.style.overflow = 'hidden';
      dlg.showModal(); dlg.scrollTop = 0;
    };
    grid.addEventListener('click', ev=>{ const c = ev.target.closest('[data-open]'); if(c) open(c.dataset.open); });
    grid.addEventListener('keydown', ev=>{ if((ev.key==='Enter'||ev.key===' ') && ev.target.matches('[data-open]')){ ev.preventDefault(); open(ev.target.dataset.open); }});
    dlg.addEventListener('click', ev=>{ if(ev.target===dlg || ev.target.closest('[data-close]')) dlg.close(); });
    dlg.addEventListener('close', ()=>{ document.body.style.overflow=''; });
  })();

  // 스탬프
  (function(){
    const KEY='equalweek2026-stamps';
    let got = [];
    try{ got = JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){}
    const box = $('#postcard');
    const sorted = [...E].sort((a,b)=>a.dates[0]-b.dates[0]);
    const draw = ()=>{
      box.innerHTML = sorted.map(e=>`<button class="slot" data-id="${e.id}" aria-pressed="${got.includes(e.id)}">${esc(e.short)}</button>`).join('');
      $('#progress').textContent = `${got.length} / ${E.length} 기항지 도착` + (got.length===E.length?' · 항해 완주를 축하합니다! ⛵':'');
    };
    box.addEventListener('click', ev=>{
      const b = ev.target.closest('.slot'); if(!b) return;
      const id = b.dataset.id;
      got = got.includes(id) ? got.filter(x=>x!==id) : [...got,id];
      try{ localStorage.setItem(KEY, JSON.stringify(got)); }catch(e){}
      draw();
    });
    draw();
  })();

  // 주관 단체
  $('#orgs').innerHTML = '<b>함께하는 단체</b><br>' + [...new Set(E.flatMap(e=>e.host.split(' & ')))].map(esc).join(' · ');
})();
