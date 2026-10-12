PORT ?= 8080

# Launch the app locally: make  (or: make serve, make serve PORT=8084)
serve:
	python3 tools/local-server.py $(PORT)

test:
	node --test

.PHONY: serve test
