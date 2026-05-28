# format
> Taxon-name and username format/normalization rules, comparison helpers.

## Test inventory
- cc-only: 2 files, 27 tests
- cc-openspec: 3 files, 32 tests (excluding `describe` blocks)

## cc-only-only scenarios
- Accepts hyphenated names like `"Sword-and-Sorcery"` (`taxonName.test.ts`).
- Accepts single-character digits and punctuation (`"1"`, `"?"`) (`taxonName.test.ts`).
- Accepts internal newline in taxon name (`"Line1\nLine2"`) (`taxonName.test.ts`).
- Rejects non-string inputs: `null`, `undefined`, number, object, array (`taxonName.test.ts`).
- `parseUsername(undefined)` and `parseUsername(null)` return null-user (distinct from malformed) (`username.test.ts`).
- `parseUsername("")` returns null-user, NOT malformed — empty string is the null user for usernames (`username.test.ts`).
- Three-way result distinction for username: `null` vs `valid` vs `malformed` (`username.test.ts`).

## cc-openspec-only scenarios
- Rejects leading non-breaking space (NBSP) as `leading-whitespace` (`taxon-name.test.ts`).
- Ambiguous boundary inputs (whitespace-only, both-ends whitespace) explicitly allowed to tag as EITHER `leading-whitespace` OR `trailing-whitespace` (`taxon-name.test.ts`, `username.test.ts`).
- `equalsCI` predicate exposed and tested directly as a standalone helper (`compare.test.ts`).
- `equalsCI` does NOT trim trailing whitespace — `"Fantasy"` vs `"Fantasy "` is not equal (`compare.test.ts`).
- `equalsCI` does NOT collapse internal whitespace — `"A B"` vs `"A  B"` is not equal (`compare.test.ts`).
- `equalsCI("", "")` returns true (`compare.test.ts`).
- `equalsCI` does not mutate inputs (`compare.test.ts`).
- Result-shape closure: success is `{ ok: true }` only; failure is `{ ok: false, reason: { tag, message } }` only — no extra keys, enforced via `Object.keys` enumeration (`username.test.ts`).
- `taxon-name` module re-exports `equalsCI` (module-surface assertion) (`taxon-name.test.ts`).
- Username empty string is rejected as `empty` (a failure tag), NOT silently treated as null user (`username.test.ts`). [See Divergent Expectations.]
- Whitespace-only username is rejected with a boundary tag, NOT silently null-user (`username.test.ts`). [See Divergent Expectations.]

## Divergent expectations
- **Empty-string username semantics (MATERIAL):** cc-only treats `parseUsername("")` as the null user (`{kind: "null"}`); cc-openspec treats `validateUsername("")` as a failure with tag `empty`. Same input → different outcome category (`username.test.ts` in both).
- **Null/undefined username inputs (MATERIAL surface area):** cc-only accepts `null`/`undefined` and maps them to null-user; cc-openspec's `validateUsername` API only takes strings (no null-handling tests) — cc-openspec moves null-user handling outside this module.
- **Whitespace-only username (MATERIAL):** cc-only classifies `" "`, `"   "`, `"\t"`, `"\n"` as `malformed`; cc-openspec classifies them as a boundary failure (`leading-whitespace` or `trailing-whitespace`). Both reject, but failure category differs (non-material per the reason-code rule, EXCEPT cc-only also explicitly asserts "not null" while cc-openspec asserts "not silently null-user" — same intent).
- **Non-string input handling:** cc-only explicitly rejects non-string inputs to `validateTaxonName` (`null`, number, object, array); cc-openspec does not test non-string inputs to the format validators (type-system-enforced rather than runtime-checked).

## Shared coverage
- Single non-whitespace character accepted as taxon name (`taxonName.test.ts` / `taxon-name.test.ts`).
- Multi-word name with internal single space accepted (`taxonName.test.ts` / `taxon-name.test.ts`).
- Internal tab accepted in taxon name (`taxonName.test.ts` / `taxon-name.test.ts`).
- Multiple internal spaces accepted in taxon name (`taxonName.test.ts` / `taxon-name.test.ts`).
- Empty string rejected as taxon name (`taxonName.test.ts` / `taxon-name.test.ts`).
- Leading space rejected (`taxonName.test.ts` / `taxon-name.test.ts`, `username.test.ts` x2).
- Trailing space rejected (`taxonName.test.ts` / `taxon-name.test.ts`, `username.test.ts` x2).
- Leading tab rejected (`taxonName.test.ts` / `taxon-name.test.ts`, `username.test.ts` x2).
- Trailing tab rejected (`taxonName.test.ts` / `taxon-name.test.ts`).
- Leading newline rejected (`taxonName.test.ts` / `taxon-name.test.ts`).
- Trailing newline rejected (`taxonName.test.ts` / `taxon-name.test.ts`, `username.test.ts` x2).
- Whitespace-only taxon name rejected (`taxonName.test.ts` / `taxon-name.test.ts`).
- Both-side whitespace rejected for taxon name and username (`taxonName.test.ts` / `taxon-name.test.ts`, `username.test.ts` x2).
- Internal whitespace allowed in username (`username.test.ts` x2).
- Simple username (`"alice"`) accepted (`username.test.ts` x2).
- Single-character username accepted (`username.test.ts` x2).
- Case-insensitive equality for taxon names: `"Fantasy" == "fantasy" == "FANTASY"` (`taxonName.test.ts` / `taxon-name.test.ts` via re-exported `equalsCI` and `compare.test.ts`).
- Case-insensitive equality for usernames: `"alice" == "ALICE"` (`username.test.ts` x2).
- Distinct strings unequal under CI compare (`taxonName.test.ts`, `username.test.ts` / `compare.test.ts`, `username.test.ts`).
- Whitespace is significant under CI compare — `"Epic Fantasy"` vs `"Epicfantasy"` not equal in cc-only; cc-openspec verifies the analogous property via `equalsCI` whitespace tests (`taxonName.test.ts` / `compare.test.ts`).
