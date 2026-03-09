namespace MobileApp.Api.Models;

public enum UserRole
{
    Admin,              // Yönetici
    Employee,           // Çalışan
    Technician,         // Teknisyen
    Purchasing,         // Satın Alma / Muhasebe
    WarehouseKeeper     // Depo Sorumlusu (opsiyonel)
}

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Employee;

    public int? CompanyId { get; set; }
    public Company? Company { get; set; }

    // Firebase Cloud Messaging token (push bildirimi için)
    public string? FcmToken { get; set; }

    // Üye Kayıtları İçin
    public string? Phone { get; set; }

    // Şifre Sıfırlama (OTP) İşlemleri İçin
    public string? ResetPasswordCode { get; set; }
    public DateTime? ResetPasswordCodeExpiry { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
