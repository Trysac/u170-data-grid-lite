# @trysac/data-grid-lite

Headless data grid core: stable multi-column sort with nulls last, ten typed filter operators, index-preserving views and fixed-height virtual scrolling windows. Every admin panel rebuilds table logic inside a UI framework, leading to testability issues, mutations, and incorrect edge-case handling. This library provides a framework-free, pure-function core for tabular data.

## Installation

```bash
npm install @trysac/data-grid-lite
```

## Usage Example

```ts
import { applyView, virtualWindow } from "@trysac/data-grid-lite";

const rows = [{ name: "Ada", score: 95 }, { name: "Bob", score: 82 }];
const cols = [{ id: "score", type: "number" as const, accessor: (r: (typeof rows)[0]) => r.score }];
const view = applyView(rows, cols, {
  sort: [{ column: "score", direction: "desc" }],
  filters: [{ column: "score", op: "gte", value: 85 }],
});
const win = virtualWindow({ rowCount: view.rows.length, rowHeight: 24, viewportHeight: 200, scrollTop: 0 });
```

## API Summary

### Core Functions
- `applyView<T>(rows, columns, view)`: Filters and sorts rows, returning `{ rows, indices }`.
- `sortRows<T>(rows, sort, columns)`: Sorts rows; stable with index tie-breaker.
- `filterRows<T>(rows, filters, columns)`: Filters rows using AND conjunction.
- `virtualWindow(input)`: Calculates scroll geometry `start`, `end`, `offsetTop`, `totalHeight`.

### Limits
- Rows: 10,000,000
- Columns: 10,000
- Sort specs: 100
- Filters: 1,000

### Errors
`GridError` throws with codes: `unknown_column`, `invalid_filter`, `invalid_window`, `invalid_sort`.

## Why not AG Grid or TanStack Table?
This library is a tiny, dependency-free, fully deterministic core. Unlike general-purpose tables, it enforces strict, predictable null-ordering and boundary rules suitable for high-performance, predictable data processing without the overhead of heavy UI frameworks.

## Security
See [docs/SECURITY.md](docs/SECURITY.md) for the threat model and resource limits.