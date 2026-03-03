using System.ComponentModel.DataAnnotations;
using MobileApp.Api.Models;

namespace MobileApp.Api.DTOs;

public record PurchaseOrderDto(
    int      Id,
    int      WorkOrderId,
    string   WorkOrderTitle,
    int?     AssignedToUserId,
    string?  AssignedToUserName,
    int      RequestedByUserId,
    string   RequestedByUserName,
    int?     MaterialId,
    string?  MaterialName,
    string?  ManualMaterialName,
    int      Quantity,
    string?  Note,
    string   Status,
    DateTime CreatedAt,
    DateTime? AdminReviewedAt,
    DateTime? CompletedAt
);

public record CreatePurchaseOrderDto(
    [Required] int WorkOrderId,
    int? MaterialId,
    string? ManualMaterialName,
    [Required] int Quantity,
    string? Note
);

public record AdminReviewPurchaseOrderDto(
    [Required] bool IsApproved    // true: ApprovedByAdmin, false: RejectedByAdmin
);

public record CompletePurchaseOrderDto(
    string? Note
);
