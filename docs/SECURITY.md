# Security Model

## Threat Model
- **Defended**: 
  - Resource exhaustion: Input sizes are strictly limited via `MAX_ROWS_LIMIT`, `MAX_COLUMNS_LIMIT`, `MAX_SORT_SPECS_LIMIT`, and `MAX_FILTERS_LIMIT`.
  - Code Injection: Logic relies on pure functions and predefined operators; no dynamic evaluation (eval, Function, regex) is performed on user inputs.
  - Error Leakage: Error messages are truncated to 200 characters.
- **Not Defended**:
  - Logic correctness of user-provided `accessor` functions.

## Resource Limits
- Rows: 10,000,000
- Columns: 10,000
- Sort Specs: 100
- Filters: 1,000