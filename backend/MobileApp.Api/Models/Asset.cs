namespace MobileApp.Api.Models;

public class Asset
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public string Name { get; set; } = string.Empty;           // "CNC Tezgahı #3"
    public string? Description { get; set; }                   // opsiyonel açıklama
    public string? Location { get; set; }                      // "B Hol, 2. Kat"
    public string? SerialNumber { get; set; }
    public string Category { get; set; } = "Makine"; 
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<FaultReport> FaultReports { get; set; } = new List<FaultReport>();
}
