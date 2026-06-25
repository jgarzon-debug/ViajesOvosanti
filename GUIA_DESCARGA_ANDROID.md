# Guía de Descarga de PDFs en Android - Ovosanti

## Problema Resuelto
Los PDFs ahora se descargan correctamente en la carpeta **Descargas** del dispositivo Android, no en caché del navegador.

## Cómo Verificar que Funciona Correctamente

### En Android (Chrome, Firefox, Edge)

1. **Descargar un PDF firmado**:
   - Abre la app en tu navegador móvil
   - Ve a "Historial"
   - Selecciona una entrega firmada
   - Toca "Descargar PDF Firmado"

2. **Verificar la descarga**:
   - Deberías ver un mensaje: **"Descargando... Revisa tu carpeta Descargas"**
   - El navegador puede mostrar una notificación de descarga en la parte superior
   - Algunos navegadores muestran un ícono de descarga en la barra de notificaciones

3. **Encontrar el archivo descargado**:
   
   **Opción A - Desde el navegador:**
   - Abre el menú del navegador (⋮)
   - Toca "Descargas" o "Downloads"
   - Busca el archivo `OVOSANTI-XXX-XXX-2026-XX-XX.pdf`
   
   **Opción B - Aplicación Archivos:**
   - Abre la app "Archivos" o "Mis Archivos" de Android
   - Ve a la carpeta "Descargas" o "Downloads"
   - Busca el archivo `OVOSANTI-XXX-XXX-2026-XX-XX.pdf`
   
   **Opción C - Notificaciones:**
   - Desliza hacia abajo la barra de notificaciones
   - Busca la notificación de descarga completada
   - Toca en ella para abrir el archivo

4. **Ubicación física del archivo**:
   ```
   /storage/emulated/0/Download/OVOSANTI-XXX-XXX-2026-XX-XX.pdf
   ```

### En iOS (Safari, Chrome)

En iOS el comportamiento es diferente debido a restricciones del sistema:

1. Al tocar "Descargar PDF Firmado", el PDF se abrirá en una nueva pestaña
2. Verás el mensaje: **"PDF abierto. Usa 'Compartir' para guardar"**
3. Toca el botón de compartir (□↑)
4. Selecciona "Guardar en Archivos"
5. Elige la ubicación (iCloud Drive, En mi iPhone, etc.)
6. Toca "Guardar"

El archivo estará disponible en la app **Archivos** de iOS.

## Mejoras Técnicas Implementadas

### Para Android:
✅ Detección específica de User Agent Android
✅ Atributo `type='application/pdf'` para forzar tipo MIME
✅ Atributo `target='_blank'` para descarga externa
✅ Delay de 50ms antes del click (evita race conditions)
✅ Delay de 250ms antes del cleanup (permite completar descarga)
✅ Mensaje toast específico con duración de 4 segundos
✅ Manejo robusto de errores y cleanup de memoria

### Para iOS:
✅ Abre en nueva pestaña (respeta restricciones de iOS)
✅ Instrucciones claras para guardar usando botón Compartir
✅ Cleanup automático después de 3 segundos

## Permisos Necesarios

### Android
Asegúrate de que el navegador tenga permisos de almacenamiento:
1. Ve a Configuración → Aplicaciones
2. Busca tu navegador (Chrome, Firefox, etc.)
3. Ve a Permisos
4. Activa "Almacenamiento" o "Archivos y multimedia"

### iOS
No se requieren permisos especiales. iOS maneja las descargas a través del botón Compartir.

## Solución de Problemas

### "No veo el archivo en Descargas"
1. Verifica que el navegador tenga permisos de almacenamiento
2. Revisa la carpeta de Descargas del navegador (menú → Descargas)
3. Busca en la app "Archivos" del sistema
4. Verifica que la descarga no se haya bloqueado (revisa notificaciones)

### "El PDF se abre en lugar de descargarse"
- En Android Chrome: Esto es normal, el archivo también se guarda en Descargas
- En iOS: Este es el comportamiento esperado, usa el botón Compartir

### "Descarga bloqueada"
Si tu navegador bloquea descargas:
1. Toca en la barra de dirección donde aparece el ícono de bloqueo
2. Permite descargas para este sitio
3. Intenta descargar nuevamente

## Nombre de Archivo
Los PDFs descargados tienen el formato:
```
OVOSANTI-{PLACA}-{AÑO-MES-DIA}.pdf

Ejemplo: OVOSANTI-ABC-123-2026-06-25.pdf
```

Esto facilita:
- Identificar la entrega por la placa
- Organizar por fecha
- Buscar archivos específicos

## Nota Importante
Después de redesplegar a producción, estos cambios estarán disponibles en:
`https://ovosanti-delivery.emergent.host`

Si sigues teniendo problemas, por favor proporciona:
1. Modelo de teléfono y versión de Android
2. Navegador y versión
3. Captura de pantalla del mensaje que aparece
