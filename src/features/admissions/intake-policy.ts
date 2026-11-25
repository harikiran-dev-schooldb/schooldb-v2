export const reviewStages = ["NOT_REQUIRED", "PENDING", "SCHEDULED", "PASSED", "FAILED"] as const;
export type ReviewStage = typeof reviewStages[number];
export const approvalStages = ["NOT_REQUIRED", "PASSED"] as const;
export function stagesReady(entrance: ReviewStage, interview: ReviewStage) {
  return (entrance === "NOT_REQUIRED" || entrance === "PASSED") && (interview === "NOT_REQUIRED" || interview === "PASSED");
}
export const followUpOutcomes = ["INTERESTED", "CALL_BACK", "NO_RESPONSE", "NOT_INTERESTED", "OTHER"] as const;
