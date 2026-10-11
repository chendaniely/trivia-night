#!/usr/bin/env python3
# Local dev server with no-store cache headers.
# Plain `python3 -m http.server` sends no Cache-Control; Chromium then applies
# heuristic freshness and serves STALE JS for a long time after edits (and
# CDP Network.setCacheDisabled does not override it). no-store kills that.
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), NoStoreHandler).serve_forever()
