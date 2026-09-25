// Ortak arayüz yardımcıları: ikonlar, biçimlendirme, modal, form üretici, bildirim, grafikler.

const P = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/>',
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  trendDown: '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7h8M8 11h6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  percent: '<path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v13H5a2 2 0 0 1-2-2V5"/><path d="M16 13.5h.01"/>',
  coins: '<circle cx="8" cy="8" r="5"/><path d="M18.1 10.4A5 5 0 1 1 10.4 18"/><path d="M7 6h1.5v4"/>',
  news: '<path d="M4 4h13v16H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v10a2 2 0 0 1-2 2"/><path d="M8 8h5M8 12h5M8 16h3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  bitcoin: '<path d="M9 5h5a3 3 0 0 1 0 6H9zM9 11h6a3 3 0 0 1 0 6H9zM9 5v12M11 3v2M11 17v2M14 3v2M14 17v2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};
export function icon(name, cls = '') {
  return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.info}</svg>`;
}
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-i]').forEach((el) => { if (!el.firstChild) el.innerHTML = icon(el.dataset.i); });
}

// ---------- Biçimlendirme ----------
const tl0 = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
const tl2 = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
export const money = (v, dec = false) => (dec ? tl2 : tl0).format(Number(v) || 0);
export const num = (v, d = 2) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: d }).format(Number(v) || 0);
export function compact(v) {
  const n = Number(v) || 0, a = Math.abs(n);
  if (a >= 1e9) return nf.format(+(n / 1e9).toFixed(2)) + ' Mr ₺';
  if (a >= 1e6) return nf.format(+(n / 1e6).toFixed(2)) + ' Mn ₺';
  if (a >= 1e4) return nf.format(+(n / 1e3).toFixed(1)) + ' B ₺';
  return money(n);
}
export const pct = (v, d = 1) => (v >= 0 ? '' : '−') + new Intl.NumberFormat('tr-TR', { maximumFractionDigits: d }).format(Math.abs(v * 100)) + '%';
export function date(d, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!d) return '—';
  const x = typeof d === 'string' ? (/^\d{4}-\d{2}(-\d{2})?$/.test(d) ? new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +(d.slice(8, 10) || 1)) : new Date(d)) : d;
  return isNaN(x) ? '—' : x.toLocaleDateString('tr-TR', opts);
}
export const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => isoDate(new Date());
export const ym = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function trend(v) {
  if (!isFinite(v) || v === 0) return '<span class="badge">0%</span>';
  return `<span class="badge ${v > 0 ? 'up' : 'down'}">${pct(Math.abs(v))} ${icon(v > 0 ? 'up' : 'down')}</span>`;
}

// ---------- Bildirim ----------
export function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---------- Modal ----------
export function modal({ title, body, foot = '', wide = false, onMount }) {
  const root = document.getElementById('modalRoot');
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close aria-label="Kapat">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  bg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  root.appendChild(bg);
  onMount?.(bg, close);
  return { el: bg, close };
}
export function confirmBox(text, okLabel = 'Sil') {
  return new Promise((res) => {
    const m = modal({
      title: 'Emin misiniz?', body: `<p style="margin:0">${text}</p>`,
      foot: `<button class="btn" data-close>Vazgeç</button><button class="btn btn-danger" data-ok>${okLabel}</button>`,
    });
    m.el.querySelector('[data-ok]').onclick = () => { m.close(); res(true); };
    m.el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => res(false)));
  });
}

// Form üretici: fields = [{k,label,type,options,req,full,hint,step,placeholder,show:(v)=>bool}]
export function formModal({ title, fields, values = {}, onSave, onDelete, wide = false, extra = '' }) {
  const fieldHtml = (f) => {
    const v = values[f.k] ?? f.default ?? '';
    const id = 'f_' + f.k;
    const cls = f.full || f.type === 'textarea' ? 'field full' : 'field';
    if (f.type === 'section') return `<div class="full" style="margin:6px 0 10px;font-weight:600;color:var(--accent)">${f.label}</div>`;
    if (f.type === 'checkbox') return `<label class="check ${f.full ? 'full' : ''}" data-f="${f.k}"><input type="checkbox" id="${id}" ${v ? 'checked' : ''}> ${f.label}</label>`;
    let input;
    if (f.type === 'select') {
      input = `<select id="${id}">${f.options.map((o) => {
        const [ov, ol] = Array.isArray(o) ? o : [o, o];
        return `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`;
      }).join('')}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea id="${id}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
    } else {
      input = `<input id="${id}" type="${f.type || 'text'}" value="${esc(v)}" ${f.step ? `step="${f.step}"` : f.type === 'number' ? 'step="any"' : ''} placeholder="${esc(f.placeholder || '')}" ${f.req ? 'required' : ''} ${f.type === 'number' ? 'inputmode="decimal"' : ''}>`;
    }
    return `<div class="${cls}" data-f="${f.k}"><label for="${id}">${f.label}${f.req ? ' *' : ''}</label>${input}${f.hint ? `<span class="hint">${f.hint}</span>` : ''}</div>`;
  };
  const m = modal({
    title, wide,
    body: `<form class="form-grid" novalidate>${fields.map(fieldHtml).join('')}</form>${extra}`,
    foot: `${onDelete ? `<button class="btn btn-danger" data-del>${icon('trash')} Sil</button>` : ''}<span class="spacer"></span><button class="btn" data-close>Vazgeç</button><button class="btn btn-primary" data-save>Kaydet</button>`,
  });
  const read = () => {
    const out = {};
    for (const f of fields) {
      if (f.type === 'section') continue;
      const el = m.el.querySelector('#f_' + f.k);
      if (!el) continue;
      if (f.type === 'checkbox') out[f.k] = el.checked;
      else if (f.type === 'number') out[f.k] = el.value === '' ? '' : Number(String(el.value).replace(',', '.'));
      else out[f.k] = el.value.trim();
    }
    return out;
  };
  const applyShow = () => {
    const cur = read();
    fields.forEach((f) => { if (f.show) { const w = m.el.querySelector(`[data-f="${f.k}"]`); if (w) w.hidden = !f.show(cur); } });
  };
  m.el.querySelector('form').addEventListener('input', applyShow);
  m.el.querySelector('form').addEventListener('change', applyShow);
  applyShow();
  m.el.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); m.el.querySelector('[data-save]').click(); });
  m.el.querySelector('[data-save]').onclick = async () => {
    const out = read();
    const missing = fields.find((f) => f.req && (out[f.k] === '' || out[f.k] == null) && !(f.show && !f.show(out)));
    if (missing) { toast(`"${missing.label}" zorunlu`, true); m.el.querySelector('#f_' + missing.k)?.focus(); return; }
    if ((await onSave(out, m)) !== false) m.close();
  };
  if (onDelete) m.el.querySelector('[data-del]').onclick = async () => { if (await confirmBox('Bu kayıt kalıcı olarak silinecek.')) { await onDelete(); m.close(); } };
  setTimeout(() => m.el.querySelector('input,select,textarea')?.focus(), 50);
  return m;
}

// ---------- Grafikler (bağımlılıksız SVG) ----------
const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
function smoothPath(pts) {
  if (!pts.length) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

// series: [{name,color,values,area}], labels: [], opts: {height, bars:true}
export function lineChart(el, { labels, series, height = 260, bars = true, fmt = compact, tipTitle }) {
  const W = 800, H = height, pl = 8, pr = 8, pt = 16, pb = 26;
  const all = series.flatMap((s) => s.values);
  const minV = Math.min(0, ...all), max = niceMax(Math.max(...all, 1));
  const min = minV < 0 ? -niceMax(-minV) : 0;
  const n = labels.length;
  const x = (i) => pl + (n <= 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (n - 1));
  const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">
    <defs>${series.map((s, i) => `<linearGradient id="${id}${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".35"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`).join('')}
    <filter id="${id}glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  for (let k = 0; k <= 4; k++) { const yy = pt + (k * (H - pt - pb)) / 4; svg += `<line class="grid-line" x1="0" x2="${W}" y1="${yy}" y2="${yy}"/>`; }
  if (bars && series[0]) {
    // İnce dikey çubuklar (tasarımdaki "barcode" efekti)
    const s = series[0], bw = Math.max(2, (W - pl - pr) / Math.max(n, 1) / 5);
    s.values.forEach((v, i) => {
      const h = Math.max(2, ((v - min) / (max - min)) * (H - pt - pb) * 0.35);
      for (let j = -1; j <= 1; j++) {
        const hh = h * (0.55 + 0.45 * Math.abs(Math.sin(i * 3.1 + j * 1.7)));
        svg += `<rect x="${x(i) + j * bw * 1.6 - bw / 2}" y="${H - pb - hh}" width="${bw / 2}" height="${hh}" fill="${s.color}" opacity=".18"/>`;
      }
    });
  }
  series.forEach((s, i) => {
    const pts = s.values.map((v, j) => [x(j), y(v)]);
    const d = smoothPath(pts);
    if (s.area) svg += `<path d="${d} L${x(n - 1)},${y(min)} L${x(0)},${y(min)} Z" fill="url(#${id}${i})"/>`;
    svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.area ? 2.4 : 1.8}" ${s.area ? `filter="url(#${id}glow)"` : ''} ${s.dash ? 'stroke-dasharray="5 5"' : ''} vector-effect="non-scaling-stroke"/>`;
  });
  svg += `<g class="axis">${labels.map((l, i) => (n > 14 && i % 2) ? '' : `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(l)}</text>`).join('')}</g>`;
  svg += `<line class="hover-line" x1="0" x2="0" y1="${pt}" y2="${H - pb}" stroke="var(--line-2)" stroke-dasharray="3 3" opacity="0"/>`;
  svg += series.map((s, i) => `<circle class="hover-dot" data-s="${i}" r="5" fill="${s.color}" stroke="var(--panel)" stroke-width="2" opacity="0"/>`).join('');
  svg += '</svg>';
  el.classList.add('chart');
  el.innerHTML = svg + '<div class="chart-tip" hidden></div>';
  const svgEl = el.querySelector('svg'), tip = el.querySelector('.chart-tip');
  const line = svgEl.querySelector('.hover-line'), dots = svgEl.querySelectorAll('.hover-dot');
  const onMove = (e) => {
    const r = svgEl.getBoundingClientRect();
    const px = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - pl) / (W - pl - pr)) * (n - 1))));
    line.setAttribute('x1', x(i)); line.setAttribute('x2', x(i)); line.setAttribute('opacity', 1);
    dots.forEach((d) => { const s = series[d.dataset.s]; d.setAttribute('cx', x(i)); d.setAttribute('cy', y(s.values[i])); d.setAttribute('opacity', 1); });
    tip.hidden = false;
    tip.innerHTML = `<div class="t"><span class="dot" style="background:var(--accent)"></span>${esc(tipTitle ? tipTitle(i) : labels[i])}</div>` +
      series.map((s) => `<div class="r"><span>${esc(s.name)}</span><b>${fmt(s.values[i])}</b></div>`).join('');
    const left = (x(i) / W) * r.width;
    tip.style.left = (left > r.width - 190 ? left - 190 : left) + 'px';
    tip.style.top = '40%';
  };
  const onLeave = () => { tip.hidden = true; line.setAttribute('opacity', 0); dots.forEach((d) => d.setAttribute('opacity', 0)); };
  svgEl.addEventListener('mousemove', onMove);
  svgEl.addEventListener('touchmove', onMove, { passive: true });
  svgEl.addEventListener('mouseleave', onLeave);
  svgEl.addEventListener('touchend', onLeave);
}

export const PALETTE = ['#ff7a1a', '#6b7cff', '#2ecc71', '#f5c542', '#b36bff', '#27c3d9', '#ff4d6d', '#9aa0a6'];
export function donut(el, items, { fmt = compact, center = '' } = {}) {
  const total = items.reduce((a, b) => a + Math.max(0, b.value), 0);
  const R = 70, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = total ? items.map((it, i) => {
    const len = (Math.max(0, it.value) / total) * C;
    const s = `<circle r="${R}" cx="90" cy="90" fill="none" stroke="${it.color || PALETTE[i % PALETTE.length]}" stroke-width="18" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"/>`;
    off += len; return s;
  }).join('') : `<circle r="${R}" cx="90" cy="90" fill="none" stroke="var(--line)" stroke-width="18"/>`;
  el.innerHTML = `<div class="donut-wrap"><div class="chart"><svg viewBox="0 0 180 180">${arcs}
    <text x="90" y="86" text-anchor="middle" fill="var(--muted)" font-size="11">${esc(center || 'Toplam')}</text>
    <text x="90" y="106" text-anchor="middle" fill="var(--text)" font-size="16" font-weight="700">${esc(fmt(total))}</text></svg></div>
    <div class="donut-legend">${items.map((it, i) => `<div><span class="dot" style="background:${it.color || PALETTE[i % PALETTE.length]}"></span><span>${esc(it.label)}</span><b>${total ? Math.round((Math.max(0, it.value) / total) * 100) : 0}%</b></div>`).join('') || '<small>Veri yok</small>'}</div></div>`;
}
export function barList(items, { fmt = compact, cls = '' } = {}) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return items.map((it) => `<div class="bar-row"><span class="nowrap" style="overflow:hidden;text-overflow:ellipsis">${esc(it.label)}</span>
    <div class="bar-track"><div class="bar-fill ${it.cls || cls}" style="width:${(Math.abs(it.value) / max) * 100}%"></div></div>
    <b class="num">${it.text ?? fmt(it.value)}</b></div>`).join('');
}
export function emptyState(ic, text, btn = '') {
  return `<div class="empty">${icon(ic)}<p>${text}</p>${btn}</div>`;
}
export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
