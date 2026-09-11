"""Checks that the engine reads the repository's own `.env.local`.

    ./venv/bin/python test_ethni_env.py

`.env.local` is where this repository already keeps a developer's configuration,
and it is the first place anyone looks. But only Next reads it: `os.environ`
knows nothing about it, so without the loader under test here the two directories
the engine needs would have to be declared a second time in a shell profile — and
the two copies would disagree the first time one of them moved.

The precedence is the part worth pinning. A variable already in the environment
always wins, so a one-off `ETHNIAFRICA_SOCIAL_PROJECTS=/tmp/essai ./venv/bin/python …`
still overrides the file rather than being silently ignored.
"""
import os
import sys
import tempfile

import ethni_env


def test_a_plain_assignment_is_read():
    with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as f:
        f.write("ETHNI_TEST_PLAIN=une-valeur\n")
        chemin = f.name
    lu = ethni_env.read_env_file(chemin)
    assert lu == {"ETHNI_TEST_PLAIN": "une-valeur"}, lu


def test_comments_blank_lines_and_export_are_handled():
    with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as f:
        f.write("# un commentaire\n\nexport ETHNI_TEST_EXPORT=oui\n")
        chemin = f.name
    lu = ethni_env.read_env_file(chemin)
    assert lu == {"ETHNI_TEST_EXPORT": "oui"}, lu


def test_surrounding_quotes_are_stripped():
    # `.env.example` quotes its paths, and a quoted path used verbatim resolves
    # to a directory whose name starts with a double quote.
    with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as f:
        f.write('ETHNI_TEST_QUOTED="/un/chemin avec espace"\n')
        chemin = f.name
    lu = ethni_env.read_env_file(chemin)
    assert lu == {"ETHNI_TEST_QUOTED": "/un/chemin avec espace"}, lu


def test_an_empty_value_is_not_a_value():
    # `.env.example` ships every key with an empty value. Loaded as a real
    # setting, it would mask the shell and turn "not configured" into
    # "configured to nothing" — which the resolver reads as the fallback.
    with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as f:
        f.write("ETHNI_TEST_EMPTY=\n")
        chemin = f.name
    assert ethni_env.read_env_file(chemin) == {}


def test_a_missing_file_is_not_an_error():
    assert ethni_env.read_env_file("/aucun/fichier/ici.env") == {}


def test_the_environment_wins_over_the_file():
    with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as f:
        f.write("ETHNI_TEST_PRECEDENCE=depuis-le-fichier\n")
        chemin = f.name
    os.environ["ETHNI_TEST_PRECEDENCE"] = "depuis-le-shell"
    try:
        ethni_env.load_into_environ(chemin)
        assert os.environ["ETHNI_TEST_PRECEDENCE"] == "depuis-le-shell"
    finally:
        os.environ.pop("ETHNI_TEST_PRECEDENCE", None)


def test_a_variable_absent_from_the_environment_is_filled():
    with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as f:
        f.write("ETHNI_TEST_FILLED=depuis-le-fichier\n")
        chemin = f.name
    os.environ.pop("ETHNI_TEST_FILLED", None)
    try:
        ethni_env.load_into_environ(chemin)
        assert os.environ["ETHNI_TEST_FILLED"] == "depuis-le-fichier"
    finally:
        os.environ.pop("ETHNI_TEST_FILLED", None)


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
