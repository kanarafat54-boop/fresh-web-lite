export type EcosystemProfileMode =
  | 'for-you'
  | 'social'
  | 'learn'
  | 'relax'
  | 'others'
  | 'fresh-picks';

export interface EcosystemProfile {
  id: string;
  freshId: string;
  ecosystemId: string;
  title: string;
  description: string;
  enabled: boolean;
  level: number;
  feedModes: EcosystemProfileMode[];
  metadata: Record<string, unknown>;
}
