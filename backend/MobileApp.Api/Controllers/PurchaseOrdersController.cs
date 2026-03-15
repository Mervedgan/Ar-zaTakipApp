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
public class PurchaseOrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public PurchaseOrdersController(AppDbContext db) => _db = db;

    private string? GetClaim(string type) => User.Claims.FirstOrDefault(c => c.Type == type)?.Value;
    private int GetUserId() => int.Parse(GetClaim("sub") ?? "0");
    private string GetUserRole() => GetClaim(ClaimTypes.Role) ?? GetClaim("role") ?? "";
    private int GetCompanyId() => int.Parse(GetClaim("companyId") ?? "0");

    // GET api/purchaseorders
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companyId = GetCompanyId();
        var role = GetUserRole();
        var userId = GetUserId();

        var query = _db.PurchaseOrders
            .Include(p => p.WorkOrder).ThenInclude(w => w.FaultReport)
            .Include(p => p.RequestedByUser)
            .Include(p => p.AssignedToUser)
            .Include(p => p.Material)
            .Where(p => p.RequestedByUser.CompanyId == companyId);

        // Satın alma personeli kendisine atananları görebilir (veya onaylanmış tüm açık talepleri)
        if (role == nameof(UserRole.Purchasing))
        {
            query = query.Where(p => p.Status == PurchaseOrderStatus.ApprovedByAdmin || p.Status == PurchaseOrderStatus.Completed);
        }
        // Teknisyen sadece kendi taleplerini görebilir
        else if (role == nameof(UserRole.Technician))
        {
            query = query.Where(p => p.RequestedByUserId == userId);
        }
        var orders = await query
            .OrderBy(p => p.Status)
            .ThenByDescending(p => p.CreatedAt)
            .Select(p => new PurchaseOrderDto(
                p.Id, 
                p.WorkOrderId, 
                p.WorkOrder.FaultReport.Title,
                p.AssignedToUserId, 
                p.AssignedToUser != null ? p.AssignedToUser.Name : null,
                p.RequestedByUserId, 
                p.RequestedByUser.Name,
                p.MaterialId, 
                p.Material != null ? p.Material.Name : p.ManualMaterialName,
                p.ManualMaterialName,
                p.Quantity, 
                p.Note, 
                p.Status.ToString(),
                p.CreatedAt, 
                p.WorkOrder.FaultReport.CreatedAt,
                p.WorkOrder.FaultReport.Priority.ToString(),
                p.AdminReviewedAt, 
                p.CompletedAt
            )).ToListAsync();

        return Ok(orders);
    }

    // POST api/purchaseorders
    // Teknisyen veya Depo Sorumlusu parça bittiğinde/yetersiz kaldığında oluşturur
    [HttpPost]
    [Authorize(Roles = "Admin,Technician,WarehouseKeeper")]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderDto dto)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var workOrder = await _db.WorkOrders.Include(w => w.FaultReport)
            .FirstOrDefaultAsync(w => w.Id == dto.WorkOrderId && w.FaultReport.CompanyId == companyId);
        
        if (workOrder is null) return NotFound("İş emri bulunamadı.");

        // MaterialId veya ManualMaterialName en az biri dolu olmalı
        if (!dto.MaterialId.HasValue && string.IsNullOrWhiteSpace(dto.ManualMaterialName))
        {
            return BadRequest("Lütfen bir malzeme seçin veya manuel isim girin.");
        }

        if (dto.MaterialId.HasValue)
        {
            var material = await _db.Materials.FirstOrDefaultAsync(m => m.Id == dto.MaterialId && m.CompanyId == companyId);
            if (material is null) return NotFound("Seçilen malzeme bulunamadı.");
        }

        var order = new PurchaseOrder
        {
            WorkOrderId        = dto.WorkOrderId,
            MaterialId         = dto.MaterialId,
            ManualMaterialName = dto.ManualMaterialName?.Trim(),
            Quantity           = dto.Quantity,
            Note               = dto.Note?.Trim(),
            RequestedByUserId  = userId,
            Status             = PurchaseOrderStatus.Pending
        };

        _db.PurchaseOrders.Add(order);
        
        if (workOrder != null) workOrder.Status = WorkOrderStatus.WaitingForPart;

        await _db.SaveChangesAsync();
        await _db.Entry(order).Reference(x => x.RequestedByUser).LoadAsync();

        // Todo: Yöneticiye "Yeni Satın Alma Onayı Bekliyor" bildirimi gönder

        return CreatedAtAction(nameof(GetAll), new { id = order.Id }, new { order.Id });
    }

    // PUT api/purchaseorders/{id}/review
    // Sadece Admin (Yönetici) onaylar veya reddeder
    [HttpPut("{id:int}/review")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminReview(int id, [FromBody] AdminReviewPurchaseOrderDto dto)
    {
        var companyId = GetCompanyId();
        var order = await _db.PurchaseOrders
            .Include(p => p.WorkOrder).ThenInclude(w => w.FaultReport)
            .Include(p => p.RequestedByUser)
            .FirstOrDefaultAsync(p => p.Id == id && p.RequestedByUser.CompanyId == companyId);

        if (order is null) return NotFound();
        if (order.Status != PurchaseOrderStatus.Pending) 
            return BadRequest("Sadece bekleyen talepler değerlendirilebilir.");

        order.Status = dto.IsApproved ? PurchaseOrderStatus.ApprovedByAdmin : PurchaseOrderStatus.RejectedByAdmin;
        order.AdminReviewedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        if (dto.IsApproved)
        {
            // Todo: Satın Alma departmanına bildirim
        }
        else
        {
            // Todo: Talep eden Teknisyene red bildirimi
        }

        return NoContent();
    }

    // PUT api/purchaseorders/{id}/complete
    // Satın Alma departmanı parçayı teslim edince tamamlar (Stok otomatik artar)
    [HttpPut("{id:int}/complete")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<IActionResult> Complete(int id, [FromBody] CompletePurchaseOrderDto dto)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        var order = await _db.PurchaseOrders
            .Include(p => p.Material)
            .Include(p => p.WorkOrder).ThenInclude(w => w.FaultReport)
            .Include(p => p.RequestedByUser)
            .FirstOrDefaultAsync(p => p.Id == id && p.RequestedByUser.CompanyId == companyId);

        if (order is null) return NotFound();
        if (order.Status != PurchaseOrderStatus.ApprovedByAdmin) 
            return BadRequest("Sadece yönetici onayı alınmış talepler tamamlanabilir.");

        // Satın alma tamamlandı
        order.Status = PurchaseOrderStatus.Completed;
        order.CompletedAt = DateTime.UtcNow;
        order.AssignedToUserId = userId; // Kim tamamladı?
        if (!string.IsNullOrEmpty(dto.Note)) order.Note = (order.Note + "\n" + dto.Note).Trim();

        // Alınan parçaları stoka ekle (Eğer kayıtlı bir malzeme ise)
        if (order.Material != null && order.MaterialId.HasValue)
        {
            order.Material.StockQuantity += order.Quantity;

            _db.StockMovements.Add(new StockMovement
            {
                MaterialId      = order.MaterialId.Value,
                Type            = StockMovementType.In,
                Quantity        = order.Quantity,
                Reason          = $"Satın Alma #{order.Id} teslimatı (İş Emri #{order.WorkOrderId})",
                CreatedByUserId = userId
            });
        }

        await _db.SaveChangesAsync();

        // Todo: Talep eden Teknisyene "Parça Geldi" bildirimi gönder
        
        return NoContent();
    }
}
