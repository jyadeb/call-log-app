/*
App: the root component main.tsx renders, holding the page title and call list
*/

import CallList from "./CallList";

export default function App() {
  return(
    <main>
      <h1>Call Log</h1>
      <CallList />
    </main>
  );
}