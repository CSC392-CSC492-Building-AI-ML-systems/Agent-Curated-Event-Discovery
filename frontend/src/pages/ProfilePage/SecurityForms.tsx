import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase_client } from "../../lib/supabase/client";
import { userAccessToken } from "../../lib/supabase/session";
import DeleteAccountDialog from "./DeleteAccountDialog";

function PasswordField({ label, value, onChange, invalid = false, describedBy, disabled = false, autoComplete = "new-password" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  autoComplete?: "new-password" | "current-password";
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return <div className="security-field">
    <div className="security-password-input">
      <input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} aria-label={label} placeholder={label}
        disabled={disabled} value={value} onChange={event => onChange(event.target.value)}
        aria-invalid={invalid} aria-describedby={describedBy} required />
      <button type="button" className="security-visibility" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        aria-pressed={visible} aria-controls={id} onClick={() => setVisible(current => !current)}>
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}

export function EmailChangeForm({ currentEmail, userId }: { currentEmail: string; userId: string }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const id = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setNotice(null);
    if (!email.trim() || !field.current?.validity.valid) {
      setError("Enter a valid email address.");
      field.current?.focus();
    } else if (email.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setError("Enter a different email address.");
      field.current?.focus();
    } else {
      pending.current = true;
      setBusy(true);
      setError(null);
      try {
        await userAccessToken(userId);
        const { data, error: authError } = await supabase_client.auth.updateUser(
          { email: email.trim() }, { emailRedirectTo: `${window.location.origin}/profile/security` });
        if (authError) throw authError;
        setNotice(data.user?.email?.toLowerCase() === email.trim().toLowerCase()
          ? "Your email address has been changed." : "Confirmation emails have been sent to your current and new email addresses.");
        setEmail("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to update your email. Please retry.");
      } finally {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  return <section aria-labelledby={`${id}-heading`} className="security-section">
    <h2 id={`${id}-heading`}>Change Email</h2>
    <form noValidate onSubmit={submit}>
      <div className="security-field">
        <input ref={field} id={`${id}-email`} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          aria-label="New email address" placeholder="New email address"
          value={email} disabled={busy} required aria-invalid={!!error} aria-describedby={`${id}-feedback`}
          onChange={event => { setEmail(event.target.value); setError(null); setNotice(null); }} />
      </div>
      <button type="submit" disabled={busy} aria-busy={busy} className={`pill${email.trim() ? " active" : ""}`}>Update email</button>
      <div id={`${id}-feedback`} className="security-feedback">
        <p role="alert">{error}</p><p role="status">{busy ? "Updating email…" : notice}</p>
      </div>
    </form>
  </section>;
}

export function PasswordChangeForm({ mode, userId, onPasswordSet }: {
  mode: "set" | "change"; userId: string; onPasswordSet: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [needsCurrentPassword, setNeedsCurrentPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const id = useId();
  const action = mode === "set" ? "Set password" : "Update password";

  function clearFeedback() {
    setError(null);
    setNotice(null);
  }

  async function sendCode() {
    const { error: verificationError } = await supabase_client.auth.reauthenticate();
    if (verificationError) throw verificationError;
    setNeedsCode(true);
    setCode("");
    setNotice("Enter the confirmation code sent to your email or phone, then try again.");
  }

  async function resendCode() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    clearFeedback();
    try {
      await userAccessToken(userId);
      await sendCode();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send a confirmation code. Please retry.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setNotice(null);
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError("Use at least 8 characters, including an uppercase letter, a number, and a special character.");
    } else if (password !== confirmation) {
      setError("Your passwords don’t match.");
    } else if (needsCode && !code.trim()) {
      setError("Enter the confirmation code to continue.");
    } else if (needsCurrentPassword && !currentPassword) {
      setError("Enter your current password to continue.");
    } else {
      pending.current = true;
      setBusy(true);
      setError(null);
      try {
        await userAccessToken(userId);
        const { error: authError } = await supabase_client.auth.updateUser({ password, ...(needsCode ? { nonce: code.trim() } : {}), ...(needsCurrentPassword ? { current_password: currentPassword } : {}) });
        if (authError?.code === "reauthentication_needed" || authError?.code === "reauth_nonce_missing") {
          await sendCode();
          return;
        }
        if (authError && String(authError.code) === "current_password_required") {
          setNeedsCurrentPassword(true);
          setError("Enter your current password to continue.");
          return;
        }
        if (authError) throw authError;
        setCurrentPassword("");
        setNeedsCurrentPassword(false);
        setPassword("");
        setConfirmation("");
        setCode("");
        setNeedsCode(false);
        setNotice("Your password has been changed.");
        onPasswordSet();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to update your password. Please retry.");
      } finally {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  return <section aria-labelledby={`${id}-heading`} className="security-section">
    <h2 id={`${id}-heading`}>Change Password</h2>
    <form noValidate onSubmit={submit}>
      {needsCurrentPassword && <PasswordField label="Current password" autoComplete="current-password"
        value={currentPassword} disabled={busy} invalid={!!error} describedBy={`${id}-feedback`}
        onChange={value => { setCurrentPassword(value); clearFeedback(); }} />}
      <PasswordField label="New password" value={password} disabled={busy} invalid={!!error} describedBy={`${id}-feedback`}
        onChange={value => { setPassword(value); clearFeedback(); }} />
      <PasswordField label="Confirm new password" value={confirmation} disabled={busy} invalid={!!error} describedBy={`${id}-feedback`}
        onChange={value => { setConfirmation(value); clearFeedback(); }} />
      {needsCode && <div className="security-field">
        <input aria-label="Confirmation code" placeholder="Confirmation code" autoComplete="one-time-code"
          value={code} disabled={busy} aria-invalid={!!error} aria-describedby={`${id}-feedback`}
          onChange={event => { setCode(event.target.value); clearFeedback(); }} />
        <button type="button" className="pill" disabled={busy} onClick={() => { void resendCode(); }}>Resend code</button>
      </div>}
      <button type="submit" disabled={busy} aria-busy={busy} className={`pill${password && confirmation ? " active" : ""}`}>{action}</button>
      <div id={`${id}-feedback`} className="security-feedback">
        <p role="alert">{error}</p><p role="status">{busy ? "Updating password…" : notice}</p>
      </div>
    </form>
  </section>;
}

export function DeleteAccountAction() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return <div className="security-account-actions">
    <button ref={trigger} type="button" className="pill security-delete-button" aria-haspopup="dialog"
      onClick={() => setOpen(true)}>Delete my account</button>
    <div className="security-feedback" />
    {open && <DeleteAccountDialog onClose={close} />}
  </div>;
}
