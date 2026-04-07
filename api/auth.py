"""Authentication API: 多用户注册登录、JWT session、TOTP 2FA、权限控制。"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json as _json
import os
import secrets
import struct
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlmodel import Session, select

from core.db import UserModel, engine

router = APIRouter(prefix="/auth", tags=["auth"])

_bearer = HTTPBearer(auto_error=False)
SESSION_COOKIE_NAME = "zxainexforge_session"


# ── Config helpers ─────────────────────────────────────────────────────────────

def _cfg():
    from core.config_store import config_store
    return config_store


def _env_admin_key() -> str:
    return str(os.getenv("ZXAI_ADMIN_KEY", "") or os.getenv("APP_ADMIN_KEY", "") or "").strip()


def auth_enabled() -> bool:
    """认证始终启用（多用户模式下）"""
    return bool(_env_admin_key() or _cfg().get("auth_password_hash", "") or _has_any_user())


def _has_any_user() -> bool:
    """检查是否存在任何用户"""
    with Session(engine) as s:
        user = s.exec(select(UserModel).limit(1)).first()
        return user is not None


def auth_managed_by_env() -> bool:
    return bool(_env_admin_key())


def _hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _request_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = None) -> str:
    if credentials is not None and credentials.credentials:
        return credentials.credentials
    return str(request.cookies.get(SESSION_COOKIE_NAME, "") or "").strip()


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=86400 * 7,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")


# ── JWT (HS256, stdlib only) ───────────────────────────────────────────────────

def _jwt_secret() -> str:
    env_secret = os.getenv("APP_JWT_SECRET", "")
    if env_secret:
        return env_secret
    stored = _cfg().get("auth_jwt_secret", "")
    if not stored:
        stored = secrets.token_hex(32)
        _cfg().set("auth_jwt_secret", stored)
    return stored


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    pad = 4 - len(s) % 4
    if pad != 4:
        s += "=" * pad
    return base64.urlsafe_b64decode(s)


def create_token(
    user_id: int = 0,
    username: str = "admin",
    role: str = "admin",
    expire_seconds: int = 86400 * 7,
) -> str:
    """生成 JWT Token，payload 中携带用户信息"""
    header = _b64url_encode(_json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url_encode(_json.dumps({
        "sub": f"user:{user_id}" if user_id else "admin",
        "uid": user_id,
        "name": username,
        "role": role,
        "exp": int(time.time()) + expire_seconds,
        "iat": int(time.time()),
    }).encode())
    sig = _b64url_encode(
        hmac.new(_jwt_secret().encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    )
    return f"{header}.{payload}.{sig}"


def verify_token(token: str) -> dict:
    try:
        header, payload, sig = token.split(".")
    except ValueError:
        raise HTTPException(status_code=401, detail="无效的令牌")
    expected = _b64url_encode(
        hmac.new(_jwt_secret().encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    )
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=401, detail="令牌签名无效")
    try:
        data = _json.loads(_b64url_decode(payload))
    except Exception:
        raise HTTPException(status_code=401, detail="令牌格式错误")
    if data.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="令牌已过期，请重新登录")
    return data


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """
    依赖注入：解析当前登录用户。
    返回 {"uid": int, "name": str, "role": str}
    """
    token = _request_token(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="未认证")
    data = verify_token(token)
    return {
        "uid": data.get("uid", 0),
        "name": data.get("name", "admin"),
        "role": data.get("role", "admin"),
    }


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """依赖注入：要求管理员权限"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


def require_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> None:
    token = _request_token(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="未认证")
    verify_token(token)


# ── TOTP (RFC 6238, stdlib only) ───────────────────────────────────────────────

def generate_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode()


def totp_uri(secret: str, issuer: str = "zxaiNexForge") -> str:
    from urllib.parse import quote
    return f"otpauth://totp/{quote(issuer)}?secret={secret}&issuer={quote(issuer)}"


def _totp_at(secret: str, counter: int) -> str:
    key = base64.b32decode(secret.upper())
    msg = struct.pack(">Q", counter)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    code = struct.unpack(">I", h[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code % 1_000_000).zfill(6)


def verify_totp(secret: str, code: str) -> bool:
    counter = int(time.time()) // 30
    user_code = str(code).strip().zfill(6)
    for delta in (-1, 0, 1):
        if hmac.compare_digest(_totp_at(secret, counter + delta), user_code):
            return True
    return False


# ── Pending 2FA sessions (in-memory) ──────────────────────────────────────────

# temp_token -> {"expires_at": float, "user_id": int, "username": str, "role": str}
_pending_2fa: dict[str, dict] = {}


# ── Schemas ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    password: str
    username: str = ""


class RegisterRequest(BaseModel):
    username: str
    password: str


class TotpVerifyRequest(BaseModel):
    temp_token: str
    code: str


class SetupPasswordRequest(BaseModel):
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class EnableTotpRequest(BaseModel):
    secret: str
    code: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/status")
def auth_status(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
):
    cfg = _cfg()
    token = _request_token(request, credentials)
    authenticated = False
    user_info = None
    if token:
        try:
            data = verify_token(token)
            authenticated = True
            user_info = {
                "uid": data.get("uid", 0),
                "name": data.get("name", "admin"),
                "role": data.get("role", "admin"),
            }
        except HTTPException:
            authenticated = False
    return {
        "has_password": auth_enabled(),
        "has_totp": bool(cfg.get("auth_totp_secret", "")),
        "managed_by_env": auth_managed_by_env(),
        "authenticated": authenticated,
        "user": user_info,
    }


@router.post("/register")
def user_register(body: RegisterRequest, response: Response):
    """用户注册"""
    username = str(body.username or "").strip()
    password = str(body.password or "").strip()
    if not username or len(username) < 2:
        raise HTTPException(400, "用户名至少 2 个字符")
    if not password or len(password) < 6:
        raise HTTPException(400, "密码至少 6 位")

    with Session(engine) as s:
        existing = s.exec(
            select(UserModel).where(UserModel.username == username)
        ).first()
        if existing:
            raise HTTPException(409, "用户名已存在")

        # 第一个注册的用户自动成为管理员
        is_first = s.exec(select(UserModel).limit(1)).first() is None
        role = "admin" if is_first else "user"

        user = UserModel(
            username=username,
            password_hash=_hash_pw(password),
            role=role,
            quota=0,
        )
        s.add(user)
        s.commit()
        s.refresh(user)

        token = create_token(
            user_id=user.id,
            username=user.username,
            role=user.role,
        )
        _set_auth_cookie(response, token)
        return {
            "ok": True,
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "uid": user.id,
                "name": user.username,
                "role": user.role,
            },
        }


@router.post("/login")
def login(body: LoginRequest, response: Response):
    cfg = _cfg()
    username = str(body.username or "").strip()
    password = str(body.password or "").strip()

    # 兼容旧的环境变量管理员模式（无用户名直接用密码登录）
    env_key = _env_admin_key()
    if env_key and (not username or username == "admin"):
        if hmac.compare_digest(password, env_key):
            totp_secret = cfg.get("auth_totp_secret", "")
            if totp_secret:
                temp = secrets.token_hex(24)
                _pending_2fa[temp] = {
                    "expires_at": time.time() + 300,
                    "user_id": 0,
                    "username": "admin",
                    "role": "admin",
                }
                return {"requires_2fa": True, "temp_token": temp}
            token = create_token(user_id=0, username="admin", role="admin")
            _set_auth_cookie(response, token)
            return {
                "requires_2fa": False,
                "access_token": token,
                "token_type": "bearer",
                "user": {"uid": 0, "name": "admin", "role": "admin"},
            }
        raise HTTPException(401, "密码错误")

    # 多用户登录
    if not username:
        raise HTTPException(400, "请输入用户名")

    with Session(engine) as s:
        user = s.exec(
            select(UserModel).where(UserModel.username == username)
        ).first()
        if not user:
            raise HTTPException(401, "用户名或密码错误")
        if not user.is_active:
            raise HTTPException(403, "账号已被禁用，请联系管理员")
        if not hmac.compare_digest(_hash_pw(password), user.password_hash):
            raise HTTPException(401, "用户名或密码错误")

        totp_secret = cfg.get("auth_totp_secret", "")
        if totp_secret and user.role == "admin":
            temp = secrets.token_hex(24)
            _pending_2fa[temp] = {
                "expires_at": time.time() + 300,
                "user_id": user.id,
                "username": user.username,
                "role": user.role,
            }
            return {"requires_2fa": True, "temp_token": temp}

        token = create_token(
            user_id=user.id,
            username=user.username,
            role=user.role,
        )
        _set_auth_cookie(response, token)
        return {
            "requires_2fa": False,
            "access_token": token,
            "token_type": "bearer",
            "user": {"uid": user.id, "name": user.username, "role": user.role},
        }


@router.post("/verify-totp")
def verify_totp_route(body: TotpVerifyRequest, response: Response):
    pending = _pending_2fa.get(body.temp_token)
    if not pending or time.time() > pending["expires_at"]:
        raise HTTPException(status_code=401, detail="临时令牌无效或已过期，请重新登录")
    cfg = _cfg()
    secret = cfg.get("auth_totp_secret", "")
    if not secret:
        raise HTTPException(status_code=400, detail="2FA 未启用")
    if not verify_totp(secret, body.code):
        raise HTTPException(status_code=400, detail="验证码错误")
    _pending_2fa.pop(body.temp_token, None)
    token = create_token(
        user_id=pending["user_id"],
        username=pending["username"],
        role=pending["role"],
    )
    _set_auth_cookie(response, token)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
def logout(response: Response):
    _clear_auth_cookie(response)
    return {"ok": True}


@router.post("/change-password")
def change_password(body: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    if not body.new_password or len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少需要 6 位")

    uid = user.get("uid", 0)

    # 环境变量管理员无法通过此接口改密码
    if uid == 0 and auth_managed_by_env():
        raise HTTPException(409, "当前由环境变量管理员密钥控制，不能在页面内修改")

    with Session(engine) as s:
        db_user = s.get(UserModel, uid)
        if not db_user:
            raise HTTPException(404, "用户不存在")
        if not hmac.compare_digest(_hash_pw(body.current_password), db_user.password_hash):
            raise HTTPException(400, "当前密码错误")
        db_user.password_hash = _hash_pw(body.new_password)
        db_user.updated_at = _utcnow()
        s.add(db_user)
        s.commit()
    return {"ok": True}


@router.get("/2fa/setup", dependencies=[Depends(require_admin)])
def setup_2fa():
    secret = generate_totp_secret()
    return {"secret": secret, "uri": totp_uri(secret)}


@router.post("/2fa/enable", dependencies=[Depends(require_admin)])
def enable_2fa(body: EnableTotpRequest):
    if not body.secret or len(body.secret) < 16:
        raise HTTPException(status_code=400, detail="无效的密钥")
    if not verify_totp(body.secret, body.code):
        raise HTTPException(status_code=400, detail="验证码错误，请重试")
    _cfg().set("auth_totp_secret", body.secret)
    return {"ok": True}


@router.post("/2fa/disable", dependencies=[Depends(require_admin)])
def disable_2fa():
    _cfg().set("auth_totp_secret", "")
    return {"ok": True}


# ── 兼容旧接口 ──────────────────────────────────────────────────────────────────

@router.post("/setup")
def setup_password(
    body: SetupPasswordRequest,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
):
    """兼容旧的密码设置接口 — 如果还没有任何用户，创建第一个管理员"""
    if not body.password or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少需要 6 位")
    if auth_managed_by_env():
        raise HTTPException(status_code=409, detail="当前由环境变量管理员密钥控制，不能在页面内修改")

    with Session(engine) as s:
        has_users = s.exec(select(UserModel).limit(1)).first() is not None
        if has_users:
            # 如果已有用户，需要先认证
            token = _request_token(
                Request(scope={"type": "http", "headers": []}),
                credentials,
            ) if credentials else ""
            if token:
                verify_token(token)
            else:
                raise HTTPException(401, "已有用户，请先登录")
        # 创建管理员用户
        admin = s.exec(
            select(UserModel).where(UserModel.role == "admin")
        ).first()
        if admin:
            admin.password_hash = _hash_pw(body.password)
            s.add(admin)
        else:
            admin = UserModel(
                username="admin",
                password_hash=_hash_pw(body.password),
                role="admin",
            )
            s.add(admin)
        s.commit()
        s.refresh(admin)

    token = create_token(user_id=admin.id, username=admin.username, role="admin")
    _set_auth_cookie(response, token)
    return {"ok": True, "access_token": token, "token_type": "bearer"}


@router.post("/disable")
def disable_auth(
    response: Response,
    user: dict = Depends(get_current_user),
):
    """禁用密码保护（仅管理员）"""
    if user.get("role") != "admin":
        raise HTTPException(403, "需要管理员权限")
    if auth_managed_by_env():
        raise HTTPException(status_code=409, detail="当前由环境变量管理员密钥控制，不能在页面内关闭")
    cfg = _cfg()
    cfg.set("auth_password_hash", "")
    cfg.set("auth_totp_secret", "")
    _clear_auth_cookie(response)
    return {"ok": True}


def _utcnow():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)
