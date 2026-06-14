using MobileApp.Api.Models;

namespace MobileApp.Api.Services;

/// <summary>
/// Arıza başlığı ve açıklamasından Türkçe anahtar kelimeler analiz ederek
/// öncelik seviyesi öneren servis.
/// </summary>
public class PriorityAnalyzerService
{
    // ─── KRİTİK: Üretim durdu, can tehlikesi, yangın, elektrik kazası ────────
    private static readonly string[] CriticalKeywords =
    [
        "yangın", "yanıyor", "alev", "patlama", "patladı", "patlıyor",
        "duman çıkıyor", "duman var", "elektrik çarptı", "elektrik çarpması",
        "su basması", "su bastı", "taşma", "sel",
        "üretim durdu", "üretim tamamen durdu", "fabrika durdu", "hat durdu",
        "acil durum", "can tehlikesi", "yaralandı", "yaralı var",
        "gaz kaçağı", "gaz sızıntısı", "zehirli gaz", "kimyasal sızıntı",
        "tüm sistem durdu", "tamamen çöktü", "genel arıza", "toplu arıza",
        "kritik", "acil", "alarm", "emergency"
    ];

    // ─── YÜKSEK: Ekipman tamamen çalışmıyor, ciddi arıza ─────────────────────
    private static readonly string[] HighKeywords =
    [
        "çalışmıyor", "çalışmaz oldu", "çalışmadı", "durdu", "duruyor",
        "bozuk", "arızalı", "kapandı", "açılmıyor", "çöktü",
        "erişilemiyor", "başlamıyor", "yanıt vermiyor", "dondu",
        "kullanılamıyor", "devre dışı", "aşırı ısınıyor", "aşırı ısındı",
        "sıfırlanamıyor", "kritik hata", "tamamen bozuldu",
        "motor durdu", "pompa durdu", "konveyör durdu", "vinç durdu",
        "hata kodu", "system error", "fault alarm"
    ];

    // ─── ORTA: Çalışıyor ama sorunlu, performans düşük ───────────────────────
    private static readonly string[] NormalKeywords =
    [
        "yavaş", "yavaşladı", "gürültü", "gürültü yapıyor", "ses çıkarıyor",
        "titreşim", "titriyor", "sarsılıyor", "sallanıyor",
        "zaman zaman", "arada bir", "sık sık", "bazen",
        "ısınıyor", "ısınmaya başladı", "sıcak", "sıcaklık yüksek",
        "performans düşük", "geç açılıyor", "düzensiz çalışıyor",
        "vuruntu", "anormal ses", "sızıntı", "damlıyor", "damlatıyor",
        "akıyor", "yağ kaçıyor", "su kaçıyor", "filtre tıkalı"
    ];

    // ─── DÜŞÜK: Planlı bakım, küçük kozmetik sorun ───────────────────────────
    private static readonly string[] LowKeywords =
    [
        "bakım", "periyodik bakım", "rutin bakım", "planlı bakım",
        "kontrol", "temizlik", "inceleme", "hafif sorun",
        "küçük sorun", "ufak sorun", "bilgi", "bilgilendirme",
        "öneri", "cosmetic", "estetik", "önemsiz", "küçük",
        "çizik", "boyası dökülmüş", "etiketi kopmuş"
    ];

    private static readonly Dictionary<FaultPriority, string> Reasons = new()
    {
        [FaultPriority.Critical] = "Yangın, patlama, can tehlikesi veya üretim tamamen durdu — Acil müdahale gerekli!",
        [FaultPriority.High]     = "Ekipman çalışmayı tamamen durdurmuş, ciddi arıza var.",
        [FaultPriority.Normal]   = "Ekipman çalışıyor ancak performans sorunu veya orta düzey arıza mevcut.",
        [FaultPriority.Low]      = "Rutin bakım veya küçük kozmetik sorun — Planlı müdahale yeterli."
    };

    /// <summary>
    /// Verilen başlık ve açıklamayı analiz ederek öncelik önerisi ve gerekçe döner.
    /// </summary>
    public (FaultPriority Priority, string Reason) Analyze(string title, string description)
    {
        var combined = $"{title} {description}".ToLowerInvariant();

        // Skor tabanlı: kritik keyword birden fazla geçiyorsa ağırlık ver
        var criticalScore = CriticalKeywords.Count(k => combined.Contains(k, StringComparison.OrdinalIgnoreCase));
        var highScore     = HighKeywords.Count(k => combined.Contains(k, StringComparison.OrdinalIgnoreCase));
        var normalScore   = NormalKeywords.Count(k => combined.Contains(k, StringComparison.OrdinalIgnoreCase));
        var lowScore      = LowKeywords.Count(k => combined.Contains(k, StringComparison.OrdinalIgnoreCase));

        if (criticalScore > 0)
            return (FaultPriority.Critical, Reasons[FaultPriority.Critical]);

        if (highScore > 0)
            return (FaultPriority.High, Reasons[FaultPriority.High]);

        if (normalScore > 0)
            return (FaultPriority.Normal, Reasons[FaultPriority.Normal]);

        if (lowScore > 0)
            return (FaultPriority.Low, Reasons[FaultPriority.Low]);

        // Hiçbir keyword eşleşmezse: Normal (varsayılan)
        return (FaultPriority.Normal, "Açıklamada belirgin bir anahtar kelime bulunamadı; standart öncelik atandı.");
    }
}
