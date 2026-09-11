#!/usr/bin/env python3
"""Run every suite of the render engine, and report which ones could not run.

    ./venv/bin/python run-tests.py

Each suite is a script with its own `main()`, not a pytest module: the engine has
no test dependency and adding one to check a CSS parser would cost more than it
buys. This driver exists so the ten of them are one command.

Four of the suites read the real corpus, which lives outside this repository.
Unconfigured, they are reported as **not run** rather than skipped quietly. A
corpus suite that passes on an empty directory is the worst of the three
outcomes: it measures nothing and says green.
"""

import os
import pathlib
import subprocess
import sys

HARNESS = pathlib.Path(__file__).resolve().parent

# Suites that assert against the corpus. Without a productions root they have
# nothing to read, and saying so is the point.
NEEDS_CORPUS = {
    "test_corpus_compose.py",
    "test_video_corpus.py",
    "test_plan_vs_peint.py",
    "test_gabarit_video.py",
    "test_ethni_soustitre.py",
    "test_rendus_intacts.py",
}


def main():
    suites = sorted(p.name for p in HARNESS.glob("test_*.py"))
    root = os.environ.get("ETHNIAFRICA_SOCIAL_OUTPUT", "").strip()
    corpus = bool(root) and pathlib.Path(root).expanduser().is_dir()

    failed, skipped = [], []
    for suite in suites:
        if suite in NEEDS_CORPUS and not corpus:
            skipped.append(suite)
            continue
        print(f"\n─── {suite}", flush=True)
        if subprocess.run([sys.executable, suite], cwd=HARNESS).returncode:
            failed.append(suite)

    if skipped:
        print(
            f"\n{len(skipped)} suite(s) non exécutée(s), faute de corpus — "
            "renseigne ETHNIAFRICA_SOCIAL_OUTPUT :",
            flush=True,
        )
        for suite in skipped:
            print(f"  · {suite}", flush=True)

    if failed:
        print(f"\n✖ {len(failed)} suite(s) en échec : {', '.join(failed)}", flush=True)
        return 1

    print(f"\n✔ {len(suites) - len(skipped)}/{len(suites)} suites passent", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
