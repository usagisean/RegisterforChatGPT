from __future__ import annotations

from typing import Optional
from urllib.parse import quote, unquote, urlsplit, urlunsplit

DEFAULT_PROXY_SCHEME = "http"


def _normalize_proxy_scheme(scheme: str) -> str:
    value = str(scheme or "").strip().lower() or DEFAULT_PROXY_SCHEME
    return "socks5h" if value == "socks5" else value


def _format_proxy_host(host: str) -> str:
    value = str(host or "").strip()
    if not value:
        raise ValueError("代理主机不能为空")
    if ":" in value and not value.startswith("[") and not value.endswith("]"):
        return f"[{value}]"
    return value


def _build_proxy_url(
    *,
    scheme: str,
    host: str,
    port: int | None = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
) -> str:
    auth = ""
    normalized_scheme = _normalize_proxy_scheme(scheme)
    if username:
        auth = quote(unquote(str(username)), safe="")
        if password is not None:
            auth += f":{quote(unquote(str(password)), safe='')}"
        auth += "@"

    netloc = f"{auth}{_format_proxy_host(host)}"
    if port is not None:
        netloc += f":{port}"
    return urlunsplit((normalized_scheme, netloc, "", "", ""))


def _try_parse_legacy_proxy_url(proxy_url: str) -> Optional[str]:
    value = str(proxy_url or "").strip()
    if not value:
        return None

    scheme = DEFAULT_PROXY_SCHEME
    remainder = value
    if "://" in value:
        scheme, remainder = value.split("://", 1)
        scheme = _normalize_proxy_scheme(scheme)

    if "@" in remainder:
        return None

    parts = [item.strip() for item in remainder.split(":")]
    if len(parts) not in {2, 4}:
        return None

    host = parts[0]
    port_text = parts[1]
    if not host or not port_text:
        raise ValueError("代理地址格式不正确")
    if not port_text.isdigit():
        raise ValueError(f"代理端口格式不正确: {port_text}")

    username = password = None
    if len(parts) == 4:
        username, password = parts[2], parts[3]
        if not username or not password:
            raise ValueError("代理账号密码不能为空")

    return _build_proxy_url(
        scheme=scheme,
        host=host,
        port=int(port_text),
        username=username,
        password=password,
    )


def normalize_proxy_url(proxy_url: Optional[str]) -> Optional[str]:
    """将多种代理输入格式规范化为标准 URL。"""
    if proxy_url is None:
        return None

    value = str(proxy_url).strip()
    if not value:
        return None

    legacy_value = _try_parse_legacy_proxy_url(value)
    if legacy_value:
        return legacy_value

    candidate = value
    if "://" not in candidate and "@" in candidate:
        candidate = f"{DEFAULT_PROXY_SCHEME}://{candidate}"

    parts = urlsplit(candidate)
    if not parts.hostname:
        raise ValueError(f"代理地址格式不正确: {value}")

    try:
        port = parts.port
    except ValueError as exc:
        raise ValueError(f"代理端口格式不正确: {value}") from exc

    return _build_proxy_url(
        scheme=parts.scheme or DEFAULT_PROXY_SCHEME,
        host=parts.hostname,
        port=port,
        username=parts.username,
        password=parts.password,
    )


def build_requests_proxy_config(proxy_url: Optional[str]) -> Optional[dict[str, str]]:
    normalized = normalize_proxy_url(proxy_url)
    if not normalized:
        return None
    return {"http": normalized, "https": normalized}


def get_playwright_proxy_unsupported_reason(proxy_url: Optional[str]) -> str:
    normalized = normalize_proxy_url(proxy_url)
    if not normalized:
        return ""

    parts = urlsplit(normalized)
    if parts.scheme == "socks5h" and parts.username:
        return "Playwright/Chromium 不支持带认证的 SOCKS5 代理"
    return ""


def build_playwright_proxy_config(proxy_url: Optional[str]) -> Optional[dict[str, str]]:
    normalized = normalize_proxy_url(proxy_url)
    if not normalized:
        return None

    parts = urlsplit(normalized)
    if not parts.scheme or not parts.hostname or parts.port is None:
        return {"server": normalized}

    # Playwright/Chromium 不接受 socks5h://，浏览器侧使用 socks5:// 即可。
    browser_scheme = "socks5" if parts.scheme == "socks5h" else parts.scheme
    config = {
        "server": f"{browser_scheme}://{_format_proxy_host(parts.hostname)}:{parts.port}"
    }
    if parts.username:
        config["username"] = unquote(parts.username)
    if parts.password:
        config["password"] = unquote(parts.password)
    return config
