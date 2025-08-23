"""remove_tags_from_portfolio_items

Revision ID: 41faf3eb84ec
Revises: b701b024df69
Create Date: 2025-07-12 11:58:49.292625

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '41faf3eb84ec'
down_revision: Union[str, None] = 'b701b024df69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
