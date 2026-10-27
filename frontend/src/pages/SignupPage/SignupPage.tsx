import { type SyntheticEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase_client } from "../../lib/supabase/client";
import GoogleLoginButton from "../../components/GoogleLoginButton";
import "./SignupPage.css";

type SignupPageProps = {
  onSignup?: (details: {
    email: string;
    password: string;
  }) => void | Promise<void>;
  onLoginClick?: () => void;
};

export default function SignupPage({}: SignupPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Your passwords don't match. Please try again.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Your password must contain at least one uppercase letter.");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Your password must contain at least one number.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Your password must contain at least one special character.");
      return;
    }

    try {
      setIsSubmitting(true);
      const { data, error: signupError } = await supabase_client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: "http://localhost:5173/",
        },
      });
      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.user && !data.session) {
        setSuccess(
          "Account created! Check your email for a confirmation link before logging in (this might end up in your spam folder). If you already have an account, please log in instead.",
        );
      } else {
        setSuccess("Your account has been created successfully!");
      }
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error creating account:", error);
      setError("We couldn't create your account. Please try again.");
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
              Create an account to see events curated for you, save your
              favourites, and follow topics you care about.
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
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="signup-field">
                <label htmlFor="signup-password">Password</label>
                <div className="signup-password-wrapper">
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters, at least one uppercase letter, number, and special character"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="signup-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="signup-field">
                <label htmlFor="signup-confirm-password">
                  Confirm password
                </label>
                <div className="signup-password-wrapper">
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter your password again"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="signup-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
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
                {isSubmitting ? "Creating account…" : "Create account"}
              </button>
            </form>
            <GoogleLoginButton />
          </div>
          <p className="signup-login-prompt">
            Already have an account?{" "}
            <button
              type="button"
              className="signup-text-button"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
