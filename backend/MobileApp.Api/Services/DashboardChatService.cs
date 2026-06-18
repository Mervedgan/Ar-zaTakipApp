using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Data;
using MobileApp.Api.Models;

namespace MobileApp.Api.Services;

/// <summary>
/// Admin ve Teknisyen için Google Gemini API destekli sohbet asistanı.
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
    public async Task<string> ProcessAsync(string message, int companyId, string userName = "", string userRole = "")
    {
        // 1. Veritabanından istatistikleri topla
        var context = await GetSystemContextAsync(companyId);

        // 2. Kullanıcıya hitap şeklini belirle
        var addressForm = string.IsNullOrWhiteSpace(userName)
            ? ""
            : $" {userName}";

        // 3. Rol bazlı persona
        var persona = userRole == "Technician"
            ? $"Sen 'Arıza Takip Sistemi' uygulamasının akıllı teknisyen asistanısın. Adın: AI Asistan."
            : $"Sen 'Arıza Takip Sistemi' uygulamasının akıllı yönetim asistanısın. Adın: AI Asistan.";

        // 4. Prompt
        var prompt = $@"{persona}
Kullanıcının adı: {(string.IsNullOrWhiteSpace(userName) ? "(belirtilmemiş)" : userName)}
Görevin: Kullanıcının sorusunu veritabanı verilerine dayanarak kısa, net ve anlaşılır Türkçe ile yanıtlamak.

Hitap kuralları:
- Eğer kullanıcı adı belirtilmişse sadece ilk sohbette bir kez '{addressForm.Trim()}' diye hitap edebilirsin, sonrasında isme gerek yok.
- 'Yöneticim', 'Sayın Yönetici', 'Sayın Admin' gibi ifadeler KULLANMA.
- Sade ve samimi bir dil kullan.
- Emojiler kullanabilirsin ancak abartma.

Veri kullanım kuralları:
- Yalnızca aşağıdaki verileri kullan.
- Verilen verilerde olmayan bir bilgiyi uydurmak kesinlikle yasak.
- Eğer sorunun cevabı verilerde yoksa 'Bu bilgiye şu an ulaşamıyorum.' de.

[GÜNCEL SİSTEM VERİLERİ]
{context}

[KULLANICI SORUSU]
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

        // ── Arızalar ─────────────────────────────────────────────────────────
        var totalFaults     = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId);
        var openFaults      = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Status == FaultStatus.Open);
        var inProgressFaults= await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Status == FaultStatus.InProgress);
        var resolvedFaults  = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && (f.Status == FaultStatus.Resolved || f.Status == FaultStatus.Closed));
        var waitingPart     = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Status == FaultStatus.WaitingForPart);

        // Kritik arızalar
        var criticalFaults      = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Priority == FaultPriority.Critical);
        var criticalUnassigned  = await _db.FaultReports.CountAsync(f =>
            f.CompanyId == companyId && f.Priority == FaultPriority.Critical && !f.WorkOrders.Any() && f.Status == FaultStatus.Open);
        var highFaults          = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.Priority == FaultPriority.High);

        // Zaman bazlı
        var last30Days          = DateTime.UtcNow.AddDays(-30);
        var last7Days           = DateTime.UtcNow.AddDays(-7);
        var faultsLast30Days    = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.CreatedAt >= last30Days);
        var faultsLast7Days     = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId && f.CreatedAt >= last7Days);
        var resolvedLast30Days  = await _db.FaultReports.CountAsync(f => f.CompanyId == companyId
            && (f.Status == FaultStatus.Resolved || f.Status == FaultStatus.Closed) && f.ResolvedAt >= last30Days);

        // ── İş emirleri ──────────────────────────────────────────────────────
        var totalWorkOrders     = await _db.WorkOrders.CountAsync(w => w.FaultReport.CompanyId == companyId);
        var activeWorkOrders    = await _db.WorkOrders.CountAsync(w =>
            w.FaultReport.CompanyId == companyId &&
            (w.Status == WorkOrderStatus.Assigned || w.Status == WorkOrderStatus.InProgress));
        var completedWorkOrders = await _db.WorkOrders.CountAsync(w =>
            w.FaultReport.CompanyId == companyId && w.Status == WorkOrderStatus.Completed);

        // ── Teknisyenler ─────────────────────────────────────────────────────
        var technicians = await _db.Users
            .Where(u => u.CompanyId == companyId && u.Role == UserRole.Technician && u.IsActive)
            .Select(u => new
            {
                u.Name,
                ActiveWorkOrders = _db.WorkOrders.Count(w =>
                    w.AssignedToUserId == u.Id &&
                    (w.Status == WorkOrderStatus.Assigned || w.Status == WorkOrderStatus.InProgress)),
                CompletedWorkOrders = _db.WorkOrders.Count(w =>
                    w.AssignedToUserId == u.Id && w.Status == WorkOrderStatus.Completed)
            })
            .ToListAsync();

        // ── Ekipmanlar (Assets) ───────────────────────────────────────────────
        var totalAssets = await _db.Assets.CountAsync(a => a.CompanyId == companyId);

        // En çok arızalanan
        var topAssets = await _db.FaultReports
            .Where(f => f.CompanyId == companyId && f.Asset != null)
            .GroupBy(f => f.Asset!.Name)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        var repeatAssets = topAssets.Where(x => x.Count >= 3).ToList();

        // ── Stok / Malzeme ────────────────────────────────────────────────────
        var totalMaterials   = await _db.Materials.CountAsync(m => m.CompanyId == companyId);
        var criticalStock    = await _db.Materials.CountAsync(m =>
            m.CompanyId == companyId && m.MinStockThreshold.HasValue && m.StockQuantity <= m.MinStockThreshold);
        var lowStock         = await _db.Materials.CountAsync(m =>
            m.CompanyId == companyId && m.MinStockThreshold.HasValue &&
            m.StockQuantity > m.MinStockThreshold && m.StockQuantity <= m.MinStockThreshold * 1.5);

        // ── Satın alma talepleri ───────────────────────────────────────────────
        var pendingPO    = await _db.PurchaseOrders.CountAsync(p => p.WorkOrder.FaultReport.CompanyId == companyId && p.Status == PurchaseOrderStatus.Pending);
        var approvedPO   = await _db.PurchaseOrders.CountAsync(p => p.WorkOrder.FaultReport.CompanyId == companyId && p.Status == PurchaseOrderStatus.ApprovedByAdmin);
        var orderedPO    = await _db.PurchaseOrders.CountAsync(p => p.WorkOrder.FaultReport.CompanyId == companyId && p.Status == PurchaseOrderStatus.Ordered);
        var completedPO  = await _db.PurchaseOrders.CountAsync(p => p.WorkOrder.FaultReport.CompanyId == companyId && p.Status == PurchaseOrderStatus.Completed);

        // ── Şirket bilgisi ────────────────────────────────────────────────────
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId);

        // ── Veriyi birleştir ─────────────────────────────────────────────────
        sb.AppendLine($"## ŞİRKET");
        sb.AppendLine($"- Şirket adı: {company?.Name ?? "Bilinmiyor"}");
        sb.AppendLine($"- Toplam kayıtlı ekipman: {totalAssets}");
        sb.AppendLine();

        sb.AppendLine($"## ARIZA DURUMU");
        sb.AppendLine($"- Toplam arıza: {totalFaults}");
        sb.AppendLine($"- Açık arızalar: {openFaults}");
        sb.AppendLine($"- İşlemdeki arızalar: {inProgressFaults}");
        sb.AppendLine($"- Parça bekleyen arızalar: {waitingPart}");
        sb.AppendLine($"- Çözülen/Kapatılan arızalar: {resolvedFaults}");
        sb.AppendLine($"- Kritik öncelikli arızalar: {criticalFaults}");
        sb.AppendLine($"- Kritik ve henüz atanmamış: {criticalUnassigned}");
        sb.AppendLine($"- Yüksek öncelikli arızalar: {highFaults}");
        sb.AppendLine($"- Son 7 günde açılan: {faultsLast7Days}");
        sb.AppendLine($"- Son 30 günde açılan: {faultsLast30Days}");
        sb.AppendLine($"- Son 30 günde çözülen: {resolvedLast30Days}");
        sb.AppendLine();

        sb.AppendLine($"## İŞ EMİRLERİ");
        sb.AppendLine($"- Toplam iş emri: {totalWorkOrders}");
        sb.AppendLine($"- Aktif (devam eden) iş emirleri: {activeWorkOrders}");
        sb.AppendLine($"- Tamamlanan iş emirleri: {completedWorkOrders}");
        sb.AppendLine();

        sb.AppendLine($"## TEKNİSYEN İŞ YÜKLERİ");
        if (technicians.Any())
        {
            foreach (var t in technicians)
                sb.AppendLine($"- {t.Name}: {t.ActiveWorkOrders} aktif, {t.CompletedWorkOrders} tamamlanmış iş emri");
        }
        else
        {
            sb.AppendLine("- Kayıtlı aktif teknisyen yok.");
        }
        sb.AppendLine();

        sb.AppendLine($"## STOK / MALZEME");
        sb.AppendLine($"- Toplam malzeme çeşidi: {totalMaterials}");
        sb.AppendLine($"- Kritik stok altındaki malzeme: {criticalStock}");
        sb.AppendLine($"- Düşük stoklu malzeme: {lowStock}");
        sb.AppendLine();

        sb.AppendLine($"## SATIN ALMA TALEPLERİ");
        sb.AppendLine($"- Onay bekleyen talepler: {pendingPO}");
        sb.AppendLine($"- Onaylanan talepler: {approvedPO}");
        sb.AppendLine($"- Sipariş verilen talepler: {orderedPO}");
        sb.AppendLine($"- Tamamlanan talepler: {completedPO}");
        sb.AppendLine();

        sb.AppendLine($"## EN ÇOK ARIZALANAN EKİPMANLAR (Top 5)");
        if (topAssets.Any())
        {
            foreach (var a in topAssets)
                sb.AppendLine($"- {a.Name}: {a.Count} arıza");
        }
        else
        {
            sb.AppendLine("- Veri yok.");
        }

        if (repeatAssets.Any())
        {
            sb.AppendLine();
            sb.AppendLine("## TEKRARLAYAN ARIZALI EKİPMANLAR (3 ve üzeri, değişim önerilebilir)");
            foreach (var r in repeatAssets)
                sb.AppendLine($"- {r.Name}: {r.Count} arıza");
        }

        return sb.ToString();
    }
}
