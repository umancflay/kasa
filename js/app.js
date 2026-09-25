// Uygulama kabuğu: kilit ekranı, menü, yönlendirme, arama, otomatik kilit.
import * as S from './store.js';
import { icon, hydrateIcons, esc, money, toast } from './ui.js';
import { defaultState, byId } from './domain.js';
import { setRerender, quickAdd, editTenant, editEntry } from './editors.js';
import { evPanel, properties, tenants, verim, contracts, taxView, propertyDetail } from './views-ev.js';
import { overview, ledgerView, debtsView, sahsiPanel, invest, news, notesView, settingsView, fetchPrices, rates } from './views-main.js';

const NAV = [
  ['Genel', [
    ['#/', 'grid', 'Genel Bakış'],
    ['#/notlar', 'book', 'Not Defteri'],
    ['#/haberler', 'news', 'Haberler'],
  ]],
  ['Ev & Mülk', [
    ['#/ev', 'building', 'Ev Paneli'],
    ['#/mulkler/konut', 'home', 'Evler'],
    ['#/mulkler/isyeri', 'store', 'Dükkanlar'],
    ['#/kiracilar', 'users', 'Kiracılar'],
    ['#/verim', 'trend', 'Zam & Verim'],
    ['#/defter/ev', 'receipt', 'Ev Defteri'],
    ['#/borclar/ev', 'card', 'Ev Borçları'],
    ['#/sozlesmeler', 'file', 'Sözleşmeler'],
    ['#/vergi', 'percent', 'Vergi (GMSİ)'],
  ]],
  ['Şahsi', [
    ['#/sahsi', 'user', 'Şahsi Panel'],
    ['#/defter/sahsi', 'wallet', 'Şahsi Defter'],
    ['#/borclar/sahsi', 'card', 'Şahsi Borçlar'],
    ['#/yatirim', 'coins', 'Yatırımlar'],
  ]],
  ['Sistem', [
    ['#/ayarlar', 'gear', 'Ayarlar'],
  ]],
];
const BOTTOM = [['#/', 'grid', 'Genel'], ['#/ev', 'building', 'Ev'], ['#/kiracilar', 'users', 'Kiracı'], ['#/sahsi', 'user', 'Şahsi'], ['menu', 'menu', 'Menü']];

const $ = (id) => document.getElementById(id);
const view = $('view');

function route() {
  if (!S.isUnlocked()) return;
  const h = location.hash || '#/';
  const [, a, b] = h.split('/');
  document.querySelectorAll('.nav-link, .bottom-nav a').forEach((l) => {
    const href = l.getAttribute('href');
    l.classList.toggle('active', href === h || (href !== '#/' && h.startsWith(href + '/')) || (href === '#/' && (h === '#' || h === '#/')));
  });
  closeMenu();
  const r = {
    '': () => overview(view),
    ev: () => evPanel(view),
    mulkler: () => properties(view, b || 'konut'),
    kiracilar: () => tenants(view),
    verim: () => verim(view),
    defter: () => ledgerView(view, b === 'sahsi' ? 'sahsi' : 'ev'),
    borclar: () => debtsView(view, b === 'sahsi' ? 'sahsi' : 'ev'),
    sozlesmeler: () => contracts(view),
    vergi: () => taxView(view),
    sahsi: () => sahsiPanel(view),
    yatirim: () => invest(view),
    haberler: () => news(view),
    notlar: () => notesView(view),
    ayarlar: () => settingsView(view, { onLock: doLock }),
  }[a || ''] || (() => overview(view));
  try { r(); } catch (e) { console.error(e); view.innerHTML = `<div class="card note red">Bir hata oluştu: ${esc(e.message)}</div>`; }
}
let lastRouteHash = '';
function rerender() {
  const y = window.scrollY;
  route();
  if (location.hash === lastRouteHash) window.scrollTo(0, y);
  lastRouteHash = location.hash;
}
setRerender(rerender);
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); lastRouteHash = location.hash; });

function buildNav() {
  $('nav').innerHTML = NAV.map(([g, items]) => `<div class="nav-group">${g}</div>` +
    items.map(([href, ic, label]) => `<a class="nav-link" href="${href}">${icon(ic)}<span>${label}</span></a>`).join('')).join('');
  $('bottomNav').innerHTML = BOTTOM.map(([href, ic, label]) => href === 'menu'
    ? `<a href="javascript:void 0" data-menu>${icon(ic)}<span>${label}</span></a>`
    : `<a href="${href}">${icon(ic)}<span>${label}</span></a>`).join('');
  $('bottomNav').querySelector('[data-menu]').addEventListener('click', openMenu);
}
function openMenu() { $('sidebar').classList.add('open'); $('scrim').classList.add('open'); }
function closeMenu() { $('sidebar').classList.remove('open'); $('scrim').classList.remove('open'); }
$('menuBtn').addEventListener('click', openMenu);
$('scrim').addEventListener('click', closeMenu);
$('quickAdd').addEventListener('click', quickAdd);
$('lockNow').addEventListener('click', () => doLock());

// ---------- Arama ----------
const search = $('globalSearch'), results = $('searchResults');
search.addEventListener('input', () => {
  const q = search.value.trim().toLocaleLowerCase('tr');
  if (!q || !S.state) { results.hidden = true; return; }
  const s = S.state, out = [];
  const has = (...v) => v.some((x) => String(x || '').toLocaleLowerCase('tr').includes(q));
  s.properties.filter((p) => has(p.name, p.address, p.city)).forEach((p) => out.push([`${p.type === 'konut' ? '🏠' : '🏪'} ${p.name}`, p.address || '', () => propertyDetail(p)]));
  s.tenants.filter((t) => has(t.name, t.phone, t.tc, t.email)).forEach((t) => out.push([`👤 ${t.name}`, byId(s.properties, t.propertyId)?.name || '', () => editTenant(t)]));
  s.debts.filter((d) => has(d.name, d.lender)).forEach((d) => out.push([`💳 ${d.name}`, d.lender || '', () => { location.hash = '#/borclar/' + d.scope; }]));
  s.notes.filter((n) => has(n.title, n.body)).forEach((n) => out.push([`📝 ${n.title}`, '', () => { location.hash = '#/notlar'; }]));
  s.ledger.filter((e) => has(e.note, e.cat)).slice(0, 12).forEach((e) => out.push([`${e.type === 'gelir' ? '↑' : '↓'} ${e.cat} · ${money(e.amount)}`, `${e.date} ${e.note || ''}`, () => editEntry(e)]));
  results.innerHTML = out.slice(0, 20).map(([t, sub], i) => `<a href="javascript:void 0" data-i="${i}"><b>${esc(t)}</b><br><small>${esc(sub)}</small></a>`).join('') || '<small style="padding:8px;display:block">Sonuç yok</small>';
  results.querySelectorAll('[data-i]').forEach((a) => a.addEventListener('mousedown', (e) => { e.preventDefault(); out[a.dataset.i][2](); search.value = ''; results.hidden = true; search.blur(); }));
  results.hidden = false;
});
search.addEventListener('blur', () => setTimeout(() => { results.hidden = true; }, 150));
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); search.focus(); }
});

// ---------- Döviz şeridi ----------
async function ticker() {
  try {
    const r = rates(await fetchPrices());
    $('ticker').innerHTML = `<span>USD <b>${r.usd.toFixed(2)}</b></span><span>EUR <b>${r.eur.toFixed(2)}</b></span><span>Gr.Altın <b>${Math.round(r.gram).toLocaleString('tr-TR')}</b></span>`;
  } catch { $('ticker').innerHTML = ''; }
}

// ---------- Kilit / otomatik kilit ----------
let idleTimer = null, lastAct = Date.now();
function bumpIdle() { lastAct = Date.now(); }
['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) => window.addEventListener(ev, bumpIdle, { passive: true }));
function startIdle() {
  clearInterval(idleTimer);
  idleTimer = setInterval(() => {
    if (!S.isUnlocked()) return;
    const mins = Number(S.state.settings.autoLockMin) || 10;
    const left = mins * 60000 - (Date.now() - lastAct);
    $('lockTimer').textContent = `Otomatik kilit: ${Math.max(0, Math.ceil(left / 60000))} dk`;
    if (left <= 0) doLock();
  }, 5000);
}
document.addEventListener('visibilitychange', () => {
  // Arka planda uzun kalınca kilitle
  if (document.visibilityState === 'hidden') S.flush();
  else if (S.isUnlocked() && Date.now() - lastAct > (Number(S.state.settings.autoLockMin) || 10) * 60000) doLock();
});
window.addEventListener('beforeunload', () => { S.flush(); });

async function doLock() {
  await S.flush();
  S.lock();
  document.getElementById('modalRoot').innerHTML = '';
  view.innerHTML = '';
  $('app').hidden = true;
  showLock(false);
}

function showLock(firstRun) {
  $('lock').hidden = false;
  $('pw1').value = ''; $('pw2').value = ''; $('lockErr').textContent = '';
  $('pw2Wrap').hidden = !firstRun;
  $('pw1').autocomplete = firstRun ? 'new-password' : 'current-password';
  $('lockBtn').textContent = firstRun ? 'Kasayı oluştur' : 'Kilidi aç';
  $('lockSub').textContent = firstRun ? 'İlk kurulum — güçlü bir şifre belirleyin' : 'Mülk & kişisel finans paneli';
  $('lockNote').innerHTML = firstRun
    ? 'Verileriniz bu şifreyle AES-256 olarak şifrelenir ve yalnızca bu cihazda saklanır. <b>Şifre unutulursa veriler kurtarılamaz.</b>'
    : 'Veriler bu cihazda şifreli olarak saklanıyor.';
  $('lockImport').hidden = false;
  setTimeout(() => $('pw1').focus(), 50);
  $('lockForm').onsubmit = async (e) => {
    e.preventDefault();
    const p1 = $('pw1').value;
    $('lockBtn').disabled = true; $('lockErr').textContent = '';
    try {
      if (firstRun) {
        if (p1.length < 8) throw new Error('Şifre en az 8 karakter olmalı');
        if (p1 !== $('pw2').value) throw new Error('Şifreler eşleşmiyor');
        $('lockBtn').textContent = 'Oluşturuluyor…';
        await S.create(p1, defaultState());
      } else {
        $('lockBtn').textContent = 'Açılıyor…';
        await S.unlock(p1);
      }
      enter();
    } catch (err) {
      $('lockErr').textContent = err.message || 'Hata';
      $('lockBtn').textContent = firstRun ? 'Kasayı oluştur' : 'Kilidi aç';
      $('pw1').select();
    } finally { $('lockBtn').disabled = false; }
  };
}
$('lockImport').addEventListener('click', () => $('lockImportFile').click());
$('lockImportFile').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { await S.importBackup(await f.text()); toast('Yedek yüklendi — yedeğin şifresiyle giriş yapın'); showLock(false); } catch (err) { $('lockErr').textContent = err.message; }
});

function enter() {
  // Eski sürümlerden gelen verilerde eksik alanları tamamla
  const d = defaultState();
  for (const k of Object.keys(d)) if (S.state[k] === undefined) S.state[k] = d[k];
  for (const k of Object.keys(d.settings)) if (S.state.settings[k] === undefined) S.state.settings[k] = d.settings[k];
  $('lock').hidden = true;
  $('app').hidden = false;
  const name = S.state.settings.name;
  $('userName').textContent = name || 'Kasa';
  $('avatar').textContent = (name || 'K').slice(0, 1).toUpperCase();
  bumpIdle(); startIdle();
  route();
  ticker();
}

// ---------- Başlat ----------
buildNav();
hydrateIcons();
(async () => {
  if (!window.crypto?.subtle) {
    $('lockErr').textContent = 'Bu tarayıcı şifrelemeyi desteklemiyor. Uygulamayı HTTPS üzerinden açın.';
    return;
  }
  showLock(!(await S.hasVault()));
})();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
