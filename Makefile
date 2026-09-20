export PATH := $(HOME)/.local/bin:$(HOME)/.nvm/versions/node/v24.21.0/bin:$(PATH)
export TFENV_CONFIG_DIR := $(HOME)/.tfenv

.DEFAULT_GOAL := up

.PHONY: up down restart logs status ps clean help \
        theme-install theme-dev theme-storybook theme-build theme-deploy \
        tf-init tf-plan tf-apply tf-destroy tf-output realm-provision realm-destroy \
        app-install app-dev app-build \
        notifier-logs notifier-dev

help:
	@echo "Keycloak, Keycloakify & Playground App Management"
	@echo ""
	@echo "Container Commands:"
	@echo "  make                 Start Keycloak and PostgreSQL in the background"
	@echo "  make up              Start Keycloak and PostgreSQL in the background"
	@echo "  make down            Stop containers"
	@echo "  make restart         Restart containers"
	@echo "  make logs            Stream container logs"
	@echo "  make status          Show status of containers"
	@echo "  make clean           Stop and remove containers, volumes, and networks"
	@echo ""
	@echo "Standalone App Commands (React + Vite + keycloak-js):"
	@echo "  make app-install     Install dependencies for the standalone example app"
	@echo "  make app-dev         Start standalone example app on http://localhost:5173"
	@echo "  make app-build       Build production bundle for the standalone app"
	@echo ""
	@echo "Notifier Service Commands (OTP / Email Dummy Backend):"
	@echo "  make notifier-logs   Stream logs from the dummy notification backend"
	@echo "  make notifier-dev    Run notifier directly on host (node services/notifier/server.js)"
	@echo ""
	@echo "Theme Commands (Keycloakify + React + Vite):"
	@echo "  make theme-install   Install theme npm/yarn dependencies"
	@echo "  make theme-dev       Start local Vite development server"
	@echo "  make theme-storybook Start Storybook to preview pages (login, register, etc.)"
	@echo "  make theme-build     Build the Keycloak theme JAR into theme/dist_keycloak"
	@echo "  make theme-deploy    Build theme and restart Keycloak to apply changes immediately"
	@echo ""
	@echo "Provider Commands (Custom Java SPIs):"
	@echo "  make provider-build  Compile Channel OTP SPI and copy JAR to dist_keycloak"
	@echo "  make provider-deploy Build SPI and restart Keycloak to load new provider"
	@echo ""
	@echo "Terraform / Realm Provisioning Commands:"
	@echo "  make realm-provision Provision playground realm, clients, and test user with Terraform"
	@echo "  make realm-destroy   Destroy the playground realm infrastructure created by Terraform"
	@echo "  make tf-init         Initialize Terraform provider plugins"
	@echo "  make tf-plan         Preview Terraform plan against Keycloak"
	@echo "  make tf-apply        Apply Terraform configuration locally"
	@echo "  make tf-output       Show Terraform outputs (URLs, credentials, client IDs)"
	@echo "  make tf-destroy      Destroy Terraform-managed resources"
	@echo ""
	@echo "  make help            Display this help message"

up:
	docker compose up -d
	@echo ""
	@echo "Services started!"
	@echo "Keycloak URL: http://localhost:8080"
	@echo "Admin credentials: admin / admin (or check .env)"
	@echo "Run 'make logs' to monitor initialization."

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

status: ps

ps:
	docker compose ps

clean:
	docker compose down -v

# Standalone Example Application
app-install:
	yarn --cwd app install

app-dev:
	yarn --cwd app dev --host

app-build:
	yarn --cwd app build

# Theme
theme-install:
	yarn --cwd theme install

theme-dev:
	yarn --cwd theme dev

theme-storybook:
	yarn --cwd theme storybook

theme-build:
	yarn --cwd theme build-keycloak-theme

theme-deploy: theme-build
	docker compose restart keycloak
	@echo "Theme built and Keycloak restarted with updated theme JAR."

# Providers (Custom Java SPIs)
provider-build:
	mvn clean package -f providers/channel-otp/pom.xml
	cp providers/channel-otp/target/channel-otp-1.0.0.jar theme/dist_keycloak/channel-otp-1.0.0.jar
	@echo "Provider JAR built and copied to theme/dist_keycloak."

provider-deploy: provider-build
	docker compose restart keycloak
	@echo "Keycloak restarted with updated provider."

# Terraform
tf-init:
	cd terraform && terraform init

tf-plan:
	cd terraform && terraform plan

tf-apply:
	cd terraform && terraform apply -auto-approve

tf-destroy:
	cd terraform && terraform destroy -auto-approve

tf-output:
	cd terraform && terraform output

realm-provision: tf-init tf-apply

realm-destroy: tf-destroy

# Notifier (Dummy Backend for OTP / Email)
notifier-logs:
	docker compose logs -f notifier

notifier-dev:
	node services/notifier/server.js
