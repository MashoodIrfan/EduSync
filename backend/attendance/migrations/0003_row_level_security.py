from django.db import migrations

TENANT_CONDITION = (
    "current_setting('app.bypass_rls', true) = 'true' "
    "OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::int"
)

FORWARD_SQL = "\n".join(
    [
        "ALTER TABLE attendance_attendancestatuschange ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE attendance_attendancestatuschange FORCE ROW LEVEL SECURITY;",
        "CREATE POLICY tenant_isolation ON attendance_attendancestatuschange",
        f"    USING ({TENANT_CONDITION})",
        f"    WITH CHECK ({TENANT_CONDITION});",
    ]
)

REVERSE_SQL = "\n".join(
    [
        "DROP POLICY IF EXISTS tenant_isolation ON attendance_attendancestatuschange;",
        "ALTER TABLE attendance_attendancestatuschange NO FORCE ROW LEVEL SECURITY;",
        "ALTER TABLE attendance_attendancestatuschange DISABLE ROW LEVEL SECURITY;",
    ]
)


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0002_attendancestatuschange"),
    ]

    operations = [
        migrations.RunSQL(sql=FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
