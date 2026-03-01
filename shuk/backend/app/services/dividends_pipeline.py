"""Fetch dividend history from TASE and upsert."""

import logging
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Company, Dividend, DividendType
from app.services.tase_client import TASEClient

logger = logging.getLogger(__name__)


async def sync_dividends(client: TASEClient, session: AsyncSession) -> dict:
    result = await session.execute(select(Company).where(Company.is_active.is_(True)))
    companies = result.scalars().all()

    upserted = 0
    failed: list[str] = []

    for company in companies:
        try:
            data = await client.get(f"/companies/{company.symbol}/dividends")
            records: list[dict] = data.get("dividends", data) if isinstance(data, dict) else data

            for rec in records:
                ex_date = _parse_date(rec.get("exDate"))
                if not ex_date:
                    continue

                existing = await session.execute(
                    select(Dividend).where(
                        Dividend.company_id == company.id,
                        Dividend.ex_date == ex_date,
                    )
                )
                div = existing.scalar_one_or_none()
                if div is None:
                    div = Dividend(company_id=company.id, ex_date=ex_date)
                    session.add(div)

                div.payment_date = _parse_date(rec.get("paymentDate"))
                div.amount_ils = Decimal(str(rec.get("amount", 0)))
                div.dividend_yield = rec.get("dividendYield")
                div.dividend_type = DividendType(rec.get("type", "regular"))
                upserted += 1

            await session.commit()
        except Exception as exc:
            logger.error("Failed to sync dividends for %s: %s", company.symbol, exc)
            await session.rollback()
            failed.append(company.symbol)

    logger.info("Dividends upserted: %d, failed: %d", upserted, len(failed))
    return {"upserted": upserted, "failed": failed}


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return None
