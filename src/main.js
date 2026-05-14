const fmt = new Intl.NumberFormat('en-US');
const pctFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const platformMeta = {
  tiktok: { label: 'TikTok', color: '#ffffff' },
  instagram: { label: 'Instagram', color: '#f472b6' },
  youtube: { label: 'YouTube', color: '#ef4444' },
  linkedin: { label: 'LinkedIn', color: '#60a5fa' },
  facebook: { label: 'Facebook', color: '#7170ff' },
};
const ranges = {
  1: { label: 'last day', title: 'Last day', short: '24h' },
  7: { label: 'last 7 days', title: 'Last 7 days', short: '7d' },
  28: { label: 'last 28 days', title: 'Last 28 days', short: '28d' },
  all: { label: 'all time', title: 'All time', short: 'ALL' },
};
const get = id => document.getElementById(id);
const signed = n => `${n >= 0 ? '+' : ''}${fmt.format(n)}`;
const pct = n => `${n >= 0 ? '+' : ''}${pctFmt.format(n)}%`;
let state = { history: [], latest: null, range: '1', selectedPlatform: null, totalChart: null, platformChart: null };

async function loadData() {
  const [history, latest] = await Promise.all([
    fetch('data/history.json').then(r => r.json()),
    fetch('data/latest.json').then(r => r.json()),
  ]);
  return { history, latest };
}

function windowForRange(history, range) {
  const sorted = history.slice().sort((a, b) => a.date.localeCompare(b.date));
  const endIndex = sorted.length - 1;
  const requestedDays = range === 'all' ? endIndex : Number(range);
  const startIndex = range === 'all' ? 0 : Math.max(0, endIndex - requestedDays);
  const points = sorted.slice(startIndex, endIndex + 1);
  const start = points[0];
  const end = points[points.length - 1];
  const actualDays = Math.max(1, endIndex - startIndex);
  return { points, start, end, actualDays, requestedDays, isAllTime: range === 'all' };
}

function computeRangeMetrics(history, platforms, range) {
  const window = windowForRange(history, range);
  const platformDeltas = {};
  const platformPercents = {};
  platforms.forEach(p => {
    const startValue = window.start[p] || 0;
    const endValue = window.end[p] || 0;
    const delta = endValue - startValue;
    platformDeltas[p] = delta;
    platformPercents[p] = startValue ? (delta / startValue) * 100 : 0;
  });
  const totalDelta = window.end.total - window.start.total;
  const totalPercent = window.start.total ? (totalDelta / window.start.total) * 100 : 0;
  const fastest = platforms.slice().sort((a, b) => platformDeltas[b] - platformDeltas[a])[0];
  return { ...window, platformDeltas, platformPercents, totalDelta, totalPercent, fastest };
}

function rangeCopy(metrics) {
  const requested = ranges[state.range];
  if (metrics.isAllTime) {
    return `All-time view — showing ${metrics.actualDays} available days of tracked history (${metrics.start.date} → ${metrics.end.date}).`;
  }
  if (metrics.actualDays < metrics.requestedDays) {
    return `${requested.title} view — showing ${metrics.actualDays} available days of tracked history (${metrics.start.date} → ${metrics.end.date}).`;
  }
  return `${requested.title} view (${metrics.start.date} → ${metrics.end.date}).`;
}

function buildCards(latest, metrics) {
  const wrap = get('platformCards');
  wrap.innerHTML = latest.platforms.map(p => {
    const meta = platformMeta[p];
    const value = latest.latest[p] || metrics.end[p] || 0;
    const delta = metrics.platformDeltas[p] || 0;
    const percent = metrics.platformPercents[p] || 0;
    const avg = Math.round(delta / metrics.actualDays);
    const positiveClass = delta >= 0 ? 'positive' : 'negative';
    const selectedClass = state.selectedPlatform === p ? 'is-selected' : '';
    return `<button class="platform-card ${selectedClass}" type="button" data-platform="${p}" style="--platform-color:${meta.color};">
      <div class="card-topline"><h3>${meta.label}</h3><span>${ranges[state.range].short}</span></div>
      <div class="value">${fmt.format(value)}</div>
      <div class="delta ${positiveClass}">${signed(delta)} in the ${ranges[state.range].label}</div>
      <div class="meta">${pct(percent)} • ${signed(avg)}/day average</div>
      <div class="card-action">${state.selectedPlatform === p ? 'Showing in graph' : 'Click to graph this channel'}</div>
    </button>`;
  }).join('');

  wrap.querySelectorAll('.platform-card').forEach(card => {
    card.addEventListener('click', () => {
      const platform = card.dataset.platform;
      state.selectedPlatform = state.selectedPlatform === platform ? null : platform;
      render();
      get('platformChart').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

function buildInsights(latest, metrics) {
  const fastest = metrics.fastest;
  const days = metrics.actualDays;
  const totalAvg = Math.round(metrics.totalDelta / days);
  const sortedPlatforms = latest.platforms.slice().sort((a, b) => metrics.platformDeltas[b] - metrics.platformDeltas[a]);
  const second = sortedPlatforms[1];
  const selected = state.selectedPlatform;
  const selectedCopy = selected
    ? `<div class="insight"><strong>${platformMeta[selected].label} selected below</strong><span>The lower chart is focused on ${platformMeta[selected].label}. Click the tile again or “All platforms” to reset.</span></div>`
    : `<div class="insight"><strong>Click any platform tile</strong><span>The lower chart will focus on that individual channel while keeping this same date range.</span></div>`;
  get('insightsList').innerHTML = `
    <div class="insight"><strong>${platformMeta[fastest].label} is leading this range</strong><span>${signed(metrics.platformDeltas[fastest])} followers/subscribers in the ${ranges[state.range].label}.</span></div>
    <div class="insight"><strong>${signed(metrics.totalDelta)} total audience growth</strong><span>${pct(metrics.totalPercent)} total growth across ${days} available day${days === 1 ? '' : 's'}.</span></div>
    <div class="insight"><strong>${fmt.format(Math.abs(totalAvg))} average daily net growth</strong><span>${second ? `${platformMeta[second].label} is second with ${signed(metrics.platformDeltas[second])}.` : 'More platforms will appear as data grows.'}</span></div>
    ${selectedCopy}
  `;
}

function chartDefaults() {
  Chart.defaults.color = '#8a8f98';
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 450, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.04)' } },
      y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { callback: v => fmt.format(v) } },
    },
  };
}

function platformDatasets(metrics, platforms) {
  const chartPlatforms = state.selectedPlatform ? [state.selectedPlatform] : platforms;
  const showPoints = metrics.points.length <= 8;
  return chartPlatforms.map(p => ({
    label: platformMeta[p].label,
    data: metrics.points.map(d => d[p]),
    borderColor: platformMeta[p].color,
    backgroundColor: state.selectedPlatform ? `${platformMeta[p].color}22` : 'transparent',
    fill: Boolean(state.selectedPlatform),
    tension: .35,
    pointRadius: showPoints ? 3 : 0,
    pointHoverRadius: 4,
    borderWidth: state.selectedPlatform ? 3 : 2,
  }));
}

function makeCharts(metrics, platforms) {
  const labels = metrics.points.map(d => d.date.slice(5));
  state.totalChart = new Chart(get('totalChart'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Total audience', data: metrics.points.map(d => d.total), borderColor: '#7170ff', backgroundColor: 'rgba(113,112,255,.15)', fill: true, tension: .38, pointRadius: metrics.points.length <= 8 ? 3 : 0, pointHoverRadius: 4, borderWidth: 2 }] },
    options: { ...chartOptions(), plugins: { ...chartOptions().plugins, legend: { display: false } } },
  });
  state.platformChart = new Chart(get('platformChart'), {
    type: 'line',
    data: { labels, datasets: platformDatasets(metrics, platforms) },
    options: chartOptions(),
  });
}

function updateCharts(metrics, platforms) {
  const labels = metrics.points.map(d => d.date.slice(5));
  const showPoints = metrics.points.length <= 8;
  state.totalChart.data.labels = labels;
  state.totalChart.data.datasets[0].data = metrics.points.map(d => d.total);
  state.totalChart.data.datasets[0].pointRadius = showPoints ? 3 : 0;
  state.totalChart.update();

  state.platformChart.data.labels = labels;
  state.platformChart.data.datasets = platformDatasets(metrics, platforms);
  state.platformChart.update();
}

function render() {
  const metrics = computeRangeMetrics(state.history, state.latest.platforms, state.range);
  const fastestLabel = platformMeta[metrics.fastest].label;
  const selected = state.selectedPlatform;
  get('totalAudience').textContent = fmt.format(state.latest.latest.total);
  get('selectedDelta').textContent = signed(metrics.totalDelta);
  get('selectedDelta').className = metrics.totalDelta >= 0 ? 'positive' : 'negative';
  get('selectedDeltaLabel').textContent = `${ranges[state.range].title} growth`;
  get('selectedAverage').textContent = signed(Math.round(metrics.totalDelta / metrics.actualDays));
  get('fastestPlatform').textContent = fastestLabel;
  get('latestDate').textContent = `Latest: ${state.latest.latestDate}`;
  get('rangeNote').textContent = rangeCopy(metrics);
  get('totalChartSubtitle').textContent = rangeCopy(metrics);
  get('platformChartTitle').textContent = selected ? `${platformMeta[selected].label} audience trend` : 'Individual account trends';
  get('platformChartSubtitle').textContent = selected
    ? `${platformMeta[selected].label} only, shown for the ${ranges[state.range].label}. Click the selected tile again or “All platforms” to return to the multi-channel view.`
    : `Each line redraws to the ${ranges[state.range].label}. Click any platform tile above to focus this chart on one channel.`;
  get('showAllPlatforms').classList.toggle('is-active', !selected);
  get('generatedAt').textContent = `Updated ${new Date(state.latest.generatedAt).toLocaleString()}`;
  buildCards(state.latest, metrics);
  buildInsights(state.latest, metrics);
  if (!state.totalChart || !state.platformChart) makeCharts(metrics, state.latest.platforms);
  else updateCharts(metrics, state.latest.platforms);
}

function bindRangeControls() {
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.range = btn.dataset.range;
      document.querySelectorAll('.range-btn').forEach(other => {
        other.classList.toggle('is-active', other === btn);
        other.setAttribute('aria-pressed', String(other === btn));
      });
      render();
    });
    btn.setAttribute('aria-pressed', String(btn.classList.contains('is-active')));
  });
}

function bindPlatformReset() {
  get('showAllPlatforms').addEventListener('click', () => {
    state.selectedPlatform = null;
    render();
  });
}

loadData().then(({ history, latest }) => {
  state.history = history;
  state.latest = latest;
  chartDefaults();
  bindRangeControls();
  bindPlatformReset();
  render();
});
