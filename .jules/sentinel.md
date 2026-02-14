## 2024-05-24 - Integer Precision & Validation
**Vulnerability:** Input validation for hex coordinates (`isValidHexId`) accepted unsafe integers (e.g. `2^53 + 1`) due to JavaScript's floating point precision loss during parsing. The precision loss effectively "corrected" the unsafe input into a safe but incorrect value, bypassing logical checks.
**Learning:** `JSON.parse` or `Number()` conversion happens *before* your logic sees the data. If the input format allows numbers larger than `MAX_SAFE_INTEGER`, the runtime will silently modify them. Logic like `q + r + s === 0` is insufficient if `q` has already been altered by precision loss.
**Prevention:** Always use `Number.isSafeInteger()` when parsing numbers from external or untrusted sources (like URL params or user input) that are expected to be integers, especially when those numbers are used as IDs or logic keys.

## 2025-02-12 - ReDoS/DoS via Regex
**Vulnerability:** Regex-based sanitization in `stripHtml` scanned inputs O(N) or worse (iterative) without length limits. Extremely large inputs (10^6+ chars) could cause DoS.
**Learning:** Regex performance on untrusted input is unpredictable without constraints. Iterative regex usage amplifies the risk.
**Prevention:** Always enforce strict maximum length limits on inputs *before* passing them to regex-based processing functions.

## 2025-02-12 - Partial Tag Injection via Truncation
**Vulnerability:** Truncating strings to a fixed length can split HTML tags (e.g. `<script>` becomes `<scrip`), which bypasses regex-based sanitizers that expect complete tags but might be executed by browsers or reconstructed later.
**Learning:** Security controls like length limits must be "sanitization-aware." Naive truncation is dangerous when combined with structured data like HTML.
**Prevention:** When truncating, check for and remove trailing partial structures (like open tags) to fail safe.
