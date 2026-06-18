using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MobileApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class SmartFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAutoAssigned",
                table: "WorkOrders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CriticalAlertSent",
                table: "FaultReports",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PrioritySource",
                table: "FaultReports",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAutoAssigned",
                table: "WorkOrders");

            migrationBuilder.DropColumn(
                name: "CriticalAlertSent",
                table: "FaultReports");

            migrationBuilder.DropColumn(
                name: "PrioritySource",
                table: "FaultReports");
        }
    }
}
