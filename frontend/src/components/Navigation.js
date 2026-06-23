import { useLocation, useNavigate } from "react-router-dom";
import { Package, ClipboardList } from "lucide-react";

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] shadow-lg" data-testid="bottom-navigation">
      <div className="w-full max-w-md mx-auto flex">
        <button
          onClick={() => navigate("/")}
          className={`flex-1 flex flex-col items-center justify-center h-16 ${
            isActive("/") ? "text-[#1E8E3E]" : "text-[#4B5563]"
          } active:scale-[0.95]`}
          data-testid="nav-new-delivery"
        >
          <Package className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Nueva Entrega</span>
        </button>

        <button
          onClick={() => navigate("/history")}
          className={`flex-1 flex flex-col items-center justify-center h-16 ${
            isActive("/history") ? "text-[#1E8E3E]" : "text-[#4B5563]"
          } active:scale-[0.95]`}
          data-testid="nav-history"
        >
          <ClipboardList className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Historial</span>
        </button>
      </div>
    </nav>
  );
}
