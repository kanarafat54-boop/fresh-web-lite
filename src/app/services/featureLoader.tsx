import React, { Suspense, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import type { FeatureMeta } from "../registry/FeatureRegistry";

function FeatureLoadFallback({ name }: { name: string }) {
  return (
    <div className="feature-loading" role="status" aria-live="polite">
      Loading {name}…
    </div>
  );
}

function FeatureLoadError({ name, onRetry }: { name: string; onRetry: () => void }) {
  return (
    <div className="feature-loading feature-load-error" role="alert">
      <p>Couldn’t open {name}.</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export default function FeatureLoader({ feature }: { feature: FeatureMeta }) {
  const [retryKey, setRetryKey] = useState(0);

  const LazyComp = React.lazy(() =>
    Promise.race([
      // Dynamic feature boundary: features may have different prop contracts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (feature.lazyLoader as () => Promise<{ default: React.ComponentType<any> }>)(),
      new Promise<{ default: React.ComponentType }>((_, reject) => {
        window.setTimeout(() => reject(new Error(`Timed out loading ${feature.name}`)), 20000);
      }),
    ]).catch((error) => {
      console.error("[FeatureLoader]", feature.id, error);
      // Return a tiny recovery component instead of rejecting forever
      return {
        default: function FailedFeature() {
          return (
            <FeatureLoadError
              name={feature.name}
              onRetry={() => setRetryKey((k) => k + 1)}
            />
          );
        },
      };
    }),
  );

  return (
    <Suspense fallback={<FeatureLoadFallback name={feature.name} />} key={`${feature.id}-${retryKey}`}>
      <ErrorBoundary>
        <LazyComp />
      </ErrorBoundary>
    </Suspense>
  );
}
