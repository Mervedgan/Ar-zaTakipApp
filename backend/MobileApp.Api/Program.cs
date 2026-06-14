using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MobileApp.Api.Data;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using dotenv.net;
using MobileApp.Api.Models;
using MobileApp.Api.Services;

DotEnv.Load();

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);

// ── Database ─────────────────────────────────────────────────────────────────
var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING") 
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// ── Authentication / JWT ─────────────────────────────────────────────────────
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // Disable claim mapping to keep 'sub', 'role', etc. as is
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType            = "sub",
            RoleClaimType            = "role"
        };
    });

builder.Services.AddAuthorization();


// ── Controllers & Swagger ─────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MobileApp API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Example: \"Bearer {token}\"",
        Name        = "Authorization",
        In          = ParameterLocation.Header,
        Type        = SecuritySchemeType.ApiKey,
        Scheme      = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// ── AI & Akıllı Özellik Servisleri ───────────────────────────────────────────
builder.Services.AddSingleton<PriorityAnalyzerService>();
builder.Services.AddSingleton<DescriptionEnhancerService>();
builder.Services.AddScoped<DashboardChatService>();
builder.Services.AddScoped<AutoAssignmentService>();
builder.Services.AddHostedService<BackgroundJobService>();

var app = builder.Build();

// ── Middleware Pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ── Auto-migrate on startup ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // ── Seed Data ─────────────────────────────────────────────────────────────
    if (!db.Sectors.Any())
    {
        db.Sectors.AddRange(
            new Sector { Name = "Üretim / Fabrika", Code = "MANUFACTURING" },
            new Sector { Name = "Enerji", Code = "ENERGY" },
            new Sector { Name = "Teknoloji", Code = "TECHNOLOGY" }
        );
        db.SaveChanges();
    }

    if (!db.Companies.Any())
    {
        var sector = db.Sectors.First();
        db.Companies.Add(new Company
        {
            Name = "Enerclever Test Şirketi",
            SectorId = sector.Id,
            CompanyCode = "TEST",
            IsApproved = true
        });
        db.SaveChanges();
    }

    if (!db.Users.Any())
    {
        var company = db.Companies.First();
        db.Users.Add(new User
        {
            Name = "Admin",
            Email = "admin@mobileapp.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin1234!"),
            Role = UserRole.Admin,
            CompanyId = company.Id,
            IsActive = true
        });
        db.SaveChanges();
    }
}

app.Run();
