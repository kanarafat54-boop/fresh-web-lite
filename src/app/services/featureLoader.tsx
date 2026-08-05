import React, { Suspense } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import type { FeatureMeta } from "../registry/FeatureRegistry";

export default function FeatureLoader({ feature }: { feature: FeatureMeta }) {
  // Create a lazy component using the feature's lazyLoader
  const LazyComp = React.lazy(feature.lazyLoader as any);

  return (
    <Suspense fallback={<div className="feature-loading">Loading {feature.name}…</div>}>
      <ErrorBoundary featureName={feature.name}>
        <LazyComp />
      </ErrorBoundary>
    </Suspense>
  );
}
