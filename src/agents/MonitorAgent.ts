import { Supplier, RiskSignals } from '../types';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class MonitorAgent {
  async monitor(supplier: Supplier): Promise<RiskSignals> {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Analyze potential ESG risks for the supplier "${supplier.name}" in the "${supplier.industry}" industry located in "${supplier.location}".
      
      Simulate a check for:
      1. Adverse Media (Negative news coverage)
      2. Regulatory Action (Fines, lawsuits)
      3. Safety Violations (Workplace accidents)
      4. ESG Controversies (Pollution, labor rights)

      Based on the industry and typical risks, probabilistically generate a realistic risk profile. 
      High emission industries (Steel, Mining) should have higher risk of ESG controversies.
      
      Return ONLY a JSON object.
      Format:
      {
        "adverseMedia": boolean,
        "regulatoryAction": boolean,
        "safetyViolation": boolean,
        "esgControversies": boolean,
        "details": ["string array of 1-2 specific simulated headlines or findings"]
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
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
