import React, { Suspense } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import type { FeatureMeta } from "../registry/FeatureRegistry";

export default function FeatureLoader({ feature }: { feature: FeatureMeta }) {
  const LazyComp = React.lazy(
    // Dynamic feature boundary: features may have different prop contracts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    feature.lazyLoader as () => Promise<{ default: React.ComponentType<any> }>
  );

  return (
    <Suspense fallback={<div className="feature-loading">Loading {feature.name}…</div>}>
      <ErrorBoundary featureName={feature.name}>
        <LazyComp />
      </ErrorBoundary>
    </Suspense>
  );
}
