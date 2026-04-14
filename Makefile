.PHONY: build dev typecheck clean npm-publish npm-publish-alpha help

# ── Variables ─────────────────────────────────────────────────────────────────
PACKAGE := @ndnci/codabra
FILTER  := --filter $(PACKAGE)

# ── Development ───────────────────────────────────────────────────────────────

build:          ## Build all packages
	pnpm turbo build

dev:            ## Start dev mode (watch)
	pnpm turbo dev

typecheck:      ## Type-check all packages
	pnpm turbo typecheck

clean:          ## Remove all dist folders and node_modules
	pnpm turbo clean && rm -rf node_modules

# ── Publishing ────────────────────────────────────────────────────────────────

npm-publish:    ## Build and publish $(PACKAGE) as stable (tag: latest)
	pnpm turbo build
	pnpm $(FILTER) publish --access public --provenance --no-git-checks

npm-publish-alpha: ## Build and publish $(PACKAGE) as pre-release (tag: alpha)
	pnpm turbo build
	pnpm $(FILTER) publish --access public --provenance --no-git-checks --tag alpha

# ── Help ──────────────────────────────────────────────────────────────────────

help:           ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
