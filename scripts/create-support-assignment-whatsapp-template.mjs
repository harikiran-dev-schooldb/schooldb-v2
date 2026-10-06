import "dotenv/config";

const wabaId = process.env.META_WABA_ID;
const accessToken = process.env.META_WA_TOKEN;
const apiVersion = process.env.META_WA_API_VERSION || "v22.0";
const name = process.env.META_WA_SUPPORT_ASSIGNMENT_TEMPLATE || "school_support_assignment";
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
        text: "Hello {{1}}, a new support task has been assigned to you at {{5}}.\n\nTask: {{2}} — {{3}}\nDescription: {{4}}\n\nPlease open School Support to review and update it.",
        example: {
          body_text: [[
            "Ananya Rao",
            "SUP-1042",
            "Projector is not working",
            "Check the projector in Room 8 before second period.",
            "Kotak Salesian School",
          ]],
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
