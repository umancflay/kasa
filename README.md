# Kasa — Mülk & Kişisel Finans Paneli

Kiraya verilen ev ve dükkanların, kiracıların, kira artışlarının, vergilerin (GMSİ), borçların ve kişisel gelir-giderin tek yerden takip edildiği; **şifreli**, **mobil uyumlu**, koyu temalı bir web uygulaması (PWA).

## Özellikler

**Ev & Mülk**
- Evler ve dükkanlar ayrı ayrı; mülk kartları, doluluk, brüt getiri (yield), yıllık net
- Kiracı bilgileri (iletişim, kefil, acil durum kişisi, depozito, stopaj durumu)
- 12 aylık **tahsilat ızgarası**: kutucuğa dokun, kira tahsil edildi → otomatik olarak Ev Defteri'ne işlenir
- **Zam & Verim**: TÜFE 12 aylık ortalamasına göre yasal azami kira, yenileme takvimi, emsal kira karşılaştırması, 5 yıl (kira tespit davası) ve 10 yıl (TBK 347) uyarıları, otomatik öneriler
- **İstisnalar rehberi & hesaplayıcı**: konut istisnası şartları, stopaj beyan sınırı, hisseli mülk, gider yöntemleri, adım adım hesap
- **Vergi (GMSİ)**: konut istisnası, stopajlı işyeri beyan sınırı, götürü (%15) ve gerçek gider karşılaştırması, amortisman, gelir vergisi dilimleri, stopaj mahsubu, emlak vergisi, vergi takvimi
- Kira sözleşmesi / tapu / makbuz fotoğrafları ve PDF'ler (şifreli saklanır)
- Ev defteri ve ev borçları (şahsi hesaplardan tamamen ayrı)

**Şahsi**
- Şahsi gelir-gider defteri, kategori dağılımı, tasarruf oranı
- Şahsi borçlar: taksit takibi, 12 aylık ödeme planı, "borçsuz olma" tarihi
- Yatırımlar: kripto, altın ve döviz için Binance halka açık verisinden canlı fiyatlar; finansal sağlık göstergeleri

**Genel**
- Genel bakış paneli, yaklaşanlar/hatırlatmalar, not defteri, mülk sahiplerine yönelik haberler
- Global arama (⌘K), hızlı kayıt, CSV dışa aktarma

## Güvenlik

- Şifreden **PBKDF2-SHA256 (310.000 tur)** ile anahtar türetilir, tüm veriler **AES-256-GCM** ile şifrelenip tarayıcının IndexedDB'sinde saklanır.
- Şifre hiçbir yere kaydedilmez. **Şifre unutulursa veriler kurtarılamaz.**
- Hareketsizlikte otomatik kilit (varsayılan 10 dk).
- Bu depoda hiçbir kişisel veri yoktur; veriler yalnızca kullanılan cihazda durur.
- **Cihazlar arası senkron:** şifreli kasa, kullanıcının gizli GitHub reposuna (`kasa-data`) yazılır; tüm cihazlar tek şifreyle aynı veriyi görür. Şifre değişikliği diğer cihazlara da geçer.
- Elle taşıma da mümkün: Ayarlar → *Şifreli yedek indir* → diğer cihazda *Yedekten yükle*.

## Kullanım

GitHub Pages adresini telefonda açın → Safari'de **Paylaş → Ana Ekrana Ekle** (Android'de Chrome → *Uygulamayı yükle*). Uygulama gibi tam ekran açılır ve çevrimdışı da çalışır.

Yerelde çalıştırmak için:

```bash
python3 -m http.server 8765
```

sonra `http://localhost:8765` adresini açın.

## Güncel yasal değerler (Ayarlar'dan değiştirilebilir)

| Parametre | Değer |
|---|---|
| Kira artış sınırı (TÜFE 12 ay ort., Eylül 2026) | %31,79 |
| Konut kira istisnası (2026) | 58.000 ₺ |
| Stopajlı işyeri kira beyan sınırı (2026) | 400.000 ₺ |
| 2026 dilimleri | 190.000 / 400.000 / 1.000.000 / 5.300.000 ₺ → %15/20/27/35/40 |
| İşyeri kira stopajı | %20 |

> Hesaplamalar bilgilendirme amaçlıdır; kesin beyan için mali müşavire danışın. Yatırım bölümü genel göstergeler sunar, yatırım tavsiyesi değildir.

## Yol haritası

- Binance hesabı bağlantısı (read-only API anahtarı + Cloudflare Worker proxy)
- TÜFE oranının otomatik çekilmesi
- Kira hatırlatma bildirimleri

## Teknik

Bağımlılık yok, derleme yok: saf HTML + CSS + ES modülleri. Grafikler elle yazılmış SVG.

```
index.html          Kabuk (kilit ekranı, menü)
css/style.css       Tema (koyu, mobil uyumlu)
js/store.js         Şifreli depolama (WebCrypto + IndexedDB), yedekleme
js/domain.js        Kategoriler, vergi/kira hesapları, demo veri
js/editors.js       Ekleme/düzenleme pencereleri
js/views-ev.js      Ev paneli, mülkler, kiracılar, zam & verim, sözleşmeler, vergi
js/views-main.js    Genel bakış, defterler, borçlar, şahsi, yatırım, haberler, ayarlar
js/views-guide.js   Vergi istisnaları rehberi + adım adım hesaplayıcı
js/sync.js          Cihazlar arası şifreli senkron (GitHub gizli repo)
js/app.js           Yönlendirme, arama, otomatik kilit
sw.js               Çevrimdışı önbellek
```
