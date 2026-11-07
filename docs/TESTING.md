# Testing Strategy

Tests are implemented in `test/index.test.ts` using Vitest, covering the public API and edge cases:

- **Sorting**: Validates stable multi-column sorting, index tie-breaking, and null/undefined/NaN handling.
- **Filtering**: Verifies all 10 operators (`contains`, `between`, `in`, etc.) including empty value behavior (`isEmpty`, `notEquals`).
- **View Transformation**: Ensures `applyView` correctly filters then sorts, returning original indices.
- **Virtual Scrolling**: Tests boundary math for windowing, ensuring `start`/`end` indices and `offsetTop` are correct.
- **Validation**: Confirms `GridError` is thrown for invalid parameters, duplicate columns, or exceeding hard limits.
- **Immutability**: Verifies that input arrays remain unmutated by using `Object.freeze`.