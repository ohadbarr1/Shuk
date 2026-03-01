"""Fetch company list from TASE and upsert into the database."""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Company
from app.services.tase_client import TASEClient

logger = logging.getLogger(__name__)


async def sync_companies(client: TASEClient, session: AsyncSession) -> int:
    """
    Fetch all active companies from TASE and upsert into `companies` table.
    Returns the number of rows upserted.
    """
    # NOTE: Adjust the endpoint path once you have TASE Data Hub API credentials.
    # Example path based on TASE Data Hub documentation.
    data = await client.get("/companies")
    companies_raw: list[dict] = data.get("companies", data) if isinstance(data, dict) else data

    count = 0
    for raw in companies_raw:
        symbol = raw.get("symbol") or raw.get("id")
        if not symbol:
            continue

        result = await session.execute(select(Company).where(Company.symbol == str(symbol)))
        company = result.scalar_one_or_none()

        if company is None:
            company = Company(symbol=str(symbol))
            session.add(company)

        company.name_he = raw.get("name", raw.get("nameHe", ""))
        company.name_en = raw.get("nameEn")
        company.sector = raw.get("sector")
        company.industry = raw.get("industry")
        company.market_cap_ils = raw.get("marketCap")
        company.description_he = raw.get("description")
        count += 1

    await session.commit()
    logger.info("Upserted %d companies", count)
    return count
