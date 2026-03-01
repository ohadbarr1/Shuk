import pytest

from app.engine.dcf import DCFResult, dcf


def _base_inputs(**overrides):
    defaults = dict(
        base_fcf=100.0,
        growth_rates=[0.10, 0.10, 0.10, 0.10, 0.10],
        terminal_growth=0.03,
        discount_rate=0.10,
        terminal_multiple=None,
        shares_outstanding=1000,
        net_debt=0.0,
        current_price=None,
    )
    return {**defaults, **overrides}


def test_dcf_returns_dcf_result():
    result = dcf(**_base_inputs())
    assert isinstance(result, DCFResult)


def test_projected_fcfs_count():
    result = dcf(**_base_inputs())
    assert len(result.projected_fcfs) == 5


def test_projected_fcfs_growth():
    result = dcf(**_base_inputs(base_fcf=100.0, growth_rates=[0.10]))
    assert result.projected_fcfs[0] == pytest.approx(110.0)


def test_terminal_value_gordon_growth():
    # Simple 1-year model for easy hand calculation
    r = dcf(**_base_inputs(
        base_fcf=100.0,
        growth_rates=[0.0],
        terminal_growth=0.03,
        discount_rate=0.10,
        shares_outstanding=1,
    ))
    # projected_fcf year 1 = 100 (0% growth)
    # tv = 100 * 1.03 / (0.10 - 0.03) = 1471.43
    assert r.terminal_value == pytest.approx(100.0 * 1.03 / (0.10 - 0.03), rel=1e-3)


def test_terminal_value_exit_multiple():
    r = dcf(**_base_inputs(
        base_fcf=100.0,
        growth_rates=[0.0],
        terminal_multiple=15.0,
        shares_outstanding=1,
    ))
    # last_fcf = 100 (0% growth), tv = 100 * 15 = 1500
    assert r.terminal_value == pytest.approx(1500.0)


def test_intrinsic_value_per_share():
    r = dcf(**_base_inputs(shares_outstanding=1000, net_debt=0.0))
    assert r.intrinsic_value_per_share == pytest.approx(r.intrinsic_value / 1000, rel=1e-6)


def test_upside_pct_with_current_price():
    r = dcf(**_base_inputs(current_price=50.0))
    expected = (r.intrinsic_value_per_share / 50.0) - 1
    assert r.upside_pct == pytest.approx(expected, rel=1e-6)


def test_upside_pct_none_without_price():
    r = dcf(**_base_inputs(current_price=None))
    assert r.upside_pct is None


def test_sensitivity_table_populated():
    r = dcf(**_base_inputs(terminal_multiple=15.0))
    assert len(r.sensitivity) > 0
    for row in r.sensitivity:
        assert "discount_rate" in row
        assert "intrinsic_value_per_share" in row


def test_discount_rate_must_exceed_terminal_growth():
    with pytest.raises(ValueError, match="discount_rate must exceed terminal_growth"):
        dcf(**_base_inputs(discount_rate=0.02, terminal_growth=0.05))


def test_empty_growth_rates_raises():
    with pytest.raises(ValueError):
        dcf(**_base_inputs(growth_rates=[]))


def test_net_debt_reduces_equity_value():
    r_no_debt = dcf(**_base_inputs(net_debt=0.0))
    r_with_debt = dcf(**_base_inputs(net_debt=500.0))
    assert r_with_debt.intrinsic_value < r_no_debt.intrinsic_value
