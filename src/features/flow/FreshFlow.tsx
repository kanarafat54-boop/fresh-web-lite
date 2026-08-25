import { ShortsModule } from "../shorts/components/ShortsModule";

/**
 * Fresh Flow
 *
 * The universal media discovery surface. The existing Shorts implementation
 * remains the first media experience rendered here; this shell deliberately
 * owns the product identity so additional media kinds can be introduced
 * without creating parallel feed implementations.
 */
export default function FreshFlow(props: {
  openComposerSignal?: number;
  onExit?: () => void;
}) {
  return <ShortsModule {...props} />;
}
