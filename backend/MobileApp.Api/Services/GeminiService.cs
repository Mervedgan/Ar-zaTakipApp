using System.Text;
using System.Text.Json;

namespace MobileApp.Api.Services;

/// <summary>
/// Google Gemini API ile iletişim kuran çekirdek servis.
/// AQ. formatındaki yeni Gemini Auth Key'leri destekler.
/// </summary>
public class GeminiService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<GeminiService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        
        // Önce env variable, yoksa appsettings.json
        _apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY")
                  ?? config["Gemini:ApiKey"]
                  ?? string.Empty;
        _model = config["Gemini:Model"] ?? "gemini-2.5-flash";
    }

    /// <summary>
    /// Verilen prompt'u Gemini'ye gönderir ve yanıt döner.
    /// AQ. formatı için Authorization: Bearer kullanılır.
    /// Başarısız olursa null döner.
    /// </summary>
    public async Task<string?> GenerateAsync(string prompt)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogWarning("Gemini API Key bulunamadı!");
            return null;
        }

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(requestBody);

        // AQ. formatı → Bearer Token olarak kullan (v1beta endpoint)
        var result = await TrySendAsync(
            url: $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent",
            json: json,
            authMode: "Bearer");

        if (result != null) return result;

        // Fallback: eski AIza formatı → ?key= parametre yöntemi  
        result = await TrySendAsync(
            url: $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}",
            json: json,
            authMode: "QueryParam");

        if (result != null) return result;

        // Son deneme: x-goog-api-key header
        result = await TrySendAsync(
            url: $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent",
            json: json,
            authMode: "Header");

        return result;
    }

    private async Task<string?> TrySendAsync(string url, string json, string authMode)
    {
        var client = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, url);

        switch (authMode)
        {
            case "Bearer":
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);
                break;
            case "Header":
                request.Headers.Add("x-goog-api-key", _apiKey);
                break;
            // "QueryParam" → key zaten URL'de
        }

        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await client.SendAsync(request);
            var responseText = await response.Content.ReadAsStringAsync();

            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning("Gemini [{Mode}]: 429 Quota 0. Model: {Model}", authMode, _model);
                // Kota dolmuşsa diğer yönteme geçmenin anlamı yok, direkt mesaj dön
                return "⚠️ Google Gemini kotanız bu model için 0 olarak ayarlanmış. Google Cloud Console'da billing ekleyiniz veya farklı bir region deneyin.";
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini [{Mode}]: {Code} - {Error}", authMode, response.StatusCode, responseText);
                return null; // Sonraki yöntemi dene
            }

            _logger.LogInformation("Gemini [{Mode}]: Başarılı!", authMode);

            using var doc = JsonDocument.Parse(responseText);
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text?.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini [{Mode}] isteği sırasında hata.", authMode);
            return null;
        }
    }
}
