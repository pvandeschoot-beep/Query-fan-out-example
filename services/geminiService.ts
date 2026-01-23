import { GoogleGenAI } from "@google/genai";
import { Country, AnalysisResult, AdsTerm } from '../types';

export const analyzeRentalIntent = async (country: Country, adsData: AdsTerm[] = []): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelId = 'gemini-3-flash-preview';

  // Determine language and context based on country
  let language = 'English';
  switch (country) {
    case Country.FRANCE: language = 'French'; break;
    case Country.GERMANY: language = 'German'; break;
    case Country.NETHERLANDS: language = 'Dutch'; break;
    case Country.BELGIUM: language = 'Dutch and French'; break;
    case Country.UK: default: language = 'English'; break;
  }

  // Filter top performing ads terms (e.g. top 20 by conversions or clicks) to avoid token overflow
  const topAdsTerms = adsData.slice(0, 30);
  const adsContext = topAdsTerms.length > 0
    ? `
      ANALYSIS CONTEXT FROM GOOGLE ADS DATA:
      The following search terms have historically driven clicks and quotes (conversions) in our account. 
      Use these as "seed" terms to understand what currently works.
      
      Top Performers (Format: Term [Clicks, Conversions]):
      ${topAdsTerms.map(t => `- "${t.term}" [${t.clicks} clicks, ${t.conversions} conversions]`).join('\n')}

      Task adjustment: 
      1. Analyze WHY these specific terms are performing well.
      2. Generate "Fan-Out" queries that are related to these successful terms but represent UNTAPPED opportunities or specific variations we might be missing.
      3. Do NOT just repeat the list provided. Expand upon it.
      `
    : `No historical ads data provided. Generate fresh insights based on general market knowledge.`;

  const prompt = `
    You are a strategic market analyst for United Rentals Europe (Fluid & Power Solutions).
    
    Target Market: ${country}
    Output Language: ${language}
    
    Core Focus:
    1. **Fluid Solutions**: Pumps, Tanks, Filtration.
    2. **Power Solutions**: Generators, Distribution.

    ${adsContext}

    Action Required:
    1. Identify high-priority search intents in ${language}.
    2. If Ads Data is provided, explain the "Result Estimation" - i.e., what kind of volume/intent quality can we expect from the new queries based on the performance of the seed terms?
    3. Generate a concise Executive Summary in ${language}.
    
    Note: The 'webSearchQueries' (Fan-out) you generate should be a mix of:
    - High-intent keywords similar to the top performers.
    - Long-tail variations that specific industries (Petrochem, Construction) might use in ${country}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "No analysis generated.";
    
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const webSearchQueries = groundingMetadata?.webSearchQueries || [];
    
    const sources = groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
      .filter((source: any) => source !== null) || [];

    const uniqueSources = Array.from(new Map(sources.map((item: any) => [item.uri, item])).values());

    return {
      text,
      fanOutQueries: webSearchQueries.map((q: string) => ({ term: q, source: 'gemini' })),
      adsTerms: topAdsTerms,
      sources: uniqueSources as any[],
      rawGroundingMetadata: groundingMetadata
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};