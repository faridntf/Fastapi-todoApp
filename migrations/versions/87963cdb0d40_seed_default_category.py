"""seed default category

Revision ID: 87963cdb0d40
Revises: f6953fa47465
Create Date: 2026-10-10 13:42:37.486120

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87963cdb0d40'
down_revision: Union[str, Sequence[str], None] = 'f6953fa47465'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    categories = sa.table(
        "tblCategory",
        sa.column("name", sa.String(100)),
        sa.column("is_system", sa.Boolean),
    )

    op.bulk_insert(
        categories,
        [
            {"name": "بدون دسته بندی", "is_system": True},
            {"name": "کاری", "is_system": True},
            {"name": "برنامه نویسی", "is_system": True},
            {"name": "کلاس آموزش", "is_system": True},
            {"name": "ورزش", "is_system": True},
        ]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        sa.text("""
        DELETE
        FROM "tblCategory"
        WHERE name IN (
            'بدون دسته بندی',
            'کاری',
            'برنامه نویسی',
            'کلاس آموزش',
            'ورزش' 
            )
          AND is_system = TRUE
                """)
    )
