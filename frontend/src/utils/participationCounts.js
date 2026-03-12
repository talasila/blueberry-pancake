/**
 * Derive per-item unique rater counts from a ratings array.
 * @param {Array<{itemId: string, email: string}>} ratings - Full ratings array from the API
 * @returns {Record<number, number>} Map of itemId → unique rater count
 */
export function deriveItemRaterCounts(ratings) {
  if (!ratings || ratings.length === 0) return {};

  const countsByItem = {};

  for (const r of ratings) {
    if (!r.email) continue;
    const id = parseInt(r.itemId, 10);
    if (isNaN(id)) continue;
    if (!countsByItem[id]) countsByItem[id] = new Set();
    countsByItem[id].add(r.email.trim().toLowerCase());
  }

  const result = {};
  for (const [id, emails] of Object.entries(countsByItem)) {
    result[Number(id)] = emails.size;
  }
  return result;
}
