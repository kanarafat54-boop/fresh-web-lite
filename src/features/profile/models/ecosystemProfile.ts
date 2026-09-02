export type EcosystemProfileMode =
  | 'for-you'
  | 'social'
  | 'learn'
  | 'relax'
  | 'others';

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
