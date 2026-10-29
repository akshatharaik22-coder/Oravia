
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API_BASE_URL from "../config/api.js";

function ProtectedRoute({ children, requiredRole }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const checkAuthentication = async () => {
      const isAdmin = requiredRole === "admin";

      const tokenKey = isAdmin
        ? "oraviaAdminToken"
        : "oraviaToken";

      const userKey = isAdmin
        ? "oraviaAdminUser"
        : "oraviaUser";

      const token = localStorage.getItem(tokenKey);

      // Do not allow access without the appropriate token.
      if (!token) {
        if (isMounted) {
          setStatus("unauthenticated");
        }
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => ({}));

        // The token is invalid or has expired.
        if (response.status === 401) {
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(userKey);

          if (isMounted) {
            setStatus("unauthenticated");
          }
          return;
        }

        // A forbidden response must not grant access.
        if (response.status === 403) {
          if (isMounted) {
            setStatus("wrong-role");
          }
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to verify your session."
          );
        }

        // The backend must return the authenticated user.
        if (!data.user || typeof data.user.role !== "string") {
          throw new Error(
            "The server returned invalid authentication information."
          );
        }

        // Enforce the role required by this route.
        if (data.user.role !== requiredRole) {
          if (isMounted) {
            setStatus("wrong-role");
          }
          return;
        }

        // Update the stored user from the server response.
        // Do not store passwords or other authentication secrets.
        localStorage.setItem(userKey, JSON.stringify(data.user));

        if (isMounted) {
          setStatus("authenticated");
        }
      } catch (error) {
        // Ignore requests cancelled when this component unmounts.
        if (error.name === "AbortError") {
          return;
        }

        console.error("Route authentication error:", error);

        if (isMounted) {
          // Keep the session intact when verification fails
          // because of a network or server error.
          setStatus("verification-error");
        }
      }
    };

    checkAuthentication();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [requiredRole]);

  // Show a loading screen while authentication is verified.
  if (status === "checking") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
        role="status"
        aria-live="polite"
      >
        <p>Verifying your ORAVIA session...</p>
      </main>
    );
  }

  // Redirect users who do not have a valid session.
  if (status === "unauthenticated") {
    return requiredRole === "admin" ? (
      <Navigate to="/admin/login" replace />
    ) : (
      <Navigate to="/login" replace />
    );
  }

  // Redirect authenticated users to an appropriate area.
  if (status === "wrong-role") {
    return requiredRole === "admin" ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <Navigate to="/" replace />
    );
  }

  // Do not display protected content when the server
  // cannot verify the current session.
  if (status === "verification-error") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h2>Unable to verify your session</h2>

        <p>
          ORAVIA could not verify your login. Check your
          internet connection and confirm that the backend
          server is running.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>

        <button
          type="button"
          style={{ marginTop: "12px" }}
          onClick={() => {
            const isAdmin = requiredRole === "admin";

            localStorage.removeItem(
              isAdmin ? "oraviaAdminToken" : "oraviaToken"
            );

            localStorage.removeItem(
              isAdmin ? "oraviaAdminUser" : "oraviaUser"
            );

            window.location.replace(
              isAdmin ? "/admin/login" : "/login"
            );
          }}
        >
          Return to login
        </button>
      </main>
    );
  }

  // Only render protected content after successful verification.
  if (status === "authenticated") {
    return children;
  }

  return null;
}

export default ProtectedRoute;
