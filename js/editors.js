// Kayıt ekleme/düzenleme pencereleri (mülk, kiracı, defter, borç, varlık, not, sözleşme).
import * as S from './store.js';
import { formModal, modal, toast, icon, esc, uid, todayISO, isoDate, money, date, confirmBox } from './ui.js';
import { CATS, byId, rentInfo, debtInfo } from './domain.js';

let rerender = () => {};
export const setRerender = (f) => { rerender = f; };
export const refresh = () => rerender();
const st = () => S.state;
export function commit() { S.save(); rerender(); }

const propOpts = (type) => [['', '— Seçiniz —'], ...st().properties.filter((p) => !type || p.type === type).map((p) => [p.id, `${p.type === 'konut' ? '🏠' : '🏪'} ${p.name}`])];

// ---------- Mülk ----------
export function editProperty(p, type = 'konut') {
  const isNew = !p;
  p = p || { type };
  formModal({
    title: isNew ? (type === 'konut' ? 'Yeni ev / daire' : 'Yeni dükkan / işyeri') : 'Mülkü düzenle',
    values: p,
    fields: [
      { k: 'name', label: 'Mülk adı', req: true, placeholder: 'ör. Kadıköy 3+1', full: true },
      { k: 'type', label: 'Tür', type: 'select', options: [['konut', 'Konut (ev/daire)'], ['isyeri', 'İşyeri (dükkan/ofis)']] },
      { k: 'city', label: 'İl / İlçe', placeholder: 'İstanbul / Kadıköy' },
      { k: 'address', label: 'Adres', full: true },
      { k: 'm2', label: 'Brüt m²', type: 'number' },
      { k: 'purchaseDate', label: 'Alış tarihi', type: 'date' },
      { k: 'purchasePrice', label: 'Alış bedeli / maliyet (₺)', type: 'number', hint: 'Gerçek gider yönteminde %2 amortisman için kullanılır' },
      { k: 'currentValue', label: 'Güncel piyasa değeri (₺)', type: 'number', hint: 'Getiri (yield) hesabı için' },
      { k: 'marketRent', label: 'Emsal / piyasa kirası (₺/ay)', type: 'number', hint: 'Bölgedeki benzer mülklerin kirası' },
      { k: 'emlakVergisi', label: 'Yıllık emlak vergisi (₺)', type: 'number' },
      { k: 'aidat', label: 'Aylık aidat (₺)', type: 'number' },
      { k: 'tapu', label: 'Tapu bilgisi (ada/parsel)', placeholder: 'Ada 123 / Parsel 45' },
      { k: 'dask', label: 'DASK poliçe bitiş', type: 'date' },
      { k: 'notes', label: 'Notlar', type: 'textarea' },
    ],
    onSave: (v) => {
      if (isNew) st().properties.push({ id: uid(), ...v });
      else Object.assign(p, v);
      commit(); toast('Mülk kaydedildi');
    },
    onDelete: isNew ? null : () => {
      const s = st();
      s.properties = s.properties.filter((x) => x.id !== p.id);
      s.tenants.forEach((t) => { if (t.propertyId === p.id) t.active = false; });
      commit(); toast('Mülk silindi');
    },
  });
}

// ---------- Kiracı ----------
export function editTenant(t, propertyId) {
  const isNew = !t;
  t = t || { propertyId, active: true, paymentDay: 5, startDate: todayISO() };
  formModal({
    title: isNew ? 'Yeni kiracı' : 'Kiracı bilgileri', wide: true, values: t,
    fields: [
      { type: 'section', label: 'Kişi bilgileri' },
      { k: 'name', label: 'Ad soyad / Firma', req: true },
      { k: 'tc', label: 'TC Kimlik / Vergi No' },
      { k: 'phone', label: 'Telefon', type: 'tel' },
      { k: 'email', label: 'E-posta', type: 'email' },
      { k: 'job', label: 'Meslek / Faaliyet' },
      { k: 'guarantor', label: 'Kefil (ad, telefon)' },
      { k: 'emergencyName', label: 'Acil durum kişisi' },
      { k: 'emergencyPhone', label: 'Acil durum telefonu', type: 'tel' },
      { type: 'section', label: 'Sözleşme' },
      { k: 'propertyId', label: 'Mülk', type: 'select', options: propOpts(), req: true },
      { k: 'startDate', label: 'Sözleşme başlangıcı', type: 'date', req: true, hint: 'Yıllık zam dönemi bu tarihe göre hesaplanır' },
      { k: 'endDate', label: 'Sözleşme bitişi / tahliye', type: 'date', hint: 'Kiracı çıktıysa doldurun' },
      { k: 'rent', label: 'Aylık kira (brüt ₺)', type: 'number', req: true },
      { k: 'deposit', label: 'Depozito (₺)', type: 'number' },
      { k: 'paymentDay', label: 'Ödeme günü (ayın)', type: 'number' },
      { k: 'lastIncreaseDate', label: 'Son zam tarihi', type: 'date' },
      { k: 'stopaj', label: 'Kiracı stopaj kesiyor (şirket / vergi mükellefi işyeri kiracısı, %20)', type: 'checkbox', full: true },
      { k: 'active', label: 'Aktif kiracı', type: 'checkbox', full: true },
      { k: 'notes', label: 'Notlar', type: 'textarea' },
    ],
    onSave: (v) => {
      if (isNew) st().tenants.push({ id: uid(), rentHistory: [{ date: v.startDate, rent: v.rent, rate: 0 }], ...v });
      else Object.assign(t, v);
      commit(); toast('Kiracı kaydedildi');
    },
    onDelete: isNew ? null : () => { st().tenants = st().tenants.filter((x) => x.id !== t.id); commit(); toast('Kiracı silindi'); },
  });
}

export function applyIncrease(t) {
  const s = st(), ri = rentInfo(t, s);
  const prop = byId(s.properties, t.propertyId);
  formModal({
    title: `Kira artışı — ${esc(t.name)}`,
    values: { rate: s.settings.tufe12, newRent: Math.round(ri.maxNew), date: ri.next && ri.daysToNext < 45 ? isoDate(ri.next) : todayISO() },
    fields: [
      { k: 'rate', label: `Artış oranı (%) — yasal üst sınır: TÜFE 12 ay ort. %${s.settings.tufe12}`, type: 'number' },
      { k: 'newRent', label: 'Yeni aylık kira (₺)', type: 'number', req: true },
      { k: 'date', label: 'Geçerlilik tarihi', type: 'date', req: true },
    ],
    extra: `<div class="note mt">Mevcut kira: <b>${money(ri.rent)}</b> · Yasal azami: <b>${money(ri.maxNew)}</b>${prop?.marketRent ? ` · Emsal: <b>${money(prop.marketRent)}</b>` : ''}<br>
      <small>TBK 344: Yenilenen kira yılında artış, bir önceki kira yılının TÜFE 12 aylık ortalamasını geçemez (konut ve çatılı işyeri). 5 yılı dolduran sözleşmelerde emsal kiraya göre hakim belirleyebilir.</small></div>`,
    onSave: (v) => {
      const rate = t.rent ? (v.newRent - t.rent) / t.rent : 0;
      if (rate * 100 > Number(s.settings.tufe12) + 0.01 && !ri.five) {
        if (!confirm(`Artış %${(rate * 100).toFixed(2)} — yasal sınırın (%${s.settings.tufe12}) üzerinde. Kiracının onayı yoksa bu fazlası hukuken talep edilemez. Yine de kaydedilsin mi?`)) return false;
      }
      t.rentHistory = t.rentHistory || [];
      t.rentHistory.push({ date: v.date, rent: v.newRent, old: t.rent, rate });
      t.rent = v.newRent;
      t.lastIncreaseDate = v.date;
      commit(); toast(`Yeni kira: ${money(v.newRent)}`);
    },
    onMount: null,
  });
  // Oran ↔ tutar senkronizasyonu
  const root = document.querySelector('.modal-bg:last-child');
  const rate = root.querySelector('#f_rate'), nr = root.querySelector('#f_newRent');
  rate.addEventListener('input', () => { nr.value = Math.round(ri.rent * (1 + (Number(rate.value) || 0) / 100)); });
  nr.addEventListener('input', () => { rate.value = ri.rent ? (((Number(nr.value) || 0) / ri.rent - 1) * 100).toFixed(2) : 0; });
}

// ---------- Defter kaydı ----------
export function editEntry(e, scope = 'ev', preset = {}) {
  const isNew = !e;
  e = e || { scope, type: 'gider', date: todayISO(), ...preset };
  const sc = e.scope || scope;
  const catOpts = (type) => CATS[sc][type];
  const fields = [
    { k: 'type', label: 'Tür', type: 'select', options: [['gelir', 'Gelir'], ['gider', 'Gider']] },
    { k: 'date', label: 'Tarih', type: 'date', req: true },
    { k: 'cat', label: 'Kategori', type: 'select', options: [...CATS[sc].gelir.map((c) => [c, '↑ ' + c]), ...CATS[sc].gider.map((c) => [c, '↓ ' + c])] },
    { k: 'amount', label: 'Tutar (₺)', type: 'number', req: true },
  ];
  if (sc === 'ev') {
    fields.push({ k: 'propertyId', label: 'Mülk', type: 'select', options: propOpts() });
    fields.push({ k: 'tenantId', label: 'Kiracı', type: 'select', options: [['', '—'], ...st().tenants.map((t) => [t.id, t.name])], show: (v) => v.cat === 'Kira' });
    fields.push({ k: 'period', label: 'Kira dönemi (ay)', type: 'month', show: (v) => v.cat === 'Kira' });
    fields.push({ k: 'stopaj', label: 'Kesilen stopaj (₺)', type: 'number', hint: 'İşyeri kiracısı şirketse brüt kiranın %20\'si', show: (v) => v.cat === 'Kira' });
  }
  fields.push({ k: 'note', label: 'Açıklama', full: true });
  if (!e.cat) e.cat = catOpts(e.type)[0];
  formModal({
    title: isNew ? (sc === 'ev' ? 'Ev / mülk kaydı' : 'Şahsi kayıt') : 'Kaydı düzenle', values: e, fields,
    onSave: (v) => {
      // Kategori tür ile uyumlu olsun
      v.type = CATS[sc].gelir.includes(v.cat) ? 'gelir' : 'gider';
      if (v.stopaj === '') v.stopaj = 0;
      if (isNew) st().ledger.push({ id: uid(), scope: sc, ...v });
      else Object.assign(e, v);
      commit(); toast('Kayıt eklendi');
    },
    onDelete: isNew ? null : () => { st().ledger = st().ledger.filter((x) => x.id !== e.id); commit(); },
  });
  const root = document.querySelector('.modal-bg:last-child');
  const type = root.querySelector('#f_type'), cat = root.querySelector('#f_cat');
  type.addEventListener('change', () => { cat.value = catOpts(type.value)[0]; cat.dispatchEvent(new Event('change', { bubbles: true })); });
  cat.addEventListener('change', () => { type.value = CATS[sc].gelir.includes(cat.value) ? 'gelir' : 'gider'; });
  const tenantSel = root.querySelector('#f_tenantId');
  if (tenantSel) tenantSel.addEventListener('change', () => {
    const t = byId(st().tenants, tenantSel.value); if (!t) return;
    root.querySelector('#f_propertyId').value = t.propertyId;
    const amt = root.querySelector('#f_amount'); if (!amt.value) amt.value = t.rent;
    const stp = root.querySelector('#f_stopaj'); if (t.stopaj && !Number(stp.value)) stp.value = Math.round((Number(amt.value) || t.rent) * (st().settings.stopajRate / 100));
  });
}

// Kira tahsilatı (ızgaradan hızlı)
export function collectRent(t, period) {
  const s = st();
  const existing = s.ledger.find((e) => e.tenantId === t.id && e.cat === 'Kira' && e.period === period);
  if (existing) {
    confirmBox(`${period} dönemi kira kaydı (${money(existing.amount)}) silinsin mi?`, 'Tahsilatı geri al').then((ok) => {
      if (ok) { s.ledger = s.ledger.filter((x) => x !== existing); commit(); }
    });
    return;
  }
  const day = String(Math.min(28, Number(t.paymentDay) || 5)).padStart(2, '0');
  const dt = `${period}-${day}`;
  editEntry(null, 'ev', {
    type: 'gelir', cat: 'Kira', amount: t.rent, tenantId: t.id, propertyId: t.propertyId, period,
    date: dt > todayISO() ? todayISO() : dt, stopaj: t.stopaj ? Math.round(t.rent * s.settings.stopajRate / 100) : 0,
    note: `${t.name} — ${period} kirası`,
  });
}

// ---------- Borç ----------
export function editDebt(d, scope = 'ev') {
  const isNew = !d;
  d = d || { scope, kind: 'Kredi', paidInstallments: 0, totalInstallments: 12, firstDue: todayISO() };
  const fields = [
    { k: 'name', label: 'Borç adı', req: true, placeholder: 'ör. Konut kredisi, Usta ödemesi' },
    { k: 'lender', label: 'Alacaklı (banka / kişi)' },
    { k: 'kind', label: 'Tür', type: 'select', options: ['Kredi', 'Kredi Kartı', 'Kişisel', 'Vergi / SGK', 'Senet', 'Diğer'] },
    { k: 'installment', label: 'Aylık taksit (₺)', type: 'number', req: true },
    { k: 'totalInstallments', label: 'Toplam taksit sayısı (ay)', type: 'number', req: true },
    { k: 'paidInstallments', label: 'Ödenmiş taksit sayısı', type: 'number' },
    { k: 'firstDue', label: 'İlk taksit tarihi', type: 'date', req: true },
    { k: 'rate', label: 'Faiz oranı (aylık %)', type: 'number' },
  ];
  if ((d.scope || scope) === 'ev') fields.push({ k: 'propertyId', label: 'İlgili mülk', type: 'select', options: propOpts() });
  fields.push({ k: 'note', label: 'Not', type: 'textarea' });
  formModal({
    title: isNew ? ((d.scope || scope) === 'ev' ? 'Yeni ev borcu' : 'Yeni şahsi borç') : 'Borcu düzenle', values: d, fields,
    onSave: (v) => {
      if (isNew) st().debts.push({ id: uid(), scope: d.scope || scope, ...v });
      else Object.assign(d, v);
      commit(); toast('Borç kaydedildi');
    },
    onDelete: isNew ? null : () => { st().debts = st().debts.filter((x) => x.id !== d.id); commit(); },
  });
}
export function payInstallment(d) {
  const i = debtInfo(d);
  if (i.done) return toast('Bu borç zaten kapanmış');
  formModal({
    title: `Taksit öde — ${esc(d.name)}`,
    values: { amount: i.inst, date: todayISO(), log: true },
    fields: [
      { k: 'amount', label: 'Ödenen tutar (₺)', type: 'number', req: true },
      { k: 'date', label: 'Ödeme tarihi', type: 'date', req: true },
      { k: 'log', label: 'Deftere gider olarak işle', type: 'checkbox', full: true },
    ],
    extra: `<div class="note blue">Taksit ${i.paid + 1} / ${i.total} · Kalan borç: <b>${money(i.remaining)}</b></div>`,
    onSave: (v) => {
      d.paidInstallments = i.paid + 1;
      if (v.log) st().ledger.push({ id: uid(), scope: d.scope, type: 'gider', cat: 'Borç / Taksit', amount: v.amount, date: v.date, propertyId: d.propertyId || '', note: `${d.name} — taksit ${d.paidInstallments}/${i.total}`, debtId: d.id });
      commit(); toast(d.paidInstallments >= i.total ? '🎉 Borç kapandı!' : 'Taksit işlendi');
    },
  });
}

// ---------- Varlık ----------
export function editAsset(a) {
  const isNew = !a;
  a = a || { kind: 'kripto', amount: 0, cost: 0 };
  formModal({
    title: isNew ? 'Yeni varlık' : 'Varlığı düzenle', values: a,
    fields: [
      { k: 'kind', label: 'Tür', type: 'select', options: [['kripto', 'Kripto'], ['altin', 'Altın'], ['doviz', 'Döviz'], ['hisse', 'Hisse (BIST vb.)'], ['fon', 'Yatırım fonu'], ['mevduat', 'Mevduat / Nakit'], ['diger', 'Diğer']] },
      { k: 'symbol', label: 'Sembol / Ad', req: true, placeholder: 'BTC, ETH, Gram Altın, USD, EUR, THYAO…', hint: 'Kripto: Binance sembolü · Altın: "Gram Altın" veya "Ons" · Döviz: USD/EUR' },
      { k: 'amount', label: 'Miktar', type: 'number', req: true },
      { k: 'cost', label: 'Toplam maliyet (₺)', type: 'number' },
      { k: 'manualValue', label: 'Güncel toplam değer (₺) — canlı fiyatı olmayanlar için', type: 'number', show: (v) => !['kripto', 'altin', 'doviz'].includes(v.kind) },
      { k: 'note', label: 'Not', full: true },
    ],
    onSave: (v) => {
      v.symbol = v.kind === 'kripto' ? v.symbol.toUpperCase() : v.symbol;
      if (isNew) st().assets.push({ id: uid(), ...v }); else Object.assign(a, v);
      commit();
    },
    onDelete: isNew ? null : () => { st().assets = st().assets.filter((x) => x.id !== a.id); commit(); },
  });
}

// ---------- Not ----------
export function editNote(n, preset = {}) {
  const isNew = !n;
  n = n || { date: todayISO(), ...preset };
  formModal({
    title: isNew ? 'Yeni not' : 'Notu düzenle', values: n, wide: true,
    fields: [
      { k: 'title', label: 'Başlık', req: true },
      { k: 'date', label: 'Tarih', type: 'date' },
      { k: 'propertyId', label: 'İlgili mülk (opsiyonel)', type: 'select', options: propOpts() },
      { k: 'body', label: 'Not', type: 'textarea', full: true },
    ],
    onSave: (v) => { if (isNew) st().notes.unshift({ id: uid(), ...v }); else Object.assign(n, v); commit(); },
    onDelete: isNew ? null : () => { st().notes = st().notes.filter((x) => x.id !== n.id); commit(); },
  });
}

// ---------- Sözleşme / belge yükleme ----------
async function shrinkImage(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 600 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch { return file; }
}
export function uploadContract(preset = {}) {
  const tenants = st().tenants;
  const m = formModal({
    title: 'Sözleşme / belge yükle', values: { kind: 'Kira sözleşmesi', date: todayISO(), ...preset },
    fields: [
      { k: 'title', label: 'Başlık', placeholder: 'ör. 2026 Kira kontratı', full: true },
      { k: 'kind', label: 'Belge türü', type: 'select', options: ['Kira sözleşmesi', 'Tapu', 'Tahliye taahhüdü', 'Ek protokol', 'Fatura / makbuz', 'DASK / sigorta', 'Vergi', 'Kimlik', 'Diğer'] },
      { k: 'date', label: 'Belge tarihi', type: 'date' },
      { k: 'propertyId', label: 'Mülk', type: 'select', options: propOpts() },
      { k: 'tenantId', label: 'Kiracı', type: 'select', options: [['', '—'], ...tenants.map((t) => [t.id, t.name])] },
    ],
    extra: `<label class="drop mt" id="dropZone">${icon('upload')}<div style="margin-top:6px">Fotoğraf veya PDF seçin / sürükleyin</div><small>Birden fazla sayfa seçebilirsiniz · Dosyalar şifrelenerek saklanır</small>
      <input type="file" id="fileIn" accept="image/*,application/pdf" multiple hidden></label><div id="fileList" class="mt muted"></div>`,
    onSave: async (v, mm) => {
      const files = [...mm.el.querySelector('#fileIn').files];
      if (!files.length) { toast('Dosya seçmediniz', true); return false; }
      const btn = mm.el.querySelector('[data-save]'); btn.disabled = true; btn.textContent = 'Şifreleniyor…';
      let i = 0;
      for (const f of files) {
        const blob = await shrinkImage(f);
        if (blob.size > 25 * 1024 * 1024) { toast(`${f.name} çok büyük (25 MB sınırı)`, true); continue; }
        const id = uid();
        await S.putFile(id, blob, f.name);
        st().contracts.push({ id, ...v, title: (v.title || f.name) + (files.length > 1 ? ` (${++i})` : ''), name: f.name, mime: blob.type || f.type, size: blob.size, addedAt: Date.now() });
      }
      commit(); toast('Belge(ler) yüklendi');
    },
  });
  const inp = m.el.querySelector('#fileIn'), dz = m.el.querySelector('#dropZone'), list = m.el.querySelector('#fileList');
  const show = () => { list.textContent = [...inp.files].map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`).join(' · '); };
  inp.addEventListener('change', show);
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); inp.files = e.dataTransfer.files; show(); });
}
export async function viewContract(c) {
  const blob = await S.getFile(c.id);
  if (!blob) return toast('Dosya bulunamadı', true);
  const url = URL.createObjectURL(blob);
  const isPdf = (c.mime || '').includes('pdf');
  const prop = byId(st().properties, c.propertyId), ten = byId(st().tenants, c.tenantId);
  const m = modal({
    title: esc(c.title || c.name), wide: true,
    body: `<div class="viewer">${isPdf ? `<iframe src="${url}"></iframe>` : `<img src="${url}" alt="">`}</div>
      <p class="muted" style="margin:12px 0 0">${esc(c.kind || '')} · ${date(c.date)}${prop ? ' · ' + esc(prop.name) : ''}${ten ? ' · ' + esc(ten.name) : ''}</p>`,
    foot: `<button class="btn btn-danger" data-del>${icon('trash')} Sil</button><span class="spacer"></span><button class="btn" data-dl>${icon('download')} İndir</button><button class="btn" data-close>Kapat</button>`,
  });
  m.el.querySelector('[data-dl]').onclick = () => { const a = document.createElement('a'); a.href = url; a.download = c.name || 'belge'; a.click(); };
  m.el.querySelector('[data-del]').onclick = async () => {
    if (!(await confirmBox('Belge kalıcı olarak silinecek.'))) return;
    await S.deleteFile(c.id);
    st().contracts = st().contracts.filter((x) => x.id !== c.id);
    m.close(); commit();
  };
  const obs = new MutationObserver(() => { if (!document.contains(m.el)) { URL.revokeObjectURL(url); obs.disconnect(); } });
  obs.observe(document.getElementById('modalRoot'), { childList: true });
}

export function quickAdd() {
  const m = modal({
    title: 'Hızlı kayıt',
    body: `<div class="grid g-2">
      <button class="btn" data-a="evg">${icon('building')} Ev gideri</button>
      <button class="btn" data-a="evi">${icon('building')} Ev geliri</button>
      <button class="btn" data-a="shg">${icon('user')} Şahsi gider</button>
      <button class="btn" data-a="shi">${icon('user')} Şahsi gelir</button>
      <button class="btn" data-a="debt-ev">${icon('card')} Ev borcu</button>
      <button class="btn" data-a="debt-sh">${icon('card')} Şahsi borç</button>
      <button class="btn" data-a="tenant">${icon('users')} Kiracı</button>
      <button class="btn" data-a="note">${icon('book')} Not</button></div>`,
  });
  const act = {
    evg: () => editEntry(null, 'ev', { type: 'gider' }), evi: () => editEntry(null, 'ev', { type: 'gelir', cat: 'Kira' }),
    shg: () => editEntry(null, 'sahsi', { type: 'gider' }), shi: () => editEntry(null, 'sahsi', { type: 'gelir', cat: 'Maaş' }),
    'debt-ev': () => editDebt(null, 'ev'), 'debt-sh': () => editDebt(null, 'sahsi'), tenant: () => editTenant(), note: () => editNote(),
  };
  m.el.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => { m.close(); act[b.dataset.a](); });
}
