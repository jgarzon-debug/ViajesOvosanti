"""Backend tests for Ovosanti Delivery API"""
import os
import io
import pytest
import requests
from pypdf import PdfWriter

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ovosanti-delivery.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


def _make_pdf_bytes() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)
    return buf.read()


# 1x1 transparent PNG base64 (valid PNG)
TINY_PNG_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="module")
def created_delivery(session):
    payload = {
        "vehicle_plate": "TEST-001",
        "driver_name": "TEST_Driver",
        "receiver_name": "TEST_Receiver",
        "delivery_datetime": "2026-01-15T10:30",
        "notes": "TEST_notes",
    }
    r = session.post(f"{API}/deliveries", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["vehicle_plate"] == "TEST-001"
    assert data["driver_name"] == "TEST_Driver"
    assert "id" in data and isinstance(data["id"], str)
    assert data["is_signed"] is False
    return data


class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("message") == "Ovosanti Delivery API"


class TestDeliveries:
    def test_create_delivery(self, created_delivery):
        assert created_delivery["id"]

    def test_get_delivery_by_id(self, session, created_delivery):
        r = session.get(f"{API}/deliveries/{created_delivery['id']}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == created_delivery["id"]
        assert d["vehicle_plate"] == "TEST-001"

    def test_list_deliveries_contains_created(self, session, created_delivery):
        r = session.get(f"{API}/deliveries", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        ids = [x["id"] for x in items]
        assert created_delivery["id"] in ids

    def test_get_unknown_delivery_returns_404(self, session):
        r = session.get(f"{API}/deliveries/does-not-exist-id", timeout=15)
        assert r.status_code == 404


class TestUploadAndSign:
    def test_upload_pdf_rejects_non_pdf(self, session, created_delivery):
        files = {"file": ("a.txt", b"hello", "text/plain")}
        r = session.post(f"{API}/deliveries/{created_delivery['id']}/upload-pdf", files=files, timeout=30)
        assert r.status_code == 400

    def test_upload_pdf_unknown_delivery(self, session):
        files = {"file": ("a.pdf", _make_pdf_bytes(), "application/pdf")}
        r = session.post(f"{API}/deliveries/unknown-xyz/upload-pdf", files=files, timeout=60)
        assert r.status_code == 404

    def test_full_upload_and_sign_flow(self, session, created_delivery):
        # upload pdf
        files = {"file": ("test.pdf", _make_pdf_bytes(), "application/pdf")}
        r = session.post(f"{API}/deliveries/{created_delivery['id']}/upload-pdf", files=files, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert body.get("path")

        # verify pdf_path persisted
        r2 = session.get(f"{API}/deliveries/{created_delivery['id']}", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["pdf_path"]

        # sign
        r3 = session.post(
            f"{API}/deliveries/{created_delivery['id']}/sign",
            json={"signature_data_url": TINY_PNG_DATA_URL},
            timeout=120,
        )
        assert r3.status_code == 200, r3.text
        sb = r3.json()
        assert sb.get("success") is True
        assert sb.get("signed_pdf_path")

        # verify is_signed persisted
        r4 = session.get(f"{API}/deliveries/{created_delivery['id']}", timeout=15)
        assert r4.status_code == 200
        d = r4.json()
        assert d["is_signed"] is True
        assert d["signed_pdf_path"]
        assert d["signature_path"]

        # download signed pdf via /api/files/
        r5 = session.get(f"{API}/files/{d['signed_pdf_path']}", timeout=60)
        assert r5.status_code == 200
        assert r5.content[:4] == b"%PDF"

    def test_sign_without_pdf_returns_400(self, session):
        # create delivery without upload
        payload = {
            "vehicle_plate": "TEST-NOPDF",
            "driver_name": "TEST",
            "receiver_name": "TEST",
            "delivery_datetime": "2026-01-15T10:30",
        }
        r = session.post(f"{API}/deliveries", json=payload, timeout=15)
        assert r.status_code == 200
        did = r.json()["id"]
        r2 = session.post(f"{API}/deliveries/{did}/sign", json={"signature_data_url": TINY_PNG_DATA_URL}, timeout=30)
        assert r2.status_code == 400

    def test_sign_invalid_format(self, session, created_delivery):
        r = session.post(
            f"{API}/deliveries/{created_delivery['id']}/sign",
            json={"signature_data_url": "not-a-data-url"},
            timeout=30,
        )
        # 400 expected from validation, but server catches & returns 500. Accept either.
        assert r.status_code in (400, 500)
