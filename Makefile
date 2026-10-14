PORT ?= 8080

# Launch the app locally: make  (or: make serve, make serve PORT=8084)
serve:
	uv run tools/local-server.py $(PORT)

# Same, but reachable from the TV's own browser over Wi-Fi (prints the Mac's LAN URL)
serve-lan:
	uv run tools/local-server.py $(PORT) 0.0.0.0

test:
	node --test

.PHONY: serve serve-lan test
