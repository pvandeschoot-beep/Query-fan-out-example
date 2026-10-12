import { CATEGORY_BY_ID } from '../categories';
import type { FredStore } from '../store';
import type { CategoryId, Partner, PartnerId, Who } from '../types';

export interface ViewProps {
  store: FredStore;
  today: string;
  notify: (text: string, level?: 'alarm' | 'ok') => void;
}

export function partnerById(partners: Partner[], id: PartnerId) {
  return partners.find((p) => p.id === id)!;
}

export function Avatar({ partner, size = 24 }: { partner?: Partner; size?: number }) {
  if (!partner) {
    return <span className="avatar avatar-none" style={{ width: size, height: size }} title="Nog van niemand">?</span>;
  }
  return (
    <span className="avatar" style={{ width: size, height: size, background: partner.color }} title={partner.name}>
      {partner.name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

export function CategoryTag({ id }: { id: CategoryId }) {
  const c = CATEGORY_BY_ID[id];
  return <span className="tag">{c.emoji} {c.label}</span>;
}

export function whoLabel(who: Who, partners: Partner[]) {
  if (who === 'family') return 'Gezin';
  if (who === 'both') return 'Samen';
  return partnerById(partners, who).name;
}

export function WhoDot({ who, partners }: { who: Who; partners: Partner[] }) {
  if (who === 'a' || who === 'b') return <Avatar partner={partnerById(partners, who)} size={20} />;
  return <span className="who-dot">{who === 'family' ? '👨‍👩‍👧' : '👫'}</span>;
}
