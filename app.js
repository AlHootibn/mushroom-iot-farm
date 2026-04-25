// Live clock
function updateClock() {
  document.getElementById('current-time').textContent =
    new Date().toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
updateClock();
setInterval(updateClock, 1000);

// Sensor simulation
const sensors = {
  temp:  { el: 'temp-val',  status: 'temp-status',  val: 22.4, min: 18, max: 24,   step: 0.3, unit: '°C' },
  hum:   { el: 'hum-val',   status: 'hum-status',   val: 87,   min: 80, max: 95,   step: 1,   unit: '%' },
  co2:   { el: 'co2-val',   status: 'co2-status',   val: 850,  min: 400, max: 1000, step: 20,  unit: ' ppm' },
  light: { el: 'light-val', status: 'light-status', val: 320,  min: 100, max: 500,  step: 15,  unit: ' lux' },
};

function updateSensors() {
  for (const key in sensors) {
    const s = sensors[key];
    s.val += (Math.random() - 0.5) * s.step * 2;
    s.val = Math.max(s.min * 0.85, Math.min(s.max * 1.15, s.val));

    const el = document.getElementById(s.el);
    const st = document.getElementById(s.status);
    if (!el) continue;

    el.textContent = key === 'temp' ? s.val.toFixed(1) : Math.round(s.val);

    const inRange = s.val >= s.min && s.val <= s.max;
    const nearEdge = s.val < s.min * 0.92 || s.val > s.max * 1.08;

    if (inRange) {
      st.textContent = '● Good';
      st.className = 'card-status good';
    } else if (!nearEdge) {
      st.textContent = '● Warning';
      st.className = 'card-status warning';
    } else {
      st.textContent = '● Alert';
      st.className = 'card-status danger';
    }
  }

  // Health score
  let score = 0;
  const keys = Object.keys(sensors);
  keys.forEach(k => {
    const s = sensors[k];
    if (s.val >= s.min && s.val <= s.max) score += 25;
    else if (s.val >= s.min * 0.92 && s.val <= s.max * 1.08) score += 12;
  });
  document.getElementById('health-value').textContent = score + '%';
  document.getElementById('health-fill').style.width = score + '%';
  document.getElementById('health-fill').style.background =
    score > 80 ? 'linear-gradient(90deg,#4ecdc4,#2ecc71)'
    : score > 50 ? 'linear-gradient(90deg,#f39c12,#e67e22)'
    : 'linear-gradient(90deg,#e74c3c,#c0392b)';
}

setInterval(updateSensors, 2500);

// Refresh button
function refreshData() {
  updateSensors();
  const btn = document.querySelector('.btn-refresh');
  btn.textContent = '✓ Updated';
  setTimeout(() => btn.textContent = '↻ Refresh', 1500);
}

// Controls
function toggleControl(checkbox, name) {
  const labels = { fan:'Ventilation Fan', mist:'Misting System', heat:'Heater', light:'Grow Lights', pump:'Substrate Pump' };
  const state = checkbox.checked ? 'ON' : 'OFF';
  addAlert('info', `${labels[name]} turned ${state}`, `Manual override — ${new Date().toLocaleTimeString()}`, 'Just now');
}

function addAlert(type, title, detail, time) {
  const icons = { warning:'⚠️', info:'ℹ️', success:'✅', danger:'🚨' };
  const list = document.getElementById('alerts-list');
  const item = document.createElement('div');
  item.className = `alert-item ${type}`;
  item.innerHTML = `
    <span class="alert-icon">${icons[type] || 'ℹ️'}</span>
    <div class="alert-body"><strong>${title}</strong><span>${detail}</span></div>
    <span class="alert-time">${time}</span>`;
  list.prepend(item);
  if (list.children.length > 6) list.lastChild.remove();
}

// Chart
const hours = [];
const tempData = [];
const humData = [];
const now = new Date();
for (let i = 23; i >= 0; i--) {
  const h = new Date(now - i * 3600000);
  hours.push(h.getHours() + ':00');
  tempData.push(+(20 + Math.random() * 4).toFixed(1));
  humData.push(+(82 + Math.random() * 10).toFixed(0));
}

const ctx = document.getElementById('sensorChart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: hours,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: tempData,
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231,76,60,0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
        yAxisID: 'y1',
      },
      {
        label: 'Humidity (%)',
        data: humData,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52,152,219,0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
        yAxisID: 'y2',
      }
    ]
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#8892b0', boxWidth: 12 } },
    },
    scales: {
      x: {
        ticks: { color: '#8892b0', maxTicksLimit: 8 },
        grid:  { color: '#2e3250' },
      },
      y1: {
        position: 'left',
        ticks: { color: '#e74c3c' },
        grid:  { color: '#2e3250' },
        title: { display: true, text: '°C', color: '#e74c3c' },
      },
      y2: {
        position: 'right',
        ticks: { color: '#3498db' },
        grid:  { drawOnChartArea: false },
        title: { display: true, text: '%', color: '#3498db' },
      }
    }
  }
});
