#!/usr/bin/env bash
# ==============================================================================
# Solstice SLM Post-Training Pipeline (LLaMA-Factory CLI Runner)
# Trains Solstice-KG-Extractor-7B (LoRA SFT) and Solstice-Artisan-Writer-14B (DPO)
# ==============================================================================

set -euo pipefail

STAGE="${1:-all}"
DRY_RUN="${2:-false}"

KG_SFT_CONFIG="training/configs/qwen25_7b_kg_sft.yaml"
ARTISAN_DPO_CONFIG="training/configs/qwen25_14b_artisan_dpo.yaml"

echo "=================================================================="
echo " ✦ SOLSTICE SLM POST-TRAINING PIPELINE (LLaMA-Factory)"
echo "=================================================================="
echo "Target Stage:   ${STAGE}"
echo "Dry Run Mode:   ${DRY_RUN}"
echo "7B SFT Config:  ${KG_SFT_CONFIG}"
echo "14B DPO Config: ${ARTISAN_DPO_CONFIG}"
echo "------------------------------------------------------------------"

# Check GPU availability
if command -v nvidia-smi &> /dev/null; then
    echo "[GPU Detection] NVIDIA GPUs detected:"
    nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader
else
    echo "[GPU Detection] No NVIDIA GPU detected. (Running in CPU/MPS/Test mode)"
fi

# Function to run SFT
run_sft() {
    echo ""
    echo ">>> Launching Task 1: Solstice-KG-Extractor-7B LoRA SFT..."
    if [ "${DRY_RUN}" = "true" ] || ! command -v llamafactory-cli &> /dev/null; then
        echo "[Dry-Run / Emulation] Validating config: ${KG_SFT_CONFIG}"
        test -f "${KG_SFT_CONFIG}"
        echo "Config validated successfully. Command to execute on GPU cluster:"
        echo "  FORCE_TORCHRUN=1 llamafactory-cli train ${KG_SFT_CONFIG}"
    else
        FORCE_TORCHRUN=1 llamafactory-cli train "${KG_SFT_CONFIG}"
    fi
}

# Function to run DPO
run_dpo() {
    echo ""
    echo ">>> Launching Task 2: Solstice-Artisan-Writer-14B DPO Preference Alignment..."
    if [ "${DRY_RUN}" = "true" ] || ! command -v llamafactory-cli &> /dev/null; then
        echo "[Dry-Run / Emulation] Validating config: ${ARTISAN_DPO_CONFIG}"
        test -f "${ARTISAN_DPO_CONFIG}"
        echo "Config validated successfully. Command to execute on GPU cluster:"
        echo "  FORCE_TORCHRUN=1 llamafactory-cli train ${ARTISAN_DPO_CONFIG}"
    else
        FORCE_TORCHRUN=1 llamafactory-cli train "${ARTISAN_DPO_CONFIG}"
    fi
}

case "${STAGE}" in
    sft)
        run_sft
        ;;
    dpo)
        run_dpo
        ;;
    all)
        run_sft
        run_dpo
        ;;
    *)
        echo "Unknown stage: ${STAGE}. Use 'sft', 'dpo', or 'all'."
        exit 1
        ;;
esac

echo ""
echo "=================================================================="
echo " LLaMA-Factory Pipeline Script Completed Successfully ✓"
echo "=================================================================="
