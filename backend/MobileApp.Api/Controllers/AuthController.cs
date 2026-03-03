using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Net;
using System.Net.Mail;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MobileApp.Api.Data;
using MobileApp.Api.DTOs;
using MobileApp.Api.Models;

namespace MobileApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, IConfiguration config)
    {
        _db     = db;
        _config = config;
    }

    // POST api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
            return Conflict(new { message = "Bu e-posta adresi zaten kayıtlı." });

        int companyId;

        if (!string.IsNullOrEmpty(dto.CompanyCode))
        {
            // Mevcut şirket koduna göre katılma
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.CompanyCode == dto.CompanyCode.ToUpper());
            if (company == null)
                return BadRequest(new { message = "Girdiğiniz şirket kodu sistemde bulunamadı." });
            
            companyId = company.Id;
        }
        else
        {
            // Yeni şirket açma (Yalnızca Admin için veya şirket kodu girmeyenler için varsayılan)
            if (!dto.SectorId.HasValue)
                return BadRequest(new { message = "Yeni şirket için sektör seçimi zorunludur." });

            var sector = await _db.Sectors.FindAsync(dto.SectorId.Value);
            if (sector is null)
                return BadRequest(new { message = "Geçersiz sektör." });

            // Admin ilk başta sadece e-posta/şifre ile kayıt olur, şirket adını dashboard'da girer.
            var company = new Company
            {
                Name     = dto.CompanyName?.Trim() ?? "Yeni Şirket (Kurulum Bekliyor)",
                SectorId = dto.SectorId.Value,
                IsApproved = false
            };
            _db.Companies.Add(company);
            await _db.SaveChangesAsync();
            companyId = company.Id;
        }

        // Kullanıcıyı oluştur
        var user = new User
        {
            Name         = dto.Name.Trim(),
            Email        = dto.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Phone        = dto.Phone.Trim(),
            Role         = dto.Role,
            CompanyId    = companyId
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Kayıt başarılı." });
    }

    // POST api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _db.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Email == dto.Email.Trim().ToLower());

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "E-posta veya şifre hatalı." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Hesabınız devre dışı. Yöneticinizle iletişime geçin." });

        var token = GenerateToken(user);
        return Ok(new AuthResponseDto(
            token,
            user.Id,
            user.Name,
            user.Email,
            user.Role.ToString(),
            user.CompanyId,
            user.Company?.Name ?? string.Empty,
            user.Company?.CompanyCode,
            user.Company?.IsApproved ?? false
        ));
    }

    // POST api/auth/forgot-password
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.Trim().ToLower());
        if (user is null)
        {
            return Ok(new { message = "Eğer e-posta adresi sistemde kayıtlıysa, şifre sıfırlama kodu gönderildi." });
        }

        var rnd = new Random();
        var code = rnd.Next(100000, 999999).ToString();

        user.ResetPasswordCode = code;
        user.ResetPasswordCodeExpiry = DateTime.UtcNow.AddMinutes(15);
        await _db.SaveChangesAsync();

        try
        {
            await SendEmailAsync(user.Email, code);
            return Ok(new { message = "Şifre sıfırlama kodunuz e-posta adresinize gönderildi." });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"E-Posta gönderim hatası: {ex.Message}");
            return StatusCode(500, new { message = "E-posta gönderilirken bir hata oluştu." });
        }
    }

    // POST api/auth/reset-password
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.Trim().ToLower());
        
        if (user is null || user.ResetPasswordCode != dto.Code)
        {
            return BadRequest(new { message = "Geçersiz e-posta veya sıfırlama kodu." });
        }

        if (user.ResetPasswordCodeExpiry < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Sıfırlama kodunun süresi dolmuş." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.ResetPasswordCode = null;
        user.ResetPasswordCodeExpiry = null;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Şifreniz başarıyla güncellendi." });
    }

    // PUT api/auth/fcm-token
    [HttpPut("fcm-token")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> UpdateFcmToken([FromBody] UpdateFcmTokenDto dto)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        if (userIdClaim == null) return Unauthorized();
        var userId = int.Parse(userIdClaim);
        var user   = await _db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        user.FcmToken = dto.FcmToken;
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    
    private async Task SendEmailAsync(string toEmail, string code)
    {
        var smtpConfig = _config.GetSection("SmtpSettings");
        
        string host = smtpConfig["Host"]!;
        int port = int.Parse(smtpConfig["Port"]!);
        string username = smtpConfig["Username"]!;
        string password = smtpConfig["Password"]!;
        string senderName = smtpConfig["SenderName"]!;
        string senderEmail = smtpConfig["SenderEmail"]!;
        bool enableSsl = bool.Parse(smtpConfig["EnableSsl"] ?? "true");

        using var client = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(username, password),
            EnableSsl = enableSsl
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress(senderEmail, senderName),
            Subject = "MobileApp - Şifre Sıfırlama Kodunuz",
            Body = $"<h2>Şifre Sıfırlama</h2><p>Kodunuz: <b>{code}</b></p>",
            IsBodyHtml = true
        };
        mailMessage.To.Add(toEmail);

        await client.SendMailAsync(mailMessage);
    }

    private string GenerateToken(User user)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("sub",                         user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("role",                        user.Role.ToString()),
            new Claim("companyId",                   user.CompanyId?.ToString() ?? ""),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
        };

        var expires = DateTime.UtcNow.AddMinutes(
            _config.GetValue<int>("Jwt:ExpiresInMinutes"));

        var token = new JwtSecurityToken(
            issuer:             _config["Jwt:Issuer"],
            audience:           _config["Jwt:Audience"],
            claims:             claims,
            expires:            expires,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
