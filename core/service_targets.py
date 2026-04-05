from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

_LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "0.0.0.0", "::1"}


def running_in_container() -> bool:
    marker = str(os.getenv("APP_CONTAINERIZED", "") or "").strip().lower()
    if marker in {"1", "true", "yes", "on"}:
        return True
    if str(os.getenv("APP_CONDA_ENV", "") or "").strip().lower() == "docker":
        return True
    return Path("/.dockerenv").exists()


def _container_host_alias() -> str:
    alias = str(os.getenv("APP_DOCKER_HOST_ALIAS", "") or "").strip()
    return alias or "host.docker.internal"


def rewrite_loopback_url_for_container(url: str | None) -> str:
    raw = str(url or "").strip()
    if not raw or not running_in_container():
        return raw

    parts = urlsplit(raw)
    host = str(parts.hostname or "").strip().lower()
    if host not in _LOOPBACK_HOSTS:
        return raw

    userinfo = ""
    if parts.username:
        userinfo = parts.username
        if parts.password is not None:
            userinfo += f":{parts.password}"
        userinfo += "@"

    alias = _container_host_alias()
    host_part = alias
    if ":" in alias and not alias.startswith("["):
        host_part = f"[{alias}]"

    netloc = f"{userinfo}{host_part}"
    if parts.port is not None:
        netloc = f"{netloc}:{parts.port}"

    return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))
