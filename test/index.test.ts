import { describe, expect, it } from "vitest";
import {
  applyView,
  type ColumnDef,
  type Filter,
  filterRows,
  GridError,
  MAX_COLUMNS_LIMIT,
  MAX_FILTERS_LIMIT,
  MAX_ROWS_LIMIT,
  MAX_SORT_SPECS_LIMIT,
  type SortSpec,
  sortRows,
  virtualWindow,
} from "../src/index.js";

describe("@trysac/data-grid-lite", () => {
  it("sortRows over values [3, 1, null, 2] of a 'number' column with [{ column: 'n', direction: 'asc' }] gives [1, 2, 3, null] and with 'desc' gives [3, 2, 1, null]", () => {
    const values = [3, 1, null, 2];
    const columns: ColumnDef<number | null>[] = [{ id: "n", type: "number", accessor: (r) => r }];
    const asc = sortRows(values, [{ column: "n", direction: "asc" }], columns);
    expect(asc).toEqual([1, 2, 3, null]);
    const desc = sortRows(values, [{ column: "n", direction: "desc" }], columns);
    expect(desc).toEqual([3, 2, 1, null]);
  });

  it("Rows [{city: 'B', age: 30}, {city: 'A', age: 20}, {city: 'A', age: 40}, {city: 'B', age: 30}] passed to applyView sorted by city 'asc' then age 'desc' return indices [2, 1, 0, 3], keeping input order for ties", () => {
    type Row = { city: string; age: number };
    const rows: Row[] = [
      { city: "B", age: 30 },
      { city: "A", age: 20 },
      { city: "A", age: 40 },
      { city: "B", age: 30 },
    ];
    const columns: ColumnDef<Row>[] = [
      { id: "city", type: "string", accessor: (r) => r.city },
      { id: "age", type: "number", accessor: (r) => r.age },
    ];
    const view = {
      sort: [
        { column: "city", direction: "asc" as const },
        { column: "age", direction: "desc" as const },
      ],
      filters: [],
    };
    const result = applyView(rows, columns, view);
    expect(result.indices).toEqual([2, 1, 0, 3]);
    expect(result.rows).toEqual([
      { city: "A", age: 40 },
      { city: "A", age: 20 },
      { city: "B", age: 30 },
      { city: "B", age: 30 },
    ]);
  });

  it("filterRows with { column: 'name', op: 'contains', value: 'an' } over names ['Ann', 'Dan', 'Bob', 'ANNA'] keeps ['Ann', 'Dan', 'ANNA']; 'between' [2, 4] is inclusive; 'in' ['a', 'b'] keeps exact matches; 'isEmpty' matches null, undefined and ''", () => {
    const names = ["Ann", "Dan", "Bob", "ANNA"];
    const nameCols: ColumnDef<string>[] = [{ id: "name", type: "string", accessor: (r) => r }];
    const kept = filterRows(names, [{ column: "name", op: "contains", value: "an" }], nameCols);
    expect(kept).toEqual(["Ann", "Dan", "ANNA"]);

    const numbers = [1, 2, 3, 4, 5];
    const numCols: ColumnDef<number>[] = [{ id: "num", type: "number", accessor: (r) => r }];
    const betweenKept = filterRows(
      numbers,
      [{ column: "num", op: "between", value: [2, 4] }],
      numCols,
    );
    expect(betweenKept).toEqual([2, 3, 4]);

    const letters = ["a", "b", "c", "d"];
    const letterCols: ColumnDef<string>[] = [{ id: "ch", type: "string", accessor: (r) => r }];
    const inKept = filterRows(letters, [{ column: "ch", op: "in", value: ["a", "b"] }], letterCols);
    expect(inKept).toEqual(["a", "b"]);

    const emptyCandidates = [null, undefined, "", "value"];
    const emptyCols: ColumnDef<unknown>[] = [{ id: "val", type: "string", accessor: (r) => r }];
    const emptyKept = filterRows(emptyCandidates, [{ column: "val", op: "isEmpty" }], emptyCols);
    expect(emptyKept).toEqual([null, undefined, ""]);
  });

  it("A 'date' column sorts Date values by getTime(), and an invalid Date sorts with nulls at the end in both directions; NaN in a 'number' column also sorts last", () => {
    const d1 = new Date(1000);
    const d2 = new Date(2000);
    const dInvalid = new Date(Number.NaN);
    const dNull = null;
    const dateRows = [d2, dInvalid, dNull, d1];
    const dateCols: ColumnDef<Date | null>[] = [{ id: "d", type: "date", accessor: (r) => r }];

    const asc = sortRows(dateRows, [{ column: "d", direction: "asc" }], dateCols);
    expect(asc).toEqual([d1, d2, dInvalid, dNull]);

    const desc = sortRows(dateRows, [{ column: "d", direction: "desc" }], dateCols);
    expect(desc).toEqual([d2, d1, dInvalid, dNull]);

    const numRows = [3, Number.NaN, 1, 2];
    const numCols: ColumnDef<number>[] = [{ id: "n", type: "number", accessor: (r) => r }];
    const numAsc = sortRows(numRows, [{ column: "n", direction: "asc" }], numCols);
    expect(numAsc).toEqual([1, 2, 3, Number.NaN]);

    const numDesc = sortRows(numRows, [{ column: "n", direction: "desc" }], numCols);
    expect(numDesc).toEqual([3, 2, 1, Number.NaN]);
  });

  it("virtualWindow({ rowCount: 1000, rowHeight: 20, viewportHeight: 200, scrollTop: 1000, overscan: 3 }) deep-equals { start: 47, end: 63, offsetTop: 940, totalHeight: 20000 }, scrollTop 1_000_000 deep-equals { start: 987, end: 1000, offsetTop: 19740, totalHeight: 20000 }, and rowCount 0 gives all zeros", () => {
    const win1 = virtualWindow({
      rowCount: 1000,
      rowHeight: 20,
      viewportHeight: 200,
      scrollTop: 1000,
      overscan: 3,
    });
    expect(win1).toEqual({
      start: 47,
      end: 63,
      offsetTop: 940,
      totalHeight: 20000,
    });

    const win2 = virtualWindow({
      rowCount: 1000,
      rowHeight: 20,
      viewportHeight: 200,
      scrollTop: 1_000_000,
      overscan: 3,
    });
    expect(win2).toEqual({
      start: 987,
      end: 1000,
      offsetTop: 19740,
      totalHeight: 20000,
    });

    const winZero = virtualWindow({
      rowCount: 0,
      rowHeight: 20,
      viewportHeight: 200,
      scrollTop: 1000,
      overscan: 3,
    });
    expect(winZero).toEqual({
      start: 0,
      end: 0,
      offsetTop: 0,
      totalHeight: 0,
    });
  });

  it("rowHeight 0, a negative scrollTop or a non-finite viewportHeight throws GridError with code 'invalid_window', an unknown column id throws 'unknown_column', op 'like' throws 'invalid_filter' and 'between' with one value throws 'invalid_filter'", () => {
    expect(() =>
      virtualWindow({
        rowCount: 10,
        rowHeight: 0,
        viewportHeight: 100,
        scrollTop: 0,
      }),
    ).toThrow(GridError);
    try {
      virtualWindow({
        rowCount: 10,
        rowHeight: 0,
        viewportHeight: 100,
        scrollTop: 0,
      });
    } catch (e) {
      expect(e instanceof GridError).toBe(true);
      expect((e as GridError).code).toBe("invalid_window");
    }

    try {
      virtualWindow({
        rowCount: 10,
        rowHeight: 20,
        viewportHeight: 100,
        scrollTop: -10,
      });
    } catch (e) {
      expect((e as GridError).code).toBe("invalid_window");
    }

    try {
      virtualWindow({
        rowCount: 10,
        rowHeight: 20,
        viewportHeight: Number.POSITIVE_INFINITY,
        scrollTop: 0,
      });
    } catch (e) {
      expect((e as GridError).code).toBe("invalid_window");
    }

    const cols: ColumnDef<number>[] = [{ id: "x", type: "number", accessor: (r) => r }];
    try {
      sortRows([1, 2], [{ column: "missing", direction: "asc" }], cols);
    } catch (e) {
      expect((e as GridError).code).toBe("unknown_column");
    }

    try {
      filterRows(
        [1, 2],
        [{ column: "x", op: "like" as unknown as Filter["op"], value: "%" }],
        cols,
      );
    } catch (e) {
      expect((e as GridError).code).toBe("invalid_filter");
    }

    try {
      filterRows([1, 2], [{ column: "x", op: "between", value: [1] }], cols);
    } catch (e) {
      expect((e as GridError).code).toBe("invalid_filter");
    }
  });

  it("applyView over rows ['b', 'a', 'c'] with a 'string' column v (accessor (r) => r) and sort [{ column: 'v', direction: 'asc' }] returns indices [1, 0, 2], and frozen input arrays (Object.freeze) are accepted and never mutated", () => {
    const rows = Object.freeze(["b", "a", "c"]);
    const cols = Object.freeze([
      Object.freeze({
        id: "v",
        type: "string" as const,
        accessor: (r: string) => r,
      }),
    ]);
    const view = Object.freeze({
      sort: Object.freeze([{ column: "v", direction: "asc" as const }]),
      filters: Object.freeze([]),
    });
    const result = applyView(rows, cols, view);
    expect(result.indices).toEqual([1, 0, 2]);
    expect(result.rows).toEqual(["a", "b", "c"]);
    expect(rows[0]).toBe("b");
    expect(rows[1]).toBe("a");
    expect(rows[2]).toBe("c");
  });

  it("With filters and sort together, applyView filters first and then sorts, so rows with value 5, 1, 3, 2 filtered by 'gte' 2 and sorted 'asc' return indices [3, 2, 0]", () => {
    const rows = [5, 1, 3, 2];
    const columns: ColumnDef<number>[] = [{ id: "val", type: "number", accessor: (r) => r }];
    const view = {
      sort: [{ column: "val", direction: "asc" as const }],
      filters: [{ column: "val", op: "gte" as const, value: 2 }],
    };
    const result = applyView(rows, columns, view);
    expect(result.indices).toEqual([3, 2, 0]);
    expect(result.rows).toEqual([2, 3, 5]);
  });

  it("handles boolean columns and sorts false before true", () => {
    const rows = [true, false, true, false];
    const cols: ColumnDef<boolean>[] = [{ id: "b", type: "boolean", accessor: (r) => r }];
    const asc = sortRows(rows, [{ column: "b", direction: "asc" }], cols);
    expect(asc).toEqual([false, false, true, true]);

    const desc = sortRows(rows, [{ column: "b", direction: "desc" }], cols);
    expect(desc).toEqual([true, true, false, false]);
  });

  it("supports all filter operators with non-empty and empty values", () => {
    const items = [10, 20, 30, null];
    const cols: ColumnDef<number | null>[] = [{ id: "num", type: "number", accessor: (r) => r }];

    expect(filterRows(items, [{ column: "num", op: "equals", value: 20 }], cols)).toEqual([20]);
    expect(filterRows(items, [{ column: "num", op: "notEquals", value: 20 }], cols)).toEqual([
      10,
      30,
      null,
    ]);
    expect(filterRows(items, [{ column: "num", op: "gt", value: 15 }], cols)).toEqual([20, 30]);
    expect(filterRows(items, [{ column: "num", op: "lt", value: 25 }], cols)).toEqual([10, 20]);
    expect(filterRows(items, [{ column: "num", op: "lte", value: 20 }], cols)).toEqual([10, 20]);
  });

  it("supports inverted bounds in between filter", () => {
    const items = [10, 20, 30, 40];
    const cols: ColumnDef<number>[] = [{ id: "num", type: "number", accessor: (r) => r }];
    expect(filterRows(items, [{ column: "num", op: "between", value: [30, 15] }], cols)).toEqual([
      20, 30,
    ]);
  });

  it("supports custom comparators in columns", () => {
    const rows = ["apple", "Banana", "cherry"];
    const cols: ColumnDef<string>[] = [
      {
        id: "fruit",
        type: "string",
        accessor: (r) => r,
        compare: (a, b) => String(a).toLowerCase().localeCompare(String(b).toLowerCase()),
      },
    ];
    const sorted = sortRows(rows, [{ column: "fruit", direction: "asc" }], cols);
    expect(sorted).toEqual(["apple", "Banana", "cherry"]);
  });

  it("validates duplicate columns in sort and invalid sort direction", () => {
    const cols: ColumnDef<number>[] = [{ id: "a", type: "number", accessor: (r) => r }];
    expect(() =>
      sortRows(
        [1, 2],
        [
          { column: "a", direction: "asc" },
          { column: "a", direction: "desc" },
        ],
        cols,
      ),
    ).toThrowError(/Duplicate column in sort/);

    expect(() =>
      sortRows(
        [1, 2],
        [{ column: "a", direction: "up" as unknown as SortSpec["direction"] }],
        cols,
      ),
    ).toThrowError(/Invalid sort direction/);
  });

  it("validates filter value shapes and column associations", () => {
    const cols: ColumnDef<string>[] = [{ id: "text", type: "string", accessor: (r) => r }];
    expect(() =>
      filterRows(["a"], [{ column: "text", op: "contains", value: 123 }], cols),
    ).toThrowError(/Filter 'contains' requires a string/);

    expect(() => filterRows(["a"], [{ column: "text", op: "in", value: "a" }], cols)).toThrowError(
      /Filter 'in' requires an array/,
    );

    expect(() =>
      filterRows(["a"], [{ column: "text", op: "between", value: ["a", "b", "c"] }], cols),
    ).toThrowError(/Filter 'between' requires an array of exactly two/);

    expect(() =>
      filterRows(["a"], [{ column: "unknown", op: "equals", value: "a" }], cols),
    ).toThrow(GridError);
  });

  it("validates virtual window edge cases and defaults overscan to 3", () => {
    const winDefault = virtualWindow({
      rowCount: 100,
      rowHeight: 10,
      viewportHeight: 50,
      scrollTop: 0,
    });
    expect(winDefault.start).toBe(0);
    expect(winDefault.end).toBe(8);

    expect(() =>
      virtualWindow({
        rowCount: -1,
        rowHeight: 10,
        viewportHeight: 50,
        scrollTop: 0,
      }),
    ).toThrowError(/rowCount/);

    expect(() =>
      virtualWindow({
        rowCount: 10,
        rowHeight: 10,
        viewportHeight: -5,
        scrollTop: 0,
      }),
    ).toThrowError(/viewportHeight/);

    expect(() =>
      virtualWindow({
        rowCount: 10,
        rowHeight: 10,
        viewportHeight: 50,
        scrollTop: 0,
        overscan: -1,
      }),
    ).toThrowError(/overscan/);

    expect(() =>
      virtualWindow(null as unknown as Parameters<typeof virtualWindow>[0]),
    ).toThrowError(/Window input must be an object/);
  });

  it("enforces bounds and input limits", () => {
    expect(() =>
      applyView(
        null as unknown as readonly unknown[],
        [{ id: "x", type: "string", accessor: () => 1 }],
        { sort: [], filters: [] },
      ),
    ).toThrowError(/rows must be an array/);

    expect(() =>
      applyView([], null as unknown as readonly ColumnDef<unknown>[], {
        sort: [],
        filters: [],
      }),
    ).toThrowError(/columns must be an array/);

    expect(() =>
      applyView(
        [],
        [{ id: "x", type: "string", accessor: () => 1 }],
        null as unknown as {
          sort: [];
          filters: [];
        },
      ),
    ).toThrowError(/view must be an object/);

    const excessiveCols = new Array(MAX_COLUMNS_LIMIT + 1).fill(null).map((_, i) => ({
      id: `c_${i}`,
      type: "string" as const,
      accessor: () => "",
    }));
    expect(() => applyView([], excessiveCols, { sort: [], filters: [] })).toThrowError(
      /Column count exceeds maximum limit/,
    );

    const validCols = [{ id: "x", type: "string" as const, accessor: () => "" }];
    const excessiveSort = new Array(MAX_SORT_SPECS_LIMIT + 1).fill(null).map((_, i) => ({
      column: `x_${i}`,
      direction: "asc" as const,
    }));
    expect(() => applyView([], validCols, { sort: excessiveSort, filters: [] })).toThrowError(
      /Sort specifications count exceeds limit/,
    );

    const excessiveFilters = new Array(MAX_FILTERS_LIMIT + 1).fill(null).map((_, i) => ({
      column: `x_${i}`,
      op: "isEmpty" as const,
    }));
    expect(() => applyView([], validCols, { sort: [], filters: excessiveFilters })).toThrowError(
      /Filter count exceeds limit/,
    );

    expect(() =>
      virtualWindow({
        rowCount: MAX_ROWS_LIMIT + 1,
        rowHeight: 10,
        viewportHeight: 100,
        scrollTop: 0,
      }),
    ).toThrowError(/rowCount/);
  });

  it("truncates error message exceeding 200 characters", () => {
    const longMsg = "a".repeat(300);
    const err = new GridError("invalid_sort", longMsg);
    expect(err.message.length).toBe(200);
    expect(err.message.endsWith("...")).toBe(true);
  });
});
