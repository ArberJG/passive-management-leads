import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env")) {
  const lines = fs.readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ||= value;
  }
}

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sourcePath = process.argv[2] || "data/leads.json";

if (!url || !serviceRoleKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Create a .env file or set those environment variables before importing.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);
const leads = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const chunkSize = 500;

function toDbLead(lead) {
  return {
    id: Number(lead.id),
    full_name: lead.fullName,
    first_name: lead.firstName,
    middle_initial: lead.middleInitial,
    last_name: lead.lastName,
    suffix: lead.suffix,
    phone: lead.phone,
    phone_display: lead.phoneDisplay,
    email: lead.email,
    address_line1: lead.addressLine1,
    city: lead.city,
    state: lead.state,
    zip: lead.zip,
    zip4: lead.zip4,
    county: lead.county,
    address: lead.address,
    income: lead.income,
    net_worth: lead.netWorth,
  };
}

for (let index = 0; index < leads.length; index += chunkSize) {
  const chunk = leads.slice(index, index + chunkSize).map(toDbLead);
  const { error } = await supabase.from("leads").upsert(chunk, { onConflict: "id" });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Imported ${Math.min(index + chunkSize, leads.length).toLocaleString()} / ${leads.length.toLocaleString()}`);
}

console.log("Lead import complete.");
