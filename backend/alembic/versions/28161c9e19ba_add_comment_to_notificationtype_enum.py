"""Add comment to NotificationType enum

Revision ID: 28161c9e19ba
Revises: ef0607591efd
Create Date: 2025-07-11 20:35:40.576444

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '28161c9e19ba'
down_revision: Union[str, None] = 'ef0607591efd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add 'comment' to the NotificationType enum
    op.execute("ALTER TYPE notificationtype ADD VALUE 'comment'")


def downgrade() -> None:
    """Downgrade schema."""
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type and all dependent objects
    pass
