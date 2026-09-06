export type FreshFlowConnection = "slow-2g" | "2g" | "3g" | "4g" | "unknown";

export type ShortsResourcePriority = "active" | "nearby" | "distant";

export interface ShortsResourcePolicy {
  preload: "none" | "metadata" | "auto";
  priority: ShortsResourcePriority;
  keepDecoded: boolean;
}

/**
 * Central policy for deciding how much work a Short deserves.
 * It deliberately contains no JSX or visual behavior.
 */
export function getShortsResourcePolicy(
  position: number,
  activeIndex: number,
  connection: FreshFlowConnection,
): ShortsResourcePolicy {
  const distance = Math.abs(position - activeIndex);
  const slowConnection = connection === "slow-2g" || connection === "2g";
  const moderateConnection = connection === "3g";

  if (distance === 0) {
    return {
      preload: "auto",
      priority: "active",
      keepDecoded: true,
    };
  }

  if (distance === 1) {
    return {
      preload: slowConnection ? "metadata" : "auto",
      priority: "nearby",
      keepDecoded: !slowConnection,
    };
  }

  if (distance <= 2) {
    return {
      preload: moderateConnection || slowConnection ? "metadata" : "auto",
      priority: "nearby",
      keepDecoded: false,
    };
  }

  return {
    preload: "none",
    priority: "distant",
    keepDecoded: false,
  };
}

export function getFreshFlowConnection(): FreshFlowConnection {
  if (typeof navigator === "undefined") return "unknown";
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string };
  }).connection;

  switch (connection?.effectiveType) {
    case "slow-2g":
    case "2g":
    case "3g":
    case "4g":
      return connection.effectiveType;
    default:
      return "unknown";
  }
}

/**
 * Returns a small bounded window around the active item so callers can
 * release distant media resources instead of retaining an unbounded stream.
 */
export function getShortsResourceWindow(
  itemCount: number,
  activeIndex: number,
  radius = 2,
): number[] {
  if (itemCount <= 0) return [];
  const start = Math.max(0, activeIndex - radius);
  const end = Math.min(itemCount - 1, activeIndex + radius);
  const indexes: number[] = [];
  for (let index = start; index <= end; index += 1) indexes.push(index);
  return indexes;
}
