export default function PlanningCard() {
  return (
    <section className="planning-card">

      <h2>Execution Plan</h2>

      <div className="plan-step">
        <span>✅</span>
        <span>Analyze Goal</span>
      </div>

      <div className="plan-step">
        <span>✅</span>
        <span>Read Context</span>
      </div>

      <div className="plan-step">
        <span>🟡</span>
        <span>Generate Workflow</span>
      </div>

      <div className="plan-step">
        <span>⚪</span>
        <span>Execute with Ara6</span>
      </div>

    </section>
  );
}
