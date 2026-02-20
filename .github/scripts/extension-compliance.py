#!/usr/bin/env python3
"""Check Stall extension compliance against template guardrails."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

TEMPLATE_LOCKED_FILES = (
    "stall.config.ts",
    "stall.build.ts",
)

MAX_TARGET_BYTES = 100 * 1024
MAX_HARD_BYTES = 500 * 1024

ALLOWED_PACKAGE_NAMES = {
    "@types/bun",
    "@use-stall/core",
    "@use-stall/icons",
    "@use-stall/types",
    "@use-stall/ui",
    "chokidar",
    "dexie-react-hooks",
    "framer-motion",
    "react",
    "react-dom",
    "react-router-dom",
    "sonner",
    "typescript",
    "uuid",
    "zustand",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_obj:
        for block in iter(lambda: file_obj.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def compute_template_hashes(template_root: Path) -> tuple[dict[str, str], list[str]]:
    failures: list[str] = []
    hashes: dict[str, str] = {}

    for filename in TEMPLATE_LOCKED_FILES:
        template_path = template_root / filename
        if not template_path.exists():
            failures.append(f"template missing file: {template_path}")
            continue
        hashes[filename] = sha256(template_path)

    return hashes, failures


def check_dependency_policy(package_json: dict) -> list[str]:
    violations: list[str] = []
    for section in (
        "dependencies",
        "devDependencies",
        "peerDependencies",
        "optionalDependencies",
    ):
        deps = package_json.get(section, {}) or {}
        if not isinstance(deps, dict):
            violations.append(f"{section} must be an object")
            continue
        for dep_name in deps:
            if dep_name not in ALLOWED_PACKAGE_NAMES:
                violations.append(
                    f"{section} contains disallowed package '{dep_name}'"
                )
    return violations


def check_extension(extension_root: Path, template_root: Path) -> int:
    failures: list[str] = []
    warnings: list[str] = []

    required_files = [
        "stall.config.ts",
        "stall.build.ts",
        "package.json",
        "src/index.ts",
        "src/app.ts",
        "src/look-up.ts",
        "src/extension.json",
    ]
    for required in required_files:
        if not (extension_root / required).exists():
            failures.append(f"missing required file: {required}")

    if failures:
        print("[FAIL] Missing required files:")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    expected_template_hashes, template_failures = compute_template_hashes(
        template_root
    )
    failures.extend(template_failures)

    for filename, expected_hash in expected_template_hashes.items():
        extension_path = extension_root / filename
        current_hash = sha256(extension_path)
        if current_hash != expected_hash:
            warnings.append(
                f"{filename} differs from template baseline; deploy will overwrite with template file"
            )

    package_json = read_json(extension_root / "package.json")
    extension_json = read_json(extension_root / "src/extension.json")

    package_version = str(package_json.get("version", "")).strip()
    extension_version = str(extension_json.get("version", "")).strip()
    if not package_version or not extension_version:
        failures.append("missing version in package.json or src/extension.json")
    elif package_version != extension_version:
        failures.append(
            f"version mismatch: package.json={package_version}, src/extension.json={extension_version}"
        )

    failures.extend(check_dependency_policy(package_json))

    extension_id = str(extension_json.get("id", "")).strip()
    if not extension_id:
        failures.append("src/extension.json.id is required")

    entrypoint = extension_json.get("entrypoint", {})
    entrypoint_id = str((entrypoint or {}).get("id", "")).strip()
    entrypoint_type = str((entrypoint or {}).get("type", "")).strip()
    if entrypoint_type not in {"lookup", "page"}:
        failures.append("src/extension.json.entrypoint.type must be 'lookup' or 'page'")
    if not entrypoint_id:
        failures.append("src/extension.json.entrypoint.id is required")

    look_up_content = (extension_root / "src/look-up.ts").read_text(encoding="utf-8")
    app_content = (extension_root / "src/app.ts").read_text(encoding="utf-8")
    index_content = (extension_root / "src/index.ts").read_text(encoding="utf-8")

    if extension_id and f"/extensions/{extension_id}/" not in look_up_content:
        warnings.append(
            "src/look-up.ts does not contain route segment '/extensions/<extension-id>/'"
        )

    if entrypoint_id and (
        f'id: "{entrypoint_id}"' not in look_up_content
        and f"id: '{entrypoint_id}'" not in look_up_content
        and f'id: "{entrypoint_id}"' not in app_content
        and f"id: '{entrypoint_id}'" not in app_content
    ):
        failures.append(
            "entrypoint id is not found in src/look-up.ts or src/app.ts"
        )

    for symbol in ("app", "config", "ui"):
        if not re.search(rf"\b{symbol}\b", index_content):
            warnings.append(f"src/index.ts may not export '{symbol}'")

    dist_file = extension_root / "dist/index.js"
    if not dist_file.exists():
        warnings.append("dist/index.js missing; run bun run build")
    else:
        size_bytes = dist_file.stat().st_size
        if size_bytes > MAX_HARD_BYTES:
            failures.append(
                f"dist/index.js is {size_bytes} bytes (> {MAX_HARD_BYTES} hard limit)"
            )
        elif size_bytes > MAX_TARGET_BYTES:
            warnings.append(
                f"dist/index.js is {size_bytes} bytes (> {MAX_TARGET_BYTES} target). Add explicit justification."
            )

    if failures:
        print("[FAIL] Compliance checks failed:")
        for failure in failures:
            print(f"  - {failure}")
    else:
        print("[OK] No hard compliance failures")

    if warnings:
        print("[WARN] Follow-up checks:")
        for warning in warnings:
            print(f"  - {warning}")

    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate Stall extension policy and architecture constraints.",
    )
    parser.add_argument(
        "--extension-root",
        default=".",
        help="Path to the extension root directory (default: current directory).",
    )
    parser.add_argument(
        "--template-root",
        required=True,
        help="Path to the template root used to compute expected template hashes.",
    )
    args = parser.parse_args()

    extension_root = Path(args.extension_root).resolve()
    template_root = Path(args.template_root).resolve()

    if not extension_root.exists():
        print(f"[FAIL] Extension root not found: {extension_root}")
        return 1

    if not template_root.exists():
        print(f"[FAIL] Template root not found: {template_root}")
        return 1

    return check_extension(extension_root, template_root)


if __name__ == "__main__":
    sys.exit(main())
