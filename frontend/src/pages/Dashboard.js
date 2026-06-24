import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart3, Package, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    signed: 0,
    pending: 0,
    byDriver: [],
    byVehicle: [],
    recent: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/deliveries/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6 pb-24">
        <div className="bg-white rounded-xl p-8 text-center" data-testid="loading-dashboard">
          <p className="text-[#4B5563]">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  const signedPercentage = stats.total > 0 ? ((stats.signed / stats.total) * 100).toFixed(0) : 0;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 pb-24">
      <div className="mb-8 flex items-center justify-center">
        <img 
          src="https://customer-assets.emergentagent.com/job_ovosanti-delivery/artifacts/e989slhn_logo%20ovosanti%20%2812%29.png" 
          alt="Ovosanti Logo" 
          className="h-16"
          data-testid="ovosanti-logo-dashboard"
        />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-black/5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-[#1E8E3E]" />
          <h1 className="text-2xl font-semibold text-[#142518]">Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-black/5" data-testid="stat-total">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-[#4B5563]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">Total</p>
          </div>
          <p className="text-3xl font-bold text-[#142518]">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-black/5" data-testid="stat-signed">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-[#1E8E3E]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">Firmadas</p>
          </div>
          <p className="text-3xl font-bold text-[#1E8E3E]">{stats.signed}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-black/5" data-testid="stat-pending">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-[#E8B89B]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">Pendientes</p>
          </div>
          <p className="text-3xl font-bold text-[#D19C7B]">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-black/5" data-testid="stat-percentage">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#1E8E3E]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">Tasa</p>
          </div>
          <p className="text-3xl font-bold text-[#1E8E3E]">{signedPercentage}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-black/5 mb-6">
        <h2 className="text-lg font-semibold text-[#142518] mb-4">Por Conductor</h2>
        {stats.byDriver.length > 0 ? (
          <div className="space-y-3">
            {stats.byDriver.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
                <span className="text-[#142518] font-medium">{item.driver_name}</span>
                <span className="text-[#1E8E3E] font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#4B5563] text-sm">No hay datos disponibles</p>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-black/5">
        <h2 className="text-lg font-semibold text-[#142518] mb-4">Por Vehículo</h2>
        {stats.byVehicle.length > 0 ? (
          <div className="space-y-3">
            {stats.byVehicle.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0">
                <span className="text-[#142518] font-medium">{item.vehicle_plate}</span>
                <span className="text-[#1E8E3E] font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#4B5563] text-sm">No hay datos disponibles</p>
        )}
      </div>
    </div>
  );
}
