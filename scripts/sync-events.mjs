#!/usr/bin/env node
/*
 * 구글 시트("환대의 항해 2026 · 행사 데이터")를 읽어 2026/data/events.json을 갱신합니다.
 *
 * 전제: 시트 공유 설정이 "링크가 있는 모든 사용자 - 뷰어"여야 인증 없이 CSV로 읽을 수 있습니다.
 *
 * 실행: node scripts/sync-events.mjs
 * 환경변수로 시트를 바꿀 수 있습니다: SHEET_ID, SHEET_GID
 */

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SHEET_ID = process.env.SHEET_ID || '1MY70kkAtM-NsOSL_bnnW7enDIPbCR30NDTEvu-pZkiw';
const SHEET_GID = process.env.SHEET_GID || '270105526';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const OUT_PATH = path.join(ROOT, '2026', 'data', 'events.json');

// 시트의 "분류" 라벨 → 사이트 내부 카테고리 키/색상
const CATEGORIES = {
  '강연·강좌': { key: 'learn', label: '강연·강좌', color: '#2a78d6' },
  '영화·책': { key: 'culture', label: '영화·책', color: '#eb6834' },
  '기도·예배': { key: 'pray', label: '기도·예배', color: '#1baf7a' },
  '만들기·모임': { key: 'make', label: '만들기·모임', color: '#eda100' },
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // skip, \n이 줄바꿈을 처리
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

const nonEmpty = v => (v ?? '').trim() !== '' ? v.trim() : undefined;

function rowToEvent(cols, idx) {
  const get = name => cols[idx[name]] ?? '';

  const catLabel = get('분류').trim();
  const cat = CATEGORIES[catLabel];
  if (!cat) {
    throw new Error(`알 수 없는 분류입니다: "${catLabel}" (id: ${get('id')}). 시트의 분류 값 또는 스크립트의 CATEGORIES 매핑을 확인하세요.`);
  }

  const dates = get('날짜').split(';').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
  const themesRaw = nonEmpty(get('커리큘럼주제'));
  const themes = themesRaw ? themesRaw.split('|').map(s => s.trim()).filter(Boolean) : undefined;
  const poster = nonEmpty(get('포스터'));
  const star = get('강조').trim() === 'O' ? 1 : undefined;

  const event = {
    id: get('id').trim(),
    cat: cat.key,
    title: get('제목').trim(),
    sub: nonEmpty(get('부제')),
    line: get('한줄소개').trim(),
    short: get('캘린더표기').trim(),
    dates,
    time: get('시간').trim(),
    desc: get('행사소개').trim(),
    speaker: nonEmpty(get('강사')),
    themes,
    place: get('장소').trim(),
    addr: nonEmpty(get('주소')),
    host: get('주관').trim(),
    fee: nonEmpty(get('참가비')),
    apply: nonEmpty(get('신청링크')) || '',
    poster: poster ? `assets/img/${poster}` : undefined,
    contact: nonEmpty(get('문의')),
    star,
  };

  // undefined 필드는 JSON에 쓰지 않음 (apply는 항상 포함: 기존 데이터 관례)
  for (const k of Object.keys(event)) {
    if (event[k] === undefined && k !== 'apply') delete event[k];
  }
  return event;
}

async function main() {
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    throw new Error(
      `시트를 읽지 못했습니다 (HTTP ${res.status}). 시트 공유 설정이 "링크가 있는 모든 사용자 - 뷰어"인지 확인하세요.\nURL: ${CSV_URL}`
    );
  }
  const csv = await res.text();
  const rows = parseCsv(csv);
  const [header, ...dataRows] = rows;
  const idx = Object.fromEntries(header.map((name, i) => [name.trim(), i]));

  const required = ['id', '분류', '제목', '한줄소개', '캘린더표기', '날짜', '시간', '행사소개', '장소', '주관'];
  for (const col of required) {
    if (!(col in idx)) throw new Error(`시트에 "${col}" 열이 없습니다. 헤더 행을 확인하세요.`);
  }

  const events = dataRows
    .filter(r => nonEmpty(r[idx['id']]))
    .map(r => rowToEvent(r, idx));

  const categories = Object.fromEntries(
    Object.values(CATEGORIES).map(c => [c.key, { label: c.label, color: c.color }])
  );

  const output = { categories, events };
  const json = JSON.stringify(output, null, 1) + '\n';

  let prev = '';
  try { prev = await readFile(OUT_PATH, 'utf8'); } catch {}

  if (prev === json) {
    console.log('변경 없음 — events.json이 이미 최신 상태입니다.');
    return;
  }

  await writeFile(OUT_PATH, json, 'utf8');
  console.log(`업데이트 완료: ${path.relative(ROOT, OUT_PATH)} (행사 ${events.length}개)`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
