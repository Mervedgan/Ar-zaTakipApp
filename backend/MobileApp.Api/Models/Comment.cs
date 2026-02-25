namespace MobileApp.Api.Models;

public class Comment
{
    public int Id { get; set; }

    // Yorum ya FaultReport'a ya da WorkOrder'a ait olabilir
    public int? FaultReportId { get; set; }
    public FaultReport? FaultReport { get; set; }

    public int? WorkOrderId { get; set; }
    public WorkOrder? WorkOrder { get; set; }

    public int AuthorId { get; set; }
    public User Author { get; set; } = null!;

    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
