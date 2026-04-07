"""兑换码 API — 生成、使用、管理"""

from __future__ import annotations

import secrets
import string
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from api.auth import get_current_user, require_admin
from core.db import RedeemCodeModel, QuotaLogModel, engine
from core.quota import add_quota, get_quota_logs

router = APIRouter(prefix="/redeem", tags=["redeem"])


def _generate_code() -> str:
    """生成 NEXF-XXXX-XXXX-XXXX 格式的兑换码"""
    chars = string.ascii_uppercase + string.digits
    parts = [
        "NEXF",
        "".join(secrets.choice(chars) for _ in range(4)),
        "".join(secrets.choice(chars) for _ in range(4)),
        "".join(secrets.choice(chars) for _ in range(4)),
    ]
    return "-".join(parts)


class GenerateRequest(BaseModel):
    count: int = 1  # 生成数量
    quota: int = 1  # 每个兑换码的额度


class UseRequest(BaseModel):
    code: str


# ── 管理员操作 ─────────────────────────────────────────────────────────────────

@router.post("/generate")
def generate_codes(
    body: GenerateRequest,
    admin: dict = Depends(require_admin),
):
    """管理员批量生成兑换码"""
    if body.count < 1 or body.count > 100:
        raise HTTPException(400, "单次生成数量 1-100")
    if body.quota < 1 or body.quota > 10000:
        raise HTTPException(400, "单码额度 1-10000")

    codes = []
    with Session(engine) as s:
        for _ in range(body.count):
            # 生成不重复的兑换码
            for _attempt in range(10):
                code = _generate_code()
                existing = s.exec(
                    select(RedeemCodeModel).where(RedeemCodeModel.code == code)
                ).first()
                if not existing:
                    break
            else:
                raise HTTPException(500, "兑换码生成冲突，请重试")

            item = RedeemCodeModel(code=code, quota=body.quota)
            s.add(item)
            codes.append({"code": code, "quota": body.quota})
        s.commit()

    return {"ok": True, "codes": codes, "count": len(codes)}


@router.get("/list")
def list_codes(
    page: int = 1,
    page_size: int = 50,
    used: Optional[str] = None,
    admin: dict = Depends(require_admin),
):
    """管理员查看所有兑换码"""
    with Session(engine) as s:
        q = select(RedeemCodeModel).order_by(RedeemCodeModel.id.desc())
        if used == "true":
            q = q.where(RedeemCodeModel.used_by.isnot(None))
        elif used == "false":
            q = q.where(RedeemCodeModel.used_by.is_(None))

        all_items = s.exec(q).all()
        total = len(all_items)
        items = s.exec(q.offset((page - 1) * page_size).limit(page_size)).all()
        return {
            "total": total,
            "items": [
                {
                    "id": c.id,
                    "code": c.code,
                    "quota": c.quota,
                    "used_by": c.used_by,
                    "used_at": c.used_at.isoformat() if c.used_at else None,
                    "expires_at": c.expires_at.isoformat() if c.expires_at else None,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                }
                for c in items
            ],
        }


@router.delete("/{code_id}")
def delete_code(
    code_id: int,
    admin: dict = Depends(require_admin),
):
    """管理员删除兑换码"""
    with Session(engine) as s:
        item = s.get(RedeemCodeModel, code_id)
        if not item:
            raise HTTPException(404, "兑换码不存在")
        s.delete(item)
        s.commit()
    return {"ok": True}


@router.post("/batch-delete")
def batch_delete_codes(
    body: dict,
    admin: dict = Depends(require_admin),
):
    """管理员批量删除兑换码"""
    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(400, "ID 列表不能为空")
    with Session(engine) as s:
        deleted = 0
        for code_id in ids:
            item = s.get(RedeemCodeModel, code_id)
            if item:
                s.delete(item)
                deleted += 1
        s.commit()
    return {"ok": True, "deleted": deleted}


# ── 用户操作 ───────────────────────────────────────────────────────────────────

@router.post("/use")
def use_code(
    body: UseRequest,
    user: dict = Depends(get_current_user),
):
    """用户使用兑换码充值"""
    code_str = str(body.code or "").strip().upper()
    if not code_str:
        raise HTTPException(400, "请输入兑换码")

    uid = user.get("uid", 0)
    if uid == 0:
        raise HTTPException(400, "环境变量管理员无需充值额度")

    with Session(engine) as s:
        item = s.exec(
            select(RedeemCodeModel).where(RedeemCodeModel.code == code_str)
        ).first()
        if not item:
            raise HTTPException(404, "兑换码不存在或已失效")
        if item.used_by is not None:
            raise HTTPException(409, "兑换码已被使用")
        if item.expires_at and datetime.now(timezone.utc) > item.expires_at:
            raise HTTPException(410, "兑换码已过期")

        # 标记兑换码已使用
        item.used_by = uid
        item.used_at = datetime.now(timezone.utc)
        s.add(item)
        s.commit()

    # 增加额度
    balance = add_quota(uid, item.quota, reason=f"redeem:{code_str}")
    return {
        "ok": True,
        "added": item.quota,
        "balance": balance,
        "message": f"成功充值 {item.quota} 额度，当前余额 {balance}",
    }


@router.get("/logs")
def get_my_quota_logs(
    page: int = 1,
    page_size: int = 20,
    user: dict = Depends(get_current_user),
):
    """查看自己的额度流水"""
    uid = user.get("uid", 0)
    if uid == 0:
        return {"total": 0, "items": []}
    return get_quota_logs(uid, page=page, page_size=page_size)
