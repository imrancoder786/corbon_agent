export interface Company {
  name: string;
  industry?: string;
}

export interface Supplier {
  id: string;
  name: string;
  industry: string;
  location: string;
  estimatedEmissions: number; // Normalized 0-1 for simplicity in this demo, or raw value
  complianceFlags: number; // Count of flags
}

export interface RiskSignals {
  adverseMedia: boolean;
  regulatoryAction: boolean;
  safetyViolation: boolean;
  esgControversies: boolean;
  details: string[];
}

export interface AuditResult {
  supplierId: string;
  supplierName: string;
  riskSignals: RiskSignals;
  emissionsNormalized: number;
  riskScore: number;
  status: 'Approved' | 'Review' | 'HITL_Triggered' | 'Rejected';
  auditTimestamp: string;
}

export interface AgentLog {
  agent: string;
  message: string;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success';
}
