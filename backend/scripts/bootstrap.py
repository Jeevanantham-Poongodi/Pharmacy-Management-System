"""One-off administration commands run by an operator with DATABASE_URL (not from the browser).

Self-registration is not allowed (FR-002), so the first administrator is set up here. Create the
person's sign-in account first in the Supabase dashboard (Authentication -> Users -> Add user).

    python scripts/bootstrap.py hospital --name "City Hospital"
    python scripts/bootstrap.py member --hospital-id 1 --email admin@example.org \
        --display-name "Admin" --role admin
    python scripts/bootstrap.py grant --hospital-id 1 --role pharmacist --permission items.read

Roles come from the actors in the flow diagram plus an administrator (FR-004). Only `admin` gets
permissions automatically; every other role's permissions are configuration (OI-6).
"""

import argparse
import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings  # noqa: E402

ROLES = [
    ("store", "Store staff", False),
    ("drug_committee", "Drug committee", True),
    ("hod", "Head of department", True),
    ("finance", "Finance", True),
    ("ward", "Ward / OT / ICU staff", False),
    ("pharmacist", "Pharmacist", True),
    ("prescriber", "Doctor / prescriber", False),
    ("nurse", "Nurse", False),
    ("qc", "Quality control", False),
    ("audit", "Audit", True),
    ("admin", "Administrator", True),
]


def create_hospital(conn: psycopg.Connection, name: str) -> None:
    with conn.transaction():
        hospital_id = conn.execute(
            "insert into public.hospitals (name) values (%s) returning id", (name,)
        ).fetchone()[0]
        for code, role_name, privileged in ROLES:
            conn.execute(
                "insert into public.roles (hospital_id, code, name, privileged)"
                " values (%s, %s, %s, %s)",
                (hospital_id, code, role_name, privileged),
            )
        conn.execute(
            "insert into public.role_permissions (hospital_id, role_code, permission_code)"
            " select %s, 'admin', code from public.permissions",
            (hospital_id,),
        )
    print(f"hospital {hospital_id} created with {len(ROLES)} roles")


def add_member(
    conn: psycopg.Connection, hospital_id: int, email: str, display_name: str, role: str
) -> None:
    with conn.transaction():
        row = conn.execute(
            "select id from auth.users where lower(email) = lower(%s)", (email,)
        ).fetchone()
        if row is None:
            raise SystemExit(f"no sign-in account for {email}; create it in Supabase first")
        conn.execute(
            "insert into public.hospital_members (hospital_id, user_id, display_name)"
            " values (%s, %s, %s) on conflict (hospital_id, user_id) do update"
            " set display_name = excluded.display_name, active = true",
            (hospital_id, row[0], display_name),
        )
        conn.execute(
            "insert into public.user_roles (hospital_id, user_id, role_code)"
            " values (%s, %s, %s) on conflict do nothing",
            (hospital_id, row[0], role),
        )
    print(f"{email} is a member of hospital {hospital_id} with role {role}")


def grant(conn: psycopg.Connection, hospital_id: int, role: str, permission: str) -> None:
    with conn.transaction():
        conn.execute(
            "insert into public.role_permissions (hospital_id, role_code, permission_code)"
            " values (%s, %s, %s) on conflict do nothing",
            (hospital_id, role, permission),
        )
    print(f"role {role} in hospital {hospital_id} has {permission}")


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("hospital")
    p.add_argument("--name", required=True)
    p = sub.add_parser("member")
    p.add_argument("--hospital-id", type=int, required=True)
    p.add_argument("--email", required=True)
    p.add_argument("--display-name", required=True)
    p.add_argument("--role", required=True, choices=[r[0] for r in ROLES])
    p = sub.add_parser("grant")
    p.add_argument("--hospital-id", type=int, required=True)
    p.add_argument("--role", required=True, choices=[r[0] for r in ROLES])
    p.add_argument("--permission", required=True)
    args = parser.parse_args()

    settings = get_settings()
    if not settings.database_url:
        print("DATABASE_URL is not set in backend/.env", file=sys.stderr)
        return 1
    with psycopg.connect(settings.database_url) as conn:
        if args.cmd == "hospital":
            create_hospital(conn, args.name)
        elif args.cmd == "member":
            add_member(conn, args.hospital_id, args.email, args.display_name, args.role)
        else:
            grant(conn, args.hospital_id, args.role, args.permission)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
