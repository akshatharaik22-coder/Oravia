import { useNavigate } from "react-router-dom";
import "./Clinics.css";

const clinicFeatures = [
  "General dental consultations",
  "Preventive dental care",
  "Personalized treatment planning",
];

function Clinics() {
  const navigate = useNavigate();

  return (
    <div className="oravia-clinics">
      {/* Navigation */}
      <header className="clinics-header">
        <button
          className="clinics-brand"
          onClick={() => navigate("/")}
          aria-label="ORAVIA home"
        >
          <span className="clinics-brand-mark">O</span>

          <span>
            <strong>ORAVIA</strong>
            <small>DENTAL CARE</small>
          </span>
        </button>

        <nav className="clinics-nav">
          <button onClick={() => navigate("/")}>Home</button>
          <button onClick={() => navigate("/services")}>Services</button>
          <button className="active">Our Clinics</button>
        </nav>

        <button
          className="clinics-primary-button"
          onClick={() => navigate("/booking")}
        >
          Book an appointment <span>↗</span>
        </button>
      </header>

      <main>
        {/* Hero */}
        <section className="clinics-hero">
          <div className="clinics-hero-content">
            <p className="clinics-eyebrow">
              FIND YOUR DENTAL CARE
            </p>

            <h1>
              The right care.
              <br />
              <span>A little closer.</span>
            </h1>

            <p className="clinics-hero-description">
              Explore dental care options with ORAVIA.
              Find the clinic that suits your needs and take
              the next step toward a healthier smile.
            </p>

            <button
              className="clinics-primary-button"
              onClick={() => navigate("/booking")}
            >
              Request an appointment <span>↗</span>
            </button>
          </div>

          <div className="clinics-hero-image">
            <img
              src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=85"
              alt="Modern dental clinic interior"
            />

            <div className="clinics-image-label">
              <span className="clinics-image-dot" />
              YOUR SMILE MATTERS
            </div>
          </div>
        </section>

        {/* Introduction */}
        <section className="clinics-introduction">
          <div>
            <p className="clinics-eyebrow">THE ORAVIA APPROACH</p>

            <h2>
              Dental care should
              <br />
              feel simple.
            </h2>
          </div>

          <p>
            Choosing a dental clinic is an important decision.
            Our goal is to make the process clearer, from
            understanding available services to requesting
            an appointment and managing your care.
          </p>
        </section>

        {/* Clinic information */}
        <section className="clinics-list-section">
          <div className="clinics-section-heading">
            <div>
              <p className="clinics-eyebrow">EXPLORE YOUR OPTIONS</p>
              <h2>Find your care.</h2>
            </div>

            <p>
              Contact the clinic to confirm its location,
              opening hours, and available treatments.
            </p>
          </div>

          <article className="clinic-card">
            <div className="clinic-card-image">
              <img
                src="https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1000&q=85"
                alt="Dental treatment room"
                loading="lazy"
              />

              <span className="clinic-card-badge">
                DENTAL CARE
              </span>
            </div>

            <div className="clinic-card-content">
              <p className="clinics-eyebrow">
                ORAVIA · CLINIC INFORMATION
              </p>

              <h3>ORAVIA Dental Care</h3>

              <p className="clinic-card-description">
                Explore dental consultation and treatment options.
                Contact the clinic to confirm its address,
                available services, and appointment times.
              </p>

              <div className="clinic-features">
                {clinicFeatures.map((feature) => (
                  <div key={feature} className="clinic-feature">
                    <span>✓</span>
                    {feature}
                  </div>
                ))}
              </div>

              <div className="clinic-card-actions">
                <button
                  className="clinics-primary-button"
                  onClick={() => navigate("/booking")}
                >
                  Request a visit <span>↗</span>
                </button>

                <button
                  className="clinic-secondary-button"
                  onClick={() => navigate("/services")}
                >
                  Explore services →
                </button>
              </div>
            </div>
          </article>

          <p className="clinics-demo-note">
            Clinic information shown here is introductory
            content. Add verified clinic addresses, contact
            details, and operating hours before deployment.
          </p>
        </section>

        {/* Appointment CTA */}
        <section className="clinics-cta">
          <div>
            <p className="clinics-eyebrow">
              YOUR NEXT STEP
            </p>

            <h2>
              Let's make your
              <br />
              next visit easier.
            </h2>

            <p>
              Ready to get started? Submit your preferred
              appointment details and take the first step.
            </p>

            <button
              className="clinics-light-button"
              onClick={() => navigate("/booking")}
            >
              Book an appointment <span>↗</span>
            </button>
          </div>

          <div className="clinics-cta-decoration" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="clinics-footer">
        <div className="clinics-footer-top">
          <div>
            <button
              className="clinics-brand"
              onClick={() => navigate("/")}
            >
              <span className="clinics-brand-mark">O</span>

              <span>
                <strong>ORAVIA</strong>
                <small>DENTAL CARE</small>
              </span>
            </button>

            <p>
              Thoughtful dental care, designed around your smile.
            </p>
          </div>

          <div className="clinics-footer-links">
            <strong>Explore</strong>

            <button onClick={() => navigate("/")}>Home</button>
            <button onClick={() => navigate("/services")}>
              Services
            </button>
            <button onClick={() => navigate("/clinics")}>
              Our clinics
            </button>
          </div>

          <div className="clinics-footer-links">
            <strong>Your account</strong>

            <button onClick={() => navigate("/login")}>
              Patient login
            </button>

            <button onClick={() => navigate("/register")}>
              Create account
            </button>
          </div>
        </div>

        <div className="clinics-footer-bottom">
          <span>
            © {new Date().getFullYear()} ORAVIA Dental Care
          </span>

          <button onClick={() => navigate("/admin/login")}>
            Staff login
          </button>
        </div>
      </footer>
    </div>
  );
}

export default Clinics;