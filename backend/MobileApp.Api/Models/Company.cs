namespace MobileApp.Api.Models;

public class Company
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SectorId { get; set; }
    public Sector Sector { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
    public ICollection<Material> Materials { get; set; } = new List<Material>();
}
