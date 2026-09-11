"""A lot that fails a gate leaves `images/` exactly as it found it.

    ./venv/bin/python test_rendus_intacts.py

Mercator lost fifteen renders because the previous generation was carried out of
`images/` before the replacement was written — and the replacement never was, the
lot having failed gate 1 and gone to `_epreuves/`.

The engine is exercised on a real deck copied into a scratch directory, because
what is being asserted is a fact about the filesystem after a run, not about a
function's return value.
"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

from ethni_paths import productions_root

HARNESS = pathlib.Path(__file__).resolve().parent

PROJETS = productions_root()


def _empreinte(dossier):
    """Name and size of every render, which is what « unchanged » has to mean."""
    if not dossier.exists():
        return {}
    return {f.name: f.stat().st_size
            for f in dossier.iterdir() if f.suffix.lower() in (".png", ".jpg")}


def _deck_temporaire(source_nom, bac, casser_licence):
    """A copy of a real deck, pointed at the scratch directory."""
    source = PROJETS / source_nom
    projet = bac / source_nom
    shutil.copytree(source, projet)

    sujet = bac / "sujet"
    (sujet / "images").mkdir(parents=True)
    for i in range(3):
        # Stand-ins for a previous generation. Their content is irrelevant; what
        # matters is that they are still there, byte for byte, afterwards.
        (sujet / "images" / f"ancien_{i:02d}.png").write_bytes(b"\x89PNG\r\n\x1a\n" + bytes(64))

    deck = json.loads((projet / "cards.json").read_text(encoding="utf-8"))
    deck["outDir"] = str(sujet / "images")
    if casser_licence:
        deck["cartes"][0]["image"]["licence"] = ""     # gate 1 will refuse the lot
    (projet / "cards.json").write_text(json.dumps(deck, ensure_ascii=False, indent=2),
                                       encoding="utf-8")
    return projet, sujet


def _rendre(projet, *args):
    # `sys.executable`, not a venv path spelled out here: the suite must render
    # with whatever interpreter launched it. The hardcoded `venv/bin/python`
    # worked only while the engine and its virtualenv shared a directory, and
    # silently ran a *different* interpreter than the one under test as soon as
    # they did not.
    return subprocess.run(
        [sys.executable, str(HARNESS / "ethni_carrousel2.py"),
         str(projet), *args],
        capture_output=True, text=True, cwd=HARNESS)


def test_a_failed_gate_leaves_images_untouched():
    """The Mercator loss, pinned.

    A lot refused by a gate is rendered — it always is — but into `_epreuves/`.
    `images/` is not its business.
    """
    with tempfile.TemporaryDirectory() as bac:
        bac = pathlib.Path(bac)
        projet, sujet = _deck_temporaire("Pays-Benin", bac, casser_licence=True)

        avant = _empreinte(sujet / "images")
        assert avant, "le décor du test doit poser une génération précédente"

        r = _rendre(projet, "--remplacer")
        assert "ÉPREUVE" in r.stdout, r.stdout[-400:]

        apres = _empreinte(sujet / "images")
        assert apres == avant, (
            f"images/ a changé sur un lot refusé : {sorted(set(avant) - set(apres))} "
            f"disparus, {sorted(set(apres) - set(avant))} ajoutés")
        assert not (sujet / "_rendus-remplaces").exists(), (
            "un lot refusé ne doit rien écarter")
        assert _empreinte(sujet / "_epreuves"), "l'épreuve doit être rendue quand même"


def test_a_passing_lot_replaces_only_after_writing():
    """The set-aside happens after the write, and only over what was there before."""
    with tempfile.TemporaryDirectory() as bac:
        bac = pathlib.Path(bac)
        projet, sujet = _deck_temporaire("Pays-Benin", bac, casser_licence=False)

        avant = _empreinte(sujet / "images")
        r = _rendre(projet, "--remplacer")
        assert "ÉPREUVE" not in r.stdout, r.stdout[-400:]

        ecartes = _empreinte(sujet / "_rendus-remplaces")
        assert set(ecartes) == set(avant), (
            f"les écartés devraient être exactement l'ancienne génération : "
            f"{sorted(set(avant) ^ set(ecartes))}")

        nouveaux = _empreinte(sujet / "images")
        assert nouveaux, "aucun rendu écrit"
        assert not (set(nouveaux) & set(avant)), (
            "l'ancienne génération ne doit plus être dans images/")


def test_nothing_is_deleted_only_moved():
    """The atelier has no version control, so a delete here is final."""
    with tempfile.TemporaryDirectory() as bac:
        bac = pathlib.Path(bac)
        projet, sujet = _deck_temporaire("Pays-Benin", bac, casser_licence=False)

        avant = _empreinte(sujet / "images")
        _rendre(projet, "--remplacer")

        survivants = {**_empreinte(sujet / "images"),
                      **_empreinte(sujet / "_rendus-remplaces"),
                      **_empreinte(sujet / "_epreuves")}
        perdus = set(avant) - set(survivants)
        assert not perdus, f"fichiers perdus : {sorted(perdus)}"


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
