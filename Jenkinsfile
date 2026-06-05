pipeline {
    agent any

    environment {
        // ── Docker Compose project name ──
        COMPOSE_PROJECT_NAME = 'ecommerce'

        // ── MySQL credentials (match docker-compose.yml) ──
        DB_DATABASE     = 'ecommerce_store'
        DB_USERNAME     = 'ecommerce_user'
        DB_PASSWORD     = 'ecommerce_password'
        MYSQL_ROOT_PASS = 'root'

        // ── GitHub repo ──
        GIT_REPO = 'https://github.com/Lyhour491/ecommerce-with-AI.git'
        GIT_BRANCH = 'main'

        // Variable to track Docker availability
        HAS_DOCKER = 'false'
    }

    stages {

        // ════════════════════════════════════════════
        //  0. Docker Availability Check
        // ════════════════════════════════════════════
        stage('Check Docker') {
            steps {
                script {
                    try {
                        sh 'docker info'
                        env.HAS_DOCKER = 'true'
                        echo '🐳 Docker daemon is running and accessible. Using Dockerized environment...'
                    } catch (Exception e) {
                        env.HAS_DOCKER = 'false'
                        echo '⚠️ Docker daemon is not accessible or not running. Falling back to local host toolchain...'
                    }
                }
            }
        }

        // ════════════════════════════════════════════
        //  1. Checkout
        // ════════════════════════════════════════════
        stage('Checkout') {
            steps {
                echo '📥 Cloning repository...'
                git branch: "${GIT_BRANCH}",
                    url: "${GIT_REPO}"
            }
        }

        // ════════════════════════════════════════════
        //  2. Docker Pipeline Stages
        // ════════════════════════════════════════════
        stage('Prepare Environment (Docker)') {
            when {
                expression { return env.HAS_DOCKER == 'true' }
            }
            steps {
                echo '⚙️  Preparing .env files for Docker...'

                // Backend .env
                dir('ecommerce-backend') {
                    sh '''
                        cp .env.example .env || true
                        sed -i "s|DB_HOST=.*|DB_HOST=mysql|"               .env
                        sed -i "s|DB_PORT=.*|DB_PORT=3306|"                .env
                        sed -i "s|DB_DATABASE=.*|DB_DATABASE=${DB_DATABASE}|" .env
                        sed -i "s|DB_USERNAME=.*|DB_USERNAME=${DB_USERNAME}|" .env
                        sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" .env
                        sed -i "s|APP_ENV=.*|APP_ENV=production|"           .env
                        sed -i "s|APP_DEBUG=.*|APP_DEBUG=false|"            .env
                        sed -i "s|APP_URL=.*|APP_URL=http://localhost:8000|" .env
                    '''
                }

                // Frontend .env
                dir('ecommerce-frontend') {
                    sh '''
                        echo "VITE_API_URL=http://localhost:8000/api" > .env
                    '''
                }
            }
        }

        stage('Build (Docker)') {
            when {
                expression { return env.HAS_DOCKER == 'true' }
            }
            steps {
                echo '🔨 Building Docker images...'
                sh 'docker compose build --no-cache'
            }
        }

        stage('Start Services (Docker)') {
            when {
                expression { return env.HAS_DOCKER == 'true' }
            }
            steps {
                echo '🚀 Starting all containers...'
                sh 'docker compose up -d'

                // Wait for MySQL to be healthy
                echo '⏳ Waiting for MySQL to be ready...'
                sh '''
                    for i in $(seq 1 30); do
                        docker exec ecommerce_mysql mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASS} --silent && break
                        echo "Waiting for MySQL... ($i/30)"
                        sleep 2
                    done
                '''
            }
        }

        stage('Laravel Setup (Docker)') {
            when {
                expression { return env.HAS_DOCKER == 'true' }
            }
            steps {
                echo '🗄️  Running Laravel setup...'
                sh '''
                    docker exec ecommerce_app php artisan key:generate --force
                    docker exec ecommerce_app php artisan config:cache
                    docker exec ecommerce_app php artisan migrate --force
                    docker exec ecommerce_app php artisan db:seed --force
                    docker exec ecommerce_app php artisan storage:link || true
                '''
            }
        }

        stage('Test (Docker)') {
            when {
                expression { return env.HAS_DOCKER == 'true' }
            }
            steps {
                echo '🧪 Running backend tests...'
                sh 'docker exec ecommerce_app php artisan test'
            }
        }

        stage('Health Check (Docker)') {
            when {
                expression { return env.HAS_DOCKER == 'true' }
            }
            steps {
                echo '❤️  Verifying services are up...'
                sh '''
                    echo "-- Backend API --"
                    curl -sf http://localhost:8000/api/products || echo "⚠️ Backend API not responding"

                    echo "-- Frontend --"
                    curl -sf http://localhost:5173 || echo "⚠️ Frontend not responding"

                    echo "-- phpMyAdmin --"
                    curl -sf http://localhost:8080 || echo "⚠️ phpMyAdmin not responding"
                '''
            }
        }

        // ════════════════════════════════════════════
        //  3. Local Pipeline Stages (Fallback)
        // ════════════════════════════════════════════
        stage('Prepare Environment (Local)') {
            when {
                expression { return env.HAS_DOCKER == 'false' }
            }
            steps {
                echo '⚙️  Preparing .env files for Local SQLite...'

                // Backend .env
                dir('ecommerce-backend') {
                    sh '''
                        cp .env.example .env || true
                        sed -i "s|DB_CONNECTION=.*|DB_CONNECTION=sqlite|" .env
                        sed -i "s|DB_HOST=.*|# DB_HOST=mysql|" .env
                        sed -i "s|DB_PORT=.*|# DB_PORT=3306|" .env
                        sed -i "s|DB_DATABASE=.*|# DB_DATABASE=ecommerce_store|" .env
                        sed -i "s|DB_USERNAME=.*|# DB_USERNAME=ecommerce_user|" .env
                        sed -i "s|DB_PASSWORD=.*|# DB_PASSWORD=ecommerce_password|" .env
                        sed -i "s|APP_ENV=.*|APP_ENV=testing|" .env
                        sed -i "s|APP_DEBUG=.*|APP_DEBUG=true|" .env
                    '''
                    // Ensure local SQLite database file exists
                    sh 'touch database/database.sqlite'
                }

                // Frontend .env
                dir('ecommerce-frontend') {
                    sh '''
                        echo "VITE_API_URL=http://127.0.0.1:8000/api" > .env
                    '''
                }
            }
        }

        stage('Install & Build (Local)') {
            when {
                expression { return env.HAS_DOCKER == 'false' }
            }
            steps {
                echo '🔨 Installing backend and frontend dependencies locally...'
                dir('ecommerce-backend') {
                    sh 'composer install --no-interaction --prefer-dist'
                }
                dir('ecommerce-frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Laravel Setup (Local)') {
            when {
                expression { return env.HAS_DOCKER == 'false' }
            }
            steps {
                echo '🗄️  Setting up Laravel SQLite database...'
                dir('ecommerce-backend') {
                    sh 'php artisan key:generate --force'
                    sh 'php artisan migrate:fresh --seed --force'
                    sh 'php artisan storage:link || true'
                }
            }
        }

        stage('Test (Local)') {
            when {
                expression { return env.HAS_DOCKER == 'false' }
            }
            steps {
                echo '🧪 Running backend tests locally...'
                dir('ecommerce-backend') {
                    sh 'php artisan test'
                }
            }
        }
    }

    // ════════════════════════════════════════════════
    //  Post Actions
    // ════════════════════════════════════════════════
    post {
        success {
            script {
                if (env.HAS_DOCKER == 'true') {
                    echo '''
                    ✅ ══════════════════════════════════════════
                       Deployment Successful (Docker Compose)!
                    ══════════════════════════════════════════
                       🌐 Frontend:    http://localhost:5173
                       🔌 Backend API: http://localhost:8000/api
                       🗃️ phpMyAdmin:  http://localhost:8080
                    ══════════════════════════════════════════
                    '''
                } else {
                    echo '''
                    ✅ ══════════════════════════════════════════
                       CI/CD Pipeline Successful (Local Fallback)!
                       Backend tests passed and frontend was successfully built.
                    ══════════════════════════════════════════
                    '''
                }
            }
        }
        failure {
            echo '❌ Deployment failed! Collecting information...'
            script {
                if (env.HAS_DOCKER == 'true') {
                    sh 'docker compose logs --tail=50 || true'
                }
            }
        }
        cleanup {
            script {
                if (env.HAS_DOCKER == 'true') {
                    echo '🧹 Cleaning up dangling images...'
                    sh 'docker image prune -f || true'
                }
            }
        }
    }
}
