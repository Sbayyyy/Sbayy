pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.prod.yml'
        BACKUP_DIR = '/var/jenkins_home/sbay-backups'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
                sh 'git rev-parse --short HEAD'
            }
        }

        stage('Prepare') {
            steps {
                sh '''
                    set -eu

                    if [ -n "${PROD_ENV_FILE:-}" ] && [ -f "$PROD_ENV_FILE" ]; then
                        echo "$PROD_ENV_FILE" > .jenkins-env-file
                    elif [ -f /var/jenkins_home/workspace/sbay-deploy/.env.production ]; then
                        echo "/var/jenkins_home/workspace/sbay-deploy/.env.production" > .jenkins-env-file
                    elif [ -f /var/jenkins_home/workspace/sbay-deploy/.env.prod ]; then
                        echo "/var/jenkins_home/workspace/sbay-deploy/.env.prod" > .jenkins-env-file
                    elif [ -f /var/sbay/.env.production ]; then
                        echo "/var/sbay/.env.production" > .jenkins-env-file
                    elif [ -f /var/sbay/.env.prod ]; then
                        echo "/var/sbay/.env.prod" > .jenkins-env-file
                    elif [ -f .env.production ]; then
                        echo ".env.production" > .jenkins-env-file
                    elif [ -f .env.prod ]; then
                        echo ".env.prod" > .jenkins-env-file
                    else
                        echo "Missing production env file."
                        echo "Checked PROD_ENV_FILE=${PROD_ENV_FILE:-unset}, /var/jenkins_home/workspace/sbay-deploy/.env.production, /var/jenkins_home/workspace/sbay-deploy/.env.prod, /var/sbay/.env.production, /var/sbay/.env.prod, .env.production, and .env.prod"
                        ls -la
                        exit 1
                    fi
                    echo "Using env file: $(cat .jenkins-env-file)"

                    if command -v docker-compose >/dev/null 2>&1; then
                        echo "docker-compose" > .jenkins-compose-command
                    elif docker compose version >/dev/null 2>&1; then
                        echo "docker compose" > .jenkins-compose-command
                    else
                        echo "Docker Compose is not available in the Jenkins environment."
                        echo "Install docker-compose or Docker CLI with the compose plugin in the Jenkins container."
                        exit 1
                    fi
                    echo "Using compose command: $(cat .jenkins-compose-command)"
                '''
            }
        }

        stage('Backup Database') {
            steps {
                sh '''
                    set -eu
                    ENV_FILE=$(cat .jenkins-env-file)
                    COMPOSE_CMD=$(cat .jenkins-compose-command)
                    mkdir -p "$BACKUP_DIR"

                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres

                    echo "Waiting for postgres before backup..."
                    for i in $(seq 1 30); do
                        if $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres pg_isready -U sbay -d sbay >/dev/null 2>&1; then
                            break
                        fi
                        if [ "$i" = "30" ]; then
                            echo "Postgres did not become ready for backup."
                            $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps postgres || true
                            $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=120 postgres || true
                            exit 1
                        fi
                        sleep 2
                    done

                    POSTGRES_ID=$($COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q postgres || true)
                    if [ -z "$POSTGRES_ID" ]; then
                        echo "Postgres container is not running yet; skipping pre-deploy database backup."
                        exit 0
                    fi

                    DATE=$(date +%Y%m%d_%H%M%S)
                    BACKUP_FILE="$BACKUP_DIR/sbay_db_$DATE.sql.gz"
                    echo "Creating database backup: $BACKUP_FILE"
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres pg_dump -U sbay -d sbay | gzip > "$BACKUP_FILE"
                    find "$BACKUP_DIR" -name 'sbay_db_*.sql.gz' -mtime +14 -delete
                    ls -lh "$BACKUP_FILE"
                '''
            }
        }

        stage('Apply Database Schema') {
            steps {
                sh '''
                    set -eu
                    ENV_FILE=$(cat .jenkins-env-file)
                    COMPOSE_CMD=$(cat .jenkins-compose-command)

                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres

                    echo "Waiting for postgres before schema update..."
                    for i in $(seq 1 30); do
                        if $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres pg_isready -U sbay -d sbay >/dev/null 2>&1; then
                            break
                        fi
                        if [ "$i" = "30" ]; then
                            echo "Postgres did not become ready for schema update."
                            $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps postgres || true
                            $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=120 postgres || true
                            exit 1
                        fi
                        sleep 2
                    done

                    echo "Applying idempotent database schema scripts..."
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -v ON_ERROR_STOP=1 -U sbay -d sbay < Database/01_schema.sql
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -v ON_ERROR_STOP=1 -U sbay -d sbay < Database/03_ecommerce.sql

                    echo "Current public schema tables:"
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -U sbay -d sbay -c "\\dt public.*"

                    echo "Current public schema columns:"
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -U sbay -d sbay -c "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;"
                '''
            }
        }

        stage('Build') {
            steps {
                sh 'ENV_FILE=$(cat .jenkins-env-file) && COMPOSE_CMD=$(cat .jenkins-compose-command) && $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -eu
                    ENV_FILE=$(cat .jenkins-env-file)
                    COMPOSE_CMD=$(cat .jenkins-compose-command)

                    if ! $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build; then
                        echo "Compose startup failed."
                        $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps || true
                        $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=160 backend web || true
                        docker ps -a --filter "name=sbay" || true
                        exit 1
                    fi
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
                '''
                sh '''
                    set -eu
                    ENV_FILE=$(cat .jenkins-env-file)
                    COMPOSE_CMD=$(cat .jenkins-compose-command)

                    echo "Health checks (6 attempts)..."
                    for i in $(seq 1 6); do
                        if $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T backend curl -fsS "http://localhost:8080/health/ready" >/dev/null 2>&1 && \
                           $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T web wget -qO- "http://localhost:3000/" >/dev/null 2>&1; then
                            echo "Deployment health checks passed."
                            exit 0
                        fi
                        echo "Attempt $i/6 - Services not ready yet, retrying in 5s..."
                        sleep 5
                    done

                    echo "Health checks failed after 6 attempts."
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps || true
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=160 backend web || true
                    exit 1
                '''
            }
        }
    }
}
