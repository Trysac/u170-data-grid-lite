# Project Objective

To provide a headless, framework-independent core for tabular data manipulation with strict, deterministic behaviors.

## Scope
- Stable multi-column sorting (nulls last in both directions).
- Ten typed filter operators (`equals`, `notEquals`, `contains`, `gt`, `gte`, `lt`, `lte`, `between`, `in`, `isEmpty`).
- View transformations (sorting/filtering) that return mapped source indices.
- Fixed-height virtual scrolling window mathematics.

## Out of Scope
- UI rendering or framework bindings (React, Vue, etc.).
- Variable row heights.
- Column resizing, grouping, row editing, or remote pagination.

## Factory run u170 (measured from API usage)

| Phase | Model | Batch | Input | Output | Cache write | Cache read | Cost (USD) |
|---|---|---|---|---|---|---|---|
| generation | gemini-3.8-flash | yes | 4554 | 52095 | 0 | 0 | 0.0994 |
| audit | gemini-3.1-flash-lite | no | 43388 | 376 | 0 | 69228 | 0.0131 |
| docs | gemini-3.1-flash-lite | no | 14284 | 1250 | 0 | 0 | 0.0054 |

Total: $0.1180. Prices: Anthropic list prices.
