"""Fetch financial statements from TASE for each company and upsert."""

import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Company, FinancialStatement, PeriodType
from app.services.tase_client import TASEClient

logger = logging.getLogger(__name__)


async def sync_financials(
    client: TASEClient,
    session: AsyncSession,
    period_type: PeriodType = PeriodType.annual,
) -> dict[str, int | list[str]]:
    """
    For each active company, fetch financial statements and upsert.
    Returns summary: { upserted: N, failed: [symbol, ...] }
    """
    result = await session.execute(select(Company).where(Company.is_active.is_(True)))
    companies = result.scalars().all()

    upserted = 0
    failed: list[str] = []

    for company in companies:
        try:
            path = f"/companies/{company.symbol}/financials"
            data = await client.get(path, params={"period": period_type.value})
            records: list[dict] = data.get("financials", data) if isinstance(data, dict) else data

            for rec in records:
                period_end = _parse_date(rec.get("periodEnd") or rec.get("date"))
                if not period_end:
                    continue

                stmt_result = await session.execute(
                    select(FinancialStatement).where(
                        FinancialStatement.company_id == company.id,
                        FinancialStatement.period_type == period_type,
                        FinancialStatement.period_end == period_end,
                    )
                )
                stmt = stmt_result.scalar_one_or_none()
                if stmt is None:
                    stmt = FinancialStatement(
                        company_id=company.id,
                        period_type=period_type,
                        period_end=period_end,
                    )
                    session.add(stmt)

                stmt.revenue = rec.get("revenue")
                stmt.gross_profit = rec.get("grossProfit")
                stmt.operating_income = rec.get("operatingIncome")
                stmt.net_income = rec.get("netIncome")
                stmt.ebitda = rec.get("ebitda")
                stmt.eps = rec.get("eps")
                stmt.total_assets = rec.get("totalAssets")
                stmt.total_equity = rec.get("totalEquity")
                stmt.total_debt = rec.get("totalDebt")
                stmt.cash_and_equivalents = rec.get("cashAndEquivalents")
                stmt.operating_cash_flow = rec.get("operatingCashFlow")
                stmt.capex = rec.get("capex")
                stmt.free_cash_flow = rec.get("freeCashFlow")
                upserted += 1

            await session.commit()
        except Exception as exc:
            logger.error("Failed to sync financials for %s: %s", company.symbol, exc)
            await session.rollback()
            failed.append(company.symbol)

    logger.info("Financials upserted: %d, failed: %d", upserted, len(failed))
    return {"upserted": upserted, "failed": failed}


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return None
