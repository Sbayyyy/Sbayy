pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh 'mkdir -p /opt/apps/sbay/Sbay/uploads'
                sh 'docker-compose -f docker-compose.prod.yml --env-file .env.production build'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }

            steps {
                sh 'docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build'
                sh 'docker-compose -f docker-compose.prod.yml --env-file .env.production ps'
                sh 'curl -fsS http://127.0.0.1:5000/health/ready'
                sh 'curl -fsS http://127.0.0.1:3000/ >/dev/null'
            }
        }
    }
}
