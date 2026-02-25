using MobileApp.Api.Models;

namespace MobileApp.Api.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────
public record RegisterDto(
    string   Name,
    string   Email,
    string   Password,
    string   Phone,
    UserRole Role,
    string   CompanyName,
    int      SectorId,
    string?  CustomSectorName    // Sadece SectorId=10 (Diğer) seçilince
);

public record ForgotPasswordDto(string Email);

public record ResetPasswordDto(string Email, string Code, string NewPassword);

public record LoginDto(string Email, string Password);

public record AuthResponseDto(
    string Token,
    int    UserId,
    string Name,
    string Email,
    string Role,
    int?   CompanyId,
    string CompanyName
);

// ── User ──────────────────────────────────────────────────────────────────────
public record UserDto(
    int      Id,
    string   Name,
    string   Email,
    string   Role,
    int?     CompanyId,
    string?  CompanyName,
    DateTime CreatedAt
);

// ── FCM ───────────────────────────────────────────────────────────────────────
public record UpdateFcmTokenDto(string FcmToken);
