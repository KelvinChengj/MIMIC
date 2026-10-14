import type { Tag } from "./data";
export type Sample = { value: number | null; ageMinutes: number };
export function decodeValues(
  payload: unknown,
  ids: string[],
  now = Date.now(),
): Record<string, Sample> {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("values" in payload) ||
    !payload.values ||
    typeof payload.values !== "object"
  )
    throw new Error("FDM 回傳格式不正確");
  const values = payload.values as Record<string, unknown>;
  return Object.fromEntries(
    ids.map((id) => {
      const item = values[id];
      if (
        !item ||
        typeof item !== "object" ||
        !("value" in item) ||
        typeof item.value !== "number" ||
        !Number.isFinite(item.value) ||
        !("ts" in item) ||
        typeof item.ts !== "number" ||
        !Number.isFinite(item.ts) ||
        item.ts > now + 60000
      )
        return [id, { value: null, ageMinutes: Infinity }];
      return [
        id,
        { value: item.value, ageMinutes: Math.max(0, (now - item.ts) / 60000) },
      ];
    }),
  );
}
export async function fetchFdmValues(
  tags: Tag[],
): Promise<Record<string, Sample>> {
  const ids = [...new Set(tags.map((t) => t.id))];
  const response = await fetch(
    `/api/fdm/values?tags=${encodeURIComponent(ids.join(","))}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new Error(`FDM HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.mode !== "live")
    throw new Error("後端尚未設定 FDM_API_URL，請先啟用正式資料源");
  return decodeValues(payload, ids);
}
