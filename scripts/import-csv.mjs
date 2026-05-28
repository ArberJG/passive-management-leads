import fs from "node:fs";
import path from "node:path";

const [sourceCsv, outputJson] = process.argv.slice(2);

if (!sourceCsv || !outputJson) {
  console.error("Usage: node scripts/import-csv.mjs <source.csv> <output.json>");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function cleanPhone(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

function makeFullName(record) {
  return [
    record["first name"],
    record["middle initial"],
    record["last name"],
    record["last name suffix"],
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const csvText = fs.readFileSync(sourceCsv, "utf8").replace(/^\uFEFF/, "");
const [headers, ...records] = parseCsv(csvText);
const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());

const leads = records.map((row, index) => {
  const record = Object.fromEntries(
    normalizedHeaders.map((header, headerIndex) => [header, (row[headerIndex] ?? "").trim()]),
  );

  const zip = record.zip4 ? `${record.zip}-${record.zip4}` : record.zip;
  const address = [record["address line1"], record.city, record.state, zip]
    .filter(Boolean)
    .join(", ");

  return {
    id: String(index + 1),
    fullName: makeFullName(record),
    firstName: record["first name"],
    middleInitial: record["middle initial"],
    lastName: record["last name"],
    suffix: record["last name suffix"],
    phone: record["cell phone"],
    phoneDisplay: cleanPhone(record["cell phone"]),
    email: record["email address"],
    addressLine1: record["address line1"],
    city: record.city,
    state: record.state,
    zip: record.zip,
    zip4: record.zip4,
    county: record["county name"],
    address,
    income: record.income,
    netWorth: record["net worth"],
  };
});

fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(leads, null, 2)}\n`);
console.log(`Imported ${leads.length.toLocaleString()} leads to ${outputJson}`);
