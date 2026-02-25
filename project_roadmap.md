# Arıza Takip Sistemi — 3 Aylık Geliştirme Planı (v2)

> **Toplam süre:** 12 hafta (3 ay)  
> **Ara teslim:** Hafta 6 (1.5 ay)  
> **Final teslim:** Hafta 12 (3 ay)  
> **Teknoloji:** React Native · ASP.NET Core 8 · PostgreSQL

> ⏸️ **Kapsam Dışı (Sonraya Bırakıldı):** QR Kod, PDF/Excel dışa aktarım, Önleyici bakım takvimi, Alet takibi

---

## Temel Kararlar

### Malzeme / Stok Terminolojisi
Tamir sürecinde kullanılan her şeyi (yedek parça, sarf malzeme, sarf ürün) kapsayan genel isim:

> **"Malzeme"** kullanılacak ✅

| Tablo adı (önceki) | Tablo adı (yeni) | Açıklama |
|---|---|---|
| `Parts` | `Materials` | Malzeme kataloğu |
| `PartUsages` | `MaterialUsages` | Malzeme kullanım kayıtları |

---

### Sektör Listesi (Öneri)

| Sektör | Örnek Kullanıcı |
|--------|----------------|
| Üretim / Fabrika | CNC tezgahları, montaj hatları |
| Lojistik / Depo | Forkliftler, konveyörler, raflar |
| Eğitim | Okul, üniversite — bilgisayarlar, projeksiyonlar |
| Sağlık | Hastane, klinik — tıbbi cihazlar, jeneratörler |
| Konaklama | Otel — klimalar, asansörler, mutfak ekipmanları |
| Perakende | Mağaza, AVM — kasa sistemleri, soğutucular |
| Ofis / Kurumsal | Şirket ofisi — bilgisayarlar, klimalar, mobilya |
| İnşaat | Şantiye — iş makineleri, kompresörler |
| Gıda & İçecek | Restoran, fabrika — fırınlar, soğutucular |
| Tarım | Traktörler, sulama sistemleri, kurutucular |
| Enerji | Jeneratörler, transformatörler, UPS |
| Diğer | Özelleştirilebilir / serbest giriş |

---

### Depo Sorumlusu Rolü (Opsiyonel)
- Şirkette bu rolde kullanıcı **varsa** → malzeme kullanımı Depo Sorumlusu onayı gerektirir
- Şirkette bu rolde kullanıcı **yoksa** → teknisyen malzeme seçince stok **otomatik düşer**, onay gerekmez
- Yönetici isterse bu rolü sonradan atayabilir

---

### Stok Tükendi → Yönetici Onay Akışı (Güncellenmiş)
```
Teknisyen malzeme seçer → Stok = 0 uyarısı
        ↓
Yönetici bildirim alır → "Stok tükendi: [Malzeme adı]"
        ↓
Yönetici uygulamada ONAYLA veya REDDET seçer
        ↓
[ONAY] → Satın Alma departmanına iş emri + bildirim gider
[RED]  → Konu kapanır, hiçbir yere bildirim gitmez
```

---

### Bildirim Listesi (Güncellenmiş)

| Olay | Bildirim Alan |
|------|---------------|
| Yeni arıza kaydı oluşturuldu | Teknisyen |
| Satın alma talebi / stok onayı | Satın Alma |
| Malzeme geldi (satın alma kapandı) | Teknisyen |
| **Arıza kaydı kapandı** ✅ | Çalışan + Yönetici + Teknisyenler |
| Stok tükendi | Yönetici |

> 📱 Push bildirim öncelikli (Firebase FCM). Zorluk çıkarırsa e-posta bildirimine fallback yapılır.

---

### Fiyatlandırma Önerisi

Türk KOBİ pazarına uygun **SaaS abonelik modeli** önerilir:

| Plan | Kullanıcı | Aylık Fiyat | Hedef Kitle |
|------|-----------|-------------|-------------|
| **Başlangıç** | 1–10 | ₺399 / ay | Küçük atölye, butik fabrika |
| **Büyüme** | 11–50 | ₺899 / ay | Orta ölçekli işletme |
| **Kurumsal** | Sınırsız | ₺1.999 / ay | Büyük fabrika, çok şubeli |
| **Ücretsiz Deneme** | 5 | 14 gün | Tüm planlar |

> 💡 Global rakipler (Limble: $28/kullanıcı/ay, Fiix: $45+) bu fiyatların 3–5 katı. Türkiye pazarında güçlü rekabet avantajı sağlar.  
> 💡 Başlangıçta **pilot müşterilerle ücretsiz** test edilmesi, sonra fiyatlandırma modeline geçilmesi tavsiye edilir.

---

## FAZ 1 — Ara Teslim (Hafta 1–6)

### Sprint 1 (Hafta 1–2): Temel & Kimlik Doğrulama

**Backend:**
- [ ] Veritabanı şeması (Users, Companies, Sectors, Assets, FaultReports, WorkOrders, PurchaseOrders, Materials, MaterialUsages, StockMovements, Notifications, AuditLogs)
- [ ] EF Core migration'ları
- [ ] JWT kimlik doğrulama (kayıt / giriş / token yenileme)
- [ ] Kullanıcı ve şirket CRUD API'leri
- [ ] Sektör ve malzeme seed verisi

**Frontend:**
- [x] React Native tam kurulum (android/ ios/ klasörleri)
- [x] Navigasyon altyapısı (Stack + Bottom Tabs)
- [ ] Splash / Onboarding ekranı
- [x] Kayıt ekranı (sektör seçimi, varlık girişi, rol seçimi, kişisel bilgiler)
- [x] Giriş ekranı
- [x] Auth Context ve token yönetimi

---

### Sprint 2 (Hafta 3–4): Arıza Kaydı & İş Emri Akışı

**Backend:**
- [ ] Arıza kaydı CRUD (oluştur, listele, detay, güncelle, kapat)
- [ ] İş emri durum makinesi (Açık → İşlemde → Beklemede → Kapandı)
- [ ] Her durum geçişinde otomatik timestamp
- [ ] Rol bazlı yetkilendirme middleware
- [ ] Yorum/not API'si (iş emri başına)

**Frontend:**
- [ ] Çalışan ana ekranı — arıza listesi + yeni arıza butonu
- [ ] Arıza kaydı oluşturma — ekipman seçimi, açıklama, **öncelik seviyesi**, **fotoğraf ekleme**
- [ ] Teknisyen ana ekranı — iş emirleri listesi, önceliğe göre sıralı
- [ ] İş emri detay ekranı — açıklama, ekipman, **yorum zinciri**, durum güncelleme
- [ ] Yönetici ekranı — tüm arızalar özeti + **stok durumu görünümü**

---

### Sprint 3 (Hafta 5–6): Malzeme/Stok, Satın Alma Akışı & Bildirimler

**Backend:**
- [ ] Malzeme kataloğu CRUD
- [ ] Malzeme kullanımı → Depo Sorumlusu varsa onay, yoksa otomatik stok düşme
- [ ] Stok = 0 → Yönetici uyarısı → Onay/Red akışı → Satın Alma iş emri
- [ ] Satın Alma iş emri API'leri
- [ ] Firebase FCM push bildirim entegrasyonu
- [ ] Bildirim tetikleyicileri: yeni arıza, satın alma talebi, malzeme geldi, **arıza kapandı**

**Frontend:**
- [ ] Malzeme listesi ekranı (Teknisyen & Depo Sorumlusu)
- [ ] Malzeme kullanım kayıt ekranı
- [ ] Satın alma talebi oluşturma (Teknisyen → Satın Alma)
- [ ] Yönetici onay/red ekranı (stok tükendi bildirimi)
- [ ] Satın Alma ekranı (gelen talepler, kapatma)
- [ ] Bildirim ekranı (tüm roller)

---

## FAZ 1 DEMO (Ara Teslim)

```
✅ Tüm roller kayıt olabilir, sisteme giriş yapabilir
✅ Çalışan → arıza kaydeder (öncelik + fotoğraf)
✅ Teknisyen → bildirim alır, iş emrini görür, yorum ekler
✅ Teknisyen → malzeme kullanır → stok düşer
✅ Stok bitince → Yönetici onaylar → Satın Alma iş emri
✅ Satın Alma → talebi kapatır → Teknisyen bildir alır
✅ Teknisyen → arızayı kapatır → Çalışan + Yönetici bildirim alır
✅ Yönetici → tüm arızalar + stok durumu tek ekranda
```

---

## FAZ 2 — Final Teslim (Hafta 7–12)

### Sprint 4 (Hafta 7–8): Raporlama & Analitik

- [ ] Özet istatistik API'leri (MTTR, açık iş emirleri, en arızalı ekipman)
- [ ] Kullanıcı bazlı performans metrikleri
- [ ] Yönetici dashboard — grafikler, tarih filtreli liste
- [ ] Ekipman bazlı arıza geçmişi ekranı

### Sprint 5 (Hafta 9–10): Gelişmiş Özellikler & UX

- [ ] Çoklu şube / lokasyon desteği (aynı şirketin farklı binaları)
- [ ] Gelişmiş arama ve filtreler (tarih, öncelik, ekipman, durum)
- [ ] Yönetici: kullanıcı davet / rol değiştirme ekranı
- [ ] Malzeme minimum stok eşiği (kritik seviye altına düşünce uyarı)
- [ ] Dark / Light mode

### Sprint 6 (Hafta 11–12): Polish, Test & Yayın

- [ ] Loading skeleton ve geçiş animasyonları
- [ ] Kapsamlı hata yönetimi ve boş durum ekranları
- [ ] End-to-end test senaryoları
- [ ] Performans optimizasyonu
- [ ] Play Store & App Store hazırlık (ikon, ekran görüntüsü, açıklama)

---

## Veritabanı Tabloları

| Tablo | Açıklama |
|-------|----------|
| `Users` | Kullanıcılar (rol, şirket) |
| `Companies` | Şirket bilgileri |
| `Sectors` | Sektör listesi |
| `Assets` | Ekipmanlar |
| `FaultReports` | Arıza kayıtları |
| `WorkOrders` | Teknisyen iş emirleri |
| `PurchaseOrders` | Satın alma iş emirleri |
| `Materials` | Malzeme kataloğu |
| `MaterialUsages` | Malzeme kullanım kayıtları |
| `StockMovements` | Stok giriş/çıkış |
| `Comments` | Yorum/not zinciri |
| `Notifications` | Bildirim kayıtları |
| `AuditLogs` | Tarih/saat logları |
