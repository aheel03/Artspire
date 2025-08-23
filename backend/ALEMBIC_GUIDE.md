# Alembic Database Migration Guide

## Overview
Your application now uses Alembic for database migrations. This guide explains how to use it effectively.

## Current Status
✅ **Migration System**: Alembic is configured and working
✅ **Current Migration**: `edbb9477759d` (Initial migration)
✅ **Database**: Up to date with all your models

## Common Commands

### Check Current Migration Status
```bash
alembic current
```

### Create a New Migration
When you modify your models in `models.py`, create a new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations
```bash
# Apply all pending migrations
alembic upgrade head

# Apply to specific revision
alembic upgrade <revision_id>
```

### View Migration History
```bash
alembic history --verbose
```

### Downgrade (Rollback)
```bash
# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade <revision_id>
```

## Workflow for Database Changes

1. **Modify your models** in `models.py`
2. **Generate migration**: `alembic revision --autogenerate -m "Your description"`
3. **Review the generated migration** in `alembic/versions/`
4. **Apply the migration**: `alembic upgrade head`

## Example: Adding a New Field

1. Add field to your model:
```python
class User(Base):
    # ...existing fields...
    phone_number = Column(String(20), nullable=True)
```

2. Generate migration:
```bash
alembic revision --autogenerate -m "Add phone_number to users table"
```

3. Apply migration:
```bash
alembic upgrade head
```

## Important Notes

- **Always review** generated migrations before applying them
- **Test migrations** in development before production
- **Backup your database** before running migrations in production
- **Never edit** migration files after they've been applied

## Legacy Migration Scripts

Your old migration scripts are still available but should not be used:
- `init_db.py` - For reference only
- `migrate_db.py` - For reference only

Use Alembic commands instead of these scripts.

## Troubleshooting

### Migration Conflicts
If you have conflicts, you can:
1. Merge branches properly
2. Use `alembic merge` to create a merge revision

### Reset Migration History (Development Only)
```bash
# Drop all tables
alembic downgrade base

# Reapply all migrations
alembic upgrade head
```

## Production Deployment

For production deployments, include migration commands in your deployment script:
```bash
alembic upgrade head
```

## Files Overview

- `alembic.ini` - Configuration file
- `alembic/env.py` - Environment configuration
- `alembic/versions/` - Migration files
- `models.py` - Your SQLAlchemy models
