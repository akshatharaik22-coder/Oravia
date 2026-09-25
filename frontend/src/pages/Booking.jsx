import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Booking() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    treatment: "",
    appointmentDate: "",
    appointmentTime: "",
    symptoms: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("oraviaToken");

    if (!token) {
      navigate("/login");
      return;
    }

    const savedUser = localStorage.getItem("oraviaUser");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const token = localStorage.getItem("oraviaToken");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/api/appointments",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(
        response.data.message ||
          "Appointment booked successfully."
      );

      setFormData({
        treatment: "",
        appointmentDate: "",
        appointmentTime: "",
        symptoms: "",
      });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to book appointment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="page-hero">
        <p className="section-label">APPOINTMENT</p>

        <h1>
          Schedule your
          <br />
          dental visit.
        </h1>

        <p>
          Choose your treatment, preferred date, and available
          time. Your appointment will be linked to your ORAVIA
          patient account automatically.
        </p>
      </section>

      <section className="booking-form-section">
        <div className="booking-form-card">

          <div className="booking-form-header">
            <div>
              <p className="section-label">PATIENT</p>

              <h2>
                {user?.name || "Patient"}
              </h2>

              <p>
                {user?.email}
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/dashboard")}
            >
              View dashboard
            </button>
          </div>


          <form onSubmit={handleSubmit}>

            <div className="form-row">

              <div className="form-group">
                <label htmlFor="treatment">
                  Treatment
                </label>

                <select
                  id="treatment"
                  name="treatment"
                  value={formData.treatment}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select a treatment
                  </option>

                  <option value="Dental Cleaning">
                    Dental Cleaning
                  </option>

                  <option value="Teeth Whitening">
                    Teeth Whitening
                  </option>

                  <option value="Root Canal">
                    Root Canal
                  </option>

                  <option value="Braces & Alignment">
                    Braces & Alignment
                  </option>
                </select>
              </div>


              <div className="form-group">
                <label htmlFor="appointmentDate">
                  Preferred date
                </label>

                <input
                  id="appointmentDate"
                  name="appointmentDate"
                  type="date"
                  value={formData.appointmentDate}
                  onChange={handleChange}
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  required
                />
              </div>

            </div>


            <div className="form-group">
              <label htmlFor="appointmentTime">
                Preferred time
              </label>

              <select
                id="appointmentTime"
                name="appointmentTime"
                value={formData.appointmentTime}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select a time
                </option>

                <option value="09:00 AM">
                  09:00 AM
                </option>

                <option value="10:00 AM">
                  10:00 AM
                </option>

                <option value="11:00 AM">
                  11:00 AM
                </option>

                <option value="02:00 PM">
                  02:00 PM
                </option>

                <option value="03:00 PM">
                  03:00 PM
                </option>

                <option value="04:00 PM">
                  04:00 PM
                </option>
              </select>
            </div>


            <div className="form-group">
              <label htmlFor="symptoms">
                Additional information
                <span className="optional-label">
                  Optional
                </span>
              </label>

              <textarea
                id="symptoms"
                name="symptoms"
                rows="5"
                placeholder="Tell us briefly about your concern or reason for the visit."
                value={formData.symptoms}
                onChange={handleChange}
              />
            </div>


            {error && (
              <p className="form-error">
                {error}
              </p>
            )}


            {success && (
              <div className="form-success">
                <strong>
                  Appointment booked successfully.
                </strong>

                <p>
                  Your appointment has been added to your
                  ORAVIA account.
                </p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate("/dashboard")}
                >
                  View my appointment →
                </button>
              </div>
            )}


            {!success && (
              <button
                type="submit"
                className="primary-button booking-submit"
                disabled={loading}
              >
                {loading
                  ? "Booking appointment..."
                  : "Confirm appointment →"}
              </button>
            )}

          </form>

        </div>
      </section>
    </main>
  );
}

export default Booking;