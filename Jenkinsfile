pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.prod.yml'
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
                        echo "Checked PROD_ENV_FILE=${PROD_ENV_FILE:-unset}, /var/jenkins_home/workspace/sbay-deploy/.env.production, /var/jenkins_home/workspace/sbay-deploy/.env.prod, /var/sbay/.env.production, /var/sbay/.env.prod, $(pwd)/.env.production, and $(pwd)/.env.prod"
                        ls -la
                        exit 1
                    fi
                    echo "Using env file: $(cat .jenkins-env-file)"
                '''
            }
        }

        stage('Build') {
            steps {
                sh 'ENV_FILE=$(cat .jenkins-env-file) && docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }

            steps {
                sh 'ENV_FILE=$(cat .jenkins-env-file) && docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build'
                sh 'ENV_FILE=$(cat .jenkins-env-file) && docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps'
                sh 'curl -fsS http://127.0.0.1:5000/health/ready'
                sh 'curl -fsS http://127.0.0.1:3000/ >/dev/null'
            }
        }
    }
}
