from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import requests
import base64
from pypdf import PdfReader, PdfWriter
from io import BytesIO
from PIL import Image
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "ovosanti-delivery"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    logger.info("Storage initialized successfully")
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

class DeliveryCreate(BaseModel):
    vehicle_plate: str
    driver_name: str
    receiver_name: str
    delivery_datetime: str
    notes: Optional[str] = None

class Delivery(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vehicle_plate: str
    driver_name: str
    receiver_name: str
    delivery_datetime: str
    notes: Optional[str] = None
    pdf_path: Optional[str] = None
    signed_pdf_path: Optional[str] = None
    signature_path: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_signed: bool = False

class SignatureData(BaseModel):
    signature_data_url: str

@api_router.get("/")
async def root():
    return {"message": "Ovosanti Delivery API"}

@api_router.post("/deliveries", response_model=Delivery, status_code=201)
async def create_delivery(input: DeliveryCreate):
    delivery_obj = Delivery(**input.model_dump())
    doc = delivery_obj.model_dump()
    await db.deliveries.insert_one(doc)
    return delivery_obj

@api_router.post("/deliveries/{delivery_id}/upload-pdf")
async def upload_pdf(delivery_id: str, file: UploadFile = File(...)):
    if file.content_type not in ["application/pdf", "application/x-pdf"] and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    ext = "pdf"
    path = f"{APP_NAME}/pdfs/{delivery_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    
    result = put_object(path, data, file.content_type)
    
    await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": {"pdf_path": result["path"]}}
    )
    
    return {"success": True, "path": result["path"], "message": "PDF subido exitosamente"}

@api_router.post("/deliveries/{delivery_id}/sign")
async def sign_delivery(delivery_id: str, signature: SignatureData):
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    if not delivery.get("pdf_path"):
        raise HTTPException(status_code=400, detail="No hay PDF cargado para esta entrega")
    
    signature_data_url = signature.signature_data_url
    if not signature_data_url.startswith("data:image"):
        raise HTTPException(status_code=400, detail="Formato de firma inválido")
    
    try:
        pdf_data, _ = get_object(delivery["pdf_path"])
        
        signature_base64 = signature_data_url.split(",")[1]
        signature_bytes = base64.b64decode(signature_base64)
        
        signature_path = f"{APP_NAME}/signatures/{delivery_id}/{uuid.uuid4()}.png"
        sig_result = put_object(signature_path, signature_bytes, "image/png")
        
        reader = PdfReader(BytesIO(pdf_data))
        writer = PdfWriter()
        
        num_pages = len(reader.pages)
        
        for i, page in enumerate(reader.pages):
            if i == num_pages - 1:
                page_width = float(page.mediabox.width)
                page_height = float(page.mediabox.height)
                
                overlay_buffer = BytesIO()
                c = pdf_canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
                
                box_width = 7 * 28.35
                box_height = 5 * 28.35
                box_x = (page_width - box_width) / 2
                box_y = 40
                
                header_height = 25
                c.setFillColorRGB(0.118, 0.557, 0.243)
                c.rect(box_x, box_y + box_height - header_height, box_width, header_height, fill=True, stroke=False)
                
                c.setFillColorRGB(1, 1, 1)
                c.setFont("Helvetica-Bold", 12)
                c.drawCentredString(box_x + box_width / 2, box_y + box_height - 15, "RECIBIDO Y FIRMADO")
                
                signature_img = Image.open(BytesIO(signature_bytes))
                img_width, img_height = signature_img.size
                
                max_sig_width = box_width * 0.85
                max_sig_height = 50
                scale = min(max_sig_width / img_width, max_sig_height / img_height)
                sig_width = img_width * scale
                sig_height = img_height * scale
                
                sig_x = box_x + (box_width - sig_width) / 2
                sig_y = box_y + 75
                
                c.drawImage(
                    ImageReader(BytesIO(signature_bytes)),
                    sig_x,
                    sig_y,
                    width=sig_width,
                    height=sig_height,
                    preserveAspectRatio=True,
                    mask='auto'
                )
                
                c.setStrokeColorRGB(0.118, 0.557, 0.243)
                c.setLineWidth(1.5)
                c.line(box_x + 15, box_y + 65, box_x + box_width - 15, box_y + 65)
                
                c.setFillColorRGB(0.118, 0.557, 0.243)
                c.setFont("Helvetica-Bold", 11)
                c.drawCentredString(box_x + box_width / 2, box_y + 45, delivery.get("receiver_name", "").upper())
                
                c.setFont("Helvetica", 8)
                now = datetime.now(timezone.utc)
                formatted_date = now.strftime("%d/%m/%Y, %I:%M:%S %p")
                c.drawCentredString(box_x + box_width / 2, box_y + 30, formatted_date)
                
                c.save()
                overlay_buffer.seek(0)
                
                overlay_pdf = PdfReader(overlay_buffer)
                overlay_page = overlay_pdf.pages[0]
                
                page.merge_page(overlay_page)
            
            writer.add_page(page)
        
        output_pdf = BytesIO()
        writer.write(output_pdf)
        output_pdf.seek(0)
        signed_pdf_bytes = output_pdf.read()
        
        signed_pdf_path = f"{APP_NAME}/signed-pdfs/{delivery_id}/{uuid.uuid4()}.pdf"
        signed_result = put_object(signed_pdf_path, signed_pdf_bytes, "application/pdf")
        
        await db.deliveries.update_one(
            {"id": delivery_id},
            {"$set": {
                "signed_pdf_path": signed_result["path"],
                "signature_path": sig_result["path"],
                "is_signed": True
            }}
        )
        
        return {
            "success": True,
            "signed_pdf_path": signed_result["path"],
            "message": "Entrega firmada exitosamente"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error signing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al firmar el PDF: {str(e)}")

@api_router.get("/deliveries/stats")
async def get_delivery_stats():
    try:
        all_deliveries = await db.deliveries.find({}, {"_id": 0}).to_list(1000)
        
        total = len(all_deliveries)
        signed = len([d for d in all_deliveries if d.get("is_signed", False)])
        pending = total - signed
        
        from collections import Counter
        driver_counts = Counter(d.get("driver_name", "Unknown") for d in all_deliveries)
        vehicle_counts = Counter(d.get("vehicle_plate", "Unknown") for d in all_deliveries)
        
        by_driver = [{"driver_name": name, "count": count} for name, count in driver_counts.most_common(10)]
        by_vehicle = [{"vehicle_plate": plate, "count": count} for plate, count in vehicle_counts.most_common(10)]
        
        return {
            "total": total,
            "signed": signed,
            "pending": pending,
            "byDriver": by_driver,
            "byVehicle": by_vehicle
        }
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

@api_router.get("/deliveries", response_model=List[Delivery])
async def get_deliveries():
    deliveries = await db.deliveries.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return deliveries

@api_router.get("/deliveries/{delivery_id}", response_model=Delivery)
async def get_delivery(delivery_id: str):
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    return delivery

@api_router.delete("/deliveries/{delivery_id}")
async def delete_delivery(delivery_id: str):
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    result = await db.deliveries.delete_one({"id": delivery_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    return {"success": True, "message": "Entrega eliminada exitosamente"}

@api_router.get("/deliveries/{delivery_id}/download-pdf")
async def download_delivery_pdf(delivery_id: str):
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")
    
    if not delivery.get("signed_pdf_path"):
        raise HTTPException(status_code=404, detail="PDF firmado no encontrado")
    
    try:
        pdf_data, _ = get_object(delivery["signed_pdf_path"])
        
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        filename = f"OVOSANTI-{delivery['vehicle_plate']}-{date_str}.pdf"
        
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Content-Type-Options": "nosniff"
        }
        
        return Response(content=pdf_data, media_type="application/pdf", headers=headers)
    except Exception as e:
        logger.error(f"Error downloading delivery PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al descargar el PDF")



@api_router.get("/files/{path:path}")
async def download_file(path: str):
    try:
        data, content_type = get_object(path)
        
        filename = path.split("/")[-1]
        
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
        
        return Response(content=data, media_type="application/pdf", headers=headers)
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized on startup")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
