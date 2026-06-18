using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MobileApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddManualMaterialToPO : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "MaterialId",
                table: "PurchaseOrders",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "ManualMaterialName",
                table: "PurchaseOrders",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManualMaterialName",
                table: "PurchaseOrders");

            migrationBuilder.AlterColumn<int>(
                name: "MaterialId",
                table: "PurchaseOrders",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
