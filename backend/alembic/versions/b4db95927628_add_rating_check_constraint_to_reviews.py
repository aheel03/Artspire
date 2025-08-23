"""add_rating_check_constraint_to_reviews

Revision ID: b4db95927628
Revises: c6f3be8cd26f
Create Date: 2025-07-12 12:26:05.790568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4db95927628'
down_revision: Union[str, None] = 'c6f3be8cd26f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
