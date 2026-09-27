import EcosystemSurface from "./EcosystemSurface";

/** Autonomous Engineering — FWL ecosystem #16 (was missing from registry). */
export default function AutonomousEngineeringWorkspace() {
  return (
    <EcosystemSurface
      name="Autonomous Engineering"
      eyebrow="Propose · Review · Approve · Ship"
      description="Build and improve software with AI assistance. The engine proposes and prepares changes; production actions stay subject to your approval."
      domains={[
        { id: "codegen", title: "Code generation", description: "Generate and refine implementation drafts.", status: "pending" },
        { id: "arch", title: "Architecture assistance", description: "Structure and design proposals.", status: "pending" },
        { id: "bugs", title: "Bug detection", description: "Surface defects and risky paths.", status: "pending" },
        { id: "test", title: "Testing", description: "Test plans and coverage suggestions.", status: "pending" },
        { id: "research", title: "Research", description: "Repo and dependency research.", status: "pending" },
        { id: "proposals", title: "Implementation proposals", description: "Change sets ready for review.", status: "pending" },
        { id: "repo", title: "Repository analysis", description: "Map codebases and impact.", status: "pending" },
        { id: "deploy", title: "Deployment assistance", description: "Prep deploys — never silent production pushes.", status: "pending" },
        { id: "monitor", title: "System monitoring", description: "Health and regression signals.", status: "pending" },
        { id: "approval", title: "Approval gate", description: "Important production actions require explicit user approval.", status: "surface" },
      ]}
      note="Important: the engine proposes and prepares. Shipping to production remains under user approval — never autonomous silent deploy."
    />
  );
}
