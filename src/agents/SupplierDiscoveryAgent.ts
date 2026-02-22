import { Supplier } from '../types';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class SupplierDiscoveryAgent {
  async discover(companyName: string): Promise<Supplier[]> {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Find 5 ACTUAL key suppliers or supply chain partners for the company "${companyName}" using Google Search.
      If exact suppliers are not public, identify major companies in their likely supply chain (e.g., for an auto manufacturer, find major steel, battery, or tire suppliers).

      For each supplier, provide:
      1. Name (Real company name)
      2. Industry
      3. Location (Headquarters or major factory location)
      4. Estimated Carbon Emissions (Normalized 0.0 to 1.0 based on industry intensity. e.g., Steel=0.9, Software=0.1)
      5. Compliance Flags (Integer 0 to 5, based on public controversies found)

      Return ONLY a JSON array of objects. No markdown formatting.
      Format:
      [
        {
          "name": "Supplier Name",
          "industry": "Industry",
          "location": "Location",
          "estimatedEmissions": 0.5,
          "complianceFlags": 1
        }
      ]
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      const rawSuppliers = JSON.parse(text);
      
      return rawSuppliers.map((s: any, index: number) => ({
        id: `sup-${index}-${Date.now()}`,
        name: s.name,
        industry: s.industry,
        location: s.location,
        estimatedEmissions: s.estimatedEmissions,
        complianceFlags: s.complianceFlags
      }));

    } catch (error) {
      console.error("Supplier Discovery Failed:", error);
      // Fallback data if AI fails
      return [
        { id: '1', name: 'Global Steel Co', industry: 'Raw Materials', location: 'Mumbai, India', estimatedEmissions: 0.8, complianceFlags: 2 },
        { id: '2', name: 'TechChip Solutions', industry: 'Electronics', location: 'Shenzhen, China', estimatedEmissions: 0.4, complianceFlags: 0 },
        { id: '3', name: 'EcoLogistics', industry: 'Transport', location: 'Berlin, Germany', estimatedEmissions: 0.3, complianceFlags: 0 },
      ];
    }
  }
}
