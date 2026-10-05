import { markWelcomeSeen } from "./productJourney";
import "./WelcomePage.css";

type Props = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

/**
 * Mockup panel 1 — Welcome Page
 * Cosmic first impression: Get Started + Sign In
 */
export default function WelcomePage({ onGetStarted, onSignIn }: Props) {
  function start() {
    markWelcomeSeen();
    onGetStarted();
  }

  function signIn() {
    markWelcomeSeen();
    onSignIn();
  }

  return (
    <section className="fwl-welcome" aria-label="Welcome to Fresh Web Lite">
      <div className="fwl-welcome__sky" aria-hidden="true" />
      <div className="fwl-welcome__card">
        <div className="fwl-welcome__logo" aria-hidden="true">
          <span className="fwl-welcome__mark">FWL</span>
        </div>
        <h1>Fresh Web Lite</h1>
        <p className="fwl-welcome__tagline">The Universal AI Platform</p>
        <p className="fwl-welcome__sub">
          Discover 32 ecosystems. Create. Learn. Work. Earn. All in one place.
        </p>
        <div className="fwl-welcome__actions">
          <button type="button" className="fwl-welcome__primary" onClick={start}>
            Get Started
          </button>
          <button type="button" className="fwl-welcome__secondary" onClick={signIn}>
            Sign In
          </button>
        </div>
        <p className="fwl-welcome__foot">One Platform · Endless Possibilities · Your Digital Life, Unified</p>
      </div>
    </section>
  );
}
