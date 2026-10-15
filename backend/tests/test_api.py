from fastapi.testclient import TestClient
import pytest
from api.main import app

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_read_main(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "it's working"}

def test_get_events(client):
    response = client.get("/events")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0: #check the event data structure
        assert isinstance(data[0], dict)
        assert "id" in data[0]
        assert "name" in data[0]
        assert "description" in data[0]
        assert "startdate" in data[0]
        assert "enddate" in data[0]
        assert "starttime" in data[0]
        assert "price" in data[0]
        assert "organizer" in data[0]

def test_get_event(client):
    response = client.get("/events")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0: #check the event data structure
        assert isinstance(data[0], dict)
        assert "id" in data[0]
        id = data[0]["id"]
        response = client.get(f"/events/{id}")
        data = response.json()
        assert "id" in data
        assert data["id"] == id
        assert "name" in data
        assert "description" in data
        assert "startdate" in data
        assert "enddate" in data
        assert "starttime" in data
        assert "price" in data
        assert "organizer" in data

def test_get_tags(client):
    response = client.get("/tags")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "name" in data[0]
    assert isinstance(data[0]["id"], int)
    assert isinstance(data[0]["name"], str)

def test_get_tag(client):
    response = client.get("/tags")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    id = data[0]["id"]
    response = client.get(f"/tags/{id}")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "name" in data
    assert data["id"] == id

def test_get_events_for_tag(client):
    response = client.get("/tags")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    id = data[0]["id"]
    response = client.get(f"/tags/{id}/events")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_get_error(client):
    response = client.get("/hello")
    assert response.status_code == 404
    data = response.json()
    assert isinstance(data, dict)
    assert "not found" in {item.lower() for item in data.values()}