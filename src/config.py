"""Configuration management for Solstice using Pydantic Settings."""

from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Solstice system configuration parameters."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Architecture & Model Routing
    use_finetuned_slm: bool = Field(
        default=False,
        validation_alias="USE_FINETUNED_SLM",
        description="Switch between frontier API and local fine-tuned SLM endpoints"
    )
    frontier_api_base: str = Field(
        default="https://api.openai.com/v1",
        validation_alias="FRONTIER_API_BASE"
    )
    frontier_api_key: str = Field(
        default="sk-placeholder",
        validation_alias="FRONTIER_API_KEY"
    )
    frontier_model: str = Field(
        default="gpt-4o",
        validation_alias="FRONTIER_MODEL"
    )

    # Local vLLM / Ollama Fine-tuned SLMs
    local_vllm_base: str = Field(
        default="http://localhost:8000/v1",
        validation_alias="LOCAL_VLLM_BASE"
    )
    local_kg_model: str = Field(
        default="Solstice-KG-Extractor-7B",
        validation_alias="LOCAL_KG_MODEL"
    )
    local_writer_model: str = Field(
        default="Solstice-Artisan-Writer-14B",
        validation_alias="LOCAL_WRITER_MODEL"
    )

    # Neo4j Graph Database
    neo4j_uri: str = Field(
        default="bolt://localhost:7687",
        validation_alias="NEO4J_URI"
    )
    neo4j_user: str = Field(
        default="neo4j",
        validation_alias="NEO4J_USER"
    )
    neo4j_password: str = Field(
        default="solstice_secret",
        validation_alias="NEO4J_PASSWORD"
    )
    neo4j_database: str = Field(
        default="neo4j",
        validation_alias="NEO4J_DATABASE"
    )

    # Guardrails & DPO Flywheel
    log_dir: str = Field(
        default="logs",
        validation_alias="LOG_DIR"
    )
    guardrail_flywheel_path: str = Field(
        default="logs/guardrail_flywheel.jsonl",
        validation_alias="GUARDRAIL_FLYWHEEL_PATH"
    )
    max_guardrail_retries: int = Field(
        default=2,
        description="Maximum rollback attempts before circuit breaker forces release"
    )

    def get_flywheel_path(self) -> Path:
        """Ensure parent directory exists and return Path to guardrail flywheel log."""
        p = Path(self.guardrail_flywheel_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
