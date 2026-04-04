"""代理池 - 从数据库读取代理，支持轮询和按区域选取"""

from typing import Optional
from sqlmodel import Session, select
from .db import ProxyModel, engine
from .proxy_utils import build_requests_proxy_config, normalize_proxy_url
import time, threading, random
from datetime import datetime, timezone

PROXY_CHECK_URLS = (
    "https://ipinfo.io/json",
    "https://httpbin.org/ip",
)


class ProxyPool:
    def __init__(self):
        self._index = 0
        self._lock = threading.Lock()

    def _find_proxy_record(self, session: Session, url: str) -> ProxyModel | None:
        raw_value = str(url or "").strip()
        normalized_value = None

        if raw_value:
            direct = session.exec(select(ProxyModel).where(ProxyModel.url == raw_value)).first()
            if direct:
                return direct

        try:
            normalized_value = normalize_proxy_url(raw_value)
        except ValueError:
            normalized_value = None

        if normalized_value and normalized_value != raw_value:
            direct = session.exec(
                select(ProxyModel).where(ProxyModel.url == normalized_value)
            ).first()
            if direct:
                return direct

        if not normalized_value:
            return None

        for item in session.exec(select(ProxyModel)).all():
            try:
                if normalize_proxy_url(item.url) == normalized_value:
                    return item
            except ValueError:
                continue
        return None

    def get_next(self, region: str = "") -> Optional[str]:
        """加权轮询取一个可用代理，在高成功率代理间轮换"""
        with Session(engine) as s:
            q = select(ProxyModel).where(ProxyModel.is_active == True)
            if region:
                q = q.where(ProxyModel.region == region)
            proxies = s.exec(q).all()
            if not proxies:
                return None
            proxies.sort(
                key=lambda p: p.success_count / max(p.success_count + p.fail_count, 1),
                reverse=True,
            )
            with self._lock:
                idx = self._index % len(proxies)
                self._index += 1
            return proxies[idx].url

    def report_success(self, url: str) -> None:
        with Session(engine) as s:
            p = self._find_proxy_record(s, url)
            if p:
                p.success_count += 1
                p.last_checked = datetime.now(timezone.utc)
                s.add(p)
                s.commit()

    def report_fail(self, url: str) -> None:
        with Session(engine) as s:
            p = self._find_proxy_record(s, url)
            if p:
                p.fail_count += 1
                p.last_checked = datetime.now(timezone.utc)
                # 连续失败超过10次自动禁用
                if p.fail_count > 0 and p.success_count == 0 and p.fail_count >= 5:
                    p.is_active = False
                s.add(p)
                s.commit()

    def check_all(self) -> dict:
        """检测所有代理可用性"""
        import requests

        with Session(engine) as s:
            proxies = s.exec(select(ProxyModel)).all()
        results = {"ok": 0, "fail": 0}
        for p in proxies:
            try:
                normalized_url = normalize_proxy_url(p.url)
                proxy_config = build_requests_proxy_config(normalized_url)
                success = False
                for check_url in PROXY_CHECK_URLS:
                    try:
                        r = requests.get(
                            check_url,
                            proxies=proxy_config,
                            timeout=8,
                        )
                    except Exception:
                        continue
                    if r.status_code == 200:
                        success = True
                        break
                if success:
                    self.report_success(p.url)
                    results["ok"] += 1
                else:
                    raise RuntimeError("代理检测未命中可用探针")
            except Exception:
                self.report_fail(p.url)
                results["fail"] += 1
        return results


proxy_pool = ProxyPool()
