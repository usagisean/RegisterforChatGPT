from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from pydantic import BaseModel
from core.db import ProxyModel, get_session
from core.proxy_pool import proxy_pool
from core.proxy_utils import normalize_proxy_url

router = APIRouter(prefix="/proxies", tags=["proxies"])


class ProxyCreate(BaseModel):
    url: str
    region: str = ""


class ProxyBulkCreate(BaseModel):
    proxies: list[str]
    region: str = ""


class ProxyBatchDeleteRequest(BaseModel):
    ids: list[int]


def _normalize_proxy_or_raise(raw_url: str) -> str:
    try:
        normalized = normalize_proxy_url(raw_url)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    if not normalized:
        raise HTTPException(400, "代理地址不能为空")
    return normalized


def _find_proxy_by_normalized_url(session: Session, normalized_url: str) -> ProxyModel | None:
    existing = session.exec(
        select(ProxyModel).where(ProxyModel.url == normalized_url)
    ).first()
    if existing:
        return existing

    for item in session.exec(select(ProxyModel)).all():
        try:
            candidate = normalize_proxy_url(item.url)
        except ValueError:
            continue
        if candidate == normalized_url:
            return item
    return None


@router.get("")
def list_proxies(session: Session = Depends(get_session)):
    items = session.exec(select(ProxyModel)).all()
    return items


@router.post("")
def add_proxy(body: ProxyCreate, session: Session = Depends(get_session)):
    normalized_url = _normalize_proxy_or_raise(body.url)
    existing = _find_proxy_by_normalized_url(session, normalized_url)
    if existing:
        raise HTTPException(400, "代理已存在")
    p = ProxyModel(url=normalized_url, region=body.region)
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


@router.post("/bulk")
def bulk_add_proxies(body: ProxyBulkCreate, session: Session = Depends(get_session)):
    added = 0
    invalid = []
    for idx, url in enumerate(body.proxies, start=1):
        raw_url = url.strip()
        if not raw_url:
            continue
        try:
            normalized_url = _normalize_proxy_or_raise(raw_url)
        except HTTPException as exc:
            invalid.append(
                {
                    "line": idx,
                    "url": raw_url,
                    "error": str(exc.detail),
                }
            )
            continue
        existing = _find_proxy_by_normalized_url(session, normalized_url)
        if not existing:
            session.add(ProxyModel(url=normalized_url, region=body.region))
            added += 1
    session.commit()
    return {"added": added, "invalid": invalid}


@router.delete("/{proxy_id}")
def delete_proxy(proxy_id: int, session: Session = Depends(get_session)):
    p = session.get(ProxyModel, proxy_id)
    if not p:
        raise HTTPException(404, "代理不存在")
    session.delete(p)
    session.commit()
    return {"ok": True}


@router.post("/batch-delete")
def batch_delete_proxies(
    body: ProxyBatchDeleteRequest,
    session: Session = Depends(get_session),
):
    if not body.ids:
        raise HTTPException(400, "代理 ID 列表不能为空")

    unique_ids = list(dict.fromkeys(body.ids))
    if len(unique_ids) > 1000:
        raise HTTPException(400, "单次最多删除 1000 个代理")

    try:
        proxies = session.exec(select(ProxyModel).where(ProxyModel.id.in_(unique_ids))).all()
        found_ids = {proxy.id for proxy in proxies if proxy.id is not None}

        for proxy in proxies:
            session.delete(proxy)

        session.commit()
        return {
            "deleted": len(found_ids),
            "not_found": [proxy_id for proxy_id in unique_ids if proxy_id not in found_ids],
            "total_requested": len(unique_ids),
        }
    except Exception as exc:
        session.rollback()
        raise HTTPException(500, f"批量删除代理失败: {str(exc)}") from exc


@router.patch("/{proxy_id}/toggle")
def toggle_proxy(proxy_id: int, session: Session = Depends(get_session)):
    p = session.get(ProxyModel, proxy_id)
    if not p:
        raise HTTPException(404, "代理不存在")
    p.is_active = not p.is_active
    session.add(p)
    session.commit()
    return {"is_active": p.is_active}


@router.post("/check")
def check_proxies(background_tasks: BackgroundTasks):
    background_tasks.add_task(proxy_pool.check_all)
    return {"message": "检测任务已启动"}
