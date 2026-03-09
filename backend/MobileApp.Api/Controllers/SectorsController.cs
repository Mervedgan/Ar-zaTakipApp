using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Data;
using MobileApp.Api.DTOs;

namespace MobileApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SectorsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SectorsController(AppDbContext db) => _db = db;

    // GET: api/sectors
    // Kayıt ekranında kullanılmak üzere tüm sektörleri listeler (Auth gerektirmez)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var sectors = await _db.Sectors
            .OrderBy(s => s.Id)
            .Select(s => new SectorDto(s.Id, s.Name, s.Code, s.IsCustom))
            .ToListAsync();

        return Ok(sectors);
    }
}
