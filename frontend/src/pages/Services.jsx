import { useNavigate } from "react-router-dom";

function Services() {
  const navigate = useNavigate();

  const services = [
    {
      title: "Dental Cleaning",
      description:
        "Professional cleaning to help maintain oral hygiene and remove plaque and buildup.",
    },
    {
      title: "Teeth Whitening",
      description:
        "Cosmetic dental care designed to brighten the appearance of your smile.",
    },
    {
      title: "Root Canal",
      description:
        "Treatment used to address problems affecting the inside of a tooth.",
    },
    {
      title: "Braces & Alignment",
      description:
        "Orthodontic care focused on improving tooth alignment and bite.",
    },
  ];

  return (
    <main className="page-shell">
      <section className="page-hero">
        <p className="section-label">DENTAL SERVICES</p>

        <h1>
          Care options designed
          <br />
          around your needs.
        </h1>

        <p>
          Explore common dental services available through ORAVIA
          and continue to appointment booking when you're ready.
        </p>
      </section>

      <section className="service-grid">
        {services.map((service) => (
          <article className="service-card" key={service.title}>
            <span className="service-card-icon">+</span>

            <h2>{service.title}</h2>

            <p>{service.description}</p>

            <button onClick={() => navigate("/booking")}>
              Book this service →
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Services;