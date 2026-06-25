# Fix Definitivo: Nombre de Archivo y Descarga en Android

## ✅ Problemas Resueltos

### 1. Nombre de Archivo Correcto
**Problema**: En Android el archivo se descargaba con UUID: `8eddffa9-8a72-4df5-bf3a-11aaca573181.pdf`
**Solución**: Ahora usa el formato correcto: `OVOSANTI-SSE108-2026-06-25.pdf`

### 2. Descarga en Carpeta Correcta
**Problema**: PDFs no aparecían en carpeta Descargas del sistema Android
**Solución**: Endpoint dedicado con headers correctos que fuerza descarga en carpeta del sistema

## 🔧 Cambios Técnicos Implementados

### Backend - Nuevo Endpoint

Creado endpoint específico: `GET /api/deliveries/{delivery_id}/download-pdf`

```python
@api_router.get("/deliveries/{delivery_id}/download-pdf")
async def download_delivery_pdf(delivery_id: str):
    # 1. Busca la entrega en la base de datos
    delivery = await db.deliveries.find_one({"id": delivery_id})
    
    # 2. Construye el nombre correcto con la placa
    filename = f"OVOSANTI-{delivery['vehicle_plate']}-{date}.pdf"
    
    # 3. Retorna con headers correctos
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/pdf",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff"
    }
```

**Por qué funciona**:
- Tiene acceso a los datos de la entrega (vehicle_plate)
- Construye el nombre ANTES de enviar el archivo
- El header `Content-Disposition: attachment` fuerza la descarga
- Los headers de caché previenen que se guarde en caché del navegador

### Frontend - Actualizado

**Antes**:
```javascript
// Usaba path directo al storage (UUID)
const downloadUrl = `${API_URL}/files/${delivery.signed_pdf_path}`;
// Resultado: 8eddffa9-8a72-4df5-bf3a-11aaca573181.pdf
```

**Ahora**:
```javascript
// Usa endpoint dedicado con ID de entrega
const downloadUrl = `${API_URL}/deliveries/${delivery.id}/download-pdf`;
// Resultado: OVOSANTI-SSE108-2026-06-25.pdf
```

## 📱 Cómo Funciona Ahora

### En Android:

1. **Click "Descargar PDF Firmado"**
2. **Mensaje**: "PDF descargado. Revisa tus notificaciones"
3. **Notificación Android**: "OVOSANTI-SSE108-2026-06-25.pdf"
4. **Ubicación**: `/storage/emulated/0/Download/OVOSANTI-SSE108-2026-06-25.pdf`

### En Windows/Desktop:

1. **Click "Descargar PDF Firmado"**
2. **Mensaje**: "PDF descargado exitosamente"
3. **Ubicación**: Carpeta Descargas con nombre correcto
4. **Nombre**: `OVOSANTI-SSE108-2026-06-25.pdf`

## ✅ Verificación Testing Agent

```
✅ Endpoint /api/deliveries/{id}/download-pdf funciona (200 OK)
✅ Content-Disposition: "OVOSANTI-CFG-001-2026-06-25.pdf" (NO UUID)
✅ Content-Type: application/pdf
✅ Cache-Control headers presentes
✅ Frontend usa nuevo endpoint en todas las plataformas
✅ Android: filename correcto en enlace de descarga
✅ Desktop: blob download con nombre correcto
✅ NO hay referencias al endpoint antiguo /api/files/
```

## 🔑 Diferencias Clave

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Endpoint** | `/api/files/{uuid-path}` | `/api/deliveries/{id}/download-pdf` |
| **Nombre Android** | `8eddffa9-...pdf` (UUID) | `OVOSANTI-SSE108-2026-06-25.pdf` |
| **Nombre Windows** | ✅ Correcto | ✅ Correcto |
| **Ubicación Android** | ❌ Solo navegador | ✅ Carpeta sistema |
| **Header filename** | ❌ No presente | ✅ `attachment; filename="..."` |
| **Acceso datos** | ❌ No tiene | ✅ Consulta BD para vehicle_plate |

## 🎯 Formato de Nombre

```
OVOSANTI-{PLACA}-{AÑO-MES-DIA}.pdf

Ejemplos:
- OVOSANTI-SSE108-2026-06-25.pdf
- OVOSANTI-ABC-123-2026-06-25.pdf
- OVOSANTI-XYZ-999-2026-06-26.pdf
```

**Componentes**:
- `OVOSANTI`: Prefijo de la empresa
- `{PLACA}`: Placa del vehículo de la entrega (ej: SSE108, ABC-123)
- `{FECHA}`: Fecha de descarga en formato ISO (YYYY-MM-DD)
- `.pdf`: Extensión

## 📋 Instrucciones Post-Despliegue

Después de redesplegar a producción:

### Para Verificar en Android:

1. Abre la app en tu navegador Android
2. Ve a "Historial"
3. Descarga un PDF firmado
4. **Verifica notificación**: Debe mostrar "OVOSANTI-XXX-XXX-2026-XX-XX.pdf"
5. **Abre "Archivos"**: Ve a Descargas
6. **Busca el archivo**: Debe tener el nombre correcto, NO un UUID

### Para Verificar en Windows:

1. Abre la app en Chrome/Edge
2. Ve a "Historial"  
3. Descarga un PDF firmado
4. **Verifica carpeta Descargas**: Archivo con nombre correcto
5. **Formato**: `OVOSANTI-{placa}-{fecha}.pdf`

## 🐛 Si Aún No Funciona

Si después de redesplegar sigues viendo el UUID:

1. **Borra caché del navegador**:
   - Android: Configuración → Apps → Chrome → Almacenamiento → Borrar caché
   - Windows: Ctrl+Shift+Del → Borrar caché

2. **Cierra completamente el navegador** y vuelve a abrirlo

3. **Verifica que estás en producción**: La URL debe ser `ovosanti-delivery.emergent.host`

4. **Prueba en incógnito**: Para descartar problemas de caché

## 💡 Nota Técnica

La razón por la que funcionaba en Windows pero no en Android:
- **Windows**: El método blob + download attribute funcionaba correctamente
- **Android**: Los navegadores ignoran el atributo download si la URL no tiene el filename correcto
- **Solución**: El servidor ahora envía el filename en el header Content-Disposition, que Android SÍ respeta

## Contraseña de Eliminación

Recordatorio: La contraseña para eliminar entregas es **OVOSANTI2026** (ya no se muestra en la interfaz por seguridad).
