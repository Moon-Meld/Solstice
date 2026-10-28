#!/usr/bin/env bash
# ==============================================================================
# Solstice Multi-LoRA vLLM Serving Launcher
# Mounts Solstice-KG-Extractor-7B and Solstice-Artisan-Writer-14B under a single
# high-throughput vLLM engine with OpenAI-compatible API endpoints.
# ==============================================================================

set -euo pipefail

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
BASE_MODEL="${BASE_MODEL:-Qwen/Qwen2.5-14B-Instruct}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-4096}"
GPU_MEM_UTIL="${GPU_MEM_UTIL:-0.90}"
MAX_NUM_SEQS="${MAX_NUM_SEQS:-128}"
TENSOR_PARALLEL_SIZE="${TENSOR_PARALLEL_SIZE:-1}"

KG_LORA_PATH="${KG_LORA_PATH:-saves/qwen25_7b_kg_extractor_lora}"
WRITER_LORA_PATH="${WRITER_LORA_PATH:-saves/qwen25_14b_artisan_writer_dpo}"

echo "=================================================================="
echo " ✦ SOLSTICE MULTI-LORA vLLM HIGH-THROUGHPUT SERVING ENGINE"
echo "=================================================================="
echo "Host & Port:            http://${HOST}:${PORT}/v1"
echo "Base Backbone Model:    ${BASE_MODEL}"
echo "Max Model Length:       ${MAX_MODEL_LEN}"
echo "GPU Memory Util:        ${GPU_MEM_UTIL}"
echo "Tensor Parallelism:     ${TENSOR_PARALLEL_SIZE}"
echo "LoRA Adapter 1:         Solstice-KG-Extractor-7B=${KG_LORA_PATH}"
echo "LoRA Adapter 2:         Solstice-Artisan-Writer-14B=${WRITER_LORA_PATH}"
echo "------------------------------------------------------------------"

PYTHON="${PYTHON_BIN:-$(command -v python3 || command -v python || echo .venv/bin/python)}"

if ! command -v vllm &> /dev/null; then
    echo "[Notice] 'vllm' binary not found in PATH."
    echo "To launch in production on an NVIDIA GPU node, run:"
    echo "  $PYTHON -m vllm.entrypoints.openai.api_server \\"
    echo "    --model ${BASE_MODEL} \\"
    echo "    --host ${HOST} --port ${PORT} \\"
    echo "    --tensor-parallel-size ${TENSOR_PARALLEL_SIZE} \\"
    echo "    --max-model-len ${MAX_MODEL_LEN} \\"
    echo "    --gpu-memory-utilization ${GPU_MEM_UTIL} \\"
    echo "    --max-num-seqs ${MAX_NUM_SEQS} \\"
    echo "    --enable-lora \\"
    echo "    --max-loras 4 \\"
    echo "    --max-lora-rank 64 \\"
    echo "    --lora-modules Solstice-KG-Extractor-7B=${KG_LORA_PATH} Solstice-Artisan-Writer-14B=${WRITER_LORA_PATH} \\"
    echo "    --trust-remote-code"
    exit 0
fi

exec "$PYTHON" -m vllm.entrypoints.openai.api_server \
    --model "${BASE_MODEL}" \
    --host "${HOST}" \
    --port "${PORT}" \
    --tensor-parallel-size "${TENSOR_PARALLEL_SIZE}" \
    --max-model-len "${MAX_MODEL_LEN}" \
    --gpu-memory-utilization "${GPU_MEM_UTIL}" \
    --max-num-seqs "${MAX_NUM_SEQS}" \
    --enable-lora \
    --max-loras 4 \
    --max-lora-rank 64 \
    --lora-modules "Solstice-KG-Extractor-7B=${KG_LORA_PATH}" "Solstice-Artisan-Writer-14B=${WRITER_LORA_PATH}" \
    --trust-remote-code
