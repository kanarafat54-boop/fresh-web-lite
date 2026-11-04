"""Shared fail-closed authorization checks for Fresh training corpora."""
from __future__ import annotations

import json
from pathlib import Path

REGISTRY_PATH = Path(__file__).with_name("fresh_corpus_authorizations.json")
EXPECTED_SCHEMA = "fresh-corpus-authorization-registry-v1"


def load_authorization_registry() -> dict[str, dict]:
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    policy = registry.get("policy") or {}
    if registry.get("schema") != EXPECTED_SCHEMA:
        raise ValueError("Invalid corpus authorization registry schema")
    if policy.get("unknownIsBlocked") is not True or policy.get("trainingPermissionRequired") is not True:
        raise ValueError("Corpus authorization policy must fail closed")
    if policy.get("evidenceRequired") is not True:
        raise ValueError("Corpus authorization evidence must be required")
    sources = registry.get("sources") or []
    by_id = {source.get("authorizationId"): source for source in sources if source.get("authorizationId")}
    if len(by_id) != len(sources):
        raise ValueError("Authorization registry contains duplicate or missing IDs")
    return by_id


def validate_row_authorization(row: dict, registry: dict[str, dict], line_no: int) -> str:
    metadata = row.get("metadata") or {}
    authorization_id = metadata.get("authorizationId")
    if not authorization_id and metadata.get("sourceType") == "synthetic-starter" and metadata.get("license") == "internal-synthetic":
        authorization_id = "fwl-internal-synthetic-v1"
    if not authorization_id:
        raise ValueError(f"row {line_no}: missing authorization ID")
    authorization = registry.get(authorization_id)
    if not authorization or authorization.get("status") != "eligible":
        raise ValueError(f"row {line_no}: source is not authorized for training")
    if authorization.get("trainingPermission") != "verified":
        raise ValueError(f"row {line_no}: training permission is not verified")
    if authorization.get("derivativeModelPermission") != "verified":
        raise ValueError(f"row {line_no}: derivative-model permission is not verified")
    if not authorization.get("evidenceRef"):
        raise ValueError(f"row {line_no}: authorization evidence is missing")
    if metadata.get("license") != authorization.get("license"):
        raise ValueError(f"row {line_no}: license does not match authorization")
    if metadata.get("sourceType") not in {"synthetic-starter", "internal-synthetic", "hf-public-dataset"}:
        raise ValueError(f"row {line_no}: source type is not permitted by this training adapter")
    return authorization_id
