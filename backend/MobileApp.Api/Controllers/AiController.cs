using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MobileApp.Api.DTOs;
using MobileApp.Api.Services;

namespace MobileApp.Api.Controllers;

/// <summary>
/// AI destekli özellikler için merkezi controller:
///   POST /api/ai/suggest-priority    → Açıklamadan öncelik öner (Özellik 1)
///   POST /api/ai/chat                → Dashboard sohbet asistanı (Özellik 2-B)
///   POST /api/ai/improve-description → Açıklama iyileştirici (Özellik 2-C)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AiController : ControllerBase
{
    private readonly PriorityAnalyzerService   _priorityAnalyzer;
    private readonly DescriptionEnhancerService _enhancer;
    private readonly DashboardChatService      _chatService;

    public AiController(
        PriorityAnalyzerService   priorityAnalyzer,
        DescriptionEnhancerService enhancer,
        DashboardChatService      chatService)
    {
        _priorityAnalyzer = priorityAnalyzer;
        _enhancer          = enhancer;
        _chatService       = chatService;
    }

    private string? GetClaim(string type)
        => User.Claims.FirstOrDefault(c => c.Type == type)?.Value;

    private int GetCompanyId()
        => int.TryParse(GetClaim("companyId"), out var id) ? id : 0;

    // ── POST /api/ai/suggest-priority ────────────────────────────────────────
    /// <summary>
    /// Arıza başlığı ve açıklamasından Türkçe anahtar kelime analizi ile
    /// öncelik önerisi döner. Kullanıcı override edebilir.
    /// </summary>
    [HttpPost("suggest-priority")]
    public async Task<IActionResult> SuggestPriority([FromBody] PrioritySuggestionRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) && string.IsNullOrWhiteSpace(dto.Description))
            return BadRequest(new { message = "Başlık veya açıklama gerekli." });

        var (priority, reason) = await _priorityAnalyzer.AnalyzeAsync(dto.Title, dto.Description);

        return Ok(new PrioritySuggestionDto(priority.ToString(), reason));
    }

    // ── POST /api/ai/chat ─────────────────────────────────────────────────────
    /// <summary>
    /// Yönetici dashboard chat asistanı.
    /// Doğal dil Türkçe sorularını DB sorgusu ile yanıtlar.
    /// </summary>
    [HttpPost("chat")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Chat([FromBody] ChatRequestDto dto)
    {
        var companyId = GetCompanyId();
        if (companyId == 0)
            return BadRequest(new { message = "Şirket kimliği bulunamadı." });

        if (string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { message = "Mesaj boş olamaz." });

        var reply = await _chatService.ProcessAsync(dto.Message.Trim(), companyId);

        return Ok(new ChatResponseDto(reply));
    }

    // ── POST /api/ai/improve-description ─────────────────────────────────────
    /// <summary>
    /// Kısa ve hatalı arıza açıklamasını profesyonel arıza raporu diline dönüştürür.
    /// </summary>
    [HttpPost("improve-description")]
    public async Task<IActionResult> ImproveDescription([FromBody] ImproveDescriptionRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text))
            return BadRequest(new { message = "Metin boş olamaz." });

        var improved = await _enhancer.EnhanceAsync(dto.Text.Trim());

        return Ok(new ImproveDescriptionResponseDto(improved));
    }
}
