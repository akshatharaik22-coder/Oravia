import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function AdminLogin()  {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/admin-login",
        {
          email,
          password,
        }
      );

      const { token, user } = response.data;

      localStorage.setItem(
        "oraviaAdminToken",
        token
      );

      localStorage.setItem(
        "oraviaAdminUser",
        JSON.stringify(user)
      );

      navigate("/admin/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Invalid admin credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">

      <div className="admin-login-card">

        <div className="admin-login-logo">
          ORAVIA
        </div>

        <p className="admin-login-label">
          ADMINISTRATION
        </p>

        <h1>Welcome Back</h1>

        <p className="admin-login-subtitle">
          Sign in to manage clinic appointments.
        </p>


        <form onSubmit={handleLogin}>

          <div className="login-field">

            <label htmlFor="admin-email">
              Email address
            </label>

            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter admin email"
              required
            />

          </div>


          <div className="login-field">

            <label htmlFor="admin-password">
              Password
            </label>

            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter admin password"
              required
            />

          </div>


          {error && (
            <p className="login-error">
              {error}
            </p>
          )}


          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default AdminLogin;