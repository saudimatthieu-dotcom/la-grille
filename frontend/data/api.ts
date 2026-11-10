// Every call to our server goes through these two functions: the address and the JSON plumbing live here only.
// Both give back the server's answer ({ result: true, … } or { result: false, error }) — the screens decide what to show
const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_ADRESS;

// The login token as Redux holds it: null when logged out
export type Token = string | null;

// Reads something: GET
export function load(path: string) {
  return fetch(`${BASE_URL}${path}`).then((response) => response.json());
}

// Saves something: POST (create), PUT (change) or DELETE
export function send(method: "POST" | "PUT" | "DELETE", path: string, body: object) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((response) => response.json());
}
