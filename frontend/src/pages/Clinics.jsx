import { useNavigate } from "react-router-dom";

function Clinics() {
  const navigate = useNavigate();

  const clinics = [
    {
      name: "ORAVIA Dental Centre",
      location: "Mangaluru",
      description:
        "General and preventive dental care with appointment-based consultation.",
    },
    {
      name: "ORAVIA Smile Studio",
      location: "Udupi",
      description:
        "Dental services focused on preventive, cosmetic and restorative care.",
    },
    {
      name: "ORAVIA Family Dental",
      location: "Kasaragod",
      description:
        "Patient-focused dental care for routine consultations and treatments.",
    },
  ];

  return (
    <main className="page-shell">
      <section className="page-hero">
        <p className="section-label">CLINICS</p>

        <h1>
          Find dental care
          <br />
          in one place.
        </h1>

        <p>
          Explore clinics and continue to appointment booking
          based on the service you are looking for.
        </p>
      </section>

      <section className="clinic-grid">
        {clinics.map((clinic) => (
          <article className="clinic-card" key={clinic.name}>
            <div className="clinic-card-top">
              <span className="clinic-marker">●</span>

              <span>{clinic.location}</span>
            </div>

            <h2>{clinic.name}</h2>

            <p>{clinic.description}</p>

            <button onClick={() => navigate("/booking")}>
              View appointment options →
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Clinics;