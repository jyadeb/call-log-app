/*
Describes one call as Django sends it, understanding that "this JSON is a list" and every call function
is checked against this description. Dates arrive as strings like "2026-10-24" and not Date objects

Django JSON -> fetch -> res.json() -> treated as Call[] in CallList
*/

export type Outcome = "not_interested" | "callback" | "booked" | "wrong_person" | "voicemail" | "other";

export type Call = {
    id: number;
    firm: number;
    firm_name: string;
    date: string;
    contact_name: string;
    contact_role: string;
    outcome: Outcome;
    reason: string;
    next_action: string;
    follow_up_date: string | null;
    raw_notes: string;
};
