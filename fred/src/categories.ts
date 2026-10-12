import type { CategoryId } from './types';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  points: number;
  keywords: RegExp;
}

// Volgorde telt: de eerste categorie die matcht wint.
export const CATEGORIES: Category[] = [
  { id: 'huisdieren', label: 'Huisdieren', emoji: '🐾', points: 2, keywords: /\b(hond|kat|poes|konijn|cavia|dierenarts|vaccin\w*|ontworm\w*|vlooien|kattenbak|hondenvoer|kattenvoer|uitlaten)\b/i },
  { id: 'gezondheid', label: 'Gezondheid', emoji: '🩺', points: 3, keywords: /\b(huisarts|dokter|tandarts|orthodontist|fysio\w*|ziekenhuis|apotheek|medicijn\w*|recept|griepprik|vaccinatie|consultatiebureau|opticien|bril|lenzen|cjg)\b/i },
  { id: 'school', label: 'School', emoji: '🎒', points: 2, keywords: /\b(school|juf|meester|klas|groep \d|schoolkamp|kamp|studiedag|ouderavond|10[- ]?minutengesprek\w*|rapport|huiswerk|gymkleren|gymspullen|lunchtrommel\w*|musical|schoolreis\w*|luizen\w*|ouderbijdrage|schoolplein|juffencadeau|bso|opvang|kinderopvang|creche|crèche)\b/i },
  { id: 'kinderen', label: 'Kinderen', emoji: '🧒', points: 2, keywords: /\b(zwemles\w*|zwemdiploma|muziekschool|kinderfeest\w*|speelafspraak|oppas\w*|kinderen|kids|scheenbeschermers|voetbal\w*|hockey\w*|turnen|ballet|training|avondvierdaagse|sportclub|sportschoenen|kinderkleding)\b/i },
  { id: 'admin', label: 'Administratie', emoji: '🗂️', points: 3, keywords: /\b(belasting\w*|aangifte|toeslag\w*|energiecontract|contract|verzekering\w*|hypotheek|factuur|facturen|rekening|betalen|betaling|paspoort|id-kaart|identiteitskaart|rijbewijs|gemeente|abonnement\w*|opzeggen|verlengen|bank|pensioen|zorgverzekering|duo)\b/i },
  { id: 'auto', label: 'Auto & vervoer', emoji: '🚗', points: 3, keywords: /\b(auto|garage|apk|banden\w*|bandenspanning|winterbanden|zomerbanden|fiets\w*|ov-chipkaart|tanken|wasstraat|onderhoudsbeurt)\b/i },
  { id: 'vakantie', label: 'Vakantie', emoji: '🧳', points: 2, keywords: /\b(vakantie|koffer\w*|inpakken|camping|hotel|vlucht|boeken|reisverzekering|zonnebrand)\b/i },
  { id: 'sociaal', label: 'Feestjes & cadeaus', emoji: '🎁', points: 2, keywords: /\b(verjaardag\w*|cadeau\w*|feest\w*|sinterklaas\w*|surprise\w*|kerst\w*|bruiloft|trouwdag|schoonmoeder|moeder|vader|oma|opa|neef\w*|nicht\w*|kaartje|bloemen)\b/i },
  { id: 'boodschappen', label: 'Boodschappen', emoji: '🛒', points: 1, keywords: /\b(boodschappen|toiletpapier|wc-papier|afwasmiddel|wasmiddel|melk|brood|eieren|luiers|billendoekjes|koffie|kaas|supermarkt|ah|jumbo|kopen|is op|zijn op)\b/i },
  { id: 'huishouden', label: 'Huishouden', emoji: '🧺', points: 1, keywords: /\b(was|wassen|strijk\w*|stofzuig\w*|dweil\w*|schoonmaken|poetsen|afwas\w*|vaatwasser|kliko|container|vuilnis|afval|glasbak|papierbak|bedden|beddengoed|ramen|tuin|gras|koken|eten)\b/i },
  { id: 'overig', label: 'Overig', emoji: '📌', points: 1, keywords: /$^/ },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export function detectCategory(text: string): CategoryId {
  return (CATEGORIES.find((c) => c.keywords.test(text)) ?? CATEGORY_BY_ID.overig).id;
}
