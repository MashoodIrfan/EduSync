from django.db import migrations

# Tables with their own tenant_id column: policy compares it directly
# against the session's current tenant.
DIRECT_TENANT_TABLES = [
    "accounts_user",
    "tenants_tenant",  # matched on its own `id`, see below
    "academics_class",
    "academics_subject",
    "academics_student",
    "academics_teacherassignment",
    "attendance_attendancerecord",
    "payments_feeinvoice",
    "payments_paymenttransaction",
]

TENANT_CONDITION = (
    "current_setting('app.bypass_rls', true) = 'true' "
    "OR {column} = NULLIF(current_setting('app.current_tenant_id', true), '')::int"
)


def enable_rls_sql(table, column="tenant_id"):
    condition = TENANT_CONDITION.format(column=column)

    return "\n".join(
        [
            f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;",
            f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;",
            f"CREATE POLICY tenant_isolation ON {table}",
            f"    USING ({condition})",
            f"    WITH CHECK ({condition});",
        ]
    )


def disable_rls_sql(table):
    return "\n".join(
        [
            f"DROP POLICY IF EXISTS tenant_isolation ON {table};",
            f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY;",
            f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;",
        ]
    )


# accounts_parentprofile and attendance_attendanceremark have no
# tenant_id column of their own; their tenant is derived through a
# foreign key, so their policies use a subquery instead of a direct
# column comparison.
SUBQUERY_TABLES = {
    "accounts_parentprofile": (
        "student_id IN ("
        "SELECT id FROM academics_student WHERE tenant_id = "
        "NULLIF(current_setting('app.current_tenant_id', true), '')::int"
        ")"
    ),
    "attendance_attendanceremark": (
        "attendance_record_id IN ("
        "SELECT id FROM attendance_attendancerecord WHERE tenant_id = "
        "NULLIF(current_setting('app.current_tenant_id', true), '')::int"
        ")"
    ),
}


def enable_rls_subquery_sql(table, subquery_condition):
    condition = f"current_setting('app.bypass_rls', true) = 'true' OR {subquery_condition}"

    return "\n".join(
        [
            f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;",
            f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;",
            f"CREATE POLICY tenant_isolation ON {table}",
            f"    USING ({condition})",
            f"    WITH CHECK ({condition});",
        ]
    )


def build_forward_sql():
    statements = []

    for table in DIRECT_TENANT_TABLES:
        column = "id" if table == "tenants_tenant" else "tenant_id"
        statements.append(enable_rls_sql(table, column))

    for table, condition in SUBQUERY_TABLES.items():
        statements.append(enable_rls_subquery_sql(table, condition))

    return "\n".join(statements)


def build_reverse_sql():
    statements = [disable_rls_sql(table) for table in DIRECT_TENANT_TABLES]
    statements += [disable_rls_sql(table) for table in SUBQUERY_TABLES]

    return "\n".join(statements)


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0001_initial"),
        ("accounts", "0003_parentprofile"),
        ("academics", "0004_delete_parentstudent"),
        ("attendance", "0001_initial"),
        ("payments", "0004_paymenttransaction_authorization_code_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql=build_forward_sql(),
            reverse_sql=build_reverse_sql(),
        ),
    ]
