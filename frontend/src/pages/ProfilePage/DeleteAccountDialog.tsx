import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteAccount } from "../../api/account";
import { ApiError } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { userAccessToken } from "../../lib/supabase/session";

export default function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const pending = useRef<AbortController | null>(null);
  const descriptionId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    cancel.current?.focus();
    return () => { pending.current?.abort(); element?.close(); };
  }, []);

  async function confirm() {
    if (pending.current || !session) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError(null);
    setNeedsLogin(false);
    let accountRemoved = deleted;
    try {
      if (!accountRemoved) {
        const token = await userAccessToken(session.user.id);
        if (controller.signal.aborted) return;
        await deleteAccount(token, { signal: controller.signal });
        if (controller.signal.aborted) return;
        accountRemoved = true;
        setDeleted(true);
      }
      // Auth deletion has already revoked server sessions. Clear this browser's
      // local session too; if that fails, retry only sign-out, never deletion.
      await signOut("local");
      void navigate("/", { replace: true });
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (accountRemoved) {
        setError("Your account was deleted, but we couldn’t sign this browser out. Please retry.");
      } else {
        setError(failure instanceof Error ? failure.message : "Unable to delete your account. Please retry.");
        setNeedsLogin(failure instanceof ApiError && [401, 403].includes(failure.status));
      }
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <dialog ref={dialog} className="discover-dialog security-delete-dialog" aria-labelledby={`${descriptionId}-title`}
    aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); if (!busy && !deleted) onClose(); }}>
    <h2 id={`${descriptionId}-title`}>Delete account</h2>
    <p id={descriptionId}>Deleting your account will permanently remove your profile, preferences, availability, saved events, calendar entries, and calendar subscription. This cannot be undone.</p>
    <div className="security-delete-dialog-actions">
      <button type="button" className="pill security-delete-button" disabled={busy} aria-busy={busy}
        onClick={() => { void confirm(); }}>{deleted ? "Finish signing out" : "Delete account"}</button>
      <button ref={cancel} type="button" className="pill" disabled={busy || deleted} onClick={onClose}>Cancel</button>
    </div>
    <div className="security-feedback">
      <p role="alert">{error}</p>
      {busy && <p role="status">{deleted ? "Signing out…" : "Deleting your account…"}</p>}
      {needsLogin && <Link to="/login" state={{ returnTo: "/profile/security" }}>Log in again</Link>}
    </div>
  </dialog>;
}
