export enum Country {
  FRANCE = 'France',
  GERMANY = 'Germany',
  NETHERLANDS = 'Netherlands',
  UK = 'UK',
  BELGIUM = 'Belgium'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AdsTerm {
  term: string;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  source: 'csv';
  detectedCountry?: Country; // Derived from Campaign Name
}

export interface GeneratedTerm {
  term: string;
  rationale?: string;
  source: 'gemini';
}

export interface AnalysisResult {
  text: string;
  fanOutQueries: GeneratedTerm[];
  adsTerms: AdsTerm[]; // Top performing terms from CSV
  sources: GroundingSource[];
  rawGroundingMetadata: any;
}

export interface Node {
  id: string;
  group: number; // 0: Root, 1: Gemini (Opportunity), 2: CSV (Proven)
  val: number; // Size based on metrics
  data?: AdsTerm | GeneratedTerm;
}

export interface Link {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}