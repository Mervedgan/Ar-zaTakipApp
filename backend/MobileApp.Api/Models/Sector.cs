namespace MobileApp.Api.Models;

public class Sector
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;        // "Üretim / Fabrika"
    public string Code { get; set; } = string.Empty;        // "MANUFACTURING"
    public bool IsCustom { get; set; } = false;             // true => "Diğer" serbest giriş

    public ICollection<Company> Companies { get; set; } = new List<Company>();
}
