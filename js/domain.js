// İş kuralları: kategoriler, Türkiye kira vergisi (GMSİ) hesabı, kira artışı, özet hesaplar, demo veri.
import { uid, ym, isoDate } from './ui.js';

export const CATS = {
  ev: {
    gelir: ['Kira', 'Depozito', 'Aidat İadesi', 'Diğer Gelir'],
    gider: ['Aidat', 'Emlak Vergisi', 'Gelir Vergisi (GMSİ)', 'Tamir / Bakım', 'Tadilat', 'DASK / Sigorta', 'Kredi Faizi', 'Borç / Taksit', 'Fatura', 'Emlakçı Komisyonu', 'Avukat / Noter', 'Damga Vergisi', 'Diğer Gider'],
  },
  sahsi: {
    gelir: ['Maaş', 'Prim / İkramiye', 'Ek Gelir', 'Faiz / Temettü', 'Yatırım Kârı', 'Diğer Gelir'],
    gider: ['Market', 'Faturalar', 'Kira / Konut', 'Ulaşım / Yakıt', 'Yeme-İçme', 'Sağlık', 'Eğitim', 'Giyim', 'Eğlence', 'Abonelik', 'Kredi Kartı', 'Borç / Taksit', 'Tatil', 'Diğer Gider'],
  },
};
// Gerçek gider yönteminde indirilebilen giderler (GVK md. 74 – özet)
export const DEDUCTIBLE = new Set(['Aidat', 'Emlak Vergisi', 'Tamir / Bakım', 'DASK / Sigorta', 'Kredi Faizi', 'Fatura', 'Avukat / Noter', 'Damga Vergisi']);

export const TAX_PRESETS = {
  2025: { brackets: [[158000, 0.15], [330000, 0.20], [1200000, 0.27], [4300000, 0.35], [null, 0.40]], istisna: 47000, beyanSiniri: 330000, istisnaGelirSiniri: 1200000 },
  2026: { brackets: [[190000, 0.15], [400000, 0.20], [1000000, 0.27], [5300000, 0.35], [null, 0.40]], istisna: 58000, beyanSiniri: 400000, istisnaGelirSiniri: 1500000 },
};

export function defaultState() {
  return {
    v: 1,
    createdAt: Date.now(),
    settings: {
      name: '',
      tufe12: 31.79,             // TÜFE 12 aylık ortalama (%), Eylül 2026 (TÜİK, 3 Eylül 2026)
      tufeLabel: 'Eylül 2026',
      stopajRate: 20,
      istisnaEligible: true,
      otherIncomeGross: 0,       // İstisna şartı için: ücret + diğer gelirlerin brüt toplamı
      buyuksehir: true,
      autoLockMin: 10,
      tax: JSON.parse(JSON.stringify(TAX_PRESETS)),
      newsTopics: ['kira artış oranı', 'kiracı tahliye', 'emlak vergisi', 'kira geliri vergi', 'konut kira piyasası'],
    },
    properties: [],
    tenants: [],
    ledger: [],
    debts: [],
    contracts: [],
    assets: [],
    notes: [],
  };
}

// ---------- Genel yardımcılar ----------
export const byId = (arr, id) => arr.find((x) => x.id === id);
export const cash = (e) => (e.type === 'gelir' ? e.amount - (e.stopaj || 0) : e.amount);
export function lastMonths(n = 12, end = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(end.getFullYear(), end.getMonth() - i, 1); out.push(ym(d)); }
  return out;
}
export function monthly(ledger, scope, months) {
  const g = Object.fromEntries(months.map((m) => [m, { gelir: 0, gider: 0 }]));
  for (const e of ledger) {
    if (scope && e.scope !== scope) continue;
    const m = e.date?.slice(0, 7);
    if (g[m]) g[m][e.type] += cash(e);
  }
  return months.map((m) => ({ m, ...g[m], net: g[m].gelir - g[m].gider }));
}
export function sumBy(ledger, pred) { return ledger.filter(pred).reduce((a, e) => a + cash(e), 0); }
export const parseDate = (v) => { if (!v) return null; if (v instanceof Date) return v; const [y, m, d] = String(v).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
const diffYears = (a, b) => (b - a) / (365.25 * 864e5);

// ---------- Kira / kiracı ----------
export const activeTenant = (s, propertyId) => s.tenants.find((t) => t.propertyId === propertyId && t.active !== false);
export function rentInfo(t, s, today = new Date()) {
  const start = parseDate(t.startDate);
  const tufe = (Number(s.settings.tufe12) || 0) / 100;
  const rent = Number(t.rent) || 0;
  let next = null, last = null, years = 0;
  if (start && !isNaN(start)) {
    years = diffYears(start, today);
    const k = Math.max(0, Math.floor(years));
    last = new Date(start.getFullYear() + k, start.getMonth(), start.getDate());
    next = new Date(start.getFullYear() + k + 1, start.getMonth(), start.getDate());
  }
  const lastInc = parseDate(t.lastIncreaseDate) || start;
  // Yenileme yıldönümü geçmiş ama o tarihten sonra zam yapılmamışsa "zam zamanı"
  const due = !!(last && years >= 1 && (!lastInc || lastInc < addMonths(last, -1)));
  const daysToNext = next ? Math.ceil((next - today) / 864e5) : null;
  const maxNew = rent * (1 + tufe);
  return { rent, tufe, next, last, years, due, daysToNext, maxNew, maxInc: maxNew - rent, five: years >= 5, ten: years >= 10 };
}
// Aylık tahsilat durumu: dönem (YYYY-MM) için Kira kaydı var mı?
export function paidPeriods(s, tenantId) {
  return new Set(s.ledger.filter((e) => e.tenantId === tenantId && e.cat === 'Kira' && e.period).map((e) => e.period));
}
export function tenantActiveIn(t, period) {
  if (t.startDate && t.startDate.slice(0, 7) > period) return false;
  if (t.endDate && t.endDate < period + '-01') return false;
  return true;
}

// ---------- Vergi (GMSİ) ----------
export function brackets(matrah, br) {
  let tax = 0, prev = 0;
  for (const [lim, rate] of br) {
    const top = lim == null ? Infinity : lim;
    if (matrah > prev) tax += (Math.min(matrah, top) - prev) * rate;
    prev = top;
    if (matrah <= top) break;
  }
  return Math.max(0, tax);
}
export function marginalRate(matrah, br) {
  for (const [lim, rate] of br) if (lim == null || matrah <= lim) return rate;
  return br[br.length - 1][1];
}

// basis: 'actual' (defterdeki tahsilatlar) veya 'projected' (aktif kontratlar × 12)
export function taxCalc(s, year, basis = 'actual') {
  const p = s.settings.tax[year] || s.settings.tax[Object.keys(s.settings.tax).pop()];
  const stopajRate = (Number(s.settings.stopajRate) || 20) / 100;
  let konut = 0, isyeriStopajli = 0, isyeriStopajsiz = 0, stopaj = 0;
  const perProp = {};
  const add = (prop, amt, st) => {
    if (!prop) return;
    perProp[prop.id] = (perProp[prop.id] || 0) + amt;
    if (prop.type === 'konut') konut += amt;
    else if (st) { isyeriStopajli += amt; stopaj += st; }
    else isyeriStopajsiz += amt;
  };
  if (basis === 'actual') {
    for (const e of s.ledger) {
      if (e.scope !== 'ev' || e.type !== 'gelir' || e.cat !== 'Kira' || !e.date?.startsWith(String(year))) continue;
      add(byId(s.properties, e.propertyId), e.amount, e.stopaj || 0);
    }
  } else {
    for (const t of s.tenants.filter((t) => t.active !== false)) {
      const prop = byId(s.properties, t.propertyId);
      const yearly = (Number(t.rent) || 0) * 12;
      add(prop, yearly, prop?.type === 'isyeri' && t.stopaj ? yearly * stopajRate : 0);
    }
  }
  const totalGross = konut + isyeriStopajli + isyeriStopajsiz;
  // İstisna uygunluğu: kullanıcı beyanı + diğer gelirler dahil brüt toplam eşiği
  const grossForLimit = totalGross + (Number(s.settings.otherIncomeGross) || 0);
  const eligible = !!s.settings.istisnaEligible && grossForLimit <= p.istisnaGelirSiniri;
  const istisna = eligible ? Math.min(p.istisna, konut) : 0;
  const konutExcess = konut - istisna;
  // Stopajlı işyeri kirası, (konutta istisnayı aşan kısım ile birlikte) beyan sınırını aşıyorsa beyana dahil edilir
  const includeStopajli = isyeriStopajli > 0 && (isyeriStopajli + konutExcess + isyeriStopajsiz) > p.beyanSiniri;
  const mustDeclare = konutExcess > 0 || isyeriStopajsiz > 0 || includeStopajli;
  const taxableGross = konutExcess + isyeriStopajsiz + (includeStopajli ? isyeriStopajli : 0);

  // Gider yöntemleri
  const gotur = taxableGross * 0.15;
  const dedExp = s.ledger.filter((e) => e.scope === 'ev' && e.type === 'gider' && DEDUCTIBLE.has(e.cat) && e.date?.startsWith(String(year)))
    .reduce((a, e) => a + e.amount, 0);
  const amort = s.properties.filter((pr) => activeTenant(s, pr.id) || perProp[pr.id]).reduce((a, pr) => a + (Number(pr.purchasePrice) || 0) * 0.02, 0);
  const ratio = totalGross ? taxableGross / totalGross : 0; // istisnaya isabet eden gider indirilemez
  const gercek = (dedExp + amort) * ratio;
  const calc = (exp) => {
    const matrah = Math.max(0, taxableGross - exp);
    const tax = brackets(matrah, p.brackets);
    const credit = includeStopajli ? stopaj : 0;
    return { exp, matrah, tax, credit, payable: tax - credit };
  };
  const g1 = calc(gotur), g2 = calc(gercek);
  const best = g2.payable < g1.payable ? 'gercek' : 'gotur';
  const chosen = best === 'gercek' ? g2 : g1;
  const emlak = s.properties.reduce((a, pr) => a + (Number(pr.emlakVergisi) || 0), 0);
  const totalBurden = (mustDeclare ? Math.max(0, chosen.payable) : 0) + stopaj + emlak;
  return {
    year, p, konut, isyeriStopajli, isyeriStopajsiz, stopaj, totalGross, eligible, istisna, konutExcess, includeStopajli,
    mustDeclare, taxableGross, gotur: g1, gercek: g2, dedExp, amort, best, chosen, emlak, totalBurden,
    marginal: marginalRate(chosen.matrah, p.brackets), perProp,
    netAfterTax: totalGross - totalBurden,
    effective: totalGross ? totalBurden / totalGross : 0,
  };
}

// ---------- Borçlar ----------
export function debtInfo(d, today = new Date()) {
  const total = Number(d.totalInstallments) || 1;
  const paid = Math.min(total, Number(d.paidInstallments) || 0);
  const inst = Number(d.installment) || 0;
  const first = parseDate(d.firstDue) || today;
  const next = paid < total ? addMonths(first, paid) : null;
  const end = addMonths(first, total - 1);
  return {
    total, paid, left: total - paid, inst, remaining: (total - paid) * inst, next, end,
    progress: paid / total, done: paid >= total, overdue: !!(next && next < new Date(today.getFullYear(), today.getMonth(), today.getDate())),
    daysToNext: next ? Math.ceil((next - today) / 864e5) : null,
  };
}

// ---------- Demo veri ----------
export function demoState(base) {
  const s = base || defaultState();
  const now = new Date();
  const iso = isoDate;
  const monthsAgo = (m, day = 1) => new Date(now.getFullYear(), now.getMonth() - m, day);
  const P = (type, name, address, m2, purchasePrice, marketRent, emlakVergisi, aidat) =>
    ({ id: uid(), type, name, address, city: 'İstanbul', m2, purchasePrice, purchaseDate: '2015-06-01', marketRent, emlakVergisi, aidat, notes: '' });
  const props = [
    P('konut', 'Kadıköy 3+1 Daire', 'Caferağa Mah. Moda Cad. No:12 D:5', 125, 4200000, 42000, 3400, 1500),
    P('konut', 'Ataşehir 2+1 Daire', 'Atatürk Mah. Ataşehir Blv. 32/B D:14', 95, 3100000, 32000, 2600, 2200),
    P('konut', 'Üsküdar 1+1 Daire', 'Mimar Sinan Mah. Selmanağa Sk. 4', 60, 1900000, 22000, 1500, 800),
    P('isyeri', 'Bağdat Cad. Dükkan', 'Bağdat Cad. No:245 Zemin Kat', 80, 6500000, 95000, 9800, 0),
    P('isyeri', 'Kartal Ofis / Dükkan', 'Yakacık Mah. E-5 Yanyol No:18', 55, 2800000, 38000, 4100, 600),
  ];
  const T = (pi, name, phone, startMonthsAgo, rent, deposit, stopaj, job) => ({
    id: uid(), propertyId: props[pi].id, name, tc: '', phone, email: '', job, guarantor: '', emergencyName: '', emergencyPhone: '',
    startDate: iso(monthsAgo(startMonthsAgo, 1)), endDate: '', rent, deposit, paymentDay: 5, stopaj, active: true,
    lastIncreaseDate: iso(monthsAgo(startMonthsAgo % 12, 1)), rentHistory: [], notes: '',
  });
  const tenants = [
    T(0, 'Ahmet Yılmaz', '0532 000 00 01', 26, 34000, 60000, false, 'Mühendis'),
    T(1, 'Elif Demir', '0533 000 00 02', 14, 27500, 50000, false, 'Öğretmen'),
    T(2, 'Mert Kaya', '0535 000 00 03', 70, 12500, 15000, false, 'Serbest'),
    T(3, 'Moda Kafe Ltd. Şti.', '0216 000 00 04', 40, 78000, 200000, true, 'Kafe'),
  ];
  // Zam zamanı gelmiş örnek kiracı
  tenants[1].startDate = iso(monthsAgo(13, 1));
  tenants[1].lastIncreaseDate = tenants[1].startDate;
  const ledger = [];
  for (let m = 11; m >= 0; m--) {
    const d = monthsAgo(m, 5);
    const period = iso(d).slice(0, 7);
    for (const t of tenants) {
      if (t.startDate.slice(0, 7) > period) continue;
      if (m === 0 && t.name.startsWith('Mert')) continue; // bu ay ödenmemiş örnek
      const prop = props.find((p) => p.id === t.propertyId);
      const amt = Math.round(t.rent * (m > 6 ? 0.8 : 1));
      ledger.push({ id: uid(), scope: 'ev', type: 'gelir', cat: 'Kira', amount: amt, stopaj: t.stopaj ? amt * 0.2 : 0, date: iso(d), period, propertyId: prop.id, tenantId: t.id, note: '' });
    }
    ledger.push({ id: uid(), scope: 'sahsi', type: 'gelir', cat: 'Maaş', amount: 95000, date: iso(monthsAgo(m, 1)), note: '' });
    ledger.push({ id: uid(), scope: 'sahsi', type: 'gider', cat: 'Market', amount: 14000 + (m % 3) * 1800, date: iso(monthsAgo(m, 10)), note: '' });
    ledger.push({ id: uid(), scope: 'sahsi', type: 'gider', cat: 'Faturalar', amount: 5200 + (m % 4) * 600, date: iso(monthsAgo(m, 12)), note: '' });
    ledger.push({ id: uid(), scope: 'sahsi', type: 'gider', cat: 'Yeme-İçme', amount: 7000 + (m % 5) * 900, date: iso(monthsAgo(m, 18)), note: '' });
    ledger.push({ id: uid(), scope: 'sahsi', type: 'gider', cat: 'Ulaşım / Yakıt', amount: 6500, date: iso(monthsAgo(m, 20)), note: '' });
    ledger.push({ id: uid(), scope: 'ev', type: 'gider', cat: 'Aidat', amount: 1500, date: iso(monthsAgo(m, 3)), propertyId: props[3].id, note: 'Boş dönemde' });
    if (m % 4 === 1) ledger.push({ id: uid(), scope: 'ev', type: 'gider', cat: 'Tamir / Bakım', amount: 8500, date: iso(monthsAgo(m, 14)), propertyId: props[m % 3].id, note: 'Kombi bakımı / tesisat' });
  }
  ledger.push({ id: uid(), scope: 'ev', type: 'gider', cat: 'Emlak Vergisi', amount: 10700, date: iso(new Date(now.getFullYear(), 4, 28)), note: '1. taksit' });
  ledger.push({ id: uid(), scope: 'ev', type: 'gider', cat: 'DASK / Sigorta', amount: 6400, date: iso(new Date(now.getFullYear(), 1, 10)), note: 'DASK + konut sigortası' });
  const debts = [
    { id: uid(), scope: 'ev', name: 'Kartal Dükkan Kredisi', lender: 'Ziraat Bankası', kind: 'Kredi', installment: 28500, totalInstallments: 60, paidInstallments: 22, firstDue: iso(monthsAgo(22, 15)), note: '' },
    { id: uid(), scope: 'ev', name: 'Kadıköy Tadilat', lender: 'Usta Hasan', kind: 'Kişisel', installment: 15000, totalInstallments: 4, paidInstallments: 1, firstDue: iso(monthsAgo(1, 20)), note: 'Mutfak + banyo' },
    { id: uid(), scope: 'sahsi', name: 'Araç Kredisi', lender: 'Garanti BBVA', kind: 'Kredi', installment: 18200, totalInstallments: 36, paidInstallments: 9, firstDue: iso(monthsAgo(9, 7)), note: '' },
    { id: uid(), scope: 'sahsi', name: 'Kredi Kartı Taksit (Laptop)', lender: 'Yapı Kredi', kind: 'Kredi Kartı', installment: 6250, totalInstallments: 9, paidInstallments: 5, firstDue: iso(monthsAgo(5, 1)), note: '' },
  ];
  const assets = [
    { id: uid(), kind: 'kripto', symbol: 'BTC', amount: 0.05, cost: 150000, note: '' },
    { id: uid(), kind: 'kripto', symbol: 'ETH', amount: 0.8, cost: 85000, note: '' },
    { id: uid(), kind: 'altin', symbol: 'Gram Altın', amount: 50, cost: 180000, note: '' },
    { id: uid(), kind: 'doviz', symbol: 'USD', amount: 3000, cost: 100000, note: '' },
    { id: uid(), kind: 'mevduat', symbol: 'Vadeli Mevduat', amount: 1, cost: 250000, manualValue: 262000, note: '%42 yıllık' },
  ];
  const notes = [{ id: uid(), date: iso(now), title: 'Kadıköy — zam görüşmesi', body: 'Kiracıyla yenileme tarihinden 1 ay önce yazılı bildirimle görüşülecek. Emsal kira araştırması yapılacak.' }];
  return { ...s, properties: props, tenants, ledger, debts, assets, notes, settings: { ...s.settings, name: s.settings.name || 'Demo' } };
}
