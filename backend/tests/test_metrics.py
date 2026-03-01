import pandas as pd
import pytest

from app.engine.metrics import (
    cagr,
    eps_cagr,
    ev_to_ebitda,
    fcf_yield,
    gross_margin,
    net_margin,
    operating_margin,
    pe_ratio,
    revenue_cagr,
    roic,
    trailing_dividend_yield,
)


def _stmt_df(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


def _div_df(rows: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    if "ex_date" in df.columns:
        df["ex_date"] = pd.to_datetime(df["ex_date"])
    return df


# ── cagr ──────────────────────────────────────────────────────────────────────

def test_cagr_basic():
    result = cagr(100, 161.05, 5)
    assert result == pytest.approx(0.10, abs=1e-3)


def test_cagr_zero_start():
    assert cagr(0, 100, 5) is None


def test_cagr_none():
    assert cagr(None, 100, 5) is None


# ── revenue_cagr ──────────────────────────────────────────────────────────────

def _annual_rows():
    return [
        {"period_type": "annual", "period_end": "2019-12-31", "revenue": 1000, "eps": 1.0,
         "gross_profit": 400, "operating_income": 200, "net_income": 150,
         "total_equity": 500, "total_debt": 200, "cash_and_equivalents": 50,
         "free_cash_flow": 120, "ebitda": 250},
        {"period_type": "annual", "period_end": "2020-12-31", "revenue": 1100, "eps": 1.1,
         "gross_profit": 450, "operating_income": 220, "net_income": 165,
         "total_equity": 550, "total_debt": 190, "cash_and_equivalents": 60,
         "free_cash_flow": 130, "ebitda": 270},
        {"period_type": "annual", "period_end": "2021-12-31", "revenue": 1250, "eps": 1.25,
         "gross_profit": 510, "operating_income": 260, "net_income": 195,
         "total_equity": 620, "total_debt": 180, "cash_and_equivalents": 70,
         "free_cash_flow": 150, "ebitda": 310},
        {"period_type": "annual", "period_end": "2022-12-31", "revenue": 1400, "eps": 1.40,
         "gross_profit": 580, "operating_income": 300, "net_income": 225,
         "total_equity": 700, "total_debt": 170, "cash_and_equivalents": 80,
         "free_cash_flow": 175, "ebitda": 360},
        {"period_type": "annual", "period_end": "2023-12-31", "revenue": 1610, "eps": 1.61,
         "gross_profit": 660, "operating_income": 350, "net_income": 260,
         "total_equity": 800, "total_debt": 160, "cash_and_equivalents": 90,
         "free_cash_flow": 200, "ebitda": 420},
    ]


def test_revenue_cagr_5y():
    df = _stmt_df(_annual_rows())
    result = revenue_cagr(df, 5)
    # from 1000 to 1610 over 4 periods (5 rows = 4 gaps)
    expected = cagr(1000, 1610, 4)
    assert result == pytest.approx(expected, rel=1e-3)


def test_revenue_cagr_empty():
    assert revenue_cagr(pd.DataFrame(), 5) is None


# ── margins ───────────────────────────────────────────────────────────────────

def test_gross_margin():
    df = _stmt_df(_annual_rows())
    result = gross_margin(df)
    assert result == pytest.approx(660 / 1610, rel=1e-3)


def test_operating_margin():
    df = _stmt_df(_annual_rows())
    result = operating_margin(df)
    assert result == pytest.approx(350 / 1610, rel=1e-3)


def test_net_margin():
    df = _stmt_df(_annual_rows())
    result = net_margin(df)
    assert result == pytest.approx(260 / 1610, rel=1e-3)


# ── roic ──────────────────────────────────────────────────────────────────────

def test_roic():
    df = _stmt_df(_annual_rows())
    result = roic(df, tax_rate=0.23)
    # Latest: op=350, equity=800, debt=160, cash=90
    nopat = 350 * (1 - 0.23)
    ic = 800 + 160 - 90
    assert result == pytest.approx(nopat / ic, rel=1e-3)


def test_roic_zero_invested_capital():
    row = {
        "period_type": "annual", "period_end": "2023-12-31",
        "operating_income": 100, "total_equity": 0,
        "total_debt": 0, "cash_and_equivalents": 0,
        "revenue": 500, "gross_profit": 200, "net_income": 80,
        "eps": 1.0, "ebitda": 120, "free_cash_flow": 70,
    }
    df = _stmt_df([row])
    assert roic(df) is None


# ── pe_ratio ──────────────────────────────────────────────────────────────────

def test_pe_ratio():
    assert pe_ratio(2.0, 40.0) == pytest.approx(20.0)


def test_pe_ratio_zero_eps():
    assert pe_ratio(0.0, 40.0) is None


def test_pe_ratio_none_price():
    assert pe_ratio(2.0, None) is None


# ── ev_to_ebitda ──────────────────────────────────────────────────────────────

def test_ev_to_ebitda():
    result = ev_to_ebitda(1000, 200, 100, 150)
    ev = 1000 + 200 - 100
    assert result == pytest.approx(ev / 150, rel=1e-3)


def test_ev_to_ebitda_zero_ebitda():
    assert ev_to_ebitda(1000, 200, 100, 0) is None


# ── fcf_yield ────────────────────────────────────────────────────────────────

def test_fcf_yield():
    df = _stmt_df(_annual_rows())
    result = fcf_yield(df, 2000)
    assert result == pytest.approx(200 / 2000, rel=1e-3)


# ── trailing_dividend_yield ───────────────────────────────────────────────────

def test_trailing_dividend_yield():
    import datetime
    today = datetime.date.today()
    divs = _div_df([
        {"ex_date": str(today - datetime.timedelta(days=30)), "amount_ils": 1.0},
        {"ex_date": str(today - datetime.timedelta(days=180)), "amount_ils": 1.0},
        {"ex_date": str(today - datetime.timedelta(days=400)), "amount_ils": 5.0},  # outside TTM
    ])
    result = trailing_dividend_yield(divs, 100.0)
    assert result == pytest.approx(2.0 / 100.0, rel=1e-3)
