import React, { Suspense } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import type { FeatureMeta } from "../registry/FeatureRegistry";

export default function FeatureLoader({ feature }: { feature: FeatureMeta }) {
  const LazyComp = React.lazy(feature.lazyLoader);

  return (
    <Suspense fallback={<div className="feature-loading">Loading {feature.name}…</div>}>
      <ErrorBoundary featureName={feature.name}>
        <LazyComp />
      </ErrorBoundary>
    </Suspense>
  );
}
