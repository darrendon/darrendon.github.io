import sys, threading, http.server, functools, base64, os, json
from playwright.sync_api import sync_playwright
SP = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.abspath(os.path.join(SP, '../../../..'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, path):
        if path.startswith('/__h/'): return os.path.join(SP, path[5:].split('?')[0])
        return super().translate_path(path)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8767), functools.partial(Q, directory=SITE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
# args: mode(check|shoot) view:w:h[:pr[:out]] ...
mode = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1700, 'height': 1100}, device_scale_factor=(2 if mode == 'shoot' else 1))
    pg.goto('http://127.0.0.1:8767/__h/harness.html')
    for spec in sys.argv[2:]:
        parts = spec.split(':'); view, w, h = parts[0], int(parts[1]), int(parts[2])
        pr = float(parts[3]) if len(parts) > 3 else 1; out = parts[4] if len(parts) > 4 else f'{SP}/out-{view}.png'
        r = pg.evaluate(f"run('{view}', {w}, {h}, {pr}, {'true' if mode == 'check' else 'false'})")
        if mode == 'check':
            c = r['check']
            print(f"{view}: {c['objects']} objects | overlap {len(c['overlap'])} | near {len(c['near'])} | cut {len(c['cut'])} | empty {len(c['empty'])}")
            for k in ('overlap', 'near'):
                for a, d, n in c[k]: print(f'   {k}: {a} x {d} ({n})')
            for x in c['cut']: print('   cut:', x)
            for x in c['empty']: print('   off-screen:', x)
        else:
            open(out, 'wb').write(base64.b64decode(r['png'].split(',')[1])); print('saved', out)
    b.close()
srv.shutdown()
