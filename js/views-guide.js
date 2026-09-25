// Kira geliri vergi rehberi + adım adım hesaplayıcı (istisnalar, beyan sınırları, gider yöntemleri, özel durumlar).
import * as S from './store.js';
import { icon, esc, money, pct } from './ui.js';
import { brackets, marginalRate, activeTenant, byId } from './domain.js';
import { head } from './views-ev.js';

const st = () => S.state;
let gYear = null;
let inputs = null;

function defaults(s) {
  // Hesaplayıcıyı mevcut kontratlarla ön-doldur
  let konut = 0, isS = 0, isN = 0, cost = 0, exp = 0;
  for (const t of s.tenants.filter((x) => x.active !== false)) {
    const p = byId(s.properties, t.propertyId); const y = (Number(t.rent) || 0) * 12;
    if (p?.type === 'konut') konut += y; else if (t.stopaj) isS += y; else isN += y;
  }
  for (const p of s.properties) if (activeTenant(s, p.id)) cost += Number(p.purchasePrice) || 0;
  const yr = String(new Date().getFullYear());
  exp = s.ledger.filter((e) => e.scope === 'ev' && e.type === 'gider' && e.date?.startsWith(yr) && ['Aidat', 'Emlak Vergisi', 'Tamir / Bakım', 'DASK / Sigorta', 'Kredi Faizi', 'Fatura', 'Avukat / Noter', 'Damga Vergisi'].includes(e.cat)).reduce((a, e) => a + e.amount, 0);
  return { konut, isS, isN, wage: Number(s.settings.otherIncomeGross) || 0, other: 0, ticari: !s.settings.istisnaEligible, onTime: true, share: 100, method: 'auto', exp, cost };
}

// Adım adım hesap — her adım açıklamasıyla
function compute(v, p) {
  const steps = [];
  const sh = Math.max(1, Math.min(100, Number(v.share) || 100)) / 100;
  const konut = v.konut * sh, isS = v.isS * sh, isN = v.isN * sh;
  const total = konut + isS + isN;
  steps.push(['Hisse payı', `Mülklerdeki payınız %${Math.round(sh * 100)}. Hisseli mülkte her ortak kendi payına düşen kirayı ayrı beyan eder ve istisnadan <b>ayrı ayrı</b> yararlanır.`, money(total)]);

  // İstisna şartları
  const grossAll = total + (Number(v.wage) || 0) + (Number(v.other) || 0);
  const reasons = [];
  if (v.ticari) reasons.push('ticari, zirai veya mesleki kazancınız olduğu için');
  if (grossAll > p.istisnaGelirSiniri) reasons.push(`kira + ücret + diğer gelirlerinizin brüt toplamı (${money(grossAll)}) ${money(p.istisnaGelirSiniri)} sınırını aştığı için`);
  if (!v.onTime) reasons.push('beyanname süresinde verilmediği için');
  const eligible = konut > 0 && reasons.length === 0;
  const istisna = eligible ? Math.min(p.istisna, konut) : 0;
  steps.push(['Konut istisnası', konut <= 0 ? 'Konut kira geliri yok.'
    : eligible ? `Şartları sağlıyorsunuz. Konut kirasının ilk <b>${money(p.istisna)}</b>'si vergiden muaf.`
    : `İstisnadan yararlanamıyorsunuz: ${reasons.join(', ')}.`, eligible ? '−' + money(istisna) : money(0)]);

  const konutEx = konut - istisna;
  const inclS = isS > 0 && (isS + konutEx + isN) > p.beyanSiniri;
  steps.push(['Stopajlı işyeri kirası', isS <= 0 ? 'Stopajlı işyeri kirası yok.'
    : inclS ? `Stopajlı işyeri kiraları (konutta istisnayı aşan kısım ve stopajsız kiralarla birlikte) ${money(p.beyanSiniri)} beyan sınırını aşıyor → <b>tamamı beyana dahil</b>, kiracının kestiği stopaj vergiden düşülür.`
    : `Toplam ${money(p.beyanSiniri)} sınırının altında → <b>beyan edilmez</b>. Kiracının kestiği %20 stopaj nihai vergidir.`, inclS ? money(isS) : 'beyan dışı']);
  if (isN > 0) steps.push(['Stopajsız işyeri kirası', 'Kiracınız şahıs (vergi mükellefi değil) olduğu için stopaj kesilmiyor. Bu kira tutarı ne olursa olsun <b>beyana tabidir</b>.', money(isN)]);

  const must = konutEx > 0 || isN > 0 || inclS;
  const taxableGross = konutEx + isN + (inclS ? isS : 0);
  steps.push(['Beyana tabi gayrisafi gelir', must ? 'Beyanname vermeniz gerekiyor.' : 'Beyanname vermeniz <b>gerekmiyor</b>.', money(taxableGross)]);

  // Gider yöntemleri
  const gotur = taxableGross * 0.15;
  const ratio = total ? taxableGross / total : 0;
  const amort = (Number(v.cost) || 0) * sh * 0.02;
  const gercek = ((Number(v.exp) || 0) * sh + amort) * ratio;
  const calc = (e) => { const m = Math.max(0, taxableGross - e); const t = brackets(m, p.brackets); const c = inclS ? isS * 0.2 : 0; return { e, m, t, c, pay: t - c }; };
  const A = calc(gotur), B = calc(gercek);
  const useB = v.method === 'gercek' || (v.method === 'auto' && B.pay < A.pay);
  const R = useB ? B : A;
  steps.push(['Gider indirimi', `${useB ? '<b>Gerçek gider</b>' : '<b>Götürü gider (%15)</b>'} ${v.method === 'auto' ? 'daha avantajlı olduğu için seçildi' : 'seçildi'}. Götürü: ${money(gotur)} · Gerçek: ${money(gercek)} (belgeli giderler + %2 amortisman; istisnaya isabet eden kısım %${Math.round((1 - ratio) * 100)} oranında düşülmüştür).`, '−' + money(R.e)]);
  steps.push(['Vergi matrahı', `Gelir vergisi tarifesi uygulanır; en üst diliminiz %${Math.round(marginalRate(R.m, p.brackets) * 100)}.`, money(R.m)]);
  steps.push(['Hesaplanan gelir vergisi', 'Artan oranlı tarifeye göre.', money(R.t)]);
  if (R.c) steps.push(['Stopaj mahsubu', 'Kiracının yıl içinde sizin adınıza ödediği %20 stopaj düşülür.', '−' + money(R.c)]);
  const stopajFinal = !inclS ? isS * 0.2 : 0;
  return { steps, must, R, A, B, useB, eligible, istisna, total, stopajFinal, taxableGross, burden: (must ? R.t : 0) + stopajFinal };
}

export function taxGuide(el) {
  const s = st();
  const years = Object.keys(s.settings.tax).map(Number).sort();
  gYear = gYear && s.settings.tax[gYear] ? gYear : (s.settings.tax[new Date().getFullYear()] ? new Date().getFullYear() : years[years.length - 1]);
  inputs = inputs || defaults(s);
  const p = s.settings.tax[gYear];
  const f = (k, label, hint = '', type = 'number') => `<div class="field"><label>${label}</label><input type="${type}" inputmode="decimal" data-g="${k}" value="${esc(inputs[k])}">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;

  el.innerHTML = head('Vergi İstisnaları Rehberi', 'Kira gelirinde hangi istisna ve indirimlerden yararlanırsınız? Kendi rakamlarınızla adım adım hesaplayın.',
    `<div class="seg">${years.map((y) => `<button class="${y === gYear ? 'on' : ''}" data-y="${y}">${y}</button>`).join('')}</div>
     <button class="btn" data-reset>${icon('refresh')} Verilerimden doldur</button>`) + `
  <div class="grid g-4">
    <div class="card kpi"><div class="kpi-top"><span class="ico">${icon('home')}</span>Konut istisnası</div><div class="kpi-val">${money(p.istisna)}</div><div class="kpi-sub">${gYear} yılı kira gelirleri</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="ico blue">${icon('store')}</span>Stopajlı işyeri beyan sınırı</div><div class="kpi-val">${money(p.beyanSiniri)}</div><div class="kpi-sub">Altındaysa beyan yok</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="ico red">${icon('alert')}</span>İstisna gelir eşiği</div><div class="kpi-val">${money(p.istisnaGelirSiniri)}</div><div class="kpi-sub">Brüt gelir toplamı</div></div>
    <div class="card kpi"><div class="kpi-top"><span class="ico green">${icon('percent')}</span>Götürü gider</div><div class="kpi-val">%15</div><div class="kpi-sub">Seçilirse 2 yıl değişmez</div></div>
  </div>

  <div class="grid g-main mt">
    <div class="card"><div class="card-head"><div><h3>Hesaplayıcı</h3><small>Yıllık brüt tutarları girin — sonuç anında güncellenir</small></div></div>
      <div class="form-grid">
        ${f('konut', 'Konut kira geliri (yıllık brüt ₺)')}
        ${f('isS', 'İşyeri kirası — stopajlı (yıllık brüt ₺)', 'Kiracı şirket/esnaf, %20 stopaj kesiyor')}
        ${f('isN', 'İşyeri kirası — stopajsız (yıllık ₺)', 'Kiracı şahıs, stopaj yok')}
        ${f('share', 'Mülkteki hisse payınız (%)', 'Tek başınıza sahipseniz 100')}
        ${f('wage', 'Ücret (maaş) geliri — yıllık brüt ₺', 'İstisna eşiği hesabına dahil')}
        ${f('other', 'Diğer gelirler (faiz, temettü vb.) brüt ₺')}
        ${f('exp', 'Belgeli giderler (yıllık ₺)', 'Onarım, sigorta, aidat, emlak vergisi, faiz…')}
        ${f('cost', 'Mülk(ler)in alış maliyeti (₺)', '%2 amortisman için')}
        <div class="field"><label>Gider yöntemi</label><select data-g="method">
          <option value="auto" ${inputs.method === 'auto' ? 'selected' : ''}>Otomatik (en avantajlı)</option>
          <option value="gotur" ${inputs.method === 'gotur' ? 'selected' : ''}>Götürü gider (%15)</option>
          <option value="gercek" ${inputs.method === 'gercek' ? 'selected' : ''}>Gerçek gider</option></select></div>
        <div></div>
        <label class="check"><input type="checkbox" data-g="ticari" ${inputs.ticari ? 'checked' : ''}> Ticari / serbest meslek kazancım var</label>
        <label class="check"><input type="checkbox" data-g="onTime" ${inputs.onTime ? 'checked' : ''}> Beyannameyi süresinde vereceğim</label>
      </div></div>
    <div class="card" id="gResult"></div>
  </div>
  <div class="card mt"><div class="card-head"><h3>Adım adım hesap</h3></div><div id="gSteps"></div></div>

  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><h3>1. Konut kira istisnası (GVK md. 21)</h3></div>
      <div class="tips">
        <div class="note green">${icon('check')} <div>Konut olarak kiraya verdiğiniz evlerin yıllık kirasının <b>${money(p.istisna)}</b>'lik kısmı vergiden muaftır (${gYear}). Toplam konut kiranız bu tutarın altındaysa ve başka beyan nedeniniz yoksa <b>beyanname vermezsiniz</b>.</div></div>
        <div class="kv"><span>Birden fazla eviniz varsa</span><b>İstisna bir kez, toplam kiraya uygulanır</b></div>
        <div class="kv"><span>Hisseli (ortak) mülk</span><b>Her ortak kendi payı için ayrı istisna kullanır</b></div>
        <div class="kv"><span>Eşlerin ayrı mülkleri</span><b>Her eş ayrı beyan eder, ayrı istisna alır</b></div>
        <div class="kv"><span>İşyeri kirası</span><b>İstisna <u>uygulanmaz</u></b></div>
        <h4 style="margin:10px 0 4px">İstisnadan yararlanamayanlar</h4>
        <div class="note red">${icon('x')} <div>Ticari, zirai veya mesleki kazancı olanlar (şahıs şirketi, serbest meslek) — basit usul dahil.</div></div>
        <div class="note red">${icon('x')} <div>Ücret, kira, menkul sermaye iradı vb. gelirlerinin <b>brüt toplamı ${money(p.istisnaGelirSiniri)}</b>'yi aşanlar (${gYear}).</div></div>
        <div class="note red">${icon('x')} <div>Beyannamesini <b>süresinde vermeyenler</b> veya eksik bildirenler (ihtar/inceleme sonrası).</div></div>
      </div></div>
    <div class="card"><div class="card-head"><h3>2. İşyeri kiraları ve stopaj (GVK md. 94, 86)</h3></div>
      <div class="tips">
        <div class="note blue">${icon('info')} <div>Kiracınız şirket, esnaf veya serbest meslek sahibiyse kiranın <b>%20</b>'sini sizin adınıza vergi dairesine öder (stopaj). Size net %80 ödenir.</div></div>
        <div class="kv"><span>Stopajlı kira ≤ ${money(p.beyanSiniri)}</span><b>Beyan yok — stopaj nihai vergi</b></div>
        <div class="kv"><span>Stopajlı kira > ${money(p.beyanSiniri)}</span><b>Tamamı beyan edilir, stopaj düşülür</b></div>
        <div class="kv"><span>Kiracı şahıs (stopaj yok)</span><b>Tutar ne olursa olsun beyan</b></div>
        <div class="kv"><span>Konut + işyeri birlikte</span><b>Sınır kontrolünde konutta istisnayı aşan kısım da sayılır</b></div>
        <div class="note">${icon('bolt')} <div><b>İpucu:</b> Stopaj matrahı brüt kiradır. Sözleşmede "net kira" yazıyorsa brüt = net ÷ 0,80 olarak hesaplanır; beyanda brüt tutar kullanılır.</div></div>
        <div class="note">${icon('bolt')} <div>Beyan sonrası hesaplanan vergi, kesilen stopajdan azsa <b>aradaki fark iade</b> alınabilir veya diğer vergi borçlarına mahsup edilir.</div></div>
      </div></div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><h3>3. Gider yöntemleri (GVK md. 74)</h3></div>
      <div class="grid g-2" style="gap:10px">
        <div class="card" style="background:var(--bg-2)"><h4>Götürü gider</h4><p class="muted" style="margin:6px 0 0;font-size:13px">Beyana tabi gelirin <b>%15</b>'i belge gerekmeden düşülür. Seçildikten sonra <b>2 yıl</b> gerçek gidere dönülemez. Hak (patent vb.) kiralarında kullanılamaz.</p></div>
        <div class="card" style="background:var(--bg-2)"><h4>Gerçek gider</h4><p class="muted" style="margin:6px 0 0;font-size:13px">Belgeli giderler düşülür; toplam %15'ten fazlaysa avantajlıdır. İstisnaya isabet eden gider kısmı indirilemez.</p></div>
      </div>
      <h4 style="margin:14px 0 6px">Gerçek giderde indirilebilenler</h4>
      ${[['Onarım ve bakım giderleri', 'Kiraya verilen mülk için yaptığınız tamir, boya, tesisat'], ['Sigorta primleri', 'DASK, konut/işyeri sigortası'], ['Emlak vergisi, harç, resimler', 'Mülkle ilgili ödenen vergiler'], ['Amortisman', 'Mülkün maliyet bedelinin yıllık %2\'si (50 yıl)'], ['Kredi faizleri', 'Mülk alımında kullanılan kredinin faizi (konutta ilk 5 yıl, yalnızca bir konut için)'], ['Yönetim giderleri', 'Kiraya verenin üstlendiği aidat, ısınma, su, aydınlatma, asansör'], ['Kiracı adına ödenen kira', 'Kiraya veren başka yerde kirada oturuyorsa, o kira bedeli']].map(([a, b]) => `<div class="kv"><span>${a}</span><b style="font-size:12.5px;color:var(--muted);max-width:55%">${b}</b></div>`).join('')}
    </div>
    <div class="card"><div class="card-head"><h3>4. Özel durumlar ve dikkat edilecekler</h3></div>
      <div class="tips">
        <div class="note">${icon('info')} <div><b>Tahsil esası:</b> Vergi, kiranın ait olduğu yıla değil, <b>tahsil edildiği yıla</b> göre hesaplanır. Peşin alınan birkaç yıllık kira, ilgili yılların geliri olarak dağıtılır.</div></div>
        <div class="note">${icon('info')} <div><b>Emsal kira bedeli:</b> Evinizi <u>bedelsiz</u> birine kullandırırsanız emsal kira üzerinden vergi doğabilir. Anne-baba, çocuk, kardeşe bedelsiz verilen konut ve boş bırakılan mülkler hariçtir.</div></div>
        <div class="note">${icon('info')} <div><b>Banka ile tahsilat zorunlu:</b> Aylık 500 ₺ üzerindeki konut kiralarının banka/PTT ile tahsil edilmesi gerekir; aksi halde özel usulsüzlük cezası kesilir.</div></div>
        <div class="note">${icon('info')} <div><b>Kiracının ödediği aidat/giderler</b> kira gelirine eklenmez; ancak kiracı sizin vergi/sigorta gibi yükümlülüklerinizi üstleniyorsa bunlar kira bedeline dahildir.</div></div>
        <div class="note">${icon('info')} <div><b>Yurt dışında yaşayanlar</b> Türkiye'deki kira gelirleri için aynı şekilde beyanname verir; konut istisnası şartları geçerlidir.</div></div>
        <div class="note red">${icon('alert')} <div><b>Beyan etmemenin sonucu:</b> GİB, MEVA ile tapu–kira eşleştirmesi yapıyor. Beyan edilmeyen kira için vergi + gecikme faizi + <b>vergi ziyaı cezası</b> uygulanır ve istisna hakkı kaybedilir.</div></div>
      </div></div>
  </div>
  <div class="card mt"><div class="card-head"><h3>5. Takvim ve ödeme</h3></div>
    <div class="grid g-4">
      <div><div class="kpi-top">1–31 Mart ${gYear + 1}</div><p style="margin:6px 0 0">Beyanname (Hazır Beyan) + gelir vergisi <b>1. taksit</b></p></div>
      <div><div class="kpi-top">31 Temmuz ${gYear + 1}</div><p style="margin:6px 0 0">Gelir vergisi <b>2. taksit</b></p></div>
      <div><div class="kpi-top">Mayıs & Kasım</div><p style="margin:6px 0 0">Emlak vergisi 1. ve 2. taksit (belediyeye)</p></div>
      <div><div class="kpi-top">Sözleşme imzasında</div><p style="margin:6px 0 0">Damga vergisi: yıllık kira toplamının binde 1,89'u</p></div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:14px">Bu rehber GVK ve GİB rehberleri esas alınarak hazırlanmış bilgilendirme amaçlı bir özettir. Tutarlar Ayarlar → Vergi parametreleri bölümünden güncellenebilir. Kesin beyan için mali müşavirinize danışın.</p>
  </div>`;

  const paint = () => {
    const r = compute(inputs, p);
    el.querySelector('#gSteps').innerHTML = `<div class="table-wrap"><table><tbody>${r.steps.map(([t, d, v], i) => `<tr><td style="width:36px"><span class="avatar" style="width:26px;height:26px;border-radius:8px;font-size:12px">${i + 1}</span></td><td><div class="cell-main">${t}</div><div class="cell-sub" style="font-size:12.5px">${d}</div></td><td class="right num nowrap">${v}</td></tr>`).join('')}</tbody></table></div>`;
    el.querySelector('#gResult').innerHTML = `<div class="card-head"><h3>Sonuç (${gYear})</h3><span class="badge ${r.must ? 'down' : 'up'}">${r.must ? 'Beyanname gerekli' : 'Beyan gerekmiyor'}</span></div>
      <div class="kv"><span>Toplam kira geliri (payınız)</span><b>${money(r.total)}</b></div>
      <div class="kv"><span>Konut istisnası</span><b class="${r.eligible ? 'pos' : 'neg'}">${r.eligible ? '−' + money(r.istisna) : 'Yararlanılamıyor'}</b></div>
      <div class="kv"><span>Beyana tabi gelir</span><b>${money(r.taxableGross)}</b></div>
      <div class="kv"><span>Gider (${r.useB ? 'gerçek' : 'götürü'})</span><b>−${money(r.R.e)}</b></div>
      <div class="kv"><span>Matrah</span><b>${money(r.must ? r.R.m : 0)}</b></div>
      <div class="kv total"><span>${r.R.pay < 0 && r.must ? 'İade alınacak' : 'Beyanla ödenecek vergi'}</span><b>${money(r.must ? Math.abs(r.R.pay) : 0)}</b></div>
      ${r.must && r.R.pay > 0 ? `<div class="kv"><span>Taksitler (Mart + Temmuz)</span><b>2 × ${money(r.R.pay / 2)}</b></div>` : ''}
      <div class="kv"><span>Stopaj (kiracı öder)</span><b>${money(r.stopajFinal + (r.R.c || 0))}</b></div>
      <div class="kv total"><span>Toplam gelir vergisi yükü</span><b>${money(r.burden)}</b></div>
      <div class="kv"><span>Efektif oran</span><b>${r.total ? pct(r.burden / r.total) : '—'}</b></div>
      <div class="kv"><span>Vergi sonrası net kira</span><b class="pos">${money(r.total - r.burden)}</b></div>
      ${r.must ? `<div class="note mt"><small>Götürü ile ${money(Math.max(0, r.A.pay))} · Gerçek gider ile ${money(Math.max(0, r.B.pay))} — fark ${money(Math.abs(r.A.pay - r.B.pay))}</small></div>` : ''}`;
  };
  paint();
  el.querySelectorAll('[data-g]').forEach((i) => i.addEventListener('input', () => {
    const k = i.dataset.g;
    inputs[k] = i.type === 'checkbox' ? i.checked : i.tagName === 'SELECT' ? i.value : Number(String(i.value).replace(',', '.')) || 0;
    paint();
  }));
  el.querySelectorAll('[data-g][type=checkbox], select[data-g]').forEach((i) => i.addEventListener('change', () => i.dispatchEvent(new Event('input'))));
  el.querySelectorAll('[data-y]').forEach((b) => b.addEventListener('click', () => { gYear = Number(b.dataset.y); taxGuide(el); }));
  el.querySelector('[data-reset]').addEventListener('click', () => { inputs = defaults(st()); taxGuide(el); });
}
