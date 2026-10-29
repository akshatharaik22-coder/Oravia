import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { label: "Home", path: "/" },
    { label: "Services", path: "/services" },
    { label: "Our Clinics", path: "/clinics" },
  ];

  return (
    <header className="oravia-header">
      <button
        className="oravia-brand"
        onClick={() => navigate("/")}
        aria-label="Go to ORAVIA home"
      >
        <span className="oravia-brand-mark">O</span>

        <span className="oravia-brand-text">
          ORAVIA
          <small>YOUR SMILE, OUR CARE</small>
        </span>
      </button>

      <nav className="oravia-navigation" aria-label="Main navigation">
        {links.map((link) => (
          <button
            key={link.path}
            className={
              location.pathname === link.path ? "active" : ""
            }
            onClick={() => navigate(link.path)}
            aria-current={
              location.pathname === link.path ? "page" : undefined
            }
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="oravia-header-actions">
        <button
          className="oravia-signin"
          onClick={() => navigate("/login")}
        >
          Sign in
        </button>

        <button
          className="oravia-book-button"
          onClick={() => navigate("/booking")}
        >
          Book appointment <span>↗</span>
        </button>
      </div>
    </header>
  );
}