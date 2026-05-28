# RIA Lead CRM

Simple local CRM for calling imported RIA leads one by one.

## Start

Double-click `Start RIA Lead CRM.bat`, or run:

```powershell
cd C:\Users\Arber\ria-lead-crm
node server.mjs
```

Then open:

```text
http://127.0.0.1:4280
```

## How It Works

- Leads start in `Not Called`.
- Use `Move to Called Once`, `Move to Called Twice`, and `Move to Called Three Times` as you work through calls.
- Use `DO NOT CALL AGAIN` to move a lead into the do-not-call folder.
- Type in the `Notes` box to save notes and automatically move that lead into `Prospects`.
- Use `Print Card` to print the selected lead as an index-card-style page with contact details, notes, and extra blank lines.
- Progress is saved in your browser on this computer.
- Use `Export Progress` to download a CSV with each lead's current call stage and notes.
- Use `Reset Progress` only if you want to move every lead back to `Not Called`.

## Imported Data

The imported lead data is stored locally at:

```text
C:\Users\Arber\ria-lead-crm\data\leads.json
```
