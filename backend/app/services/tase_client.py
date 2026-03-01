"""
Rate-limited async HTTP client for TASE Data Hub API.

TASE enforces: 10 requests per 2 seconds.
Strategy: asyncio.Semaphore(10) + time-windowed slot tracking + exponential backoff on 429.
"""

import asyncio
import logging
import time
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class TASERateLimiter:
    """Token-bucket style rate limiter: max N requests per window_seconds."""

    def __init__(self, max_requests: int = 10, window_seconds: float = 2.0):
        self._max = max_requests
        self._window = window_seconds
        self._semaphore = asyncio.Semaphore(max_requests)
        self._slots: list[float] = []
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            # Drop slots older than the window
            self._slots = [t for t in self._slots if now - t < self._window]
            if len(self._slots) >= self._max:
                sleep_for = self._window - (now - self._slots[0])
                if sleep_for > 0:
                    await asyncio.sleep(sleep_for)
                self._slots = self._slots[1:]
            self._slots.append(time.monotonic())


class TASEClient:
    def __init__(self):
        self._limiter = TASERateLimiter(
            max_requests=settings.tase_rate_limit_requests,
            window_seconds=settings.tase_rate_limit_window_seconds,
        )
        self._client = httpx.AsyncClient(
            base_url=settings.tase_api_base_url,
            headers={
                "Authorization": f"Bearer {settings.tase_api_key}",
                "Accept": "application/json",
            },
            timeout=30.0,
        )

    async def get(self, path: str, params: dict | None = None, retries: int = 3) -> Any:
        """
        Rate-limited GET with exponential backoff on 429 or transient errors.
        """
        await self._limiter.acquire()
        backoff = 2.0
        for attempt in range(retries + 1):
            try:
                resp = await self._client.get(path, params=params)
                if resp.status_code == 429:
                    wait = backoff * (2 ** attempt)
                    logger.warning("TASE 429 on %s — waiting %.1fs", path, wait)
                    await asyncio.sleep(wait)
                    continue
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as exc:
                logger.error("HTTP error %s fetching %s: %s", exc.response.status_code, path, exc)
                raise
            except httpx.RequestError as exc:
                if attempt < retries:
                    wait = backoff * (2 ** attempt)
                    logger.warning("Request error on %s, retry in %.1fs: %s", path, wait, exc)
                    await asyncio.sleep(wait)
                else:
                    raise
        raise RuntimeError(f"Exhausted retries for {path}")

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        await self.aclose()
