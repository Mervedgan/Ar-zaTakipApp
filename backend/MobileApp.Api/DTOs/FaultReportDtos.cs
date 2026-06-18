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
    int           WorkOrderCount,
    string?       DepartmentName,
    string?       Category,
    /// <summary>Bu ekipmanın toplam arıza sayısı — tekrarlayan arıza tespiti için</summary>
    int           AssetFaultCount,
    /// <summary>"User" = kullanıcı seçti, "System" = AI önerisi kabul edildi</summary>
    string        PrioritySource
);

public record CreateFaultReportDto(
    [Required] int AssetId,
    [Required, MaxLength(300)] string Title,
    [Required] string Description,
    [Required] FaultPriority Priority,
    string? PhotoUrls,
    int? DepartmentId,
    /// <summary>true ise öncelik AI önerisinden kabul edildi</summary>
    bool PriorityFromAI = false
);

public record UpdateFaultStatusDto(
    [Required] FaultStatus Status
);

// ── AI: Öncelik Önerisi ────────────────────────────────────────────────────
public record PrioritySuggestionRequestDto(
    [Required] string Title,
    [Required] string Description
);

public record PrioritySuggestionDto(
    string SuggestedPriority,
    string Reason
);

// ── AI: Dashboard Chat ──────────────────────────────────────────────────────
public record ChatRequestDto(
    [Required] string Message,
    string? UserName = null
);

public record ChatResponseDto(
    string Reply
);

// ── AI: Açıklama İyileştirme ───────────────────────────────────────────────
public record ImproveDescriptionRequestDto(
    [Required] string Text
);

public record ImproveDescriptionResponseDto(
    string Improved
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
