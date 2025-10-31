FROM postgres:16

ENV POSTGRES_DB=mydb
ENV POSTGRES_USER=myuser
ENV POSTGRES_PASSWORD=1234
# Tip: move secrets to Compose/.env in real setups.

# Ensure execution order via file names
COPY 01_schema.sql     /docker-entrypoint-initdb.d/01_schema.sql
COPY 02_demo.sql  /docker-entrypoint-initdb.d/02_demo.sql
