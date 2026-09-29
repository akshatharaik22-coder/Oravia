import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Services from "./pages/Services.jsx";
import Clinics from "./pages/Clinics.jsx";
import Booking from "./pages/Booking.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";

import AdminLogin from "./pages/AdminLogin.jsx";
import AdminAppointments from "./pages/AdminAppointments.jsx";
import DoctorMonitor from "./pages/DoctorMonitor.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =========================
            PUBLIC ORAVIA
        ========================== */}

        <Route path="/" element={<Home />} />

        <Route path="/services" element={<Services />} />

        <Route path="/clinics" element={<Clinics />} />

        <Route path="/booking" element={<Booking />} />
        <Route path="/doctor" element={<DoctorMonitor />} />

        {/* =========================
            PATIENT
        ========================== */}

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={<PatientDashboard />}
        />

        {/* =========================
            ADMIN
        ========================== */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin/dashboard"
          element={<AdminAppointments />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;