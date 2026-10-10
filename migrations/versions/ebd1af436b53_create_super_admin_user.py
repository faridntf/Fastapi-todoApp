"""create Super admin user

Revision ID: ebd1af436b53
Revises: 87963cdb0d40
Create Date: 2026-10-10 14:11:18.522835

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'ebd1af436b53'
down_revision: Union[str, Sequence[str], None] = '87963cdb0d40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    users=sa.table(
        "tblUsers",
        sa.column("username", sa.String(50)),
        sa.column("email", sa.String(250)),
        sa.column("password", sa.String(500)),
        sa.column("phone_number", sa.String(20)),
        sa.column("role", sa.Enum(
            "SUPER_ADMIN",
            name="enuserrole",
            create_type=False
        )),
        sa.column("is_active", sa.Boolean),
        sa.column("is_verified", sa.Boolean),
        sa.column("is_delete", sa.Boolean),
        sa.column("is_profile_completed", sa.Boolean),
    )

    op.bulk_insert(
        users,
        [
            {
                "username": "Farid80",
                "email": "faridnajafi.0037@gmail.com",
                "password": (
                    "$argon2id$v=19$m=65536,t=3,p=4$"
                    "LCOb8jryUd9TbqWn3Mm+cA$"
                    "LXGf8fND8sXzMbCI78grKk6r7fu9YxZ18PsLew9v/B4"
                ),
                "phone_number": "09103381550",
                "role": "SUPER_ADMIN",
                "is_active": True,
                "is_verified": True,
                "is_delete": False,
                "is_profile_completed" : False,
            }
        ]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        sa.text("""
                DELETE
                FROM "tblUsers"
                WHERE username = 'Farid80'
                  AND role = 'SUPER_ADMIN'
                """)
    )
