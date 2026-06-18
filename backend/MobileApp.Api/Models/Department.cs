using System.ComponentModel.DataAnnotations;

namespace MobileApp.Api.Models;

public class Department
{
    public int Id { get; set; }

    public int CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<FaultReport> FaultReports { get; set; } = new List<FaultReport>();
}
