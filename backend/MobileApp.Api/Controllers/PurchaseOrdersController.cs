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

    // ─────────────────────────────────────────────────────────────────────────
    // GET api/purchaseorders
    // Her rol yalnızca kendi ilgili siparişlerini görür
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companyId = GetCompanyId();
        var role      = GetUserRole();
        var userId    = GetUserId();

        var query = _db.PurchaseOrders
            .Include(p => p.WorkOrder).ThenInclude(w => w.FaultReport)
            .Include(p => p.RequestedByUser)
            .Include(p => p.AssignedToUser)
            .Include(p => p.Material)
            .Where(p => p.RequestedByUser.CompanyId == companyId);

        // Muhasebe / Satın Alma: Yönetici onayını bekleyenler + kendi işledikleri
        if (role == nameof(UserRole.Purchasing))
        {
            query = query.Where(p =>
                p.Status == PurchaseOrderStatus.ApprovedByAdmin   ||
                p.Status == PurchaseOrderStatus.Ordered           ||
                p.Status == PurchaseOrderStatus.RejectedByPurchasing);
        }
        // Depo Sorumlusu: Sipariş verilenler (teslimat bekliyor) + tamamlananlar
        else if (role == nameof(UserRole.WarehouseKeeper))
        {
            query = query.Where(p =>
                p.Status == PurchaseOrderStatus.Ordered    ||
                p.Status == PurchaseOrderStatus.Completed);
        }
        // Teknisyen: sadece kendi talepleri (tüm statüler)
        else if (role == nameof(UserRole.Technician))
        {
            query = query.Where(p => p.RequestedByUserId == userId);
        }
        // Admin: şirketin tüm siparişleri — filtre yok

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

    // ─────────────────────────────────────────────────────────────────────────
    // POST api/purchaseorders
    // Teknisyen veya Depo Sorumlusu parça talebi oluşturur
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Admin,Technician,WarehouseKeeper")]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderDto dto)
    {
        var companyId = GetCompanyId();
        var userId    = GetUserId();

        var workOrder = await _db.WorkOrders.Include(w => w.FaultReport)
            .FirstOrDefaultAsync(w => w.Id == dto.WorkOrderId && w.FaultReport.CompanyId == companyId);

        if (workOrder is null) return NotFound("İş emri bulunamadı.");

        if (!dto.MaterialId.HasValue && string.IsNullOrWhiteSpace(dto.ManualMaterialName))
            return BadRequest("Lütfen bir malzeme seçin veya manuel isim girin.");

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

        workOrder.Status = WorkOrderStatus.WaitingForPart;
        workOrder.FaultReport.Status = FaultStatus.WaitingForPart;

        await _db.SaveChangesAsync();
        await _db.Entry(order).Reference(x => x.RequestedByUser).LoadAsync();

        // Todo: Yöneticiye "Yeni Satın Alma Onayı Bekliyor" bildirimi gönder

        return CreatedAtAction(nameof(GetAll), new { id = order.Id }, new { order.Id });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT api/purchaseorders/{id}/review
    // Yönetici (Admin) talebi onaylar veya reddeder
    // Onayladığında: ApprovedByAdmin → Muhasebe'nin görüntüleyebileceği statü
    // ─────────────────────────────────────────────────────────────────────────
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

        order.Status          = dto.IsApproved ? PurchaseOrderStatus.ApprovedByAdmin : PurchaseOrderStatus.RejectedByAdmin;
        order.AdminReviewedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        if (dto.IsApproved)
        {
            // Todo: Muhasebe / Satın Alma departmanına bildirim
        }
        else
        {
            // Todo: Talep eden Teknisyene red bildirimi
        }

        return NoContent();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT api/purchaseorders/{id}/purchasing-review
    // Muhasebe / Satın Alma: Sipariş ver (Ordered) veya Reddet (RejectedByPurchasing)
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPut("{id:int}/purchasing-review")]
    [Authorize(Roles = "Admin,Purchasing")]
    public async Task<IActionResult> PurchasingReview(int id, [FromBody] PurchasingReviewDto dto)
    {
        var companyId = GetCompanyId();
        var order = await _db.PurchaseOrders
            .Include(p => p.RequestedByUser)
            .FirstOrDefaultAsync(p => p.Id == id && p.RequestedByUser.CompanyId == companyId);

        if (order is null) return NotFound();
        if (order.Status != PurchaseOrderStatus.ApprovedByAdmin)
            return BadRequest("Sadece yönetici onaylı talepler işlenebilir.");

        if (dto.IsApproved)
        {
            // Sipariş verildi — Depo Sorumlusu'nun "Bekleyen" sekmesinde görünecek
            order.Status = PurchaseOrderStatus.Ordered;
        }
        else
        {
            order.Status = PurchaseOrderStatus.RejectedByPurchasing;
        }

        if (!string.IsNullOrEmpty(dto.Note))
            order.Note = ((order.Note ?? "") + "\n[Muhasebe Notu] " + dto.Note).Trim();

        await _db.SaveChangesAsync();

        if (dto.IsApproved)
        {
            // Todo: Depo Sorumlusuna "Sipariş verildi, teslimat bekleniyor" bildirimi
        }
        else
        {
            // Todo: Talep eden Teknisyene "Muhasebe tarafından reddedildi" bildirimi
        }

        return NoContent();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT api/purchaseorders/{id}/complete
    // Depo Sorumlusu malzeme gelince "Teslim Alındı" yapar → Stok otomatik artar
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPut("{id:int}/complete")]
    [Authorize(Roles = "Admin,WarehouseKeeper")]
    public async Task<IActionResult> Complete(int id, [FromBody] CompletePurchaseOrderDto dto)
    {
        var companyId = GetCompanyId();
        var userId    = GetUserId();

        var order = await _db.PurchaseOrders
            .Include(p => p.Material)
            .Include(p => p.WorkOrder).ThenInclude(w => w.FaultReport)
            .Include(p => p.RequestedByUser)
            .FirstOrDefaultAsync(p => p.Id == id && p.RequestedByUser.CompanyId == companyId);

        if (order is null) return NotFound();
        if (order.Status != PurchaseOrderStatus.Ordered)
            return BadRequest("Sadece sipariş edilmiş (Ordered) talepler teslim alınabilir.");

        order.Status          = PurchaseOrderStatus.Completed;
        order.CompletedAt     = DateTime.UtcNow;
        order.AssignedToUserId = userId; // Teslimi alan Depo Sorumlusu

        if (!string.IsNullOrEmpty(dto.Note))
            order.Note = ((order.Note ?? "") + "\n[Teslim Notu] " + dto.Note).Trim();

        // Stok artışı — kayıtlı bir malzeme ise
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
