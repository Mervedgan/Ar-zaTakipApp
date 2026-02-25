namespace MobileApp.Api.Models;

public enum NotificationType
{
    NewFaultReport,         // Yeni arıza → Teknisyen
    WorkOrderAssigned,      // İş emri atandı → Teknisyen
    PurchaseOrderCreated,   // Satın alma talebi → Satın Alma
    StockApprovalNeeded,    // Stok onayı → Yönetici
    PurchaseOrderApproved,  // Onaylandı → Satın Alma
    PurchaseOrderRejected,  // Reddedildi → Teknisyen
    MaterialArrived,        // Malzeme geldi → Teknisyen
    FaultClosed             // Arıza kapandı → Çalışan + Yönetici + Teknisyen
}

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    // İlgili kayda yönlendirme için
    public int? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; }     // "FaultReport" | "WorkOrder" | "PurchaseOrder"

    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
