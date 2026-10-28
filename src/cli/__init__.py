"""CLI module for Solstice."""

__all__ = ["app"]


def __getattr__(name: str):
    if name == "app":
        from src.cli.app import app
        return app
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
