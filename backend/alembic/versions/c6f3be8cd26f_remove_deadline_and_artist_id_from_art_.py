"""remove_deadline_and_artist_id_from_art_requests

Revision ID: c6f3be8cd26f
Revises: 98c484eb19e1
Create Date: 2025-07-12 12:22:04.258252

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6f3be8cd26f'
down_revision: Union[str, None] = '98c484eb19e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
