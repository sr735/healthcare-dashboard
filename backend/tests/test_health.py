"""
Tests for the /health endpoint registered directly on the test app in conftest.py.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_response_body(client: AsyncClient) -> None:
    response = await client.get("/health")
    data = response.json()
    assert data == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_content_type_json(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert "application/json" in response.headers["content-type"]
