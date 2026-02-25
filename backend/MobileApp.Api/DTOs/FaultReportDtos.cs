using System.ComponentModel.DataAnnotations;
using MobileApp.Api.Models;

namespace MobileApp.Api.DTOs;

public record FaultReportDto(
    int           Id,
    int           AssetId,
    string        AssetName,
    string        Title,
    string        Description,
    string        Priority,
    string        Status,
    int           ReportedByUserId,
    string        ReportedByUserName,
    string?       PhotoUrls,
    DateTime      CreatedAt,
    DateTime?     ResolvedAt,
    DateTime?     ClosedAt,
    int           CommentCount,
    int           WorkOrderCount
);

public record CreateFaultReportDto(
    [Required] int AssetId,
    [Required, MaxLength(300)] string Title,
    [Required] string Description,
    [Required] FaultPriority Priority,
    string? PhotoUrls
);

public record UpdateFaultStatusDto(
    [Required] FaultStatus Status
);

// ── Yorum (Comment) ────────────────────────────────────────────────────────
public record CommentDto(
    int      Id,
    int      AuthorId,
    string   AuthorName,
    string   AuthorRole,
    string   Text,
    DateTime CreatedAt
);

public record CreateCommentDto(
    [Required] string Text
);
