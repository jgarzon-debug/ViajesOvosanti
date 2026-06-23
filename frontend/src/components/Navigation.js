import { useLocation, useNavigate } from "react-router-dom";
import { Package, ClipboardList } from "lucide-react";

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] shadow-lg z-[10000]" data-testid="bottom-navigation">
      <div className="w-full mx-auto flex justify-start pl-4">
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/")}
            className={`flex flex-col items-center justify-center h-16 px-6 ${
              isActive("/") ? "text-[#1E8E3E]" : "text-[#4B5563]"
            } active:scale-[0.95]`}
            data-testid="nav-new-delivery"
          >
            <Package className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Nueva Entrega</span>
          </button>

          <button
            onClick={() => navigate("/history")}
            className={`flex flex-col items-center justify-center h-16 px-6 ${
              isActive("/history") ? "text-[#1E8E3E]" : "text-[#4B5563]"
            } active:scale-[0.95]`}
            data-testid="nav-history"
          >
            <ClipboardList className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Historial</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
