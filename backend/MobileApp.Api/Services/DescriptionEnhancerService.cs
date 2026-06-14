namespace MobileApp.Api.Services;

/// <summary>
/// Kullanıcının yazdığı kısa ve hatalı açıklamayı
/// şablona dayalı olarak profesyonel arıza raporu metnine dönüştürür.
/// </summary>
public class DescriptionEnhancerService
{
    private record EnhancementTemplate(string Problem, string Cause, string Action);

    private static readonly (string[] Keywords, EnhancementTemplate Template)[] Templates =
    [
        (["titreşim", "titriyor", "sarsılıyor", "sallanıyor"],
            new("Ekipman, normal çalışma koşulları dışında anormal titreşim ve sarsılma belirtisi göstermektedir.",
                "Motor bileşenlerinde mekanik dengesizlik, gevşek bağlantı elemanları veya yataklama sorunu şüphelenilmektedir.",
                "Titreşim kaynağının tespiti için ekipmana teknik kontrol yapılmalı ve gerekli mekanik ayarlamalar gerçekleştirilmelidir.")),

        (["gürültü", "ses geliyor", "sesler", "ses çıkarıyor", "vuruntu"],
            new("Ekipman, normal çalışma sesinin dışında anormal gürültü üretmektedir.",
                "Rulman aşınması, dişli uyumsuzluğu veya gevşek mekanik bileşenler olası nedenler arasındadır.",
                "Gürültü kaynağının tespiti için yetkili teknisyen tarafından kapsamlı teknik kontrol yapılması gerekmektedir.")),

        (["ısın", "aşırı sıcak", "sıcaklık", "ısı", "yanıyor gibi"],
            new("Ekipman, çalışma süresi boyunca kabul edilemez düzeyde ısınma ve yüksek sıcaklık belirtisi göstermektedir.",
                "Soğutma sistemi yetersizliği, hava filtresi tıkanması, soğutucu eksikliği veya aşırı yüklenme bu duruma yol açıyor olabilir.",
                "Soğutma sistemi ve filtreler ivediyle kontrol edilmeli; gerekirse yük azaltılmalı ve soğutucu sirkülasyonu sağlanmalıdır.")),

        (["çalışmıyor", "çalışmaz", "çalışmadı", "durdu", "duruyor", "durdurdu", "kapandı", "kapanıyor", "açılmıyor", "başlamıyor"],
            new("Ekipman çalışmayı tamamen durdurmuş ve işlevini yerine getiremez hale gelmiştir.",
                "Güç kaynağı arızası, elektronik kontrol birimi sorunu veya mekanik hasar olası nedenler arasındadır.",
                "Kapsamlı teknik inceleme yapılarak arıza kökü tespit edilmeli ve gerekli parça değişimi en kısa sürede gerçekleştirilmelidir.")),

        (["yavaş", "geç", "performans", "kasıyor", "takılıyor"],
            new("Ekipman normal kapasitesinin belirgin biçimde altında çalışmakta ve performans düşüklüğü yaşanmaktadır.",
                "Yazılım/firmware sorunu, mekanik aşınma veya yük dengesizliği performans düşüşüne neden olabilir.",
                "Sistem kalibrasyonu ve performans testi yapılmalı; gerekirse yazılım güncellemesi veya mekanik servis uygulanmalıdır.")),

        (["sızıntı", "sız", "damlıyor", "damlatıyor", "damlattı", "su kaçıyor", "yağ kaçıyor", "akıyor"],
            new("Ekipmanda sıvı veya gaz kaçağı tespit edilmiş olup bu durum güvenlik riski oluşturabilir.",
                "Bağlantı elemanlarının gevşemesi, conta veya boru hasarı sızıntıya neden olmuş olabilir.",
                "Sızıntı kaynağı derhal tespit edilmeli; güvenlik prosedürleri çerçevesinde sızdırmazlık onarımı yapılmalıdır.")),

        (["bakım", "periyodik", "rutin", "kontrol zamanı", "bakım zamanı"],
            new("Ekipman, planlı bakım dönemine ulaşmış olup rutin bakım işlemlerinin yapılması gerekmektedir.",
                "Belirli çalışma süresi veya üretici bakım aralığı aşılmıştır.",
                "Yetkili teknisyen tarafından periyodik bakım prosedürleri uygulanmalı ve bakım kaydı güncellenmelidir.")),

        (["yanıyor", "duman", "kıvılcım", "elektrik çarptı", "çarpıyor"],
            new("Ekipman yangın, duman veya elektrik çarpması riski oluşturmaktadır. Bu durum acil müdahale gerektirmektedir.",
                "Elektrik bağlantı arızası, kısa devre veya aşırı ısınma kaynaklı yanma riski mevcuttur.",
                "Ekipman derhal devre dışı bırakılmalı, güç kaynağı kesilmeli ve yetkili ekip tarafından güvenlik değerlendirmesi yapılmalıdır.")),

        (["hata", "hata veriyor", "hata kodu", "alarm", "uyarı veriyor", "uyarı"],
            new("Ekipman hata veya alarm durumu oluşturmakta olup normal operasyon kesintiye uğramıştır.",
                "Yazılım hatası, sensör arızası veya mekanik sorun alarm tetikleyici olabilir.",
                "Hata kodu kayıt altına alınmalı ve teknik destek ekibi tarafından diagnostik inceleme gerçekleştirilmelidir.")),

        (["bozuk", "arızalı", "hasar", "kırık", "ezik", "çatlak"],
            new("Ekipman fiziksel hasar veya bileşen arızası nedeniyle işlevini tam olarak yerine getirememektedir.",
                "Mekanik çarpmalar, malzeme yorulması veya üretim kaynaklı hata bozulmaya yol açmış olabilir.",
                "Hasarlı bileşen tespit edilerek değiştirilmeli ve ekipman tam işlevsellik kontrolünden geçirilmelidir."))
    ];

    /// <summary>
    /// Kısa ham metni profesyonel arıza raporu diline dönüştürür.
    /// </summary>
    public string Enhance(string rawText)
    {
        if (string.IsNullOrWhiteSpace(rawText) || rawText.Length < 4)
            return rawText;

        var lower = rawText.ToLowerInvariant();

        foreach (var (keywords, t) in Templates)
        {
            if (keywords.Any(k => lower.Contains(k, StringComparison.OrdinalIgnoreCase)))
            {
                // Orijinal metni koruyarak + şablonu ekle
                var trimmed = rawText.Trim();
                if (!trimmed.EndsWith('.')) trimmed += ".";
                return $"{trimmed}\n\nTeknik Değerlendirme: {t.Problem} {t.Cause}\n\nÖnerilen Aksiyon: {t.Action}";
            }
        }

        // Hiçbir keyword eşleşmezse: sadece metni düzenle, sabit cümle ekleme
        var cleaned = rawText.Trim();
        if (cleaned.Length > 0)
        {
            cleaned = char.ToUpper(cleaned[0]) + cleaned[1..];
            if (!cleaned.EndsWith('.')) cleaned += ".";
        }
        return $"{cleaned} Ekipmanın durumu teknisyen tarafından yerinde incelenerek uygun müdahale belirlenmelidir.";
    }
}
