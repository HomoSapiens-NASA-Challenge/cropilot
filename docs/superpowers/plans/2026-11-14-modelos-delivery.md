# Model Delivery Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Bruno explicitly authorized publishing the models in Cropilot branch `modelos`; no additional approval is needed for the agreed delivery.

**Goal:** Make the existing frozen regional ML and physical crop-water model usable by teammates from Cropilot.
**Architecture:** Preserve the reviewed model source and artifacts in a checksum-verified release bundle. The backend exposes a water service that invokes them in a pinned Python 3.12.7 environment, separate from the application's Python 3.14 environment. No HTTP routes or frontend.
**Tech Stack:** Existing backend Python/Pydantic/pytest/uv; frozen model environment from the training lock.
**Spec:** User requests models and environments in branch `modelos`, never `main`.

## Global Constraints

- Preserve source mathematics and frozen weights; no retraining.
- Models and raw data stay outside Git in backend `models/` and `data/`.
- Use existing strict formatter/type checker. Do not change application dependencies.
- Publish only `modelos` and a prerelease targeting its commit; no merge or deployment.
- Retain research-only and illustrative-case limitations.

## Review Focus

- Corrupt archives and altered installed code/weights fail before execution.
- Archive paths, links and unexpected files cannot escape designated roots.
- Fresh setup needs only this repo plus authorized GitHub access, not sibling clones.
- Python-version mismatch is explicit; subprocesses do not inherit PYTHONPATH/PYTHONHOME.
- Invalid model requests fail visibly; prior physical outputs are not overwritten.

### Task 1: Verified artifacts and isolated environment

**Files:** `app/modules/water/assets.py`, `resources/`, `tests/test_water_assets.py`, `.gitignore`, `core/config.py`, `.env.example`.
**Interfaces:** `prepare_models(archive: Path | None) -> None`; `verify_installation() -> None`; configuration from `WaterModelSettings`.

- [ ] Write failing tests for corrupt bytes, unsafe/duplicate members and changed installed payloads.
- [ ] Implement strict manifest verification, extraction and uv setup; assemble the pinned release bundle.
- [ ] Run targeted tests and format/type checks; commit artifact delivery.

### Task 2: Service, CLI and teammate handoff

**Files:** `app/modules/water/service.py`, `cli.py`, `tests/test_water_service.py`, README and internal integration notes.
**Interfaces:** `predict_regional(request) -> JSON object`; `compare_water_scenarios(config=None) -> JSON manifest and output location`; CLI setup/verify/regional/water.

- [ ] Test real frozen inference equality and isolated execution, request rejection and physical-model export.
- [ ] Document installation, versions, examples, models/errors and how the existing API can consume results.
- [ ] Run backend and repository checks, fresh-context review; fix important issues.
- [ ] Push `modelos`; publish/download/checksum-test assets from Cropilot; create a review PR without merging.
