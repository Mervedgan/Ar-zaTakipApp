using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Data;
using MobileApp.Api.DTOs;
using MobileApp.Api.Models;

namespace MobileApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    // GET api/users  (Admin only)
    [HttpGet]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.Users
            .Include(u => u.Company)
            .Select(u => new UserDto(
                u.Id, u.Name, u.Email,
                u.Role.ToString(),
                u.CompanyId,
                u.Company != null ? u.Company.Name : null,
                u.CreatedAt))
            .ToListAsync();
        return Ok(users);
    }

    // GET api/users/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var u = await _db.Users.Include(u => u.Company).FirstOrDefaultAsync(u => u.Id == id);
        if (u is null) return NotFound();
        return Ok(new UserDto(
            u.Id, u.Name, u.Email,
            u.Role.ToString(),
            u.CompanyId,
            u.Company?.Name,
            u.CreatedAt));
    }
}
