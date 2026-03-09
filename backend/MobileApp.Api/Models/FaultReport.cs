namespace MobileApp.Api.Models;

public enum FaultPriority { Low, Normal, High, Critical }
public enum FaultStatus  { Open, InProgress, WaitingForPart, Resolved, Closed }

public class FaultReport
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    public int AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public int ReportedByUserId { get; set; }
    public User ReportedByUser { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public FaultPriority Priority { get; set; } = FaultPriority.Normal;
    public FaultStatus Status { get; set; } = FaultStatus.Open;

    // Fotoğraf yolları (virgülle ayrılmış veya JSON array string)
    public string? PhotoUrls { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
