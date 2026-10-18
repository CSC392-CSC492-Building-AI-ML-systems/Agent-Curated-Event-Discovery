import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import EventideLogo from "../components/EventideLogo";
import OnboardingOptions from "../components/OnboardingOptions";
import { useAuth } from "../contexts/AuthContext";
import { usePreferences } from "../contexts/PreferencesContext";
import { createClient } from "../lib/supabase/client";
import { savePreferences } from "../api/preferences";
import type { AgeGroup, Budget, Preferences } from "../api/preferences";
import { ApiError } from "../api/client";
import useTags from "../hooks/useTags";
import { AGE_GROUPS, BUDGETS } from "../data/onboardingOptions";
import "./SignupPage/SignupPage.css";
import "./OnboardingPage.css";

const STEPS = ["age", "budget", "interests"] as const;
const MINIMUM_CURATION_MS = 3000;

function waitForCuration(milliseconds: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cancel = () => {
      window.clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", cancel, { once: true });
  });
}
type Step = "welcome" | typeof STEPS[number] | "saving" | "complete";
const TITLES: Record<Step, string> = {
  welcome: "Let’s get started on finding events that match you.",
  age: "What is your age group?",
  budget: "How much do you usually spend per event?",
  interests: "What are you interested in?",
  saving: "Curating events for you",
  complete: "Curation complete!",
};

function OnboardingShell({ children }: { children: ReactNode }) {
  return <div className="signup-page onboarding-page">
    <header className="signup-nav"><EventideLogo /></header>
    <main className="onboarding-main" aria-label="User onboarding">{children}</main>
  </div>;
}

export default function OnboardingPage() {
  const auth = useAuth();
  const profile = usePreferences();
  const catalogue = useTags(!!auth.session);
  if (auth.loading || (auth.session && profile.loading && !profile.preferences)) {
    return <OnboardingShell><section className="onboarding-panel onboarding-notice" role="status">Loading your preferences…</section></OnboardingShell>;
  }
  if (!auth.session) return <OnboardingShell><section className="onboarding-panel onboarding-notice">
    <h1>Sign in to personalise your events.</h1>
    {auth.error && <div role="alert"><p>{auth.error}</p><button className="pill" onClick={auth.retry}>Retry</button></div>}
    <Link className="pill onboarding-continue active" to="/login" state={{ returnTo: "/onboarding" }}>Log in</Link>
    <Link to="/signup">Create an account</Link>
  </section></OnboardingShell>;
  if (!profile.preferences) return <OnboardingShell><section className="onboarding-panel onboarding-notice" role="alert">
    <h1>Unable to load your preferences.</h1><p>{profile.error}</p>
    <button className="pill" onClick={profile.retry}>Retry</button>
  </section></OnboardingShell>;
  return <OnboardingShell><OnboardingForm key={auth.session.user.id}
    userId={auth.session.user.id} initial={profile.preferences} catalogue={catalogue} onSaved={profile.onSaved} />
  </OnboardingShell>;
}

function OnboardingForm({ userId, initial, catalogue, onSaved }: {
  userId: string;
  initial: Preferences;
  catalogue: ReturnType<typeof useTags>;
  onSaved: (preferences: Preferences, userId: string) => void;
}) {
  const [step, setStep] = useState<Step>(initial.onboarding_completed ? "age" : "welcome");
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(initial.age_group);
  const [budget, setBudget] = useState<Budget | null>(initial.budget);
  const [interests, setInterests] = useState<number[]>(initial.interest_tag_ids);
  const [furthestStep, setFurthestStep] = useState(initial.onboarding_completed ? 2 : 0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const saveRequest = useRef<AbortController | null>(null);
  const stepIndex = STEPS.findIndex(value => value === step);
  const revisiting = stepIndex >= 0 && stepIndex < furthestStep;
  const availableInterests = interests.filter(id => catalogue.tags.some(tag => tag.id === id));
  const hasAnswer = step === "age" ? !!ageGroup : step === "budget" ? !!budget : availableInterests.length > 0;
  const canContinue = (hasAnswer || (revisiting && step !== "interests")) &&
    (step !== "interests" || (!catalogue.loading && !catalogue.error));

  useEffect(() => {
    if (step !== "welcome") heading.current?.focus();
    let timer: number | undefined;
    if (step === "welcome") timer = window.setTimeout(() => setStep("age"), 3200);
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [step]);
  useEffect(() => () => saveRequest.current?.abort(), []);

  async function submit() {
    if (saveRequest.current || !canContinue) return;
    const controller = new AbortController();
    const startedAt = performance.now();
    saveRequest.current = controller;
    setSaveError(null);
    setSessionExpired(false);
    setStep("saving");
    try {
      const { data, error } = await createClient().auth.getSession();
      if (controller.signal.aborted) return;
      if (error || data.session?.user.id !== userId) throw new ApiError(401, "Please log in again before saving your preferences.");
      const preferences = await savePreferences({ age_group: ageGroup, budget, interest_tag_ids: availableInterests }, data.session.access_token, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!preferences.onboarding_completed) throw new Error("Your preferences were not confirmed. Please retry.");
      onSaved(preferences, userId);
      await waitForCuration(MINIMUM_CURATION_MS - (performance.now() - startedAt), controller.signal);
      if (controller.signal.aborted) return;
      setStep("complete");
    } catch (error) {
      if (!controller.signal.aborted) {
        setSessionExpired(error instanceof ApiError && error.status === 401);
        setSaveError(error instanceof Error ? error.message : "Unable to save preferences. Please retry.");
        setStep("interests");
      }
    } finally { if (saveRequest.current === controller) saveRequest.current = null; }
  }

  function next() {
    if (!canContinue) return;
    if (step === "interests") { void submit(); return; }
    const nextIndex = stepIndex + 1;
    setFurthestStep(current => Math.max(current, nextIndex));
    setStep(STEPS[nextIndex]);
  }

  function skip() {
    if (step === "age") setAgeGroup(null);
    if (step === "budget") setBudget(null);
    const nextIndex = stepIndex + 1;
    setFurthestStep(current => Math.max(current, nextIndex));
    setStep(STEPS[nextIndex]);
  }

  function back() {
    setStep(STEPS[stepIndex - 1] ?? "welcome");
  }

  function toggleInterest(value: string) {
    const id = Number(value);
    setInterests(current => current.includes(id)
      ? current.filter(interest => interest !== id)
      : [...current, id]);
  }

  return (
        <section className="onboarding-panel" aria-labelledby={`onboarding-${step}`}>
          {step === "welcome" ? (
            <div className="onboarding-welcome">
              <h1 id="onboarding-welcome">{TITLES.welcome}</h1>
            </div>
          ) : step === "saving" || step === "complete" ? (
            <div key={step} className={`onboarding-finish onboarding-finish-${step}`} role="status">
              <h1 id={`onboarding-${step}`} ref={heading} tabIndex={-1}>
                {TITLES[step]}
                {step === "saving" && <span className="onboarding-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>}
              </h1>
              {step === "complete" && <>
                <p>Your events are waiting for you in Discover.</p>
                <Link className="pill onboarding-continue active" to="/" replace>Explore</Link>
              </>}
            </div>
          ) : (
            <div className="onboarding-step">
              <div className="onboarding-progress" role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={stepIndex + 1} aria-valuetext={`Step ${stepIndex + 1} of ${STEPS.length}`}>
                <span style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
              </div>
              <div className="onboarding-step-content" key={step}>
                <div className="onboarding-question">
                  <h1 id={`onboarding-${step}`} ref={heading} tabIndex={-1}>{TITLES[step]}</h1>
                  {step === "interests" && <p id="onboarding-interests-help">Select one or more.</p>}
                </div>
                {step === "age" && <OnboardingOptions name="ageGroup" label="Choose one age group" options={AGE_GROUPS} selected={ageGroup ? [ageGroup] : []} onChange={value => setAgeGroup(value as AgeGroup)} />}
                {step === "budget" && <OnboardingOptions name="budget" label="Choose your usual event budget" layout="budget" options={BUDGETS} selected={budget ? [budget] : []} onChange={value => setBudget(value as Budget)} />}
                {step === "interests" && <>
                  {catalogue.loading ? <p className="onboarding-feedback" role="status">Loading interests…</p>
                    : catalogue.error ? <div className="onboarding-feedback" role="alert"><p>{catalogue.error}</p><button className="pill" onClick={catalogue.retry}>Retry interests</button></div>
                    : !catalogue.tags.length ? <div className="onboarding-feedback" role="status"><p>No interests are available yet. Please try again later.</p><button className="pill" onClick={catalogue.retry}>Reload interests</button></div>
                    : <OnboardingOptions name="interests" label="Choose at least one interest" layout="interests" options={catalogue.tags.map(tag => ({ value: String(tag.id), label: tag.name }))} selected={interests.map(String)} multiple onChange={toggleInterest} />}
                  {saveError && <div className="onboarding-feedback" role="alert"><p>{saveError}</p>{sessionExpired && <Link to="/login" state={{ returnTo: "/onboarding" }}>Log in again</Link>}</div>}
                </>}
              </div>
              <footer className="onboarding-footer">
                <button type="button" className="onboarding-back" onClick={back}>← Back</button>
                <div className="onboarding-actions">
                  {step !== "interests" && !revisiting && <button type="button" className="onboarding-skip" onClick={skip}>Skip</button>}
                    <button type="button" className={`pill onboarding-continue ${hasAnswer ? "active" : ""}`} disabled={!canContinue} onClick={next}>{saveError && step === "interests" ? "Retry saving" : revisiting ? "Next" : "Continue"}</button>
                </div>
              </footer>
            </div>
          )}
        </section>
  );
}
