import { useLayout } from "../contexts/LayoutContext";

export default function WorkspaceSwitcher() {
  const { activeRoute } = useLayout();

  return (
    <section className="workspace-switcher">
      <h3>Workspace</h3>
      <p>Current: {activeRoute ?? "None"}</p>
    </section>
  );
}
