"""Checks where a production is allowed to land, now that the engine is versioned.

    ./venv/bin/python test_ethni_paths.py

Plain assertions rather than pytest, like the rest of the harness.

The engine used to live beside the productions, so "the library" and "where this
file sits" were the same answer and one constant served both. They are now two
different machines' worth of concern: the engine is in a public repository, the
productions are the operator's own and stay out of it. Every assertion here is
one half of that split, and the last two are the accident the split must not
reopen — a render writing into somebody's source tree.
"""
import os
import pathlib
import sys
import tempfile

import ethni_paths as paths


def test_the_declared_destination_wins():
    with tempfile.TemporaryDirectory() as ailleurs:
        os.environ[paths.ENV_VAR] = ailleurs
        try:
            assert paths.productions_root() == pathlib.Path(ailleurs).resolve()
        finally:
            os.environ.pop(paths.ENV_VAR, None)


def test_a_bare_subject_resolves_under_the_declared_destination():
    with tempfile.TemporaryDirectory() as ailleurs:
        os.environ[paths.ENV_VAR] = ailleurs
        try:
            attendu = pathlib.Path(ailleurs).resolve() / "Ghana"
            assert paths.resolve_project("Ghana") == attendu
        finally:
            os.environ.pop(paths.ENV_VAR, None)


def test_without_a_declaration_productions_land_in_the_checkout_output():
    # Not an error, and deliberately so: rendering must work on a fresh clone
    # with nothing configured. `output/` is gitignored, so the files are lost
    # with the worktree rather than committed — which is the point of the
    # environment variable, not a defect of the fallback.
    ancien = os.environ.pop(paths.ENV_VAR, None)
    try:
        assert paths.productions_root() == paths.FALLBACK
        assert paths.resolve_project("Ghana") == paths.FALLBACK / "Ghana"
    finally:
        if ancien is not None:
            os.environ[paths.ENV_VAR] = ancien


def test_the_engine_living_in_a_checkout_does_not_block_its_own_fallback():
    # The whole reason the old guard had to be relaxed. `assert_not_in_checkout`
    # refused any path with a `.git` ancestor, and the fallback now has one:
    # this repository.
    assert (paths.REPO / ".git").exists(), "le harnais doit vivre dans un dépôt"
    assert paths.assert_writable(paths.FALLBACK / "Ghana")


def test_another_checkout_is_still_refused():
    with tempfile.TemporaryDirectory() as racine:
        depot = pathlib.Path(racine) / "un-autre-depot"
        (depot / ".git").mkdir(parents=True)
        cible = depot / "output" / "Ghana"
        try:
            paths.assert_writable(cible)
        except SystemExit as refus:
            assert "dépôt git" in str(refus), f"message inattendu : {refus}"
        else:
            raise AssertionError(
                f"une écriture dans un dépôt git a été acceptée : {cible}")


def test_a_path_outside_any_checkout_is_taken_at_face_value():
    with tempfile.TemporaryDirectory() as ailleurs:
        cible = pathlib.Path(ailleurs) / "Ghana"
        assert paths.resolve_project(str(cible)) == cible.resolve()


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
        except Exception as e:  # noqa: BLE001 — a runner reports, it does not raise
            failed += 1
            print(f"FAIL  {t.__name__}\n      {e}", flush=True)
        else:
            print(f"ok    {t.__name__}", flush=True)
    print(f"\n{len(tests) - failed}/{len(tests)} passent", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
