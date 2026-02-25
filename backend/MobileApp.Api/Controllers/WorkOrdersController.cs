using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
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
public class WorkOrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public WorkOrdersController(AppDbContext db) => _db = db;

    private int GetCompanyId()
    {
        var claim = User.FindFirst("companyId")?.Value;
        return string.IsNullOrEmpty(claim) ? 0 : int.Parse(claim);
    }
    
    private int GetUserId() => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
    private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role) ?? "";

    // GET api/workorders
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Forbid();

        var userId = GetUserId();
        var role = GetUserRole();

        var query = _db.WorkOrders
            .Include(w => w.FaultReport)
            .Include(w => w.AssignedToUser)
            .Include(w => w.MaterialUsages)
            .Include(w => w.PurchaseOrders)
            .Include(w => w.Comments)
            .Where(w => w.FaultReport.CompanyId == companyId);

        // Teknisyen sadece kendine atananları görür, Admin/Diğerleri hepsini görebilir 
        // (İsteğe bağlı kural, şimdilik böyle varsayıyorum)
        if (role == nameof(UserRole.Technician))
        {
            query = query.Where(w => w.AssignedToUserId == userId);
        }

        var workOrders = await query
            .OrderBy(w => w.Status) // Açık/İşlemdekiler üstte
            .ThenByDescending(w => w.CreatedAt)
            .Select(w => new WorkOrderDto(
                w.Id, w.FaultReportId, w.FaultReport.Title,
                w.AssignedToUserId, w.AssignedToUser.Name,
                w.Status.ToString(), w.TechnicianNote,
                w.CreatedAt, w.StartedAt, w.CompletedAt,
                w.MaterialUsages.Count, w.PurchaseOrders.Count, w.Comments.Count
            ))
            .ToListAsync();

        return Ok(workOrders);
    }

    // GET api/workorders/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var companyId = GetCompanyId();
        var w = await _db.WorkOrders
            .Include(w => w.FaultReport)
            .Include(w => w.AssignedToUser)
            .Include(w => w.Comments).ThenInclude(c => c.Author)
            .FirstOrDefaultAsync(w => w.Id == id && w.FaultReport.CompanyId == companyId);

        if (w is null) return NotFound();

        var dto = new WorkOrderDto(
            w.Id, w.FaultReportId, w.FaultReport.Title,
            w.AssignedToUserId, w.AssignedToUser.Name,
            w.Status.ToString(), w.TechnicianNote,
            w.CreatedAt, w.StartedAt, w.CompletedAt,
            0, 0, w.Comments.Count // Detail sayfasında ilgili listeleri ayrıca çekeriz
        );

        return Ok(dto);
    }

    // POST api/workorders
    // Genelde Admin veya Employee iş emri oluşturup Teknisyene atar
    [HttpPost]
    [Authorize(Roles = "Admin,Employee")]
    public async Task<IActionResult> Create([FromBody] CreateWorkOrderDto dto)
    {
        var companyId = GetCompanyId();
        
        // Fault report kontrolü
        var fault = await _db.FaultReports.FirstOrDefaultAsync(f => f.Id == dto.FaultReportId && f.CompanyId == companyId);
        if (fault is null) return BadRequest(new { message = "Arıza kaydı bulunamadı." });

        // User kontrolü
        var tech = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.AssignedToUserId && u.CompanyId == companyId && u.Role == UserRole.Technician);
        if (tech is null) return BadRequest(new { message = "Geçerli bir teknisyen seçilmedi." });

        var workOrder = new WorkOrder
        {
            FaultReportId    = fault.Id,
            AssignedToUserId = tech.Id,
            Status           = WorkOrderStatus.Assigned
        };

        _db.WorkOrders.Add(workOrder);

        // Arıza durumunu otomatik InProgress yapabiliriz (opsiyonel)
        if (fault.Status == FaultStatus.Open)
            fault.Status = FaultStatus.InProgress;

        await _db.SaveChangesAsync();

        // Todo: Teknisyene bildirim (Push)

        return CreatedAtAction(nameof(GetById), new { id = workOrder.Id }, new { workOrder.Id });
    }

    // PUT api/workorders/{id}/status
    // Teknisyen iş emri durumunu günceller (Örn: Tamamlandı, Parça Bekliyor)
    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin,Technician")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateWorkOrderStatusDto dto)
    {
        var companyId = GetCompanyId();
        var role = GetUserRole();
        var userId = GetUserId();

        var w = await _db.WorkOrders
            .Include(w => w.FaultReport)
            .FirstOrDefaultAsync(w => w.Id == id && w.FaultReport.CompanyId == companyId);
        
        if (w is null) return NotFound();

        // Teknisyense sadece kendi iş emrini güncelleyebilir
        if (role == nameof(UserRole.Technician) && w.AssignedToUserId != userId)
            return Forbid();

        w.Status = dto.Status;
        w.TechnicianNote = dto.TechnicianNote ?? w.TechnicianNote;

        if (dto.Status == WorkOrderStatus.InProgress && w.StartedAt == null)
            w.StartedAt = DateTime.UtcNow;
        else if (dto.Status == WorkOrderStatus.Completed)
            w.CompletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Todo: Duruma göre Yöneticiye/Çalışana bildirim
        return NoContent();
    }
}
