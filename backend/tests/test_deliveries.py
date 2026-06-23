"""Backend tests for Ovosanti Delivery API"""
import os
import io
import pytest
import requests
from pypdf import PdfWriter, PdfReader

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"


def _make_pdf_bytes() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)
    return buf.read()


# 8x8 black square PNG (valid, non-trivial image data) - ensures merge has real content
TINY_PNG_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR42mNk+M9Q"
    "z0AEYBxVSF+FABJYAv5+8yY1AAAAAElFTkSuQmCC"
)


@pytest.fixture(scope="module")
def session():
    return requests.Session()


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
    assert r.status_code == 201, r.text
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
    def test_create_delivery_status_201(self, created_delivery):
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

    def test_upload_pdf_accepts_x_pdf_content_type(self, session, created_delivery):
        files = {"file": ("a.pdf", _make_pdf_bytes(), "application/x-pdf")}
        r = session.post(f"{API}/deliveries/{created_delivery['id']}/upload-pdf", files=files, timeout=60)
        assert r.status_code == 200, r.text

    def test_upload_pdf_unknown_delivery(self, session):
        files = {"file": ("a.pdf", _make_pdf_bytes(), "application/pdf")}
        r = session.post(f"{API}/deliveries/unknown-xyz/upload-pdf", files=files, timeout=60)
        assert r.status_code == 404

    def test_full_upload_sign_and_signature_is_overlaid(self, session):
        # Create a fresh delivery to isolate size comparison
        payload = {
            "vehicle_plate": "TEST-SIGN",
            "driver_name": "TEST_Driver",
            "receiver_name": "TEST_Receiver",
            "delivery_datetime": "2026-01-15T10:30",
        }
        rc = session.post(f"{API}/deliveries", json=payload, timeout=30)
        assert rc.status_code == 201
        did = rc.json()["id"]

        original_pdf = _make_pdf_bytes()
        original_size = len(original_pdf)

        files = {"file": ("test.pdf", original_pdf, "application/pdf")}
        r = session.post(f"{API}/deliveries/{did}/upload-pdf", files=files, timeout=120)
        assert r.status_code == 200, r.text

        r3 = session.post(
            f"{API}/deliveries/{did}/sign",
            json={"signature_data_url": TINY_PNG_DATA_URL},
            timeout=120,
        )
        assert r3.status_code == 200, r3.text
        sb = r3.json()
        assert sb.get("success") is True
        assert sb.get("signed_pdf_path")

        r4 = session.get(f"{API}/deliveries/{did}", timeout=15)
        d = r4.json()
        assert d["is_signed"] is True
        assert d["signed_pdf_path"]
        assert d["signature_path"]

        # Download signed PDF
        r5 = session.get(f"{API}/files/{d['signed_pdf_path']}", timeout=60)
        assert r5.status_code == 200
        signed_pdf = r5.content
        assert signed_pdf[:4] == b"%PDF"

        # CRITICAL: signed PDF must be larger than original (signature overlay added)
        signed_size = len(signed_pdf)
        print(f"Original size: {original_size}, Signed size: {signed_size}")
        assert signed_size > original_size, (
            f"Signed PDF ({signed_size}) is NOT larger than original ({original_size}) - "
            "signature was not overlaid onto the PDF"
        )

        # CRITICAL: verify image stream / XObject is present in last page resources
        reader = PdfReader(io.BytesIO(signed_pdf))
        last_page = reader.pages[-1]
        resources = last_page.get("/Resources")
        has_image = False
        if resources is not None:
            resources = resources.get_object() if hasattr(resources, "get_object") else resources
            xobjects = resources.get("/XObject") if hasattr(resources, "get") else None
            if xobjects is not None:
                xobjects = xobjects.get_object() if hasattr(xobjects, "get_object") else xobjects
                for name in xobjects.keys() if hasattr(xobjects, "keys") else []:
                    obj = xobjects[name].get_object()
                    if obj.get("/Subtype") == "/Image":
                        has_image = True
                        break
        assert has_image, "No image XObject found on last page of signed PDF - signature not embedded"

    def test_sign_without_pdf_returns_400(self, session):
        payload = {
            "vehicle_plate": "TEST-NOPDF",
            "driver_name": "TEST",
            "receiver_name": "TEST",
            "delivery_datetime": "2026-01-15T10:30",
        }
        r = session.post(f"{API}/deliveries", json=payload, timeout=15)
        assert r.status_code == 201
        did = r.json()["id"]
        r2 = session.post(f"{API}/deliveries/{did}/sign", json={"signature_data_url": TINY_PNG_DATA_URL}, timeout=30)
        assert r2.status_code == 400

    def test_sign_invalid_format_returns_400(self, session, created_delivery):
        # First upload a PDF so we hit the format check (not the 'no pdf' check)
        files = {"file": ("test.pdf", _make_pdf_bytes(), "application/pdf")}
        session.post(f"{API}/deliveries/{created_delivery['id']}/upload-pdf", files=files, timeout=60)
        r = session.post(
            f"{API}/deliveries/{created_delivery['id']}/sign",
            json={"signature_data_url": "not-a-data-url"},
            timeout=30,
        )
        assert r.status_code == 400, f"Expected 400 for invalid signature format, got {r.status_code}"
