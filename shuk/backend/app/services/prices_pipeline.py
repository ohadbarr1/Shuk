"""Fetch historical daily prices from TASE and upsert into historical_prices."""

import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Company, HistoricalPrice
from app.services.tase_client import TASEClient

logger = logging.getLogger(__name__)


async def sync_prices(
    client: TASEClient,
    session: AsyncSession,
    from_date: date | None = None,
) -> dict:
    result = await session.execute(select(Company).where(Company.is_active.is_(True)))
    companies = result.scalars().all()

    upserted = 0
    failed: list[str] = []

    for company in companies:
        try:
            params = {}
            if from_date:
                params["from"] = from_date.isoformat()
            data = await client.get(f"/companies/{company.symbol}/prices", params=params or None)
            records: list[dict] = data.get("prices", data) if isinstance(data, dict) else data

            rows = []
            for rec in records:
                trade_date = _parse_date(rec.get("date") or rec.get("tradeDate"))
                if not trade_date:
                    continue
                rows.append(
                    {
                        "company_id": company.id,
                        "trade_date": trade_date,
                        "open_price": rec.get("open"),
                        "high_price": rec.get("high"),
                        "low_price": rec.get("low"),
                        "close_price": rec.get("close"),
                        "adjusted_close": rec.get("adjustedClose"),
                        "volume": rec.get("volume"),
                    }
                )

            if rows:
                stmt = insert(HistoricalPrice).values(rows)
                stmt = stmt.on_conflict_do_update(
                    index_elements=["company_id", "trade_date"],
                    set_={
                        "close_price": stmt.excluded.close_price,
                        "adjusted_close": stmt.excluded.adjusted_close,
                        "volume": stmt.excluded.volume,
                    },
                )
                await session.execute(stmt)
                await session.commit()
                upserted += len(rows)
        except Exception as exc:
            logger.error("Failed to sync prices for %s: %s", company.symbol, exc)
            await session.rollback()
            failed.append(company.symbol)

    logger.info("Prices upserted: %d, failed: %d", upserted, len(failed))
    return {"upserted": upserted, "failed": failed}


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return None
