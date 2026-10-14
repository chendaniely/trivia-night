# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Local dev server with no-store cache headers.

Usage: uv run tools/local-server.py [PORT] [HOST]
  HOST defaults to 127.0.0.1 (this Mac only); 0.0.0.0 lets the TV's own
  browser reach the Mac over Wi-Fi (make serve-lan).

Plain `python3 -m http.server` sends no Cache-Control; Chromium then applies
heuristic freshness and serves STALE JS for a long time after edits (and
CDP Network.setCacheDisabled does not override it). no-store kills that.
"""
import http.server
import socket
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
HOST = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"


def lan_ip():
    """The Mac's LAN address. A UDP connect sends no packets; it only makes
    the OS pick the outbound interface. Falls back to loopback."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".m4a": "audio/mp4",  # the stdlib guesses audio/mp4a-latm, which TVs reject
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    # Print exactly ONE address: always open the same one (a saved game
    # belongs to the address it was played on).
    shown = lan_ip() if HOST == "0.0.0.0" else HOST
    print(f"Open http://{shown}:{PORT}/", flush=True)
    http.server.ThreadingHTTPServer((HOST, PORT), NoStoreHandler).serve_forever()
