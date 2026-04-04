import unittest
from unittest import mock

from sqlmodel import Session, SQLModel, create_engine, select

import core.proxy_pool as proxy_pool_module
from core.db import ProxyModel
from core.proxy_pool import ProxyPool


class _Response:
    def __init__(self, status_code: int):
        self.status_code = status_code


class ProxyPoolTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(self.engine)
        self.pool = ProxyPool()

    def test_check_all_tries_ipinfo_then_httpbin(self):
        with Session(self.engine) as session:
            proxy = ProxyModel(url="host:3000:user:pass", region="US")
            session.add(proxy)
            session.commit()

        seen_urls = []

        def fake_get(url, proxies=None, timeout=None):
            seen_urls.append((url, proxies, timeout))
            if url.endswith("/json"):
                raise RuntimeError("ipinfo blocked")
            return _Response(200)

        with mock.patch.object(proxy_pool_module, "engine", self.engine):
            with mock.patch("requests.get", side_effect=fake_get):
                result = self.pool.check_all()

        with Session(self.engine) as session:
            stored = session.exec(select(ProxyModel)).one()

        self.assertEqual(result, {"ok": 1, "fail": 0})
        self.assertEqual(
            [item[0] for item in seen_urls],
            ["https://ipinfo.io/json", "https://httpbin.org/ip"],
        )
        self.assertEqual(
            seen_urls[0][1],
            {
                "http": "http://user:pass@host:3000",
                "https": "http://user:pass@host:3000",
            },
        )
        self.assertEqual(stored.success_count, 1)
        self.assertEqual(stored.fail_count, 0)

    def test_check_all_marks_fail_when_proxy_is_invalid(self):
        with Session(self.engine) as session:
            proxy = ProxyModel(url="bad-proxy", region="US")
            session.add(proxy)
            session.commit()

        with mock.patch.object(proxy_pool_module, "engine", self.engine):
            result = self.pool.check_all()

        with Session(self.engine) as session:
            stored = session.exec(select(ProxyModel)).one()

        self.assertEqual(result, {"ok": 0, "fail": 1})
        self.assertEqual(stored.success_count, 0)
        self.assertEqual(stored.fail_count, 1)

    def test_report_success_matches_legacy_stored_proxy_after_normalization(self):
        with Session(self.engine) as session:
            proxy = ProxyModel(url="host:3000:user:pass", region="US")
            session.add(proxy)
            session.commit()

        with mock.patch.object(proxy_pool_module, "engine", self.engine):
            self.pool.report_success("http://user:pass@host:3000")

        with Session(self.engine) as session:
            stored = session.exec(select(ProxyModel)).one()

        self.assertEqual(stored.success_count, 1)
        self.assertEqual(stored.fail_count, 0)


if __name__ == "__main__":
    unittest.main()
