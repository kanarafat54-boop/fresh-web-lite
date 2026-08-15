import "./FreshAICommandCenter.css";

import DashboardLayout from "./dashboard/DashboardLayout";

import { DashboardProvider } from "../providers/DashboardProvider";
import "../intelligence";
import "../../../core/ara6/bootstrap";

export default function FreshAIHome() {
  return (
    <DashboardProvider>
      <div className="fresh-ai-command">
        <header className="ai-header">
          <h1>
            <span className="fresh">Fresh</span>{" "}
            <span className="ai">AI</span>
          </h1>
          <p>Your Universal Intelligence Platform</p>
        </header>
        <DashboardLayout />
      </div>
    </DashboardProvider>
  );
}
