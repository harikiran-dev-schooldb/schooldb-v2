import "dotenv/config";

const wabaId = process.env.META_WABA_ID;
const accessToken = process.env.META_WA_TOKEN;
const apiVersion = process.env.META_WA_API_VERSION || "v22.0";
const name = process.env.META_WA_ATTENDANCE_CORRECTION_TEMPLATE || "school_attendance_correction";
const language = process.env.META_WA_ANNOUNCEMENT_LANGUAGE || "en";

if (!wabaId || !accessToken) {
  throw new Error("META_WABA_ID and META_WA_TOKEN are required.");
}

const endpoint = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;
const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
const lookup = await fetch(`${endpoint}?name=${encodeURIComponent(name)}&fields=id,name,status,language,category`, { headers });
const lookupData = await lookup.json();

if (!lookup.ok) {
  throw new Error(lookupData.error?.message || "Unable to check existing WhatsApp templates.");
}

const existing = lookupData.data?.find((template) => template.name === name && template.language === language);
if (existing) {
  console.log(JSON.stringify({ created: false, template: existing }, null, 2));
  process.exit(0);
}

const response = await fetch(endpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({
    name,
    language,
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Attendance for {{1}} at {{2}} on {{3}} has been corrected from Absent to Present.",
        example: {
          body_text: [["Ananya Rao", "Kotak Salesian School", "4 Oct 2026"]],
        },
      },
    ],
  }),
});
const data = await response.json();

if (!response.ok) {
  throw new Error(data.error?.error_user_msg || data.error?.message || "Meta rejected the WhatsApp template.");
}

console.log(JSON.stringify({ created: true, name, language, category: "UTILITY", id: data.id, status: data.status }, null, 2));
