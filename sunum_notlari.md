# Arıza Takip ve Stok Yönetimi (MobileApp) - Vize Sunum Notları

Bu doküman, "Arıza Takip ve Envanter Yönetimi" projenizin vize sunumunda size rehberlik etmek için hazırlanmıştır. Projenin öne çıkan özelliklerine, gösterilmesi gereken ekranlara ve teknik backend mimarisine detaylıca değinilmektedir.

---

## 1. Sunumda Neler Konuşabiliriz? Hangi Arayüzleri Gösterebiliriz?

**Sunum Akışı Tavsiyesi:**
Sunuma, kurumsal firmaların arıza giderirken yaşadığı donukluğu ve malzeme (stok) takibi eksikliğini anlatarak başlayın. *"Sahadaki teknisyen arızayı çözerken depodan ne eksildiğini anında sisteme işlemeli"* argümanı en güçlü başlangıcınız olacaktır.

**Canlı Demoda / Slaytlarda Gösterilecek Ekranlar:**
1. **Kayıt ve Şirket Kodu Akışı:** Yeni bir yöneticinin şirket oluşturması ve diğer çalışanların 4 haneli benzersiz şirket kodu (örn. *RQ2C*) ile o ekibe direkt dahil olma (Multi-tenant) ekranı. 
2. **Rol Bazlı Dashboard:** Çalışanın sadece kendi bildirdiği arızaları görmesi, ancak "Teknisyen"in farklı olarak tüm acil/bekleyen iş emirlerini (*Work Orders*) gördüğü ana ekran farkı.
3. **Arıza Bildirme (Fault Report):** Bir çalışanın aciliyet belirterek, fotoğraf/detay ile sisteme bir arıza kaydetme sayfası.
4. **Teknisyenin Arıza Çözümü ve Stoktan Düşme:** Teknisyenin arızayı devralması ve "Çözüldü" olarak işaretlerken *"Bu işlem için 2 adet vana kullandım"* diyerek (*Material Usage*) depodan otomatik stok düştüğü işlem akışı.
5. **Kritik Stok Uyarısı ve Satın Alma (Purchase Order):** Depodaki bir malzeme belirlenen kritik sınırın altına düşünce sistemin otomatik olarak "Bekleyen Satın Alma Siparişi (*Pending Purchase Order*)" oluşturduğu ve yönetici ekranında beliren onay sayfası.

---

## 2. Bizi Parlatacak Özellikler (Pazardaki Uygulamalardan Farkımız)

Piyasadaki standart "Helpdesk/Destek Talebi" uygulamaları çoğunlukla sadece bildirim-çözüm akışına odaklanır. Sizin projenizi farklı kılan ve jüriye vurgulanması gereken **parlatıcı özellikler** şunlardır:

*   **1. Entegre Zincir (Arıza -> İş Emri -> Stok -> Satın Alma Otomasyonu):** 
    Bizde süreç arızanın kapanmasıyla bitmiyor. Teknisyen arızayı onarmak için malzeme (*Material*) kullandığında stok anında düşer. Eğer stok **kritik seviyenin altına inerse**, sistem kendi kendine bir "Satın Alma Taslağı" oluşturur ve muhasebenin/yetkilinin onayına sunar. Sistem gerçeğe çok yakın bir ERP(Kurumsal Kaynak Planlama) senaryosu sunar.
*   **2. Çoklu Şirket (Multi-Tenant) Mimari (SaaS):**
    Uygulama tekil bir işletme için değil, **Hizmet (SaaS)** mantığıyla tasarlandı. Farklı firmalar üye olup kendi kurumsal izolasyonlu alanlarını yaratabilir. Şirket Kodu ile çalışanların güvenli katılımı sağlanır.
*   **3. Güçlü Otantikasyon ve Güvenli OTP Entegrasyonu:**
    E-Posta (SMTP) üzerinden gerçek zamanlı dinamik şifre sıfırlama onay kodları akışı kurulmuştur. 
*   **4. Dinamik Token Mimarisi:** 
    Gelecek için tasarlanmış JWT Token mimarisi ile kullanıcı rolleri backend'de doğrulanarak yetki ihlalleri engellenir. Şirketin dışından biri şirket verisine asla (Postman ile bile) GET isteği atamaz.

---

## 3. Bir Arıza ve Stok Uygulamasının Olmazsa Olmazları

Jürinin kesinlikle sistemin yapabildiğini görmek isteyeceği noktalar:
1. **Rol Bazlı İçerik ve Yetkilendirme (RBAC):** Normal bir çalışan asla sistemin ayarlarını görmemeli veya başka şirketin stoğunu okuyamamalıdır. Proje bu izolasyonu "Claim"ler üzerinden çözmektedir.
2. **Audit ve Geçmiş Kaydı (Loglama):** Depodan malzemenin kim tarafından, ne zaman, hangi iş emri için çıkarıldığının veya ne zaman yeni sipariş geldiğinin (*StockMovement*) detaylı loglanması şarttır.
3. **Kapsamlı Durum Yönetimi (State Machine):** Arıza durumları "Geldi" ve "Çözüldü" kadar basit olmamalı. Arada "İşleme Alındı", "Malzeme Bekleniyor" gibi ara durumların tutulması gerekir.

---

## 4. Backend Servisleri Nasıl Yapıldı? Hangi Mimari Kullanıldı?

*   **Platform / Framework:** ASP.NET Core 8 Web API
*   **Database (Veritabanı) & ORM:** PostgreSQL ve Entity Framework Core (EF Core). Katı SQL yazmak yerine Model'ler üzerinden (Code-First Migration) veritabanı şeması üretildi.
*   **Mimari Yaklaşım:** Monolithic N-Layer Design vizyonuyla tasarlandı. İletişim, View/Görünüm içermeyen RESTful API mimarisi üzerinden gerçekleştirilmiştir.

---

## 5. Backend Hakkında Soru Gelebilecek Kritik Noktalar

### A. API Servisleri Nasıl Yapıldı? (Nasıl Çalışıyor?)
*   Geleneksel web sitelerinden farklı olarak HTML(View) döndürmeyen saf `[ApiController]` sınıfları kuruldu. İletişim JSON formatında (dilden bağımsız) sağlanır.
*   Mobil uygulama, güvenli iletişim için HTTP metodlarını anlamlı bir şekilde kullanır: Kayıt için `POST`, getirmek için `GET`, güncellemek için `PUT`, vs.
*   **Data Transfer Objects (DTO):** Veritabanı tablolarımız (Entity Modelleri) doğrudan dış dünyaya açılmaz, "DTO" ara objelerine dönüştürülerek süzülür. Bu şifre gibi hassas verilerin sızmasını engeller.
*   **Dependency Injection (Bağımlılık Enjeksiyonu):** `AppDbContext` (Veritabanı yöneticisi) statik kalıtımlar yerine, "Inversion of Control" kuralına uyarak `Program.cs`'de sisteme dahil edilmiş (Inject) ve güvenlik arttırılmıştır.

### B. Veritabanı Bağlantısı Nasıl Yapıldı?
C#'ın güçlü ORM aracı **Entity Framework Core (Npgsql paketi ile)** kullanıldı. `UseNpgsql()` metodu ile bağlantı sağlandı. Bağlantı dizesi ("Connection String") kod içine gömülmek yerine, güvenlik prensiplerine uygun olarak `appsettings.json` ve Environment `.env` dosyalarından okunacak şekilde izole edildi.

### C. Neden Bulut "Render DB"? Neden Kendi Bilgisayarında Değil?
Hocaların ilgisini en net çekecek olan savunma noktası budur:
1. **Zamana ve Mekana Bağımsız Kesintisiz Erişim (High Availability):** Sunum esnasında cihazın okul internetinden veya mobil veriden projeye bağlanması gerekebilir. Yerel bir veritabanı mobil emülatör ağlarına takılabilirken; Render sayesinde veritabanı **Canlı ve Production-Ready** (Sürekli Erişilebilir) olarak konumlandırılmıştır.
2. **Ekip İçi Paralel Geliştirme:** Uygulamanın farklı kısımlarını yapan veya testini sağlayan takım üyelerinin her defasında yerelde Docker ayağa kaldırıp "Aynı veriyi girelim" demesine gerek kalmamıştır. Gerçek veri senkronizasyonu sağlanmıştır.
3. **SSL/TLS Güvenliği Eğitimi:** Dışarıdan bağlanan bir sistemde Render zorunlu kıldığı `SslMode=Require` protokolü sebebiyle, siber güvenlik derslerinde olduğu gibi taşıma katmanı şifrelemesini de uygulamanın mecburi bir parçası haline getirmiş oldu.
