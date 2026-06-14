using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Data;
using MobileApp.Api.Models;

namespace MobileApp.Api.Services;

/// <summary>
/// Admin dashboard için Google Gemini API destekli sohbet asistanı.
/// Veritabanından güncel bilgileri çekip Gemini'ye bağlam olarak sunar.
/// </summary>
public class DashboardChatService
{
    private readonly AppDbContext _db;
    private readonly GeminiService _geminiService;

    public DashboardChatService(AppDbContext db, GeminiService geminiService)
    {
        _db = db;
        _geminiService = geminiService;
    }

    /// <summary>
    /// Kullanıcının mesajını bağlam bilgisi ile Gemini'ye göndererek yanıt üretir.
    /// </summary>
    public async Task<string> ProcessAsync(string message, int companyId)
    {
        // 1. Veritabanından temel istatistikleri topla (Bağlam)
        var context = await GetSystemContextAsync(companyId);

        // 2. Gemini'ye prompt oluştur
        var prompt = $@"Sen 'Arıza Takip Sistemi' uygulamasının akıllı yönetici asistanısın. 
Adın: AI Asistan. Sen bir insansın gibi konuş, ancak verileri kesin bir dille ver. 
Sana yöneticinin şirketine ait güncel veriler aşağıda verilmiştir. Yöneticinin sorusuna bu verilere dayanarak kısa, net ve anlaşılır bir Türkçe ile cevap ver. Emojiler kullan.
Verilerde sorunun cevabı yoksa, 'Bu bilgiye şu an ulaşamıyorum' de.

[GÜNCEL SİSTEM VERİLERİ]
{context}

[YÖNETİCİ SORUSU]
{message}";

        var geminiResponse = await _geminiService.GenerateAsync(prompt);

        if (!string.IsNullOrWhiteSpace(geminiResponse))
        {
            return geminiResponse.Trim();
        }

        return "Şu anda asistan servisiyle iletişim kurulamıyor. Lütfen daha sonra tekrar deneyin.";
    }

    private async Task<string> GetSystemContextAsync(int companyId)
    {
        var sb = new System.Text.StringBuilder();

        // Arızalar (Genel)
        var totalFaults = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId);
        var openFaults = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Status == FaultStatus.Open);
        var inProgressFaults = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Status == FaultStatus.InProgress);
        
        // Kritik Arızalar
        var criticalFaults = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Priority == FaultPriority.Critical);
        var criticalUnassigned = await _db.FaultReports.CountAsync(f => 
            f.CompanyId == companyId && f.Priority == FaultPriority.Critical && !f.WorkOrders.Any() && f.Status == FaultStatus.Open);
        
        // Zaman bazlı arızalar
        var last30Days = DateTime.UtcNow.AddDays(-30);
        var faultsLast30Days = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.CreatedAt >= last30Days);
        var resolvedLast30Days = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && (f.Status == FaultStatus.Resolved || f.Status == FaultStatus.Closed) && f.ResolvedAt >= last30Days);

        // Teknisyenler
        var technicians = await _db.Users
            .Where(u => u.CompanyId == companyId && u.Role == UserRole.Technician && u.IsActive)
            .Select(u => new
            {
                u.Name,
                ActiveWorkOrders = _db.WorkOrders.Count(w => w.AssignedToUserId == u.Id && (w.Status == WorkOrderStatus.Assigned || w.Status == WorkOrderStatus.InProgress))
            })
            .ToListAsync();

        // En çok arızalanan ekipmanlar
        var topAssets = await _db.FaultReports
            .Where(f => f.CompanyId == companyId)
            .GroupBy(f => f.Asset.Name)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(3)
            .ToListAsync();

        // En çok tekrarlayan arızalar
        var repeatAssets = topAssets.Where(x => x.Count >= 3).ToList();

        sb.AppendLine($"- Toplam Arıza Sayısı: {totalFaults}");
        sb.AppendLine($"- Açık Arızalar: {openFaults}");
        sb.AppendLine($"- İşlemdeki Arızalar: {inProgressFaults}");
        sb.AppendLine($"- Kritik Arızalar (Toplam): {criticalFaults}");
        sb.AppendLine($"- Kritik ve Henüz Atanmamış Arızalar: {criticalUnassigned}");
        sb.AppendLine($"- Son 30 Günde Açılan Arızalar: {faultsLast30Days}");
        sb.AppendLine($"- Son 30 Günde Çözülen Arızalar: {resolvedLast30Days}");

        sb.AppendLine("- Teknisyen İş Yükleri:");
        foreach(var t in technicians)
        {
            sb.AppendLine($"  * {t.Name}: {t.ActiveWorkOrders} aktif iş emri");
        }

        sb.AppendLine("- En Çok Arızalanan Ekipmanlar:");
        foreach(var a in topAssets)
        {
            sb.AppendLine($"  * {a.Name}: {a.Count} arıza");
        }

        if (repeatAssets.Any())
        {
            sb.AppendLine("- Tekrarlayan (3 ve üzeri) Arızaya Sahip Ekipmanlar (Değişim Düşünülebilir):");
            foreach(var r in repeatAssets)
            {
                sb.AppendLine($"  * {r.Name}: {r.Count} arıza");
            }
        }

        return sb.ToString();
    }
}
