// Ev & mülk ekranları: ev paneli, mülkler, kiracılar, zam & verim, sözleşmeler, vergi.
import * as S from './store.js';
import { icon, esc, money, compact, pct, date, MONTHS, ym, lineChart, donut, barList, emptyState, modal, trend, toast } from './ui.js';
import { byId, activeTenant, rentInfo, paidPeriods, tenantActiveIn, monthly, lastMonths, cash, taxCalc, debtInfo, DEDUCTIBLE } from './domain.js';
import { editProperty, editTenant, applyIncrease, editEntry, collectRent, uploadContract, viewContract, commit, refresh } from './editors.js';

const st = () => S.state;
const tl = (p) => (p?.type === 'isyeri' ? 'İşyeri' : 'Konut');
const propIcon = (p) => `<span class="ico ${p.type === 'isyeri' ? 'blue' : ''}">${icon(p.type === 'isyeri' ? 'store' : 'home')}</span>`;
const valueOf = (p) => Number(p.currentValue) || Number(p.purchasePrice) || 0;

export function kpi(ic, cls, label, value, sub = '', badge = '') {
  return `<div class="card kpi"><div class="kpi-top"><span class="ico ${cls}">${icon(ic)}</span>${label}</div>
    <div class="kpi-val">${value} ${badge}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;
}
export function head(title, sub, actions = '') {
  return `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="actions">${actions}</div></div>`;
}
function bind(el, sel, fn) { el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); fn(b.dataset, b, e); })); }

// Bu ay tahsil edilmemiş kiralar
export function unpaidThisMonth(s) {
  const period = ym();
  const today = new Date().getDate();
  return s.tenants.filter((t) => t.active !== false && tenantActiveIn(t, period) && !paidPeriods(s, t.id).has(period))
    .map((t) => ({ t, late: today > (Number(t.paymentDay) || 5) }));
}

// ======================= EV PANELİ =======================
export function evPanel(el) {
  const s = st();
  const months = lastMonths(12);
  const m = monthly(s.ledger, 'ev', months);
  const cur = m[11], prev = m[10];
  const active = s.tenants.filter((t) => t.active !== false);
  const monthlyRent = active.reduce((a, t) => a + (Number(t.rent) || 0), 0);
  const tax = taxCalc(s, new Date().getFullYear(), 'projected');
  const evDebt = s.debts.filter((d) => d.scope === 'ev' && !debtInfo(d).done);
  const evDebtMonthly = evDebt.reduce((a, d) => a + debtInfo(d).inst, 0);
  const groups = ['konut', 'isyeri'].map((type) => {
    const props = s.properties.filter((p) => p.type === type);
    const rented = props.filter((p) => activeTenant(s, p.id));
    const rent = rented.reduce((a, p) => a + Number(activeTenant(s, p.id).rent || 0), 0);
    const val = props.reduce((a, p) => a + valueOf(p), 0);
    return { type, props, rented, rent, val, yieldY: val ? (rent * 12) / val : 0 };
  });
  const unpaid = unpaidThisMonth(s);
  const year = String(new Date().getFullYear());
  const expCats = {};
  s.ledger.filter((e) => e.scope === 'ev' && e.type === 'gider' && e.date?.startsWith(year)).forEach((e) => { expCats[e.cat] = (expCats[e.cat] || 0) + e.amount; });

  el.innerHTML = head('Ev & Mülk Paneli', 'Kiraya verilen evler ve dükkanların genel durumu',
    `<button class="btn" data-go="#/defter/ev">${icon('book')} Ev defteri</button><button class="btn btn-primary" data-add>${icon('plus')} Kayıt ekle</button>`) + `
  <div class="grid g-4">
    ${kpi('coins', '', 'Aylık kira geliri', money(monthlyRent), `${active.length} aktif kiracı · brüt`)}
    ${kpi('pulse', 'green', 'Bu ay net nakit', money(cur.net), `Gelir ${compact(cur.gelir)} · Gider ${compact(cur.gider)}`, trend(prev.net ? (cur.net - prev.net) / Math.abs(prev.net) : 0))}
    ${kpi('percent', 'purple', `Yıllık vergi yükü (tahmini)`, money(tax.totalBurden), `GV + stopaj + emlak vergisi · efektif ${pct(tax.effective)}`)}
    ${kpi('card', 'red', 'Ev borçları / ay', money(evDebtMonthly), `${evDebt.length} aktif borç`)}
  </div>
  <div class="grid g-2 mt">
    ${groups.map((g) => `<div class="card">
      <div class="card-head"><div style="display:flex;gap:12px;align-items:center">${propIcon({ type: g.type })}<div><h3>${g.type === 'konut' ? 'Evler' : 'Dükkanlar / İşyerleri'}</h3><small>${g.props.length} mülk · ${g.rented.length} kirada</small></div></div>
      <a class="btn btn-sm" href="#/mulkler/${g.type}">Tümü ${icon('arrow')}</a></div>
      <div class="prop-stats">
        <div><small>Aylık kira</small><b>${compact(g.rent)}</b></div>
        <div><small>Doluluk</small><b>${g.props.length ? Math.round((g.rented.length / g.props.length) * 100) : 0}%</b></div>
        <div><small>Brüt getiri</small><b>${g.val ? pct(g.yieldY) : '—'}</b></div>
      </div></div>`).join('')}
  </div>
  <div class="grid g-main mt">
    <div class="card"><div class="card-head"><div><h3>Ev nakit akışı</h3><small>Son 12 ay · stopaj sonrası</small></div>
      <div class="legend"><span style="color:var(--accent)"><i style="background:var(--accent)"></i>Gelir</span><span style="color:var(--cream)"><i style="background:var(--cream)"></i>Gider</span></div></div>
      <div id="evChart"></div></div>
    <div class="card"><div class="card-head"><div><h3>Bu ay tahsilat</h3><small>${date(new Date(), { month: 'long', year: 'numeric' })}</small></div>
      <span class="badge ${unpaid.length ? 'down' : 'up'}">${unpaid.length ? unpaid.length + ' bekliyor' : 'Tamamı tahsil edildi'}</span></div>
      <div class="sum-list">${unpaid.length ? unpaid.map(({ t, late }) => {
        const p = byId(s.properties, t.propertyId);
        return `<div class="sum-item" data-collect="${t.id}"><span class="ico ${late ? 'red' : ''}">${icon(late ? 'alert' : 'calendar')}</span>
          <div><div class="v">${money(t.rent)}</div><div class="l">${esc(t.name)} · ${esc(p?.name || '')}${late ? ' · <span class="neg">gecikti</span>' : ` · ayın ${t.paymentDay || 5}'i`}</div></div>
          <span class="go">${icon('check')}</span></div>`;
      }).join('') : emptyState('check', 'Bu ayın tüm kiraları tahsil edildi 🎉')}</div></div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><h3>Gider dağılımı (${year})</h3></div><div id="evDonut"></div></div>
    <div class="card"><div class="card-head"><h3>Mülk bazında yıllık net</h3><small>${year} · gelir − gider</small></div>
      ${barList(s.properties.map((p) => ({ label: p.name, value: s.ledger.filter((e) => e.propertyId === p.id && e.date?.startsWith(year)).reduce((a, e) => a + (e.type === 'gelir' ? cash(e) : -e.amount), 0) }))
        .sort((a, b) => b.value - a.value)) || emptyState('building', 'Henüz mülk yok')}</div>
  </div>`;
  lineChart(el.querySelector('#evChart'), {
    labels: months.map((x) => MONTHS[+x.slice(5) - 1]),
    series: [{ name: 'Gelir', color: '#ff5a1f', values: m.map((x) => x.gelir), area: true }, { name: 'Gider', color: '#ffc27a', values: m.map((x) => x.gider) }],
    tipTitle: (i) => date(months[i], { month: 'long', year: 'numeric' }),
  });
  donut(el.querySelector('#evDonut'), Object.entries(expCats).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })), { center: 'Toplam gider' });
  bind(el, '[data-collect]', (d) => collectRent(byId(s.tenants, d.collect), ym()));
  bind(el, '[data-add]', () => editEntry(null, 'ev'));
  bind(el, '[data-go]', (d) => { location.hash = d.go; });
}

// ======================= MÜLKLER =======================
export function properties(el, type = 'konut') {
  const s = st();
  const props = s.properties.filter((p) => p.type === type);
  const year = String(new Date().getFullYear());
  el.innerHTML = head(type === 'konut' ? 'Evler' : 'Dükkanlar & İşyerleri', type === 'konut' ? 'Kiraya verilen konutlarınız' : 'Kiraya verilen dükkan, ofis ve işyerleriniz',
    `<div class="seg"><button class="${type === 'konut' ? 'on' : ''}" data-t="konut">Evler</button><button class="${type === 'isyeri' ? 'on' : ''}" data-t="isyeri">Dükkanlar</button></div>
     <button class="btn btn-primary" data-new>${icon('plus')} ${type === 'konut' ? 'Ev ekle' : 'Dükkan ekle'}</button>`) +
  (props.length ? `<div class="grid g-3">${props.map((p) => {
    const t = activeTenant(s, p.id);
    const ri = t ? rentInfo(t, s) : null;
    const inc = s.ledger.filter((e) => e.propertyId === p.id && e.type === 'gelir' && e.date?.startsWith(year)).reduce((a, e) => a + cash(e), 0);
    const exp = s.ledger.filter((e) => e.propertyId === p.id && e.type === 'gider' && e.date?.startsWith(year)).reduce((a, e) => a + e.amount, 0);
    const v = valueOf(p);
    return `<div class="card prop-card" data-open="${p.id}">
      <div class="prop-top">${propIcon(p)}<div style="min-width:0"><h3>${esc(p.name)}</h3><small>${esc(p.city || '')}${p.m2 ? ' · ' + p.m2 + ' m²' : ''}</small></div>
        <span style="margin-left:auto" class="badge ${t ? 'up' : 'down'}">${t ? 'Kirada' : 'Boş'}</span></div>
      ${t ? `<div class="kv" style="border:0;padding:0"><span>${icon('user')} ${esc(t.name)}</span><b>${money(t.rent)}/ay</b></div>` : `<div class="note red">Boş mülk${p.marketRent ? ` · aylık ~${money(p.marketRent)} potansiyel kayıp` : ''}</div>`}
      <div class="prop-stats">
        <div><small>${year} net</small><b class="${inc - exp >= 0 ? '' : 'neg'}">${compact(inc - exp)}</b></div>
        <div><small>Brüt getiri</small><b>${t && v ? pct((t.rent * 12) / v) : '—'}</b></div>
        <div><small>Yenileme</small><b>${ri?.next ? date(ri.next, { day: '2-digit', month: 'short' }) : '—'}</b></div>
      </div>
      ${ri?.due ? `<div class="note">${icon('bolt')} Zam dönemi geldi · azami ${money(ri.maxNew)}</div>` : ''}
    </div>`;
  }).join('')}</div>` : `<div class="card">${emptyState(type === 'konut' ? 'home' : 'store', type === 'konut' ? 'Henüz ev eklemediniz' : 'Henüz dükkan eklemediniz', `<button class="btn btn-primary" data-new>${icon('plus')} Ekle</button>`)}</div>`);
  bind(el, '[data-t]', (d) => { location.hash = '#/mulkler/' + d.t; });
  bind(el, '[data-new]', () => editProperty(null, type));
  el.querySelectorAll('[data-open]').forEach((c) => c.addEventListener('click', () => propertyDetail(byId(s.properties, c.dataset.open))));
}

export function propertyDetail(p) {
  const s = st();
  const t = activeTenant(s, p.id);
  const ri = t ? rentInfo(t, s) : null;
  const entries = s.ledger.filter((e) => e.propertyId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  const docs = s.contracts.filter((c) => c.propertyId === p.id);
  const past = s.tenants.filter((x) => x.propertyId === p.id && x !== t);
  const v = valueOf(p);
  const m = modal({
    title: `${p.type === 'konut' ? '🏠' : '🏪'} ${esc(p.name)}`, wide: true,
    body: `<div class="grid g-2">
      <div><h4 style="margin-bottom:8px">Mülk bilgileri</h4>
        <div class="kv"><span>Tür</span><b>${tl(p)}</b></div>
        <div class="kv"><span>Adres</span><b>${esc(p.address || '—')}</b></div>
        <div class="kv"><span>m²</span><b>${p.m2 || '—'}</b></div>
        <div class="kv"><span>Güncel değer</span><b>${v ? money(v) : '—'}</b></div>
        <div class="kv"><span>Emsal kira</span><b>${p.marketRent ? money(p.marketRent) : '—'}</b></div>
        <div class="kv"><span>Emlak vergisi (yıllık)</span><b>${p.emlakVergisi ? money(p.emlakVergisi) : '—'}</b></div>
        <div class="kv"><span>Aidat</span><b>${p.aidat ? money(p.aidat) : '—'}</b></div>
        ${p.tapu ? `<div class="kv"><span>Tapu</span><b>${esc(p.tapu)}</b></div>` : ''}
        ${p.dask ? `<div class="kv"><span>DASK bitiş</span><b class="${new Date(p.dask) < new Date() ? 'neg' : ''}">${date(p.dask)}</b></div>` : ''}
        ${p.notes ? `<p class="muted">${esc(p.notes)}</p>` : ''}
      </div>
      <div><h4 style="margin-bottom:8px">Kiracı</h4>${t ? `
        <div class="kv"><span>Ad</span><b>${esc(t.name)}</b></div>
        <div class="kv"><span>Telefon</span><b>${t.phone ? `<a href="tel:${esc(t.phone)}">${esc(t.phone)}</a>` : '—'}</b></div>
        <div class="kv"><span>Kira</span><b>${money(t.rent)}${t.stopaj ? ' <small>(stopajlı)</small>' : ''}</b></div>
        <div class="kv"><span>Başlangıç</span><b>${date(t.startDate)} · ${ri.years.toFixed(1)} yıl</b></div>
        <div class="kv"><span>Sonraki yenileme</span><b>${date(ri.next)} ${ri.daysToNext != null ? `<small>(${ri.daysToNext} gün)</small>` : ''}</b></div>
        <div class="kv"><span>Azami yasal yeni kira</span><b class="acc">${money(ri.maxNew)}</b></div>
        <div class="actions mt"><button class="btn btn-sm" data-et>${icon('edit')} Kiracı</button><button class="btn btn-sm btn-primary" data-inc>${icon('trend')} Zam uygula</button></div>`
        : `${emptyState('user', 'Bu mülk şu an boş')}<div class="actions" style="justify-content:center"><button class="btn btn-primary btn-sm" data-nt>${icon('plus')} Kiracı ekle</button></div>`}
        ${past.length ? `<h4 style="margin:16px 0 6px">Eski kiracılar</h4>${past.map((x) => `<div class="kv"><span>${esc(x.name)}</span><b>${date(x.startDate)} – ${date(x.endDate)}</b></div>`).join('')}` : ''}
      </div></div>
      <h4 style="margin:18px 0 8px">Belgeler</h4>
      <div class="files" id="pDocs">${docs.map((c) => `<div class="file" data-doc="${c.id}"><div class="thumb">${icon((c.mime || '').includes('pdf') ? 'file' : 'image')}</div><div class="meta"><b>${esc(c.title)}</b><small>${esc(c.kind || '')}</small></div></div>`).join('')}
        <div class="file drop" data-up style="display:grid;place-items:center">${icon('upload')}<small>Yükle</small></div></div>
      <h4 style="margin:18px 0 8px">Son hareketler</h4>
      <div class="table-wrap"><table><tbody>${entries.slice(0, 8).map((e) => `<tr><td class="nowrap">${date(e.date)}</td><td>${esc(e.cat)}<div class="cell-sub">${esc(e.note || '')}</div></td>
        <td class="right num ${e.type === 'gelir' ? 'pos' : 'neg'}">${e.type === 'gelir' ? '+' : '−'}${money(cash(e))}</td></tr>`).join('') || '<tr><td class="muted">Kayıt yok</td></tr>'}</tbody></table></div>`,
    foot: `<button class="btn" data-ep>${icon('edit')} Mülkü düzenle</button><button class="btn" data-exp>${icon('receipt')} Gider ekle</button><span class="spacer"></span><button class="btn" data-close>Kapat</button>`,
  });
  const close = () => m.close();
  bind(m.el, '[data-ep]', () => { close(); editProperty(p); });
  bind(m.el, '[data-exp]', () => { close(); editEntry(null, 'ev', { type: 'gider', propertyId: p.id }); });
  bind(m.el, '[data-et]', () => { close(); editTenant(t); });
  bind(m.el, '[data-nt]', () => { close(); editTenant(null, p.id); });
  bind(m.el, '[data-inc]', () => { close(); applyIncrease(t); });
  bind(m.el, '[data-up]', () => { close(); uploadContract({ propertyId: p.id, tenantId: t?.id || '' }); });
  bind(m.el, '[data-doc]', (d) => viewContract(byId(s.contracts, d.doc)));
  loadThumbs(m.el);
}

async function loadThumbs(root) {
  for (const f of root.querySelectorAll('[data-doc]')) {
    const c = byId(st().contracts, f.dataset.doc);
    if (!c || !(c.mime || '').startsWith('image/')) continue;
    const blob = await S.getFile(c.id);
    if (blob && document.contains(f)) f.querySelector('.thumb').innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="">`;
  }
}

// ======================= KİRACILAR =======================
let tenantYear = new Date().getFullYear();
let tenantFilter = 'active';
export function tenants(el) {
  const s = st();
  const list = s.tenants.filter((t) => tenantFilter === 'all' || (t.active !== false) === (tenantFilter === 'active'));
  const now = ym();
  el.innerHTML = head('Kiracılar', 'Kiracı bilgileri, sözleşmeler ve aylık tahsilat takibi',
    `<div class="seg">${[['active', 'Aktif'], ['past', 'Eski'], ['all', 'Tümü']].map(([k, l]) => `<button class="${tenantFilter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
     <div class="seg"><button data-y="-1">‹</button><button class="on">${tenantYear}</button><button data-y="1">›</button></div>
     <button class="btn btn-primary" data-new>${icon('plus')} Kiracı ekle</button>`) +
  `<div class="note blue" style="margin-bottom:14px">${icon('info')} Ay kutucuğuna dokunarak kirayı tahsil edildi olarak işaretleyin — kayıt otomatik olarak Ev Defteri'ne işlenir. Kırmızı: gecikmiş.</div>` +
  (list.length ? `<div class="grid g-2">${list.map((t) => {
    const p = byId(s.properties, t.propertyId);
    const ri = rentInfo(t, s);
    const paid = paidPeriods(s, t.id);
    const today = new Date();
    const cells = MONTHS.map((mn, i) => {
      const period = `${tenantYear}-${String(i + 1).padStart(2, '0')}`;
      if (!tenantActiveIn(t, period)) return `<div class="pay-cell off">${mn}</div>`;
      const isPaid = paid.has(period);
      const late = !isPaid && (period < now || (period === now && today.getDate() > (Number(t.paymentDay) || 5)));
      return `<div class="pay-cell ${isPaid ? 'paid' : late ? 'late' : period > now ? 'future' : ''}" data-pay="${t.id}" data-period="${period}" title="${period}">${isPaid ? '✓' : mn}</div>`;
    }).join('');
    return `<div class="card">
      <div class="card-head"><div style="display:flex;gap:12px;align-items:center;min-width:0"><span class="avatar">${esc(t.name.slice(0, 1))}</span>
        <div style="min-width:0"><h3>${esc(t.name)}</h3><small>${esc(p?.name || 'Mülk yok')} · ${tl(p)}${t.stopaj ? ' · stopajlı' : ''}</small></div></div>
        <div class="row-actions"><button data-edit="${t.id}" title="Düzenle">${icon('edit')}</button>${t.phone ? `<a class="btn btn-sm btn-ghost" href="tel:${esc(t.phone)}" title="Ara">${icon('bolt')}</a>` : ''}</div></div>
      <div class="prop-stats" style="margin-bottom:12px">
        <div><small>Aylık kira</small><b>${money(t.rent)}</b></div>
        <div><small>Süre</small><b>${ri.years.toFixed(1)} yıl</b></div>
        <div><small>Yenileme</small><b>${ri.next ? date(ri.next, { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</b></div>
      </div>
      <div class="pay-grid">${cells}</div>
      <div class="actions mt" style="justify-content:space-between">
        <small>${t.phone ? esc(t.phone) : ''}${t.deposit ? ` · Depozito ${money(t.deposit)}` : ''}</small>
        ${ri.due ? `<button class="btn btn-sm btn-primary" data-inc="${t.id}">${icon('trend')} Zam zamanı · ${money(ri.maxNew)}</button>` : `<button class="btn btn-sm" data-inc="${t.id}">${icon('trend')} Zam</button>`}
      </div></div>`;
  }).join('')}</div>` : `<div class="card">${emptyState('users', 'Kiracı bulunamadı', `<button class="btn btn-primary" data-new>${icon('plus')} Kiracı ekle</button>`)}</div>`);
  bind(el, '[data-f]', (d) => { tenantFilter = d.f; refresh(); });
  bind(el, '[data-y]', (d) => { tenantYear += Number(d.y); refresh(); });
  bind(el, '[data-new]', () => (s.properties.length ? editTenant() : toast('Önce bir mülk ekleyin', true)));
  bind(el, '[data-edit]', (d) => editTenant(byId(s.tenants, d.edit)));
  bind(el, '[data-inc]', (d) => applyIncrease(byId(s.tenants, d.inc)));
  bind(el, '[data-pay]', (d) => collectRent(byId(s.tenants, d.pay), d.period));
}

// ======================= ZAM & VERİM =======================
export function verim(el) {
  const s = st();
  const tufe = Number(s.settings.tufe12) || 0;
  const rows = s.tenants.filter((t) => t.active !== false).map((t) => {
    const p = byId(s.properties, t.propertyId) || {};
    return { t, p, ri: rentInfo(t, s) };
  }).sort((a, b) => (a.ri.daysToNext ?? 9999) - (b.ri.daysToNext ?? 9999));
  const cur = rows.reduce((a, r) => a + r.ri.rent, 0);
  const after = rows.reduce((a, r) => a + r.ri.maxNew, 0);
  const vacant = s.properties.filter((p) => !activeTenant(s, p.id));
  const vacantLoss = vacant.reduce((a, p) => a + (Number(p.marketRent) || 0), 0);
  const totalVal = s.properties.reduce((a, p) => a + valueOf(p), 0);

  const tips = [];
  for (const { t, p, ri } of rows) {
    if (ri.due) tips.push(['acc', 'bolt', `<b>${esc(p.name)}</b>: Kira yılı yenilendi, zam yapılmamış. Yasal azami yeni kira <b>${money(ri.maxNew)}</b> (+${money(ri.maxInc)}/ay, yıllık +${money(ri.maxInc * 12)}).`]);
    else if (ri.daysToNext != null && ri.daysToNext <= 60) tips.push(['blue', 'calendar', `<b>${esc(p.name)}</b>: ${ri.daysToNext} gün sonra yenileme. Kiracıya yazılı (WhatsApp/SMS/ihtar) bildirim yaparak %${tufe} artış uygulayabilirsiniz → ${money(ri.maxNew)}.`]);
    if (p.marketRent && ri.rent < p.marketRent * 0.85) {
      const gap = 1 - ri.rent / p.marketRent;
      if (ri.five) tips.push(['green', 'shield', `<b>${esc(p.name)}</b>: Kira emsalin %${Math.round(gap * 100)} altında ve sözleşme 5 yılı doldurdu. TBK 344/3 uyarınca <b>kira tespit davası</b> ile emsal kiraya (~${money(p.marketRent)}) yaklaşılabilir. Önce arabuluculuk zorunludur.`]);
      else tips.push(['', 'info', `<b>${esc(p.name)}</b>: Kira emsalin %${Math.round(gap * 100)} altında. ${(5 - ri.years).toFixed(1)} yıl sonra kira tespit davası hakkı doğar; bu süreçte her yıl azami yasal artışı uygulamak farkı kapatmaya yardımcı olur.`]);
    }
    if (ri.ten && p.type === 'konut') tips.push(['red', 'alert', `<b>${esc(p.name)}</b>: 10 yıllık uzama süresi doldu. TBK 347 gereği, uzama yılının bitiminden en az 3 ay önce bildirimle sözleşmeyi sebep göstermeksizin sona erdirebilir veya yeniden pazarlık yapabilirsiniz.`]);
    if (p.type === 'isyeri' && !t.stopaj) tips.push(['blue', 'info', `<b>${esc(p.name)}</b>: İşyeri kiracınız stopaj kesmiyor (şahıs kiracı). Bu gelir tutarı ne olursa olsun beyana tabidir.`]);
  }
  for (const p of vacant) tips.push(['red', 'home', `<b>${esc(p.name)}</b> boş${p.marketRent ? ` — ayda ~${money(p.marketRent)}, yılda ~${money(p.marketRent * 12)} kayıp` : ''}. Emsal kira girin ve ilan verin.`]);
  const tax = taxCalc(s, new Date().getFullYear(), 'projected');
  if (tax.gercek.payable < tax.gotur.payable - 1000) tips.push(['green', 'receipt', `Gerçek gider yöntemi bu yıl ~${money(tax.gotur.payable - tax.gercek.payable)} daha az vergi çıkarıyor. Faturalarınızı saklayın (götürü gider seçilirse 2 yıl değiştirilemez).`]);
  if (tax.marginal >= 0.27) tips.push(['', 'percent', `Kira geliriniz %${Math.round(tax.marginal * 100)} vergi dilimine ulaşıyor. Mülklerin bir kısmının eş/aile üyeleri adına olması (hisseli mülkiyet) vergi yükünü dağıtabilir — mali müşavirinize danışın.`]);

  el.innerHTML = head('Zam & Verim', `Yasal azami artış: TÜFE 12 aylık ortalama <b class="acc">%${tufe}</b> (${esc(s.settings.tufeLabel || '')}) · Ayarlardan güncelleyebilirsiniz`,
    `<button class="btn" data-go="#/ayarlar">${icon('gear')} Oranı güncelle</button>`) + `
  <div class="grid g-4">
    ${kpi('coins', '', 'Mevcut aylık kira', money(cur), `${rows.length} kiracı`)}
    ${kpi('trend', 'green', 'Azami zamla aylık', money(after), `+${money(after - cur)} / ay`)}
    ${kpi('bolt', 'blue', 'Yıllık ek potansiyel', money((after - cur) * 12), 'Tüm yenilemelerde azami zamla')}
    ${kpi('home', 'red', 'Boş mülk kaybı', money(vacantLoss), `${vacant.length} boş mülk / ay`)}
  </div>
  <div class="grid g-main mt">
    <div class="card"><div class="card-head"><div><h3>Yenileme takvimi & azami kira</h3><small>En yakın yenilemeden sıralı</small></div></div>
      <div class="table-wrap"><table><thead><tr><th>Mülk / Kiracı</th><th class="right">Mevcut</th><th class="hide-sm">Yenileme</th><th class="right">Azami yasal</th><th class="right hide-sm">Emsal</th><th></th></tr></thead><tbody>
      ${rows.map(({ t, p, ri }) => `<tr><td><div class="cell-main">${esc(p.name || '—')}</div><div class="cell-sub">${esc(t.name)} · ${ri.years.toFixed(1)} yıl${ri.five ? ' · <span class="acc">5+ yıl</span>' : ''}</div></td>
        <td class="right num">${money(ri.rent)}</td>
        <td class="hide-sm nowrap">${date(ri.next)}<div class="cell-sub">${ri.due ? '<span class="neg">zam yapılmadı</span>' : ri.daysToNext != null ? ri.daysToNext + ' gün' : ''}</div></td>
        <td class="right num acc">${money(ri.maxNew)}<div class="cell-sub">+${money(ri.maxInc)}</div></td>
        <td class="right num hide-sm">${p.marketRent ? money(p.marketRent) : '—'}${p.marketRent ? `<div class="cell-sub ${ri.rent < p.marketRent ? 'neg' : 'pos'}">${pct(ri.rent / p.marketRent - 1)}</div>` : ''}</td>
        <td class="right"><button class="btn btn-sm ${ri.due ? 'btn-primary' : ''}" data-inc="${t.id}">Zam</button></td></tr>`).join('') || `<tr><td colspan="6">${emptyState('users', 'Aktif kiracı yok')}</td></tr>`}
      </tbody></table></div></div>
    <div class="card"><div class="card-head"><h3>Kira artış hesaplayıcı</h3></div>
      <div class="field"><label>Mevcut kira (₺)</label><input type="number" id="cRent" value="${rows[0]?.ri.rent || 25000}" inputmode="decimal"></div>
      <div class="field"><label>Artış oranı (%)</label><input type="number" id="cRate" value="${tufe}" step="0.01" inputmode="decimal"></div>
      <div class="kv"><span>Yeni kira</span><b id="cNew"></b></div>
      <div class="kv"><span>Aylık fark</span><b id="cDiff"></b></div>
      <div class="kv total"><span>Yıllık ek gelir</span><b id="cYear"></b></div>
      <div class="note mt"><small>TBK 344: Konut ve çatılı işyeri kiralarında yıllık artış, önceki kira yılının <b>TÜFE 12 aylık ortalamasını</b> aşamaz (%25 sınırı 1 Temmuz 2024'te sona erdi). Artış yapılmazsa bir sonraki yıl geriye dönük talep edilemez.</small></div>
    </div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h3>Maksimum verim önerileri</h3><small>Verilerinize göre otomatik üretilir</small></div></div>
      <div class="tips">${tips.map(([c, ic, txt]) => `<div class="note ${c}" style="display:flex;gap:10px">${icon(ic)}<div>${txt}</div></div>`).join('') || '<p class="muted">Şimdilik öneri yok — mülk ve kiracı ekledikçe burası dolacak.</p>'}</div></div>
    <div class="card"><div class="card-head"><div><h3>Brüt kira getirisi (yıllık)</h3><small>Yıllık kira ÷ mülk değeri · toplam portföy ${compact(totalVal)}</small></div></div>
      ${barList(s.properties.map((p) => { const t = activeTenant(s, p.id); const v = valueOf(p); return { label: p.name, value: t && v ? (t.rent * 12) / v : 0, text: t && v ? pct((t.rent * 12) / v) : '—', cls: p.type === 'isyeri' ? 'blue' : '' }; }).sort((a, b) => b.value - a.value), { fmt: (v) => pct(v) }) || emptyState('building', 'Mülk ekleyin')}
      <p class="muted" style="font-size:12px">Türkiye'de brüt kira getirisi genellikle %4–7 bandındadır. Düşük getirili mülkler için satış / yeniden değerlendirme düşünülebilir.</p></div>
  </div>`;
  const calc = () => {
    const r = Number(el.querySelector('#cRent').value) || 0, k = Number(el.querySelector('#cRate').value) || 0;
    el.querySelector('#cNew').textContent = money(r * (1 + k / 100));
    el.querySelector('#cDiff').textContent = '+' + money((r * k) / 100);
    el.querySelector('#cYear').textContent = '+' + money((r * k * 12) / 100);
  };
  el.querySelectorAll('#cRent,#cRate').forEach((i) => i.addEventListener('input', calc)); calc();
  bind(el, '[data-inc]', (d) => applyIncrease(byId(s.tenants, d.inc)));
  bind(el, '[data-go]', (d) => { location.hash = d.go; });
}

// ======================= SÖZLEŞMELER =======================
let docFilter = '';
export function contracts(el) {
  const s = st();
  const list = s.contracts.filter((c) => !docFilter || c.propertyId === docFilter).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  el.innerHTML = head('Sözleşmeler & Belgeler', 'Kira kontratları, tapu, makbuz fotoğrafları — hepsi şifreli saklanır',
    `<select id="docF" style="width:auto"><option value="">Tüm mülkler</option>${s.properties.map((p) => `<option value="${p.id}" ${docFilter === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
     <button class="btn btn-primary" data-up>${icon('upload')} Belge yükle</button>`) +
  `<div class="card">${list.length ? `<div class="files">${list.map((c) => {
    const p = byId(s.properties, c.propertyId), t = byId(s.tenants, c.tenantId);
    return `<div class="file" data-doc="${c.id}"><div class="thumb">${icon((c.mime || '').includes('pdf') ? 'file' : 'image')}</div>
      <div class="meta"><b>${esc(c.title)}</b><small>${esc(c.kind || '')} · ${date(c.date)}</small><small style="display:block">${esc(p?.name || '')}${t ? ' · ' + esc(t.name) : ''}</small></div></div>`;
  }).join('')}</div>` : emptyState('file', 'Henüz belge yüklenmedi. Kira kontratınızın fotoğrafını çekip yükleyebilirsiniz.', `<button class="btn btn-primary" data-up>${icon('upload')} Belge yükle</button>`)}</div>`;
  el.querySelector('#docF').addEventListener('change', (e) => { docFilter = e.target.value; refresh(); });
  bind(el, '[data-up]', () => uploadContract({ propertyId: docFilter }));
  bind(el, '[data-doc]', (d) => viewContract(byId(s.contracts, d.doc)));
  loadThumbs(el);
}

// ======================= VERGİ =======================
let taxYear = new Date().getFullYear();
let taxBasis = 'projected';
export function taxView(el) {
  const s = st();
  const years = Object.keys(s.settings.tax).map(Number).sort();
  if (!s.settings.tax[taxYear]) taxYear = years[years.length - 1];
  const r = taxCalc(s, taxYear, taxBasis);
  const c = r.chosen;
  const row = (l, v, cls = '') => `<div class="kv ${cls}"><span>${l}</span><b>${v}</b></div>`;
  const b = r.p.brackets;
  el.innerHTML = head('Vergi (GMSİ) — Kira Geliri', `${taxYear} yılı kira gelirleri · beyanname ${taxYear + 1} Mart ayında verilir`,
    `<div class="seg">${years.map((y) => `<button class="${y === taxYear ? 'on' : ''}" data-y="${y}">${y}</button>`).join('')}</div>
     <a class="btn" href="#/vergi-rehberi">${icon('shield')} İstisnalar rehberi</a>
     <div class="seg"><button class="${taxBasis === 'actual' ? 'on' : ''}" data-b="actual">Gerçekleşen</button><button class="${taxBasis === 'projected' ? 'on' : ''}" data-b="projected">Kontrat bazlı tahmin</button></div>`) + `
  <div class="grid g-4">
    ${kpi('coins', '', 'Brüt kira geliri', money(r.totalGross), `Konut ${compact(r.konut)} · İşyeri ${compact(r.isyeriStopajli + r.isyeriStopajsiz)}`)}
    ${kpi('receipt', 'blue', 'Vergi matrahı', money(r.mustDeclare ? c.matrah : 0), r.mustDeclare ? `${r.best === 'gercek' ? 'Gerçek' : 'Götürü'} gider ile · dilim %${Math.round(r.marginal * 100)}` : 'Beyan gerekmiyor')}
    ${kpi('percent', 'red', 'Ödenecek gelir vergisi', money(r.mustDeclare ? Math.max(0, c.payable) : 0), r.mustDeclare && c.payable < 0 ? `İade: ${money(-c.payable)}` : r.mustDeclare ? `2 taksit: ${money(Math.max(0, c.payable) / 2)} (Mart + Temmuz)` : 'İstisna / sınır altında')}
    ${kpi('shield', 'purple', 'Toplam yıllık vergi yükü', money(r.totalBurden), `GV + stopaj + emlak · efektif ${pct(r.effective)}`)}
  </div>
  ${r.mustDeclare ? `<div class="note red mt">${icon('alert')} <b>${taxYear} kira gelirleriniz için beyanname vermeniz gerekiyor.</b> Son gün: 31 Mart ${taxYear + 1}. GİB Hazır Beyan sistemi (hazirbeyan.gib.gov.tr) üzerinden verilebilir.</div>`
    : `<div class="note green mt">${icon('check')} Mevcut verilere göre ${taxYear} için kira geliri beyannamesi gerekmiyor.</div>`}
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><h3>Hesaplama detayı</h3><small>${taxBasis === 'actual' ? 'Defterdeki kira tahsilatlarına göre' : 'Aktif kontratlar × 12 ay'}</small></div>
      ${row('Konut kira geliri (brüt)', money(r.konut))}
      ${row(`Konut istisnası (${money(r.p.istisna)})`, r.eligible ? '−' + money(r.istisna) : '<span class="neg">Yararlanılamıyor</span>')}
      ${row('İşyeri kirası — stopajlı (brüt)', money(r.isyeriStopajli) + (r.isyeriStopajli ? (r.includeStopajli ? ' <small>beyana dahil</small>' : ' <small>sınır altı, beyan dışı</small>') : ''))}
      ${row('İşyeri kirası — stopajsız (şahıs kiracı)', money(r.isyeriStopajsiz))}
      ${row('Beyana tabi gayrisafi gelir', money(r.taxableGross))}
      ${row(`Gider (${r.best === 'gercek' ? 'gerçek gider' : 'götürü %15'})`, '−' + money(c.exp))}
      ${row('Matrah', money(c.matrah))}
      ${row('Hesaplanan gelir vergisi', money(c.tax))}
      ${row('Mahsup edilecek stopaj', '−' + money(c.credit))}
      ${row(c.payable >= 0 ? 'Ödenecek vergi' : 'İade alınacak', money(Math.abs(r.mustDeclare ? c.payable : 0)), 'total')}
      <div style="height:10px"></div>
      ${row('Kiracının kestiği stopaj (yıllık)', money(r.stopaj))}
      ${row('Emlak vergisi (yıllık)', money(r.emlak))}
      ${row('Vergi sonrası net kira', money(r.netAfterTax), 'total')}
    </div>
    <div class="card"><div class="card-head"><h3>Götürü mü, gerçek gider mi?</h3><span class="badge acc">Önerilen: ${r.best === 'gercek' ? 'Gerçek gider' : 'Götürü gider'}</span></div>
      <div class="grid g-2" style="gap:10px">
        <div class="card" style="background:var(--bg-2)"><small>Götürü (%15)</small><div class="kpi-val">${money(r.mustDeclare ? Math.max(0, r.gotur.payable) : 0)}</div><small>Gider: ${money(r.gotur.exp)}</small></div>
        <div class="card" style="background:var(--bg-2)"><small>Gerçek gider</small><div class="kpi-val">${money(r.mustDeclare ? Math.max(0, r.gercek.payable) : 0)}</div><small>Gider: ${money(r.gercek.exp)}</small></div>
      </div>
      <div class="kv mt"><span>Belgeli indirilebilir giderler</span><b>${money(r.dedExp)}</b></div>
      <div class="kv"><span>Amortisman (%2 × maliyet)</span><b>${money(r.amort)}</b></div>
      <p class="muted" style="font-size:12px">İndirilebilen: ${[...DEDUCTIBLE].join(', ')}, amortisman. İstisnaya isabet eden kısım indirilemez (orantılı düşülür). Götürü gider seçilirse 2 yıl gerçek gidere geçilemez.</p>
      <h4 style="margin:14px 0 8px">${taxYear} gelir vergisi tarifesi (ücret dışı)</h4>
      <div class="table-wrap"><table><tbody>${b.map(([lim, rate], i) => `<tr><td>${i === 0 ? '0' : money(b[i - 1][0])} – ${lim ? money(lim) : 've üzeri'}</td><td class="right">%${Math.round(rate * 100)}</td></tr>`).join('')}</tbody></table></div>
    </div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><h3>Vergi takvimi</h3></div>
      ${[['1–31 Mart ' + (taxYear + 1), `${taxYear} kira geliri beyannamesi + 1. taksit`],
         ['31 Temmuz ' + (taxYear + 1), 'Gelir vergisi 2. taksit'],
         ['1–31 Mayıs', 'Emlak vergisi 1. taksit'],
         ['1–30 Kasım', 'Emlak vergisi 2. taksit'],
         ['Her ay 26\'sı', 'Stopaj: işyeri kiracısı (şirket) muhtasar ile öder — takip edin'],
         ['Sözleşme imzasında', 'Damga vergisi: yıllık kira toplamının binde 1,89\'u']].map(([d, t]) => `<div class="kv"><span>${t}</span><b class="nowrap">${d}</b></div>`).join('')}
    </div>
    <div class="card"><div class="card-head"><h3>Yasal yükümlülükler (özet)</h3></div>
      <div class="tips">
        <div class="note">${icon('info')} Konut kira bedelleri (aylık 500 ₺ üzeri) <b>banka/PTT</b> aracılığıyla tahsil edilmelidir; aksi halde özel usulsüzlük cezası uygulanır.</div>
        <div class="note">${icon('info')} Konut istisnası (${money(r.p.istisna)}) beyannameyi süresinde vermeyenlere ve ticari/mesleki kazancı olanlara, ya da brüt gelir toplamı ${money(r.p.istisnaGelirSiniri)}'yi aşanlara uygulanmaz.</div>
        <div class="note">${icon('info')} Stopajlı işyeri kiraları yıllık ${money(r.p.beyanSiniri)}'yi aşmıyorsa beyan edilmez; aşarsa tamamı beyan edilir ve stopaj mahsup edilir.</div>
        <div class="note">${icon('info')} GİB, MEVA (Mekansal Veri Analizi) ile tapu kayıtlarını tarıyor; beyan edilmeyen kira geliri için vergi ziyaı cezası riski vardır.</div>
        <div class="note blue">${icon('alert')} Bu hesaplama bilgilendirme amaçlıdır; kesin beyan için mali müşavirinize danışın. Oranları Ayarlar'dan güncelleyebilirsiniz.</div>
      </div></div>
  </div>`;
  bind(el, '[data-y]', (d) => { taxYear = Number(d.y); refresh(); });
  bind(el, '[data-b]', (d) => { taxBasis = d.b; refresh(); });
}
