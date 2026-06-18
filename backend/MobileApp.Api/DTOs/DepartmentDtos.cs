using System.ComponentModel.DataAnnotations;

namespace MobileApp.Api.DTOs;

public record DepartmentDto(
    int Id,
    string Name,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateDepartmentDto(
    [Required, MaxLength(100)] string Name
);

public record UpdateDepartmentDto(
    [Required, MaxLength(100)] string Name,
    bool IsActive
);
