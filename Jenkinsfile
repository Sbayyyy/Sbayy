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
                sh 'docker-compose build'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }

            steps {
                sh 'docker-compose up -d --build'
            }
        }
    }
}
