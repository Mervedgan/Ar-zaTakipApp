using MobileApp.Api.Models;

namespace MobileApp.Api.Services;

/// <summary>
/// Arıza başlığı ve açıklamasından Google Gemini API kullanarak
/// öncelik seviyesi öneren servis. API hata verirse kural tabanlı
/// analiz devreye girer.
/// </summary>
public class PriorityAnalyzerService
{
    private readonly GeminiService _geminiService;

    public PriorityAnalyzerService(GeminiService geminiService)
    {
        _geminiService = geminiService;
    }

    // Kural tabanlı fallback için keyword listeleri
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

    private static readonly string[] HighKeywords =
    [
        "çalışmıyor", "çalışmaz oldu", "çalışmadı", "durdu", "duruyor",
        "bozuk", "arızalı", "kapandı", "açılmıyor", "çöktü",
        "erişilemiyor", "başlamıyor", "yanıt vermiyor", "dondu",
        "kullanılamıyor", "devre dışı", "aşırı ısınıyor", "aşırı ısındı",
        "motor durdu", "pompa durdu", "konveyör durdu", "vinç durdu",
        "hata kodu", "system error", "fault alarm"
    ];

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

    private static readonly string[] LowKeywords =
    [
        "bakım", "periyodik bakım", "rutin bakım", "planlı bakım",
        "kontrol", "temizlik", "inceleme", "hafif sorun",
        "küçük sorun", "ufak sorun", "bilgi", "bilgilendirme",
        "çizik", "boyası dökülmüş", "etiketi kopmuş"
    ];

    /// <summary>
    /// Gemini API ile öncelik analizi yapar.
    /// API başarısız olursa kural tabanlı analize düşer.
    /// </summary>
    public async Task<(FaultPriority Priority, string Reason)> AnalyzeAsync(string title, string description)
    {
        var prompt = $@"Sen bir fabrika arıza yönetim sisteminin öncelik analizcisisin.
Aşağıdaki arıza bilgilerine göre öncelik seviyesini belirle ve kısa bir Türkçe gerekçe yaz.

Arıza Başlığı: {title}
Arıza Açıklaması: {description}

Öncelik seviyeleri ve kriterleri:
- Critical: Yangın, patlama, can tehlikesi, üretim tamamen durdu, gaz sızıntısı
- High: Ekipman tamamen çalışmıyor, ciddi arıza, üretimi doğrudan etkiliyor
- Normal: Ekipman çalışıyor ama performans düşük, orta düzey sorun
- Low: Rutin bakım, küçük kozmetik sorun, planlı müdahale yeterli

Sadece şu formatta cevap ver (başka hiçbir şey yazma):
PRIORITY: [Critical/High/Normal/Low]
REASON: [Tek cümle Türkçe gerekçe]";

        var response = await _geminiService.GenerateAsync(prompt);

        if (!string.IsNullOrWhiteSpace(response))
        {
            var parsed = ParseGeminiResponse(response);
            if (parsed.HasValue) return parsed.Value;
        }

        // Fallback: kural tabanlı analiz
        return AnalyzeFallback(title, description);
    }

    /// <summary>
    /// Senkron fallback (kural tabanlı) — controller uyumluluğu için
    /// </summary>
    public (FaultPriority Priority, string Reason) Analyze(string title, string description)
        => AnalyzeFallback(title, description);

    private static (FaultPriority Priority, string Reason)? ParseGeminiResponse(string response)
    {
        try
        {
            var lines = response.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            string? priorityLine = null, reasonLine = null;

            foreach (var line in lines)
            {
                if (line.StartsWith("PRIORITY:", StringComparison.OrdinalIgnoreCase))
                    priorityLine = line.Replace("PRIORITY:", "").Trim();
                else if (line.StartsWith("REASON:", StringComparison.OrdinalIgnoreCase))
                    reasonLine = line.Replace("REASON:", "").Trim();
            }

            if (priorityLine != null && reasonLine != null)
            {
                var priority = priorityLine switch
                {
                    var p when p.Contains("Critical", StringComparison.OrdinalIgnoreCase) => FaultPriority.Critical,
                    var p when p.Contains("High", StringComparison.OrdinalIgnoreCase) => FaultPriority.High,
                    var p when p.Contains("Normal", StringComparison.OrdinalIgnoreCase) => FaultPriority.Normal,
                    var p when p.Contains("Low", StringComparison.OrdinalIgnoreCase) => FaultPriority.Low,
                    _ => FaultPriority.Normal
                };
                return (priority, reasonLine);
            }
        }
        catch { /* Parse hatası → fallback */ }
        return null;
    }

    private static (FaultPriority Priority, string Reason) AnalyzeFallback(string title, string description)
    {
        var combined = $"{title} {description}".ToLowerInvariant();

        if (CriticalKeywords.Any(k => combined.Contains(k, StringComparison.OrdinalIgnoreCase)))
            return (FaultPriority.Critical, "Yangın, patlama, can tehlikesi veya üretim tamamen durdu — Acil müdahale gerekli!");

        if (HighKeywords.Any(k => combined.Contains(k, StringComparison.OrdinalIgnoreCase)))
            return (FaultPriority.High, "Ekipman çalışmayı tamamen durdurmuş, ciddi arıza var.");

        if (NormalKeywords.Any(k => combined.Contains(k, StringComparison.OrdinalIgnoreCase)))
            return (FaultPriority.Normal, "Ekipman çalışıyor ancak performans sorunu veya orta düzey arıza mevcut.");

        if (LowKeywords.Any(k => combined.Contains(k, StringComparison.OrdinalIgnoreCase)))
            return (FaultPriority.Low, "Rutin bakım veya küçük kozmetik sorun — Planlı müdahale yeterli.");

        return (FaultPriority.Normal, "Açıklamada belirgin bir anahtar kelime bulunamadı; standart öncelik atandı.");
    }
}
