import { AuditResult } from '../types';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class ReportingAgent {
  async generateReport(companyName: string, results: AuditResult[]): Promise<string> {
    const model = "gemini-3-flash-preview";
    
    // Prepare data summary for the prompt
    const summaryData = results.map(r => ({
      name: r.supplierName,
      score: r.riskScore,
      status: r.status,
      risks: r.riskSignals.details
    }));

    const prompt = `
      Generate an Executive ESG Risk Report for "${companyName}".
      
      Data:
      ${JSON.stringify(summaryData, null, 2)}

      Structure:
      1. **Executive Summary**: High-level overview of the supply chain risk.
      2. **Risk Drivers**: What are the main contributors to risk (e.g., specific high-risk suppliers, common industry issues).
      3. **Supplier Classification**: Breakdown of Approved vs Review vs HITL.
      4. **Policy Recommendations**: Actionable steps for the company.

      Format: Markdown. Use bolding and bullet points effectively.
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt
      });
      return response.text || "Report generation failed.";
    } catch (error) {
      console.error("Reporting Agent Failed:", error);
      return "## Error Generating Report\nCould not generate the executive summary at this time.";
    }
  }
}
