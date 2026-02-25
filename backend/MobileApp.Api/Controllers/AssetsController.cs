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

    private int GetCompanyId()
    {
        var claim = User.FindFirst("companyId")?.Value;
        return string.IsNullOrEmpty(claim) ? 0 : int.Parse(claim);
    }

    // GET api/assets
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Forbid();

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
        var companyId = GetCompanyId();
        var asset = await _db.Assets.FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyId);
        
        if (asset is null) return NotFound();

        return Ok(new AssetDto(
            asset.Id, asset.Name, asset.Description, asset.Location,
            asset.SerialNumber, asset.IsActive, asset.CompanyId, asset.CreatedAt));
    }

    // POST api/assets
    [HttpPost]
    [Authorize(Roles = "Admin,Employee")]
    public async Task<IActionResult> Create([FromBody] CreateAssetDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0) return Forbid();

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
        var companyId = GetCompanyId();
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
