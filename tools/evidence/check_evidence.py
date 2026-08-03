#!/usr/bin/env python3
import json
import sys
from pathlib import Path

EXPECTED_MODULES = [f"M{number:02d}" for number in range(9)]


def validate(manifest_path):
    manifest_path = Path(manifest_path)
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors = []
    for module in EXPECTED_MODULES:
        result = data.get("modules", {}).get(module)
        if result is None:
            errors.append(f"{module}: missing result")
            continue
        if result.get("status") != "PASS":
            errors.append(f"{module}: status is not PASS")
        artifacts = result.get("artifacts", [])
        if not artifacts:
            errors.append(f"{module}: no evidence artifacts")
        for artifact in artifacts:
            if not (manifest_path.parent / artifact).is_file():
                errors.append(f"{module}: artifact not found: {artifact}")

    cleanup = data.get("cleanup", {})
    if cleanup.get("terraform_destroy_exit_code") != 0:
        errors.append("cleanup: terraform destroy did not exit 0")
    if cleanup.get("remaining_billable_resources") != 0:
        errors.append("cleanup: billable resources remain or were not counted")
    cleanup_artifact = cleanup.get("artifact")
    if not cleanup_artifact or not (manifest_path.parent / cleanup_artifact).is_file():
        errors.append("cleanup: evidence artifact is missing")
    if data.get("undocumented_interventions"):
        errors.append("run contains undocumented interventions")
    return errors


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: check_evidence.py <manifest.json>")
    failures = validate(sys.argv[1])
    if failures:
        print("\n".join(f"FAIL: {failure}" for failure in failures))
        raise SystemExit(1)
    print("Evidence manifest passes all release gates")