import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EventideLogo from "../components/EventideLogo";
import "./SignupPage/SignupPage.css";
import "./OnboardingPage.css";

const AGE_GROUPS = ["20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80+"];

export default function OnboardingPage() {
  const [step, setStep] = useState<"welcome" | "age">("welcome");
  const [ageGroup, setAgeGroup] = useState("");
  const ageHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === "age") {
      ageHeading.current?.focus();
      return;
    }
    const timer = window.setTimeout(() => setStep("age"), 3200);
    return () => window.clearTimeout(timer);
  }, [step]);

  return (
    <div className="signup-page onboarding-page">
      <header className="signup-nav">
        <EventideLogo />
      </header>
      <main className="onboarding-main" aria-label="User onboarding">
        <section className="onboarding-panel" aria-labelledby={step === "welcome" ? "onboarding-welcome" : "onboarding-age"}>
          {step === "welcome" ? (
            <div className="onboarding-welcome">
              <h1 id="onboarding-welcome">Let’s get started on finding events that match you.</h1>
            </div>
          ) : (
            <div className="onboarding-age-step">
              <div className="onboarding-age-content">
                <h1 id="onboarding-age" ref={ageHeading} tabIndex={-1}>What is your age group?</h1>
                <fieldset className="onboarding-age-options">
                  <legend className="onboarding-visually-hidden">Choose one age group</legend>
                  {AGE_GROUPS.map(group => (
                    <label className="onboarding-age-option" key={group}>
                      <input type="radio" name="ageGroup" value={group} checked={ageGroup === group} onChange={() => setAgeGroup(group)} />
                      <span className="onboarding-age-card">
                        {group}
                      </span>
                    </label>
                  ))}
                </fieldset>
              </div>
              <footer className="onboarding-footer">
                <div className="onboarding-progress" aria-hidden="true"><span /></div>
                <Link className="pill onboarding-skip" to="/">Skip</Link>
              </footer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
