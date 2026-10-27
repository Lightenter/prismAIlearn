#!/usr/bin/env python3
"""Reject staged environment files other than .env.example."""

from __future__ import annotations

import os
import re
import subprocess
import sys

ENV_FILENAME = re.compile(r"(^|/)\.env(?:$|\.)")


def main() -> int:
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        print("Impossible de lire l’index Git; commit refusé.", file=sys.stderr)
        return 2

    paths = [os.fsdecode(path) for path in result.stdout.split(b"\0") if path]
    blocked = sorted(
        path
        for path in paths
        if ENV_FILENAME.search(path) and os.path.basename(path) != ".env.example"
    )
    if blocked:
        print("Commit refusé : fichiers d’environnement non autorisés dans l’index Git :")
        for path in blocked:
            print(f"  {path}")
        print("Garde les secrets en local; seuls les fichiers .env.example sont autorisés.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
