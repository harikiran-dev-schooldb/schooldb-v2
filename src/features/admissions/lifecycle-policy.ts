export function documentsReady(required:boolean,documents:{reviewStatus:string}[]) {
 return !required || (documents.length>0 && documents.every(d=>d.reviewStatus==="VERIFIED"));
}
export function usableFeePlan(plan:{items:{installments:unknown[]}[]}) {
 return plan.items.length>0&&plan.items.every(item=>item.installments.length>0);
}
