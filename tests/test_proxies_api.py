import unittest

from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine, select

from api.proxies import (
    ProxyBatchDeleteRequest,
    ProxyBulkCreate,
    ProxyCreate,
    add_proxy,
    batch_delete_proxies,
    bulk_add_proxies,
)
from core.db import ProxyModel


class ProxiesApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        SQLModel.metadata.create_all(self.engine)

    def test_add_proxy_normalizes_legacy_url_before_insert(self):
        with Session(self.engine) as session:
            created = add_proxy(
                ProxyCreate(url="http://host:3000:user:pass", region="US"),
                session=session,
            )
            stored = session.exec(select(ProxyModel)).all()

        self.assertEqual(created.url, "http://user:pass@host:3000")
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0].url, "http://user:pass@host:3000")

    def test_add_proxy_accepts_standard_socks5_url(self):
        with Session(self.engine) as session:
            created = add_proxy(
                ProxyCreate(url="socks5://user:pass@host:1080", region="US"),
                session=session,
            )
            stored = session.exec(select(ProxyModel)).all()

        self.assertEqual(created.url, "socks5h://user:pass@host:1080")
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0].url, "socks5h://user:pass@host:1080")

    def test_bulk_add_proxies_returns_invalid_lines_and_deduplicates(self):
        with Session(self.engine) as session:
            result = bulk_add_proxies(
                ProxyBulkCreate(
                    proxies=[
                        "host:3000:user:pass",
                        "http://user:pass@host:3000",
                        "bad-proxy",
                    ],
                    region="US",
                ),
                session=session,
            )
            stored = session.exec(select(ProxyModel)).all()

        self.assertEqual(result["added"], 1)
        self.assertEqual(len(result["invalid"]), 1)
        self.assertEqual(result["invalid"][0]["line"], 3)
        self.assertEqual(result["invalid"][0]["url"], "bad-proxy")
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0].url, "http://user:pass@host:3000")

    def test_batch_delete_proxies_returns_deleted_and_not_found(self):
        with Session(self.engine) as session:
            first = add_proxy(ProxyCreate(url="http://a:1", region=""), session=session)
            second = add_proxy(ProxyCreate(url="http://b:2", region=""), session=session)
            result = batch_delete_proxies(
                ProxyBatchDeleteRequest(ids=[first.id, 999999, second.id]),
                session=session,
            )
            stored = session.exec(select(ProxyModel)).all()

        self.assertEqual(result["deleted"], 2)
        self.assertEqual(result["not_found"], [999999])
        self.assertEqual(result["total_requested"], 3)
        self.assertEqual(stored, [])

    def test_add_proxy_rejects_invalid_proxy(self):
        with Session(self.engine) as session:
            with self.assertRaises(HTTPException) as ctx:
                add_proxy(ProxyCreate(url="http://host:badport:user:pass"), session=session)

        self.assertEqual(ctx.exception.status_code, 400)

    def test_add_proxy_detects_duplicates_against_legacy_stored_format(self):
        with Session(self.engine) as session:
            session.add(ProxyModel(url="host:3000:user:pass", region="US"))
            session.commit()

            with self.assertRaises(HTTPException) as ctx:
                add_proxy(
                    ProxyCreate(url="http://user:pass@host:3000", region="US"),
                    session=session,
                )

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "代理已存在")


if __name__ == "__main__":
    unittest.main()
