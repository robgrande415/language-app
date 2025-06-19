"""add course chapter tables and module description

Revision ID: 2b5d173a6dda
Revises: 08e1c1f201a9
Create Date: 2025-06-19
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '2b5d173a6dda'
down_revision: Union[str, None] = '08e1c1f201a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'course',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('language', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
    )
    op.create_table(
        'chapter',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('course.id'), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
    )
    op.add_column('module', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('module', sa.Column('chapter_id', sa.Integer(), sa.ForeignKey('chapter.id')))


def downgrade() -> None:
    op.drop_column('module', 'chapter_id')
    op.drop_column('module', 'description')
    op.drop_table('chapter')
    op.drop_table('course')
