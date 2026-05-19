# SwipeHire Development Makefile
# Usage: make <target>  |  make help

SHELL := /bin/bash
ROOT  := $(shell pwd)
SRV   := $(ROOT)/server
CLI   := $(ROOT)/client

# PID / log files (git-ignored)
SRV_PID  := $(ROOT)/.server.pid
CLI_PID  := $(ROOT)/.client.pid
SRV_LOG  := $(ROOT)/.server.log
CLI_LOG  := $(ROOT)/.client.log

# ANSI colours
G := \033[0;32m
Y := \033[0;33m
R := \033[0;31m
B := \033[0;34m
N := \033[0m

.PHONY: help dev server client stop stop-server stop-client \
        postgres redis start-db stop-db stop-all \
        install install-server install-client \
        build build-server build-client \
        clean clean-build clean-modules clean-cache clean-all \
        docker-stop docker-clean docker-volumes docker-images \
        docker-clean-all docker-prune docker-compose-down \
        db-reset db-connect db-seed redis-flush \
        status logs logs-server logs-client \
        reset reset-soft nuke

# ─────────────────────────────────────────────────────────────
##@ 🚀  Quick Start
# ─────────────────────────────────────────────────────────────

dev: start-db ## Start everything (postgres + redis + server + client)
	@echo -e "$(Y)Starting server...$(N)"
	@cd $(SRV) && nohup npm run dev > $(SRV_LOG) 2>&1 & echo $$! > $(SRV_PID)
	@sleep 2
	@echo -e "$(Y)Starting client...$(N)"
	@cd $(CLI) && nohup npm run dev > $(CLI_LOG) 2>&1 & echo $$! > $(CLI_PID)
	@sleep 2
	@echo -e "$(G)✅  SwipeHire is running$(N)"
	@echo -e "   Client  →  http://localhost:3000"
	@echo -e "   Server  →  http://localhost:3001"
	@echo -e "   Logs    →  make logs"
	@echo -e "   Stop    →  make stop"

server: ## Start server only (foreground — use in its own terminal)
	@echo -e "$(Y)Starting server (foreground)...$(N)"
	@cd $(SRV) && npm run dev

client: ## Start client only (foreground — use in its own terminal)
	@echo -e "$(Y)Starting client (foreground)...$(N)"
	@cd $(CLI) && npm run dev

# ─────────────────────────────────────────────────────────────
##@ 🛑  Stop
# ─────────────────────────────────────────────────────────────

stop: stop-server stop-client ## Stop server + client (leave postgres/redis running)

stop-server: ## Stop the Node server
	@if [ -f $(SRV_PID) ]; then \
		PID=$$(cat $(SRV_PID)); \
		echo -e "$(Y)Stopping server (PID $$PID)...$(N)"; \
		kill $$PID 2>/dev/null || true; \
		pkill -f "ts-node-dev.*server" 2>/dev/null || true; \
		rm -f $(SRV_PID); \
		echo -e "$(G)✅  Server stopped$(N)"; \
	else \
		echo -e "$(Y)Killing anything on port 3001...$(N)"; \
		lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "Nothing on port 3001"; \
	fi

stop-client: ## Stop the Vite client
	@if [ -f $(CLI_PID) ]; then \
		PID=$$(cat $(CLI_PID)); \
		echo -e "$(Y)Stopping client (PID $$PID)...$(N)"; \
		kill $$PID 2>/dev/null || true; \
		pkill -f "vite" 2>/dev/null || true; \
		rm -f $(CLI_PID); \
		echo -e "$(G)✅  Client stopped$(N)"; \
	else \
		echo -e "$(Y)Killing anything on port 3000...$(N)"; \
		lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Nothing on port 3000"; \
	fi

stop-all: stop stop-db ## Stop server + client + postgres + redis

# ─────────────────────────────────────────────────────────────
##@ 🗄️  Database & Cache Services
# ─────────────────────────────────────────────────────────────

start-db: ## Start PostgreSQL + Redis via Homebrew
	@echo -e "$(Y)Starting PostgreSQL...$(N)"
	@brew services start postgresql@15 2>/dev/null || true
	@echo -e "$(Y)Starting Redis...$(N)"
	@brew services start redis 2>/dev/null || true
	@echo -e "$(G)✅  PostgreSQL + Redis started$(N)"

stop-db: ## Stop PostgreSQL + Redis
	@brew services stop postgresql@15 2>/dev/null || true
	@brew services stop redis 2>/dev/null || true
	@echo -e "$(G)✅  PostgreSQL + Redis stopped$(N)"

postgres: ## Start PostgreSQL only
	@brew services start postgresql@15

stop-postgres: ## Stop PostgreSQL only
	@brew services stop postgresql@15

redis: ## Start Redis only
	@brew services start redis

stop-redis: ## Stop Redis only
	@brew services stop redis

redis-flush: ## Flush all Redis keys (clears cache)
	@echo -e "$(R)Flushing all Redis keys...$(N)"
	@redis-cli FLUSHALL
	@echo -e "$(G)✅  Redis flushed$(N)"

db-reset: ## Drop + recreate the local Postgres database
	@echo -e "$(R)Resetting database swipehire...$(N)"
	@dropdb --if-exists swipehire
	@createdb swipehire
	@echo -e "$(G)✅  Database reset (run server to re-apply schema)$(N)"

db-connect: ## Open psql shell to the local database
	@psql postgresql://seanscully@localhost:5432/swipehire

db-seed: ## Seed sample companies (server must be running)
	@curl -s http://localhost:3001/api/setup/seed-sample-companies | python3 -m json.tool

seed-test: ## Nuke DB and create test accounts + companies (server must be running)
	@echo -e "$(R)Nuking database and reseeding test data...$(N)"
	@curl -s -X POST http://localhost:3001/api/setup/nuke-and-seed | python3 -m json.tool
	@echo -e "$(G)✅  Done. Open http://localhost:3000/dev to log in instantly.$(N)"

# ─────────────────────────────────────────────────────────────
##@ 📦  Install
# ─────────────────────────────────────────────────────────────

install: install-server install-client ## Install all npm dependencies

install-server: ## Install server dependencies
	@echo -e "$(Y)Installing server deps...$(N)"
	@cd $(SRV) && npm install
	@echo -e "$(G)✅  Server deps installed$(N)"

install-client: ## Install client dependencies
	@echo -e "$(Y)Installing client deps...$(N)"
	@cd $(CLI) && npm install
	@echo -e "$(G)✅  Client deps installed$(N)"

# ─────────────────────────────────────────────────────────────
##@ 🔨  Build
# ─────────────────────────────────────────────────────────────

build: build-server build-client ## Build both server and client

build-server: ## Compile TypeScript server to dist/
	@echo -e "$(Y)Building server...$(N)"
	@cd $(SRV) && npm run build
	@echo -e "$(G)✅  Server built → server/dist$(N)"

build-client: ## Build React client to dist/
	@echo -e "$(Y)Building client...$(N)"
	@cd $(CLI) && npm run build
	@echo -e "$(G)✅  Client built → client/dist$(N)"

# ─────────────────────────────────────────────────────────────
##@ 🧹  Clean
# ─────────────────────────────────────────────────────────────

clean: clean-build ## Remove build output + pid/log files

clean-build: ## Remove dist/ folders and temp files
	@echo -e "$(Y)Cleaning build output...$(N)"
	@rm -rf $(SRV)/dist $(CLI)/dist
	@rm -f $(SRV_PID) $(CLI_PID) $(SRV_LOG) $(CLI_LOG)
	@echo -e "$(G)✅  Build output removed$(N)"

clean-modules: ## Remove node_modules from server + client
	@echo -e "$(R)Removing node_modules...$(N)"
	@rm -rf $(SRV)/node_modules $(CLI)/node_modules
	@echo -e "$(G)✅  node_modules removed$(N)"

clean-cache: ## Clear npm + Vite cache
	@echo -e "$(Y)Clearing caches...$(N)"
	@npm cache clean --force 2>/dev/null || true
	@rm -rf $(CLI)/.vite $(CLI)/node_modules/.vite
	@rm -rf $(SRV)/node_modules/.cache
	@echo -e "$(G)✅  Caches cleared$(N)"

clean-logs: ## Remove log files
	@rm -f $(SRV_LOG) $(CLI_LOG)
	@echo -e "$(G)✅  Logs removed$(N)"

clean-all: clean-build clean-modules clean-cache ## Remove builds + node_modules + caches

# ─────────────────────────────────────────────────────────────
##@ 🐳  Docker
# ─────────────────────────────────────────────────────────────

docker-stop: ## Stop all running Docker containers
	@echo -e "$(Y)Stopping all containers...$(N)"
	@docker stop $$(docker ps -q) 2>/dev/null || echo "No containers running"

docker-clean: ## Remove stopped containers + dangling images
	@docker container prune -f
	@docker image prune -f
	@echo -e "$(G)✅  Docker cleaned$(N)"

docker-volumes: ## Remove all Docker volumes
	@echo -e "$(R)Removing all Docker volumes...$(N)"
	@docker volume prune -f
	@echo -e "$(G)✅  Volumes removed$(N)"

docker-images: ## Remove all Docker images
	@echo -e "$(R)Removing all Docker images...$(N)"
	@docker rmi -f $$(docker images -q) 2>/dev/null || echo "No images to remove"

docker-clean-all: ## Remove all containers + images + volumes + networks
	@echo -e "$(R)Removing ALL Docker resources...$(N)"
	@docker rm -f $$(docker ps -aq) 2>/dev/null || true
	@docker rmi -f $$(docker images -q) 2>/dev/null || true
	@docker volume prune -f
	@docker network prune -f
	@echo -e "$(G)✅  All Docker resources removed$(N)"

docker-prune: ## Full Docker system prune — removes EVERYTHING unused
	@echo -e "$(R)Docker system prune (removes all unused resources)...$(N)"
	@docker system prune -af --volumes
	@echo -e "$(G)✅  Docker system purged$(N)"

docker-compose-down: ## Stop docker-compose services (dev + prod)
	@docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
	@docker-compose down 2>/dev/null || true
	@echo -e "$(G)✅  Docker Compose stopped$(N)"

docker-compose-clean: docker-compose-down ## Stop compose + remove volumes
	@docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
	@docker-compose down -v --remove-orphans 2>/dev/null || true
	@echo -e "$(G)✅  Docker Compose volumes removed$(N)"

# ─────────────────────────────────────────────────────────────
##@ 📊  Status & Logs
# ─────────────────────────────────────────────────────────────

status: ## Show status of all services + ports
	@echo -e "$(B)═══ Homebrew Services ═══$(N)"
	@brew services list | grep -E "postgresql|redis" || true
	@echo ""
	@echo -e "$(B)═══ Ports ═══$(N)"
	@lsof -i:3000 -sTCP:LISTEN 2>/dev/null | grep -q LISTEN \
		&& echo -e "  Port 3000 (client):  $(G)RUNNING$(N)" \
		|| echo -e "  Port 3000 (client):  $(R)STOPPED$(N)"
	@lsof -i:3001 -sTCP:LISTEN 2>/dev/null | grep -q LISTEN \
		&& echo -e "  Port 3001 (server):  $(G)RUNNING$(N)" \
		|| echo -e "  Port 3001 (server):  $(R)STOPPED$(N)"
	@lsof -i:5432 -sTCP:LISTEN 2>/dev/null | grep -q LISTEN \
		&& echo -e "  Port 5432 (postgres): $(G)RUNNING$(N)" \
		|| echo -e "  Port 5432 (postgres): $(R)STOPPED$(N)"
	@lsof -i:6379 -sTCP:LISTEN 2>/dev/null | grep -q LISTEN \
		&& echo -e "  Port 6379 (redis):   $(G)RUNNING$(N)" \
		|| echo -e "  Port 6379 (redis):   $(R)STOPPED$(N)"
	@echo ""
	@echo -e "$(B)═══ Docker ═══$(N)"
	@docker ps 2>/dev/null | tail -n +2 | wc -l | xargs -I{} echo "  {} container(s) running"

logs: ## Tail both server + client logs (Ctrl+C to exit)
	@tail -f $(SRV_LOG) $(CLI_LOG) 2>/dev/null || echo "No log files found — use 'make dev' first"

logs-server: ## Tail server log only
	@tail -f $(SRV_LOG) 2>/dev/null || echo "Server not running via 'make dev'"

logs-client: ## Tail client log only
	@tail -f $(CLI_LOG) 2>/dev/null || echo "Client not running via 'make dev'"

# ─────────────────────────────────────────────────────────────
##@ 💣  Reset
# ─────────────────────────────────────────────────────────────

reset-soft: stop clean start-db install ## Stop → clean builds → reinstall → start DB
	@echo -e "$(G)✅  Soft reset done. Run 'make dev' to start.$(N)"

reset: stop-all clean-all db-reset redis-flush install ## Stop all → clean all → reset DB → reinstall
	@echo -e "$(G)✅  Full reset done. Run 'make dev' to start fresh.$(N)"

nuke: stop-all clean-all docker-prune db-reset redis-flush ## ☢️  NUCLEAR: reset everything including Docker
	@echo -e "$(R)☢️  Everything has been nuked.$(N)"
	@echo -e "Run 'make install && make dev' to start fresh."

# ─────────────────────────────────────────────────────────────
##@ ❓  Help
# ─────────────────────────────────────────────────────────────

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\n$(B)SwipeHire Dev Commands$(N)\n\n"} \
		/^[a-zA-Z_-]+:.*?##/ { printf "  $(G)%-22s$(N) %s\n", $$1, $$2 } \
		/^##@/ { printf "\n$(Y)%s$(N)\n", substr($$0, 5) }' $(MAKEFILE_LIST)

.DEFAULT_GOAL := help
