"""convert_follows_to_weak_entity

Revision ID: 4f0008f09a74
Revises: b4db95927628
Create Date: 2025-07-12 13:06:34.599348

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f0008f09a74'
down_revision: Union[str, None] = 'b4db95927628'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
