using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Data;
using MobileApp.Api.Models;

namespace MobileApp.Api.Services;

/// <summary>
/// Arka planda periyodik görevleri çalıştıran hosted service:
///   • Her 10 dakikada → Kritik arıza 30dk atanmadıysa admin bildir (Özellik 5)
///   • Her 1 saatte   → 2 gündür atanmamış arızaları otomatik ata (Özellik 3)
/// </summary>
public class BackgroundJobService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BackgroundJobService> _logger;

    private DateTime _lastAutoAssign     = DateTime.MinValue;
    private DateTime _lastCriticalCheck  = DateTime.MinValue;

    private static readonly TimeSpan AutoAssignInterval    = TimeSpan.FromHours(1);
    private static readonly TimeSpan CriticalCheckInterval = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan LoopDelay             = TimeSpan.FromMinutes(5);

    public BackgroundJobService(IServiceScopeFactory scopeFactory, ILogger<BackgroundJobService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BackgroundJobService başlatıldı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;

                if (now - _lastCriticalCheck >= CriticalCheckInterval)
                {
                    await CheckCriticalUnassignedAsync();
                    _lastCriticalCheck = now;
                }

                if (now - _lastAutoAssign >= AutoAssignInterval)
                {
                    await RunAutoAssignAsync();
                    _lastAutoAssign = now;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BackgroundJobService hatası.");
            }

            await Task.Delay(LoopDelay, stoppingToken);
        }
    }

    // ── Kritik Arıza 30 dk Kontrolü ──────────────────────────────────────────

    private async Task CheckCriticalUnassignedAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var cutoff = DateTime.UtcNow.AddMinutes(-30);

        var criticalFaults = await db.FaultReports
            .Include(f => f.WorkOrders)
            .Where(f => f.Priority == FaultPriority.Critical &&
                        f.Status == FaultStatus.Open &&
                        !f.WorkOrders.Any() &&
                        f.CreatedAt <= cutoff &&
                        !f.CriticalAlertSent)
            .ToListAsync();

        if (!criticalFaults.Any()) return;

        _logger.LogWarning("{Count} kritik arıza 30+ dakikadır atanmamış.", criticalFaults.Count);

        foreach (var fault in criticalFaults)
        {
            var admins = await db.Users
                .Where(u => u.CompanyId == fault.CompanyId && u.Role == UserRole.Admin && u.IsActive)
                .ToListAsync();

            foreach (var admin in admins)
            {
                db.Notifications.Add(new Notification
                {
                    UserId            = admin.Id,
                    Type              = NotificationType.CriticalFaultUnassigned,
                    Title             = "🚨 Kritik Arıza Atanmadı!",
                    Body              = $"\"{fault.Title}\" kritik öncelikli arızası 30 dakikadır hiçbir teknisyene atanmadı!",
                    RelatedEntityId   = fault.Id,
                    RelatedEntityType = "FaultReport"
                });
            }

            fault.CriticalAlertSent = true;
        }

        await db.SaveChangesAsync();
    }

    // ── Otomatik Atama ────────────────────────────────────────────────────────

    private async Task RunAutoAssignAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<AutoAssignmentService>();
        await svc.RunAsync();
    }
}
