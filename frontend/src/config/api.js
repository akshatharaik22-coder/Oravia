const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (import.meta.env.PROD && !configuredBaseUrl) {
  throw new Error(
    "VITE_API_BASE_URL must be configured to the deployed ORAVIA API URL before building for production.",
  );
}

const API_BASE_URL = (
  configuredBaseUrl || "http://localhost:5000"
).replace(/\/+$/, "");

export default API_BASE_URL;
