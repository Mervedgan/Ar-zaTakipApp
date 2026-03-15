using System.ComponentModel.DataAnnotations;
using MobileApp.Api.Models;

namespace MobileApp.Api.DTOs;

public record WorkOrderDto(
    int             Id,
    int             FaultReportId,
    string          FaultReportTitle,
    int             AssignedToUserId,
    string          AssignedToUserName,
    string          Status,
    string?         TechnicianNote,
    DateTime        CreatedAt,
    DateTime?       StartedAt,
    DateTime?       CompletedAt,
    int             MaterialUsageCount,
    int             PurchaseOrderCount,
    int             CommentCount,
    string?         PendingMaterialName
);

public record CreateWorkOrderDto(
    [Required] int FaultReportId,
    [Required] int AssignedToUserId
);

public record UpdateWorkOrderStatusDto(
    [Required] WorkOrderStatus Status,
    string? TechnicianNote
);
