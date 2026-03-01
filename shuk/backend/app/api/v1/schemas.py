from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CompanyBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    name_he: str
    name_en: str | None = None
    sector: str | None = None
    industry: str | None = None
    market_cap_ils: int | None = None


class CompanyDetail(CompanyBase):
    id: int
    description_he: str | None = None
    listing_date: date | None = None
    is_active: bool
    updated_at: datetime


class MetricsResponse(BaseModel):
    symbol: str
    revenue_cagr_5y: float | None = None
    eps_cagr_5y: float | None = None
    gross_margin: float | None = None
    operating_margin: float | None = None
    net_margin: float | None = None
    roic: float | None = None
    fcf_yield: float | None = None
    trailing_dividend_yield: float | None = None
    pe_ratio: float | None = None
    ev_to_ebitda: float | None = None


class DCFRequest(BaseModel):
    base_fcf: float
    growth_rates: list[float]
    terminal_growth: float = 0.03
    discount_rate: float = 0.10
    terminal_multiple: float | None = None
    shares_outstanding: int
    net_debt: float = 0.0
    current_price: float | None = None


class DCFResponse(BaseModel):
    intrinsic_value: float
    intrinsic_value_per_share: float
    upside_pct: float | None
    projected_fcfs: list[float]
    pv_fcfs: list[float]
    terminal_value: float
    pv_terminal_value: float
    total_pv: float
    assumptions: dict
    sensitivity: list[dict]


class PricePoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trade_date: date
    close_price: Decimal | None
    adjusted_close: Decimal | None
    volume: int | None


class DividendRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ex_date: date
    payment_date: date | None
    amount_ils: Decimal
    dividend_yield: Decimal | None
    dividend_type: str


class ScreenerItem(BaseModel):
    symbol: str
    name_he: str
    sector: str | None
    market_cap_ils: int | None
    pe_ratio: float | None
    net_margin: float | None
    revenue_cagr_5y: float | None
    dividend_yield: float | None


class ScreenerFilters(BaseModel):
    sector: list[str] | None = None
    market_cap_min: int | None = None
    market_cap_max: int | None = None
    pe_max: float | None = None
    net_margin_min: float | None = None
    revenue_cagr_min: float | None = None
    dividend_yield_min: float | None = None
