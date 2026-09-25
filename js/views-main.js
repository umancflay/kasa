// Genel bakış, defterler, borçlar, şahsi panel, yatırımlar, haberler, notlar, ayarlar.
import * as S from './store.js';
import { icon, esc, money, compact, pct, date, MONTHS, ym, todayISO, lineChart, donut, barList, emptyState, trend, toast, download, confirmBox, formModal, PALETTE } from './ui.js';
import { CATS, parseDate, byId, activeTenant, rentInfo, monthly, lastMonths, cash, taxCalc, debtInfo, TAX_PRESETS, defaultState, demoState } from './domain.js';
import { editEntry, editDebt, payInstallment, editAsset, editNote, collectRent, commit, refresh } from './editors.js';
import { kpi, head, unpaidThisMonth } from './views-ev.js';

const st = () => S.state;
function bind(el, sel, fn) { el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); fn(b.dataset, b, e); })); }

// Yaklaşan olaylar (genel bakış)
function upcoming(s) {
  const out = [];
  const now = new Date();
  for (const t of s.tenants.filter((x) => x.active !== false)) {
    const p = byId(s.properties, t.propertyId);
    const ri = rentInfo(t, s);
    if (ri.due) out.push({ ic: 'bolt', cls: '', t: `Zam zamanı: ${p?.name || t.name}`, sub: `Azami ${money(ri.maxNew)} · ${t.name}`, when: now, go: '#/verim' });
    else if (ri.daysToNext != null && ri.daysToNext <= 60) out.push({ ic: 'calendar', cls: 'blue', t: `Kira yenileme: ${p?.name || ''}`, sub: `${t.name} · ${ri.daysToNext} gün`, when: ri.next, go: '#/verim' });
  }
  for (const { t, late } of unpaidThisMonth(s)) out.push({ ic: 'alert', cls: late ? 'red' : '', t: `Kira bekleniyor: ${t.name}`, sub: `${money(t.rent)} · ayın ${t.paymentDay || 5}'i`, when: new Date(now.getFullYear(), now.getMonth(), Number(t.paymentDay) || 5), go: '#/kiracilar' });
  for (const d of s.debts) {
    const i = debtInfo(d);
    if (i.next && i.daysToNext <= 20) out.push({ ic: 'card', cls: i.overdue ? 'red' : 'purple', t: `${d.scope === 'ev' ? 'Ev' : 'Şahsi'} borç: ${d.name}`, sub: `${money(i.inst)} · ${i.overdue ? 'gecikti' : i.daysToNext + ' gün'}`, when: i.next, go: '#/borclar/' + d.scope });
  }
  const m = now.getMonth();
  if (m === 2) out.push({ ic: 'receipt', cls: 'red', t: 'Kira geliri beyannamesi', sub: '31 Mart son gün', when: new Date(now.getFullYear(), 2, 31), go: '#/vergi' });
  if (m === 4 || m === 10) out.push({ ic: 'receipt', cls: 'purple', t: 'Emlak vergisi taksiti', sub: m === 4 ? '31 Mayıs son gün' : '30 Kasım son gün', when: new Date(now.getFullYear(), m + 1, 0), go: '#/vergi' });
  if (m === 6) out.push({ ic: 'receipt', cls: 'purple', t: 'Gelir vergisi 2. taksit', sub: '31 Temmuz son gün', when: new Date(now.getFullYear(), 6, 31), go: '#/vergi' });
  for (const p of s.properties) if (p.dask) { const dd = (parseDate(p.dask) - now) / 864e5; if (dd < 30) out.push({ ic: 'shield', cls: 'red', t: `DASK yenile: ${p.name}`, sub: date(p.dask), when: new Date(p.dask), go: '#/mulkler/' + p.type }); }
  return out.sort((a, b) => a.when - b.when);
}

// ======================= GENEL BAKIŞ =======================
let ovScope = 'all';
export function overview(el) {
  const s = st();
  const months = lastMonths(12);
  const ev = monthly(s.ledger, 'ev', months), sh = monthly(s.ledger, 'sahsi', months);
  const all = months.map((m, i) => ({ m, gelir: ev[i].gelir + sh[i].gelir, gider: ev[i].gider + sh[i].gider, net: ev[i].net + sh[i].net }));
  const data = ovScope === 'ev' ? ev : ovScope === 'sahsi' ? sh : all;
  const cur = all[11], prev = all[10];
  const active = s.tenants.filter((t) => t.active !== false);
  const monthlyRent = active.reduce((a, t) => a + (Number(t.rent) || 0), 0);
  const debts = s.debts.map((d) => ({ d, i: debtInfo(d) })).filter((x) => !x.i.done);
  const debtMonthly = debts.reduce((a, x) => a + x.i.inst, 0);
  const debtLeft = debts.reduce((a, x) => a + x.i.remaining, 0);
  const year = String(new Date().getFullYear());
  const ytd = { gelir: 0, gider: 0 };
  s.ledger.filter((e) => e.date?.startsWith(year)).forEach((e) => { ytd[e.type] += cash(e); });
  const ytdRent = s.ledger.filter((e) => e.cat === 'Kira' && e.date?.startsWith(year)).reduce((a, e) => a + cash(e), 0);
  const ev12 = ev.reduce((a, x) => a + x.net, 0), sh12 = sh.reduce((a, x) => a + x.net, 0);
  const up = upcoming(s).slice(0, 7);
  const g = (a, b) => (b ? (a - b) / Math.abs(b) : 0);
  const name = s.settings.name ? `, ${esc(s.settings.name)}` : '';
  const hour = new Date().getHours();
  const hello = hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  el.innerHTML = head(`${hello}${name}`, `${date(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Ev ve şahsi finansınızın özeti`,
    `<button class="btn btn-primary" data-add>${icon('plus')} Hızlı kayıt</button>`) +
  (!s.properties.length && !s.ledger.length ? `<div class="note" style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">${icon('info')}<span style="flex:1">Henüz veri yok. Mülklerinizi ekleyerek başlayın veya tasarımı görmek için örnek verileri yükleyin.</span>
    <button class="btn btn-sm" data-go="#/mulkler/konut">Mülk ekle</button><button class="btn btn-sm btn-primary" data-demo>Örnek veri yükle</button></div>` : '') + `
  <div class="grid g-4">
    ${kpi('coins', '', 'Aylık kira geliri', money(monthlyRent), `${active.length} kiracı · ${s.properties.length} mülk`)}
    ${kpi('building', 'blue', 'Ev net (bu ay)', money(ev[11].net), `12 ay: ${compact(ev12)}`, trend(g(ev[11].net, ev[10].net)))}
    ${kpi('user', 'green', 'Şahsi net (bu ay)', money(sh[11].net), `12 ay: ${compact(sh12)}`, trend(g(sh[11].net, sh[10].net)))}
    ${kpi('card', 'red', 'Aylık borç taksidi', money(debtMonthly), `Kalan toplam ${compact(debtLeft)}`)}
  </div>
  <div class="grid g-main mt">
    <div class="card">
      <div class="card-head"><div><h3>Gelir ve gider akışı</h3>
        <div class="legend" style="margin-top:8px"><span style="color:var(--accent)"><i style="background:var(--accent)"></i>Gelir</span><span style="color:var(--blue)"><i style="background:var(--blue)"></i>Gider</span><span style="color:var(--green)"><i style="background:var(--green)"></i>Net</span></div></div>
        <div class="seg">${[['all', 'Toplam'], ['ev', 'Ev'], ['sahsi', 'Şahsi']].map(([k, l]) => `<button class="${ovScope === k ? 'on' : ''}" data-sc="${k}">${l}</button>`).join('')}</div></div>
      <div id="ovChart"></div>
    </div>
    <div class="card"><div class="card-head"><h3>Bu yılın özeti</h3><small>${year}</small></div>
      <div class="sum-list">
        <div class="sum-item" data-go="#/defter/ev"><span class="ico">${icon('trend')}</span><div><div class="v">${compact(ytd.gelir)} ${trend(g(cur.gelir, prev.gelir))}</div><div class="l">Toplam gelir</div></div><span class="go">${icon('arrow')}</span></div>
        <div class="sum-item" data-go="#/defter/sahsi"><span class="ico blue">${icon('trendDown')}</span><div><div class="v">${compact(ytd.gider)} ${trend(g(cur.gider, prev.gider))}</div><div class="l">Toplam gider</div></div><span class="go">${icon('arrow')}</span></div>
        <div class="sum-item" data-go="#/kiracilar"><span class="ico green">${icon('coins')}</span><div><div class="v">${compact(ytdRent)}</div><div class="l">Tahsil edilen kira</div></div><span class="go">${icon('arrow')}</span></div>
        <div class="sum-item" data-go="#/vergi"><span class="ico purple">${icon('percent')}</span><div><div class="v">${compact(taxCalc(s, +year, 'projected').totalBurden)}</div><div class="l">Tahmini yıllık vergi yükü</div></div><span class="go">${icon('arrow')}</span></div>
        <div class="sum-item" data-go="#/borclar/sahsi"><span class="ico red">${icon('card')}</span><div><div class="v">${compact(debtLeft)}</div><div class="l">Kalan toplam borç</div></div><span class="go">${icon('arrow')}</span></div>
      </div></div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><h3>Yaklaşanlar & hatırlatmalar</h3><span class="badge">${up.length}</span></div>
      <div class="sum-list">${up.map((u) => `<div class="sum-item" data-go="${u.go}"><span class="ico ${u.cls}">${icon(u.ic)}</span><div style="min-width:0"><div style="font-weight:600">${esc(u.t)}</div><div class="l">${esc(u.sub)}</div></div><span class="go">${icon('arrow')}</span></div>`).join('') || emptyState('check', 'Yaklaşan bir iş yok')}</div></div>
    <div class="card"><div class="card-head"><h3>Mülk performansı</h3><a class="btn btn-sm" href="#/verim">Zam & verim ${icon('arrow')}</a></div>
      <div class="table-wrap"><table><thead><tr><th>Mülk</th><th class="hide-sm">Kiracı</th><th class="right">Kira</th><th class="right">Zam pot.</th></tr></thead><tbody>
      ${s.properties.map((p) => { const t = activeTenant(s, p.id); const ri = t && rentInfo(t, s);
        return `<tr><td><span class="pill">${esc(p.name)}</span></td><td class="hide-sm">${t ? esc(t.name) : '<span class="neg">Boş</span>'}</td>
          <td class="right num">${t ? compact(t.rent) : '—'}</td><td class="right num">${ri ? `<span class="${ri.due ? 'acc' : 'pos'}">+${compact(ri.maxInc)} ${ri.due ? icon('up') : ''}</span>` : '—'}</td></tr>`; }).join('') || `<tr><td colspan="4">${emptyState('building', 'Mülk yok')}</td></tr>`}
      </tbody></table></div></div>
  </div>`;
  lineChart(el.querySelector('#ovChart'), {
    labels: months.map((x) => MONTHS[+x.slice(5) - 1]), height: 280,
    series: [
      { name: 'Gelir', color: '#ff7a1a', values: data.map((x) => x.gelir), area: true },
      { name: 'Gider', color: '#6b7cff', values: data.map((x) => x.gider) },
      { name: 'Net', color: '#2ecc71', values: data.map((x) => x.net), dash: true },
    ],
    tipTitle: (i) => date(months[i], { month: 'long', year: 'numeric' }),
  });
  bind(el, '[data-sc]', (d) => { ovScope = d.sc; refresh(); });
  bind(el, '[data-go]', (d) => { location.hash = d.go; });
  bind(el, '[data-add]', () => document.getElementById('quickAdd').click());
  bind(el, '[data-demo]', () => { Object.assign(S.state, demoState(S.state)); commit(); toast('Örnek veriler yüklendi — Ayarlar\'dan silebilirsiniz'); });
}

// ======================= DEFTER =======================
const lf = { ev: { y: String(new Date().getFullYear()), m: '', type: '', cat: '', prop: '', q: '' }, sahsi: { y: String(new Date().getFullYear()), m: '', type: '', cat: '', prop: '', q: '' } };
export function ledgerView(el, scope) {
  const s = st(), f = lf[scope];
  const years = [...new Set([String(new Date().getFullYear()), ...s.ledger.filter((e) => e.scope === scope).map((e) => e.date?.slice(0, 4))])].filter(Boolean).sort().reverse();
  const list = s.ledger.filter((e) => e.scope === scope
    && (!f.y || e.date?.startsWith(f.y)) && (!f.m || e.date?.slice(5, 7) === f.m) && (!f.type || e.type === f.type)
    && (!f.cat || e.cat === f.cat) && (!f.prop || e.propertyId === f.prop)
    && (!f.q || `${e.note} ${e.cat}`.toLocaleLowerCase('tr').includes(f.q.toLocaleLowerCase('tr'))))
    .sort((a, b) => b.date.localeCompare(a.date));
  const inc = list.filter((e) => e.type === 'gelir').reduce((a, e) => a + cash(e), 0);
  const exp = list.filter((e) => e.type === 'gider').reduce((a, e) => a + e.amount, 0);
  const cats = {}; list.filter((e) => e.type === 'gider').forEach((e) => { cats[e.cat] = (cats[e.cat] || 0) + e.amount; });
  const sel = (id, opts, v) => `<select data-k="${id}">${opts.map(([ov, ol]) => `<option value="${ov}" ${ov === v ? 'selected' : ''}>${ol}</option>`).join('')}</select>`;
  el.innerHTML = head(scope === 'ev' ? 'Ev Defteri' : 'Şahsi Defter', scope === 'ev' ? 'Mülklerinize ait tüm gelir ve giderler' : 'Kişisel gelir ve harcamalarınız',
    `<button class="btn" data-csv>${icon('download')} CSV</button><button class="btn btn-primary" data-new>${icon('plus')} Kayıt ekle</button>`) + `
  <div class="grid g-3">
    ${kpi('trend', 'green', 'Gelir', money(inc), `${list.filter((e) => e.type === 'gelir').length} kayıt`)}
    ${kpi('trendDown', 'red', 'Gider', money(exp), `${list.filter((e) => e.type === 'gider').length} kayıt`)}
    ${kpi('wallet', '', 'Net', `<span class="${inc - exp >= 0 ? 'pos' : 'neg'}">${money(inc - exp)}</span>`, 'Seçili filtreye göre')}
  </div>
  <div class="grid g-main mt">
    <div class="card">
      <div class="filters">
        ${sel('y', [['', 'Tüm yıllar'], ...years.map((y) => [y, y])], f.y)}
        ${sel('m', [['', 'Tüm aylar'], ...MONTHS.map((m, i) => [String(i + 1).padStart(2, '0'), m])], f.m)}
        ${sel('type', [['', 'Gelir + Gider'], ['gelir', 'Gelir'], ['gider', 'Gider']], f.type)}
        ${sel('cat', [['', 'Tüm kategoriler'], ...[...CATS[scope].gelir, ...CATS[scope].gider].map((c) => [c, c])], f.cat)}
        ${scope === 'ev' ? sel('prop', [['', 'Tüm mülkler'], ...s.properties.map((p) => [p.id, p.name])], f.prop) : ''}
        <input type="text" data-k="q" placeholder="Ara…" value="${esc(f.q)}" style="flex:1;min-width:120px">
      </div>
      <div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Kategori / açıklama</th>${scope === 'ev' ? '<th class="hide-sm">Mülk</th>' : ''}<th class="right">Tutar</th><th></th></tr></thead><tbody>
      ${list.slice(0, 400).map((e) => `<tr><td class="nowrap">${date(e.date, { day: '2-digit', month: 'short', year: '2-digit' })}</td>
        <td><div class="cell-main">${esc(e.cat)}</div><div class="cell-sub">${esc(e.note || '')}${e.stopaj ? ` · stopaj ${money(e.stopaj)}` : ''}</div></td>
        ${scope === 'ev' ? `<td class="hide-sm">${esc(byId(s.properties, e.propertyId)?.name || '—')}</td>` : ''}
        <td class="right num nowrap ${e.type === 'gelir' ? 'pos' : 'neg'}">${e.type === 'gelir' ? '+' : '−'}${money(cash(e))}</td>
        <td><div class="row-actions"><button data-dup="${e.id}" title="Bu aya kopyala">${icon('copy')}</button><button data-edit="${e.id}" title="Düzenle">${icon('edit')}</button></div></td></tr>`).join('')
        || `<tr><td colspan="5">${emptyState('book', 'Kayıt bulunamadı')}</td></tr>`}
      </tbody></table></div>
      ${list.length > 400 ? `<p class="muted">İlk 400 kayıt gösteriliyor. Filtreyi daraltın.</p>` : ''}
    </div>
    <div class="card"><div class="card-head"><h3>Gider kategorileri</h3></div><div id="lDonut"></div>
      <div class="mt">${barList(Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value })), { cls: 'blue' })}</div></div>
  </div>`;
  donut(el.querySelector('#lDonut'), Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })), { center: 'Gider' });
  el.querySelectorAll('[data-k]').forEach((i) => i.addEventListener(i.tagName === 'INPUT' ? 'change' : 'change', () => { f[i.dataset.k] = i.value; refresh(); }));
  bind(el, '[data-new]', () => editEntry(null, scope));
  bind(el, '[data-edit]', (d) => editEntry(byId(s.ledger, d.edit)));
  bind(el, '[data-dup]', (d) => {
    const e = byId(s.ledger, d.dup);
    const copy = { ...e, id: undefined, date: todayISO(), period: e.period ? ym() : undefined };
    delete copy.id;
    editEntry(null, e.scope, copy);
  });
  bind(el, '[data-csv]', () => {
    const rows = [['Tarih', 'Tür', 'Kategori', 'Tutar', 'Stopaj', 'Mülk', 'Açıklama'], ...list.map((e) => [e.date, e.type, e.cat, e.amount, e.stopaj || 0, byId(s.properties, e.propertyId)?.name || '', e.note || ''])];
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${scope}-defter-${todayISO()}.csv`);
  });
}

// ======================= BORÇLAR =======================
export function debtsView(el, scope) {
  const s = st();
  const list = s.debts.filter((d) => d.scope === scope).map((d) => ({ d, i: debtInfo(d) }));
  const open = list.filter((x) => !x.i.done).sort((a, b) => (a.i.next || 0) - (b.i.next || 0));
  const closed = list.filter((x) => x.i.done);
  const monthlyTot = open.reduce((a, x) => a + x.i.inst, 0);
  const left = open.reduce((a, x) => a + x.i.remaining, 0);
  const lastEnd = open.reduce((a, x) => (!a || x.i.end > a ? x.i.end : a), null);
  const card = ({ d, i }) => `<div class="card">
    <div class="card-head"><div style="display:flex;gap:12px;align-items:center;min-width:0"><span class="ico ${i.overdue ? 'red' : i.done ? 'green' : 'purple'}">${icon(i.done ? 'check' : 'card')}</span>
      <div style="min-width:0"><h3>${esc(d.name)}</h3><small>${esc(d.lender || '')} · ${esc(d.kind || '')}${d.propertyId ? ' · ' + esc(byId(s.properties, d.propertyId)?.name || '') : ''}</small></div></div>
      <div class="row-actions"><button data-edit="${d.id}">${icon('edit')}</button></div></div>
    <div class="prop-stats"><div><small>Aylık taksit</small><b>${money(i.inst)}</b></div><div><small>Kalan</small><b>${compact(i.remaining)}</b></div><div><small>Taksit</small><b>${i.paid}/${i.total}</b></div></div>
    <div class="progress mt"><div style="width:${i.progress * 100}%"></div></div>
    <div class="actions mt" style="justify-content:space-between"><small>${i.done ? 'Kapandı' : `Sonraki: <b class="${i.overdue ? 'neg' : ''}">${date(i.next)}</b> · Bitiş: ${date(i.end, { month: 'short', year: 'numeric' })}`}</small>
      ${i.done ? '' : `<button class="btn btn-sm btn-primary" data-pay="${d.id}">${icon('check')} Taksit öde</button>`}</div>
    ${d.note ? `<p class="muted" style="margin:10px 0 0;font-size:12px">${esc(d.note)}</p>` : ''}</div>`;
  // Önümüzdeki 12 ay ödeme planı
  const plan = lastMonths(12, new Date(new Date().getFullYear(), new Date().getMonth() + 11, 1)).map((m) => {
    let t = 0;
    for (const { d, i } of open) {
      const first = parseDate(d.firstDue); const idx = (Number(m.slice(0, 4)) - first.getFullYear()) * 12 + (Number(m.slice(5)) - 1 - first.getMonth());
      if (idx >= i.paid && idx < i.total) t += i.inst;
    }
    return { m, t };
  });
  el.innerHTML = head(scope === 'ev' ? 'Ev Borçları' : 'Şahsi Borçlar', scope === 'ev' ? 'Mülklerle ilgili kredi, tadilat ve diğer borçlar' : 'Kişisel kredi, kart ve diğer borçlarınız',
    `<a class="btn" href="#/borclar/${scope === 'ev' ? 'sahsi' : 'ev'}">${scope === 'ev' ? 'Şahsi borçlar' : 'Ev borçları'} ${icon('arrow')}</a><button class="btn btn-primary" data-new>${icon('plus')} Borç ekle</button>`) + `
  <div class="grid g-4">
    ${kpi('card', 'red', 'Aylık toplam taksit', money(monthlyTot), `${open.length} aktif borç`)}
    ${kpi('wallet', 'purple', 'Kalan toplam borç', money(left))}
    ${kpi('calendar', 'blue', 'En yakın ödeme', open[0] ? date(open[0].i.next, { day: '2-digit', month: 'short' }) : '—', open[0] ? esc(open[0].d.name) : '')}
    ${kpi('check', 'green', 'Borçsuz olma', lastEnd ? date(lastEnd, { month: 'short', year: 'numeric' }) : '—', `${closed.length} borç kapandı`)}
  </div>
  <div class="card mt"><div class="card-head"><div><h3>12 aylık ödeme planı</h3><small>Mevcut borçlara göre aylık taksit yükü</small></div></div><div id="dChart"></div></div>
  <div class="grid g-2 mt">${open.map(card).join('') || `<div class="card">${emptyState('card', 'Aktif borç yok 🎉', `<button class="btn btn-primary" data-new>${icon('plus')} Borç ekle</button>`)}</div>`}</div>
  ${closed.length ? `<h3 style="margin:24px 0 12px">Kapanan borçlar</h3><div class="grid g-2">${closed.map(card).join('')}</div>` : ''}`;
  lineChart(el.querySelector('#dChart'), { labels: plan.map((x) => MONTHS[+x.m.slice(5) - 1]), series: [{ name: 'Taksit', color: '#b36bff', values: plan.map((x) => x.t), area: true }], height: 180, bars: true });
  bind(el, '[data-new]', () => editDebt(null, scope));
  bind(el, '[data-edit]', (d) => editDebt(byId(s.debts, d.edit)));
  bind(el, '[data-pay]', (d) => payInstallment(byId(s.debts, d.pay)));
}

// ======================= ŞAHSİ PANEL =======================
export function sahsiPanel(el) {
  const s = st();
  const months = lastMonths(12);
  const m = monthly(s.ledger, 'sahsi', months);
  const cur = m[11], prev = m[10];
  const saving = cur.gelir ? cur.net / cur.gelir : 0;
  const debts = s.debts.filter((d) => d.scope === 'sahsi').map((d) => ({ d, i: debtInfo(d) })).filter((x) => !x.i.done);
  const debtMonthly = debts.reduce((a, x) => a + x.i.inst, 0);
  const avgInc = m.slice(-3).reduce((a, x) => a + x.gelir, 0) / 3;
  const cats = {};
  const cutoff = months[9];
  s.ledger.filter((e) => e.scope === 'sahsi' && e.type === 'gider' && e.date?.slice(0, 7) >= cutoff).forEach((e) => { cats[e.cat] = (cats[e.cat] || 0) + e.amount; });
  const dti = avgInc ? debtMonthly / avgInc : 0;
  el.innerHTML = head('Şahsi Panel', 'Kişisel gelir, gider ve borçlarınız (ev/mülk hesaplarından ayrı)',
    `<a class="btn" href="#/defter/sahsi">${icon('book')} Şahsi defter</a><button class="btn btn-primary" data-add>${icon('plus')} Harcama ekle</button>`) + `
  <div class="grid g-4">
    ${kpi('trend', 'green', 'Bu ay gelir', money(cur.gelir), '', trend(prev.gelir ? (cur.gelir - prev.gelir) / prev.gelir : 0))}
    ${kpi('trendDown', 'blue', 'Bu ay gider', money(cur.gider), '', trend(prev.gider ? (cur.gider - prev.gider) / prev.gider : 0))}
    ${kpi('wallet', '', 'Tasarruf oranı', `<span class="${saving >= 0.2 ? 'pos' : saving < 0 ? 'neg' : ''}">${pct(saving)}</span>`, `Net ${money(cur.net)}`)}
    ${kpi('card', 'red', 'Şahsi borç / ay', money(debtMonthly), `Gelirin ${pct(dti)}'i`)}
  </div>
  <div class="grid g-main mt">
    <div class="card"><div class="card-head"><div><h3>Şahsi nakit akışı</h3><small>Son 12 ay</small></div>
      <div class="legend"><span style="color:var(--accent)"><i style="background:var(--accent)"></i>Gelir</span><span style="color:var(--blue)"><i style="background:var(--blue)"></i>Gider</span></div></div><div id="sChart"></div></div>
    <div class="card"><div class="card-head"><h3>Harcama dağılımı</h3><small>Son 3 ay</small></div><div id="sDonut"></div></div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><h3>Şahsi borçlar</h3><a class="btn btn-sm" href="#/borclar/sahsi">Tümü ${icon('arrow')}</a></div>
      ${debts.map(({ d, i }) => `<div class="kv"><span>${esc(d.name)}<br><small>${i.left} taksit kaldı · ${date(i.next, { day: '2-digit', month: 'short' })}</small></span><b>${money(i.inst)}<br><small>${compact(i.remaining)} kalan</small></b></div>`).join('') || emptyState('check', 'Şahsi borç yok')}</div>
    <div class="card"><div class="card-head"><h3>En çok harcanan kategoriler</h3><small>Son 3 ay</small></div>
      ${barList(Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, value]) => ({ label, value })), { cls: 'blue' }) || emptyState('receipt', 'Harcama kaydı yok')}</div>
  </div>`;
  lineChart(el.querySelector('#sChart'), {
    labels: months.map((x) => MONTHS[+x.slice(5) - 1]),
    series: [{ name: 'Gelir', color: '#ff7a1a', values: m.map((x) => x.gelir), area: true }, { name: 'Gider', color: '#6b7cff', values: m.map((x) => x.gider) }],
    tipTitle: (i) => date(months[i], { month: 'long', year: 'numeric' }),
  });
  donut(el.querySelector('#sDonut'), Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })), { center: '3 ay gider' });
  bind(el, '[data-add]', () => editEntry(null, 'sahsi', { type: 'gider' }));
}

// ======================= YATIRIM =======================
let prices = null, pricesAt = 0;
export async function fetchPrices(force = false) {
  if (prices && !force && Date.now() - pricesAt < 60000) return prices;
  const r = await fetch('https://api.binance.com/api/v3/ticker/price');
  if (!r.ok) throw new Error('Fiyat alınamadı');
  const arr = await r.json();
  prices = Object.fromEntries(arr.map((x) => [x.symbol, Number(x.price)]));
  pricesAt = Date.now();
  return prices;
}
export function rates(p) {
  if (!p) return null;
  const usd = p.USDTTRY || 0;
  return { usd, eur: (p.EURUSDT || 0) * usd, gram: ((p.PAXGUSDT || 0) * usd) / 31.1035, btc: p.BTCTRY || (p.BTCUSDT || 0) * usd };
}
function assetValue(a, p) {
  const r = rates(p);
  const n = Number(a.amount) || 0;
  if (a.kind === 'kripto' && p) { const sym = (a.symbol || '').toUpperCase(); const v = p[sym + 'TRY'] || (p[sym + 'USDT'] || 0) * r.usd; return v ? v * n : null; }
  if (a.kind === 'altin' && p) { const sy = (a.symbol || '').toLocaleLowerCase('tr'); if (sy.includes('ons')) return r.gram * 31.1035 * n; if (sy.includes('çeyrek')) return r.gram * 1.6065 * n; if (sy.includes('yarım')) return r.gram * 3.213 * n; if (sy.includes('tam')) return r.gram * 6.426 * n; if (sy.includes('22')) return r.gram * 0.916 * n; return r.gram * n; }
  if (a.kind === 'doviz' && p) { const sy = (a.symbol || '').toUpperCase(); if (sy.includes('EUR')) return r.eur * n; if (sy.includes('USD')) return r.usd * n; }
  return a.manualValue !== '' && a.manualValue != null ? Number(a.manualValue) : null;
}
export function invest(el) {
  const s = st();
  const render = (p, err) => {
    const r = rates(p);
    const rows = s.assets.map((a) => { const v = assetValue(a, p); return { a, v: v ?? (Number(a.cost) || 0), live: v != null && ['kripto', 'altin', 'doviz'].includes(a.kind) }; });
    const total = rows.reduce((x, y) => x + y.v, 0), cost = s.assets.reduce((x, a) => x + (Number(a.cost) || 0), 0);
    const byKind = {}; rows.forEach(({ a, v }) => { byKind[a.kind] = (byKind[a.kind] || 0) + v; });
    const kindName = { kripto: 'Kripto', altin: 'Altın', doviz: 'Döviz', hisse: 'Hisse', fon: 'Fon', mevduat: 'Mevduat/Nakit', diger: 'Diğer' };
    const propVal = s.properties.reduce((x, pr) => x + (Number(pr.currentValue) || Number(pr.purchasePrice) || 0), 0);
    const debtLeft = s.debts.reduce((x, d) => x + debtInfo(d).remaining, 0);
    const netWorth = total + propVal - debtLeft;
    // Genel finansal sağlık göstergeleri (kişisel yatırım tavsiyesi değildir)
    const months = lastMonths(3);
    const all = monthly(s.ledger, null, months);
    const avgExp = all.reduce((x, m) => x + m.gider, 0) / 3, avgInc = all.reduce((x, m) => x + m.gelir, 0) / 3;
    const liquid = (byKind.mevduat || 0) + (byKind.doviz || 0) + (byKind.altin || 0);
    const insights = [];
    if (avgExp) { const mo = liquid / avgExp; insights.push([mo >= 6 ? 'green' : mo >= 3 ? '' : 'red', 'shield', `Acil durum fonu: likit varlıklarınız ~<b>${mo.toFixed(1)} aylık</b> giderinizi karşılıyor. Genel kabul gören hedef 3–6 aydır.`]); }
    if (avgInc) { const sr = (avgInc - avgExp) / avgInc; insights.push([sr >= 0.2 ? 'green' : sr >= 0 ? '' : 'red', 'wallet', `Son 3 ay ortalama tasarruf oranı <b>${pct(sr)}</b>. %20 ve üzeri sağlıklı kabul edilir.`]); }
    const debtM = s.debts.filter((d) => !debtInfo(d).done).reduce((x, d) => x + debtInfo(d).inst, 0);
    if (avgInc) { const dti = debtM / avgInc; insights.push([dti <= 0.35 ? 'green' : 'red', 'card', `Borç taksitleri gelirin <b>${pct(dti)}</b>'i. %35 üzeri risk sinyali olarak değerlendirilir.`]); }
    if (total) { const top = Object.entries(byKind).sort((x, y) => y[1] - x[1])[0]; if (top && top[1] / total > 0.5) insights.push(['', 'percent', `Portföyün <b>${pct(top[1] / total)}</b>'i ${kindName[top[0]]} ağırlıklı. Tek varlık sınıfında yoğunlaşma riski artırır.`]); }
    if (propVal && total + propVal) insights.push(['blue', 'building', `Net varlığınızın <b>${pct(propVal / (total + propVal))}</b>'i gayrimenkulde. Gayrimenkul likit değildir; nakit ihtiyaçlarınızı planlarken dikkate alın.`]);
    el.innerHTML = head('Yatırımlar & Varlıklar', 'Canlı fiyatlar Binance halka açık verisinden · kişisel yatırım tavsiyesi değildir',
      `<button class="btn" data-rf>${icon('refresh')} Fiyatları yenile</button><button class="btn btn-primary" data-new>${icon('plus')} Varlık ekle</button>`) + `
    ${err ? `<div class="note red" style="margin-bottom:14px">Canlı fiyat alınamadı (${esc(err)}). Maliyet değerleri gösteriliyor.</div>` : ''}
    <div class="grid g-4">
      ${kpi('coins', '', 'Portföy değeri', money(total), `Maliyet ${compact(cost)}`)}
      ${kpi('trend', total - cost >= 0 ? 'green' : 'red', 'Kâr / zarar', `<span class="${total - cost >= 0 ? 'pos' : 'neg'}">${money(total - cost)}</span>`, cost ? pct((total - cost) / cost) : '')}
      ${kpi('building', 'blue', 'Gayrimenkul değeri', compact(propVal), `${s.properties.length} mülk`)}
      ${kpi('wallet', 'purple', 'Net varlık', compact(netWorth), `Borçlar düşülmüş (${compact(debtLeft)})`)}
    </div>
    ${r ? `<div class="grid g-4 mt">${[['USD/TRY', r.usd, 2], ['EUR/TRY', r.eur, 2], ['Gram altın', r.gram, 0], ['BTC/TRY', r.btc, 0]].map(([l, v, d]) => `<div class="card kpi"><div class="kpi-top">${l}</div><div class="kpi-val" style="font-size:18px">${money(v, d > 0)}</div></div>`).join('')}</div>` : ''}
    <div class="grid g-main mt">
      <div class="card"><div class="card-head"><h3>Varlıklar</h3></div>
        <div class="table-wrap"><table><thead><tr><th>Varlık</th><th class="right hide-sm">Miktar</th><th class="right">Değer</th><th class="right">K/Z</th><th></th></tr></thead><tbody>
        ${rows.map(({ a, v, live }) => { const pl = v - (Number(a.cost) || 0); return `<tr><td><div class="cell-main">${esc(a.symbol)} ${live ? '<span class="badge up">canlı</span>' : ''}</div><div class="cell-sub">${kindName[a.kind] || ''}${a.note ? ' · ' + esc(a.note) : ''}</div></td>
          <td class="right num hide-sm">${num(a.amount)}</td><td class="right num">${money(v)}</td>
          <td class="right num ${pl >= 0 ? 'pos' : 'neg'}">${a.cost ? pct(pl / a.cost) : '—'}</td><td><div class="row-actions"><button data-edit="${a.id}">${icon('edit')}</button></div></td></tr>`; }).join('') || `<tr><td colspan="5">${emptyState('coins', 'Henüz varlık eklemediniz')}</td></tr>`}
        </tbody></table></div></div>
      <div class="card"><div class="card-head"><h3>Dağılım</h3></div><div id="iDonut"></div></div>
    </div>
    <div class="grid g-2 mt">
      <div class="card"><div class="card-head"><div><h3>Finansal sağlık analizi</h3><small>Verilerinize göre genel göstergeler</small></div></div>
        <div class="tips">${insights.map(([c, ic, t]) => `<div class="note ${c}" style="display:flex;gap:10px">${icon(ic)}<div>${t}</div></div>`).join('') || '<p class="muted">Gelir/gider ve varlık ekledikçe analiz oluşur.</p>'}
        <p class="muted" style="font-size:12px;margin:0">Bu bölüm genel finansal okuryazarlık göstergeleri sunar; lisanslı yatırım danışmanlığı değildir. Yatırım kararlarınız için SPK lisanslı bir danışmana başvurun.</p></div></div>
      <div class="card"><div class="card-head"><div><h3>Binance hesabı bağlantısı</h3><small>Yakında</small></div><span class="badge acc">Planlandı</span></div>
        <p style="margin-top:0">Binance bakiyelerinizi otomatik çekmek için <b>sadece okuma (read-only)</b> yetkili bir API anahtarı kullanılacak. Güvenlik için anahtar tarayıcıda değil, küçük bir sunucu fonksiyonunda (ör. Cloudflare Worker) saklanmalıdır.</p>
        <div class="kv"><span>1. Binance → API Yönetimi → "Sadece okuma" anahtar oluştur</span><b>${icon('check')}</b></div>
        <div class="kv"><span>2. IP kısıtlaması ekle, çekme/işlem yetkilerini KAPALI tut</span><b>${icon('shield')}</b></div>
        <div class="kv"><span>3. Proxy fonksiyonu kurulunca bakiyeler buraya otomatik gelir</span><b>${icon('link')}</b></div>
        <p class="muted" style="font-size:12px">Şimdilik kripto varlıklarınızı elle girin; fiyatlar canlı güncellenir.</p></div>
    </div>`;
    donut(el.querySelector('#iDonut'), Object.entries(byKind).map(([k, v]) => ({ label: kindName[k] || k, value: v })), { center: 'Portföy' });
    bind(el, '[data-new]', () => editAsset());
    bind(el, '[data-edit]', (d) => editAsset(byId(s.assets, d.edit)));
    bind(el, '[data-rf]', () => fetchPrices(true).then((p) => render(p)).catch((e) => render(null, e.message)));
  };
  render(prices);
  fetchPrices().then((p) => { if (document.contains(el) && location.hash.startsWith('#/yatirim')) render(p); }).catch((e) => render(null, e.message));
}
const num = (v) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 }).format(Number(v) || 0);

// ======================= HABERLER =======================
const newsCache = {};
let newsTopic = null;
export function news(el) {
  const s = st();
  const topics = s.settings.newsTopics?.length ? s.settings.newsTopics : defaultState().settings.newsTopics;
  newsTopic = topics.includes(newsTopic) ? newsTopic : topics[0];
  const gUrl = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:30d')}&hl=tr&gl=TR&ceid=TR:tr`;
  const webUrl = (q) => `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=tr&gl=TR&ceid=TR:tr`;
  el.innerHTML = head('Mülk Sahibi Haberleri', 'Türkiye\'de kiraya verenleri ilgilendiren güncel gelişmeler',
    `<button class="btn" data-edit>${icon('edit')} Konuları düzenle</button>`) + `
  <div class="filters">${topics.map((t) => `<button class="btn btn-sm ${t === newsTopic ? 'btn-primary' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
  <div class="grid g-main">
    <div class="card"><div class="card-head"><h3>${esc(newsTopic)}</h3><a class="btn btn-sm" href="${webUrl(newsTopic)}" target="_blank" rel="noopener">Google Haberler ${icon('link')}</a></div><div class="news" id="newsList"><p class="muted">Yükleniyor…</p></div></div>
    <div class="card"><div class="card-head"><h3>Güncel mevzuat özeti</h3></div>
      <div class="kv"><span>Kira artış sınırı (TÜFE 12 ay ort.)</span><b class="acc">%${esc(s.settings.tufe12)}</b></div>
      <div class="kv"><span>Konut kira istisnası (2026)</span><b>${money(TAX_PRESETS[2026].istisna)}</b></div>
      <div class="kv"><span>Stopajlı işyeri beyan sınırı (2026)</span><b>${money(TAX_PRESETS[2026].beyanSiniri)}</b></div>
      <div class="kv"><span>İşyeri kira stopajı</span><b>%${esc(s.settings.stopajRate)}</b></div>
      <div class="kv"><span>Götürü gider oranı</span><b>%15</b></div>
      <div class="kv"><span>Emlak vergisi (büyükşehir konut / işyeri)</span><b>binde 2 / binde 4</b></div>
      <div class="kv"><span>Kira sözleşmesi damga vergisi</span><b>binde 1,89</b></div>
      <p class="muted" style="font-size:12px">Kaynaklar: TÜİK, GİB, TBK md. 344–347. Değerleri Ayarlar'dan güncelleyebilirsiniz.</p>
      <div class="actions"><a class="btn btn-sm" href="https://data.tuik.gov.tr" target="_blank" rel="noopener">TÜİK</a><a class="btn btn-sm" href="https://www.gib.gov.tr" target="_blank" rel="noopener">GİB</a><a class="btn btn-sm" href="https://hazirbeyan.gib.gov.tr" target="_blank" rel="noopener">Hazır Beyan</a></div>
    </div>
  </div>`;
  const list = el.querySelector('#newsList');
  const show = (items) => {
    list.innerHTML = items.length ? items.slice(0, 25).map((i) => `<a href="${esc(i.link)}" target="_blank" rel="noopener"><b>${esc(i.title)}</b><small>${esc(i.source || '')} · ${date(i.pubDate?.replace(' ', 'T'), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></a>`).join('') : '<p class="muted">Haber bulunamadı.</p>';
  };
  if (newsCache[newsTopic]) show(newsCache[newsTopic]);
  else fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(gUrl(newsTopic)))
    .then((r) => r.json()).then((j) => {
      if (j.status !== 'ok') throw new Error(j.message || 'hata');
      const items = j.items.map((i) => { const m = i.title.match(/^(.*) - ([^-]+)$/); return { title: m ? m[1] : i.title, source: m ? m[2] : j.feed?.title, link: i.link, pubDate: i.pubDate }; });
      newsCache[newsTopic] = items; show(items);
    }).catch(() => { list.innerHTML = `<div class="note">Haber akışı şu an yüklenemedi. <a href="${webUrl(newsTopic)}" target="_blank" rel="noopener">Google Haberler'de "${esc(newsTopic)}" aramasını açın →</a></div>`; });
  bind(el, '[data-t]', (d) => { newsTopic = d.t; refresh(); });
  bind(el, '[data-edit]', () => formModal({
    title: 'Haber konuları', values: { topics: topics.join('\n') },
    fields: [{ k: 'topics', label: 'Her satıra bir konu', type: 'textarea', full: true }],
    onSave: (v) => { s.settings.newsTopics = v.topics.split('\n').map((x) => x.trim()).filter(Boolean); commit(); },
  }));
}

// ======================= NOT DEFTERİ =======================
export function notesView(el) {
  const s = st();
  el.innerHTML = head('Not Defteri', 'Kiracı görüşmeleri, tamir notları, hatırlatmalar — sürekli defteriniz',
    `<button class="btn btn-primary" data-new>${icon('plus')} Not ekle</button>`) +
  (s.notes.length ? `<div class="grid g-3">${s.notes.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((n) => `<div class="card prop-card" data-edit="${n.id}">
    <div class="card-head" style="margin:0"><h3>${esc(n.title)}</h3><small>${date(n.date)}</small></div>
    ${n.propertyId ? `<span class="pill" style="align-self:flex-start">${esc(byId(s.properties, n.propertyId)?.name || '')}</span>` : ''}
    <p style="margin:0;color:var(--text-2);white-space:pre-wrap">${esc((n.body || '').slice(0, 400))}</p></div>`).join('')}</div>`
    : `<div class="card">${emptyState('book', 'Henüz not yok', `<button class="btn btn-primary" data-new>${icon('plus')} İlk notu yaz</button>`)}</div>`);
  bind(el, '[data-new]', () => editNote());
  bind(el, '[data-edit]', (d) => editNote(byId(s.notes, d.edit)));
}

// ======================= AYARLAR =======================
export function settingsView(el, { onLock }) {
  const s = st(), cfg = s.settings;
  const years = Object.keys(cfg.tax).sort();
  el.innerHTML = head('Ayarlar', 'Vergi parametreleri, güvenlik ve yedekleme') + `
  <div class="grid g-2">
    <div class="card"><div class="card-head"><h3>Genel</h3></div>
      <div class="form-grid">
        <div class="field"><label>Adınız</label><input type="text" data-s="name" value="${esc(cfg.name)}"></div>
        <div class="field"><label>Otomatik kilit (dakika)</label><input type="number" data-s="autoLockMin" value="${esc(cfg.autoLockMin)}"></div>
        <div class="field"><label>TÜFE 12 aylık ortalama (%)</label><input type="number" step="0.01" data-s="tufe12" value="${esc(cfg.tufe12)}"><span class="hint">Yasal azami kira artış oranı · TÜİK her ayın 3'ünde açıklar</span></div>
        <div class="field"><label>Oranın ait olduğu ay</label><input type="text" data-s="tufeLabel" value="${esc(cfg.tufeLabel)}"></div>
        <div class="field"><label>İşyeri stopaj oranı (%)</label><input type="number" data-s="stopajRate" value="${esc(cfg.stopajRate)}"></div>
        <div class="field"><label>Diğer gelirlerin brüt toplamı (₺/yıl)</label><input type="number" data-s="otherIncomeGross" value="${esc(cfg.otherIncomeGross)}"><span class="hint">Maaş vb. — konut istisnası şartı için</span></div>
        <label class="check full"><input type="checkbox" data-s="istisnaEligible" ${cfg.istisnaEligible ? 'checked' : ''}> Konut kira istisnasından yararlanabilirim (ticari/mesleki kazancım yok)</label>
      </div></div>
    <div class="card"><div class="card-head"><h3>Güvenlik & yedek</h3></div>
      <div class="note blue" style="margin-bottom:12px">${icon('lock')} Tüm verileriniz bu cihazda <b>AES-256-GCM</b> ile şifreli saklanır. Şifrenizi unutursanız veriler kurtarılamaz — düzenli yedek alın. Başka cihazda kullanmak için yedeği o cihaza yükleyin.</div>
      <div class="actions">
        <button class="btn" data-a="pw">${icon('lock')} Şifre değiştir</button>
        <button class="btn btn-primary" data-a="export">${icon('download')} Şifreli yedek indir</button>
        <button class="btn" data-a="import">${icon('upload')} Yedekten yükle</button>
        <button class="btn" data-a="lock">${icon('logout')} Kilitle</button>
      </div>
      <p class="muted" style="font-size:12px">Son kayıt: ${s.updatedAt ? new Date(s.updatedAt).toLocaleString('tr-TR') : '—'}</p>
      <h4 style="margin:18px 0 8px">Veri</h4>
      <div class="actions"><button class="btn" data-a="demo">Örnek veri yükle</button><button class="btn btn-danger" data-a="clear">Tüm kayıtları temizle</button><button class="btn btn-danger" data-a="wipe">Kasayı sil (şifre dahil)</button></div>
      <input type="file" id="impFile" accept=".json" hidden></div>
  </div>
  <div class="card mt"><div class="card-head"><div><h3>Vergi parametreleri</h3><small>Her yıl Ocak ayında güncellenir (Gelir Vergisi Genel Tebliği)</small></div><button class="btn btn-sm" data-a="year">${icon('plus')} Yıl ekle</button></div>
    <div class="table-wrap"><table><thead><tr><th>Yıl</th><th>Dilim sınırları (₺) — oranlar %15/20/27/35/40</th><th>Konut istisnası</th><th>Stopajlı beyan sınırı</th><th>İstisna gelir eşiği</th></tr></thead><tbody>
    ${years.map((y) => { const p = cfg.tax[y]; return `<tr><td><b>${y}</b></td>
      <td><input type="text" data-tax="${y}" data-f="br" value="${p.brackets.filter((b) => b[0]).map((b) => b[0]).join(', ')}"></td>
      <td><input type="number" data-tax="${y}" data-f="istisna" value="${p.istisna}"></td>
      <td><input type="number" data-tax="${y}" data-f="beyanSiniri" value="${p.beyanSiniri}"></td>
      <td><input type="number" data-tax="${y}" data-f="istisnaGelirSiniri" value="${p.istisnaGelirSiniri}"></td></tr>`; }).join('')}
    </tbody></table></div></div>
  <p class="muted" style="text-align:center;margin-top:24px;font-size:12px">Kasa v1.0 · Veriler yalnızca bu cihazda, şifreli · <a href="https://github.com" target="_blank" rel="noopener">GitHub</a></p>`;
  el.querySelectorAll('[data-s]').forEach((i) => i.addEventListener('change', () => {
    const k = i.dataset.s;
    cfg[k] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? Number(i.value) : i.value;
    S.save(); toast('Kaydedildi');
    if (k === 'name') document.getElementById('userName').textContent = cfg.name || 'Kasa';
  }));
  el.querySelectorAll('[data-tax]').forEach((i) => i.addEventListener('change', () => {
    const p = cfg.tax[i.dataset.tax];
    if (i.dataset.f === 'br') {
      const lims = i.value.split(',').map((x) => Number(x.replace(/[^\d]/g, ''))).filter(Boolean);
      const r = [0.15, 0.20, 0.27, 0.35, 0.40];
      p.brackets = [...lims.slice(0, 4).map((l, j) => [l, r[j]]), [null, 0.40]];
    } else p[i.dataset.f] = Number(i.value);
    S.save(); toast('Vergi parametresi güncellendi');
  }));
  const act = {
    pw: () => formModal({
      title: 'Şifre değiştir', values: {},
      fields: [{ k: 'old', label: 'Mevcut şifre', type: 'password', req: true, full: true }, { k: 'n1', label: 'Yeni şifre (min 8)', type: 'password', req: true }, { k: 'n2', label: 'Yeni şifre tekrar', type: 'password', req: true }],
      onSave: async (v) => {
        if (v.n1.length < 8) { toast('Şifre en az 8 karakter olmalı', true); return false; }
        if (v.n1 !== v.n2) { toast('Şifreler eşleşmiyor', true); return false; }
        try { await S.changePassword(v.old, v.n1); toast('Şifre değiştirildi'); } catch (e) { toast(e.message, true); return false; }
      },
    }),
    export: async () => download(await S.exportBackup(), `kasa-yedek-${todayISO()}.json`),
    import: () => el.querySelector('#impFile').click(),
    lock: () => onLock(),
    demo: async () => { if (await confirmBox('Mevcut verilere örnek mülk, kiracı ve kayıtlar eklenecek (mevcut kayıtların yerine geçer).', 'Yükle')) { Object.assign(S.state, demoState({ ...defaultState(), settings: S.state.settings })); commit(); toast('Örnek veriler yüklendi'); } },
    clear: async () => { if (await confirmBox('Tüm mülk, kiracı, defter, borç, varlık ve notlar silinecek. Ayarlar ve şifre korunur.', 'Temizle')) { const d = defaultState(); for (const k of ['properties', 'tenants', 'ledger', 'debts', 'contracts', 'assets', 'notes']) S.state[k] = d[k]; commit(); toast('Temizlendi'); } },
    wipe: async () => { if (await confirmBox('Kasa bu cihazdan tamamen silinecek (şifre ve belgeler dahil). Yedeğiniz yoksa geri alınamaz!', 'Kalıcı olarak sil')) { await S.wipe(); location.reload(); } },
    year: () => { const y = String(Math.max(...years.map(Number)) + 1); cfg.tax[y] = JSON.parse(JSON.stringify(cfg.tax[years[years.length - 1]])); commit(); toast(`${y} eklendi — değerleri güncelleyin`); },
  };
  bind(el, '[data-a]', (d) => act[d.a]());
  el.querySelector('#impFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!(await confirmBox('Bu cihazdaki mevcut kasa, yedekteki veriyle değiştirilecek. Yedeğin şifresiyle giriş yapmanız gerekecek.', 'Geri yükle'))) return;
    try { await S.importBackup(await f.text()); location.reload(); } catch (err) { toast(err.message, true); }
  });
}
export { PALETTE, collectRent };
