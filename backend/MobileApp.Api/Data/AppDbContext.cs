using Microsoft.EntityFrameworkCore;
using MobileApp.Api.Models;

namespace MobileApp.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User>          Users          => Set<User>();
    public DbSet<Company>       Companies      => Set<Company>();
    public DbSet<Sector>        Sectors        => Set<Sector>();
    public DbSet<Asset>         Assets         => Set<Asset>();
    public DbSet<FaultReport>   FaultReports   => Set<FaultReport>();
    public DbSet<WorkOrder>     WorkOrders     => Set<WorkOrder>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<Material>      Materials      => Set<Material>();
    public DbSet<MaterialUsage> MaterialUsages => Set<MaterialUsage>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Comment>       Comments       => Set<Comment>();
    public DbSet<Notification>  Notifications  => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).IsRequired().HasMaxLength(256);
            e.Property(u => u.Name).IsRequired().HasMaxLength(100);
            e.Property(u => u.Role).HasConversion<string>();
            e.HasOne(u => u.Company)
             .WithMany(c => c.Users)
             .HasForeignKey(u => u.CompanyId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Company ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Company>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Name).IsRequired().HasMaxLength(200);
            e.HasOne(c => c.Sector)
             .WithMany(s => s.Companies)
             .HasForeignKey(c => c.SectorId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Sector ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Sector>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Name).IsRequired().HasMaxLength(100);
            e.Property(s => s.Code).IsRequired().HasMaxLength(50);
        });

        // ── Asset ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<Asset>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Name).IsRequired().HasMaxLength(200);
            e.HasOne(a => a.Company)
             .WithMany(c => c.Assets)
             .HasForeignKey(a => a.CompanyId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── FaultReport ───────────────────────────────────────────────────────
        modelBuilder.Entity<FaultReport>(e =>
        {
            e.HasKey(f => f.Id);
            e.Property(f => f.Title).IsRequired().HasMaxLength(300);
            e.Property(f => f.Priority).HasConversion<string>();
            e.Property(f => f.Status).HasConversion<string>();
            e.HasOne(f => f.ReportedByUser)
             .WithMany()
             .HasForeignKey(f => f.ReportedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(f => f.Asset)
             .WithMany(a => a.FaultReports)
             .HasForeignKey(f => f.AssetId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(f => f.Company)
             .WithMany()
             .HasForeignKey(f => f.CompanyId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── WorkOrder ─────────────────────────────────────────────────────────
        modelBuilder.Entity<WorkOrder>(e =>
        {
            e.HasKey(w => w.Id);
            e.Property(w => w.Status).HasConversion<string>();
            e.HasOne(w => w.AssignedToUser)
             .WithMany()
             .HasForeignKey(w => w.AssignedToUserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(w => w.FaultReport)
             .WithMany(f => f.WorkOrders)
             .HasForeignKey(w => w.FaultReportId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── PurchaseOrder ─────────────────────────────────────────────────────
        modelBuilder.Entity<PurchaseOrder>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Status).HasConversion<string>();
            e.HasOne(p => p.RequestedByUser)
             .WithMany()
             .HasForeignKey(p => p.RequestedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.AssignedToUser)
             .WithMany()
             .HasForeignKey(p => p.AssignedToUserId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.Material)
             .WithMany(m => m.PurchaseOrders)
             .HasForeignKey(p => p.MaterialId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.WorkOrder)
             .WithMany(w => w.PurchaseOrders)
             .HasForeignKey(p => p.WorkOrderId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Material ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Material>(e =>
        {
            e.HasKey(m => m.Id);
            e.Property(m => m.Name).IsRequired().HasMaxLength(200);
            e.Property(m => m.Type).HasConversion<string>();
            e.HasOne(m => m.Company)
             .WithMany(c => c.Materials)
             .HasForeignKey(m => m.CompanyId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── MaterialUsage ─────────────────────────────────────────────────────
        modelBuilder.Entity<MaterialUsage>(e =>
        {
            e.HasKey(mu => mu.Id);
            e.HasOne(mu => mu.UsedByUser)
             .WithMany()
             .HasForeignKey(mu => mu.UsedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(mu => mu.Material)
             .WithMany(m => m.MaterialUsages)
             .HasForeignKey(mu => mu.MaterialId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(mu => mu.WorkOrder)
             .WithMany(w => w.MaterialUsages)
             .HasForeignKey(mu => mu.WorkOrderId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── StockMovement ─────────────────────────────────────────────────────
        modelBuilder.Entity<StockMovement>(e =>
        {
            e.HasKey(sm => sm.Id);
            e.Property(sm => sm.Type).HasConversion<string>();
            e.HasOne(sm => sm.CreatedByUser)
             .WithMany()
             .HasForeignKey(sm => sm.CreatedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(sm => sm.Material)
             .WithMany(m => m.StockMovements)
             .HasForeignKey(sm => sm.MaterialId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Comment ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Comment>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasOne(c => c.Author)
             .WithMany()
             .HasForeignKey(c => c.AuthorId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.FaultReport)
             .WithMany(f => f.Comments)
             .HasForeignKey(c => c.FaultReportId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.WorkOrder)
             .WithMany(w => w.Comments)
             .HasForeignKey(c => c.WorkOrderId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Notification ──────────────────────────────────────────────────────
        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.Id);
            e.Property(n => n.Type).HasConversion<string>();
            e.HasOne(n => n.User)
             .WithMany()
             .HasForeignKey(n => n.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Seed: Sectors ─────────────────────────────────────────────────────
        modelBuilder.Entity<Sector>().HasData(
            new Sector { Id = 1,  Name = "Üretim / Fabrika",      Code = "MANUFACTURING" },
            new Sector { Id = 2,  Name = "Lojistik / Depo",       Code = "LOGISTICS" },
            new Sector { Id = 3,  Name = "Eğitim",                Code = "EDUCATION" },
            new Sector { Id = 4,  Name = "Sağlık",                Code = "HEALTHCARE" },
            new Sector { Id = 5,  Name = "Konaklama",             Code = "HOSPITALITY" },
            new Sector { Id = 6,  Name = "Perakende",             Code = "RETAIL" },
            new Sector { Id = 7,  Name = "Ofis / Kurumsal",       Code = "OFFICE" },
            new Sector { Id = 8,  Name = "İnşaat",                Code = "CONSTRUCTION" },
            new Sector { Id = 9,  Name = "Enerji",                Code = "ENERGY" },
            new Sector { Id = 10, Name = "Diğer",                 Code = "OTHER", IsCustom = true }
        );
    }
}
