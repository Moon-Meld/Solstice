#!/usr/bin/env bash
# ==============================================================================
# Solstice Data Distillation & Validation Runner
# Synthesizes Gold SFT, DPO, and Embedding datasets, harvests online flywheel logs,
# and performs a strict zero-cliché and schema audit.
# ==============================================================================

set -euo pipefail

DATA_DIR="${1:-training/data}"
NUM_SAMPLES="${2:-20}"
FLYWHEEL_LOG="${3:-logs/guardrail_flywheel.jsonl}"

echo "=================================================================="
echo " ✦ SOLSTICE POST-TRAINING DATA DISTILLATION & HARVESTING PIPELINE"
echo "=================================================================="
echo "Target Data Directory: ${DATA_DIR}"
echo "Samples per Task:      ${NUM_SAMPLES}"
echo "Flywheel Log Source:   ${FLYWHEEL_LOG}"
echo "Timestamp:             $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "------------------------------------------------------------------"

PYTHON="${PYTHON_BIN:-$(command -v python3 || command -v python || echo .venv/bin/python)}"

# Step 1: Run Async Batch Distillation Pipeline
echo "[Step 1/3] Synthesizing SFT, DPO, and Contrastive Triplets..."
"$PYTHON" -m training.synthesizer.distill_pipeline \
    --output-dir "${DATA_DIR}" \
    --num-samples "${NUM_SAMPLES}" \
    --mock

# Step 2: Harvest Online Guardrail Flywheel Rollback Logs
echo "[Step 2/3] Harvesting Online Guardrail Rollback Events..."
"$PYTHON" -m training.synthesizer.log_harvester \
    --flywheel-log "${FLYWHEEL_LOG}" \
    --output "${DATA_DIR}/dpo_artisan_writer.jsonl"

# Step 3: Run Strict Quality & Zero-Cliché Audit
echo "[Step 3/3] Running Zero-Cliché and Schema Adherence Audit..."
"$PYTHON" -m training.synthesizer.validate_datasets \
    --data-dir "${DATA_DIR}"

echo "=================================================================="
echo " Distillation & Validation Pipeline Completed Successfully ✓"
echo " Generated Datasets:"
ls -lh "${DATA_DIR}"/*.jsonl
echo "=================================================================="
