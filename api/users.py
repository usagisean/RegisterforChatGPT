"""用户管理 API — 管理员查看/管理用户"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from api.auth import get_current_user, require_admin, _hash_pw
from core.db import UserModel, engine

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    quota_adjust: Optional[int] = None  # 正数加额度，负数减额度


# ── 当前用户信息 ──────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    """获取当前登录用户的详细信息（含额度）"""
    uid = user.get("uid", 0)

    # 环境变量管理员特殊处理
    if uid == 0:
        return {
            "uid": 0,
            "username": "admin",
            "role": "admin",
            "quota": -1,  # -1 表示无限
            "total_redeemed": 0,
            "total_consumed": 0,
            "is_active": True,
        }

    with Session(engine) as s:
        db_user = s.get(UserModel, uid)
        if not db_user:
            raise HTTPException(404, "用户不存在")
        return {
            "uid": db_user.id,
            "username": db_user.username,
            "role": db_user.role,
            "quota": db_user.quota,
            "total_redeemed": db_user.total_redeemed,
            "total_consumed": db_user.total_consumed,
            "is_active": db_user.is_active,
            "created_at": db_user.created_at.isoformat() if db_user.created_at else None,
        }


# ── 管理员操作 ─────────────────────────────────────────────────────────────────

@router.get("")
def list_users(
    page: int = 1,
    page_size: int = 20,
    admin: dict = Depends(require_admin),
):
    """管理员查看所有用户"""
    with Session(engine) as s:
        q = select(UserModel).order_by(UserModel.id.asc())
        total = len(s.exec(q).all())
        items = s.exec(q.offset((page - 1) * page_size).limit(page_size)).all()
        return {
            "total": total,
            "items": [
                {
                    "id": u.id,
                    "username": u.username,
                    "role": u.role,
                    "quota": u.quota,
                    "total_redeemed": u.total_redeemed,
                    "total_consumed": u.total_consumed,
                    "is_active": u.is_active,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                }
                for u in items
            ],
        }


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    body: UserUpdateRequest,
    admin: dict = Depends(require_admin),
):
    """管理员修改用户（启禁用、改角色、调整额度）"""
    with Session(engine) as s:
        db_user = s.get(UserModel, user_id)
        if not db_user:
            raise HTTPException(404, "用户不存在")

        if body.is_active is not None:
            db_user.is_active = body.is_active

        if body.role is not None:
            if body.role not in ("admin", "user"):
                raise HTTPException(400, "角色只能是 admin 或 user")
            db_user.role = body.role

        if body.quota_adjust is not None and body.quota_adjust != 0:
            from core.quota import add_quota, deduct_quota

            if body.quota_adjust > 0:
                add_quota(
                    user_id=user_id,
                    amount=body.quota_adjust,
                    reason=f"admin_adjust:+{body.quota_adjust}",
                )
            else:
                # 管理员扣减不受余额限制，直接更改
                db_user.quota = max(0, db_user.quota + body.quota_adjust)

            # 重新读取最新数据
            s.refresh(db_user)

        db_user.updated_at = datetime.now(timezone.utc)
        s.add(db_user)
        s.commit()
        s.refresh(db_user)

        return {
            "ok": True,
            "user": {
                "id": db_user.id,
                "username": db_user.username,
                "role": db_user.role,
                "quota": db_user.quota,
                "is_active": db_user.is_active,
            },
        }


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    admin: dict = Depends(require_admin),
):
    """管理员删除用户"""
    with Session(engine) as s:
        db_user = s.get(UserModel, user_id)
        if not db_user:
            raise HTTPException(404, "用户不存在")
        # 不允许删除自己
        if db_user.id == admin.get("uid"):
            raise HTTPException(400, "不能删除自己的账号")
        s.delete(db_user)
        s.commit()
    return {"ok": True}
