// Cihazlar arası eşitleme: şifreli kasa yedeği, kullanıcının GİZLİ GitHub reposunda (vault.json) saklanır.
// Dosya zaten AES-256-GCM ile şifreli olduğu için GitHub dahil kimse içeriği okuyamaz.
// Çakışma kuralı: son yazan kazanır; ilk eşitlemede kullanıcıya hangi verinin kullanılacağı sorulur.
import * as S from './store.js';

const STAMP_KEY = 'kasa-sync-stamp';
const lastStamp = () => { try { return Number(localStorage.getItem(STAMP_KEY)) || 0; } catch { return 0; } };
const setStamp = (v) => { try { localStorage.setItem(STAMP_KEY, String(v)); } catch { /* yoksay */ } };

export let status = { state: 'off', at: 0, msg: '' };
let listeners = [];
export const onStatus = (f) => { listeners.push(f); };
function setStatus(state, msg = '') { status = { state, msg, at: Date.now() }; listeners.forEach((f) => f(status)); }

export function cfgFrom(settings) {
  const c = settings?.sync;
  return c && c.enabled && c.token && c.owner && c.repo ? c : null;
}
export const cfg = () => cfgFrom(S.state?.settings);

async function api(c, path, { method = 'GET', body, raw = false } = {}) {
  const r = await fetch(`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${path}?t=${Date.now()}`, {
    method, cache: 'no-store',
    headers: {
      Authorization: `Bearer ${c.token}`,
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 404 && method === 'GET') return null;
  if (r.status === 401 || r.status === 403) throw new Error('GitHub anahtarı geçersiz veya yetkisi yok');
  if (!r.ok) throw new Error(`GitHub hatası (${r.status})`);
  return raw ? r.text() : r.json();
}
const b64utf8 = (str) => btoa(unescape(encodeURIComponent(str)));
const blobB64 = (blob) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });

async function putFile(c, path, contentB64, message) {
  const cur = await api(c, path);
  await api(c, path, { method: 'PUT', body: { message, content: contentB64, ...(cur?.sha ? { sha: cur.sha } : {}) } });
}
export async function remoteMeta(c) {
  const m = await api(c, 'meta.json', { raw: true });
  return m ? JSON.parse(m) : null;
}
export const downloadVault = (c) => api(c, 'vault.json', { raw: true });

export async function push() {
  const c = cfg(); if (!c) return;
  setStatus('busy', 'Gönderiliyor…');
  await S.flush();
  const stamp = S.state.updatedAt || Date.now();
  const blob = await S.exportBackup();
  await putFile(c, 'vault.json', await blobB64(blob), 'Kasa eşitleme');
  await putFile(c, 'meta.json', b64utf8(JSON.stringify({ stamp, at: new Date().toISOString(), device: navigator.userAgent.slice(0, 80) })), 'Kasa eşitleme (meta)');
  setStamp(stamp);
  setStatus('ok', 'Buluta gönderildi');
}

// Buluttaki sürümü indirip bu cihaza uygular; şifre farklıysa yerel veriye dokunmaz.
async function applyRemote(c, password) {
  const text = await downloadVault(c);
  const data = JSON.parse(text);
  await S.tryBackup(text, password); // önce doğrula
  await S.importBackup(text);
  await S.unlock(password);
  setStamp(data.stamp || S.state.updatedAt || Date.now());
}

let pushTimer = null;
export function schedulePush() {
  if (!cfg() || applying) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => push().catch((e) => setStatus('err', e.message)), 4000);
}

let applying = false;
// choose(): ilk eşitlemede 'remote' | 'local' döndürür
export async function sync(password, { choose } = {}) {
  const c = cfg(); if (!c || applying) return 'off';
  applying = true;
  try {
    setStatus('busy', 'Kontrol ediliyor…');
    const m = await remoteMeta(c);
    const last = lastStamp(), local = S.state.updatedAt || 0;
    if (!m) { applying = false; await push(); return 'pushed'; }
    if (m.stamp === last) {
      if (local > last) { applying = false; await push(); return 'pushed'; }
      setStatus('ok', 'Güncel'); return 'same';
    }
    let useRemote;
    if (!last) { // ilk kez: kullanıcı karar verir
      const ch = choose ? await choose(m) : 'cancel';
      if (ch === 'cancel') { setStatus('err', 'Eşitleme bekliyor — seçim yapılmadı'); return 'cancel'; }
      useRemote = ch === 'remote';
    }
    else if (local > last) useRemote = m.stamp > local; // iki taraf da değişmiş: son yazan kazanır
    else useRemote = true;
    if (useRemote) {
      setStatus('busy', 'İndiriliyor…');
      await applyRemote(c, password);
      setStatus('ok', 'Buluttan güncellendi');
      return 'pulled';
    }
    applying = false; await push(); return 'pushed';
  } catch (e) {
    setStatus('err', e.message);
    throw e;
  } finally { applying = false; }
}

// Kilit ekranından (yeni cihaz): kasayı buluttan indirip bu cihaza kurar
export async function bootstrap(c) {
  const text = await downloadVault(c);
  if (!text) throw new Error('Bulutta henüz kasa yok. Önce diğer cihazda eşitlemeyi açın.');
  const data = JSON.parse(text);
  await S.importBackup(text);
  setStamp(data.stamp || 0);
}
