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
sys.path.insert(0, str(HARNESS))

import ethni_env  # noqa: E402 — the path above is what makes it importable

# The suites resolve their own roots, but this driver decides which of them can
# run at all. Reading `os.environ` alone, it declared six suites unrunnable on a
# machine that had the workshop configured in `.env.local` all along.
ethni_env.load_into_environ()

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


def _rebind_to_the_venv():
    """Re-exec under the engine's own interpreter, or say why it cannot.

    The npm script used to spell `social/harness/venv/bin/python` out, which made
    the dead-code gate report an unlisted binary — and, worse, failed with a bare
    "no such file" on a machine that had never built the venv. Bootstrapping here
    keeps the entry point one file and lets the message name the fix.
    """
    venv = HARNESS / "venv"
    interpreter = venv / "bin" / "python"
    if not interpreter.exists():
        print(
            "aucun environnement virtuel dans social/harness/venv.\n"
            "  python3 -m venv social/harness/venv\n"
            "  social/harness/venv/bin/python -m pip install -r "
            "social/harness/requirements.txt",
            flush=True,
        )
        return False

    # `sys.prefix`, not the interpreter's path. A venv's `bin/python` is a symlink
    # to the system interpreter, so comparing resolved binaries says "already
    # there" from *outside* the venv — the exec never happened, every suite ran
    # against the system packages, and two of them failed on a missing numpy
    # while eight passed because they import nothing. `sys.prefix` is the one
    # value a venv actually changes.
    if pathlib.Path(sys.prefix).resolve() != venv.resolve():
        os.execv(
            str(interpreter),
            [str(interpreter), str(HARNESS / "run-tests.py"), *sys.argv[1:]],
        )
    return True


def main():
    if not _rebind_to_the_venv():
        return 1

    suites = sorted(p.name for p in HARNESS.glob("test_*.py"))
    root = os.environ.get("ETHNIAFRICA_SOCIAL_PROJECTS", "").strip()
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
            "renseigne ETHNIAFRICA_SOCIAL_PROJECTS :",
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
