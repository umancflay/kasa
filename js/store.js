// Şifreli veri katmanı: PBKDF2(SHA-256) ile şifreden anahtar türetilir, tüm veri AES-256-GCM ile
// şifrelenip IndexedDB'de saklanır. Şifre hiçbir yere kaydedilmez; unutulursa veri açılamaz.

const DB_NAME = 'kasa';
const STORE = 'kv';
const ITER = 310000;
const enc = new TextEncoder();
const dec = new TextDecoder();

let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => res(req && req.result);
    tx.onerror = () => rej(tx.error);
  });
}
const get = (k) => idb('readonly', (s) => s.get(k));
const put = (k, v) => idb('readwrite', (s) => s.put(v, k));
const del = (k) => idb('readwrite', (s) => s.delete(k));
const keys = () => idb('readonly', (s) => s.getAllKeys());
const clearAll = () => idb('readwrite', (s) => s.clear());

async function deriveKey(pass, salt, iter = ITER) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  return { iv, ct };
}
async function open(key, box) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: box.iv }, key, box.ct));
}

const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let key = null;
let saveTimer = null;
let savedHook = null;
export const onSaved = (f) => { savedHook = f; };
export let state = null;

export async function hasVault() { return !!(await get('meta')); }
export const isUnlocked = () => !!key;

export async function create(pass, initial) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  key = await deriveKey(pass, salt);
  await put('meta', { salt, iter: ITER, created: Date.now() });
  state = initial;
  await saveNow();
}

export async function unlock(pass) {
  const meta = await get('meta');
  const k = await deriveKey(pass, meta.salt, meta.iter);
  const box = await get('vault');
  try {
    state = JSON.parse(dec.decode(await open(k, box)));
  } catch {
    throw new Error('Şifre hatalı');
  }
  key = k;
  return state;
}

export function lock() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  key = null;
  state = null;
}

export async function saveNow() {
  if (!key || !state) return;
  state.updatedAt = Date.now();
  await put('vault', await seal(key, enc.encode(JSON.stringify(state))));
  savedHook?.();
}
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; saveNow(); }, 300);
}
export async function flush() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; await saveNow(); } }

export async function changePassword(oldPass, newPass) {
  const meta = await get('meta');
  const k = await deriveKey(oldPass, meta.salt, meta.iter);
  try { await open(k, await get('vault')); } catch { throw new Error('Mevcut şifre hatalı'); }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nk = await deriveKey(newPass, salt);
  // Dosyaları yeni anahtarla yeniden şifrele
  for (const id of await keys()) {
    if (typeof id !== 'string' || !id.startsWith('file:')) continue;
    const f = await get(id);
    const plain = await open(k, f);
    const box = await seal(nk, plain);
    await put(id, { ...f, ...box });
  }
  key = nk;
  await put('meta', { salt, iter: ITER, created: meta.created });
  await saveNow();
}

// ---------- Dosyalar (kontrat görselleri, PDF) ----------
export async function putFile(id, blob, name) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const box = await seal(key, bytes);
  await put('file:' + id, { ...box, mime: blob.type || 'application/octet-stream', name, size: bytes.length });
}
export async function getFile(id) {
  const f = await get('file:' + id);
  if (!f) return null;
  return new Blob([await open(key, f)], { type: f.mime });
}
export const deleteFile = (id) => del('file:' + id);

// ---------- Yedek: şifreli JSON (aynı şifreyle açılır) ----------
export async function exportBackup() {
  await flush();
  const out = { app: 'kasa', v: 1, exportedAt: new Date().toISOString(), stamp: state?.updatedAt || 0, items: {} };
  for (const k of await keys()) {
    const v = await get(k);
    if (k === 'meta') out.items[k] = { salt: b64(v.salt), iter: v.iter, created: v.created };
    else out.items[k] = { ...v, iv: b64(v.iv), ct: b64(v.ct) };
  }
  return new Blob([JSON.stringify(out)], { type: 'application/json' });
}
// Yedeği içe aktarmadan önce verilen şifreyle açılabildiğini doğrular
export async function tryBackup(text, pass) {
  const d = JSON.parse(text);
  const m = d.items.meta, v = d.items.vault;
  const k = await deriveKey(pass, unb64(m.salt), m.iter);
  try { return JSON.parse(dec.decode(await open(k, { iv: unb64(v.iv), ct: unb64(v.ct) }))); } catch { throw new Error('Buluttaki kasa farklı bir şifreyle oluşturulmuş'); }
}
export async function importBackup(text) {
  const data = JSON.parse(text);
  if (data.app !== 'kasa' || !data.items?.meta || !data.items?.vault) throw new Error('Geçersiz yedek dosyası');
  lock();
  await clearAll();
  for (const [k, v] of Object.entries(data.items)) {
    if (k === 'meta') await put(k, { salt: unb64(v.salt), iter: v.iter, created: v.created });
    else await put(k, { ...v, iv: unb64(v.iv), ct: unb64(v.ct) });
  }
}
export async function wipe() { lock(); await clearAll(); }
