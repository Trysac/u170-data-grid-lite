# Architecture

`@trysac/data-grid-lite` provides a headless, framework-independent core for tabular data manipulation.

## Core Principles

1. **Pure Functions & Immutability**: All operations (`applyView`, `sortRows`, `filterRows`, `virtualWindow`) return new arrays without mutating inputs. Frozen arrays (`Object.freeze`) are supported.
2. **Nulls-Last Consistency**: Empty values (`null`, `undefined`, `''`, `NaN`, invalid dates) sort after non-empty values in both `'asc'` and `'desc'` directions. They only match `isEmpty` and `notEquals` filter operators.
3. **Deterministic Index Preservation**: When rows pass through `applyView`, each row is decorated with its original index. If multiple rows tie across all sort columns, their original index breaks the tie.
4. **Fixed-Height Virtual Scrolling**: Pure mathematical windowing calculates visible row ranges and vertical translate offsets given viewport geometry, clamping scroll positions cleanly within `[0, max(0, totalHeight - viewportHeight)]`.

## Error Model

All validation errors throw `GridError` with one of four stable error codes:

- `unknown_column`: Referenced column id not present in column definitions.
- `invalid_filter`: Unknown filter operator or malformed filter arguments.
- `invalid_sort`: Duplicate sort column, unknown direction, or malformed sort spec.
- `invalid_window`: Non-finite, non-integer, or negative dimensions in virtual window input.
