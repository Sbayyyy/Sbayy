using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace SBay.Domain.Database.Migrations;

[DbContext(typeof(EfDbContext))]
[Migration("20260624093000_MakeUserExternalIdNullable")]
public partial class MakeUserExternalIdNullable : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE IF EXISTS users
                ALTER COLUMN external_id DROP NOT NULL,
                ALTER COLUMN external_id TYPE character varying(128);

            ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_external_id_key;
            DROP INDEX IF EXISTS ux_users_external_id;
            DROP INDEX IF EXISTS ix_users_external_id;

            CREATE UNIQUE INDEX ix_users_external_id
                ON users (external_id)
                WHERE external_id IS NOT NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP INDEX IF EXISTS ix_users_external_id;

            ALTER TABLE IF EXISTS users
                ALTER COLUMN external_id SET NOT NULL,
                ALTER COLUMN external_id TYPE character varying(128);

            CREATE UNIQUE INDEX ix_users_external_id
                ON users (external_id);
            """);
    }
}
