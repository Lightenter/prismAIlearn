#!/usr/bin/env python3
"""Exercise the actual pre-commit hook in a disposable Git repository."""

from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
CHECKER = ROOT / "scripts" / "check-staged-env-files.py"
HOOK = ROOT / ".githooks" / "pre-commit"


def git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="git-env-guard-test-") as temp:
        repo = Path(temp)
        (repo / "scripts").mkdir()
        (repo / ".githooks").mkdir()
        shutil.copy2(CHECKER, repo / "scripts" / CHECKER.name)
        shutil.copy2(HOOK, repo / ".githooks" / HOOK.name)

        init = git(repo, "init", "-q")
        if init.returncode != 0:
            print("Échec : impossible d’initialiser le dépôt temporaire.")
            return 1
        for key, value in (("user.name", "Safety Test"), ("user.email", "safety-test@example.invalid"), ("core.hooksPath", ".githooks")):
            configured = git(repo, "config", key, value)
            if configured.returncode != 0:
                print("Échec : impossible de configurer le dépôt temporaire.")
                return 1
        (repo / ".githooks" / "pre-commit").chmod(0o755)

        (repo / ".env.example").write_text("GEMINI_API_KEY=\n", encoding="utf-8")
        (repo / "README.md").write_text("test\n", encoding="utf-8")
        if git(repo, "add", ".env.example", "README.md").returncode != 0:
            print("Échec : impossible de stage les fichiers de test autorisés.")
            return 1
        allowed = git(repo, "commit", "-m", "test allowed files")
        if allowed.returncode != 0:
            print("Échec : .env.example et un fichier source devraient être autorisés.")
            return 1

        secret_marker = "DUMMY_NOT_A_REAL_SECRET_4821"
        nested = repo / "apps" / "web"
        nested.mkdir(parents=True)
        (nested / ".env.local").write_text(f"GEMINI_API_KEY={secret_marker}\n", encoding="utf-8")
        if git(repo, "add", "-f", "apps/web/.env.local").returncode != 0:
            print("Échec : impossible de stage le fichier de test ignoré.")
            return 1
        blocked = git(repo, "commit", "-m", "test blocked env file")
        output = blocked.stdout + blocked.stderr
        if blocked.returncode == 0 or "apps/web/.env.local" not in output:
            print("Échec : le hook n’a pas refusé apps/web/.env.local.")
            return 1
        if secret_marker in output:
            print("Échec : le contenu du fichier staged a été divulgué par le hook.")
            return 1

        print("OK : le hook autorise .env.example et bloque .env.local sans afficher son contenu.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
