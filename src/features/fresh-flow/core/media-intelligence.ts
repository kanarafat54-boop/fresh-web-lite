export type MediaIntelligence = {
  transcript?: string;
  language?: string;
  topics?: string[];
  entities?: string[];
  people?: string[];
  places?: string[];
  objects?: string[];
  scenes?: string[];
  captions?: string;
  safetySignals?: string[];
  qualitySignals?: string[];
  embedding?: number[];
};

export const EMPTY_MEDIA_INTELLIGENCE: MediaIntelligence = {};
