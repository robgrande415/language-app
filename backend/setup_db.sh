#!/bin/bash
set -e

DB_NAME="language_app"

# Check if the database already exists
if psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  echo "⚠️  Database '$DB_NAME' already exists. Skipping creation."
else
  echo "✅ Creating database '$DB_NAME'..."
  psql -d postgres -v ON_ERROR_STOP=1 <<EOSQL
CREATE DATABASE $DB_NAME;
EOSQL
fi

# Write environment variables
cat > .env <<EOT
DATABASE_URL=postgresql://localhost/$DB_NAME
OPENAI_API_KEY=
EOT

echo "✅ .env file written."
echo "⚠️  Add your OpenAI API key to backend/.env"
