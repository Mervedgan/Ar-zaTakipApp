using Npgsql;
using System;

var connStr = "Host=dpg-d6ledgfpm1nc739bnddg-a.frankfurt-postgres.render.com;Port=5432;Database=arizatakip_ihlo;Username=arizatakip_ihlo_user;Password=mto7c2MmWL8XhAvZNCupBNYO2NpDJiTu;SSL Mode=Require;Trust Server Certificate=true";

await using var conn = new NpgsqlConnection(connStr);
await conn.OpenAsync();

Console.WriteLine($"\n{"ID",-5} {"Ad Soyad",-25} {"E-posta",-35} {"Rol",-15} {"Aktif",-7}");
Console.WriteLine(new string('-', 92));

await using var cmd = new NpgsqlCommand("SELECT \"Id\", \"Name\", \"Email\", \"Role\", \"IsActive\" FROM \"Users\" ORDER BY \"Id\"", conn);
await using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader["Id"],-5} {reader["Name"],-25} {reader["Email"],-35} {reader["Role"],-15} {reader["IsActive"],-7}");
}

Console.WriteLine("\n[NOT: Şifreler güvenli hash ile saklanmaktadır, doğrudan görüntülenemez.]");
Console.WriteLine("[Herhangi bir kullanıcının şifresini sıfırlamak ister misiniz? Bana söyleyin.]");
