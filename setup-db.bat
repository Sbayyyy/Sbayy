@echo off
echo Creating Sbay Database...

REM Change these values to match your PostgreSQL installation
set PGUSER=postgres
set PGPASSWORD=postgres
set PGHOST=localhost
set PGPORT=5432

REM Create database
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -c "CREATE DATABASE sbay;"

REM Run schema
psql -U %PGUSER% -h %PGHOST% -p %PGPORT% -d sbay -f apps\api\src\db\schema.sql

echo Done!
pause
