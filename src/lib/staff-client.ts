// Client-only. Saves that need a staff member (stock counts, buying supplies, the starting balance)
// go through staffFetch: if the server asks for the staff PIN, the PIN pad opens over the page,
// and once the right PIN is typed the same save is sent again. Nothing else on the page changes.

type AskForPin = () => Promise<boolean>;

let ask: AskForPin | null = null;
let asking: Promise<boolean> | null = null; // two saves refused at once share one PIN pad

/** The PIN pad (StaffPin, mounted once in the layout) registers itself here. */
export function setPinAsker(fn: AskForPin | null): void {
  ask = fn;
}

function askOnce(): Promise<boolean> {
  if (!ask) return Promise.resolve(false);
  return (asking ??= ask().finally(() => (asking = null)));
}

/** Like fetch, but a "staff PIN needed" answer shows the PIN pad and then tries once more. */
export async function staffFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;
  const body = (await res
    .clone()
    .json()
    .catch(() => null)) as { staff?: boolean } | null;
  if (!body?.staff) return res;
  return (await askOnce()) ? fetch(input, init) : res;
}
