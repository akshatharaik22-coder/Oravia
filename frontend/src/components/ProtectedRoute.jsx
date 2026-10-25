import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const API_URL = "http://localhost:5000";

function ProtectedRoute({ children, requiredRole }) {
  const [status, setStatus] = useState("checking");
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      try {
        const token =
          requiredRole === "admin"
            ? localStorage.getItem("oraviaAdminToken")
            : localStorage.getItem("oraviaToken");

        if (!token) {
          if (isMounted) {
            setStatus("unauthenticated");
          }
          return;
        }

        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Authentication failed");
        }

        const data = await response.json();

        if (!data.user) {
          throw new Error("User information missing");
        }

        if (data.user.role !== requiredRole) {
          if (isMounted) {
            setStatus("wrong-role");
          }
          return;
        }

        if (isMounted) {
          setUser(data.user);
          setStatus("authenticated");
        }
      } catch (error) {
        console.error("Route authentication error:", error);

        if (requiredRole === "admin") {
          localStorage.removeItem("oraviaAdminToken");
          localStorage.removeItem("oraviaAdminUser");
        } else {
          localStorage.removeItem("oraviaToken");
        }

        if (isMounted) {
          setStatus("unauthenticated");
        }
      }
    };

    checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, [requiredRole]);

  if (status === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Checking authentication...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return requiredRole === "admin" ? (
      <Navigate to="/admin/login" replace />
    ) : (
      <Navigate to="/login" replace />
    );
  }

  if (status === "wrong-role") {
    return requiredRole === "admin" ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <Navigate to="/" replace />
    );
  }

  return children;
}

export default ProtectedRoute;