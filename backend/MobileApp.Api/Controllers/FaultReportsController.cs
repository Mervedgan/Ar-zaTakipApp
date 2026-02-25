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
public class FaultReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public FaultReportsController(AppDbContext db) => _db = db;

    private int GetCompanyId()
    {
        var claim = User.FindFirst("companyId")?.Value;
        return string.IsNullOrEmpty(claim) ? 0 : int.Parse(claim);
    }
    
    private int GetUserId() => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    // GET api/faultreports
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Forbid();

        var reports = await _db.FaultReports
            .Include(f => f.Asset)
            .Include(f => f.ReportedByUser)
            .Include(f => f.Comments)
            .Include(f => f.WorkOrders)
            .Where(f => f.CompanyId == companyId)
            .OrderByDescending(f => f.Priority) // Önce kritik arızalar
            .ThenBy(f => f.Status)              // Sonra statü sırası (öncelikli açık/işlemde olanlar)
            .ThenByDescending(f => f.CreatedAt)
            .Select(f => new FaultReportDto(
                f.Id, f.AssetId, f.Asset.Name, f.Title, f.Description,
                f.Priority.ToString(), f.Status.ToString(),
                f.ReportedByUserId, f.ReportedByUser.Name,
                f.PhotoUrls, f.CreatedAt, f.ResolvedAt, f.ClosedAt,
                f.Comments.Count, f.WorkOrders.Count
            ))
            .ToListAsync();

        return Ok(reports);
    }

    // GET api/faultreports/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var companyId = GetCompanyId();
        var f = await _db.FaultReports
            .Include(f => f.Asset)
            .Include(f => f.ReportedByUser)
            .Include(f => f.Comments).ThenInclude(c => c.Author)
            .Include(f => f.WorkOrders)
            .FirstOrDefaultAsync(f => f.Id == id && f.CompanyId == companyId);

        if (f is null) return NotFound();

        var dto = new FaultReportDto(
            f.Id, f.AssetId, f.Asset.Name, f.Title, f.Description,
            f.Priority.ToString(), f.Status.ToString(),
            f.ReportedByUserId, f.ReportedByUser.Name,
            f.PhotoUrls, f.CreatedAt, f.ResolvedAt, f.ClosedAt,
            f.Comments.Count, f.WorkOrders.Count
        );

        // İstersek ilişkili WorkOrder/Comment listelerini döndürebileceğimiz ayrı API de açabiliriz
        // Şimdilik özet FaultReportDto dönüyoruz.
        return Ok(dto);
    }

    // POST api/faultreports
    [HttpPost]
    [Authorize(Roles = "Admin,Employee,Technician")]
    public async Task<IActionResult> Create([FromBody] CreateFaultReportDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Forbid();

        // Asset şirkete mi ait kontrolü
        var assetExists = await _db.Assets.AnyAsync(a => a.Id == dto.AssetId && a.CompanyId == companyId);
        if (!assetExists) return BadRequest(new { message = "Seçilen ekipman bulunamadı." });

        var report = new FaultReport
        {
            CompanyId        = companyId,
            AssetId          = dto.AssetId,
            ReportedByUserId = GetUserId(),
            Title            = dto.Title.Trim(),
            Description      = dto.Description.Trim(),
            Priority         = dto.Priority,
            Status           = FaultStatus.Open,
            PhotoUrls        = dto.PhotoUrls
        };

        _db.FaultReports.Add(report);
        await _db.SaveChangesAsync();

        // Todo: Teknisyenlere bildirim fırlatılacak

        return CreatedAtAction(nameof(GetById), new { id = report.Id }, new { report.Id });
    }

    // PUT api/faultreports/{id}/status
    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin,Technician")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateFaultStatusDto dto)
    {
        var companyId = GetCompanyId();
        var report = await _db.FaultReports.FirstOrDefaultAsync(f => f.Id == id && f.CompanyId == companyId);
        
        if (report is null) return NotFound();

        report.Status = dto.Status;

        if (dto.Status == FaultStatus.Resolved)
            report.ResolvedAt = DateTime.UtcNow;
        else if (dto.Status == FaultStatus.Closed)
            report.ClosedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Todo: Eğer closed veya resolved ise Employee ve Yöneticiye bildirim fırlatılabilir.
        return NoContent();
    }


    // ── Yorum (Comment) ──────────────────────────────────────────────────
    
    // GET api/faultreports/{id}/comments
    [HttpGet("{id:int}/comments")]
    public async Task<IActionResult> GetComments(int id)
    {
        var companyId = GetCompanyId();
        // Önce arızanın bu şirkete ait olduğunu doğrula
        var hasAccess = await _db.FaultReports.AnyAsync(f => f.Id == id && f.CompanyId == companyId);
        if (!hasAccess) return NotFound();

        var comments = await _db.Comments
            .Include(c => c.Author)
            .Where(c => c.FaultReportId == id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto(
                c.Id, c.AuthorId, c.Author.Name, c.Author.Role.ToString(),
                c.Text, c.CreatedAt
            )).ToListAsync();

        return Ok(comments);
    }

    // POST api/faultreports/{id}/comments
    [HttpPost("{id:int}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] CreateCommentDto dto)
    {
        var companyId = GetCompanyId();
        var hasAccess = await _db.FaultReports.AnyAsync(f => f.Id == id && f.CompanyId == companyId);
        if (!hasAccess) return NotFound();

        var comment = new Comment
        {
            FaultReportId = id,
            AuthorId      = GetUserId(),
            Text          = dto.Text.Trim()
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        // Todo: Yorum eklendiğinde ilgili kişilere (report user, technician) bildirim.

        return Ok(new { comment.Id });
    }
}
