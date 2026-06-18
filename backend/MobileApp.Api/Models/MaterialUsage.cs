namespace MobileApp.Api.Models;

public class MaterialUsage
{
    public int Id { get; set; }
    public int WorkOrderId { get; set; }
    public WorkOrder WorkOrder { get; set; } = null!;

    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    public int UsedByUserId { get; set; }              // Kim kullandı (Teknisyen)
    public User UsedByUser { get; set; } = null!;

    public int Quantity { get; set; }
    public bool IsApproved { get; set; } = true;       // false => Depo Sorumlusu onayı bekleniyor

    public DateTime UsedAt { get; set; } = DateTime.UtcNow;
}
