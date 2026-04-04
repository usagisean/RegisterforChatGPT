import unittest

from core.proxy_utils import (
    build_playwright_proxy_config,
    build_requests_proxy_config,
    get_playwright_proxy_unsupported_reason,
    normalize_proxy_url,
)


class ProxyUtilsTests(unittest.TestCase):
    def test_standard_proxy_url_is_preserved(self):
        self.assertEqual(
            normalize_proxy_url("http://user:pass@host:3000"),
            "http://user:pass@host:3000",
        )

    def test_legacy_proxy_url_with_scheme_is_rewritten(self):
        self.assertEqual(
            normalize_proxy_url("http://host:3000:user:pass"),
            "http://user:pass@host:3000",
        )

    def test_legacy_proxy_url_without_scheme_defaults_to_http(self):
        self.assertEqual(
            normalize_proxy_url("host:3000:user:pass"),
            "http://user:pass@host:3000",
        )

    def test_socks5_proxy_is_normalized_to_socks5h(self):
        self.assertEqual(
            normalize_proxy_url("socks5://host:1080:user:pass"),
            "socks5h://user:pass@host:1080",
        )

    def test_standard_socks5_proxy_url_is_normalized_to_socks5h(self):
        self.assertEqual(
            normalize_proxy_url("socks5://user:pass@host:1080"),
            "socks5h://user:pass@host:1080",
        )

    def test_build_requests_proxy_config_normalizes_legacy_input(self):
        self.assertEqual(
            build_requests_proxy_config("host:3000:user:pass"),
            {
                "http": "http://user:pass@host:3000",
                "https": "http://user:pass@host:3000",
            },
        )

    def test_build_playwright_proxy_config_splits_auth_fields(self):
        self.assertEqual(
            build_playwright_proxy_config("http://host:3000:user:pass"),
            {
                "server": "http://host:3000",
                "username": "user",
                "password": "pass",
            },
        )

    def test_build_playwright_proxy_config_converts_socks5h_server_to_socks5(self):
        self.assertEqual(
            build_playwright_proxy_config("socks5://user:pass@host:1080"),
            {
                "server": "socks5://host:1080",
                "username": "user",
                "password": "pass",
            },
        )

    def test_get_playwright_proxy_unsupported_reason_for_authenticated_socks5(self):
        self.assertEqual(
            get_playwright_proxy_unsupported_reason("socks5://user:pass@host:1080"),
            "Playwright/Chromium 不支持带认证的 SOCKS5 代理",
        )

    def test_get_playwright_proxy_unsupported_reason_for_http_proxy(self):
        self.assertEqual(
            get_playwright_proxy_unsupported_reason("http://user:pass@host:3000"),
            "",
        )

    def test_invalid_proxy_port_raises_value_error(self):
        with self.assertRaises(ValueError):
            normalize_proxy_url("http://host:badport:user:pass")


if __name__ == "__main__":
    unittest.main()
