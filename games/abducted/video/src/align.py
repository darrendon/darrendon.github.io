#!/usr/bin/env python3
"""Cut the video to the voiceover: python3 align.py voiceover.m4a\nIf cues.json is here (a hand cut to the recording), it is used instead of the pause-finding below.
Finds the pauses between the script's paragraphs (the longest silences), writes timing.json (one scene per
paragraph, each starting in the middle of the pause before it) and ../abducted-pitch.vtt (one caption per
sentence, timed by its share of the paragraph's speech)."""
import sys, re, json, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__)); VID = os.path.dirname(HERE)
SCRIPT = [p.strip() for p in open(os.path.join(HERE, 'script.txt')).read().split('\n\n') if p.strip()]
src = sys.argv[1]
CUES = os.path.join(HERE, 'cues.json')
if os.path.exists(CUES):   # a hand cut to the recording wins over pause-finding (used when the read strays from script.txt)
    C = json.load(open(CUES)); LEAD = 0.6
    bounds = [0.0] + [LEAD + (a + b) / 2 for a, b in C['gaps']] + [LEAD + C['speech_end'] + 2.2]
    durs = [round(b - a, 3) for a, b in zip(bounds, bounds[1:])]
    json.dump({'durations': durs, 'lead': LEAD, 'source': os.path.basename(src)}, open(os.path.join(HERE, 'timing.json'), 'w'), indent=1)
    fmt = lambda t: '%02d:%02d:%06.3f' % (t // 3600, t % 3600 // 60, t % 60)
    vtt = 'WEBVTT\n\n' + ''.join(f'{i + 1}\n{fmt(a + LEAD)} --> {fmt(b + LEAD)}\n{t}\n\n' for i, (a, b, t) in enumerate(C['cues']))
    open(os.path.join(VID, 'abducted-pitch.vtt'), 'w').write(vtt)
    print('from cues.json; scenes:', durs, 'total', round(sum(durs), 2)); raise SystemExit
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
log = subprocess.run(['ffmpeg', '-i', src, '-af', 'silencedetect=noise=-34dB:d=0.25', '-f', 'null', '-'], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]; ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
sil = [(s, e) for s, e in zip(starts, ends)]
speech_start = sil[0][1] if sil and sil[0][0] < 0.05 else 0.0
speech_end = sil[-1][0] if sil and sil[-1][1] > dur - 0.05 else dur
inner = [(s, e) for s, e in sil if s > speech_start + 0.1 and e < speech_end - 0.1]
n = len(SCRIPT)
gaps = sorted(sorted(inner, key=lambda g: g[1] - g[0], reverse=True)[:n - 1])
if len(gaps) < n - 1: raise SystemExit(f'found only {len(gaps)} pauses for {n} paragraphs; leave a short pause between paragraphs')
LEAD = 0.6   # the title shows a moment before the first word
bounds = [0.0] + [LEAD + (s + e) / 2 for s, e in gaps] + [LEAD + speech_end + 2.2]
durs = [round(b - a, 3) for a, b in zip(bounds, bounds[1:])]
json.dump({'durations': durs, 'lead': LEAD, 'source': os.path.basename(src)}, open(os.path.join(HERE, 'timing.json'), 'w'), indent=1)
# captions: each paragraph's speech runs from the end of the pause before it to the start of the pause after it
spans = [(speech_start, gaps[0][0])] + [(gaps[i][1], gaps[i + 1][0]) for i in range(len(gaps) - 1)] + [(gaps[-1][1], speech_end)]
fmt = lambda t: '%02d:%02d:%06.3f' % (t // 3600, t % 3600 // 60, t % 60)
cues = []
for text, (a, b) in zip(SCRIPT, spans):
    sents = [s.strip() for s in re.split(r'(?<=[.?!:])\s+', text.replace('\n', ' ')) if s.strip()]
    tot = sum(len(s) for s in sents); t = a
    for s in sents:
        d = (b - a) * len(s) / tot; cues.append((t + LEAD, t + d + LEAD, s.replace('*', ''))); t += d
vtt = 'WEBVTT\n\n' + ''.join(f'{i + 1}\n{fmt(a)} --> {fmt(b)}\n{t}\n\n' for i, (a, b, t) in enumerate(cues))
open(os.path.join(VID, 'abducted-pitch.vtt'), 'w').write(vtt)
print('speech', round(speech_start, 2), '-', round(speech_end, 2), 'of', round(dur, 2), 's; scenes:', durs, 'total', round(sum(durs), 2))
