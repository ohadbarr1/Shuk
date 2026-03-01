from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class PeriodType(str, PyEnum):
    annual = "annual"
    quarterly = "quarterly"


class DividendType(str, PyEnum):
    regular = "regular"
    special = "special"
    return_of_capital = "return_of_capital"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    name_he: Mapped[str] = mapped_column(Text, nullable=False)
    name_en: Mapped[str | None] = mapped_column(Text)
    sector: Mapped[str | None] = mapped_column(String(100))
    industry: Mapped[str | None] = mapped_column(String(100))
    market_cap_ils: Mapped[int | None] = mapped_column(BigInteger)
    description_he: Mapped[str | None] = mapped_column(Text)
    listing_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    statements: Mapped[list["FinancialStatement"]] = relationship(back_populates="company")
    prices: Mapped[list["HistoricalPrice"]] = relationship(back_populates="company")
    dividends: Mapped[list["Dividend"]] = relationship(back_populates="company")


class FinancialStatement(Base):
    __tablename__ = "financial_statements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    period_type: Mapped[PeriodType] = mapped_column(Enum(PeriodType), nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    # Income statement
    revenue: Mapped[int | None] = mapped_column(BigInteger)
    gross_profit: Mapped[int | None] = mapped_column(BigInteger)
    operating_income: Mapped[int | None] = mapped_column(BigInteger)
    net_income: Mapped[int | None] = mapped_column(BigInteger)
    ebitda: Mapped[int | None] = mapped_column(BigInteger)
    eps: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))

    # Balance sheet
    total_assets: Mapped[int | None] = mapped_column(BigInteger)
    total_equity: Mapped[int | None] = mapped_column(BigInteger)
    total_debt: Mapped[int | None] = mapped_column(BigInteger)
    cash_and_equivalents: Mapped[int | None] = mapped_column(BigInteger)

    # Cash flow
    operating_cash_flow: Mapped[int | None] = mapped_column(BigInteger)
    capex: Mapped[int | None] = mapped_column(BigInteger)
    free_cash_flow: Mapped[int | None] = mapped_column(BigInteger)

    source_url: Mapped[str | None] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    company: Mapped["Company"] = relationship(back_populates="statements")

    __table_args__ = (
        UniqueConstraint("company_id", "period_type", "period_end"),
        Index("ix_fin_stmt_company_period", "company_id", "period_type", "period_end"),
    )


class HistoricalPrice(Base):
    __tablename__ = "historical_prices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    trade_date: Mapped[date] = mapped_column(Date, nullable=False)
    open_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    high_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    low_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    close_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    adjusted_close: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    volume: Mapped[int | None] = mapped_column(BigInteger)

    company: Mapped["Company"] = relationship(back_populates="prices")

    __table_args__ = (
        UniqueConstraint("company_id", "trade_date"),
        Index("ix_price_company_date", "company_id", "trade_date"),
    )


class Dividend(Base):
    __tablename__ = "dividends"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    ex_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_date: Mapped[date | None] = mapped_column(Date)
    amount_ils: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    dividend_yield: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    dividend_type: Mapped[DividendType] = mapped_column(
        Enum(DividendType), default=DividendType.regular, nullable=False
    )

    company: Mapped["Company"] = relationship(back_populates="dividends")

    __table_args__ = (
        Index("ix_dividend_company_exdate", "company_id", "ex_date"),
    )
