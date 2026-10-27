/*
Loads calls from Django and shows them in a table, filtered by outcome.

Dropdown changes `outcome` state -> React renders -> useEffect sees outcome change ->
-> fetches /api/calls/?outcome= -> setCalls(data) stores the rows -> React re-renders
*/

import {useEffect, useState} from "react";
import type {Call, Outcome} from "./types";

const API_URL = "http://localhost:8000/api/calls/";

export default function CallList({refreshKey}: {refreshKey:number}) {
    const [calls, setCalls] = useState<Call[]>([]); //calls is current value and setCalls replaces the value and triggers re-render
    const [error, setError] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<Outcome | "">(""); // "" means all

    useEffect(() => {
        let ignore = false; 
        async function load() {
            try{
                setError(null);
                const url = outcome ? `${API_URL}?outcome=${outcome}` : API_URL;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data: Call[] = await res.json();
                setCalls(data);
                if (!ignore) setCalls(data)
            } catch(err) {
                if (!ignore) setError(String(err))
            }
        }
        load();
        return () => {
            ignore = true;
        }
    }, [outcome, refreshKey]);

    if (error) return <p>Failed: {error}</p>;

    return (
        <>
            <select value = {outcome} onChange={(e) => setOutcome(e.target.value as Outcome | "" )} >
                <option value="">All</option>
                <option value="booked">Booked</option>
                <option value="callback">Callback</option>
                <option value="not_interested">Not interested</option>
                <option value="wrong_person">Wrong person</option>
                <option value="voicemail">Voicemail</option>
                <option value="other">Other</option>
            </select>

            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Firm</th>
                        <th>Contact</th>
                        <th>Outcome</th>
                        <th>Follow-up</th>
                        <th>Next action</th>
                    </tr>
                </thead>
                <tbody>
                    {calls.map((call) => (
                        <tr key={call.id}>
                            <td>{call.date}</td>
                            <td>{call.firm_name}</td>
                            <td>{call.contact_name || "-"}</td>
                            <td>{call.outcome}</td>
                            <td>{call.follow_up_date ?? "no date"}</td>
                            <td>{call.next_action || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
        </>

    );
}
