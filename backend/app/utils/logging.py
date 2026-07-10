"""
Structured logging setup.
CRITICAL: Logs must NEVER contain passwords, JWT payloads, raw health form values, or
file contents. See Backend doc §4.10 for the full logging discipline.
"""
import logging
import sys


def setup_logging(level: str = "INFO") -> None:
    """Configure structured logging for the backend application."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
    )

    # Silence noisy third-party loggers
    logging.getLogger("motor").setLevel(logging.WARNING)
    logging.getLogger("pymongo").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Returns a named logger. Use module __name__ as the name."""
    return logging.getLogger(name)
