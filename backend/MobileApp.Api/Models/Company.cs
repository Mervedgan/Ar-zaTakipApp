namespace MobileApp.Api.Models;

public class Company
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SectorId { get; set; }
    public Sector Sector { get; set; } = null!;
    
    // Yeni Alanlar
    public string? CompanyCode { get; set; } // 4 haneli benzersiz kod
    public int? EstablishmentYear { get; set; }
    public bool IsApproved { get; set; } = false; // Admin bilgilerini girince true olur
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
    public ICollection<Material> Materials { get; set; } = new List<Material>();
}
