"""The service spends money on every call, so auth is not optional."""

import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("CONTENT_AI_TOKEN", "test-token")
    # The token is read at import time, so reload the module under the patched env.
    module = importlib.import_module("api.index")
    importlib.reload(module)
    return TestClient(module.app)


def test_health_reports_configuration(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["authConfigured"] is True


@pytest.mark.parametrize("path", ["/draft", "/speech"])
def test_paid_endpoints_reject_a_missing_token(client: TestClient, path: str) -> None:
    response = client.post(path, json={})
    assert response.status_code == 401


@pytest.mark.parametrize("path", ["/draft", "/speech"])
def test_paid_endpoints_reject_a_wrong_token(client: TestClient, path: str) -> None:
    response = client.post(path, json={}, headers={"authorization": "Bearer nope"})
    assert response.status_code == 401


def test_draft_validates_its_request_body(client: TestClient) -> None:
    response = client.post(
        "/draft",
        json={"course": "klingon", "skill": "Coordinates", "instruction": "hi"},
        headers={"authorization": "Bearer test-token"},
    )

    assert response.status_code == 422
