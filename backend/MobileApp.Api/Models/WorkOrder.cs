namespace MobileApp.Api.Models;

public enum WorkOrderStatus { Assigned, InProgress, WaitingForPart, Completed }

public class WorkOrder
{
    public int Id { get; set; }
    public int FaultReportId { get; set; }
    public FaultReport FaultReport { get; set; } = null!;

    public int AssignedToUserId { get; set; }           // Teknisyen
    public User AssignedToUser { get; set; } = null!;

    public WorkOrderStatus Status { get; set; } = WorkOrderStatus.Assigned;
    public string? TechnicianNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ICollection<MaterialUsage> MaterialUsages { get; set; } = new List<MaterialUsage>();
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
