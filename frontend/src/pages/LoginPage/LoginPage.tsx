import { type SyntheticEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClient } from "../../lib/supabase/client";
import "../SignupPage/SignupPage.css";
import GoogleLoginButton from "../../components/GoogleLoginButton";

type LoginPageProps = {
  onLogin?: (details: {
    email: string;
    password: string;
  }) => void | Promise<void>;
  onLoginClick?: () => void;
};

export default function LoginPage({}: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setIsSubmitting(true);
      const { data, error: loginError } =
        await createClient().auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (data.user) {
        setSuccess("You have been logged in successfully!");
        navigate("/");
      }

      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Error logging you in:", error);
      setError("We couldn't log you in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="signup-page">
      <header className="signup-nav">
        <Link className="discover-logo" to="/">
          even<i>tide</i>
          <svg
            viewBox="0 0 100 12"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M2 9 L14 3 L26 9 L38 3 L50 9 L62 3 L74 9 L86 3 L98 9" />
          </svg>
        </Link>
      </header>
      <section className="signup-content" aria-labelledby="signup-title">
        <div className="signup-card">
          <div className="signup-card-heading">
            <h1 id="signup-title">Find your kind of event.</h1>
            <p className="signup-subtitle">
              Log in to see events curated for you, save your favorites, and
              follow topics you care about.
            </p>
          </div>
          <div>
            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="signup-field">
                <label htmlFor="signup-email">Email address</label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="signup-field">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="signup-error" role="alert">
                  {error}
                </p>
              )}

              {success && (
                <p className="signup-success" role="status">
                  {success}
                </p>
              )}

              <button
                className="signup-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging in…" : "Log in"}
              </button>
            </form>
            <GoogleLoginButton />
          </div>

          <p className="signup-login-prompt">
            Don't have an account?{" "}
            <button
              type="button"
              className="signup-text-button"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
