"""Where a production writes, and the one place it must never write.

Every renderer here took its project directory from `argv[1]` and trusted it.
That is how 1,2 Go of masters, rushes and one-off build scripts came to live in
a site checkout under `output/`, which is gitignored and therefore backed up by
nothing at all. The path was never wrong in the code; it was wrong on the command
line, once, and no one noticed for a month.

So the destination is resolved here instead of in each script.

The engine used to sit beside the productions, which let one constant answer two
questions at once: where this file lives, and where a render goes. Versioning the
engine split them. `ETHNIAFRICA_SOCIAL_OUTPUT` now names the directory holding one
subdirectory per subject — normally the production library, outside this
repository, because productions are large and git is not a media store.

Unset, a render lands under the checkout's own `output/`. That is deliberate: a
fresh clone must be able to render without configuring anything. `output/` is
gitignored, so those files are lost with the worktree rather than committed —
which is the argument for setting the variable, not a defect of the fallback.

The guard that refuses a git checkout stays, minus the one case that now has to
work: the engine itself lives in one. Our own `output/` is allowed; any other
path with a `.git` ancestor is still refused, because "has a `.git` ancestor"
remains an exact test for "this is somebody's source tree" and costs no
configuration.
"""

import os
import pathlib
import sys

ENV_VAR = "ETHNIAFRICA_SOCIAL_OUTPUT"

HARNESS = pathlib.Path(__file__).resolve().parent
REPO = HARNESS.parents[1]
FALLBACK = REPO / "output" / "social"


def productions_root():
    """The directory holding one subdirectory per subject."""
    declared = os.environ.get(ENV_VAR, "").strip()
    if declared:
        return pathlib.Path(declared).expanduser().resolve()
    return FALLBACK


def assert_writable(path):
    """Refuse a destination inside a git working tree, except our own output/."""
    if path == FALLBACK or FALLBACK in path.parents:
        return path
    for parent in [path, *path.parents]:
        if (parent / ".git").exists():
            raise SystemExit(
                f"refus d'écrire dans un dépôt git : {path}\n"
                f"dépôt détecté : {parent}\n"
                f"les productions vivent sous {productions_root()}\n"
                f"déclare {ENV_VAR} pour les écrire ailleurs"
            )
    return path


def resolve_project(arg=None):
    """A subject name, a relative path or an absolute one, never a checkout.

    A single-segment argument that does not already name something on disk is
    read as a subject and resolved under the productions root. Anything else is
    taken at face value, so an explicit path still works for a one-off.
    """
    if arg is None:
        raise SystemExit(
            f"usage: {pathlib.Path(sys.argv[0]).name} <sujet|chemin>\n"
            f"un sujet nu est résolu sous {productions_root()}"
        )
    candidate = pathlib.Path(arg).expanduser()
    if len(candidate.parts) == 1 and not candidate.exists():
        candidate = productions_root() / candidate
    return assert_writable(candidate.resolve())
