export const PIPELINE_STAGES = [
 {status:"DRAFT",label:"Draft"},
 {status:"SUBMITTED",label:"Submitted"},
 {status:"UNDER_REVIEW",label:"Under review"},
 {status:"WAITLISTED",label:"Waitlisted"},
 {status:"APPROVED",label:"Approved · reserved"},
 {status:"CONVERTED",label:"Admitted"},
 {status:"REJECTED",label:"Rejected"},
] as const;
export function seatSummary(capacity:number|undefined,approved:number,admitted:number){
 return {reserved:approved,admitted,available:capacity===undefined?null:capacity-approved-admitted};
}
export function requiresSeatWaitlist(capacity:number|undefined,enforced:boolean,approved:number,admitted:number){
 return enforced&&capacity!==undefined&&approved+admitted>=capacity;
}
