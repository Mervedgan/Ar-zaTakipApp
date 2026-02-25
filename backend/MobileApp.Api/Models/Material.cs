namespace MobileApp.Api.Models;

public enum MaterialType { SparePart, Consumable }     // YedekParca | SarfMalzeme

public class Material
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    public string Name { get; set; } = string.Empty;   // "Rulman 6205", "Rondela M8"
    public string? Description { get; set; }
    public string? Unit { get; set; }                  // "adet", "litre", "metre"
    public MaterialType Type { get; set; } = MaterialType.SparePart;

    public int StockQuantity { get; set; } = 0;
    public int? MinStockThreshold { get; set; }        // Kritik seviye uyarısı için

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MaterialUsage> MaterialUsages { get; set; } = new List<MaterialUsage>();
    public ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}
