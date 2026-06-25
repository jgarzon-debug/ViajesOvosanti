import { useState, useEffect } from "react";
import axios from "axios";
import { ClipboardList, CheckCircle, Clock, Download, Filter, X } from "lucide-react";
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

    try {
      const response = await axios.get(`${API_URL}/files/${delivery.signed_pdf_path}`, {
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `entrega-${delivery.vehicle_plate}-${delivery.id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al descargar el PDF");
    }
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
