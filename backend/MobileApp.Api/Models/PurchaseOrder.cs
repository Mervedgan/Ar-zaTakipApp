namespace MobileApp.Api.Models;

public enum PurchaseOrderStatus { Pending, ApprovedByAdmin, RejectedByAdmin, Completed }

public class PurchaseOrder
{
    public int Id { get; set; }
    public int WorkOrderId { get; set; }
    public WorkOrder WorkOrder { get; set; } = null!;

    public int RequestedByUserId { get; set; }          // Teknisyen veya Depo Sorumlusu
    public User RequestedByUser { get; set; } = null!;

    public int? AssignedToUserId { get; set; }          // Satın Alma
    public User? AssignedToUser { get; set; }

    public int? MaterialId { get; set; }
    public Material? Material { get; set; }

    public string? ManualMaterialName { get; set; }

    public int Quantity { get; set; }
    public string? Note { get; set; }

    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AdminReviewedAt { get; set; }      // Yönetici onay/red tarihi
    public DateTime? CompletedAt { get; set; }          // Satın alma tamamlandı tarihi
}
