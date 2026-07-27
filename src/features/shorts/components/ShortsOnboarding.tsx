/**
 * Fresh Web Lite
 * Shorts Onboarding — shown once, teaches the gesture set
 */

import { ChevronUpIcon, ChevronLeftIcon } from "../../../components/Icons";

export function ShortsOnboarding({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="shorts-onboarding" onClick={onDismiss}>
      <div className="onboarding-hint hint-up">
        <ChevronUpIcon size={28} />
        <span>Swipe up for next</span>
      </div>
      <div className="onboarding-hint hint-left">
        <ChevronLeftIcon size={28} />
        <span>Swipe from edge to go back</span>
      </div>
      <div className="onboarding-hint hint-center">
        <span>Tap to pause · Double-tap to love</span>
        <span>Hold the reaction button for more options</span>
      </div>
      <p className="onboarding-dismiss">Tap anywhere to start</p>
    </div>
  );
}
