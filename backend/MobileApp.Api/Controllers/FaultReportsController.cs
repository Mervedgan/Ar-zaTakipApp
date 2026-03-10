using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Collections.Generic;
using System.Threading.Tasks;
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

    private string? GetClaim(string type)
    {
        // En güvenli yöntem: Tüm claim'leri gez ve tipi eşleşeni bul
        return User.Claims.FirstOrDefault(c => c.Type == type)?.Value;
    }

    private int GetCompanyId(out string? error)
    {
        error = null;
        var value = GetClaim("companyId");
        if (string.IsNullOrEmpty(value))
        {
            error = "Şirket kimliği (companyId) bulunamadı. Lütfen tekrar giriş yapın.";
            return 0;
        }
        return int.Parse(value);
    }
    
    private int GetUserId(out string? error)
    {
        error = null;
        var value = GetClaim("sub");
        if (string.IsNullOrEmpty(value))
        {
            error = "Kullanıcı ID (sub) bulunamadı. Lütfen tekrar giriş yapın.";
            return 0;
        }
        return int.Parse(value);
    }

    // GET api/faultreports
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool unassignedOnly = false)
    {
        var companyId = GetCompanyId(out var error);
        if (companyId == 0) return BadRequest(new { message = error });

        var query = _db.FaultReports
            .Include(f => f.Asset)
            .Include(f => f.ReportedByUser)
            .Include(f => f.Comments)
            .Include(f => f.WorkOrders)
            .Where(f => f.CompanyId == companyId);

        if (unassignedOnly)
        {
            // SAHİPSİZ İŞLER: Eğer üzerinde herhangi bir İş Emri (WorkOrder) varsa, ana listeden kalkmalı.
            // Sadece WorkOrder listesi boş olan ve durumu Open olanlar gelecek.
            query = query.Where(f => !f.WorkOrders.Any() && f.Status == FaultStatus.Open);
        }

        var reports = await query
            .OrderByDescending(f => f.Priority) // Sadece Öncelik sırasına göre
            .Select(f => new FaultReportDto(
                f.Id, f.AssetId, f.Asset.Name, f.Title, f.Description,
                f.Priority.ToString(), f.Status.ToString(),
                f.ReportedByUserId, f.ReportedByUser.Name,
                f.PhotoUrls, f.CreatedAt, f.ResolvedAt, f.ClosedAt,
                f.Comments.Count, f.WorkOrders.Count,
                f.Department != null ? f.Department.Name : null,
                f.Asset.Category
            ))
            .ToListAsync();

        return Ok(reports);
    }

    // GET api/faultreports/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var companyId = GetCompanyId(out var error);
        if (companyId == 0) return BadRequest(new { message = error });

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
            f.Comments.Count, f.WorkOrders.Count,
            f.Department != null ? f.Department.Name : null,
            f.Asset.Category
        );

        return Ok(dto);
    }

    // POST api/faultreports
    [HttpPost]
    [Authorize] 
    public async Task<IActionResult> Create([FromBody] CreateFaultReportDto dto)
    {
        try 
        {
            var companyId = GetCompanyId(out var companyError);
            if (companyId == 0) return BadRequest(new { message = companyError });

            var userId = GetUserId(out var userError);
            if (userId == 0) return BadRequest(new { message = userError });

            // Asset şirkete mi ait kontrolü
            var asset = await _db.Assets.FirstOrDefaultAsync(a => a.Id == dto.AssetId && a.CompanyId == companyId);
            if (asset == null) 
            {
                 return BadRequest(new { message = $"Seçilen ekipman (ID:{dto.AssetId}) bu şirkette bulunamadı." });
            }

            var report = new FaultReport
            {
                CompanyId        = companyId,
                AssetId          = dto.AssetId,
                ReportedByUserId = userId,
                Title            = dto.Title.Trim(),
                Description      = dto.Description.Trim(),
                Priority         = dto.Priority,
                Status           = FaultStatus.Open,
                PhotoUrls        = dto.PhotoUrls,
                DepartmentId     = dto.DepartmentId
            };

            _db.FaultReports.Add(report);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = report.Id }, new { report.Id });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Sunucu hatası: " + ex.Message, detail = ex.InnerException?.Message });
        }
    }

    // PUT api/faultreports/{id}/status
    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Technician")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateFaultStatusDto dto)
    {
        var companyId = GetCompanyId(out var error);
        if (companyId == 0) return BadRequest(new { message = error });

        var report = await _db.FaultReports.FirstOrDefaultAsync(f => f.Id == id && f.CompanyId == companyId);
        
        if (report is null) return NotFound();

        report.Status = dto.Status;

        if (dto.Status == FaultStatus.Resolved)
            report.ResolvedAt = DateTime.UtcNow;
        else if (dto.Status == FaultStatus.Closed)
            report.ClosedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET api/faultreports/{id}/comments
    [HttpGet("{id:int}/comments")]
    public async Task<IActionResult> GetComments(int id)
    {
        var companyId = GetCompanyId(out var error);
        if (companyId == 0) return BadRequest(new { message = error });
        
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

    [HttpPost("{id:int}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] CreateCommentDto dto)
    {
        var companyId = GetCompanyId(out var companyError);
        if (companyId == 0) return BadRequest(new { message = companyError });

        var userId = GetUserId(out var userError);
        if (userId == 0) return BadRequest(new { message = userError });

        var hasAccess = await _db.FaultReports.AnyAsync(f => f.Id == id && f.CompanyId == companyId);
        if (!hasAccess) return NotFound();

        var comment = new Comment
        {
            FaultReportId = id,
            AuthorId      = userId,
            Text          = dto.Text.Trim()
        };

        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        return Ok(new { comment.Id });
    }
}
