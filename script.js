// FlickFinder — decision-tree client for TMDB
//
// NOTE ON THE API TOKEN BELOW:
// This is a client-side static site (GitHub Pages), so there is no server
// to hide a secret behind — anything here is visible in view-source to
// anyone who visits the page. TMDB's read-access token is a read-only,
// rate-limited key with no billing or personal data attached, so this is
// an accepted pattern for small client-side projects. Just don't reuse
// this same token for anything that needs to stay private.
const API_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmODYwZWVlZmZlZTdmY2NjODQ4Y2E0NWQ4MmE3YTlhNCIsIm5iZiI6MTc4MzQ3NTc0NC45NSwic3ViIjoiNmE0ZGFlMjA3ZTAxMjYzMmE5NGNlN2ZiIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.2g5xHBP-Kh5XMWZJFFKnCMQOyYxvmYNNt8jC8F2VPrc";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w342";

// ---- Decision tree state ----
let answers = {};
let step = 0;
const TOTAL_STEPS = 4;

const bodyArea = document.getElementById('bodyArea');
const traceRail = document.getElementById('traceRail');
const statusTag = document.getElementById('statusTag');

function renderTrace(activeCount){
  traceRail.innerHTML = '';
  for(let i=0;i<TOTAL_STEPS;i++){
    const seg = document.createElement('div');
    seg.className = 'trace-seg' + (i < activeCount ? ' lit' : '');
    traceRail.appendChild(seg);
  }
}

function renderQuestion(eyebrow, title, options, onPick, singleCol){
  statusTag.textContent = `node ${step+1} / ${TOTAL_STEPS}`;
  renderTrace(step);
  bodyArea.innerHTML = '';

  const eyeEl = document.createElement('div');
  eyeEl.className = 'eyebrow';
  eyeEl.textContent = eyebrow;
  bodyArea.appendChild(eyeEl);

  const h1 = document.createElement('h1');
  h1.textContent = title;
  bodyArea.appendChild(h1);

  const optsWrap = document.createElement('div');
  optsWrap.className = 'options' + (singleCol ? ' single-col' : '');
  options.forEach(o=>{
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = `<span class="label">${o.label}</span><span class="sub">${o.sub||''}</span>`;
    btn.onclick = () => onPick(o.value);
    optsWrap.appendChild(btn);
  });
  bodyArea.appendChild(optsWrap);

  const status = document.createElement('div');
  status.className = 'status-line';
  status.textContent = step === 0 ? 'select a route to begin' : '';
  bodyArea.appendChild(status);
}

function stepType(){
  renderQuestion(
    'route.select_medium',
    "What's on the menu tonight?",
    [
      {label:'A movie', sub:'~90–180 min, self-contained', value:'movie'},
      {label:'A TV show', sub:'episodic, something to sink into', value:'tv'}
    ],
    (v)=>{ answers.type = v; step=1; stepMood(); }
  );
}

function stepMood(){
  renderQuestion(
    'route.select_mood',
    'What mood are you routing for?',
    [
      {label:'Laughs', sub:'comedy', value:'laughs'},
      {label:'Tension', sub:'thriller / mystery', value:'tension'},
      {label:'The feels', sub:'drama', value:'feels'},
      {label:'Mind-bending', sub:'sci-fi / fantasy', value:'mindbend'},
      {label:'Comfort fun', sub:'action / adventure / animated', value:'comfort'}
    ],
    (v)=>{ answers.mood = v; step=2; stepEra(); }
  );
}

function stepEra(){
  renderQuestion(
    'route.select_era',
    'New signal or proven classic?',
    [
      {label:'Something recent', sub:'last few years', value:'new'},
      {label:'Doesn\u2019t matter — just good', sub:'any era, ranked by quality', value:'any'}
    ],
    (v)=>{ answers.era = v; step=3; stepCommitment(); }
  );
}

function stepCommitment(){
  if(answers.type === 'movie'){
    renderQuestion(
      'route.select_runtime',
      'How much runtime can you commit?',
      [
        {label:'Keep it tight', sub:'under ~110 min', value:'short'},
        {label:'I\u2019ve got the whole evening', sub:'no limit', value:'long'}
      ],
      (v)=>{ answers.commitment = v; step=4; resolve(); }
    );
  } else {
    renderQuestion(
      'route.select_shape',
      'Finished story, or something ongoing?',
      [
        {label:'A show that\u2019s wrapped up', sub:'complete, no cliffhangers', value:'ended'},
        {label:'Currently running', sub:'still airing new seasons', value:'ongoing'}
      ],
      (v)=>{ answers.commitment = v; step=4; resolve(); }
    );
  }
}

// ---- Genre + param mapping ----
const GENRES = {
  movie: { laughs:35, tension:9648, feels:18, mindbend:878, comfort:28 },
  tv:    { laughs:35, tension:9648, feels:18, mindbend:10765, comfort:10759 }
};

function buildDiscoverUrl(){
  const type = answers.type;
  const genre = GENRES[type][answers.mood];
  const params = new URLSearchParams({
    sort_by: 'popularity.desc',
    'vote_count.gte': '150',
    include_adult: 'false',
    page: '1'
  });
  params.set('with_genres', genre);

  const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
  if(answers.era === 'new'){
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 3);
    params.set(`${dateField}.gte`, cutoff.toISOString().slice(0,10));
  }

  if(type === 'movie'){
    if(answers.commitment === 'short'){
      params.set('with_runtime.lte', '110');
    } else {
      params.set('with_runtime.gte', '110');
    }
  } else {
    // 3 = Ended, 0 = Returning Series
    params.set('with_status', answers.commitment === 'ended' ? '3' : '0');
  }

  return `${TMDB_BASE}/discover/${type}?${params.toString()}`;
}

async function resolve(){
  statusTag.textContent = 'node 4 / 4';
  renderTrace(4);
  bodyArea.innerHTML = `
    <div class="loading">
      <span class="spinner"></span>
      <span>querying tmdb.discover(${answers.type})...</span>
    </div>
  `;

  try{
    const url = buildDiscoverUrl();
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'accept': 'application/json' }
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let results = (data.results || []).filter(r => r.poster_path);

    if(results.length === 0){
      renderEmpty();
      return;
    }

    window._resultPool = results;
    window._resultIdx = new Set();
    showResult();
  } catch(err){
    renderError(err.message);
  }
}

function pickUnusedResult(){
  const pool = window._resultPool;
  const used = window._resultIdx;
  if(used.size >= pool.length) used.clear();
  let idx;
  do { idx = Math.floor(Math.random() * pool.length); } while(used.has(idx) && used.size < pool.length);
  used.add(idx);
  return pool[idx];
}

function showResult(){
  const item = pickUnusedResult();
  const title = item.title || item.name;
  const date = item.release_date || item.first_air_date || '';
  const year = date ? date.slice(0,4) : 'TBD';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '—';
  const overview = item.overview || 'No synopsis on file.';

  bodyArea.innerHTML = '';
  const eyeEl = document.createElement('div');
  eyeEl.className = 'eyebrow';
  eyeEl.textContent = 'route.resolved — 200 OK';
  bodyArea.appendChild(eyeEl);

  const result = document.createElement('div');
  result.className = 'result';
  result.innerHTML = `
    <img class="poster" src="${IMG_BASE}${item.poster_path}" alt="${title} poster" />
    <div class="result-meta">
      <h2 class="result-title">${title}</h2>
      <div class="result-tags">${year} · ${answers.type.toUpperCase()} · ★ ${rating}</div>
      <p class="result-overview">${overview}</p>
      <div class="result-actions">
        <button class="btn primary" id="rerollBtn">Reroll match</button>
        <button class="btn" id="restartBtn">Start over</button>
      </div>
    </div>
  `;
  bodyArea.appendChild(result);

  document.getElementById('rerollBtn').onclick = showResult;
  document.getElementById('restartBtn').onclick = () => { answers = {}; step = 0; stepType(); };
}

function renderEmpty(){
  bodyArea.innerHTML = `
    <div class="eyebrow">route.resolved — 204 No Content</div>
    <h1>No match on this exact route.</h1>
    <div class="status-line">Try loosening a filter — recent + tight runtime is a narrow lane.</div>
    <div class="result-actions" style="margin-top:16px;">
      <button class="btn primary" id="restartBtn2">Start over</button>
    </div>
  `;
  document.getElementById('restartBtn2').onclick = () => { answers = {}; step = 0; stepType(); };
}

function renderError(msg){
  bodyArea.innerHTML = `
    <div class="eyebrow">route.error</div>
    <h1>Connection dropped.</h1>
    <div class="status-line err">${msg} — the TMDB request failed.</div>
    <div class="result-actions" style="margin-top:16px;">
      <button class="btn primary" id="retryBtn">Retry</button>
    </div>
  `;
  document.getElementById('retryBtn').onclick = resolve;
}

// boot
stepType();
