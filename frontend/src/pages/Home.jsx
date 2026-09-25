import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <p className="eyebrow">SMART DENTAL CARE</p>

          <h1>
            Dental care,
            <br />
            made simpler.
          </h1>

          <p className="hero-description">
            ORAVIA brings appointments, dental services, clinics, and your
            care history together in one simple platform.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() => navigate("/booking")}
            >
              Book an Appointment
            </button>

            <button
              className="secondary-button"
              onClick={() => navigate("/services")}
            >
              Explore Services
            </button>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="features-section">
        <div className="section-heading">
          <p className="section-label">YOUR CARE, CONNECTED</p>

          <h2>
            Everything you need for a
            <br />
            smoother dental journey.
          </h2>
        </div>

        <div className="features-grid">

          {/* Services */}
          <div className="feature-card">
            <span className="feature-number">01</span>

            <h3>Explore Dental Services</h3>

            <p>
              Discover common dental treatments and understand what each
              service is designed for before booking.
            </p>

            <button onClick={() => navigate("/services")}>
              View services →
            </button>
          </div>

          {/* Clinics */}
          <div className="feature-card">
            <span className="feature-number">02</span>

            <h3>Find the Right Clinic</h3>

            <p>
              Explore available clinics, dental services, doctors, and
              appointment options in one place.
            </p>

            <button onClick={() => navigate("/clinics")}>
              Explore clinics →
            </button>
          </div>

          {/* Patient Account */}
          <div className="feature-card">
            <span className="feature-number">03</span>

            <h3>Your Care History</h3>

            <p>
              Keep your previous appointments, treatments, booking status,
              and patient information connected to your account.
            </p>

            <button onClick={() => navigate("/login")}>
              Patient login →
            </button>
          </div>

        </div>
      </section>

      {/* Returning Patient Section */}
      <section className="returning-patient-section">
        <div className="returning-content">
          <p className="section-label">RETURNING PATIENT?</p>

          <h2>
            Your previous care
            <br />
            stays with you.
          </h2>

          <p>
            Once you create an ORAVIA account, your appointment history and
            patient details can stay connected to your profile. When you
            return, you can review previous appointments and continue with a
            new booking without repeatedly entering the same basic information.
          </p>

          <button
            className="primary-button"
            onClick={() => navigate("/login")}
          >
            Go to Patient Account →
          </button>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="booking-cta-section">
        <div className="booking-cta-content">
          <p className="section-label">READY WHEN YOU ARE</p>

          <h2>
            Take the next step toward better dental care.
          </h2>

          <p>
            Find a suitable service and schedule your appointment through
            ORAVIA.
          </p>

          <button
            className="primary-button"
            onClick={() => navigate("/booking")}
          >
            Book an Appointment →
          </button>
        </div>
      </section>

      {/* Safety Notice */}
      <section className="safety-section">
        <div className="safety-icon">✦</div>

        <div>
          <h3>Care navigation, not diagnosis</h3>

          <p>
            ORAVIA helps patients explore dental services and manage
            appointments. It does not diagnose medical conditions or replace
            evaluation by a qualified dental professional.
          </p>
        </div>
      </section>

    </div>
  );
}

export default Home;