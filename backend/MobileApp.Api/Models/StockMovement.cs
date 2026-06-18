namespace MobileApp.Api.Models;

public enum StockMovementType { In, Out }               // Giriş | Çıkış

public class StockMovement
{
    public int Id { get; set; }
    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    public StockMovementType Type { get; set; }
    public int Quantity { get; set; }
    public string? Reason { get; set; }                 // "İş emri #42", "Satın alma #7"

    public int CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
