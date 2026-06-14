using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Data;
using MobileApp.Api.Models;

namespace MobileApp.Api.Services;

/// <summary>
/// Admin dashboard için kural tabanlı doğal dil sorgulama servisi.
/// Harici AI API gerektirmeden Türkçe sorular anlayıp veritabanı yanıtı üretir.
/// </summary>
public class DashboardChatService
{
    private readonly AppDbContext _db;

    public DashboardChatService(AppDbContext db) => _db = db;

    /// <summary>
    /// Kullanıcının mesajını analiz eder ve Türkçe yanıt üretir.
    /// </summary>
    public async Task<string> ProcessAsync(string message, int companyId)
    {
        var lower = message.ToLowerInvariant().Trim();

        // Intent: Teknisyen iş yükü
        if (Any(lower, "teknisyen", "teknisyenin", "teknisyene") &&
            Any(lower, "iş yükü", "iş yuk", "kaç iş", "kac is", "ne kadar", "çalışıyor"))
            return await GetTechnicianWorkloadAsync(companyId);

        // Intent: En çok arızalanan ekipman
        if (Any(lower, "en çok", "hangi ekipman", "hangi cihaz", "en fazla arıza", "en çok arıza"))
            return await GetMostFaultedAssetAsync(companyId);

        // Intent: Kritik atanmamış arızalar
        if (Any(lower, "kritik") && Any(lower, "bekleyen", "atanmamış", "atanmamis", "yok mu", "var mı"))
            return await GetCriticalUnassignedAsync(companyId);

        // Intent: Açık iş emirleri
        if (Any(lower, "iş emri", "is emri") && Any(lower, "açık", "bekleyen", "kaç", "kac"))
            return await GetOpenWorkOrdersAsync(companyId);

        // Intent: Bugün
        if (Any(lower, "bugün", "bugun"))
            return await GetFaultCountAsync(companyId, 1, "Bugün");

        // Intent: Bu hafta
        if (Any(lower, "bu hafta", "bu hf", "haftalık"))
            return await GetFaultCountAsync(companyId, 7, "Bu hafta");

        // Intent: Bu ay
        if (Any(lower, "bu ay", "bu ayki", "aylık", "son 30"))
            return await GetFaultCountAsync(companyId, 30, "Bu ay");

        // Intent: Son 7 gün
        if (Any(lower, "son 7 gün", "son bir hafta", "son hafta"))
            return await GetFaultCountAsync(companyId, 7, "Son 7 günde");

        // Intent: Çözülen arızalar
        if (Any(lower, "çözülen", "tamamlanan", "kapanan", "çözüldü", "bitti"))
            return await GetResolvedCountAsync(companyId);

        // Intent: Tekrarlayan arızalar
        if (Any(lower, "tekrarlayan", "aynı", "sürekli", "defalarca"))
            return await GetRepeatFaultsAsync(companyId);

        // Intent: Genel özet
        if (Any(lower, "genel durum", "özet", "rapor", "durum ne", "nasıl", "genel", "hepsi"))
            return await GetSummaryAsync(companyId);

        return "Üzgünüm, sorunuzu anlayamadım 🤔\n\n" +
               "Şunları sorabilirsiniz:\n" +
               "• \"Bu ay kaç arıza var?\"\n" +
               "• \"En çok hangi ekipman arızalandı?\"\n" +
               "• \"Açık iş emirleri kaç tane?\"\n" +
               "• \"Kritik bekleyen arıza var mı?\"\n" +
               "• \"Teknisyen iş yükü nedir?\"\n" +
               "• \"Genel durum nasıl?\"";
    }

    // ── Sorgu Metodları ────────────────────────────────────────────────────────

    private async Task<string> GetTechnicianWorkloadAsync(int companyId)
    {
        var technicians = await _db.Users
            .Where(u => u.CompanyId == companyId && u.Role == UserRole.Technician && u.IsActive)
            .Select(u => new
            {
                u.Name,
                Active = _db.WorkOrders.Count(w =>
                    w.AssignedToUserId == u.Id &&
                    (w.Status == WorkOrderStatus.Assigned || w.Status == WorkOrderStatus.InProgress))
            })
            .OrderByDescending(x => x.Active)
            .ToListAsync();

        if (!technicians.Any())
            return "Sistemde aktif teknisyen bulunmamaktadır.";

        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"📊 Teknisyen İş Yükü ({technicians.Count} teknisyen):\n");

        foreach (var t in technicians)
        {
            var icon = t.Active == 0 ? "✅" : t.Active <= 2 ? "🟡" : "🔴";
            sb.AppendLine($"{icon} {t.Name}: {t.Active} aktif iş emri");
        }

        return sb.ToString().Trim();
    }

    private async Task<string> GetMostFaultedAssetAsync(int companyId)
    {
        var top = await _db.FaultReports
            .Where(f => f.CompanyId == companyId)
            .GroupBy(f => f.Asset.Name)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        if (!top.Any())
            return "Henüz arıza kaydı bulunmamaktadır.";

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("🔧 En Çok Arızalanan Ekipmanlar:\n");

        for (int i = 0; i < top.Count; i++)
            sb.AppendLine($"{i + 1}. {top[i].Name}: {top[i].Count} arıza");

        return sb.ToString().Trim();
    }

    private async Task<string> GetCriticalUnassignedAsync(int companyId)
    {
        var faults = await _db.FaultReports
            .Where(f => f.CompanyId == companyId &&
                        f.Priority == FaultPriority.Critical &&
                        f.Status == FaultStatus.Open &&
                        !f.WorkOrders.Any())
            .Select(f => new { f.Title, AssetName = f.Asset.Name, f.CreatedAt })
            .OrderBy(f => f.CreatedAt)
            .Take(10)
            .ToListAsync();

        if (!faults.Any())
            return "✅ Şu an atanmamış kritik arıza bulunmamaktadır.";

        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"🚨 {faults.Count} adet atanmamış kritik arıza:\n");

        foreach (var f in faults)
        {
            var age = (DateTime.UtcNow - f.CreatedAt).TotalHours;
            sb.AppendLine($"• {f.Title} ({f.AssetName}) — {age:F0} saat önce");
        }

        return sb.ToString().Trim();
    }

    private async Task<string> GetOpenWorkOrdersAsync(int companyId)
    {
        var assigned = await _db.WorkOrders
            .CountAsync(w => w.FaultReport.CompanyId == companyId && w.Status == WorkOrderStatus.Assigned);
        var inProgress = await _db.WorkOrders
            .CountAsync(w => w.FaultReport.CompanyId == companyId && w.Status == WorkOrderStatus.InProgress);
        var waiting = await _db.WorkOrders
            .CountAsync(w => w.FaultReport.CompanyId == companyId && w.Status == WorkOrderStatus.WaitingForPart);

        return $"📋 İş Emri Durumu:\n\n" +
               $"• Atandı (Başlanmadı): {assigned}\n" +
               $"• Devam Ediyor: {inProgress}\n" +
               $"• Parça Bekliyor: {waiting}\n" +
               $"━━━━━━━━━━━━━━\n" +
               $"• Toplam Açık: {assigned + inProgress + waiting}";
    }

    private async Task<string> GetFaultCountAsync(int companyId, int days, string periodLabel)
    {
        var since = DateTime.UtcNow.AddDays(-days);

        var total = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.CreatedAt >= since);
        var critical = await _db.FaultReports.CountAsync(f =>
            f.CompanyId == companyId && f.CreatedAt >= since && f.Priority == FaultPriority.Critical);
        var high = await _db.FaultReports.CountAsync(f =>
            f.CompanyId == companyId && f.CreatedAt >= since && f.Priority == FaultPriority.High);

        return $"📅 {periodLabel} bildirilen arızalar:\n\n" +
               $"• Toplam: {total} arıza\n" +
               $"• 🔴 Kritik: {critical}\n" +
               $"• 🟠 Yüksek: {high}\n" +
               $"• 🟢 Diğer: {total - critical - high}";
    }

    private async Task<string> GetResolvedCountAsync(int companyId)
    {
        var since = DateTime.UtcNow.AddDays(-30);

        var resolved = await _db.FaultReports.CountAsync(f =>
            f.CompanyId == companyId &&
            (f.Status == FaultStatus.Resolved || f.Status == FaultStatus.Closed) &&
            f.ResolvedAt >= since);

        return $"✅ Son 30 günde çözülen/kapatılan arıza sayısı: {resolved}";
    }

    private async Task<string> GetRepeatFaultsAsync(int companyId)
    {
        var repeat = await _db.FaultReports
            .Where(f => f.CompanyId == companyId)
            .GroupBy(f => f.Asset.Name)
            .Where(g => g.Count() >= 3)
            .Select(g => new { AssetName = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        if (!repeat.Any())
            return "✅ Şu an 3 veya daha fazla arıza kaydı olan ekipman bulunmamaktadır.";

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("⚠️ Değişim Değerlendirilmeli (3+ Arıza):\n");

        foreach (var r in repeat)
            sb.AppendLine($"• {r.AssetName}: {r.Count} arıza");

        return sb.ToString().Trim();
    }

    private async Task<string> GetSummaryAsync(int companyId)
    {
        var openFaults = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Status == FaultStatus.Open);
        var inProgressFaults = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Status == FaultStatus.InProgress);
        var criticalUnassigned = await _db.FaultReports.CountAsync(f =>
            f.CompanyId == companyId &&
            f.Priority == FaultPriority.Critical &&
            !f.WorkOrders.Any() &&
            f.Status == FaultStatus.Open);
        var openWorkOrders = await _db.WorkOrders.CountAsync(w =>
            w.FaultReport.CompanyId == companyId &&
            (w.Status == WorkOrderStatus.Assigned || w.Status == WorkOrderStatus.InProgress));
        var techCount = await _db.Users.CountAsync(u =>
            u.CompanyId == companyId && u.Role == UserRole.Technician && u.IsActive);

        return "📊 Genel Durum Özeti:\n\n" +
               $"🔴 Açık Arızalar: {openFaults}\n" +
               $"🟡 İşlemdeki Arızalar: {inProgressFaults}\n" +
               $"🚨 Kritik & Atanmamış: {criticalUnassigned}\n" +
               $"📋 Açık İş Emirleri: {openWorkOrders}\n" +
               $"👷 Aktif Teknisyen: {techCount}";
    }

    private static bool Any(string text, params string[] keywords)
        => keywords.Any(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));
}
