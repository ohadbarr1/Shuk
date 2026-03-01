import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas import ScreenerFilters, ScreenerItem
from app.db.database import get_db
from app.db.models import Company, Dividend, FinancialStatement, HistoricalPrice
from app.engine import metrics

router = APIRouter(prefix="/screener", tags=["screener"])


@router.post("", response_model=list[ScreenerItem])
async def screen(filters: ScreenerFilters, db: AsyncSession = Depends(get_db)):
    """
    Filter companies by fundamental metrics.
    Metrics are computed on the fly from stored data.
    For production, use a pre-computed metrics cache table.
    """
    stmt = select(Company).where(Company.is_active.is_(True))
    if filters.sector:
        stmt = stmt.where(Company.sector.in_(filters.sector))
    if filters.market_cap_min:
        stmt = stmt.where(Company.market_cap_ils >= filters.market_cap_min)
    if filters.market_cap_max:
        stmt = stmt.where(Company.market_cap_ils <= filters.market_cap_max)

    result = await db.execute(stmt)
    companies = result.scalars().all()

    items: list[ScreenerItem] = []
    for company in companies:
        stmts = await db.execute(
            select(FinancialStatement)
            .where(FinancialStatement.company_id == company.id)
            .order_by(FinancialStatement.period_end)
        )
        df = pd.DataFrame([s.__dict__ for s in stmts.scalars().all()])

        divs = await db.execute(
            select(Dividend).where(Dividend.company_id == company.id)
        )
        divs_df = pd.DataFrame([d.__dict__ for d in divs.scalars().all()])

        price_result = await db.execute(
            select(HistoricalPrice.close_price)
            .where(HistoricalPrice.company_id == company.id)
            .order_by(HistoricalPrice.trade_date.desc())
            .limit(1)
        )
        latest_price_val = price_result.scalar_one_or_none()
        latest_price = float(latest_price_val) if latest_price_val else None

        net_m = metrics.net_margin(df)
        rev_cagr = metrics.revenue_cagr(df, 5)

        latest_eps = None
        if not df.empty and "eps" in df.columns:
            annual = df[df.get("period_type") == "annual"].sort_values("period_end") if "period_type" in df.columns else df
            if not annual.empty:
                val = annual["eps"].iloc[-1]
                import math
                latest_eps = float(val) if val is not None and not (isinstance(val, float) and math.isnan(val)) else None

        pe = metrics.pe_ratio(latest_eps, latest_price)
        div_yield = metrics.trailing_dividend_yield(divs_df, latest_price)

        # Apply metric-based filters
        if filters.pe_max and (pe is None or pe > filters.pe_max):
            continue
        if filters.net_margin_min and (net_m is None or net_m < filters.net_margin_min):
            continue
        if filters.revenue_cagr_min and (rev_cagr is None or rev_cagr < filters.revenue_cagr_min):
            continue
        if filters.dividend_yield_min and (div_yield is None or div_yield < filters.dividend_yield_min):
            continue

        items.append(
            ScreenerItem(
                symbol=company.symbol,
                name_he=company.name_he,
                sector=company.sector,
                market_cap_ils=company.market_cap_ils,
                pe_ratio=pe,
                net_margin=net_m,
                revenue_cagr_5y=rev_cagr,
                dividend_yield=div_yield,
            )
        )

    return items
