from datetime import date

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas import (
    CompanyDetail,
    DCFRequest,
    DCFResponse,
    DividendRecord,
    FinancialRow,
    MetricsResponse,
    PricePoint,
)
from app.db.database import get_db
from app.db.models import Company, Dividend, FinancialStatement, HistoricalPrice
from app.engine import dcf as dcf_engine
from app.engine import metrics

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanyDetail])
async def list_companies(
    q: str | None = Query(None, description="Search by symbol or name"),
    sector: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Company).where(Company.is_active.is_(True))
    if q:
        stmt = stmt.where(
            Company.symbol.ilike(f"%{q}%") | Company.name_he.ilike(f"%{q}%")
        )
    if sector:
        stmt = stmt.where(Company.sector == sector)
    stmt = stmt.offset(offset).limit(limit).order_by(Company.market_cap_ils.desc().nullslast())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{symbol}", response_model=CompanyDetail)
async def get_company(symbol: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Company).where(Company.symbol == symbol.upper())
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("/{symbol}/metrics", response_model=MetricsResponse)
async def get_metrics(symbol: str, db: AsyncSession = Depends(get_db)):
    company = await _get_company_or_404(symbol, db)

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

    latest_price = await _latest_close(company.id, db)

    return MetricsResponse(
        symbol=symbol,
        revenue_cagr_5y=metrics.revenue_cagr(df, 5),
        eps_cagr_5y=metrics.eps_cagr(df, 5),
        gross_margin=metrics.gross_margin(df),
        operating_margin=metrics.operating_margin(df),
        net_margin=metrics.net_margin(df),
        roic=metrics.roic(df),
        fcf_yield=metrics.fcf_yield(df, company.market_cap_ils),
        trailing_dividend_yield=metrics.trailing_dividend_yield(divs_df, latest_price),
        pe_ratio=metrics.pe_ratio(_latest_eps(df), latest_price),
        ev_to_ebitda=metrics.ev_to_ebitda(
            company.market_cap_ils,
            _latest_value(df, "total_debt"),
            _latest_value(df, "cash_and_equivalents"),
            _latest_value(df, "ebitda"),
        ),
    )


@router.post("/{symbol}/dcf", response_model=DCFResponse)
async def compute_dcf(symbol: str, req: DCFRequest, db: AsyncSession = Depends(get_db)):
    await _get_company_or_404(symbol, db)
    try:
        result = dcf_engine.dcf(
            base_fcf=req.base_fcf,
            growth_rates=req.growth_rates,
            terminal_growth=req.terminal_growth,
            discount_rate=req.discount_rate,
            terminal_multiple=req.terminal_multiple,
            shares_outstanding=req.shares_outstanding,
            net_debt=req.net_debt,
            current_price=req.current_price,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return DCFResponse(**result.__dict__)


@router.get("/{symbol}/prices", response_model=list[PricePoint])
async def get_prices(
    symbol: str,
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    company = await _get_company_or_404(symbol, db)
    stmt = (
        select(HistoricalPrice)
        .where(HistoricalPrice.company_id == company.id)
        .order_by(HistoricalPrice.trade_date)
    )
    if from_date:
        stmt = stmt.where(HistoricalPrice.trade_date >= from_date)
    if to_date:
        stmt = stmt.where(HistoricalPrice.trade_date <= to_date)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{symbol}/financials", response_model=list[FinancialRow])
async def get_financials(symbol: str, db: AsyncSession = Depends(get_db)):
    company = await _get_company_or_404(symbol, db)
    result = await db.execute(
        select(FinancialStatement)
        .where(
            FinancialStatement.company_id == company.id,
            FinancialStatement.period_type == "annual",
        )
        .order_by(FinancialStatement.period_end)
    )
    rows = []
    for s in result.scalars().all():
        rev = s.revenue
        gp = s.gross_profit
        oi = s.operating_income
        ni = s.net_income
        rows.append(
            FinancialRow(
                year=s.period_end.year,
                revenue=rev,
                gross_profit=gp,
                operating_income=oi,
                net_income=ni,
                ebitda=s.ebitda,
                eps=float(s.eps) if s.eps is not None else None,
                free_cash_flow=s.free_cash_flow,
                total_debt=s.total_debt,
                cash_and_equivalents=s.cash_and_equivalents,
                gross_margin=(gp / rev) if rev and gp else None,
                operating_margin=(oi / rev) if rev and oi else None,
                net_margin=(ni / rev) if rev and ni else None,
            )
        )
    return rows


@router.get("/{symbol}/dividends", response_model=list[DividendRecord])
async def get_dividends(symbol: str, db: AsyncSession = Depends(get_db)):
    company = await _get_company_or_404(symbol, db)
    result = await db.execute(
        select(Dividend)
        .where(Dividend.company_id == company.id)
        .order_by(Dividend.ex_date.desc())
    )
    return result.scalars().all()


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_company_or_404(symbol: str, db: AsyncSession) -> Company:
    result = await db.execute(select(Company).where(Company.symbol == symbol.upper()))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


async def _latest_close(company_id: int, db: AsyncSession) -> float | None:
    result = await db.execute(
        select(HistoricalPrice.close_price)
        .where(HistoricalPrice.company_id == company_id)
        .order_by(HistoricalPrice.trade_date.desc())
        .limit(1)
    )
    val = result.scalar_one_or_none()
    return float(val) if val is not None else None


def _latest_eps(df: pd.DataFrame) -> float | None:
    if df.empty or "eps" not in df.columns:
        return None
    annual = df[df["period_type"] == "annual"].sort_values("period_end")
    if annual.empty:
        return None
    val = annual["eps"].iloc[-1]
    return float(val) if pd.notna(val) else None


def _latest_value(df: pd.DataFrame, col: str) -> float | None:
    if df.empty or col not in df.columns:
        return None
    annual = df[df["period_type"] == "annual"].sort_values("period_end")
    if annual.empty:
        return None
    val = annual[col].iloc[-1]
    return float(val) if pd.notna(val) else None
