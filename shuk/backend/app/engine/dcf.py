"""
Discounted Cash Flow (DCF) calculator.

Accepts user-customizable inputs and returns:
- projected FCFs per year
- terminal value
- total intrinsic value
- intrinsic value per share
- upside/downside % vs current price
- sensitivity table (discount_rate × terminal_multiple)
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DCFResult:
    intrinsic_value: float
    intrinsic_value_per_share: float
    upside_pct: float | None
    projected_fcfs: list[float]
    pv_fcfs: list[float]
    terminal_value: float
    pv_terminal_value: float
    total_pv: float
    assumptions: dict
    sensitivity: list[dict] = field(default_factory=list)


def dcf(
    base_fcf: float,
    growth_rates: list[float],
    terminal_growth: float,
    discount_rate: float,
    terminal_multiple: float | None,
    shares_outstanding: int,
    net_debt: float = 0.0,
    current_price: float | None = None,
) -> DCFResult:
    """
    Two-stage DCF model.

    Args:
        base_fcf:           Latest trailing FCF (ILS)
        growth_rates:       List of annual FCF growth rates, one per projection year
                            e.g. [0.20, 0.18, 0.15, 0.12, 0.10] for a 5-year forecast
        terminal_growth:    Perpetuity growth rate after projection period (e.g. 0.03)
        discount_rate:      WACC / required rate of return (e.g. 0.10)
        terminal_multiple:  If set, use exit-multiple method instead of Gordon Growth.
                            Terminal value = last_FCF * terminal_multiple
        shares_outstanding: Used to compute per-share intrinsic value
        net_debt:           Total debt - cash (positive = net debt, negative = net cash)
        current_price:      Current share price to compute upside %
    """
    if not growth_rates:
        raise ValueError("growth_rates must have at least one element")
    if discount_rate <= 0:
        raise ValueError("discount_rate must be positive")

    # Project FCFs
    projected_fcfs: list[float] = []
    fcf = base_fcf
    for g in growth_rates:
        fcf = fcf * (1 + g)
        projected_fcfs.append(fcf)

    # Discount projected FCFs
    pv_fcfs: list[float] = []
    for i, fcf_val in enumerate(projected_fcfs, start=1):
        pv_fcfs.append(fcf_val / ((1 + discount_rate) ** i))

    last_fcf = projected_fcfs[-1]
    n = len(growth_rates)

    # Terminal value
    if terminal_multiple is not None:
        tv = last_fcf * terminal_multiple
    else:
        # Gordon Growth Model
        if discount_rate <= terminal_growth:
            raise ValueError("discount_rate must exceed terminal_growth for Gordon Growth")
        tv = last_fcf * (1 + terminal_growth) / (discount_rate - terminal_growth)

    pv_tv = tv / ((1 + discount_rate) ** n)
    total_pv = sum(pv_fcfs) + pv_tv

    # Intrinsic equity value
    equity_value = total_pv - net_debt
    per_share = equity_value / shares_outstanding if shares_outstanding > 0 else 0.0

    upside = None
    if current_price and current_price > 0:
        upside = (per_share / current_price) - 1

    # Sensitivity: discount_rate ± 200bps × terminal_multiple ± 3x
    sensitivity = _sensitivity_table(
        base_fcf=base_fcf,
        growth_rates=growth_rates,
        terminal_growth=terminal_growth,
        base_discount=discount_rate,
        base_multiple=terminal_multiple,
        shares_outstanding=shares_outstanding,
        net_debt=net_debt,
    )

    return DCFResult(
        intrinsic_value=equity_value,
        intrinsic_value_per_share=per_share,
        upside_pct=upside,
        projected_fcfs=projected_fcfs,
        pv_fcfs=pv_fcfs,
        terminal_value=tv,
        pv_terminal_value=pv_tv,
        total_pv=total_pv,
        assumptions={
            "base_fcf": base_fcf,
            "growth_rates": growth_rates,
            "terminal_growth": terminal_growth,
            "discount_rate": discount_rate,
            "terminal_multiple": terminal_multiple,
            "shares_outstanding": shares_outstanding,
            "net_debt": net_debt,
        },
        sensitivity=sensitivity,
    )


def _sensitivity_table(
    base_fcf: float,
    growth_rates: list[float],
    terminal_growth: float,
    base_discount: float,
    base_multiple: float | None,
    shares_outstanding: int,
    net_debt: float,
) -> list[dict]:
    """3×3 sensitivity grid: discount rates × terminal multiples."""
    dr_offsets = [-0.02, 0.0, 0.02]
    mult_offsets = [-3, 0, 3] if base_multiple is not None else [0]

    rows = []
    for dr_off in dr_offsets:
        dr = round(base_discount + dr_off, 4)
        if dr <= 0:
            continue
        for m_off in mult_offsets:
            mult = (base_multiple + m_off) if base_multiple is not None else None
            try:
                result = dcf(
                    base_fcf=base_fcf,
                    growth_rates=growth_rates,
                    terminal_growth=terminal_growth,
                    discount_rate=dr,
                    terminal_multiple=mult,
                    shares_outstanding=shares_outstanding,
                    net_debt=net_debt,
                )
                rows.append(
                    {
                        "discount_rate": dr,
                        "terminal_multiple": mult,
                        "intrinsic_value_per_share": round(result.intrinsic_value_per_share, 2),
                    }
                )
            except ValueError:
                pass
    return rows
