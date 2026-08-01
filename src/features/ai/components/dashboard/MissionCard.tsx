import { useDashboard } from "../../providers/DashboardProvider";

export default function MissionCard() {

  const { dashboard } = useDashboard();

  return (

    <section className="mission-card">

      <h2>🎯 Current Mission</h2>

      <h3>{dashboard.mission}</h3>

      <p>
        Building the world's first AI-powered universal digital ecosystem.
      </p>

      <div className="mission-progress">

        <div className="mission-progress-bar">

          <div
            className="mission-progress-fill"
            style={{
              width: `${dashboard.progress}%`
            }}
          />

        </div>

        <span>

          {dashboard.progress}% Complete

        </span>

      </div>

    </section>

  );

}
