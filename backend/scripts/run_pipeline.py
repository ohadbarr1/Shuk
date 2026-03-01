#!/usr/bin/env python
"""
CLI runner for the TASE data pipeline.

Usage:
    python scripts/run_pipeline.py --all
    python scripts/run_pipeline.py --companies
    python scripts/run_pipeline.py --financials --financials-period annual
    python scripts/run_pipeline.py --prices
    python scripts/run_pipeline.py --dividends
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

import click

# Allow running from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.database import AsyncSessionLocal
from app.db.models import PeriodType
from app.services.company_pipeline import sync_companies
from app.services.dividends_pipeline import sync_dividends
from app.services.financials_pipeline import sync_financials
from app.services.prices_pipeline import sync_prices
from app.services.tase_client import TASEClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("pipeline")
FAILED_LOG = Path("failed_symbols.json")


@click.command()
@click.option("--all", "run_all", is_flag=True, help="Run all pipeline stages")
@click.option("--companies", is_flag=True)
@click.option("--financials", is_flag=True)
@click.option("--financials-period", default="annual", type=click.Choice(["annual", "quarterly"]))
@click.option("--prices", is_flag=True)
@click.option("--dividends", is_flag=True)
@click.option("--from-date", default=None, help="ISO date YYYY-MM-DD for price sync start")
def main(run_all, companies, financials, financials_period, prices, dividends, from_date):
    asyncio.run(
        _run(
            run_all=run_all,
            do_companies=companies,
            do_financials=financials,
            financials_period=PeriodType(financials_period),
            do_prices=prices,
            do_dividends=dividends,
            from_date=from_date,
        )
    )


async def _run(
    run_all,
    do_companies,
    do_financials,
    financials_period,
    do_prices,
    do_dividends,
    from_date,
):
    all_failed: dict[str, list[str]] = {}

    async with TASEClient() as client:
        async with AsyncSessionLocal() as session:
            if run_all or do_companies:
                logger.info("=== Syncing companies ===")
                n = await sync_companies(client, session)
                logger.info("Done: %d companies", n)

            if run_all or do_financials:
                logger.info("=== Syncing financials (%s) ===", financials_period.value)
                result = await sync_financials(client, session, financials_period)
                if result["failed"]:
                    all_failed["financials"] = result["failed"]

            if run_all or do_prices:
                from datetime import date
                fd = date.fromisoformat(from_date) if from_date else None
                logger.info("=== Syncing prices (from %s) ===", fd or "all time")
                result = await sync_prices(client, session, fd)
                if result["failed"]:
                    all_failed["prices"] = result["failed"]

            if run_all or do_dividends:
                logger.info("=== Syncing dividends ===")
                result = await sync_dividends(client, session)
                if result["failed"]:
                    all_failed["dividends"] = result["failed"]

    if all_failed:
        FAILED_LOG.write_text(json.dumps(all_failed, ensure_ascii=False, indent=2))
        logger.warning("Some symbols failed — see %s", FAILED_LOG)
    else:
        logger.info("Pipeline complete with no failures.")


if __name__ == "__main__":
    main()
