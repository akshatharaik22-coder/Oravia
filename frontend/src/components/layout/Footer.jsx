import React from "react";
import { useNavigate } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="oravia-footer">
      <button
        className="oravia-footer-brand"
        onClick={() => navigate("/")}
      >
        <span className="oravia-footer-mark">O</span>
        ORAVIA
      </button>

      <p>Thoughtful dental care. A smile at a time.</p>

      <nav className="oravia-footer-links" aria-label="Footer navigation">
        <button onClick={() => navigate("/")}>Home</button>
        <button onClick={() => navigate("/services")}>Services</button>
        <button onClick={() => navigate("/clinics")}>Clinics</button>
        <button onClick={() => navigate("/login")}>Patient login</button>
      </nav>

      <span className="oravia-footer-copyright">
        © {new Date().getFullYear()} ORAVIA
      </span>
    </footer>
  );
}