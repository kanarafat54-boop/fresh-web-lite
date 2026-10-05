import { useState } from "react";
import { ONBOARDING_INTERESTS, completeOnboarding } from "./productJourney";
import "./OnboardingPage.css";

type Props = {
  userName?: string | null;
  onContinue: () => void;
  onSkip: () => void;
};

/**
 * Mockup panel 3 — Onboarding
 * Interest chips → Continue → Main Home
 */
export default function OnboardingPage({ userName, onContinue, onSkip }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  function finish(skip = false) {
    completeOnboarding(skip ? [] : selected);
    onContinue();
  }

  return (
    <section className="fwl-onboard" aria-label="Personalize your Fresh experience">
      <div className="fwl-onboard__sky" aria-hidden="true" />
      <div className="fwl-onboard__card">
        <button type="button" className="fwl-onboard__skip" onClick={() => finish(true)}>
          Skip
        </button>
        <div className="fwl-onboard__logo" aria-hidden="true">
          <span>▶</span>
        </div>
        <h1>Welcome to Fresh Web Lite</h1>
        <p className="fwl-onboard__lead">
          {userName ? `Hi ${userName} — ` : ""}Tell us a bit about yourself
        </p>
        <p className="fwl-onboard__q">What are you interested in?</p>
        <div className="fwl-onboard__chips" role="group" aria-label="Interests">
          {ONBOARDING_INTERESTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.includes(item.id) ? "is-on" : ""}
              onClick={() => toggle(item.id)}
              aria-pressed={selected.includes(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" className="fwl-onboard__continue" onClick={() => finish(false)}>
          Continue
        </button>
      </div>
    </section>
  );
}
