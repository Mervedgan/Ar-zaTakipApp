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
public class MaterialsController : ControllerBase
{
    private readonly AppDbContext _db;

    public MaterialsController(AppDbContext db) => _db = db;

    private int GetCompanyId()
    {
        var claim = User.FindFirst("companyId")?.Value;
        return string.IsNullOrEmpty(claim) ? 0 : int.Parse(claim);
    }
    
    private int GetUserId() => int.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);

    // GET api/materials
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companyId = GetCompanyId();
        var materials = await _db.Materials
            .Where(m => m.CompanyId == companyId)
            .OrderBy(m => m.Name)
            .Select(m => new MaterialDto(
                m.Id, m.Name, m.Description, m.Unit,
                m.Type.ToString(), m.StockQuantity, m.MinStockThreshold
            )).ToListAsync();

        return Ok(materials);
    }

    // POST api/materials
    [HttpPost]
    [Authorize(Roles = "Admin,WarehouseKeeper")]
    public async Task<IActionResult> Create([FromBody] CreateMaterialDto dto)
    {
        var companyId = GetCompanyId();
        var material = new Material
        {
            CompanyId         = companyId,
            Name              = dto.Name.Trim(),
            Description       = dto.Description?.Trim(),
            Unit              = dto.Unit?.Trim(),
            Type              = dto.Type,
            StockQuantity     = dto.InitialStock,
            MinStockThreshold = dto.MinStockThreshold,
            CreatedAt         = DateTime.UtcNow,
            UpdatedAt         = DateTime.UtcNow
        };

        _db.Materials.Add(material);

        if (dto.InitialStock > 0)
        {
            // İlk stok girişi hareketini kaydet
            _db.StockMovements.Add(new StockMovement
            {
                Material        = material,
                Type            = StockMovementType.In,
                Quantity        = dto.InitialStock,
                Reason          = "İlk stok girişi",
                CreatedByUserId = GetUserId()
            });
        }

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = material.Id }, new { material.Id });
    }

    // PUT api/materials/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,WarehouseKeeper")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMaterialDto dto)
    {
        var companyId = GetCompanyId();
        var m = await _db.Materials.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId);
        if (m is null) return NotFound();

        m.Name              = dto.Name.Trim();
        m.Description       = dto.Description?.Trim();
        m.Unit              = dto.Unit?.Trim();
        m.Type              = dto.Type;
        m.MinStockThreshold = dto.MinStockThreshold;
        m.UpdatedAt         = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST api/materials/{id}/stock
    [HttpPost("{id:int}/stock")]
    [Authorize(Roles = "Admin,WarehouseKeeper")]
    public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateMaterialStockDto dto)
    {
        var companyId = GetCompanyId();
        var m = await _db.Materials.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId);
        if (m is null) return NotFound();

        if (dto.Quantity == 0) return BadRequest("Miktar 0 olamaz.");

        m.StockQuantity += dto.Quantity;
        m.UpdatedAt = DateTime.UtcNow;

        var type = dto.Quantity > 0 ? StockMovementType.In : StockMovementType.Out;

        _db.StockMovements.Add(new StockMovement
        {
            Material        = m,
            Type            = type,
            Quantity        = Math.Abs(dto.Quantity),
            Reason          = dto.Reason ?? (type == StockMovementType.In ? "Manuel Stok Girişi" : "Manuel Stok Çıkışı"),
            CreatedByUserId = GetUserId()
        });

        await _db.SaveChangesAsync();
        return Ok(new { m.Id, m.StockQuantity });
    }

    // GET api/materials/usages?workOrderId={id}
    [HttpGet("usages")]
    public async Task<IActionResult> GetUsages([FromQuery] int workOrderId)
    {
        var companyId = GetCompanyId();
        var w = await _db.WorkOrders.Include(x => x.FaultReport)
            .FirstOrDefaultAsync(x => x.Id == workOrderId && x.FaultReport.CompanyId == companyId);
        if (w is null) return NotFound();

        var usages = await _db.MaterialUsages
            .Include(mu => mu.Material)
            .Include(mu => mu.UsedByUser)
            .Where(mu => mu.WorkOrderId == workOrderId)
            .OrderByDescending(mu => mu.UsedAt)
            .Select(mu => new MaterialUsageDto(
                mu.Id, mu.WorkOrderId, mu.MaterialId, mu.Material.Name,
                mu.UsedByUserId, mu.UsedByUser.Name, mu.Quantity, mu.IsApproved, mu.UsedAt
            )).ToListAsync();

        return Ok(usages);
    }

    // POST api/materials/usages
    [HttpPost("usages")]
    [Authorize(Roles = "Admin,Technician")]
    public async Task<IActionResult> AddUsage([FromBody] CreateMaterialUsageDto dto)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var workOrder = await _db.WorkOrders.Include(w => w.FaultReport)
            .FirstOrDefaultAsync(w => w.Id == dto.WorkOrderId && w.FaultReport.CompanyId == companyId);
        
        if (workOrder is null) return NotFound("İş emri bulunamadı.");

        var material = await _db.Materials.FirstOrDefaultAsync(m => m.Id == dto.MaterialId && m.CompanyId == companyId);
        if (material is null) return NotFound("Malzeme bulunamadı.");

        // Şirkette 'WarehouseKeeper' rolünde biri var mı?
        var hasWarehouseKeeper = await _db.Users.AnyAsync(u => u.CompanyId == companyId && u.Role == UserRole.WarehouseKeeper);

        // Eğer depo sorumlusu yoksa -> doğrudan onaylı say ve stoğu düş
        bool isApproved = !hasWarehouseKeeper;

        var usage = new MaterialUsage
        {
            WorkOrderId  = dto.WorkOrderId,
            MaterialId   = dto.MaterialId,
            UsedByUserId = userId,
            Quantity     = dto.Quantity,
            IsApproved   = isApproved,
            UsedAt       = DateTime.UtcNow
        };

        _db.MaterialUsages.Add(usage);

        if (isApproved)
        {
            material.StockQuantity -= dto.Quantity;
            
            _db.StockMovements.Add(new StockMovement
            {
                MaterialId      = material.Id,
                Type            = StockMovementType.Out,
                Quantity        = dto.Quantity,
                Reason          = $"İş emri #{workOrder.Id} parça kullanımı",
                CreatedByUserId = userId
            });

            // Minimum stok veya Sıfır stok kontrolü
            if (material.StockQuantity <= 0)
            {
                // Todo: Yöneticiye stok bitti, sipariş aç bildirimi
            }
            else if (material.MinStockThreshold.HasValue && material.StockQuantity <= material.MinStockThreshold.Value)
            {
                // Todo: Kritik stok uyarısı
            }
        }
        else
        {
            // Todo: Depo sorumlusuna onay bekleyen talep bildirimi
        }

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetUsages), new { workOrderId = dto.WorkOrderId }, new { usage.Id, isApproved });
    }
}

