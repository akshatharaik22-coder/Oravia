import { Link } from "react-router-dom";
import "./Home.css";

const services = [
  {
    number: "01",
    title: "General dentistry",
    description:
      "Routine examinations and practical guidance to help you maintain a healthy smile.",
    tag: "Everyday care",
  },
  {
    number: "02",
    title: "Cleaning and prevention",
    description:
      "Professional cleaning and preventive care focused on comfort and long-term oral health.",
    tag: "Prevention first",
  },
  {
    number: "03",
    title: "Cosmetic dentistry",
    description:
      "Explore treatment options designed around your smile, needs, and goals.",
    tag: "Your smile",
  },
  {
    number: "04",
    title: "Restorative care",
    description:
      "Discuss options for restoring comfort, function, and confidence in your teeth.",
    tag: "Personalized plans",
  },
];

const careSteps = [
  {
    number: "01",
    title: "Book a visit",
    description: "Choose a convenient appointment date and time online.",
  },
  {
    number: "02",
    title: "Meet your care team",
    description: "Talk through your concerns and the care that suits you.",
  },
  {
    number: "03",
    title: "Keep track of your care",
    description: "Sign in to review your appointments and their current status.",
  },
];

function Home() {
  return (
    <main className="oravia-home">
      <header className="oh-header">
        <div className="oh-header-inner">
          <Link className="oh-brand" to="/" aria-label="ORAVIA home">
            <span className="oh-brand-mark" aria-hidden="true">
              O
            </span>
            <span className="oh-brand-copy">
              <strong>ORAVIA</strong>
              <small>DENTAL CARE</small>
            </span>
          </Link>

          <nav className="oh-nav" aria-label="Main navigation">
            <Link className="is-active" to="/" aria-current="page">
              Home
            </Link>
            <Link to="/services">Services</Link>
            <Link to="/clinics">Our clinic</Link>
          </nav>

          <div className="oh-header-actions">
            <Link className="oh-sign-in" to="/login">
              Patient sign in
            </Link>
            <Link className="oh-button oh-button-small" to="/booking">
              Book a visit <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="oh-hero" aria-labelledby="oh-hero-title">
        <div className="oh-hero-content">
          <p className="oh-eyebrow">
            <span className="oh-eyebrow-dot" aria-hidden="true" />
            Thoughtful dental care, centered on you
          </p>
          <h1 id="oh-hero-title">
            A healthier smile.
            <br />
            <em>A more confident you.</em>
          </h1>
          <p className="oh-hero-description">
            Dental care should feel clear, comfortable, and personal. ORAVIA helps
            you take the next step with convenient appointments and a simpler way
            to keep track of your care.
          </p>
          <div className="oh-hero-actions">
            <Link className="oh-button" to="/booking">
              Book an appointment <span aria-hidden="true">↗</span>
            </Link>
            <Link className="oh-text-link" to="/services">
              Explore our services <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="oh-hero-note">
            <span className="oh-note-icon" aria-hidden="true">✳</span>
            <span>Care plans explained clearly, one step at a time.</span>
          </div>
        </div>

        <div className="oh-hero-art" aria-label="Illustration of a calm, welcoming dental care space" role="img">
          <div className="oh-art-orbit oh-art-orbit-one" />
          <div className="oh-art-orbit oh-art-orbit-two" />
          <div className="oh-art-sun" />
          <div className="oh-art-leaf oh-art-leaf-one" />
          <div className="oh-art-leaf oh-art-leaf-two" />
          <div className="oh-art-leaf oh-art-leaf-three" />
          <div className="oh-art-tooth">
            <svg viewBox="0 0 180 210" aria-hidden="true">
              <path d="M49 23C32 23 20 37 21 58c1 20 12 33 17 51 4 13 8 31 18 45 7 11 14 9 17-4l9-37c2-8 5-11 8-11s6 3 8 11l9 37c3 13 10 15 17 4 10-14 14-32 18-45 5-18 16-31 17-51 1-21-11-35-28-35-13 0-26 8-41 8S62 23 49 23Z" fill="currentColor" />
              <path d="M53 40c-9 0-16 9-15 21 1 11 5 18 9 27" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="5" opacity=".8" />
            </svg>
          </div>
          <div className="oh-art-caption">
            <span className="oh-caption-mark" aria-hidden="true">✦</span>
            <span><strong>Your smile, your pace.</strong><small>Care that starts with listening.</small></span>
          </div>
          <span className="oh-art-spark oh-spark-one" aria-hidden="true">✳</span>
          <span className="oh-art-spark oh-spark-two" aria-hidden="true">✦</span>
        </div>
      </section>

      <section className="oh-trust-strip" aria-label="ORAVIA care principles">
        <div><span className="oh-trust-symbol" aria-hidden="true">◷</span><span><strong>Convenient booking</strong><small>Request a visit online</small></span></div>
        <div><span className="oh-trust-symbol" aria-hidden="true">♡</span><span><strong>Care with clarity</strong><small>Understand your next steps</small></span></div>
        <div><span className="oh-trust-symbol" aria-hidden="true">◎</span><span><strong>Your own dashboard</strong><small>Track your appointments</small></span></div>
      </section>

      <section className="oh-services section-shell" aria-labelledby="oh-services-title">
        <div className="oh-section-heading">
          <div>
            <p className="oh-eyebrow">Care for every stage</p>
            <h2 id="oh-services-title">Good oral health begins <em>with good care.</em></h2>
          </div>
          <Link className="oh-text-link" to="/services">
            View all services <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="oh-service-grid">
          {services.map((service) => (
            <article className="oh-service-card" key={service.number}>
              <div className="oh-service-card-top">
                <span className="oh-service-number">{service.number}</span>
                <span className="oh-service-arrow" aria-hidden="true">↗</span>
              </div>
              <p className="oh-service-tag">{service.tag}</p>
              <h3>{service.title}</h3>
              <p className="oh-service-description">{service.description}</p>
              <Link className="oh-card-link" to="/booking" aria-label={`Book an appointment for ${service.title}`}>
                Book a visit <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="oh-experience" aria-labelledby="oh-experience-title">
        <div className="oh-experience-inner">
          <div className="oh-experience-art" aria-hidden="true">
            <div className="oh-experience-circle">
              <div className="oh-experience-cross">+</div>
              <div className="oh-experience-line oh-line-one" />
              <div className="oh-experience-line oh-line-two" />
              <div className="oh-experience-dot oh-dot-one" />
              <div className="oh-experience-dot oh-dot-two" />
              <div className="oh-experience-dot oh-dot-three" />
            </div>
            <span className="oh-experience-sticker">CARE, MADE CLEAR</span>
          </div>
          <div className="oh-experience-copy">
            <p className="oh-eyebrow">A more considered experience</p>
            <h2 id="oh-experience-title">Dental care that respects <em>your time and comfort.</em></h2>
            <p>
              From scheduling your appointment to checking its status, ORAVIA is
              designed to make the practical parts of dental care easier to
              understand. Your treatment options should always be discussed with
              your dental professional.
            </p>
            <Link className="oh-button oh-button-light" to="/clinics">
              Get to know our clinic <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="oh-steps section-shell" aria-labelledby="oh-steps-title">
        <div className="oh-section-heading oh-steps-heading">
          <div>
            <p className="oh-eyebrow">Your visit, made simple</p>
            <h2 id="oh-steps-title">Three steps to get <em>started.</em></h2>
          </div>
          <p className="oh-section-intro">Start online, then let your care team guide you through the rest.</p>
        </div>
        <div className="oh-step-grid">
          {careSteps.map((step) => (
            <article className="oh-step" key={step.number}>
              <span className="oh-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="oh-booking-cta" aria-labelledby="oh-cta-title">
        <div className="oh-cta-decoration oh-cta-decoration-one" aria-hidden="true" />
        <div className="oh-cta-decoration oh-cta-decoration-two" aria-hidden="true" />
        <div className="oh-cta-content">
          <p className="oh-eyebrow">Whenever you're ready</p>
          <h2 id="oh-cta-title">Make room for <em>your smile.</em></h2>
          <p>Take the first step toward your next dental visit.</p>
          <Link className="oh-button oh-button-light" to="/booking">
            Schedule an appointment <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <footer className="oh-footer">
        <div className="oh-footer-main">
          <div className="oh-footer-brand-block">
            <Link className="oh-brand oh-brand-footer" to="/" aria-label="ORAVIA home">
              <span className="oh-brand-mark" aria-hidden="true">O</span>
              <span className="oh-brand-copy"><strong>ORAVIA</strong><small>DENTAL CARE</small></span>
            </Link>
            <p>Thoughtful dental care, with a clearer way to manage your visits.</p>
          </div>
          <div className="oh-footer-column">
            <h3>Explore</h3>
            <Link to="/">Home</Link>
            <Link to="/services">Services</Link>
            <Link to="/clinics">Our clinic</Link>
          </div>
          <div className="oh-footer-column">
            <h3>Appointments</h3>
            <Link to="/booking">Book a visit</Link>
            <Link to="/login">Patient sign in</Link>
            <Link to="/admin/login">Staff sign in</Link>
          </div>
        </div>
        <div className="oh-footer-bottom">
          <span>© {new Date().getFullYear()} ORAVIA Dental Care</span>
          <span>Care starts with a conversation.</span>
        </div>
      </footer>
    </main>
  );
}

export default Home;
