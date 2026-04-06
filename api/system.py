from __future__ import annotations

import json
import os
import platform
import shutil
import socket
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from core.db import AccountModel, get_session

router = APIRouter(prefix="/system", tags=["system"])

APP_STARTED_AT = time.time()


def _bytes_to_gb(value: int | None) -> float | None:
    if value is None:
        return None
    return round(value / (1024 ** 3), 2)


def _memory_snapshot() -> dict[str, float | None]:
    total = None
    available = None

    if hasattr(os, "sysconf"):
        try:
            page_size = int(os.sysconf("SC_PAGE_SIZE"))
            total_pages = int(os.sysconf("SC_PHYS_PAGES"))
            total = page_size * total_pages
            if "SC_AVPHYS_PAGES" in os.sysconf_names:
                available_pages = int(os.sysconf("SC_AVPHYS_PAGES"))
                available = page_size * available_pages
        except (ValueError, OSError):
            total = None
            available = None

    used = total - available if total is not None and available is not None else None
    return {
        "total_gb": _bytes_to_gb(total),
        "used_gb": _bytes_to_gb(used),
        "free_gb": _bytes_to_gb(available),
    }


def _disk_snapshot(path: str = "/") -> dict[str, float]:
    usage = shutil.disk_usage(path)
    return {
        "total_gb": _bytes_to_gb(usage.total) or 0.0,
        "used_gb": _bytes_to_gb(usage.used) or 0.0,
        "free_gb": _bytes_to_gb(usage.free) or 0.0,
        "used_percent": round((usage.used / usage.total) * 100, 1) if usage.total else 0.0,
    }


def _load_average() -> dict[str, float | None]:
    if hasattr(os, "getloadavg"):
        try:
            load1, load5, load15 = os.getloadavg()
            return {
                "load1": round(load1, 2),
                "load5": round(load5, 2),
                "load15": round(load15, 2),
            }
        except OSError:
            pass
    return {"load1": None, "load5": None, "load15": None}


def _runtime_label() -> str:
    if os.path.exists("/.dockerenv"):
        return "Docker"
    return "Local"


@router.get("/overview")
def get_system_overview(session: Session = Depends(get_session)):
    accounts = session.exec(select(AccountModel)).all()
    remote_uploaded = 0
    remote_usable = 0

    for account in accounts:
        try:
            extra = json.loads(account.extra_json or "{}")
        except (TypeError, ValueError):
            extra = {}
        sync = (
            extra.get("sync_statuses", {}).get("cliproxyapi", {})
            if isinstance(extra, dict)
            else {}
        )
        if not isinstance(sync, dict):
            continue
        if sync.get("uploaded"):
            remote_uploaded += 1
        if sync.get("remote_state") == "usable":
            remote_usable += 1

    return {
        "host": socket.gethostname(),
        "runtime": _runtime_label(),
        "os": f"{platform.system()} {platform.release()}",
        "python": platform.python_version(),
        "cpu_count": os.cpu_count() or 0,
        "load": _load_average(),
        "memory": _memory_snapshot(),
        "disk": _disk_snapshot(),
        "remote_cpa_total": remote_uploaded,
        "remote_cpa_usable": remote_usable,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": int(time.time() - APP_STARTED_AT),
    }
