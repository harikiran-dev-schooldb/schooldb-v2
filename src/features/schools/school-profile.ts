export type ProfileField = { key: string; label: string; kind?: "email" | "url" | "date" | "time" | "number" | "select" | "textarea"; options?: readonly string[]; placeholder?: string };
export const PROFILE_SECTIONS: { key: string; title: string; description: string; fields: ProfileField[] }[] = [
  { key: "general", title: "General information", description: "School identity and registration details.", fields: [
    {key:"schoolCode",label:"School code"}, {key:"affiliationNumber",label:"Affiliation number"}, {key:"udiseCode",label:"UDISE+ code"},
    {key:"board",label:"Education board",kind:"select",options:["ICSE / ISC","CBSE","State Board","IB","Cambridge","Other"]},
    {key:"principalName",label:"Principal / head of school"}, {key:"establishedYear",label:"Established year",kind:"number"},
    {key:"schoolType",label:"School type",kind:"select",options:["Preschool","Primary","Middle","Secondary","Senior Secondary","Combined / K–12","Other"]},
    {key:"requestedSlug",label:"Proposed new school URL",placeholder:"Leave blank to keep the current URL"}
  ]},
  {key:"contact",title:"Address & contact",description:"Official school contact information.",fields:[
    {key:"addressLine1",label:"Address line 1"},{key:"addressLine2",label:"Address line 2"},{key:"city",label:"City / town"},{key:"district",label:"District"},{key:"state",label:"State"},{key:"postalCode",label:"PIN / postal code"},{key:"country",label:"Country"},
    {key:"phone",label:"Official phone"},{key:"email",label:"Official email",kind:"email"},{key:"website",label:"School website",kind:"url"},{key:"mapsUrl",label:"Map location URL",kind:"url"},{key:"admissionsPhone",label:"Admissions contact"},{key:"supportPhone",label:"Support contact"}
  ]},
  {key:"branding",title:"Branding",description:"School identity and document branding information.",fields:[
    {key:"motto",label:"School motto"},{key:"letterheadText",label:"Letterhead text",kind:"textarea"},{key:"signatoryName",label:"Authorised signatory"},{key:"signatoryTitle",label:"Signatory designation"},{key:"sealText",label:"School seal reference"}
  ]},
  {key:"billing",title:"Subscription & billing",description:"Administrative tracking only — does not charge, suspend or change module access.",fields:[
    {key:"subscriptionPlan",label:"Subscription plan",kind:"select",options:["Demo","Admissions","Admissions + Support","Full ERP","Custom"]},{key:"subscriptionStart",label:"Start date",kind:"date"},{key:"subscriptionExpiry",label:"Expiry / renewal date",kind:"date"},{key:"subscriptionPrice",label:"Agreed price (INR)",kind:"number"},{key:"billingCycle",label:"Billing cycle",kind:"select",options:["Monthly","Quarterly","Annual","Per student / year","Other"]},{key:"billingEmail",label:"Billing email",kind:"email"},{key:"billingNotes",label:"Billing notes",kind:"textarea"}
  ]},
  {key:"academic",title:"Academic settings",description:"School-wide preferences; use Academic Years for the actual teaching/admissions year.",fields:[
    {key:"timezone",label:"Preferred time zone",placeholder:"Asia/Kolkata"},{key:"dateFormat",label:"Preferred date format",kind:"select",options:["DD/MM/YYYY","DD-MM-YYYY","YYYY-MM-DD"]},{key:"openingTime",label:"School opening time",kind:"time"},{key:"closingTime",label:"School closing time",kind:"time"},{key:"academicNotes",label:"Academic notes",kind:"textarea"}
  ]},
  {key:"communication",title:"Communication",description:"Contact preferences and administrative notes; delivery remains in existing notification tools.",fields:[
    {key:"notificationEmail",label:"Notification contact email",kind:"email"},{key:"whatsappNumber",label:"Official WhatsApp contact"},{key:"communicationNotes",label:"Communication / support notes",kind:"textarea"}
  ]},
  {key:"security",title:"Security & access",description:"Record the intended workspace status. Account permissions remain managed through existing user and module settings.",fields:[
    {key:"workspaceStatus",label:"Administrative status",kind:"select",options:["Active","Suspension requested","Inactive requested"]},{key:"securityNotes",label:"Access review notes",kind:"textarea"}
  ]}
];
const fields = PROFILE_SECTIONS.flatMap(section => section.fields);
const fieldMap = new Map(fields.map(field => [field.key,field]));
export const PROFILE_DEFAULTS: Record<string,string> = { country:"India", timezone:"Asia/Kolkata", dateFormat:"DD/MM/YYYY", workspaceStatus:"Active" };
export function validateSchoolProfile(input: unknown): Record<string,string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid school profile.");
  const result: Record<string,string> = {};
  for (const [key, raw] of Object.entries(input)) {
    const field = fieldMap.get(key);
    if (!field || typeof raw !== "string") throw new Error("Unknown or invalid school profile field.");
    const value = raw.trim();
    if (!value) continue;
    if (value.length > (field.kind === "textarea" ? 2000 : 500)) throw new Error(field.label+" is too long.");
    if (field.options && !field.options.includes(value)) throw new Error("Invalid "+field.label+".");
    if (field.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Invalid "+field.label+".");
    if (field.kind === "url") {
      let parsed: URL;
      try { parsed = new URL(value); } catch { throw new Error("Invalid "+field.label+"."); }
      if (!["http:","https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error("Use an HTTP or HTTPS URL for "+field.label+".");
    }
    if (field.kind === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)) throw new Error("Invalid "+field.label+".");
    if (field.kind === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Invalid "+field.label+".");
    if (field.kind === "number" && (!/^\d+(?:\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value)) || Number(value)>1000000000)) throw new Error("Invalid "+field.label+".");
    if (key === "establishedYear" && (!/^\d{4}$/.test(value) || Number(value)<1000 || Number(value)>new Date().getFullYear())) throw new Error("Invalid established year.");
    if (key === "udiseCode" && !/^\d{11}$/.test(value)) throw new Error("UDISE+ code must have 11 digits.");
    if (key === "timezone") { try { new Intl.DateTimeFormat("en",{timeZone:value}); } catch { throw new Error("Invalid IANA time zone."); } }
    result[key] = value;
  }
  if (result.subscriptionStart && result.subscriptionExpiry && result.subscriptionStart > result.subscriptionExpiry) throw new Error("Subscription expiry must not precede its start.");
  if (result.openingTime && result.closingTime && result.openingTime >= result.closingTime) throw new Error("Closing time must follow opening time.");
  return result;
}
