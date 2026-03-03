using System.Security.Claims;
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
public class AssetsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AssetsController(AppDbContext db) => _db = db;

    private string? GetClaim(string type)
    {
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

    // GET api/assets
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companyId = GetCompanyId(out var error);
        if (companyId == 0) return BadRequest(new { message = error });

        var assets = await _db.Assets
            .Where(a => a.CompanyId == companyId)
            .OrderByDescending(a => a.IsActive)
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => new AssetDto(
                a.Id, a.Name, a.Description, a.Location,
                a.SerialNumber, a.IsActive, a.CompanyId, a.CreatedAt))
            .ToListAsync();

        return Ok(assets);
    }

    // GET api/assets/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var companyId = GetCompanyId(out var error);
        if (companyId == 0) return BadRequest(new { message = error });

        var asset = await _db.Assets.FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId);
        
        if (asset is null) return NotFound();

        return Ok(new AssetDto(
            asset.Id, asset.Name, asset.Description, asset.Location,
            asset.SerialNumber, asset.IsActive, asset.CompanyId, asset.CreatedAt));
    }

    // POST api/assets
    [HttpPost]
    [Authorize(Roles = "Admin,Employee,Technician,WarehouseKeeper")]
    public async Task<IActionResult> Create([FromBody] CreateAssetDto dto)
    {
        var companyId = GetCompanyId(out var error);
        if (companyId == 0) return BadRequest(new { message = error });

        var asset = new Asset
        {
            CompanyId    = companyId,
            Name         = dto.Name.Trim(),
            Description  = dto.Description?.Trim(),
            Location     = dto.Location?.Trim(),
            SerialNumber = dto.SerialNumber?.Trim()
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, new AssetDto(
            asset.Id, asset.Name, asset.Description, asset.Location,
            asset.SerialNumber, asset.IsActive, asset.CompanyId, asset.CreatedAt));
    }

    // PUT api/assets/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAssetDto dto)
    {
        var companyId = GetCompanyId(out var error);
        if (companyId == 0) return BadRequest(new { message = error });

        var asset = await _db.Assets.FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId);
        
        if (asset is null) return NotFound();

        asset.Name         = dto.Name.Trim();
        asset.Description  = dto.Description?.Trim();
        asset.Location     = dto.Location?.Trim();
        asset.SerialNumber = dto.SerialNumber?.Trim();
        asset.IsActive     = dto.IsActive;

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
