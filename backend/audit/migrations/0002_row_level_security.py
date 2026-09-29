from django.db import migrations

TENANT_CONDITION = (
    "current_setting('app.bypass_rls', true) = 'true' "
    "OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::int"
)

FORWARD_SQL = "\n".join(
    [
        "ALTER TABLE audit_auditlog ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE audit_auditlog FORCE ROW LEVEL SECURITY;",
        "CREATE POLICY tenant_isolation ON audit_auditlog",
        f"    USING ({TENANT_CONDITION})",
        f"    WITH CHECK ({TENANT_CONDITION});",
    ]
)

REVERSE_SQL = "\n".join(
    [
        "DROP POLICY IF EXISTS tenant_isolation ON audit_auditlog;",
        "ALTER TABLE audit_auditlog NO FORCE ROW LEVEL SECURITY;",
        "ALTER TABLE audit_auditlog DISABLE ROW LEVEL SECURITY;",
    ]
)


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(sql=FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
