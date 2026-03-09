using System.ComponentModel.DataAnnotations;
using MobileApp.Api.Models;

namespace MobileApp.Api.DTOs;

public record NotificationDto(
    int      Id,
    string   Type,
    string   Title,
    string   Body,
    int?     RelatedEntityId,
    string?  RelatedEntityType,
    bool     IsRead,
    DateTime CreatedAt
);

public record CreateNotificationDto(
    [Required] int UserId,
    [Required] NotificationType Type,
    [Required, MaxLength(200)] string Title,
    [Required, MaxLength(500)] string Body,
    int? RelatedEntityId = null,
    string? RelatedEntityType = null
);
