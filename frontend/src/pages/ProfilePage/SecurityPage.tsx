import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase_client } from "../../lib/supabase/client";
import { getAccountSecurity } from "../../api/account";
import { userAccessToken } from "../../lib/supabase/session";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { DeleteAccountAction, EmailChangeForm, PasswordChangeForm } from "./SecurityForms";
import "./SecurityPage.css";

function SecuritySettings({ session }: { session: Session }) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const userId = session.user.id;
  useEffect(() => {
    const controller = new AbortController();
    void userAccessToken(userId).then(token => getAccountSecurity(token, { signal: controller.signal }))
      .then(result => { if (!controller.signal.aborted) { setHasPassword(result.has_password); setSecurityError(null); } })
      .catch(() => { if (!controller.signal.aborted) setSecurityError("Unable to load password settings."); });
    return () => controller.abort();
  }, [userId, attempt]);
  const providers = new Set(session.user.identities?.map(identity => identity.provider));
  const metadataProviders: unknown = session.user.app_metadata.providers;
  if (Array.isArray(metadataProviders)) {
    for (const provider of metadataProviders) if (typeof provider === "string") providers.add(provider);
  }
  const googleLinked = providers.has("google");
  return <div key={session.user.id}>
    <EmailChangeForm userId={session.user.id} currentEmail={session.user.email ?? ""} />
    {hasPassword === null ? <div className="security-feedback">
      {securityError ? <><p role="alert">{securityError}</p><button type="button" className="pill" onClick={() => setAttempt(value => value + 1)}>Retry security</button></> : <p role="status">Loading password settings…</p>}
    </div> : <PasswordChangeForm userId={session.user.id} mode={hasPassword ? "change" : "set"} onPasswordSet={() => setHasPassword(true)} />}
    {googleLinked && <section className="security-linked-account" aria-label="Google account">
      <p>Your account is linked with Google.</p>
    </section>}
    <DeleteAccountAction />
  </div>;
}

function EmailConfirmationFeedback() {
  const [error, setError] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.hash.slice(1));
    if (![url.searchParams, params].some(values => values.has("code") || values.has("error") || values.has("error_code") || values.has("error_description"))) return;
    let active = true;
    // The browser client owns the PKCE exchange. Do not consume the code twice.
    void supabase_client.auth.initialize().then(result => {
      // Without the original browser verifier, the SDK may skip the exchange
      // without returning an error. Successful exchanges remove the code.
      if (active) setError(!!result.error || new URL(window.location.href).searchParams.has("code"));
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  return error ? <p role="alert" className="security-hint">Unable to confirm your email. Request a new confirmation link and open it in the browser where you requested the change.</p> : null;
}

export default function SecurityPage() {
  const { session, loading, error, retry } = useAuth();
  let content;
  if (loading) {
    content = <p role="status">Checking login…</p>;
  } else if (error) {
    content = <div role="alert"><p>{error}</p><button type="button" className="pill" onClick={retry}>Retry login</button></div>;
  } else if (!session) {
    content = <p>Log in to view your account settings. <Link to="/login" state={{ returnTo: "/profile/security" }}>Log in</Link></p>;
  } else {
    content = <SecuritySettings key={session.user.id} session={session} />;
  }
  return <main className="profile-content profile-settings-content security-content">
    <h1>Security</h1>
    <EmailConfirmationFeedback />
    {content}
  </main>;
}
