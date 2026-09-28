import React, { Suspense, useMemo, useState } from "react";
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

/**
 * IMPORTANT: React.lazy() must be stable across re-renders.
 * Creating a new lazy() on every render restarts Suspense forever
 * ("Loading Fresh First Experience…" / "Loading Profile…" hangs).
 */
export default function FeatureLoader({ feature }: { feature: FeatureMeta }) {
  const [retryKey, setRetryKey] = useState(0);

  const LazyComp = useMemo(() => {
    return React.lazy(() =>
      Promise.race([
        // Dynamic feature boundary: features may have different prop contracts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (feature.lazyLoader as () => Promise<{ default: React.ComponentType<any> }>)(),
        new Promise<{ default: React.ComponentType }>((_, reject) => {
          window.setTimeout(() => reject(new Error(`Timed out loading ${feature.name}`)), 8000);
        }),
      ]).catch((error) => {
        console.error("[FeatureLoader]", feature.id, error);
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
  }, [feature.id, feature.name, feature.lazyLoader, retryKey]);

  return (
    <Suspense fallback={<FeatureLoadFallback name={feature.name} />} key={`${feature.id}-${retryKey}`}>
      <ErrorBoundary>
        <LazyComp />
      </ErrorBoundary>
    </Suspense>
  );
}
