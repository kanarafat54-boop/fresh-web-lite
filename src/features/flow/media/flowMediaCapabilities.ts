import type { FlowMediaKind } from "./flowMediaRegistry";

/**
 * Capabilities are platform contracts, not UI promises.
 * A media ecosystem may only advertise a capability once its implementation
 * is wired to real persistence/runtime behavior.
 */
export interface FlowMediaCapabilities {
  discovery: boolean;
  realtime: boolean;
  comments: boolean;
  reactions: boolean;
  remix: boolean;
  commerce: boolean;
  knowledge: boolean;
  immersive: boolean;
  creatorTools: boolean;
}

const SHORTS_CAPABILITIES: FlowMediaCapabilities = {
  discovery: true,
  realtime: false,
  comments: true,
  reactions: true,
  remix: true,
  commerce: false,
  knowledge: true,
  immersive: true,
  creatorTools: true,
};

/**
 * Keep this map deliberately explicit. New ecosystems must declare their
 * real capabilities instead of inheriting Shorts behavior accidentally.
 */
export const FLOW_MEDIA_CAPABILITIES: Readonly<Record<FlowMediaKind, FlowMediaCapabilities>> = {
  short: SHORTS_CAPABILITIES,
  long_form: {
    discovery: false,
    realtime: false,
    comments: false,
    reactions: false,
    remix: false,
    commerce: false,
    knowledge: false,
    immersive: false,
    creatorTools: false,
  },
  live: {
    discovery: false,
    realtime: false,
    comments: false,
    reactions: false,
    remix: false,
    commerce: false,
    knowledge: false,
    immersive: false,
    creatorTools: false,
  },
  news: {
    discovery: false,
    realtime: false,
    comments: false,
    reactions: false,
    remix: false,
    commerce: false,
    knowledge: false,
    immersive: false,
    creatorTools: false,
  },
  audio: {
    discovery: false,
    realtime: false,
    comments: false,
    reactions: false,
    remix: false,
    commerce: false,
    knowledge: false,
    immersive: false,
    creatorTools: false,
  },
  image: {
    discovery: false,
    realtime: false,
    comments: false,
    reactions: false,
    remix: false,
    commerce: false,
    knowledge: false,
    immersive: false,
    creatorTools: false,
  },
  gallery: {
    discovery: false,
    realtime: false,
    comments: false,
    reactions: false,
    remix: false,
    commerce: false,
    knowledge: false,
    immersive: false,
    creatorTools: false,
  },
  knowledge: {
    discovery: false,
    realtime: false,
    comments: false,
    reactions: false,
    remix: false,
    commerce: false,
    knowledge: false,
    immersive: false,
    creatorTools: false,
  },
  immersive: {
    discovery: false,
    realtime: false,
    comments: false,
    reactions: false,
    remix: false,
    commerce: false,
    knowledge: false,
    immersive: false,
    creatorTools: false,
  },
};

export function getFlowMediaCapabilities(kind: FlowMediaKind): FlowMediaCapabilities {
  return FLOW_MEDIA_CAPABILITIES[kind];
}
