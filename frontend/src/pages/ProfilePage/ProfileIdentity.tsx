import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Check, Pencil, UserRound } from "lucide-react";
import { ApiError } from "../../api/client";
import useProfile from "../../hooks/useProfile";
import "./ProfileIdentity.css";

type Identity = { firstName: string; lastName: string; username: string };

function ProfileAvatar({ editing = false }: { editing?: boolean }) {
  return <div className={`profile-avatar${editing ? " profile-avatar-editing" : ""}`} aria-hidden="true">
    <UserRound size={80} strokeWidth={1.4} />
    {editing && <span className="profile-avatar-pencil"><Pencil size={20} /></span>}
  </div>;
}

export default function ProfileIdentity({ user }: { user: User }) {
  const account = useProfile(user.id);
  const identity = { firstName: account.profile?.first_name ?? "", lastName: account.profile?.last_name ?? "", username: account.profile?.username ?? "" };
  const [draft, setDraft] = useState<Identity>({ firstName: "", lastName: "", username: "" });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const firstName = useRef<HTMLInputElement>(null);
  const usernameField = useRef<HTMLInputElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const fieldId = useId();
  const name = [identity.firstName, identity.lastName].filter(Boolean).join(" ");

  useEffect(() => {
    if (editing) firstName.current?.focus();
  }, [editing]);

  function startEditing() {
    setDraft({ ...identity });
    setError(null);
    setSaveError(null);
    setEditing(true);
  }

  function cancelEditing() {
    if (account.saving) return;
    setEditing(false);
    setError(null);
    requestAnimationFrame(() => editButton.current?.focus());
  }

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (account.saving) return;
    setSaveError(null);
    const rawUsername = draft.username.trim();
    if (rawUsername && !/^[a-zA-Z0-9_]{3,30}$/.test(rawUsername)) {
      usernameField.current?.focus();
      setError("Usernames must contain 3 to 30 characters.");
      return;
    }
    try {
      const result = await account.save({ first_name: draft.firstName.trim() || null, last_name: draft.lastName.trim() || null, username: rawUsername.toLowerCase() || null });
      if (!result) return;
      setEditing(false);
      setError(null);
      requestAnimationFrame(() => editButton.current?.focus());
    } catch (failure) {
      if (failure instanceof Error && failure.name === "AbortError") return;
      if (failure instanceof ApiError && failure.status === 409) {
        setError("This username is already taken.");
      } else {
        setSaveError("Unable to save profile. Please retry.");
      }
    }
  }

  if (account.loading || account.error) return <section className="profile-identity" aria-label="Profile details">
    <ProfileAvatar />
    <div className="profile-identity-details">
      {account.loading ? <p role="status">Loading profile…</p> : <div role="alert">
        <p>{account.error}</p><button type="button" className="pill" onClick={account.retry}>Retry profile</button>
      </div>}
    </div>
  </section>;

  if (editing) return <form className="profile-identity profile-identity-form" onSubmit={apply}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); cancelEditing(); } }}>
    <h1 className="profile-sr-only">Edit profile</h1>
    <ProfileAvatar editing />
    <fieldset className="profile-identity-fields" disabled={account.saving}>
      <div className="profile-name-fields">
        <label htmlFor={`${fieldId}-first`}>First name
          <input id={`${fieldId}-first`} ref={firstName} name="given-name" autoComplete="given-name" maxLength={100}
            value={draft.firstName} onChange={event => setDraft({ ...draft, firstName: event.target.value })} />
        </label>
        <label htmlFor={`${fieldId}-last`}>Last name
          <input id={`${fieldId}-last`} name="family-name" autoComplete="family-name" maxLength={100}
            value={draft.lastName} onChange={event => setDraft({ ...draft, lastName: event.target.value })} />
        </label>
      </div>
      <label htmlFor={`${fieldId}-username`}>Username
        <input id={`${fieldId}-username`} ref={usernameField} name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
          value={draft.username} aria-invalid={!!error} aria-describedby={error ? `${fieldId}-error` : undefined}
          onFocus={() => setError(null)} onPointerDown={() => setError(null)}
          onChange={event => { setDraft({ ...draft, username: event.target.value }); setError(null); }} />
      </label>
      <div className="profile-identity-feedback">
        <p id={`${fieldId}-error`} role="alert">{error}</p>
        {saveError && <p role="alert">{saveError}</p>}
        {account.saving && <p role="status">Saving…</p>}
      </div>
    </fieldset>
    <button type="submit" disabled={account.saving} className="profile-edit-button" aria-label="Apply profile changes" title="Apply profile changes">
      <Check size={24} aria-hidden="true" />
    </button>
  </form>;

  return <section className="profile-identity" aria-labelledby="profile-title">
    <ProfileAvatar />
    <div className="profile-identity-details">
      <h1 id="profile-title">{name || "Your Profile"}</h1>
      <p className={`profile-username${identity.username ? "" : " profile-empty-value"}`}>
        {identity.username ? `@${identity.username}` : "Add a username"}
      </p>
      <p className="profile-email">{user.email}</p>
    </div>
    <button type="button" className="profile-edit-button" ref={editButton} onClick={startEditing}
      aria-label="Edit profile" title="Edit profile"><Pencil size={23} aria-hidden="true" /></button>
  </section>;
}
