/**
 * Interactive Node System — branching choices & quizzes inside media manifests.
 * Fits: Fresh Flow Long / Live / Studio. Client jump protocol is local-first;
 * segment buffering adapters plug in without changing node contracts.
 */

export type InteractiveNodeKind = "choice" | "quiz" | "branch" | "end";

export type InteractiveOption = {
  id: string;
  label: string;
  /** Target node id or segment id to jump to */
  targetNodeId: string;
  /** Optional media segment marker (seconds or HLS cue id) */
  segmentCue?: string;
  segmentStartSeconds?: number;
};

export type InteractiveNode = {
  id: string;
  kind: InteractiveNodeKind;
  prompt: string;
  /** When this node becomes active during playback (seconds) */
  atSeconds: number;
  options: InteractiveOption[];
  /** Correct option id for quiz nodes (optional) */
  correctOptionId?: string;
};

export type InteractiveManifest = {
  version: 1;
  contentId: string;
  nodes: InteractiveNode[];
};

export type ClientJumpEvent = {
  fromNodeId: string;
  optionId: string;
  toNodeId: string;
  segmentStartSeconds?: number;
  segmentCue?: string;
  at: string;
};

export function createInteractiveManifest(contentId: string, nodes: InteractiveNode[] = []): InteractiveManifest {
  return { version: 1, contentId, nodes: [...nodes] };
}

export function addInteractiveNode(manifest: InteractiveManifest, node: InteractiveNode): InteractiveManifest {
  return { ...manifest, nodes: [...manifest.nodes, node] };
}

export function nodeAtTime(manifest: InteractiveManifest, seconds: number): InteractiveNode | null {
  const active = manifest.nodes
    .filter((n) => n.atSeconds <= seconds)
    .sort((a, b) => b.atSeconds - a.atSeconds);
  return active[0] ?? null;
}

/** Client Jump Protocol: resolve a choice without resetting the player pipeline. */
export function resolveClientJump(
  manifest: InteractiveManifest,
  fromNodeId: string,
  optionId: string,
): ClientJumpEvent | null {
  const node = manifest.nodes.find((n) => n.id === fromNodeId);
  if (!node) return null;
  const option = node.options.find((o) => o.id === optionId);
  if (!option) return null;
  return {
    fromNodeId,
    optionId,
    toNodeId: option.targetNodeId,
    segmentStartSeconds: option.segmentStartSeconds,
    segmentCue: option.segmentCue,
    at: new Date().toISOString(),
  };
}

export function isQuizCorrect(node: InteractiveNode, optionId: string): boolean | null {
  if (node.kind !== "quiz" || !node.correctOptionId) return null;
  return node.correctOptionId === optionId;
}

/** Demo branching tree used in Studio so the surface is usable before live media manifests. */
export function demoInteractiveManifest(contentId = "studio-demo"): InteractiveManifest {
  return createInteractiveManifest(contentId, [
    {
      id: "n-intro",
      kind: "choice",
      prompt: "Where should this story go next?",
      atSeconds: 5,
      options: [
        { id: "opt-a", label: "Deep dive tutorial", targetNodeId: "n-tutorial", segmentStartSeconds: 30 },
        { id: "opt-b", label: "Quick highlights", targetNodeId: "n-highlights", segmentStartSeconds: 90 },
      ],
    },
    {
      id: "n-tutorial",
      kind: "quiz",
      prompt: "What does the render graph store?",
      atSeconds: 35,
      correctOptionId: "opt-ast",
      options: [
        { id: "opt-ast", label: "Non-destructive edit AST", targetNodeId: "n-end", segmentStartSeconds: 120 },
        { id: "opt-pixels", label: "Only final pixels", targetNodeId: "n-end", segmentStartSeconds: 120 },
      ],
    },
    {
      id: "n-highlights",
      kind: "branch",
      prompt: "Continue to ending",
      atSeconds: 95,
      options: [{ id: "opt-end", label: "Finish", targetNodeId: "n-end", segmentStartSeconds: 120 }],
    },
    {
      id: "n-end",
      kind: "end",
      prompt: "Thanks for exploring interactive Fresh media.",
      atSeconds: 120,
      options: [],
    },
  ]);
}
