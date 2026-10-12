export type PartnerId = 'a' | 'b';
/** Voor wie een agenda-item geldt. 'family' = gezinsmoment waar je bij hoort te zijn. */
export type Who = PartnerId | 'both' | 'family';
export type Source = 'mail' | 'spraak' | 'handmatig';
export type Repeat = 'none' | 'week' | 'month' | 'year';
export type CategoryId =
  | 'kinderen'
  | 'school'
  | 'gezondheid'
  | 'boodschappen'
  | 'huishouden'
  | 'admin'
  | 'auto'
  | 'huisdieren'
  | 'sociaal'
  | 'vakantie'
  | 'overig';

export interface Partner {
  id: PartnerId;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  category: CategoryId;
  assignee: PartnerId | null;
  due?: string; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
  createdBy: PartnerId;
  doneAt?: string;
  doneBy?: PartnerId;
  source: Source;
  points: number;
  project?: string;
  repeat: Repeat;
  notes?: string;
}

export interface FamEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start?: string; // HH:MM
  end?: string; // HH:MM
  who: Who;
  category: CategoryId;
  createdBy: PartnerId;
  source: Source;
}

export interface Settings {
  partners: [Partner, Partner];
  me: PartnerId;
  tone: 'mild' | 'eerlijk';
  anniversary?: string; // YYYY-MM-DD
  lastNotified?: string; // YYYY-MM-DD
}

export interface State {
  version: 1;
  tasks: Task[];
  events: FamEvent[];
  settings: Settings;
}

export interface Suggestion {
  kind: 'task' | 'event';
  title: string;
  category: CategoryId;
  date?: string;
  start?: string;
  end?: string;
  assignee: PartnerId | null;
  who: Who;
  points: number;
  raw: string;
}
