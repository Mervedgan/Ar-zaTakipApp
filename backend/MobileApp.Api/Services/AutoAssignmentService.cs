using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Data;
using MobileApp.Api.Models;

namespace MobileApp.Api.Services;

/// <summary>
/// 2 gündür atanmamış arızaları tespit edip en uygun teknisyene otomatik atar.
/// BackgroundJobService tarafından saatte bir çağrılır.
/// </summary>
public class AutoAssignmentService
{
    private readonly AppDbContext _db;
    private readonly ILogger<AutoAssignmentService> _logger;

    public AutoAssignmentService(AppDbContext db, ILogger<AutoAssignmentService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task RunAsync()
    {
        var cutoff = DateTime.UtcNow.AddDays(-2);

        // 2 günden eski, hiç iş emri atanmamış, açık arızalar
        var unassigned = await _db.FaultReports
            .Include(f => f.WorkOrders)
            .Where(f => f.Status == FaultStatus.Open &&
                        !f.WorkOrders.Any() &&
                        f.CreatedAt <= cutoff)
            .ToListAsync();

        if (!unassigned.Any())
        {
            _logger.LogDebug("Auto-assignment: no stale unassigned faults found.");
            return;
        }

        _logger.LogInformation("Auto-assignment: {Count} unassigned fault(s) older than 2 days.", unassigned.Count);

        foreach (var fault in unassigned)
            await AssignFaultAsync(fault);

        await _db.SaveChangesAsync();
    }

    private async Task AssignFaultAsync(FaultReport fault)
    {
        // En az aktif iş emri olan teknisyeni bul
        var technician = await _db.Users
            .Where(u => u.CompanyId == fault.CompanyId &&
                        u.Role == UserRole.Technician &&
                        u.IsActive)
            .OrderBy(u => _db.WorkOrders.Count(w =>
                w.AssignedToUserId == u.Id &&
                (w.Status == WorkOrderStatus.Assigned || w.Status == WorkOrderStatus.InProgress)))
            .FirstOrDefaultAsync();

        if (technician is null)
        {
            _logger.LogWarning("Auto-assignment: no available technician for fault {FaultId}.", fault.Id);
            return;
        }

        // İş emri oluştur
        _db.WorkOrders.Add(new WorkOrder
        {
            FaultReportId    = fault.Id,
            AssignedToUserId = technician.Id,
            Status           = WorkOrderStatus.Assigned,
            IsAutoAssigned   = true
        });

        fault.Status = FaultStatus.InProgress;

        // Teknisyene bildirim
        _db.Notifications.Add(new Notification
        {
            UserId            = technician.Id,
            Type              = NotificationType.WorkOrderAssigned,
            Title             = "🤖 Yeni İş Emri Atandı (Otomatik)",
            Body              = $"\"{fault.Title}\" arızası 2 gün atanmadığı için sistem tarafından size atandı.",
            RelatedEntityId   = fault.Id,
            RelatedEntityType = "FaultReport"
        });

        // Admin(ler)e bildirim
        var admins = await _db.Users
            .Where(u => u.CompanyId == fault.CompanyId && u.Role == UserRole.Admin && u.IsActive)
            .ToListAsync();

        foreach (var admin in admins)
        {
            _db.Notifications.Add(new Notification
            {
                UserId            = admin.Id,
                Type              = NotificationType.WorkOrderAssigned,
                Title             = "🤖 Otomatik Görev Atama",
                Body              = $"\"{fault.Title}\" arızası 2 gün boyunca atanmadığı için sistem {technician.Name} adlı teknisyene otomatik atadı.",
                RelatedEntityId   = fault.Id,
                RelatedEntityType = "FaultReport"
            });
        }

        _logger.LogInformation(
            "Auto-assigned fault {FaultId} ('{Title}') to technician {TechId} ({TechName}).",
            fault.Id, fault.Title, technician.Id, technician.Name);
    }
}
