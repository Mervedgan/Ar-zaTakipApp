using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Data;
using MobileApp.Api.DTOs;

namespace MobileApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db) => _db = db;

    private int GetUserId() => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    // GET api/notifications
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();

        var notifications = await _db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50) // Son 50 bildirim
            .Select(n => new NotificationDto(
                n.Id, n.Type.ToString(), n.Title, n.Body,
                n.RelatedEntityId, n.RelatedEntityType,
                n.IsRead, n.CreatedAt
            )).ToListAsync();

        return Ok(notifications);
    }

    // GET api/notifications/unread-count
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        var count = await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new { count });
    }

    // PUT api/notifications/{id}/read
    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = GetUserId();
        var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification is null) return NotFound();

        notification.IsRead = true;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // PUT api/notifications/read-all
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetUserId();
        var unreadNotifications = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var n in unreadNotifications)
        {
            n.IsRead = true;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
