import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Services from "./pages/Services.jsx";
import Clinics from "./pages/Clinics.jsx";
import Booking from "./pages/Booking.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminAppointments from "./pages/AdminAppointments.jsx";
import DoctorMonitor from "./pages/DoctorMonitor.jsx";
import AdminBilling from "./pages/AdminBilling";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminAppointments from "./pages/AdminAppointments.jsx";
function PatientRoute({ children }) {
  const patientToken = localStorage.getItem("oraviaToken");

  if (!patientToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}



function AdminEntry() {
  const adminToken = localStorage.getItem("oraviaAdminToken");

  if (adminToken) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/admin/login" replace />;
}

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

        

        {/* =========================
            PATIENT
        ========================== */}

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="patient">
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        {/* =========================
            ADMIN
        ========================== */}

        <Route
          path="/admin"
          element={<AdminEntry />}
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
        path="/admin/dashboard"
        element={
        <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
        </ProtectedRoute>
        }
         />
          <Route
          path="/admin/appointments"
          element={
         <ProtectedRoute requiredRole="admin">
           <AdminAppointments />
         </ProtectedRoute>
          }
           />
        <Route
          path="/admin/doctor-monitor"
          element={
           <ProtectedRoute requiredRole="admin">
            <DoctorMonitor />
           </ProtectedRoute>
           }
        />
        <Route
        path="/admin/billing"
        element={
        <ProtectedRoute requiredRole="admin">
        <AdminBilling />
        </ProtectedRoute>}  
        />
        {/* =========================
            FALLBACK
        ========================== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;