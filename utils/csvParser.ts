import { AdsTerm, Country } from '../types';

// Helper to normalize headers to find key columns regardless of language
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const detectCountryFromCampaign = (campaignName: string): Country | undefined => {
  const normalized = campaignName.toUpperCase();
  
  // Strict checks for country codes often found in campaign naming conventions
  // Examples: "Search_DE_Pumps", "UK - Generators", "FR_Fluid"
  if (normalized.includes(' DE ') || normalized.includes('_DE_') || normalized.startsWith('DE_') || normalized.endsWith('_DE') || normalized.includes('GERMANY')) {
    return Country.GERMANY;
  }
  if (normalized.includes(' UK ') || normalized.includes('_UK_') || normalized.startsWith('UK_') || normalized.endsWith('_UK') || normalized.includes('UNITED KINGDOM')) {
    return Country.UK;
  }
  if (normalized.includes(' NL ') || normalized.includes('_NL_') || normalized.startsWith('NL_') || normalized.endsWith('_NL') || normalized.includes('NETHERLANDS')) {
    return Country.NETHERLANDS;
  }
  if (normalized.includes(' FR ') || normalized.includes('_FR_') || normalized.startsWith('FR_') || normalized.endsWith('_FR') || normalized.includes('FRANCE')) {
    return Country.FRANCE;
  }
  if (normalized.includes(' BE ') || normalized.includes('_BE_') || normalized.startsWith('BE_') || normalized.endsWith('_BE') || normalized.includes('BELGIUM')) {
    return Country.BELGIUM;
  }
  
  return undefined;
};

export const parseAdsCsv = (csvText: string): AdsTerm[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Identify header row (skipping potential report metadata at the top)
  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Split by comma ignoring quotes
    const normalizedRow = row.map(normalize);
    
    // Check for common columns (Search term / Zoekterm / Suchbegriff)
    if (normalizedRow.some(h => h.includes('searchterm') || h.includes('zoekterm') || h.includes('suchbegriff') || h.includes('termederecherche'))) {
      headerRowIndex = i;
      headers = normalizedRow;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error("Could not find valid headers (Search term, Clicks, Conversions) in CSV.");
  }

  // Map columns indices
  const termIdx = headers.findIndex(h => h.includes('searchterm') || h.includes('zoekterm') || h.includes('suchbegriff') || h.includes('termederecherche'));
  const clicksIdx = headers.findIndex(h => h === 'clicks' || h === 'klikken' || h === 'klicks' || h === 'clics');
  const convIdx = headers.findIndex(h => h.includes('conversion') || h.includes('conversie') || h === 'conv');
  const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('kosten') || h.includes('coût'));
  const campaignIdx = headers.findIndex(h => h.includes('campaign') || h.includes('campagne') || h.includes('kampagne'));

  const data: AdsTerm[] = [];

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Basic CSV split handling quotes
    const cells = rawLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

    if (cells.length < headers.length) continue;

    const term = cells[termIdx];
    // Skip summary rows like "Total"
    if (!term || term.toLowerCase().includes('total') || term.toLowerCase().includes('totaal')) continue;

    const parseNum = (val: string) => {
      if (!val) return 0;
      let clean = val.replace(/[^0-9.,]/g, '');
      if (clean.includes(',') && clean.includes('.')) {
        if (clean.indexOf(',') < clean.indexOf('.')) {
             clean = clean.replace(/,/g, '');
        } else {
             clean = clean.replace(/\./g, '').replace(',', '.');
        }
      } else if (clean.includes(',')) {
          clean = clean.replace(',', '.');
      }
      return parseFloat(clean) || 0;
    };

    const clicks = clicksIdx > -1 ? parseNum(cells[clicksIdx]) : 0;
    const conversions = convIdx > -1 ? parseNum(cells[convIdx]) : 0;
    const cost = costIdx > -1 ? parseNum(cells[costIdx]) : 0;
    const campaignName = campaignIdx > -1 ? cells[campaignIdx] : '';
    
    // REQUIREMENT: Only keep terms with conversions
    if (conversions <= 0) {
      continue;
    }

    data.push({
      term,
      clicks,
      conversions,
      cost,
      ctr: clicks > 0 ? (conversions / clicks) : 0,
      source: 'csv',
      detectedCountry: detectCountryFromCampaign(campaignName)
    });
  }

  // Sort by conversions (highest first)
  return data.sort((a, b) => b.conversions - a.conversions);
};