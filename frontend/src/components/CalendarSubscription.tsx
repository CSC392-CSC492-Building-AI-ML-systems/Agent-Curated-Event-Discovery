import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import useCalendarSubscription from "../hooks/useCalendarSubscription";
import "./CalendarSubscription.css";

function SubscriptionDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const linkId = useId();
  const subscription = useCalendarSubscription(userId);
  const { state, busy, privateUrl, enabled, retry } = subscription;
  const [confirmation, setConfirmation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const error = copyError ?? subscription.error;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);

  useEffect(() => {
    if (confirmation) confirmationHeading.current?.focus();
  }, [confirmation]);

  function showConfirmation(next: boolean) {
    setConfirmation(next);
    setCopyError(null);
    subscription.clearError();
  }

  async function changeSubscription(action: "create" | "disable") {
    setCopyError(null);
    setCopied(false);
    if (await subscription.change(action)) setConfirmation(false);
  }

  async function copyLink() {
    if (!privateUrl) return;
    try {
      await navigator.clipboard.writeText(privateUrl);
      setCopied(true);
      setCopyError(null);
      subscription.clearError();
    } catch {
      setCopyError("Unable to copy automatically. Select the link above and copy it manually.");
    }
  }

  return (
    <dialog
      ref={dialog}
      className="discover-dialog calendar-subscription-dialog"
      aria-labelledby={titleId}
      onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}
      onClick={event => { if (!busy && event.target === event.currentTarget) onClose(); }}
    >
      <button type="button" className="discover-dialog-close" aria-label="Close calendar subscription" disabled={busy} onClick={onClose}>×</button>
      <h2 id={titleId}>Subscribe to your calendar</h2>
      <p>See your Eventide calendar in Google Calendar, Apple Calendar, or Outlook. Updates appear when your calendar app refreshes.</p>
      {state.status === "loading" ? <p role="status">Loading subscription…</p>
        : state.status === "error" ? <div role="alert"><p>{state.message}</p><button className="pill" onClick={retry}>Retry subscription</button></div>
        : <>
          {privateUrl && <>
            <label htmlFor={linkId}>Private subscription link</label>
            <input id={linkId} name="calendar-subscription-link" type="text" value={privateUrl} readOnly
              autoComplete="off" spellCheck={false} onFocus={event => event.currentTarget.select()} />
            <button className="pill" onClick={() => { void copyLink(); }}>{copied ? "Copied!" : "Copy link"}</button>
            <p>Copy this link now. It is shown once when the subscription is enabled.</p>
          </>}
          {enabled && !privateUrl && <p>Your existing link is still active. To generate a new link, disable the subscription and enable it again. Existing subscribers must subscribe again using the new link.</p>}
          <p>Anyone with the private link can read your calendar events. Disabling it stops future access but does not erase copies already fetched.</p>
          {confirmation ? <section className="subscription-confirmation" aria-labelledby={`${titleId}-confirm`}>
            <h3 id={`${titleId}-confirm`} ref={confirmationHeading} tabIndex={-1}>
              Disable the subscription?
            </h3>
            <p>Calendar apps using this link will no longer receive updates.</p>
            <div className="subscription-actions">
              <button className="pill" disabled={busy} onClick={() => { void changeSubscription("disable"); }}>
                {busy ? "Updating…" : "Confirm disable"}
              </button>
              <button className="pill" disabled={busy} onClick={() => showConfirmation(false)}>Cancel</button>
            </div>
          </section> : <div className="subscription-actions">
            {enabled ?
              <button className="pill" onClick={() => showConfirmation(true)}>Disable subscription</button>
              : <button className="pill" disabled={busy} onClick={() => { void changeSubscription("create"); }}>{busy ? "Creating…" : "Enable subscription"}</button>}
          </div>}
          {error && <p role="alert">{error}</p>}
        </>}
    </dialog>
  );
}

export default function CalendarSubscription() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function openSubscription() {
    if (!session) {
      void navigate("/login", { state: { returnTo: "/calendar" } });
    } else {
      setOpen(true);
    }
  }

  return <>
    <button type="button" className="pill" onClick={openSubscription}>Subscribe to calendar</button>
    {open && session && <SubscriptionDialog key={session.user.id} userId={session.user.id} onClose={() => setOpen(false)} />}
  </>;
}
