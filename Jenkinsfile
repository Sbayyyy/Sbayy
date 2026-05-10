pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.prod.yml'
        DEPLOY_DIR = '/var/jenkins_home/apss/sbay/Sbayy'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare') {
            steps {
                sh '''
                    set -eu
                    mkdir -p "$DEPLOY_DIR"
                    tar --exclude='.git' --exclude='Frontend/node_modules' --exclude='Frontend/web/.next' --exclude='Backend/**/bin' --exclude='Backend/**/obj' -cf - . | tar -xf - -C "$DEPLOY_DIR"
                    cd "$DEPLOY_DIR"

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
                        echo "Checked PROD_ENV_FILE=${PROD_ENV_FILE:-unset}, /var/jenkins_home/workspace/sbay-deploy/.env.production, /var/jenkins_home/workspace/sbay-deploy/.env.prod, /var/sbay/.env.production, /var/sbay/.env.prod, $DEPLOY_DIR/.env.production, and $DEPLOY_DIR/.env.prod"
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

        stage('Build') {
            steps {
                sh 'cd "$DEPLOY_DIR" && ENV_FILE=$(cat .jenkins-env-file) && COMPOSE_CMD=$(cat .jenkins-compose-command) && $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -eu
                    cd "$DEPLOY_DIR"
                    ENV_FILE=$(cat .jenkins-env-file)
                    COMPOSE_CMD=$(cat .jenkins-compose-command)

                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --force-recreate
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
                '''
                sh '''
                    set -eu
                    cd "$DEPLOY_DIR"
                    ENV_FILE=$(cat .jenkins-env-file)
                    COMPOSE_CMD=$(cat .jenkins-compose-command)
                    API_PORT=$(grep -E '^API_HOST_PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2- || true)
                    WEB_PORT=$(grep -E '^WEB_HOST_PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2- || true)
                    API_PORT=${API_PORT:-5000}
                    WEB_PORT=${WEB_PORT:-3000}

                    for i in $(seq 1 30); do
                        if curl -fsS "http://127.0.0.1:${API_PORT}/health/ready" >/dev/null && curl -fsS "http://127.0.0.1:${WEB_PORT}/" >/dev/null; then
                            echo "Deployment health checks passed."
                            exit 0
                        fi
                        sleep 5
                    done

                    echo "Deployment health checks failed."
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps || true
                    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=120 backend web || true
                    docker ps -a --filter "name=sbay" || true
                    exit 1
                '''
            }
        }
    }
}
