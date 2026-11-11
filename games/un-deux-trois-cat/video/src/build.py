#!/usr/bin/env python3
"""Builds ../un-deux-trois-cat-pitch.mp4: the gameplay shots filmed by film.py (build/s1..s7) spliced into the rest of
the video, under Darren's voiceover.

The title, the two explainer boards, the kit and the end card are not rebuilt here: they come from base.mp4, a copy of
the published video (kept out of git; without it the published file itself is the base, which works the same but
compresses those shots once more). The voiceover is base.mp4's audio, copied untouched, so the picture is cut to it:
frame numbers below are at 30 fps on the finished video.

  gameplay  frames  719-1865 (24.0-62.2 s): s1 chant and cat, s2 the fish, s3 two toys, s4 decoys, s5 six players, s6 result
  Cat Paw   frames 2126-2267 (70.9-75.6 s): s7
Segments crossfade into each other over 10 frames, and into and out of the base over 10 frames (against a held base frame,
because the base's own frames there are mid-fade to the old shots).   python3 build.py [crf]"""
import os, sys, subprocess
from PIL import Image
from film import SEG, END, BUILD, HERE

W, H, FPS = 1920, 1080, 30
OUT = os.path.join(os.path.dirname(HERE), "un-deux-trois-cat-pitch.mp4")
BASE = os.path.join(HERE, "base.mp4") if os.path.exists(os.path.join(HERE, "base.mp4")) else OUT
RUNS = [(["s1", "s2", "s3", "s4", "s5", "s6"], 718, 1866), (["s7"], 2125, 2268)]    # segments, held base frame before, held base frame after
X = 10

def base_frame(n):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", BASE, "-vf", f"select=eq(n\\,{n})", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return Image.frombytes("RGB", (W, H), raw)
def shot(seg, f):
    return Image.open(os.path.join(BUILD, seg, "%05d.jpg" % (f - SEG[seg]))).convert("RGB")
def new_frame(segs, f):
    for i, s in enumerate(segs):
        if SEG[s] <= f <= END[s]:
            im = shot(s, f)
            if i + 1 < len(segs) and f >= SEG[segs[i + 1]]:           # the overlap: fade into the next segment
                im = Image.blend(im, shot(segs[i + 1], f), (f - SEG[segs[i + 1]] + 1) / (X + 1))
            return im
    raise SystemExit("no segment covers frame %d" % f)

def main(crf):
    held = {n: base_frame(n) for _, a, b in RUNS for n in (a, b)}
    tmp = OUT + ".part.mp4"
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", BASE, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", BASE,
                            "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", str(crf), "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "copy",
                            "-movflags", "+faststart", tmp], stdin=subprocess.PIPE)
    f = 0
    while True:
        raw = dec.stdout.read(W * H * 3)
        if len(raw) < W * H * 3: break
        for segs, a, b in RUNS:
            if a < f < b:
                im = new_frame(segs, f)
                if f - a <= X: im = Image.blend(held[a], im, (f - a) / (X + 1))
                if b - f <= X: im = Image.blend(held[b], im, (b - f) / (X + 1))
                raw = im.tobytes()
        enc.stdin.write(raw); f += 1
    enc.stdin.close()
    if enc.wait() != 0: raise SystemExit("encode failed")
    os.replace(tmp, OUT); print("wrote", OUT, f, "frames")

if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 24)
