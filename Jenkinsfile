pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    parameters {
        string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Branch to deploy when this job is not using SCM checkout.')
        string(name: 'APP_URL', defaultValue: 'http://localhost:8000', description: 'Public backend URL.')
        string(name: 'VITE_API_URL', defaultValue: 'http://localhost:8000/api', description: 'Frontend API URL.')
        booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run frontend and backend tests before deployment.')
        booleanParam(name: 'RUN_SEEDERS', defaultValue: false, description: 'Run Laravel seeders after migration. Keep false for production.')
        booleanParam(name: 'REBUILD_IMAGES', defaultValue: true, description: 'Rebuild Docker images during deployment.')
        booleanParam(name: 'CLEAN_DOCKER_CACHE', defaultValue: true, description: 'Clean unused Docker cache/images before deployment. Does not remove volumes.')
        string(name: 'MIN_FREE_SPACE_MB', defaultValue: '4096', description: 'Minimum free disk space required on Jenkins before Docker pulls/builds.')
    }

    environment {
        COMPOSE_PROJECT_NAME = 'ecommerce'
        DB_DATABASE = 'ecommerce_store'
        DB_USERNAME = 'ecommerce_user'
        DB_PASSWORD = 'ecommerce_password'
        MYSQL_ROOT_PASS = 'root'
        DEPLOY_APP_URL = "${params.APP_URL}"
        DEPLOY_VITE_API_URL = "${params.VITE_API_URL}"
        RUN_SEEDERS_FLAG = "${params.RUN_SEEDERS}"
        REBUILD_IMAGES_FLAG = "${params.REBUILD_IMAGES}"
        CLEAN_DOCKER_CACHE_FLAG = "${params.CLEAN_DOCKER_CACHE}"
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    try {
                        checkout scm
                    } catch (Exception ignored) {
                        git branch: params.GIT_BRANCH, url: 'https://github.com/Lyhour491/ecommerce-with-AI.git'
                    }
                }
            }
        }

        stage('Verify Docker') {
            steps {
                sh '''
                    set -eu
                    docker info >/dev/null
                    docker compose version
                    docker compose config -q
                '''
            }
        }

        stage('Free Docker Space') {
            when {
                expression { return params.CLEAN_DOCKER_CACHE }
            }
            steps {
                sh '''
                    set -eu
                    echo "Disk usage before cleanup:"
                    df -h || true
                    docker system df || true

                    docker compose down --remove-orphans || true
                    docker container prune -f || true
                    docker system prune -af || true
                    docker image prune -af || true
                    docker builder prune -af || true

                    echo "Disk usage after cleanup:"
                    df -h || true
                    docker system df || true
                '''
            }
        }

        stage('Check Free Disk') {
            steps {
                sh '''
                    set -eu
                    target="/var/lib/containerd"
                    if [ ! -d "$target" ]; then
                        target="/var/lib/docker"
                    fi
                    if [ ! -d "$target" ]; then
                        target="/"
                    fi

                    available_mb=$(df -Pm "$target" | awk 'NR==2 {print $4}')
                    echo "Free space on $target: ${available_mb} MB"

                    if [ "$available_mb" -lt "${MIN_FREE_SPACE_MB}" ]; then
                        echo "Not enough disk for Docker deployment. Need at least ${MIN_FREE_SPACE_MB} MB free."
                        echo "Current Docker usage:"
                        docker system df || true
                        exit 1
                    fi
                '''
            }
        }

        stage('Prepare Environment') {
            steps {
                sh '''
                    set -eu

                    set_env() {
                        file="$1"
                        key="$2"
                        value="$3"
                        if grep -q "^${key}=" "$file"; then
                            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
                        else
                            printf "\\n%s=%s\\n" "$key" "$value" >> "$file"
                        fi
                    }

                    cp ecommerce-backend/.env.example ecommerce-backend/.env
                    set_env ecommerce-backend/.env APP_ENV production
                    set_env ecommerce-backend/.env APP_DEBUG false
                    set_env ecommerce-backend/.env APP_URL "${DEPLOY_APP_URL}"
                    set_env ecommerce-backend/.env DB_CONNECTION mysql
                    set_env ecommerce-backend/.env DB_HOST mysql
                    set_env ecommerce-backend/.env DB_PORT 3306
                    set_env ecommerce-backend/.env DB_DATABASE "${DB_DATABASE}"
                    set_env ecommerce-backend/.env DB_USERNAME "${DB_USERNAME}"
                    set_env ecommerce-backend/.env DB_PASSWORD "${DB_PASSWORD}"
                    set_env ecommerce-backend/.env CACHE_STORE redis
                    set_env ecommerce-backend/.env SESSION_DRIVER redis
                    set_env ecommerce-backend/.env QUEUE_CONNECTION redis
                    set_env ecommerce-backend/.env REDIS_HOST redis
                    set_env ecommerce-backend/.env REDIS_PORT 6379
                    set_env ecommerce-backend/.env VITE_API_URL "${DEPLOY_VITE_API_URL}"

                    if [ -n "${GEMINI_API_KEY:-}" ]; then
                        set_env ecommerce-backend/.env GEMINI_API_KEY "${GEMINI_API_KEY}"
                    fi
                    if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
                        set_env ecommerce-backend/.env GOOGLE_CLIENT_ID "${GOOGLE_CLIENT_ID}"
                    fi
                    if [ -n "${GOOGLE_CLIENT_SECRET:-}" ]; then
                        set_env ecommerce-backend/.env GOOGLE_CLIENT_SECRET "${GOOGLE_CLIENT_SECRET}"
                    fi

                    printf "VITE_API_URL=%s\\n" "${DEPLOY_VITE_API_URL}" > ecommerce-frontend/.env
                '''
            }
        }

        stage('Build Images') {
            when {
                expression { return params.REBUILD_IMAGES }
            }
            steps {
                sh 'docker compose build app queue scheduler'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    set -eu
                    docker compose run --rm app composer install --no-interaction --prefer-dist --optimize-autoloader
                    docker run --rm -v "$PWD/ecommerce-frontend:/app" -w /app node:20-alpine npm ci
                '''
            }
        }

        stage('Test') {
            when {
                expression { return params.RUN_TESTS }
            }
            parallel {
                stage('Backend Tests') {
                    steps {
                        sh '''
                            set -eu
                            docker compose run --rm \
                                -e APP_ENV=testing \
                                -e DB_CONNECTION=sqlite \
                                -e DB_DATABASE=:memory: \
                                app php artisan test
                        '''
                    }
                }
                stage('Frontend Build') {
                    steps {
                        sh '''
                            set -eu
                            docker run --rm -v "$PWD/ecommerce-frontend:/app" -w /app node:20-alpine npm run lint -- --quiet
                            docker run --rm -v "$PWD/ecommerce-frontend:/app" -w /app node:20-alpine npm run build
                        '''
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    set -eu
                    docker compose up -d
                '''
            }
        }

        stage('Laravel Release Tasks') {
            steps {
                sh '''
                    set -eu

                    for i in $(seq 1 30); do
                        docker exec ecommerce_mysql mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASS} --silent && break
                        echo "Waiting for MySQL... ($i/30)"
                        sleep 2
                    done

                    docker compose exec -T app composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

                    if ! docker compose exec -T app php artisan env | grep -q "production"; then
                        echo "Warning: Laravel APP_ENV is not production inside the app container."
                    fi

                    if docker compose exec -T app sh -c 'grep -q "^APP_KEY=base64:" .env'; then
                        echo "APP_KEY already configured."
                    else
                        docker compose exec -T app php artisan key:generate --force
                    fi

                    docker compose exec -T app php artisan migrate --force

                    if [ "${RUN_SEEDERS_FLAG}" = "true" ]; then
                        docker compose exec -T app php artisan db:seed --force
                    fi

                    docker compose exec -T app php artisan storage:link || true
                    docker compose exec -T app php artisan config:clear
                    docker compose exec -T app php artisan cache:clear
                    docker compose exec -T app php artisan view:clear
                    docker compose exec -T app php artisan config:cache
                    docker compose exec -T app php artisan view:cache
                    docker compose restart queue scheduler nginx
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -eu
                    for i in $(seq 1 30); do
                        if curl -fsS "${DEPLOY_APP_URL}/api/products" >/dev/null; then
                            echo "Backend API is healthy."
                            exit 0
                        fi
                        echo "Waiting for backend health check... ($i/30)"
                        sleep 2
                    done
                    curl -fsS "${DEPLOY_APP_URL}/api/products"
                '''
            }
        }
    }

    post {
        success {
            echo "Deployment completed successfully: ${params.APP_URL}"
        }
        failure {
            echo 'Deployment failed. Showing recent Docker logs.'
            sh 'docker compose ps || true'
            sh 'docker compose logs --tail=120 app nginx queue scheduler || true'
        }
        cleanup {
            sh 'docker image prune -f || true'
        }
    }
}
