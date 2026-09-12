"""Reads the repository's `.env.local`, which Python otherwise cannot see.

`.env.local` is where this repository already keeps a developer's configuration,
and it is the first place anyone looks for it. But it is a Next convention: the
framework parses it at boot, and `os.environ` knows nothing about it. Without
this module the two directories the engine needs would have to be declared a
second time in a shell profile, and the two declarations would disagree the first
time one of them moved.

Deliberately hand-rolled rather than a dependency. The engine pins three packages
exact because they decide what the pixels look like; adding a fourth to parse
`KEY=value` would be a fourth thing to keep in step for twenty lines of work.

Two rules make it safe to call at import time:

- **The environment wins.** A variable already set is never overwritten, so a
  one-off `ETHNIAFRICA_SOCIAL_PROJECTS=/tmp/essai …` still works.
- **An empty value is not a value.** `.env.example` ships every key empty; read
  as a setting, it would mask the shell and turn "not configured" into
  "configured to nothing", which the resolver reads as its fallback.
"""

import os
import pathlib

HARNESS = pathlib.Path(__file__).resolve().parent
ENV_LOCAL = HARNESS.parents[1] / ".env.local"


def read_env_file(path):
    """Parse `KEY=value` lines. A missing file is an empty result, not an error."""
    values = {}
    try:
        text = pathlib.Path(path).read_text(encoding="utf-8")
    except (FileNotFoundError, NotADirectoryError, IsADirectoryError):
        return values

    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].lstrip()
        name, separator, value = line.partition("=")
        if not separator:
            continue
        name = name.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if name and value:
            values[name] = value
    return values


def load_into_environ(path=ENV_LOCAL):
    """Fill what the environment does not already declare."""
    for name, value in read_env_file(path).items():
        os.environ.setdefault(name, value)
