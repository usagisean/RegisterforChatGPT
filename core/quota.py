"""额度管理服务 — 充值、消耗、查询"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session

from core.db import QuotaLogModel, UserModel, engine

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_user_quota(user_id: int) -> int:
    """查询用户当前剩余额度"""
    with Session(engine) as s:
        user = s.get(UserModel, user_id)
        return user.quota if user else 0


def add_quota(
    user_id: int,
    amount: int,
    reason: str = "",
) -> int:
    """
    增加用户额度（充值）。
    返回变动后余额。
    """
    with Session(engine) as s:
        user = s.get(UserModel, user_id)
        if not user:
            raise ValueError(f"用户不存在: {user_id}")
        user.quota += amount
        user.total_redeemed += amount
        user.updated_at = _utcnow()
        balance_after = user.quota

        log = QuotaLogModel(
            user_id=user_id,
            change=amount,
            balance_after=balance_after,
            reason=reason,
        )
        s.add(user)
        s.add(log)
        s.commit()
        logger.info("用户 %s 充值 %d 额度，余额 %d，原因: %s", user_id, amount, balance_after, reason)
        return balance_after


def deduct_quota(
    user_id: int,
    amount: int = 1,
    reason: str = "",
) -> bool:
    """
    扣减用户额度（消耗）。
    返回是否扣减成功。余额不足时返回 False，不扣减。
    """
    with Session(engine) as s:
        user = s.get(UserModel, user_id)
        if not user:
            logger.warning("扣额度失败：用户不存在 %s", user_id)
            return False
        if user.quota < amount:
            logger.warning("扣额度失败：用户 %s 余额 %d 不足 %d", user_id, user.quota, amount)
            return False

        user.quota -= amount
        user.total_consumed += amount
        user.updated_at = _utcnow()
        balance_after = user.quota

        log = QuotaLogModel(
            user_id=user_id,
            change=-amount,
            balance_after=balance_after,
            reason=reason,
        )
        s.add(user)
        s.add(log)
        s.commit()
        logger.info("用户 %s 消耗 %d 额度，余额 %d，原因: %s", user_id, amount, balance_after, reason)
        return True


def check_quota(user_id: int, required: int = 1) -> bool:
    """检查用户额度是否足够"""
    return get_user_quota(user_id) >= required


def get_quota_logs(
    user_id: int,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """查询用户额度流水"""
    from sqlmodel import select

    with Session(engine) as s:
        q = select(QuotaLogModel).where(QuotaLogModel.user_id == user_id)
        q = q.order_by(QuotaLogModel.id.desc())
        total = len(s.exec(q).all())
        items = s.exec(q.offset((page - 1) * page_size).limit(page_size)).all()
        return {"total": total, "items": items}
