import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EventideLogo from "../components/EventideLogo";
import OnboardingOptions from "../components/OnboardingOptions";
import "./SignupPage/SignupPage.css";
import "./OnboardingPage.css";

const AGE_GROUPS = ["20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80+"];
const BUDGETS = ["I prefer free events", "Under $25", "$25–50", "$50–100", "$100–200", "Over $200"];
// Placeholder categories until the team agrees on the onboarding tag catalogue.
const INTERESTS = ["AI", "Art", "Literature", "Comedy", "Culture", "Film", "Fitness", "Food", "Games", "Music", "Outdoors", "Social", "Sports", "Student", "Technology", "Wellness"];
const STEPS = ["age", "budget", "interests"] as const;
type Step = "welcome" | typeof STEPS[number] | "curating" | "complete";
const TITLES: Record<Step, string> = {
  welcome: "Let’s get started on finding events that match you.",
  age: "What is your age group?",
  budget: "How much do you usually spend per event?",
  interests: "What are you interested in?",
  curating: "Curating events just for you",
  complete: "Curation complete!",
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [ageGroup, setAgeGroup] = useState("");
  const [budget, setBudget] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [furthestStep, setFurthestStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const stepIndex = STEPS.findIndex(value => value === step);
  const revisiting = stepIndex >= 0 && stepIndex < furthestStep;
  const hasAnswer = step === "age" ? !!ageGroup : step === "budget" ? !!budget : interests.length > 0;
  const canContinue = hasAnswer || (revisiting && step !== "interests");

  useEffect(() => {
    if (step !== "welcome") heading.current?.focus();
    let timer: number | undefined;
    if (step === "welcome") timer = window.setTimeout(() => setStep("age"), 3200);
    // Visual placeholder until recommendations can be requested from the backend.
    if (step === "curating") timer = window.setTimeout(() => setStep("complete"), 5000);
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [step]);

  function next() {
    const nextIndex = stepIndex + 1;
    setFurthestStep(current => Math.max(current, nextIndex));
    setStep(STEPS[nextIndex] ?? "curating");
  }

  function skip() {
    if (step === "age") setAgeGroup("");
    if (step === "budget") setBudget("");
    next();
  }

  function back() {
    setStep(STEPS[stepIndex - 1] ?? "welcome");
  }

  function toggleInterest(value: string) {
    setInterests(current => current.includes(value)
      ? current.filter(interest => interest !== value)
      : [...current, value]);
  }

  return (
    <div className="signup-page onboarding-page">
      <header className="signup-nav">
        <EventideLogo />
      </header>
      <main className="onboarding-main" aria-label="User onboarding">
        <section className="onboarding-panel" aria-labelledby={`onboarding-${step}`}>
          {step === "welcome" ? (
            <div className="onboarding-welcome">
              <h1 id="onboarding-welcome">{TITLES.welcome}</h1>
            </div>
          ) : step === "curating" || step === "complete" ? (
            <div key={step} className={`onboarding-finish onboarding-finish-${step}`} role="status">
              <h1 id={`onboarding-${step}`} ref={heading} tabIndex={-1}>
                {TITLES[step]}
                {step === "curating" && <span className="onboarding-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>}
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
                {step === "age" && <OnboardingOptions name="ageGroup" label="Choose one age group" options={AGE_GROUPS} selected={ageGroup ? [ageGroup] : []} onChange={setAgeGroup} />}
                {step === "budget" && <OnboardingOptions name="budget" label="Choose your usual event budget" layout="budget" options={BUDGETS} selected={budget ? [budget] : []} onChange={setBudget} />}
                {step === "interests" && <OnboardingOptions name="interests" label="Choose at least one interest" layout="interests" options={INTERESTS} selected={interests} multiple onChange={toggleInterest} />}
              </div>
              <footer className="onboarding-footer">
                <button type="button" className="onboarding-back" onClick={back}>← Back</button>
                <div className="onboarding-actions">
                  {step !== "interests" && !revisiting && <button type="button" className="onboarding-skip" onClick={skip}>Skip</button>}
                    <button type="button" className={`pill onboarding-continue ${hasAnswer ? "active" : ""}`} disabled={!canContinue} onClick={next}>{revisiting ? "Next" : "Continue"}</button>
                </div>
              </footer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
