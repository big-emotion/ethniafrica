"""Pace a raw TTS performance, then time the captions against the authored script.

Generic form of the pass written for « Corriger la carte ». Nothing here is
subject-specific: a project supplies `narration.fr.txt` and, optionally, a
`production.json` carrying `tempo` and `spokenNumerals`.

Two passes, in this order, because the reverse has already shipped a broken cut:
the punctuation gaps are inserted into the source performance FIRST, and only the
resulting narration.wav is transcribed for caption timing. Word clocks measured on
the unpaced take do not survive the edit.

    python3 ethni_audio.py <project-dir>

**One paragraph of narration is one scene.** `scene-starts.json` is derived from
the final paced audio, one entry per blank-line-separated block, so the renderer
never guesses a boundary.
"""
import pathlib, os, json, subprocess, wave, importlib.util, re, sys, hashlib
import numpy as np

from ethni_paths import resolve_project

HARNESS = pathlib.Path(__file__).resolve().parent
WF = HARNESS / "hf-workflows" / "subtitles" / "scripts"

spec = importlib.util.spec_from_file_location("cap", WF / "audio_to_captions.py")
cap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cap)

ROOT = resolve_project(sys.argv[1] if len(sys.argv) > 1 else None)
WORK = ROOT / "work"
WORK.mkdir(exist_ok=True)

config = {}
if (ROOT / "production.json").exists():
    config = json.loads((ROOT / "production.json").read_text(encoding="utf-8"))
TEMPO = float(config.get("tempo", 1.0))

# Whisper returns French elisions as separate tokens ("d" + "'être") and spells
# numerals out. Rejoin the elisions, and fold a spoken numeral back to the authored
# digit so a year keeps a measured clock instead of an interpolated one.
SPOKEN_NUMERALS = config.get("spokenNumerals", {})


def run(c):
    subprocess.run(c, check=True)


def dump(p, x):
    pathlib.Path(p).write_text(json.dumps(x, ensure_ascii=False, indent=2))


original_get = cap.get_words


def joined_words(*a, **kw):
    words, provider = original_get(*a, **kw)
    result = []
    for w in words:
        w = dict(w)
        t = w["word"]
        if result and not cap._normalize(t):
            result[-1]["word"] += t
        elif result and t.startswith(("'", "’", "-")):
            result[-1]["word"] += t
            result[-1]["end"] = w["end"]
        else:
            result.append(w)
    for w in result:
        folded = SPOKEN_NUMERALS.get(cap._normalize(w["word"]))
        if folded:
            w["word"] = folded
    dump(WORK / "whisper-latest-native.json", words)
    return result, provider


cap.get_words = joined_words

lines = [l.strip() for l in (ROOT / "narration.fr.txt").read_text(encoding="utf-8").split("\n\n") if l.strip()]
os.chdir(WORK)
dump("script_manifest.json", {"blocks": [{"vo_line": x} for x in lines]})

take = "tts-corrected.wav" if pathlib.Path("tts-corrected.wav").exists() else "tts-original.wav"
print("SOURCE TAKE", take, flush=True)
run(["ffmpeg", "-y", "-v", "error", "-i", take, "-c:a", "pcm_s16le", "source.wav"])

tokens = [t for line in lines for t in cap.TOKEN_PATTERN.findall(line)]
# The transcription is cached because it is the slow step, but the cache carries
# the digest of the take it transcribed. Keyed on nothing, it survived a re-take
# and handed the new performance the old words: measured at similarity 0,755,
# where the gate below held — a lighter edit would have gone through, and the film
# would have carried captions timed against a voice that no longer says them.
raw_file = pathlib.Path("raw-whisper.json")
empreinte_file = pathlib.Path("raw-whisper.source")
empreinte = hashlib.sha256(pathlib.Path("source.wav").read_bytes()).hexdigest()
cache_valide = (raw_file.exists() and empreinte_file.exists()
                and empreinte_file.read_text().strip() == empreinte)
if cache_valide:
    raw = json.loads(raw_file.read_text())
    provider = "faster-whisper (cached original)"
else:
    if raw_file.exists():
        print("PRISE CHANGÉE — transcription refaite", flush=True)
    raw, provider = cap.get_words(pathlib.Path("source.wav"), model_size="medium", language="fr")
dump("raw-whisper.json", raw)
empreinte_file.write_text(empreinte)
aligned, similarity = cap.align_words_to_script(raw, tokens)
# 0.80, not the reference's 0.90: the Afrique production established that a low
# score is a timing-confidence signal, not a caption defect. The hard gates below —
# full token coverage and normalised script equality — are unchanged.
assert similarity >= 0.80, similarity
dump("source-aligned-words.json", aligned)
print("RAW", round(similarity, 4), len(aligned), flush=True)

with wave.open("source.wav") as f:
    sr = f.getframerate()
    channels = f.getnchannels()
    assert f.getsampwidth() == 2
    samples = np.frombuffer(f.readframes(f.getnframes()), dtype="<i2").reshape(-1, channels).copy()

# Intended gap after each token, in final (post-tempo) seconds. The hook gets the
# long landing the format asks for; other block breaks get a change-of-idea beat.
targets = {}
offset = 0
for li, line in enumerate(lines):
    ts = cap.TOKEN_PATTERN.findall(line)
    for j, t in enumerate(ts[:-1]):
        if t.endswith(","):
            targets[offset + j] = 0.20
        elif t.endswith((".", "?", "!")):
            targets[offset + j] = 0.40
    offset += len(ts)
    if li < len(lines) - 1:
        targets[offset - 1] = 0.76 if li == 0 else (0.64 if line.endswith("?") else 0.48)

mono = samples.astype(np.float64).mean(axis=1) / 32768
silence_run = subprocess.run(
    ["ffmpeg", "-v", "info", "-i", "source.wav", "-af", "silencedetect=noise=-36dB:d=0.10", "-f", "null", "-"],
    capture_output=True, text=True, check=True)
sa = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", silence_run.stderr)]
sb = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", silence_run.stderr)]
silences = list(zip(sa, sb))
dump("source-silences.json", silences)

# Existing natural pauses count toward the target, so an identical silence is never
# added after every mark — that is what makes a read sound metronomic.
inserts = []
audit = []
for i, target in sorted(targets.items()):
    end = aligned[i]["end"]
    start = aligned[i + 1]["start"]
    gap = max(0, start - end)
    mid = (end + start) / 2
    region = next(((a, b) for a, b in silences if a - 0.06 <= mid <= b + 0.06), None)
    acoustic_gap = region[1] - region[0] if region else gap
    extra = max(0, target * TEMPO - acoustic_gap)
    rec = {"index": i, "word": aligned[i]["word"], "target_seconds": target,
           "source_gap": gap, "acoustic_gap": acoustic_gap, "insert_seconds_before_tempo": extra}
    if extra >= 0.01:
        lo = max(0, int((end + 0.005 if gap > 0.03 else end - 0.025) * sr))
        hi = min(len(samples) - 1, int((start - 0.005 if gap > 0.03 else start + 0.025) * sr))
        win = max(2, int(0.004 * sr))
        assert hi >= lo, (i, lo, hi)
        energy = np.convolve(mono[lo:hi + win] ** 2, np.ones(win) / win, mode="valid")
        pos = min(hi, lo + int(np.argmin(energy)) + win // 2)
        assert end - 0.031 <= pos / sr <= start + 0.031
        inserts.append((pos, round(extra * sr), i))
        rec["cut_seconds"] = pos / sr
    audit.append(rec)

parts = []
last = 0
for pos, count, i in inserts:
    part = samples[last:pos].copy()
    fade = min(round(0.002 * sr), len(part))
    if fade:
        part[-fade:] = (part[-fade:].astype(float) * np.linspace(1, 0, fade)[:, None]).astype("<i2")
    parts.extend([part, np.zeros((count, channels), dtype="<i2")])
    last = pos
parts.append(samples[last:])
paused = np.concatenate(parts)
assert len(paused) == len(samples) + sum(n for p, n, i in inserts)
with wave.open("paused.wav", "w") as f:
    f.setnchannels(channels)
    f.setsampwidth(2)
    f.setframerate(sr)
    f.writeframes(paused.tobytes())

if abs(TEMPO - 1.0) < 1e-6:
    run(["ffmpeg", "-y", "-v", "error", "-i", "paused.wav", "-c:a", "pcm_s16le", "narration.wav"])
else:
    run(["ffmpeg", "-y", "-v", "error", "-i", "paused.wav", "-af", f"atempo={TEMPO}",
         "-c:a", "pcm_s16le", "narration.wav"])
dump("pause-audit.json", {"tempo_factor": TEMPO, "pauses": audit,
                          "all_source_samples_retained_before_tempo": True})

orig_align = cap.align_words_to_script


def save_alignment(*a, **kw):
    words, sim = orig_align(*a, **kw)
    dump("aligned-words.json", words)
    return words, sim


cap.align_words_to_script = save_alignment
sys.argv = ["audio_to_captions.py", "narration.wav", "--script", "script_manifest.json",
            "--language", "fr", "--max-words", "3", "--max-chars", "24", "--model", "medium",
            "--json", "caps-report.json", "--srt", "caps.srt"]
assert cap.main() == 0
cap.align_words_to_script = orig_align

report = json.loads(pathlib.Path("caps-report.json").read_text())
words = json.loads(pathlib.Path("aligned-words.json").read_text())
# The two hard gates: every authored word is timed, and the captions say exactly
# what the approved script says. Neither is negotiable for a low similarity score.
assert report["caption_words"] == report["timed_words"] == len(tokens), (
    report["caption_words"], report["timed_words"], len(tokens))
assert cap._normalize(" ".join(c["text"] for c in report["captions"])) == cap._normalize(" ".join(lines))

starts = []
offset = 0
for line in lines:
    starts.append(round(words[offset]["start"] * 25) / 25)
    offset += len(cap.TOKEN_PATTERN.findall(line))
dump("scene-starts.json", starts)
print("FINAL", round(report["similarity"], 4), len(words), len(starts), "scenes", flush=True)
