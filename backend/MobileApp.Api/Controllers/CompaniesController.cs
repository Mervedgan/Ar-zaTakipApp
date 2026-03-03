using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Data;
using MobileApp.Api.DTOs;
using MobileApp.Api.Models;
using System.Linq;

namespace MobileApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CompaniesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CompaniesController(AppDbContext db) => _db = db;

    // PUT api/companies/setup
    [HttpPut("setup")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Setup([FromBody] CompanySetupDto dto)
    {
        var companyIdClaim = User.Claims.FirstOrDefault(c => c.Type == "companyId")?.Value;
        if (string.IsNullOrEmpty(companyIdClaim)) return BadRequest(new { message = "Şirket ID bulunamadı." });

        var companyId = int.Parse(companyIdClaim);
        var company = await _db.Companies.FindAsync(companyId);
        
        if (company == null) return NotFound();
        if (company.IsApproved) return BadRequest(new { message = "Şirket kurulumu zaten tamamlanmış." });

        // 4 haneli benzersiz kod üret
        string code;
        bool isUnique;
        var random = new Random();
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Okunabilirlik için I, O, 0, 1 çıkarıldı

        do
        {
            code = new string(Enumerable.Repeat(chars, 4)
                .Select(s => s[random.Next(s.Length)]).ToArray());
            
            isUnique = !await _db.Companies.AnyAsync(c => c.CompanyCode == code);
        } while (!isUnique);

        company.Name = dto.Name.Trim();
        company.EstablishmentYear = dto.EstablishmentYear;
        company.CompanyCode = code;
        company.IsApproved = true;

        await _db.SaveChangesAsync();

        return Ok(new { 
            message = "Şirket kurulumu başarıyla tamamlandı.", 
            companyCode = code,
            companyName = company.Name
        });
    }

    // GET api/companies/my-company
    [HttpGet("my-company")]
    public async Task<IActionResult> GetMyCompany()
    {
        var companyIdClaim = User.Claims.FirstOrDefault(c => c.Type == "companyId")?.Value;
        if (string.IsNullOrEmpty(companyIdClaim)) return BadRequest(new { message = "Şirket ID bulunamadı." });

        var companyId = int.Parse(companyIdClaim);
        var company = await _db.Companies
            .Select(c => new {
                c.Id,
                c.Name,
                c.CompanyCode,
                c.EstablishmentYear,
                c.IsApproved
            })
            .FirstOrDefaultAsync(c => c.Id == companyId);

        if (company == null) return NotFound();
        return Ok(company);
    }
}
