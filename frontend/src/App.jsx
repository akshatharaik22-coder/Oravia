import { useState } from "react";
import axios from "axios";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminAppointments from "./pages/AdminAppointments.jsx";

function App() {
  const isAdmin = window.location.pathname === "/admin";

  const [formData, setFormData] = useState({
    patientName: "",
    phone: "",
    email: "",
    treatment: "",
    appointmentDate: "",
    appointmentTime: "",
    symptoms: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (isAdmin) {
    return <AdminAppointments />;
  }

  

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      await axios.post(
        "http://localhost:5000/api/appointments",
        formData
      );

      setMessage("Appointment booked successfully!");

      setFormData({
        patientName: "",
        phone: "",
        email: "",
        treatment: "",
        appointmentDate: "",
        appointmentTime: "",
        symptoms: "",
      });
    } catch (err) {
      console.error("Booking error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to book appointment. Please try again."
      );
    }
  };

  // Your existing return (...) remains unchanged
}
export default App;