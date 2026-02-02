#!/usr/bin/env python3
"""
Simple Vision webhook proxy - No external dependencies
"""
import json
import requests
import http.server
import socketserver
from urllib.parse import urlparse

PORT = 5680
VISION_URL = "http://localhost:3001"

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = json.dumps({
                "status": "healthy",
                "service": "vision-proxy",
                "vision_url": VISION_URL
            })
            self.wfile.write(response.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        if self.path == "/webhook/navigator-screenshot":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body.decode())
                
                # Validate required fields
                screenshot_url = data.get("screenshot_url")
                viewport = data.get("viewport")
                query = data.get("query")
                session_id = data.get("session_id", "unknown")
                
                if not screenshot_url or not viewport:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    response = json.dumps({
                        "error": "Missing required fields: screenshot_url and viewport",
                        "session_id": session_id
                    })
                    self.wfile.write(response.encode())
                    print(f"[{session_id}] Missing required fields")
                    return
                
                print(f"[{session_id}] Forwarding to Vision service...")
                
                # Forward to Vision service
                try:
                    resp = requests.post(
                        f"{VISION_URL}/interpret",
                        json={
                            "screenshot_url": screenshot_url,
                            "viewport": viewport,
                            "query": query
                        },
                        timeout=30
                    )
                    
                    if resp.status_code == 200:
                        guidance = resp.json()
                        print(f"[{session_id}] ✅ Vision returned guidance")
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps(guidance).encode())
                    else:
                        print(f"[{session_id}] ❌ Vision error {resp.status_code}")
                        self.send_response(resp.status_code)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        error_response = json.dumps({
                            "error": "Vision service error",
                            "status": resp.status_code,
                            "session_id": session_id
                        })
                        self.wfile.write(error_response.encode())
                
                except requests.exceptions.Timeout:
                    print(f"[{session_id}] ❌ Vision timeout")
                    self.send_response(504)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    error_response = json.dumps({
                        "error": "Vision service timeout",
                        "session_id": session_id
                    })
                    self.wfile.write(error_response.encode())
                except Exception as e:
                    print(f"[{session_id}] ❌ Vision error: {e}")
                    self.send_response(502)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    error_response = json.dumps({
                        "error": str(e),
                        "session_id": session_id
                    })
                    self.wfile.write(error_response.encode())
            
            except json.JSONDecodeError:
                print("❌ Invalid JSON")
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            except Exception as e:
                print(f"❌ Handler error: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"✅ Vision Proxy listening on http://localhost:{PORT}")
        print(f"   Vision service: {VISION_URL}")
        print(f"   Webhook endpoint: http://localhost:{PORT}/webhook/navigator-screenshot")
        print(f"   Health check: http://localhost:{PORT}/health")
        httpd.serve_forever()
