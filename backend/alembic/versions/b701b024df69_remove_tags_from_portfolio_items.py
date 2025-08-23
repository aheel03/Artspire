"""remove_tags_from_portfolio_items

Revision ID: b701b024df69
Revises: dd525d53e174
Create Date: 2025-07-12 11:54:04.872093

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b701b024df69'
down_revision: Union[str, None] = 'dd525d53e174'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
