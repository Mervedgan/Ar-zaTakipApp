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
public class DepartmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DepartmentsController(AppDbContext db) => _db = db;

    private int GetCompanyId()
    {
        var value = User.Claims.FirstOrDefault(c => c.Type == "companyId")?.Value;
        return string.IsNullOrEmpty(value) ? 0 : int.Parse(value);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return BadRequest(new { message = "Şirket kimliği bulunamadı." });

        var departments = await _db.Departments
            .Where(d => d.CompanyId == companyId && d.IsActive)
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto(d.Id, d.Name, d.IsActive, d.CreatedAt))
            .ToListAsync();

        return Ok(departments);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateDepartmentDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return BadRequest(new { message = "Şirket kimliği bulunamadı." });

        var department = new Department
        {
            CompanyId = companyId,
            Name = dto.Name.Trim()
        };

        _db.Departments.Add(department);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = department.Id }, new { department.Id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDepartmentDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return BadRequest(new { message = "Şirket kimliği bulunamadı." });

        var department = await _db.Departments.FirstOrDefaultAsync(d => d.Id == id && d.CompanyId == companyId);
        if (department == null) return NotFound();

        department.Name = dto.Name.Trim();
        department.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return BadRequest(new { message = "Şirket kimliği bulunamadı." });

        var department = await _db.Departments.Include(d => d.FaultReports).FirstOrDefaultAsync(d => d.Id == id && d.CompanyId == companyId);
        if (department == null) return NotFound();

        if (department.FaultReports.Any())
        {
            return BadRequest(new { message = "Bu departmana bağlı arıza kayıtları olduğu için silinemez. Pasif yapmayı deneyin." });
        }

        _db.Departments.Remove(department);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
