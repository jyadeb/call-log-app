/*
This functions pastes notes, parses, edits the AI's preview, and saves 
textarea -> POST /api/calls/parse/ -> ParseResponse -> draft state (editable) ->
-> Save -> (if new firm, POST /api/firms/ -> firm id) -> POST /api/calls/ -> Saved
*/

import {useEffect, useState} from "react";
import type {Firm, ParseResponse} from "./types";

const API = "http://localhost:8000/api";

//all string because inputs always hold string
type Draft = {
    firm_choice: string; //firm id, "new", or ""
    new_firm_name: string;
    date: string;
    contact_name: string;
    contact_role: string;
    outcome: string;
    reason: string;
    next_action: string;
    follow_up_date: string;
}

// Today's date on my timezone as "YYYY-MM-DD"
function todayLocal(): string {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${d.getFullYear()}-${month}-${day}`;
}

// Turns the parse reply into form values. Null means notes didn'y say and becomes ""
function toDraft(r: ParseResponse): Draft {
    const p = r.preview;
    let firm_choice = "";
    if (r.firm_id !== null) firm_choice = String(r.firm_id);
    else if (r.is_new_firm) firm_choice = "new";
    return {
        firm_choice,
        new_firm_name: p.firm_name ?? "",
        date: todayLocal(),
        contact_name: p.contact_name ?? "",
        contact_role: p.contact_role ?? "",
        outcome: p.outcome,
        reason: p.reason ?? "",
        next_action: p.next_action ?? "",
        follow_up_date: p.follow_up_date ?? "",
    };
}

// Sends JSON with POST and returns the reply or throws status and error
async function postJSON(url: string, payload: unknown) {
    const res = await fetch(url, {
        method: "POST",
        headers: {"Content-type": "application/json"},
        body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${body ? JSON.stringify(body): "non-JSON response"}`);
    }
    return body;
}

export default function NewCall({onSaved}: {onSaved: () => void}) {
    const [notes, setNotes] = useState("");
    const [draft, setDraft] = useState<Draft | null>(null);
    const [firms, setFirms] = useState<Firm[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedId, setSavedId] = useState<number | null>(null);

    useEffect(() => {
        async function loadFirms() {
            try{
                const res = await fetch(`${API}/firms/`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setFirms(await res.json());
            } catch (err) {
                setError(String(err))
            }
        }
        loadFirms();
    }, []);

    // Changes one field of the draft, having a new object so React sees the change
    function update(field: keyof Draft, value: string) {
        if (draft) setDraft({ ...draft, [field]: value });
    }


async function handleParse() {
    setBusy(true);
    setError(null);
    setDraft(null);
    setSavedId(null);

    try {
      const body: ParseResponse = await postJSON(`${API}/calls/parse/`, { notes });
      setDraft(toDraft(body));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  
}

    async function handleSave() {
        if (!draft) return;
        setBusy(true);
        setError(null);
        try {
        let firmId = Number(draft.firm_choice);
        if (draft.firm_choice === "new") {
            const firm: Firm = await postJSON(`${API}/firms/`, { name: draft.new_firm_name });
            // Two separate writes. If the call POST below fails, this firm already exists.
            // Pointing the picker at it means clicking Save again won't create a duplicate.
            setFirms([...firms, firm]);
            setDraft({ ...draft, firm_choice: String(firm.id) });
            firmId = firm.id;
        }
        const saved = await postJSON(`${API}/calls/`, {
            firm: firmId,
            date: draft.date,
            contact_name: draft.contact_name,
            contact_role: draft.contact_role,
            outcome: draft.outcome,
            reason: draft.reason,
            next_action: draft.next_action,
            follow_up_date: draft.follow_up_date || null,
            raw_notes: notes,
        });
        setSavedId(saved.id);
        onSaved();
        setDraft(null);
        setNotes("");
        } catch (err) {
        setError(String(err));
        } finally {
        setBusy(false);
        }
    }

    const canSave = draft !== null &&
     draft.date !== "" &&
     (draft.firm_choice === "new"
        ? draft.new_firm_name.trim() !== ""
        : draft.firm_choice !== ""
     );

    return (
        <section>
        <h2>New call</h2>
        <textarea
            rows={5}
            cols={60}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste rough call notes"
        />
        <br />
        <button onClick={handleParse} disabled={busy || notes.trim() === ""}>
            {busy ? "Working..." : "Parse"}
        </button>
        {error && <p>Failed: {error}</p>}
        {savedId !== null && <p>Saved call #{savedId}.</p>}

        {draft && (
            <div>
            <h3>Check before saving</h3>
            <label>
                Firm{" "}
                <select value={draft.firm_choice} onChange={(e) => update("firm_choice", e.target.value)}>
                <option value="">-- pick a firm --</option>
                {firms.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                    {f.name}
                    </option>
                ))}
                <option value="new">+ New firm</option>
                </select>
            </label>
            {draft.firm_choice === "new" && (
                <label>
                {" "}New firm name{" "}
                <input value={draft.new_firm_name} onChange={(e) => update("new_firm_name", e.target.value)} />
                </label>
            )}
            <br />
            <label>
                Date <input type="date" value={draft.date} onChange={(e) => update("date", e.target.value)} />
            </label>
            <br />
            <label>
                Contact <input value={draft.contact_name} onChange={(e) => update("contact_name", e.target.value)} />
            </label>
            <br />
            <label>
                Role <input value={draft.contact_role} onChange={(e) => update("contact_role", e.target.value)} />
            </label>
            <br />
            <label>
                Outcome{" "}
                <select value={draft.outcome} onChange={(e) => update("outcome", e.target.value)}>
                <option value="booked">Booked</option>
                <option value="callback">Callback</option>
                <option value="not_interested">Not interested</option>
                <option value="wrong_person">Wrong person</option>
                <option value="voicemail">Voicemail</option>
                <option value="other">Other</option>
                </select>
            </label>
            <br />
            <label>
                Reason <input value={draft.reason} onChange={(e) => update("reason", e.target.value)} />
            </label>
            <br />
            <label>
                Next action <input value={draft.next_action} onChange={(e) => update("next_action", e.target.value)} />
            </label>
            <br />
            <label>
                Follow-up{" "}
                <input type="date" value={draft.follow_up_date} onChange={(e) => update("follow_up_date", e.target.value)} />
            </label>
            {draft.next_action !== "" && draft.follow_up_date === "" && (
                <p>Next action has no follow-up date, so this call won't show in the due list.</p>
            )}
            <br />
            <button onClick={handleSave} disabled={busy || !canSave}>
                {busy ? "Saving..." : "Save"}
            </button>
            </div>
        )}
        </section>
    );
}
     
