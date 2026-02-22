import { Supplier, RiskSignals } from '../types';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class MonitorAgent {
  async monitor(supplier: Supplier): Promise<RiskSignals> {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Perform a real-time ESG risk analysis for the supplier "${supplier.name}" located in "${supplier.location}" (Industry: "${supplier.industry}").
      
      Use Google Search to find ACTUAL recent news, reports, or controversies.
      Look for:
      1. Adverse Media (Negative news coverage, scandals)
      2. Regulatory Action (Fines, lawsuits, government sanctions)
      3. Safety Violations (Workplace accidents, labor strikes)
      4. ESG Controversies (Pollution, human rights issues)

      If no specific information is found for this exact supplier, infer realistic risks based on recent events in their specific industry and location (e.g., "Steel industry in India facing new carbon tax regulations").

      Return ONLY a JSON object.
      Format:
      {
        "adverseMedia": boolean,
        "regulatoryAction": boolean,
        "safetyViolation": boolean,
        "esgControversies": boolean,
        "details": ["string array of 2-3 specific headlines or findings found via search"]
      }
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
      
      return JSON.parse(text);

    } catch (error) {
      console.error("Monitor Agent Failed:", error);
      return {
        adverseMedia: false,
        regulatoryAction: false,
        safetyViolation: false,
        esgControversies: false,
        details: ["System unable to verify external risks. Defaulting to low risk."]
      };
    }
  }
}
