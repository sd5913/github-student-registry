// A student ID here is the tail of a PolyU ID: its last four digits plus the
// trailing letter, which is the form the cohort roster files record ("5668G").
// Students type only the four digits; the fixed parts are supplied for them.
export const STUDENT_ID = /^[0-9]{4}G$/;

/** Turn anything a student might type into the stored `5668G` form. */
export function normalizeStudentId(input: string): string {
  const compact = input.replace(/[\s-]/g, '').toUpperCase();
  return /^[0-9]{4}$/.test(compact) ? `${compact}G` : compact;
}

/**
 * Read a `.cohort` file into a lookup set. Throws on a duplicate or a
 * malformed entry so a bad roster fails the build rather than quietly
 * turning away a student whose ID was mistyped in the file.
 */
export function parseRoster(text: string): Set<string> {
  const ids = text.split(/\r?\n/).map((line) => line.trim().toUpperCase()).filter(Boolean);
  for (const id of ids) {
    if (!STUDENT_ID.test(id)) throw new Error(`Roster entry is not four digits plus G: ${id}`);
  }
  const roster = new Set(ids);
  if (roster.size !== ids.length) {
    const seen = new Set<string>();
    const duplicate = ids.find((id) => seen.size === seen.add(id).size);
    throw new Error(`Roster contains a duplicate student ID: ${duplicate}`);
  }
  return roster;
}
