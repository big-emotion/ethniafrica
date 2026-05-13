#!/usr/bin/env bash
# transcribe.sh — Transcribe an audio or video file to text.
# Auto-detects (in order): whisper.cpp, openai-whisper (Python), OpenAI API.
# Usage: transcribe.sh <path-to-audio-or-video> [language]
# Output: prints transcript to stdout. Non-zero exit on failure.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <audio-or-video-file> [language]" >&2
  exit 2
fi

INPUT="$1"
LANG="${2:-fr}"

if [ ! -f "$INPUT" ]; then
  echo "Error: file not found: $INPUT" >&2
  exit 2
fi

# If the input is video, extract audio first.
EXT="${INPUT##*.}"
WORKDIR=""
AUDIO="$INPUT"
case "$(echo "$EXT" | tr '[:upper:]' '[:lower:]')" in
  mp4|mov|mkv|webm|avi)
    if ! command -v ffmpeg >/dev/null 2>&1; then
      echo "Error: ffmpeg required to extract audio from video." >&2
      exit 3
    fi
    WORKDIR="$(mktemp -d)"
    AUDIO="$WORKDIR/audio.m4a"
    ffmpeg -loglevel error -y -i "$INPUT" -vn -acodec copy "$AUDIO" 2>/dev/null \
      || ffmpeg -loglevel error -y -i "$INPUT" -vn "$AUDIO"
    ;;
esac

cleanup() { [ -n "$WORKDIR" ] && rm -rf "$WORKDIR"; }
trap cleanup EXIT

# 1. whisper.cpp (local, fastest if available)
if command -v whisper-cli >/dev/null 2>&1; then
  whisper-cli -m "${WHISPER_MODEL:-models/ggml-base.bin}" -l "$LANG" -f "$AUDIO" -otxt -of "$AUDIO.out" >/dev/null
  cat "$AUDIO.out.txt"
  exit 0
fi

if command -v main >/dev/null 2>&1 && [ -n "${WHISPER_CPP_MODEL:-}" ]; then
  main -m "$WHISPER_CPP_MODEL" -l "$LANG" -f "$AUDIO" -otxt -of "$AUDIO.out" >/dev/null
  cat "$AUDIO.out.txt"
  exit 0
fi

# 2. openai-whisper Python package (local)
if command -v whisper >/dev/null 2>&1; then
  whisper "$AUDIO" --language "$LANG" --output_format txt --output_dir "$(dirname "$AUDIO")" --model "${WHISPER_MODEL:-base}" >/dev/null
  BASE="$(basename "$AUDIO")"
  cat "$(dirname "$AUDIO")/${BASE%.*}.txt"
  exit 0
fi

# 3. OpenAI API fallback
if [ -n "${OPENAI_API_KEY:-}" ]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "Error: curl required for OpenAI API fallback." >&2
    exit 3
  fi
  curl -sS https://api.openai.com/v1/audio/transcriptions \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: multipart/form-data" \
    -F file="@$AUDIO" \
    -F model="whisper-1" \
    -F language="$LANG" \
    -F response_format="text"
  exit 0
fi

echo "Error: no transcription backend found." >&2
echo "Install one of:" >&2
echo "  - whisper.cpp (brew install whisper-cpp), then set WHISPER_MODEL=path/to/ggml-base.bin" >&2
echo "  - openai-whisper (pip install -U openai-whisper)" >&2
echo "  - or set OPENAI_API_KEY for the API fallback" >&2
exit 4
