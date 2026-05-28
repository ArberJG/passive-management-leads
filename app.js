import { createClient } from "@supabase/supabase-js";

const STAGES = [
  "Not Called",
  "Called Once",
  "Called Twice",
  "Called Three Times",
  "Do Not Call Again",
  "Prospect",
];

const STAGE_NOT_CALLED = 0;
const STAGE_DO_NOT_CALL = 4;
const STAGE_PROSPECT = 5;
const PAGE_SIZE = 250;
const NOTE_SAVE_DELAY = 350;
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://xnvcjuceveubusprllyn.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_kdBzgM27IBSplLlsecSfWw_G8TWOa68";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const state = {
  leads: [],
  progress: {},
  activeStage: 0,
  activeLeadId: null,
  query: "",
  session: null,
  realtimeChannel: null,
};

const els = {
  app: document.getElementById("app"),
  auth: document.getElementById("auth"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  signIn: document.getElementById("signIn"),
  signUp: document.getElementById("signUp"),
  signOut: document.getElementById("signOut"),
  authMessage: document.getElementById("authMessage"),
  userEmail: document.getElementById("userEmail"),
  tabs: [...document.querySelectorAll(".stage-tab")],
  counts: STAGES.map((_, index) => document.getElementById(`count-${index}`)),
  searchInput: document.getElementById("searchInput"),
  previousLead: document.getElementById("previousLead"),
  nextLead: document.getElementById("nextLead"),
  positionLabel: document.getElementById("positionLabel"),
  stageLabel: document.getElementById("stageLabel"),
  fullName: document.getElementById("fullName"),
  leadId: document.getElementById("leadId"),
  phone: document.getElementById("phone"),
  email: document.getElementById("email"),
  address: document.getElementById("address"),
  income: document.getElementById("income"),
  netWorth: document.getElementById("netWorth"),
  notes: document.getElementById("notes"),
  moveBack: document.getElementById("moveBack"),
  advanceLead: document.getElementById("advanceLead"),
  doNotCall: document.getElementById("doNotCall"),
  leadList: document.getElementById("leadList"),
  listTitle: document.getElementById("listTitle"),
  filteredCount: document.getElementById("filteredCount"),
  exportProgress: document.getElementById("exportProgress"),
  resetProgress: document.getElementById("resetProgress"),
  printLead: document.getElementById("printLead"),
};

let noteSaveTimer = null;

function normalize(value) {
  return String(value || "").toLowerCase();
}

function dbLeadToLead(row) {
  return {
    id: String(row.id),
    fullName: row.full_name,
    firstName: row.first_name,
    middleInitial: row.middle_initial,
    lastName: row.last_name,
    suffix: row.suffix,
    phone: row.phone,
    phoneDisplay: row.phone_display,
    email: row.email,
    addressLine1: row.address_line1,
    city: row.city,
    state: row.state,
    zip: row.zip,
    zip4: row.zip4,
    county: row.county,
    address: row.address,
    income: row.income,
    netWorth: row.net_worth,
  };
}

function leadRecord(lead) {
  return state.progress[lead.id] || { stage: STAGE_NOT_CALLED, notes: "" };
}

function getStage(lead) {
  return leadRecord(lead).stage;
}

function getNotes(lead) {
  return leadRecord(lead).notes;
}

function applyStatus(row) {
  if (!row) return;
  state.progress[String(row.lead_id)] = {
    stage: Number(row.stage || 0),
    notes: String(row.notes || ""),
  };
}

function removeStatus(row) {
  if (!row) return;
  delete state.progress[String(row.lead_id)];
}

async function saveLeadRecord(lead, record) {
  const stage = Math.max(0, Math.min(STAGES.length - 1, Number(record.stage || 0)));
  const notes = String(record.notes || "");

  if (stage === STAGE_NOT_CALLED && !notes.trim()) {
    const { error } = await supabase.from("lead_statuses").delete().eq("lead_id", Number(lead.id));
    if (error) throw error;
    removeStatus({ lead_id: lead.id });
    render();
    return;
  }

  const { error } = await supabase.from("lead_statuses").upsert({
    lead_id: Number(lead.id),
    stage,
    notes,
    updated_by: state.session.user.id,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  applyStatus({ lead_id: lead.id, stage, notes });
  render();
}

async function setStage(lead, stage) {
  await saveLeadRecord(lead, { ...leadRecord(lead), stage });
}

async function setNotes(lead, notes) {
  const record = leadRecord(lead);
  await saveLeadRecord(lead, {
    notes,
    stage: notes.trim() ? STAGE_PROSPECT : record.stage,
  });
}

function filteredLeads() {
  const query = normalize(state.query).trim();
  return state.leads.filter((lead) => {
    if (getStage(lead) !== state.activeStage) return false;
    if (!query) return true;

    return [
      lead.fullName,
      lead.phone,
      lead.email,
      lead.address,
      lead.city,
      lead.state,
      lead.county,
      getNotes(lead),
    ].some((value) => normalize(value).includes(query));
  });
}

function updateCounts() {
  const counts = STAGES.map(() => 0);
  state.leads.forEach((lead) => {
    counts[getStage(lead)] += 1;
  });
  counts.forEach((count, index) => {
    els.counts[index].textContent = count.toLocaleString();
  });
}

function currentFilteredIndex(list) {
  return list.findIndex((lead) => lead.id === state.activeLeadId);
}

function selectFirstIfNeeded(list) {
  if (!list.length) {
    state.activeLeadId = null;
    return;
  }
  if (!list.some((lead) => lead.id === state.activeLeadId)) {
    state.activeLeadId = list[0].id;
  }
}

function renderLead(lead, list) {
  const index = currentFilteredIndex(list);
  els.positionLabel.textContent = lead ? `${index + 1} of ${list.length}` : "0 of 0";
  els.previousLead.disabled = !lead || index <= 0;
  els.nextLead.disabled = !lead || index >= list.length - 1;
  els.moveBack.disabled = !lead || state.activeStage === STAGE_NOT_CALLED;
  els.advanceLead.disabled = !lead || state.activeStage >= 3;
  els.doNotCall.disabled = !lead || state.activeStage === STAGE_DO_NOT_CALL;
  els.printLead.disabled = !lead;

  if (!lead) {
    els.stageLabel.textContent = STAGES[state.activeStage];
    els.fullName.textContent = "No leads in this folder";
    els.leadId.textContent = "";
    els.phone.textContent = "";
    els.phone.removeAttribute("href");
    els.email.textContent = "";
    els.email.removeAttribute("href");
    els.address.textContent = "";
    els.income.textContent = "";
    els.netWorth.textContent = "";
    els.notes.value = "";
    els.notes.disabled = true;
    els.advanceLead.textContent = "No Next Folder";
    els.doNotCall.disabled = true;
    return;
  }

  els.stageLabel.textContent = STAGES[state.activeStage];
  els.fullName.textContent = lead.fullName || "Unnamed Lead";
  els.leadId.textContent = "";
  els.phone.textContent = lead.phoneDisplay || lead.phone || "No phone";
  els.phone.href = lead.phone ? `tel:${lead.phone}` : "#";
  els.email.textContent = lead.email || "No email";
  els.email.href = lead.email ? `mailto:${lead.email}` : "#";
  els.address.textContent = lead.address || "No address";
  els.income.textContent = lead.income || "Not listed";
  els.netWorth.textContent = lead.netWorth || "Not listed";
  els.notes.disabled = false;
  if (document.activeElement !== els.notes) {
    els.notes.value = getNotes(lead);
  }
  els.advanceLead.textContent =
    state.activeStage < 3 ? `Move to ${STAGES[state.activeStage + 1]}` : "Already Called Three Times";
}

function renderList(list) {
  els.listTitle.textContent = `${STAGES[state.activeStage]} Leads`;
  els.filteredCount.textContent = `${list.length.toLocaleString()} shown`;
  els.leadList.textContent = "";

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No leads match this folder and search.";
    els.leadList.append(empty);
    return;
  }

  const visible = list.slice(0, PAGE_SIZE);
  const fragment = document.createDocumentFragment();
  visible.forEach((lead) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `lead-row${lead.id === state.activeLeadId ? " active" : ""}`;
    row.setAttribute("role", "listitem");
    row.dataset.id = lead.id;
    row.innerHTML = `
      <strong></strong>
      <span></span>
      <span></span>
    `;
    row.children[0].textContent = lead.fullName || "Unnamed Lead";
    row.children[1].textContent = lead.phoneDisplay || lead.phone || "No phone";
    row.children[2].textContent = lead.email || lead.address || "No contact detail";
    row.addEventListener("click", () => {
      state.activeLeadId = lead.id;
      render();
    });
    fragment.append(row);
  });

  els.leadList.append(fragment);

  if (list.length > PAGE_SIZE) {
    const note = document.createElement("div");
    note.className = "empty";
    note.textContent = `Showing first ${PAGE_SIZE.toLocaleString()} matches. Use search to narrow the list.`;
    els.leadList.append(note);
  }
}

function render() {
  const list = filteredLeads();
  selectFirstIfNeeded(list);
  const lead = state.leads.find((item) => item.id === state.activeLeadId) || null;

  els.tabs.forEach((tab) => {
    tab.classList.toggle("active", Number(tab.dataset.stage) === state.activeStage);
  });

  updateCounts();
  renderLead(lead, list);
  renderList(list);
}

function setLoading(message) {
  els.fullName.textContent = message;
  els.positionLabel.textContent = "0 of 0";
}

function setAuthMessage(message, isError = false) {
  els.authMessage.textContent = message;
  els.authMessage.classList.toggle("error", isError);
}

function showApp() {
  els.auth.hidden = true;
  els.app.hidden = false;
  els.userEmail.textContent = state.session?.user?.email || "";
}

function showAuth(message = "") {
  els.auth.hidden = false;
  els.app.hidden = true;
  els.userEmail.textContent = "";
  setAuthMessage(message);
}

function moveSelection(offset) {
  const list = filteredLeads();
  const index = currentFilteredIndex(list);
  const next = list[index + offset];
  if (next) {
    state.activeLeadId = next.id;
    render();
  }
}

function activeLead() {
  return state.leads.find((lead) => lead.id === state.activeLeadId);
}

function exportCsv() {
  const headers = [
    "Full Name",
    "Call Stage",
    "Phone",
    "Email",
    "Address",
    "Income",
    "Net Worth",
    "Notes",
  ];
  const rows = state.leads.map((lead) => [
    lead.fullName,
    STAGES[getStage(lead)],
    lead.phone,
    lead.email,
    lead.address,
    lead.income,
    lead.netWorth,
    getNotes(lead),
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value || "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `passive-management-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printLeadCard() {
  const lead = activeLead();
  if (!lead) return;

  const notes = getNotes(lead);
  const printWindow = window.open("", "_blank", "width=820,height=720");
  if (!printWindow) {
    window.alert("Please allow pop-ups for this page so the print card can open.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Lead Card - ${escapeHtml(lead.fullName)}</title>
        <style>
          @page { size: letter; margin: 0.45in; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #17202a; font-family: Arial, Helvetica, sans-serif; background: #fff; }
          .card { width: 7.4in; min-height: 4.8in; border: 2px solid #17202a; border-radius: 8px; padding: 0.22in; }
          .header { border-bottom: 2px solid #17202a; padding-bottom: 0.12in; }
          h1 { margin: 0; font-size: 22pt; line-height: 1.05; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.12in 0.24in; margin-top: 0.16in; }
          .wide { grid-column: 1 / -1; }
          .label { color: #4d5a68; font-size: 8pt; font-weight: 700; text-transform: uppercase; }
          .value { margin-top: 0.03in; min-height: 0.18in; font-size: 11.5pt; overflow-wrap: anywhere; }
          .notes { margin-top: 0.18in; border-top: 1px solid #8a96a3; padding-top: 0.12in; }
          .notes-box { min-height: 0.78in; margin-top: 0.06in; white-space: pre-wrap; font-size: 11pt; line-height: 1.35; }
          .extra-lines { margin-top: 0.12in; }
          .line { height: 0.28in; border-bottom: 1px solid #9aa5b1; }
          .footer { display: flex; justify-content: space-between; gap: 0.2in; margin-top: 0.15in; color: #4d5a68; font-size: 9pt; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <section class="card">
          <div class="header">
            <h1>${escapeHtml(lead.fullName || "Unnamed Lead")}</h1>
          </div>
          <div class="grid">
            <div>
              <div class="label">Phone</div>
              <div class="value">${escapeHtml(lead.phoneDisplay || lead.phone || "No phone")}</div>
            </div>
            <div>
              <div class="label">Email</div>
              <div class="value">${escapeHtml(lead.email || "No email")}</div>
            </div>
            <div class="wide">
              <div class="label">Address</div>
              <div class="value">${escapeHtml(lead.address || "No address")}</div>
            </div>
            <div>
              <div class="label">Income</div>
              <div class="value">${escapeHtml(lead.income || "Not listed")}</div>
            </div>
            <div>
              <div class="label">Net Worth</div>
              <div class="value">${escapeHtml(lead.netWorth || "Not listed")}</div>
            </div>
          </div>
          <div class="notes">
            <div class="label">Notes</div>
            <div class="notes-box">${escapeHtml(notes || "")}</div>
            <div class="extra-lines" aria-hidden="true">
              <div class="line"></div>
              <div class="line"></div>
              <div class="line"></div>
              <div class="line"></div>
              <div class="line"></div>
              <div class="line"></div>
            </div>
          </div>
          <div class="footer">
            <span>Passive Management Leads</span>
            <span>Additional handwritten notes</span>
          </div>
        </section>
        <script>window.addEventListener("load", () => window.print());</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

async function loadLeads() {
  setLoading("Loading shared leads...");
  const leads = [];
  const batchSize = 1000;

  for (let from = 0; ; from += batchSize) {
    const to = from + batchSize - 1;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;
    leads.push(...data.map(dbLeadToLead));
    if (data.length < batchSize) break;
  }

  state.leads = leads;
}

async function loadStatuses() {
  state.progress = {};
  const { data, error } = await supabase.from("lead_statuses").select("lead_id, stage, notes");
  if (error) throw error;
  data.forEach(applyStatus);
}

function subscribeToStatusChanges() {
  if (state.realtimeChannel) {
    supabase.removeChannel(state.realtimeChannel);
  }

  state.realtimeChannel = supabase
    .channel("lead-statuses")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lead_statuses" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          removeStatus(payload.old);
        } else {
          applyStatus(payload.new);
        }
        render();
      },
    )
    .subscribe();
}

async function loadAppData() {
  showApp();
  setLoading("Loading shared leads...");
  await loadLeads();
  await loadStatuses();
  subscribeToStatusChanges();
  render();
}

async function signIn() {
  setAuthMessage("Signing in...");
  const { error } = await supabase.auth.signInWithPassword({
    email: els.authEmail.value.trim(),
    password: els.authPassword.value,
  });
  if (error) {
    setAuthMessage(error.message, true);
  }
}

async function signUp() {
  setAuthMessage("Creating account...");
  const { error } = await supabase.auth.signUp({
    email: els.authEmail.value.trim(),
    password: els.authPassword.value,
  });
  if (error) {
    setAuthMessage(error.message, true);
    return;
  }
  setAuthMessage("Account created. Check your email if Supabase asks for confirmation, then sign in.");
}

async function signOut() {
  await supabase.auth.signOut();
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeStage = Number(tab.dataset.stage);
    state.activeLeadId = null;
    render();
  });
});

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  state.activeLeadId = null;
  render();
});

els.previousLead.addEventListener("click", () => moveSelection(-1));
els.nextLead.addEventListener("click", () => moveSelection(1));

els.advanceLead.addEventListener("click", async () => {
  const lead = activeLead();
  if (!lead || state.activeStage >= 3) return;
  await setStage(lead, state.activeStage + 1);
});

els.moveBack.addEventListener("click", async () => {
  const lead = activeLead();
  if (!lead || state.activeStage <= STAGE_NOT_CALLED) return;
  await setStage(lead, state.activeStage - 1);
});

els.doNotCall.addEventListener("click", async () => {
  const lead = activeLead();
  if (!lead) return;
  await setStage(lead, STAGE_DO_NOT_CALL);
});

els.notes.addEventListener("input", (event) => {
  window.clearTimeout(noteSaveTimer);
  const lead = activeLead();
  if (!lead) return;

  noteSaveTimer = window.setTimeout(async () => {
    try {
      await setNotes(lead, event.target.value);
      state.activeStage = STAGE_PROSPECT;
      state.activeLeadId = lead.id;
      render();
    } catch (error) {
      window.alert(error.message);
    }
  }, NOTE_SAVE_DELAY);
});

els.exportProgress.addEventListener("click", exportCsv);
els.printLead.addEventListener("click", printLeadCard);

els.resetProgress.addEventListener("click", async () => {
  const confirmed = window.confirm("Reset all call folders and notes back to Not Called?");
  if (!confirmed) return;
  const { error } = await supabase.from("lead_statuses").delete().neq("lead_id", -1);
  if (error) {
    window.alert(error.message);
    return;
  }
  state.progress = {};
  state.activeStage = STAGE_NOT_CALLED;
  state.activeLeadId = null;
  render();
});

els.signIn.addEventListener("click", signIn);
els.signUp.addEventListener("click", signUp);
els.signOut.addEventListener("click", signOut);
els.authPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") signIn();
});

async function init() {
  if (!supabase) {
    showAuth("Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.", true);
    return;
  }

  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (!session) {
      showAuth();
      return;
    }
    try {
      await loadAppData();
    } catch (error) {
      setLoading("Could not load leads");
      window.alert(error.message);
    }
  });

  if (state.session) {
    await loadAppData();
  } else {
    showAuth();
  }
}

init().catch((error) => {
  setLoading("Could not start app");
  window.alert(error.message);
});
