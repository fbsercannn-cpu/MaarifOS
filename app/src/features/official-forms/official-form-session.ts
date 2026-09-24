import type { OfficialFormRecord } from "./official-form-record.ts";
let active: (() => Promise<OfficialFormRecord>) | undefined;
export function registerOfficialFormExportSession(prepare: () => Promise<OfficialFormRecord>): () => void {
  active = prepare;
  return () => { if (active === prepare) active = undefined; };
}
export async function prepareOfficialFormExport(): Promise<OfficialFormRecord | undefined> {
  return active?.();
}
