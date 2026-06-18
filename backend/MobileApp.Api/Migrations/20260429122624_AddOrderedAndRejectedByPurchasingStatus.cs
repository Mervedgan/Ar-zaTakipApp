using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MobileApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderedAndRejectedByPurchasingStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_WorkOrders_WorkOrderId",
                table: "PurchaseOrders");

            migrationBuilder.AlterColumn<int>(
                name: "WorkOrderId",
                table: "PurchaseOrders",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_WorkOrders_WorkOrderId",
                table: "PurchaseOrders",
                column: "WorkOrderId",
                principalTable: "WorkOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_WorkOrders_WorkOrderId",
                table: "PurchaseOrders");

            migrationBuilder.AlterColumn<int>(
                name: "WorkOrderId",
                table: "PurchaseOrders",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_WorkOrders_WorkOrderId",
                table: "PurchaseOrders",
                column: "WorkOrderId",
                principalTable: "WorkOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
