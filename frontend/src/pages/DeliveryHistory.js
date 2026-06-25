import { useState, useEffect } from "react";
import axios from "axios";
import { ClipboardList, CheckCircle, Clock, Download, Filter, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/config";

export default function DeliveryHistory() {
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    driver: "",
    dateFrom: "",
    dateTo: ""
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, deliveryId: null });
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deliveries, filters]);

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(`${API_URL}/deliveries`);
      setDeliveries(response.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deliveries];

    if (filters.status !== "all") {
      filtered = filtered.filter(d => 
        filters.status === "signed" ? d.is_signed : !d.is_signed
      );
    }

    if (filters.driver) {
      filtered = filtered.filter(d => 
        d.driver_name.toLowerCase().includes(filters.driver.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(d => 
        new Date(d.delivery_datetime) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(d => 
        new Date(d.delivery_datetime) <= new Date(filters.dateTo + "T23:59:59")
      );
    }

    setFilteredDeliveries(filtered);
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      driver: "",
      dateFrom: "",
      dateTo: ""
    });
  };

  const downloadSignedPdf = async (delivery) => {
    if (!delivery.signed_pdf_path) {
      toast.error("No hay PDF firmado disponible");
      return;
    }

    const filename = `OVOSANTI-${delivery.vehicle_plate}-${new Date().toISOString().slice(0,10)}.pdf`;
    
    // Para Android - usar enlace directo con headers del servidor
    if (/Android/i.test(navigator.userAgent)) {
      try {
        const loadingToast = toast.loading("Preparando descarga...");
        
        // Crear enlace directo a la API que retorna headers de descarga
        const downloadUrl = `${API_URL}/files/${delivery.signed_pdf_path}`;
        
        // Crear un enlace temporal
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        link.style.display = 'none';
        link.setAttribute('target', '_blank');
        
        document.body.appendChild(link);
        
        // Click después de un pequeño delay
        setTimeout(() => {
          link.click();
          
          toast.dismiss(loadingToast);
          toast.success("Descarga iniciada. Revisa notificaciones de Android", {
            duration: 5000
          });
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
          }, 100);
        }, 100);
        
        return;
      } catch (error) {
        console.error("Android download error:", error);
        toast.error("Error al iniciar descarga");
        return;
      }
    }
    
    // Para iOS Safari - abrir en nueva pestaña
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      try {
        const loadingToast = toast.loading("Preparando descarga...");
        
        const response = await axios.get(`${API_URL}/files/${delivery.signed_pdf_path}`, {
          responseType: "blob"
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          toast.dismiss(loadingToast);
          toast.error("Permite ventanas emergentes para descargar");
          URL.revokeObjectURL(blobUrl);
          return;
        }
        
        toast.dismiss(loadingToast);
        toast.success("PDF abierto. Usa 'Compartir' para guardar");
        
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 3000);
        
        return;
      } catch (error) {
        console.error("iOS download error:", error);
        toast.error("Error al abrir PDF");
        return;
      }
    }
    
    // Para navegadores de escritorio
    try {
      const loadingToast = toast.loading("Preparando descarga...");
      
      const response = await axios.get(`${API_URL}/files/${delivery.signed_pdf_path}`, {
        responseType: "blob"
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);
      
      toast.dismiss(loadingToast);
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Error al descargar el PDF");
    }
  };

  const handleDeleteClick = (deliveryId) => {
    setDeleteModal({ show: true, deliveryId });
    setDeletePassword("");
  };

  const handleDeleteConfirm = async () => {
    if (deletePassword !== "OVOSANTI2026") {
      toast.error("Contraseña incorrecta");
      return;
    }

    try {
      await axios.delete(`${API_URL}/deliveries/${deleteModal.deliveryId}`);
      
      setDeliveries(prev => prev.filter(d => d.id !== deleteModal.deliveryId));
      
      setDeleteModal({ show: false, deliveryId: null });
      setDeletePassword("");
      
      toast.success("Entrega eliminada exitosamente");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar la entrega");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ show: false, deliveryId: null });
    setDeletePassword("");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6 pb-24">
        <div className="bg-white rounded-xl p-8 text-center" data-testid="loading-section">
          <p className="text-[#4B5563]">Cargando historial...</p>
        </div>
      </div>
    );
  }

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => 
    key !== "status" ? value !== "" : value !== "all"
  ).length;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 pb-24">
      <div className="mb-8 flex items-center justify-center">
        <img 
          src="https://customer-assets.emergentagent.com/job_ovosanti-delivery/artifacts/e989slhn_logo%20ovosanti%20%2812%29.png" 
          alt="Ovosanti Logo" 
          className="h-16"
          data-testid="ovosanti-logo-history"
        />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-black/5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-[#1E8E3E]" />
            <h1 className="text-2xl font-semibold text-[#142518]">Historial</h1>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative p-2 rounded-lg border border-[#E2E8F0] active:scale-[0.95]"
            data-testid="toggle-filters-button"
          >
            <Filter className="w-5 h-5 text-[#1E8E3E]" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#1E8E3E] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
        <p className="text-sm text-[#4B5563]">
          Mostrando: {filteredDeliveries.length} de {deliveries.length} entregas
        </p>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-black/5 mb-6" data-testid="filters-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#142518]">Filtros</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-[#1E8E3E] font-medium flex items-center gap-1"
              data-testid="clear-filters-button"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full h-12 px-4 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518]"
                data-testid="filter-status"
              >
                <option value="all">Todas</option>
                <option value="signed">Firmadas</option>
                <option value="pending">Pendientes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                Conductor
              </label>
              <input
                type="text"
                value={filters.driver}
                onChange={(e) => setFilters({...filters, driver: e.target.value})}
                className="w-full h-12 px-4 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518]"
                placeholder="Buscar conductor..."
                data-testid="filter-driver"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                  Desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full h-12 px-3 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518]"
                  data-testid="filter-date-from"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full h-12 px-3 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#1E8E3E] text-[#142518]"
                  data-testid="filter-date-to"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredDeliveries.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center" data-testid="empty-state">
          <img 
            src="https://images.unsplash.com/photo-1656543802898-41c8c46683a7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwxfHxjYXJkYm9hcmQlMjBib3glMjBwYWNrYWdlfGVufDB8fHx8MTc4MjI0MjQ3NHww&ixlib=rb-4.1.0&q=85" 
            alt="No hay entregas" 
            className="w-32 h-32 mx-auto mb-4 rounded-xl object-cover opacity-50"
          />
          <p className="text-[#4B5563]">
            {deliveries.length === 0 
              ? "No hay entregas registradas aún" 
              : "No se encontraron entregas con los filtros aplicados"}
          </p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="delivery-list">
          {filteredDeliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-black/5"
              data-testid={`delivery-item-${delivery.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold text-[#142518]" data-testid="delivery-plate">
                      {delivery.vehicle_plate}
                    </span>
                    {delivery.is_signed && (
                      <CheckCircle className="w-5 h-5 text-[#1E8E3E]" data-testid="signed-icon" />
                    )}
                  </div>
                  <p className="text-sm text-[#4B5563]" data-testid="delivery-driver">
                    <span className="font-medium">Conductor:</span> {delivery.driver_name}
                  </p>
                  <p className="text-sm text-[#4B5563]" data-testid="delivery-receiver">
                    <span className="font-medium">Recibido por:</span> {delivery.receiver_name}
                  </p>
                  <p className="text-sm text-[#4B5563] flex items-center gap-1 mt-1" data-testid="delivery-datetime">
                    <Clock className="w-4 h-4" />
                    {formatDate(delivery.delivery_datetime)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {delivery.is_signed && delivery.signed_pdf_path && (
                  <button
                    onClick={() => downloadSignedPdf(delivery)}
                    className="w-full h-12 bg-[#E8B89B] text-[#1A2E20] font-medium rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]"
                    data-testid="download-pdf-button"
                  >
                    <Download className="w-5 h-5" />
                    Descargar PDF Firmado
                  </button>
                )}

                {!delivery.is_signed && (
                  <div className="bg-[#FFF4E6] border border-[#FFD699] rounded-lg p-3 text-sm text-[#995C00]">
                    Entrega pendiente de firma
                  </div>
                )}

                <button
                  onClick={() => handleDeleteClick(delivery.id)}
                  className="w-full h-12 bg-white border-2 border-red-200 text-red-600 font-medium rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] hover:bg-red-50"
                  data-testid="delete-delivery-button"
                >
                  <Trash2 className="w-5 h-5" />
                  Eliminar Entrega
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" data-testid="delete-modal">
            <h3 className="text-xl font-semibold text-[#142518] mb-4">Confirmar Eliminación</h3>
            <p className="text-[#4B5563] mb-4">
              Esta acción eliminará permanentemente la entrega y su PDF firmado.
            </p>
            
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-2">
                Ingrese la contraseña
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Contraseña de seguridad"
                className="w-full h-12 px-4 rounded-xl bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-red-500 text-[#142518]"
                data-testid="delete-password-input"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 h-12 bg-white border-2 border-[#E2E8F0] text-[#4B5563] font-medium rounded-xl active:scale-[0.98]"
                data-testid="delete-cancel-button"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 h-12 bg-red-600 text-white font-medium rounded-xl active:scale-[0.98]"
                data-testid="delete-confirm-button"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
