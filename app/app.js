// Leonida Trophy Guide: checklist tracker, filters, spoiler setting, export/import, roadmap.
// Static files only; the trophy data comes from data/trophies.json and data/roadmap.json.
const EARNED_KEY = 'gta6-guide-earned-v1';
const SPOILER_KEY = 'gta6-guide-spoilers-v1';
const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };

const listEl = document.getElementById('trophy-list');
const emptyEl = document.getElementById('empty');
const resultEl = document.getElementById('result-count');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const showEl = document.getElementById('show');
const spoilerEl = document.getElementById('spoilers');
const saveNote = document.getElementById('save-note');

let trophies = [];
let roadmap = [];
let earned = new Set();
let kindFilter = 'all';

function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]');
    if (Array.isArray(raw)) earned = new Set(raw.filter((n) => typeof n === 'string'));
  } catch { earned = new Set(); }
}

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
  saveNote.textContent = `Progress saved in this browser — ${earned.size} of ${trophies.length} earned.`;
}

function spoilerOn() {
  return spoilerEl.checked;
}

function isHidden(t) {
  return spoilerOn() && t.kind === 'story' && t.grade !== 'platinum' && !earned.has(t.name);
}

function matchesFilters(t) {
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter === 'online') return false; // No online trophies in the official list.
  if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (showEl.value === 'todo' && earned.has(t.name)) return false;
  if (showEl.value === 'earned' && !earned.has(t.name)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = [t.name, t.description, t.guide, t.kind, t.grade, t.roadmap, ...(t.steps ?? [])].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  const pct = total ? Math.round((100 * n) / total) : 0;
  document.getElementById('earned-count').textContent = String(n);
  const bar = document.getElementById('progress-bar');
  bar.setAttribute('aria-valuenow', String(n));
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('progress-note').textContent =
    n >= total ? 'Platinum earned — Vice Got a Price! You are a Leonida Legend.'
    : `Platinum: Vice Got a Price! — ${total - n} to go.`;
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? { got: 0, total: 0 };
    byGrade[t.grade].total += 1;
    if (earned.has(t.name)) byGrade[t.grade].got += 1;
  }
  document.getElementById('progress-breakdown').textContent =
    ['platinum', 'gold', 'silver', 'bronze']
      .map((g) => `${GRADE_LABEL[g]} ${byGrade[g]?.got ?? 0}/${byGrade[g]?.total ?? 0}`)
      .join(' · ');
}

function trophyCard(t) {
  const li = document.createElement('li');
  li.className = 'trophy' + (earned.has(t.name) ? ' earned' : '');
  const head = document.createElement('div');
  head.className = 'trophy-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', `Earned: ${t.name}`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    saveEarned();
    render();
  });
  const title = document.createElement('div');
  title.className = 'trophy-title';
  const h3 = document.createElement('h3');
  if (isHidden(t)) {
    h3.textContent = 'Hidden story trophy';
    h3.classList.add('hidden-name');
  } else {
    h3.textContent = t.name;
    if (earned.has(t.name)) {
      const mark = document.createElement('span');
      mark.className = 'earned-mark';
      mark.textContent = ' ✓ earned';
      h3.append(mark);
    }
  }
  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = isHidden(t)
    ? 'Spoilers hidden — tick the box when you earn it to reveal its name and description.'
    : t.description;
  title.append(h3, desc);
  const grade = document.createElement('span');
  grade.className = `grade ${t.grade}`;
  grade.textContent = GRADE_LABEL[t.grade];
  head.append(box, title, grade);
  li.append(head);

  const tags = document.createElement('ul');
  tags.className = 'tags';
  const tagItems = [KIND_LABEL[t.kind], t.roadmap];
  if (t.missable) tagItems.push('Missable');
  for (const tag of tagItems) {
    const tagLi = document.createElement('li');
    if (tag === 'Missable') tagLi.className = 'missable';
    tagLi.textContent = tag === 'Missable' ? '⚠ Missable — save before this moment' : tag;
    tags.append(tagLi);
  }
  li.append(tags);

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Guide & sources';
  details.append(summary);
  const guideP = document.createElement('p');
  guideP.className = 'guide-text';
  guideP.textContent = t.guide;
  details.append(guideP);
  if (Array.isArray(t.steps) && t.steps.length) {
    const steps = document.createElement('ol');
    steps.className = 'steps';
    for (const s of t.steps) {
      const sLi = document.createElement('li');
      sLi.textContent = s;
      steps.append(sLi);
    }
    details.append(steps);
  }
  if (Array.isArray(t.sources) && t.sources.length) {
    const srcTitle = document.createElement('p');
    srcTitle.className = 'sources';
    srcTitle.textContent = 'Sources:';
    const srcList = document.createElement('ul');
    srcList.className = 'sources';
    for (const s of t.sources) {
      const sLi = document.createElement('li');
      sLi.textContent = s;
      srcList.append(sLi);
    }
    details.append(srcTitle, srcList);
  }
  li.append(details);
  return li;
}

function render() {
  renderProgress();
  const visible = trophies.filter(matchesFilters);
  listEl.replaceChildren(...visible.map(trophyCard));
  emptyEl.hidden = visible.length !== 0;
  if (kindFilter === 'online') {
    resultEl.textContent = 'No online trophies: the official PlayStation list of 55 has no online trophy. Filters above cover story, missable, collectibles and activities.';
  } else {
    resultEl.textContent = `Showing ${visible.length} of ${trophies.length} trophies` +
      (kindFilter !== 'all' ? ` — ${KIND_LABEL[kindFilter] ?? 'Missable'}` : '') +
      (searchEl.value.trim() ? ` matching “${searchEl.value.trim()}”` : '') + '.';
  }
}

function renderRoadmap() {
  const ol = document.getElementById('roadmap');
  ol.replaceChildren();
  for (const stage of roadmap) {
    const li = document.createElement('li');
    li.className = 'stage';
    const h3 = document.createElement('h3');
    h3.textContent = `Stage ${stage.stage} — ${stage.title}`;
    const got = stage.trophies.filter((n) => earned.has(n)).length;
    const prog = document.createElement('p');
    prog.className = 'stage-progress';
    prog.textContent = `${got} of ${stage.trophies.length} earned in this stage`;
    const summary = document.createElement('p');
    summary.textContent = stage.summary;
    const tip = document.createElement('p');
    tip.textContent = `Tip: ${stage.tip}`;
    const ul = document.createElement('ul');
    for (const name of stage.trophies) {
      const t = trophies.find((x) => x.name === name);
      const item = document.createElement('li');
      item.textContent = t
        ? `${earned.has(name) ? '✓ ' : ''}${t.name} — ${GRADE_LABEL[t.grade]} · ${t.description}`
        : name;
      ul.append(item);
    }
    li.append(h3, prog, summary, tip, ul);
    ol.append(li);
  }
}

function switchView(name) {
  for (const btn of document.querySelectorAll('.tab')) {
    const active = btn.dataset.view === name;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  }
  for (const view of document.querySelectorAll('.view')) {
    view.hidden = view.id !== `view-${name}`;
  }
  if (name === 'roadmap') renderRoadmap();
}

function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function init() {
  const [trophyDoc, roadmapDoc] = await Promise.all([
    (await fetch('data/trophies.json')).json(),
    (await fetch('data/roadmap.json')).json(),
  ]);
  trophies = trophyDoc.trophies;
  roadmap = roadmapDoc.stages;
  loadEarned();
  try {
    spoilerEl.checked = localStorage.getItem(SPOILER_KEY) === '1';
  } catch { spoilerEl.checked = false; }
  spoilerEl.addEventListener('change', () => {
    try { localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0'); } catch { /* storage unavailable */ }
    render();
  });
  searchEl.addEventListener('input', render);
  gradeEl.addEventListener('change', render);
  showEl.addEventListener('change', render);
  for (const chip of document.querySelectorAll('.chip')) {
    chip.addEventListener('click', () => {
      kindFilter = chip.dataset.kind;
      for (const c of document.querySelectorAll('.chip')) c.classList.toggle('active', c === chip);
      render();
    });
  }
  for (const btn of document.querySelectorAll('.tab')) {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  }
  document.getElementById('export').addEventListener('click', () => {
    download('gta6-trophy-progress.json', JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort(), exportedAt: new Date().toISOString() }, null, 2));
  });
  document.getElementById('import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = JSON.parse(await file.text());
      const names = Array.isArray(doc) ? doc : doc.earned;
      if (!Array.isArray(names)) throw new Error('no earned list');
      const known = new Set(trophies.map((t) => t.name));
      earned = new Set(names.filter((n) => typeof n === 'string' && known.has(n)));
      saveEarned();
      saveNote.textContent = `Imported ${earned.size} earned trophies.`;
      render();
    } catch {
      saveNote.textContent = 'Import failed: that file is not a progress export from this guide.';
    }
    e.target.value = '';
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (window.confirm('Clear all earned ticks? Export first if you want a backup.')) {
      earned = new Set();
      saveEarned();
      render();
    }
  });
  saveEarned();
  render();
}

init();
