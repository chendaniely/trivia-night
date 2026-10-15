PORT ?= 8080

# Launch the app locally: make  (or: make serve, make serve PORT=8084)
serve:
	uv run tools/local-server.py $(PORT)

# Same, but reachable from the TV's own browser over Wi-Fi (prints the Mac's LAN URL)
serve-lan:
	uv run tools/local-server.py $(PORT) 0.0.0.0

test:
	node --test

# End-to-end check in Chrome against a running `make serve` (URL=... to override)
smoke:
	node tools/smoke.mjs $(URL)

# Every screen fits every TV size, and a second click on the same spot is ignored
fit:
	node tools/fit.mjs $(URL)

.PHONY: serve serve-lan test smoke fit
