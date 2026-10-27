/*
App: The root component where NewCall and CallList are connected, owns the refreshKey
NewCall saves -> calls onSaved() -> refreshKey + 1 -> App re-renders ->
-> CallList receives new refreshKey -> its effect re-runs -> list refetches
*/

import {useState} from "react";
import CallList from "./CallList";
import NewCall from "./NewCall";

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  
  return(
    <main>
      <h1>Call Log</h1>
      <NewCall onSaved={() => setRefreshKey(refreshKey + 1)} />
      <CallList refreshKey={refreshKey}/>
    </main>
  );
}