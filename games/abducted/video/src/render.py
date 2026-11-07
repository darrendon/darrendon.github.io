#!/usr/bin/env python3
"""Render the Abducted pitch video from compose.html. Site served on :8124 from the repo root.
  python3 render.py stills t1 t2 ...   save full-size frames at those times (seconds) to /tmp for checking
  python3 render.py video              render every scene, join them, add voiceover.m4a if present
timing.json holds the scene durations (seconds), cut to the voiceover; see align.py."""
import sys, os, json, subprocess, shutil
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); VID = os.path.dirname(HERE)
URL = 'http://localhost:8124/games/abducted/video/src/compose.html'
FPS = 30
T = json.load(open(os.path.join(HERE, 'timing.json')))
D = T['durations']
ENC = ['-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', str(FPS)]

def where(t):
    for k, d in enumerate(D):
        if t < d or k == len(D) - 1: return k, min(t, d)
        t -= d

def page(b):
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
    pg.goto(URL); pg.wait_for_function('window.__ready === true', timeout=60000)
    pg.evaluate('(d) => window.setDurations(d)', D)
    return pg

def stills(times):
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = page(b)
        for t in times:
            k, u = where(float(t)); pg.evaluate('([k, u]) => window.frame(k, u)', [k, u]); pg.wait_for_timeout(120)
            out = f'/tmp/claude-0/shots/vid-{float(t):05.1f}.jpg'; pg.screenshot(path=out, type='jpeg', quality=90); print(out, 'scene', k)
        b.close()

def video():
    tmp = os.path.join(HERE, 'build'); os.makedirs(tmp, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = page(b)
        files = []
        for k, d in enumerate(D):
            n = round(d * FPS); part = os.path.join(tmp, f'scene{k:02d}.part.mp4'); done = os.path.join(tmp, f'scene{k:02d}.mp4')
            ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-'] + ENC + [part], stdin=subprocess.PIPE)
            for f in range(n):
                pg.evaluate('([k, u]) => window.frame(k, u)', [k, f / FPS])
                ff.stdin.write(pg.screenshot(type='jpeg', quality=92))
            ff.stdin.close()
            if ff.wait() != 0: raise SystemExit('ffmpeg failed on scene %d' % k)
            os.replace(part, done); files.append(done); print('scene', k, f'{d:.2f}s')
        b.close()
    lst = os.path.join(tmp, 'list.txt'); open(lst, 'w').write(''.join(f"file '{f}'\n" for f in files))
    silent = os.path.join(tmp, 'silent.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent], check=True)
    out = os.path.join(VID, 'abducted-pitch.mp4'); vo = os.path.join(HERE, 'voiceover.m4a')
    if os.path.exists(vo):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-itsoffset', str(T.get('lead', 0)), '-i', vo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], check=True)
    else:
        shutil.copy(silent, os.path.join(tmp, 'draft-silent.mp4')); out = os.path.join(tmp, 'draft-silent.mp4')
    print('wrote', out)

if __name__ == '__main__':
    if sys.argv[1] == 'stills': stills(sys.argv[2:])
    else: video()
