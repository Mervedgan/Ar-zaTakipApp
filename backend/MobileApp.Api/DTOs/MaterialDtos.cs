using System.ComponentModel.DataAnnotations;
using MobileApp.Api.Models;

namespace MobileApp.Api.DTOs;

public record MaterialDto(
    int          Id,
    string       Name,
    string?      Description,
    string?      Unit,
    string       Type,
    int          StockQuantity,
    int?         MinStockThreshold
);

public record CreateMaterialDto(
    [Required, MaxLength(200)] string Name,
    string? Description,
    string? Unit,
    [Required] MaterialType Type,
    int InitialStock = 0,
    int? MinStockThreshold = null
);

public record UpdateMaterialDto(
    [Required, MaxLength(200)] string Name,
    string? Description,
    string? Unit,
    [Required] MaterialType Type,
    int? MinStockThreshold
);

// ── Material Usage ────────────────────────────────────────────────────────

public record MaterialUsageDto(
    int      Id,
    int      WorkOrderId,
    int      MaterialId,
    string   MaterialName,
    int      UsedByUserId,
    string   UsedByUserName,
    int      Quantity,
    bool     IsApproved,
    DateTime UsedAt
);

public record CreateMaterialUsageDto(
    [Required] int WorkOrderId,
    [Required] int MaterialId,
    [Required] int Quantity
);
