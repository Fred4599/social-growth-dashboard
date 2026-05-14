const fmt = new Intl.NumberFormat('en-US');
const platformMeta = {
  tiktok: { label: 'TikTok', color: '#ffffff' },
  instagram: { label: 'Instagram', color: '#f472b6' },
  youtube: { label: 'YouTube', color: '#ef4444' },
  linkedin: { label: 'LinkedIn', color: '#60a5fa' },
  facebook: { label: 'Facebook', color: '#7170ff' },
};
const money = n => `${n >= 0 ? '+' : ''}${fmt.format(n)}`;
const get = id => document.getElementById(id);

async function loadData() {
  const [history, latest] = await Promise.all([
    fetch('data/history.json').then(r => r.json()),
    fetch('data/latest.json').then(r => r.json()),
  ]);
  return { history, latest };
}

function buildCards(latest) {
  const wrap = get('platformCards');
  wrap.innerHTML = latest.platforms.map(p => {
    const meta = platformMeta[p];
    const value = latest.latest[p] || 0;
    const d7 = latest.deltas.sevenDay[p] || 0;
    const all = latest.deltas.allTime[p] || 0;
    return `<a class="platform-card" href="${latest.accounts[p]}" target="_blank" rel="noreferrer" style="--platform-color:${meta.color}; text-decoration:none; color:inherit;">
      <h3>${meta.label}</h3>
      <div class="value">${fmt.format(value)}</div>
      <div class="delta">${money(d7)} last 7 days</div>
      <div class="meta">${money(all)} since tracking began</div>
    </a>`;
  }).join('');
}

function buildInsights(latest) {
  const seven = latest.deltas.sevenDay;
  const all = latest.deltas.allTime;
  const fastest7 = latest.platforms.slice().sort((a,b) => seven[b] - seven[a])[0];
  const fastestAll = latest.platforms.slice().sort((a,b) => all[b] - all[a])[0];
  const days = Math.max(1, Math.round((new Date(latest.latestDate) - new Date(all.from)) / 86400000));
  const avg = Math.round(all.total / days);
  get('insightsList').innerHTML = `
    <div class="insight"><strong>${platformMeta[fastest7].label} is leading the week</strong><span>${money(seven[fastest7])} followers/subscribers in the last 7 days.</span></div>
    <div class="insight"><strong>${platformMeta[fastestAll].label} is leading all-time growth</strong><span>${money(all[fastestAll])} since tracking started on ${all.from}.</span></div>
    <div class="insight"><strong>${fmt.format(avg)} average daily growth</strong><span>${money(all.total)} total audience growth over ${days} days of tracked data.</span></div>
  `;
}

function chartDefaults() {
  Chart.defaults.color = '#8a8f98';
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
}
function makeTotalChart(history) {
  new Chart(get('totalChart'), {
    type: 'line',
    data: { labels: history.map(d => d.date.slice(5)), datasets: [{ label: 'Total audience', data: history.map(d => d.total), borderColor: '#7170ff', backgroundColor: 'rgba(113,112,255,.15)', fill: true, tension: .38, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 }] },
    options: { responsive:true, plugins:{ legend:{ display:false }, tooltip:{ mode:'index', intersect:false } }, scales:{ x:{ grid:{ color:'rgba(255,255,255,.04)' } }, y:{ grid:{ color:'rgba(255,255,255,.05)' }, ticks:{ callback:v => fmt.format(v) } } } }
  });
}
function makePlatformChart(history, platforms) {
  new Chart(get('platformChart'), {
    type: 'line',
    data: { labels: history.map(d => d.date.slice(5)), datasets: platforms.map(p => ({ label: platformMeta[p].label, data: history.map(d => d[p]), borderColor: platformMeta[p].color, tension:.35, pointRadius:0, pointHoverRadius:4, borderWidth:2 })) },
    options: { responsive:true, plugins:{ tooltip:{ mode:'index', intersect:false } }, scales:{ x:{ grid:{ color:'rgba(255,255,255,.04)' } }, y:{ grid:{ color:'rgba(255,255,255,.05)' }, ticks:{ callback:v => fmt.format(v) } } } }
  });
}

loadData().then(({ history, latest }) => {
  get('totalAudience').textContent = fmt.format(latest.latest.total);
  get('oneDayDelta').textContent = money(latest.deltas.oneDay.total);
  get('sevenDayDelta').textContent = money(latest.deltas.sevenDay.total);
  get('allTimeDelta').textContent = money(latest.deltas.allTime.total);
  get('latestDate').textContent = `Latest: ${latest.latestDate}`;
  get('generatedAt').textContent = `Updated ${new Date(latest.generatedAt).toLocaleString()}`;
  buildCards(latest);
  buildInsights(latest);
  chartDefaults();
  makeTotalChart(history);
  makePlatformChart(history, latest.platforms);
});
