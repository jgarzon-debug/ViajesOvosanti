import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NewDelivery from "@/pages/NewDelivery";
import DeliveryHistory from "@/pages/DeliveryHistory";
import Dashboard from "@/pages/Dashboard";
import Navigation from "@/components/Navigation";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <div className="min-h-screen bg-[#FDFBF7]">
          <Routes>
            <Route path="/" element={<NewDelivery />} />
            <Route path="/history" element={<DeliveryHistory />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
          <Navigation />
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
