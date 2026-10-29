import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Home from "./pages/Home.jsx";
import Services from "./pages/Services.jsx";
import Clinics from "./pages/Clinics.jsx";
import Booking from "./pages/Booking.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import PatientDashboard from "./pages/PatientDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminAppointments from "./pages/AdminAppointments.jsx";
import DoctorMonitor from "./pages/DoctorMonitor.jsx";
import AdminBilling from "./pages/AdminBilling.jsx";

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
            PUBLIC ORAVIA PAGES
        ========================== */}

        <Route path="/" element={<Home />} />

        <Route
          path="/services"
          element={<Services />}
        />

        <Route
          path="/clinics"
          element={<Clinics />}
        />

        <Route
          path="/booking"
          element={<Booking />}
        />

        {/* =========================
            PATIENT AUTHENTICATION
        ========================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* =========================
            PATIENT DASHBOARD
        ========================== */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="patient">
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        {/* =========================
            ADMIN ENTRY AND LOGIN
        ========================== */}

        <Route
          path="/admin"
          element={<AdminEntry />}
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        {/* =========================
            ADMIN DASHBOARD
        ========================== */}

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* =========================
            ADMIN APPOINTMENTS
        ========================== */}

        <Route
          path="/admin/appointments"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminAppointments />
            </ProtectedRoute>
          }
        />

        {/* =========================
            DOCTOR MONITOR
        ========================== */}

        <Route
          path="/admin/doctor-monitor"
          element={
            <ProtectedRoute requiredRole="admin">
              <DoctorMonitor />
            </ProtectedRoute>
          }
        />

        {/* =========================
            BILLING AND PAYMENTS
        ========================== */}

        <Route
          path="/admin/billing"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminBilling />
            </ProtectedRoute>
          }
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