#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
	echo "DATABASE_URL is required"
	exit 1
fi

pg_dump "$DATABASE_URL" \
	--clean \
	--if-exists \
	--no-owner \
	--no-privileges \
	-f supabase_dump.sql
