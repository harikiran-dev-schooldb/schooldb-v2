export function appointmentWindow(now:Date) {return {gt:now,lte:new Date(now.getTime()+30*60*1000)};}
export function indiaDay(now:Date){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);}
export function appointmentKey(schoolId:string,applicationId:string,stage:string,memberId:string,at:Date){return ["admission-appointment",schoolId,applicationId,stage,memberId,at.toISOString()].join(":");}
