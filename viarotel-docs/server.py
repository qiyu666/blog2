import http.server
import os
import mimetypes

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class VitePressHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        raw_path = self.path.split('?')[0].split('#')[0]
        path = raw_path
        # 去除 Windows 反斜杠问题，统一用 /
        rel = path.lstrip('/').replace('\\', '/')
        full_path = os.path.join(DIRECTORY, *rel.split('/')) if rel else DIRECTORY

        # 1. 直接是文件
        if os.path.isfile(full_path):
            self.serve_file(full_path)
            return

        # 2. 如果是目录 → 目录/index.html
        if os.path.isdir(full_path):
            index_path = os.path.join(full_path, 'index.html')
            if os.path.isfile(index_path):
                self.serve_file(index_path)
                return

        # 3. 路径以 / 结尾，但目录不存在，尝试去掉 / 后当文件 +.html 或同名目录
        if path.endswith('/'):
            # full_path 按目录查过了，尝试去掉末尾 / 再加 .html
            no_slash = path.rstrip('/')
            rel_ns = no_slash.lstrip('/').replace('\\', '/')
            fp_ns = os.path.join(DIRECTORY, *rel_ns.split('/')) if rel_ns else DIRECTORY
            html_path = fp_ns + '.html'
            if os.path.isfile(html_path):
                self.serve_file(html_path)
                return
            # 同名目录 (去掉末尾 / 再拼 index.html)
            if os.path.isdir(fp_ns):
                index_path = os.path.join(fp_ns, 'index.html')
                if os.path.isfile(index_path):
                    self.serve_file(index_path)
                    return

        # 4. 不是 .html 结尾 → +.html
        if not path.endswith('.html'):
            html_path = full_path + '.html'
            if os.path.isfile(html_path):
                self.serve_file(html_path)
                return

        # 5. 没有扩展名 → 同名目录/index.html
        if not os.path.splitext(path)[1]:
            index_path = os.path.join(full_path, 'index.html')
            if os.path.isfile(index_path):
                self.serve_file(index_path)
                return

        # Fallback: 根目录 404 页面
        self.send_error(404, "File not found: " + path)

    def log_message(self, format, *args):
        # 打印简单日志，便于排查
        print("[REQ] %s" % (format % args))
    
    def serve_file(self, filepath):
        ctype, _ = mimetypes.guess_type(filepath)
        if ctype is None:
            if filepath.endswith('.js'):
                ctype = 'application/javascript; charset=utf-8'
            elif filepath.endswith('.css'):
                ctype = 'text/css; charset=utf-8'
            elif filepath.endswith('.woff2'):
                ctype = 'font/woff2'
            else:
                ctype = 'application/octet-stream'
        
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', os.path.getsize(filepath))
        self.end_headers()
        
        with open(filepath, 'rb') as f:
            self.wfile.write(f.read())
    
    def log_message(self, format, *args):
        pass

server = http.server.HTTPServer(("", PORT), VitePressHandler)
print(f"Serving at http://localhost:{PORT}")
print(f"Directory: {DIRECTORY}")
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
    server.server_close()