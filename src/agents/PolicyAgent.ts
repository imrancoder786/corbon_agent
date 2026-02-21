export class PolicyAgent {
  evaluate(score: number): 'Approved' | 'Review' | 'HITL_Triggered' {
    if (score < 0.5) {
      return 'Approved';
    } else if (score < 0.8) {
      return 'Review';
    } else {
      return 'HITL_Triggered';
    }
  }
}
