import { useNavigate } from "react-router-dom";
import "./Home.css";

const services = [
  {
    number: "01",
    icon: "✦",
    title: "General Dentistry",
    description:
      "Routine checkups, professional cleaning, and preventive dental care.",
  },
  {
    number: "02",
    icon: "◇",
    title: "Cosmetic Dentistry",
    description:
      "Enhance your smile with personalized cosmetic dental treatments.",
  },
  {
    number: "03",
    icon: "⌘",
    title: "Dental Implants",
    description:
      "Explore restorative options designed to support your oral health.",
  },
  {
    number: "04",
    icon: "✳",
    title: "Teeth Whitening",
    description:
      "Discover professional whitening options for a brighter smile.",
  },
];

const benefits = [
  {
    number: "01",
    title: "Care that feels personal",
    description:
      "Every treatment begins with understanding your concerns and goals.",
  },
  {
    number: "02",
    title: "Your time matters",
    description:
      "Request appointments online and keep track of your upcoming visits.",
  },
  {
    number: "03",
    title: "Your care, connected",
    description:
      "Access your appointments and available dental records through your patient account.",
  },
];

function Home() {
  const navigate = useNavigate();

  return (
    <div className="oravia-home">
      {/* Navigation */}
      <header className="oravia-header">
        <nav className="oravia-nav">
          <button
            className="oravia-brand"
            onClick={() => navigate("/")}
            aria-label="ORAVIA home"
          >
            <span className="oravia-brand-mark">O</span>
            <span>
              <strong>ORAVIA</strong>
              <small>DENTAL CARE</small>
            </span>
          </button>

          <div className="oravia-nav-links">
            <button onClick={() => navigate("/")}>Home</button>
            <button onClick={() => navigate("/services")}>
              Services
            </button>
            <button onClick={() => navigate("/clinics")}>
              Our Clinics
            </button>
          </div>

          <div className="oravia-nav-actions">
            <button
              className="oravia-login"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>

            <button
              className="oravia-button oravia-button-small"
              onClick={() => navigate("/booking")}
            >
              Book a visit <span aria-hidden="true">↗</span>
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="oravia-hero">
          <div className="oravia-hero-copy">
            <div className="oravia-eyebrow">
              <span className="oravia-status-dot" />
              A BETTER KIND OF DENTAL CARE
            </div>

            <h1>
              A healthier smile.
              <br />
              <span>A happier you.</span>
            </h1>

            <p className="oravia-hero-description">
              Thoughtful dental care, a comfortable experience,
              and a smile you feel confident sharing.
              Your journey to better oral health starts here.
            </p>

            <div className="oravia-hero-actions">
              <button
                className="oravia-button"
                onClick={() => navigate("/booking")}
              >
                Book an appointment <span aria-hidden="true">↗</span>
              </button>

              <button
                className="oravia-text-button"
                onClick={() => navigate("/services")}
              >
                Explore our services <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="oravia-trust">
              <div className="oravia-trust-icon" aria-hidden="true">
                ✓
              </div>
              <div>
                <strong>Care built around you</strong>
                <span>From your first visit to every smile after.</span>
              </div>
            </div>
          </div>

          <div className="oravia-hero-visual">
            <div className="oravia-image-frame">
              <img
                src="https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1100&q=85"
                alt="A bright, modern dental treatment room"
              />

              <div className="oravia-image-overlay">
                <span className="oravia-image-label">
                  YOUR SMILE, OUR PRIORITY
                </span>
              </div>
            </div>

            <div className="oravia-floating-card">
              <span className="oravia-floating-icon" aria-hidden="true">
                ✧
              </span>
              <div>
                <strong>Made for your comfort</strong>
                <span>Care at your own pace.</span>
              </div>
            </div>

            <div className="oravia-hero-decoration" aria-hidden="true">
              +
            </div>
          </div>
        </section>

        {/* Introduction strip */}
        <section className="oravia-intro-strip">
          <div>
            <span className="oravia-strip-number">01 /</span>
            <span>Preventive care</span>
          </div>

          <div>
            <span className="oravia-strip-number">02 /</span>
            <span>Personal attention</span>
          </div>

          <div>
            <span className="oravia-strip-number">03 /</span>
            <span>Connected care</span>
          </div>

          <div>
            <span className="oravia-strip-number">04 /</span>
            <span>Confident smiles</span>
          </div>
        </section>

        {/* Services */}
        <section className="oravia-section oravia-services">
          <div className="oravia-section-heading">
            <div>
              <p className="oravia-eyebrow">HOW WE CAN HELP</p>
              <h2>
                Care for every
                <br />
                <span>kind of smile.</span>
              </h2>
            </div>

            <div className="oravia-section-aside">
              <p>
                From everyday dental health to specialized
                treatments, find the care that works for you.
              </p>

              <button
                className="oravia-text-button"
                onClick={() => navigate("/services")}
              >
                View all services <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div className="oravia-service-grid">
            {services.map((service) => (
              <article
                className="oravia-service-card"
                key={service.number}
              >
                <div className="oravia-service-top">
                  <span className="oravia-service-icon">
                    {service.icon}
                  </span>
                  <span className="oravia-service-number">
                    {service.number}
                  </span>
                </div>

                <h3>{service.title}</h3>

                <p>{service.description}</p>

                <button
                  className="oravia-card-link"
                  onClick={() => navigate("/booking")}
                  aria-label={`Book an appointment for ${service.title}`}
                >
                  <span>Book a visit</span>
                  <span aria-hidden="true">↗</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* Patient experience */}
        <section className="oravia-experience">
          <div className="oravia-experience-visual">
            <img
              src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=85"
              alt="A welcoming contemporary dental clinic"
              loading="lazy"
            />

            <div className="oravia-experience-caption">
              <span>GOOD CARE STARTS HERE</span>
              <strong>Feel comfortable. Feel cared for.</strong>
            </div>
          </div>

          <div className="oravia-experience-copy">
            <p className="oravia-eyebrow">THE ORAVIA EXPERIENCE</p>

            <h2>
              Dental care,
              <br />
              <span>with you in mind.</span>
            </h2>

            <p className="oravia-experience-description">
              Visiting the dentist should feel straightforward.
              We bring your appointments and available care
              information together to help you stay informed
              throughout your dental journey.
            </p>

            <div className="oravia-benefits">
              {benefits.map((benefit) => (
                <article
                  className="oravia-benefit"
                  key={benefit.number}
                >
                  <span className="oravia-benefit-number">
                    {benefit.number}
                  </span>

                  <div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.description}</p>
                  </div>
                </article>
              ))}
            </div>

            <button
              className="oravia-button"
              onClick={() => navigate("/register")}
            >
              Get started <span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>

        {/* Booking call to action */}
        <section className="oravia-booking-cta">
          <div className="oravia-cta-content">
            <p className="oravia-eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>

            <h2>
              Ready to put your
              <br />
              <span>smile first?</span>
            </h2>

            <p>
              Take the first step toward better dental care.
              Request an appointment with ORAVIA today.
            </p>

            <button
              className="oravia-button oravia-button-light"
              onClick={() => navigate("/booking")}
            >
              Schedule your visit <span aria-hidden="true">↗</span>
            </button>
          </div>

          <div className="oravia-cta-decoration" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="oravia-footer">
        <div className="oravia-footer-main">
          <div className="oravia-footer-brand">
            <button
              className="oravia-brand"
              onClick={() => navigate("/")}
              aria-label="ORAVIA home"
            >
              <span className="oravia-brand-mark">O</span>
              <span>
                <strong>ORAVIA</strong>
                <small>DENTAL CARE</small>
              </span>
            </button>

            <p>
              A thoughtful approach to dental care,
              built around your smile.
            </p>
          </div>

          <div className="oravia-footer-column">
            <h3>Explore</h3>
            <button onClick={() => navigate("/services")}>
              Services
            </button>
            <button onClick={() => navigate("/clinics")}>
              Our clinics
            </button>
            <button onClick={() => navigate("/booking")}>
              Appointments
            </button>
          </div>

          <div className="oravia-footer-column">
            <h3>Your account</h3>
            <button onClick={() => navigate("/login")}>
              Patient sign in
            </button>
            <button onClick={() => navigate("/register")}>
              Create an account
            </button>
            <button onClick={() => navigate("/admin/login")}>
              Staff sign in
            </button>
          </div>

          <div className="oravia-footer-column">
            <h3>Start here</h3>
            <p>
              Your next dental visit is just a few steps away.
            </p>
            <button
              className="oravia-footer-cta"
              onClick={() => navigate("/booking")}
            >
              Book a visit ↗
            </button>
          </div>
        </div>

        <div className="oravia-footer-bottom">
          <span>© {new Date().getFullYear()} ORAVIA Dental Care</span>
          <span>Designed around your smile.</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;