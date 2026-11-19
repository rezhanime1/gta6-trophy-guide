// Vice Trophy Guide: checklist + roadmap + per-trophy guides for the 55 GTA VI
// trophies. Progress lives in localStorage; export/import moves it between browsers.
const STORAGE_KEY = 'vice-trophy-guide-earned';
const SPOILER_KEY = 'vice-trophy-guide-spoilers';
const params = new URLSearchParams(location.search);

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
let selectedId = Number(params.get('trophy')) || null;
let stageFilter = params.get('stage') || 'all';

const el = (id) => document.getElementById(id);
const searchInput = el('search');
const gradeSelect = el('grade');
const statusSelect = el('status');
const missableOnly = el('missableOnly');
const spoilerToggle = el('spoiler');

gradeSelect.value = params.get('grade') || 'all';
statusSelect.value = params.get('status') || 'all';
if (params.get('spoiler') === 'off') spoilerToggle.checked = false;
else if (localStorage.getItem(SPOILER_KEY) === 'off') spoilerToggle.checked = false;

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

function isSpoiler(trophy) {
  return trophy.stage === 'story' || trophy.missable;
}

function guideVisible(trophy) {
  return !spoilerToggle.checked || !isSpoiler(trophy);
}

function filteredTrophies() {
  const q = searchInput.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (stageFilter !== 'all' && t.stage !== stageFilter) return false;
    if (gradeSelect.value !== 'all' && t.grade !== gradeSelect.value) return false;
    if (statusSelect.value === 'earned' && !earned.has(t.id)) return false;
    if (statusSelect.value === 'remaining' && earned.has(t.id)) return false;
    if (missableOnly.checked && !t.missable) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  });
}

function gradeBadge(trophy) {
  const span = document.createElement('span');
  span.className = 'badge grade-' + trophy.grade;
  span.textContent = trophy.grade;
  return span;
}

function renderProgress() {
  el('progress').textContent = `${earned.size} of ${trophies.length} earned`;
  el('percent').textContent = Math.round((earned.size / trophies.length) * 100) + '%';
  el('barfill').style.width = (earned.size / trophies.length) * 100 + '%';
  const counts = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => {
      const total = trophies.filter((t) => t.grade === g).length;
      const done = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
      return `${done}/${total} ${g}`;
    })
    .join(' · ');
  el('gradeCounts').textContent = counts;
}

function renderRoadmap() {
  const box = el('roadmap');
  box.replaceChildren();
  for (const stage of doc.stages) {
    const mine = trophies.filter((t) => t.stage === stage.id);
    const done = mine.filter((t) => earned.has(t.id)).length;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'stage' + (stageFilter === stage.id ? ' active' : '');
    card.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = stage.title;
    const blurb = document.createElement('span');
    blurb.textContent = stage.blurb;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${done}/${mine.length} earned`;
    card.append(title, blurb, count);
    card.addEventListener('click', () => {
      stageFilter = stageFilter === stage.id ? 'all' : stage.id;
      syncUrl();
      renderAll();
    });
    box.append(card);
  }
}

function renderList() {
  const list = el('list');
  const shown = filteredTrophies();
  list.replaceChildren();
  el('shownCount').textContent = `(${shown.length} shown)`;
  if (shown.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No trophies match these filters.';
    list.append(empty);
    return;
  }
  for (const t of shown) {
    const card = document.createElement('article');
    card.className = 'trophy' + (selectedId === t.id ? ' selected' : '') + (earned.has(t.id) ? ' earned' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveProgress();
      renderAll();
    });
    const body = document.createElement('div');
    body.className = 'trophy-body';
    const name = document.createElement('h3');
    name.textContent = t.name;
    const desc = document.createElement('p');
    desc.className = 'official';
    desc.textContent = t.description;
    body.append(name, desc);
    if (t.missable) {
      const flag = document.createElement('span');
      flag.className = 'flag';
      flag.textContent = '⚠ Choice — ' + (t.missableNote || 'tied to a story choice');
      body.append(flag);
    }
    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    meta.append(gradeBadge(t));
    const stageName = document.createElement('span');
    stageName.textContent = doc.stages.find((s) => s.id === t.stage).title;
    meta.append(stageName);
    body.append(meta);
    card.append(box, body);
    card.addEventListener('click', (e) => {
      if (e.target === box) return;
      selectedId = t.id;
      syncUrl();
      renderAll();
    });
    list.append(card);
  }
}

function renderDetail() {
  const panel = el('detail');
  panel.replaceChildren();
  const t = selectedId ? byId.get(selectedId) : null;
  if (!t) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Pick a trophy to see its full guide, its source and whether it is tied to a story choice.';
    panel.append(p);
    return;
  }
  const head = document.createElement('div');
  head.className = 'detail-head';
  head.append(gradeBadge(t));
  const name = document.createElement('h2');
  name.textContent = t.name;
  head.append(name);
  panel.append(head);

  const earnedLabel = document.createElement('p');
  earnedLabel.className = 'detail-status';
  earnedLabel.textContent = earned.has(t.id) ? '✓ Earned — ticked in your checklist.' : 'Not earned yet.';
  panel.append(earnedLabel);

  const officialTitle = document.createElement('h3');
  officialTitle.textContent = 'Official description';
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = '“' + t.description + '”';
  panel.append(officialTitle, official);

  const guideTitle = document.createElement('h3');
  guideTitle.textContent = 'How to get it';
  panel.append(guideTitle);
  if (guideVisible(t)) {
    const guide = document.createElement('p');
    guide.textContent = t.guide;
    panel.append(guide);
  } else {
    const hidden = document.createElement('button');
    hidden.type = 'button';
    hidden.className = 'spoiler-cover';
    hidden.textContent = 'Story spoiler — tap to reveal the guide';
    hidden.addEventListener('click', () => {
      hidden.replaceWith(Object.assign(document.createElement('p'), { textContent: t.guide }));
    });
    panel.append(hidden);
  }

  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'flag';
    warn.textContent = '⚠ ' + (t.missableNote || 'Tied to a story choice.');
    panel.append(warn);
  }

  const sourceTitle = document.createElement('h3');
  sourceTitle.textContent = 'Source';
  const source = document.createElement('p');
  source.className = 'source';
  const link = document.createElement('a');
  link.href = 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/';
  link.textContent = t.source;
  source.append(link);
  panel.append(sourceTitle, source);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mark';
  toggle.textContent = earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => {
    if (earned.has(t.id)) earned.delete(t.id);
    else earned.add(t.id);
    saveProgress();
    renderAll();
  });
  panel.append(toggle);
}

function syncUrl() {
  const next = new URLSearchParams();
  if (selectedId) next.set('trophy', String(selectedId));
  if (gradeSelect.value !== 'all') next.set('grade', gradeSelect.value);
  if (statusSelect.value !== 'all') next.set('status', statusSelect.value);
  if (stageFilter !== 'all') next.set('stage', stageFilter);
  if (!spoilerToggle.checked) next.set('spoiler', 'off');
  history.replaceState(null, '', next.toString() ? '?' + next.toString() : location.pathname);
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderList();
  renderDetail();
}

el('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify([...earned])], { type: 'application/json' }));
  a.download = 'vice-trophy-progress.json';
  a.click();
});
el('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const ids = JSON.parse(await file.text());
    earned = new Set(ids.filter((id) => byId.has(id)));
  } catch {
    earned = new Set();
  }
  saveProgress();
  renderAll();
});
searchInput.addEventListener('input', renderAll);
gradeSelect.addEventListener('change', () => { syncUrl(); renderAll(); });
statusSelect.addEventListener('change', () => { syncUrl(); renderAll(); });
missableOnly.addEventListener('change', renderAll);
spoilerToggle.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerToggle.checked ? 'on' : 'off');
  syncUrl();
  renderAll();
});

renderAll();
