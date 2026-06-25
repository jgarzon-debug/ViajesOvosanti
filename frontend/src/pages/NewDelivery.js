import { useState, useRef, useEffect } from "react";
import axios from "axios";
import SignatureCanvas from "react-signature-canvas";
import { Package, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/config";

export default function NewDelivery() {
  const [step, setStep] = useState(1);
  const [deliveryId, setDeliveryId] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_plate: "",
    driver_name: "",
    receiver_name: "",
    delivery_datetime: "",
    notes: ""
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const sigCanvas = useRef(null);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
    setFormData(prev => ({ ...prev, delivery_datetime: formattedDate }));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      toast.error("Por favor selecciona un archivo PDF válido");
    }
  };

  const handleCreateDelivery = async () => {
    if (!formData.vehicle_plate || !formData.driver_name || !formData.receiver_name) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (!pdfFile) {
      toast.error("Por favor selecciona el PDF de remisión");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/deliveries`, formData);
      const newDeliveryId = response.data.id;
      setDeliveryId(newDeliveryId);

      const formDataUpload = new FormData();
      formDataUpload.append("file", pdfFile);
      await axios.post(`${API_URL}/deliveries/${newDeliveryId}/upload-pdf`, formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setPdfUploaded(true);
      setStep(2);
      toast.success("Datos guardados. Ahora firma la entrega");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear la entrega");
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSignDelivery = async () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error("Por favor firma antes de continuar");
      return;
    }

    setLoading(true);
    try {
      const signatureDataURL = sigCanvas.current.toDataURL();
      await axios.post(`${API_URL}/deliveries/${deliveryId}/sign`, {
        signature_data_url: signatureDataURL
      });

      setStep(3);
      toast.success("¡Entrega firmada exitosamente!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al firmar la entrega");
    } finally {
      setLoading(false);
    }
  };

  const handleNewDelivery = () => {
    setStep(1);
    setDeliveryId(null);
    setFormData({
      vehicle_plate: "",
      driver_name: "",
      receiver_name: "",
      delivery_datetime: new Date().toISOString().slice(0, 16),
      notes: ""
    });
    setPdfFile(null);
    setPdfUploaded(false);
    sigCanvas.current?.clear();
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 pb-24">
      <div className="mb-8 flex items-center justify-center">
        <img 
          src="https://customer-assets.emergentagent.com/job_ovosanti-delivery/artifacts/e989slhn_logo%20ovosanti%20%2812%29.png" 
          alt="Ovosanti Logo" 
          className="h-16"
          data-testid="ovosanti-logo"
        />
      </div>

      {step === 1 && (
        <div className="space-y-6" data-testid="delivery-form-section">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-6 h-6 text-[#1E8E3E]" />
              <h1 className="text-2xl font-semibold text-[#142518]">Nueva Entrega</h1>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                  Placa del Vehículo *
                </label>
                <input
                  type="text"
                  name="vehicle_plate"
                  value={formData.vehicle_plate}
                  onChange={handleInputChange}
                  className="w-full h-14 px-4 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518]"
                  placeholder="ABC-123"
                  data-testid="vehicle-plate-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                  Nombre del Conductor *
                </label>
                <input
                  type="text"
                  name="driver_name"
                  value={formData.driver_name}
                  onChange={handleInputChange}
                  className="w-full h-14 px-4 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518]"
                  placeholder="Juan Pérez"
                  data-testid="driver-name-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                  Nombre de Quien Recibe *
                </label>
                <input
                  type="text"
                  name="receiver_name"
                  value={formData.receiver_name}
                  onChange={handleInputChange}
                  className="w-full h-14 px-4 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518]"
                  placeholder="María González"
                  data-testid="receiver-name-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                  Fecha y Hora de Entrega *
                </label>
                <input
                  type="datetime-local"
                  name="delivery_datetime"
                  value={formData.delivery_datetime}
                  onChange={handleInputChange}
                  className="w-full h-14 px-4 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518]"
                  data-testid="delivery-datetime-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                  Observaciones
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518] resize-none"
                  placeholder="Notas adicionales..."
                  data-testid="notes-textarea"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                  <FileText className="inline w-4 h-4 mr-1" />
                  PDF de Remisión *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full h-14 px-4 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#E8B89B] file:text-[#1A2E20] hover:file:bg-[#d9a68a]"
                    data-testid="pdf-upload-input"
                  />
                </div>
                {pdfFile && (
                  <p className="text-sm text-[#1E8E3E] mt-2" data-testid="pdf-selected-name">
                    ✓ {pdfFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateDelivery}
            disabled={loading}
            className="w-full h-14 bg-[#1E8E3E] text-white font-semibold rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1E8E3E]/20"
            data-testid="continue-to-sign-button"
          >
            {loading ? "Procesando..." : "Continuar a Firma"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6" data-testid="signature-section">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-black/5">
            <h2 className="text-2xl font-semibold text-[#142518] mb-4">Firma de Entrega</h2>
            <p className="text-[#4B5563] mb-6">Firma aquí con tu dedo para confirmar la entrega</p>

            <div className="mb-4">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="#142518"
                canvasProps={{
                  className: "signature-canvas w-full h-64 bg-white border-2 border-[#E2E8F0] rounded-xl",
                  'data-testid': 'signature-canvas'
                }}
              />
            </div>

            <button
              onClick={clearSignature}
              className="w-full h-12 bg-white border-2 border-[#E2E8F0] text-[#4B5563] font-medium rounded-xl mb-4 active:scale-[0.98]"
              data-testid="clear-signature-button"
            >
              Limpiar Firma
            </button>
          </div>

          <button
            onClick={handleSignDelivery}
            disabled={loading}
            className="w-full h-14 bg-[#1E8E3E] text-white font-semibold rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1E8E3E]/20"
            data-testid="confirm-delivery-button"
          >
            {loading ? "Firmando..." : "Confirmar Entrega"}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6" data-testid="success-section">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-black/5 text-center">
            <CheckCircle className="w-20 h-20 text-[#1E8E3E] mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-[#142518] mb-2">¡Entrega Completada!</h2>
            <p className="text-[#4B5563] mb-6">La entrega ha sido firmada y guardada exitosamente</p>

            <button
              onClick={handleNewDelivery}
              className="w-full h-14 bg-[#1E8E3E] text-white font-semibold rounded-xl active:scale-[0.98] shadow-lg shadow-[#1E8E3E]/20"
              data-testid="new-delivery-button"
            >
              Nueva Entrega
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
