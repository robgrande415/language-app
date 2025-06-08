#!/bin/bash
# Simple setup script to create a local PostgreSQL database
# Usage: ./setup_db.sh

set -e

DB_NAME="language_app"

# Create database
psql -v ON_ERROR_STOP=1 <<EOSQL
CREATE DATABASE $DB_NAME;
EOSQL

# Update DATABASE_URL in .env
cat > .env <<EOT
DATABASE_URL=postgresql://localhost/$DB_NAME
OPENAI_API_KEY=
EOT

echo "Database $DB_NAME created. Update OPENAI_API_KEY in backend/.env"
