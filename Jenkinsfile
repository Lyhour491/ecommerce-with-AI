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
    }

    stages {

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
        //  2. Prepare Environment
        // ════════════════════════════════════════════
        stage('Prepare Environment') {
            steps {
                echo '⚙️  Preparing .env files...'

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

        // ════════════════════════════════════════════
        //  3. Build Docker Images
        // ════════════════════════════════════════════
        stage('Build') {
            steps {
                echo '🔨 Building Docker images...'
                sh 'docker compose build --no-cache'
            }
        }

        // ════════════════════════════════════════════
        //  4. Start Services
        // ════════════════════════════════════════════
        stage('Start Services') {
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

        // ════════════════════════════════════════════
        //  5. Laravel Setup (migrate + seed + key)
        // ════════════════════════════════════════════
        stage('Laravel Setup') {
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

        // ════════════════════════════════════════════
        //  6. Run Tests
        // ════════════════════════════════════════════
        stage('Test') {
            steps {
                echo '🧪 Running backend tests...'
                sh 'docker exec ecommerce_app php artisan test'
            }
        }

        // ════════════════════════════════════════════
        //  7. Health Check
        // ════════════════════════════════════════════
        stage('Health Check') {
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
    }

    // ════════════════════════════════════════════════
    //  Post Actions
    // ════════════════════════════════════════════════
    post {
        success {
            echo '''
            ✅ ══════════════════════════════════════════
               Deployment Successful!
            ══════════════════════════════════════════
               🌐 Frontend:    http://localhost:5173
               🔌 Backend API: http://localhost:8000/api
               🗃️ phpMyAdmin:  http://localhost:8080
            ══════════════════════════════════════════
            '''
        }
        failure {
            echo '❌ Deployment failed! Collecting logs...'
            sh 'docker compose logs --tail=50 || true'
        }
        cleanup {
            echo '🧹 Cleaning up dangling images...'
            sh 'docker image prune -f || true'
        }
    }
}
