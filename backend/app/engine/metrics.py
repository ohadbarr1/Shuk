"""
Financial metrics calculations using Pandas.

All functions accept a pandas DataFrame with columns matching
the financial_statements table and return scalar values or Series.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def cagr(start: float, end: float, years: int) -> float | None:
    """Compound Annual Growth Rate."""
    if years <= 0 or start is None or start == 0 or end is None:
        return None
    return (end / start) ** (1 / years) - 1


def revenue_cagr(df: pd.DataFrame, years: int = 5) -> float | None:
    """Revenue CAGR over the last N annual periods."""
    annual = _annual_sorted(df)
    if len(annual) < 2:
        return None
    subset = annual.tail(years + 1)
    if len(subset) < 2:
        return None
    start_rev = subset["revenue"].iloc[0]
    end_rev = subset["revenue"].iloc[-1]
    n = len(subset) - 1
    return cagr(start_rev, end_rev, n)


def eps_cagr(df: pd.DataFrame, years: int = 5) -> float | None:
    """EPS CAGR over the last N annual periods."""
    annual = _annual_sorted(df)
    if len(annual) < 2:
        return None
    subset = annual.tail(years + 1)
    if len(subset) < 2:
        return None
    start_eps = subset["eps"].iloc[0]
    end_eps = subset["eps"].iloc[-1]
    if start_eps is None or float(start_eps) == 0:
        return None
    n = len(subset) - 1
    return cagr(float(start_eps), float(end_eps), n)


def gross_margin(df: pd.DataFrame) -> float | None:
    """Latest gross margin (gross_profit / revenue)."""
    row = _latest_annual(df)
    if row is None:
        return None
    return _safe_div(row.get("gross_profit"), row.get("revenue"))


def operating_margin(df: pd.DataFrame) -> float | None:
    """Latest operating margin."""
    row = _latest_annual(df)
    if row is None:
        return None
    return _safe_div(row.get("operating_income"), row.get("revenue"))


def net_margin(df: pd.DataFrame) -> float | None:
    """Latest net margin."""
    row = _latest_annual(df)
    if row is None:
        return None
    return _safe_div(row.get("net_income"), row.get("revenue"))


def roic(df: pd.DataFrame, tax_rate: float = 0.23) -> float | None:
    """
    Return on Invested Capital.
    ROIC = NOPAT / Invested Capital
    NOPAT = operating_income * (1 - tax_rate)
    Invested Capital = total_equity + total_debt - cash_and_equivalents
    """
    row = _latest_annual(df)
    if row is None:
        return None
    op = row.get("operating_income")
    equity = row.get("total_equity")
    debt = row.get("total_debt")
    cash = row.get("cash_and_equivalents") or 0
    if None in (op, equity, debt):
        return None
    nopat = float(op) * (1 - tax_rate)
    invested_capital = float(equity) + float(debt) - float(cash)
    if invested_capital == 0:
        return None
    return nopat / invested_capital


def fcf_yield(df: pd.DataFrame, market_cap: float | None) -> float | None:
    """FCF Yield = FCF / Market Cap."""
    if not market_cap or market_cap == 0:
        return None
    row = _latest_annual(df)
    if row is None:
        return None
    fcf = row.get("free_cash_flow")
    if fcf is None:
        return None
    return float(fcf) / float(market_cap)


def trailing_dividend_yield(
    dividends_df: pd.DataFrame,
    current_price: float | None,
) -> float | None:
    """Trailing 12-month dividend yield."""
    if current_price is None or current_price == 0 or dividends_df.empty:
        return None
    if "ex_date" not in dividends_df.columns:
        return None
    cutoff = (pd.Timestamp.now() - pd.DateOffset(months=12)).date()
    ttm = dividends_df[pd.to_datetime(dividends_df["ex_date"]).dt.date >= cutoff]
    total = ttm["amount_ils"].sum() if "amount_ils" in ttm.columns else 0
    return float(total) / float(current_price) if total else None


def pe_ratio(eps: float | None, price: float | None) -> float | None:
    """P/E ratio from latest EPS and current price."""
    if not eps or float(eps) == 0 or price is None:
        return None
    return float(price) / float(eps)


def ev_to_ebitda(
    market_cap: float | None,
    total_debt: float | None,
    cash: float | None,
    ebitda: float | None,
) -> float | None:
    """EV / EBITDA."""
    if None in (market_cap, total_debt, cash, ebitda) or float(ebitda) == 0:
        return None
    ev = float(market_cap) + float(total_debt) - float(cash)
    return ev / float(ebitda)


# ──────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────

def _annual_sorted(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty or "period_type" not in df.columns:
        return pd.DataFrame()
    annual = df[df["period_type"] == "annual"].copy()
    if "period_end" in annual.columns:
        annual = annual.sort_values("period_end")
    return annual


def _latest_annual(df: pd.DataFrame) -> dict | None:
    annual = _annual_sorted(df)
    if annual.empty:
        return None
    return annual.iloc[-1].to_dict()


def _safe_div(numerator, denominator) -> float | None:
    if numerator is None or denominator is None or float(denominator) == 0:
        return None
    return float(numerator) / float(denominator)
