import { Supplier, RiskSignals } from '../types';

export class CalculationAgent {
  /**
   * CRITICAL: Deterministic scoring.
   * Formula:
   * risk_score = 
   *   0.4 * emissions_normalized + 
   *   0.3 * (compliance_flags / 5) +  // Normalized compliance flags (assuming max 5 is bad)
   *   0.3 * external_risk_signals
   * 
   * External risk signals score:
   *   Count of true signals / 4
   */
  calculate(supplier: Supplier, signals: RiskSignals): number {
    const w1 = 0.4;
    const w2 = 0.3;
    const w3 = 0.3;

    // 1. Emissions (Already normalized 0-1)
    const scoreEmissions = Math.min(Math.max(supplier.estimatedEmissions, 0), 1);

    // 2. Compliance Flags (Normalize: 5 flags = 1.0 risk)
    const scoreCompliance = Math.min(supplier.complianceFlags / 5, 1);

    // 3. External Signals
    let signalCount = 0;
    if (signals.adverseMedia) signalCount++;
    if (signals.regulatoryAction) signalCount++;
    if (signals.safetyViolation) signalCount++;
    if (signals.esgControversies) signalCount++;
    
    const scoreSignals = signalCount / 4;

    // Total Score
    const totalScore = (w1 * scoreEmissions) + (w2 * scoreCompliance) + (w3 * scoreSignals);

    // Return rounded to 3 decimal places
    return Math.round(totalScore * 1000) / 1000;
  }
}
