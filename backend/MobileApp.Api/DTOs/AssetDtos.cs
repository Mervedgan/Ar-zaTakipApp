using System.ComponentModel.DataAnnotations;

namespace MobileApp.Api.DTOs;

public record SectorDto(int Id, string Name, string Code, bool IsCustom);

public record AssetDto(
    int      Id,
    string   Name,
    string?  Description,
    string?  Location,
    string?  SerialNumber,
    bool     IsActive,
    int      CompanyId,
    DateTime CreatedAt
);

public record CreateAssetDto(
    [Required, MaxLength(200)] string Name,
    [MaxLength(500)] string? Description,
    [MaxLength(200)] string? Location,
    [MaxLength(100)] string? SerialNumber
);

public record UpdateAssetDto(
    [Required, MaxLength(200)] string Name,
    [MaxLength(500)] string? Description,
    [MaxLength(200)] string? Location,
    [MaxLength(100)] string? SerialNumber,
    bool IsActive
);
