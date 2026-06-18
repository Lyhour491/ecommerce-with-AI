import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { unwrapUser } from "../utils/store";

const getLoginRedirect = (user) => String(user?.role || "").toLowerCase() === "admin" ? "/admin" : "/";

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
        
        let user = res.data.user ? unwrapUser(res.data) : null;

        // Fetch user profile immediately
        try {
          const userRes = await api.get("/user");
          user = unwrapUser(userRes.data);
          localStorage.setItem("user", JSON.stringify(user));
        } catch (userErr) {
          console.error("Failed to fetch user profile after social login", userErr);
          // Fallback to whatever user info was returned in first response
          if (user) localStorage.setItem("user", JSON.stringify(user));
        }

        setStatus("success");
        setTimeout(() => {
          navigate(getLoginRedirect(user), { replace: true });
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
              <div className="spinner-container">
                <div className="spinner-glow" />
                <div className="spinner-inner" />
                <div className="spinner-logo" style={{ fontSize: "28px" }}>🔑</div>
              </div>
              <h3>Initializing connection...</h3>
              <p>Preparing secure handshake protocols.</p>
            </div>
          )}

          {status === "authenticating" && (
            <div className="status-anim authenticating">
              <div className="spinner-container">
                <div className="spinner-glow" />
                <div className="spinner-inner" />
                <div className="spinner-logo">
                  {provider === "google" ? (
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  )}
                </div>
              </div>
              <h3>Verifying account</h3>
              <p>Connecting with {provider === "google" ? "Google" : "Facebook"} to sync your profile securely..</p>
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
