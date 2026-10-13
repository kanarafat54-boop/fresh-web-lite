import { useState, type TouchEvent } from "react";
import { markWelcomeSeen } from "./productJourney";
import "./WelcomePage.css";

type Props = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

const welcomeSlides = [
  {
    eyebrow: "WELCOME TO FRESH",
    title: "Fresh Web Lite",
    tagline: "The Universal AI Platform",
    description: "Discover new possibilities in one place. Explore, create, learn, work and grow at your own pace.",
  },
  {
    eyebrow: "EXPLORE",
    title: "A world to discover",
    tagline: "Your interests, all connected",
    description: "Find knowledge, communities, useful tools and experiences without jumping between disconnected apps.",
  },
  {
    eyebrow: "CREATE",
    title: "Bring ideas to life",
    tagline: "From thought to creation",
    description: "Use intelligent tools to write, design, build and shape ideas into something useful.",
  },
  {
    eyebrow: "WORK & LEARN",
    title: "Make progress your way",
    tagline: "Learn skills. Build things. Move forward.",
    description: "Keep your projects, learning and digital work in one clearer place that works for you.",
  },
  {
    eyebrow: "YOUR DIGITAL LIFE",
    title: "You stay in control",
    tagline: "Clear choices. Privacy matters.",
    description: "Take your time, review your options and choose how you want to enter Fresh Web Lite.",
  },
];

export default function WelcomePage({ onGetStarted, onSignIn }: Props) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const slide = welcomeSlides[activeSlide];

  function start() {
    markWelcomeSeen();
    onGetStarted();
  }

  function signIn() {
    markWelcomeSeen();
    onSignIn();
  }

  function moveSlide(next: number) {
    setActiveSlide(Math.max(0, Math.min(welcomeSlides.length - 1, next)));
  }

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    setTouchStart(event.changedTouches[0]?.clientX ?? null);
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStart === null) return;
    const end = event.changedTouches[0]?.clientX ?? touchStart;
    const delta = touchStart - end;
    if (Math.abs(delta) > 48) moveSlide(activeSlide + (delta > 0 ? 1 : -1));
    setTouchStart(null);
  }

  return (
    <section className="fwl-welcome" aria-label="Welcome to Fresh Web Lite" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="fwl-welcome__sky" aria-hidden="true" />
      <div className="fwl-welcome__card" aria-live="polite">
        <div className="fwl-welcome__logo" aria-hidden="true">
          <span className="fwl-welcome__mark">FWL</span>
        </div>
        <p className="fwl-welcome__eyebrow">{slide.eyebrow} · {String(activeSlide + 1).padStart(2, "0")} / {String(welcomeSlides.length).padStart(2, "0")}</p>
        <h1>{slide.title}</h1>
        <p className="fwl-welcome__tagline">{slide.tagline}</p>
        <p className="fwl-welcome__sub">{slide.description}</p>

        <div className="fwl-welcome__pagination" role="group" aria-label="Welcome slides">
          {welcomeSlides.map((item, index) => (
            <button
              key={item.eyebrow}
              type="button"
              className={index === activeSlide ? "fwl-welcome__dot active" : "fwl-welcome__dot"}
              aria-label={"Show slide " + (index + 1) + ": " + item.eyebrow}
              aria-current={index === activeSlide ? "step" : undefined}
              onClick={() => moveSlide(index)}
            ><span /></button>
          ))}
        </div>
        <div className="fwl-welcome__slide-controls">
          <button type="button" className="fwl-welcome__slide-arrow" onClick={() => moveSlide(activeSlide - 1)} disabled={activeSlide === 0} aria-label="Previous welcome slide">←</button>
          <span>Swipe or tap a dot</span>
          <button type="button" className="fwl-welcome__slide-arrow" onClick={() => moveSlide(activeSlide + 1)} disabled={activeSlide === welcomeSlides.length - 1} aria-label="Next welcome slide">→</button>
        </div>

        <div className="fwl-welcome__actions">
          <button type="button" className="fwl-welcome__primary" onClick={start}>Get Started</button>
          <button type="button" className="fwl-welcome__secondary" onClick={signIn}>Sign In</button>
        </div>
        <p className="fwl-welcome__foot">One Platform · Endless Possibilities · Your Digital Life, Unified</p>
      </div>
    </section>
  );
}
