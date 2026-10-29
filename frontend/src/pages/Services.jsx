import React from "react";
import { useNavigate } from "react-router-dom";
import "./Services.css";

const services = [
  {
    number: "01",
    title: "General Dentistry",
    description:
      "Maintain a healthy smile with regular dental checkups, professional cleaning, and preventive care.",
    treatments: ["Dental checkups", "Teeth cleaning", "Cavity treatment"],
    icon: "✳",
  },
  {
    number: "02",
    title: "Cosmetic Dentistry",
    description:
      "Improve the appearance of your smile with treatments designed around your dental needs.",
    treatments: ["Teeth whitening", "Smile enhancement", "Cosmetic consultation"],
    icon: "✧",
  },
  {
    number: "03",
    title: "Root Canal Treatment",
    description:
      "Get professional care for damaged or infected teeth while prioritizing comfort and tooth preservation.",
    treatments: ["Tooth examination", "Root canal procedure", "Follow-up care"],
    icon: "◉",
  },
  {
    number: "04",
    title: "Dental Implants",
    description:
      "Explore tooth replacement options with a personalized assessment from a dental professional.",
    treatments: ["Implant consultation", "Treatment planning", "Restoration options"],
    icon: "⌘",
  },
  {
    number: "05",
    title: "Orthodontic Care",
    description:
      "Learn about treatment options for misaligned teeth and bite concerns.",
    treatments: ["Alignment assessment", "Braces consultation", "Progress reviews"],
    icon: "⟷",
  },
  {
    number: "06",
    title: "Emergency Dental Care",
    description:
      "Seek prompt professional guidance for sudden tooth pain, dental injuries, or other urgent concerns.",
    treatments: ["Pain assessment", "Dental injury evaluation", "Urgent consultation"],
    icon: "＋",
  },
];

function Services() {
  const navigate = useNavigate();

  return (
    <main className="services-page">
      {/* Navigation */}
      <header className="services-header">
        <button
          className="services-brand"
          onClick={() => navigate("/")}
          aria-label="ORAVIA home"
        >
          <span className="services-brand-mark">O</span>
          <span>
            ORAVIA
            <small>YOUR SMILE, OUR CARE</small>
          </span>
        </button>

        <nav className="services-nav" aria-label="Main navigation">
          <button onClick={() => navigate("/")}>Home</button>
          <button className="active" onClick={() => navigate("/services")}>
            Services
          </button>
          <button onClick={() => navigate("/clinics")}>Our Clinics</button>
        </nav>

        <div className="services-header-actions">
          <button
            className="services-signin"
            onClick={() => navigate("/login")}
          >
            Sign in
          </button>

          <button
            className="services-book-button"
            onClick={() => navigate("/booking")}
          >
            Book appointment <span>↗</span>
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="services-hero">
        <div className="services-hero-content">
          <span className="services-eyebrow">
            <span className="services-eyebrow-dot" />
            DENTAL CARE, MADE PERSONAL
          </span>

          <h1>
            Care for every
            <br />
            <em>kind of smile.</em>
          </h1>

          <p>
            From everyday checkups to specialized treatments, explore dental
            care options designed to help you make informed decisions about
            your smile.
          </p>

          <button
            className="services-primary-button"
            onClick={() => navigate("/booking")}
          >
            Find your treatment <span>↗</span>
          </button>

          <div className="services-hero-note">
            <span>✳</span>
            Professional care starts with the right conversation.
          </div>
        </div>

        <div className="services-hero-image">
          <img
            src="https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=85"
            alt="Modern dental clinic treatment room"
          />

          <div className="services-image-label">
            <span className="services-image-label-icon">✧</span>
            <div>
              <strong>Your smile matters.</strong>
              <span>Care that starts with you.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="services-intro">
        <span className="services-section-label">OUR APPROACH</span>

        <h2>
          The right care begins
          <br />
          with <em>understanding you.</em>
        </h2>

        <p>
          Every smile is different. Explore our listed service categories and
          book a consultation to discuss which treatment may be suitable for
          your needs.
        </p>
      </section>

      {/* Services Grid */}
      <section className="services-list-section">
        <div className="services-list-heading">
          <div>
            <span className="services-section-label">EXPLORE OUR SERVICES</span>
            <h2>Care for your needs.</h2>
          </div>

          <p>
            Not sure where to start?
            <br />
            Book a consultation with our team.
          </p>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.number}>
              <div className="service-card-top">
                <span className="service-card-icon" aria-hidden="true">
                  {service.icon}
                </span>
                <span className="service-card-number">{service.number}</span>
              </div>

              <h3>{service.title}</h3>
              <p className="service-card-description">
                {service.description}
              </p>

              <div className="service-card-divider" />

              <span className="service-includes-label">
                WHAT YOU CAN EXPLORE
              </span>

              <ul>
                {service.treatments.map((treatment) => (
                  <li key={treatment}>
                    <span>✓</span>
                    {treatment}
                  </li>
                ))}
              </ul>

              <button
                className="service-card-link"
                onClick={() => navigate("/booking")}
                aria-label={`Book an appointment for ${service.title}`}
              >
                Book a consultation <span>↗</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Patient guidance */}
      <section className="services-guidance">
        <div className="services-guidance-symbol">✳</div>

        <div>
          <span className="services-section-label">NEED SOME GUIDANCE?</span>
          <h2>Not sure which service is right for you?</h2>
          <p>
            Tell us what you need help with when booking. A dental professional
            can assess your concerns and discuss suitable next steps.
          </p>
        </div>

        <button
          className="services-guidance-button"
          onClick={() => navigate("/booking")}
        >
          Book a consultation <span>↗</span>
        </button>
      </section>

      {/* Final CTA */}
      <section className="services-cta">
        <div>
          <span className="services-cta-label">YOUR NEXT STEP STARTS HERE</span>
          <h2>
            A healthier smile
            <br />
            starts with a visit.
          </h2>
          <p>
            Take the first step toward understanding your dental health.
          </p>
        </div>

        <button
          className="services-cta-button"
          onClick={() => navigate("/booking")}
        >
          Book your appointment <span>↗</span>
        </button>
      </section>

      {/* Footer */}
      <footer className="services-footer">
        <button className="services-footer-brand" onClick={() => navigate("/")}>
          <span className="services-brand-mark">O</span>
          <span>ORAVIA</span>
        </button>

        <p>Thoughtful dental care. A smile at a time.</p>

        <div className="services-footer-links">
          <button onClick={() => navigate("/")}>Home</button>
          <button onClick={() => navigate("/services")}>Services</button>
          <button onClick={() => navigate("/clinics")}>Clinics</button>
          <button onClick={() => navigate("/login")}>Patient login</button>
          <button onClick={() => navigate("/admin/login")}>Admin</button>
        </div>

        <span className="services-copyright">
          © {new Date().getFullYear()} ORAVIA
        </span>
      </footer>
    </main>
  );
}

export default Services;