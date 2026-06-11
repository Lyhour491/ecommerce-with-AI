import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { unwrapUser } from "../utils/store";

function SocialCallback() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("initializing"); // initializing, authenticating, success, error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code || !provider) {
      setStatus("error");
      setErrorMessage("Authentication parameters are missing. Please try logging in again.");
      return;
    }

    const authenticateUser = async () => {
      setStatus("authenticating");
      try {
        // Exchange code with backend API
        const res = await api.post(`/auth/${provider}/callback`, { code });
        const token = res.data.token || res.data.access_token;
        
        if (!token) {
          throw new Error("No authentication token was returned from the server.");
        }

        // Store credentials
        localStorage.setItem("token", token);
        
        // Fetch user profile immediately
        try {
          const userRes = await api.get("/user");
          const user = unwrapUser(userRes.data);
          localStorage.setItem("user", JSON.stringify(user));
        } catch (userErr) {
          console.error("Failed to fetch user profile after social login", userErr);
          // Fallback to whatever user info was returned in first response
          if (res.data.user) {
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        }

        setStatus("success");
        setTimeout(() => {
          navigate("/products");
        }, 1200);
      } catch (err) {
        console.error("OAuth callback error", err);
        setStatus("error");
        setErrorMessage(
          err.response?.data?.message || 
          err.response?.data?.error || 
          "Failed to verify credentials with our server. Please try again."
        );
      }
    };

    authenticateUser();
  }, [provider, searchParams, navigate]);

  return (
    <main className="auth-page social-callback-page">
      <section className="auth-card callback-card">
        <div className="callback-content">
          {status === "initializing" && (
            <div className="status-anim initializing">
              <div className="pulse-ring" />
              <h3>Initializing connection...</h3>
              <p>Preparing secure handshake protocols.</p>
            </div>
          )}

          {status === "authenticating" && (
            <div className="status-anim authenticating">
              <div className="spinner-glow" />
              <h3>Verifying account</h3>
              <p>Connecting with {provider === "google" ? "Google" : "Facebook"} to sync your profile securely...</p>
            </div>
          )}

          {status === "success" && (
            <div className="status-anim success">
              <div className="success-badge">✓</div>
              <h3>Security check passed!</h3>
              <p>Welcome back! Redirecting you to the catalog...</p>
            </div>
          )}

          {status === "error" && (
            <div className="status-anim error">
              <div className="error-badge">✖</div>
              <h3>Authentication Failed</h3>
              <p className="error-desc">{errorMessage}</p>
              <button 
                className="auth-submit btn-back-to-login" 
                onClick={() => navigate("/login")}
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default SocialCallback;
