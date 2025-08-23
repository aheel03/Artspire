"""remove_parent_id_from_comments

Revision ID: 98c484eb19e1
Revises: 41faf3eb84ec
Create Date: 2025-07-12 12:14:02.074105

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98c484eb19e1'
down_revision: Union[str, None] = '41faf3eb84ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
