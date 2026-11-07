/**
 * Headless data grid core: stable multi-column sort with nulls last,
 * ten typed filter operators, index-preserving views, and fixed-height virtual scrolling.
 *
 * @packageDocumentation
 */
/**
 * Named limits enforcing safe resource usage on untrusted inputs.
 */
export const MAX_ROWS_LIMIT = 10_000_000;
export const MAX_COLUMNS_LIMIT = 10_000;
export const MAX_SORT_SPECS_LIMIT = 100;
export const MAX_FILTERS_LIMIT = 1_000;
/**
 * Error class thrown for invalid grid operations and configurations.
 */
export class GridError extends Error {
    code;
    constructor(code, message) {
        const truncated = message.length > 200 ? `${message.slice(0, 197)}...` : message;
        super(truncated);
        this.name = "GridError";
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
const VALID_OPS = new Set([
    "equals",
    "notEquals",
    "contains",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "in",
    "isEmpty",
]);
/**
 * Checks if a value is considered empty.
 * Empty values are null, undefined, '', NaN, invalid Dates, or non-Date values for date columns.
 */
function isEmpty(value, colType) {
    if (value === null || value === undefined || value === "") {
        return true;
    }
    if (typeof value === "number" && Number.isNaN(value)) {
        return true;
    }
    if (value instanceof Date && Number.isNaN(value.getTime())) {
        return true;
    }
    if (colType === "date" && !(value instanceof Date)) {
        return true;
    }
    return false;
}
/**
 * Checks equality using Object.is, comparing Date instances by getTime().
 */
function isEqual(a, b) {
    if (a instanceof Date && b instanceof Date) {
        const ta = a.getTime();
        const tb = b.getTime();
        if (Number.isNaN(ta) && Number.isNaN(tb)) {
            return true;
        }
        return ta === tb;
    }
    return Object.is(a, b);
}
/**
 * Default comparator for primitive types without locale dependency.
 */
function defaultCompare(a, b, type) {
    switch (type) {
        case "string": {
            const sa = String(a);
            const sb = String(b);
            return sa < sb ? -1 : sa > sb ? 1 : 0;
        }
        case "number": {
            const na = a;
            const nb = b;
            return na < nb ? -1 : na > nb ? 1 : 0;
        }
        case "date": {
            const ta = a instanceof Date ? a.getTime() : Number.NaN;
            const tb = b instanceof Date ? b.getTime() : Number.NaN;
            return ta < tb ? -1 : ta > tb ? 1 : 0;
        }
        case "boolean": {
            const ba = a ? 1 : 0;
            const bb = b ? 1 : 0;
            return ba - bb;
        }
    }
}
/**
 * Compares two column values using custom compare or default type comparator.
 */
function compareColumn(a, b, col) {
    if (col.compare) {
        const res = col.compare(a, b);
        return Number.isNaN(res) ? 0 : res;
    }
    return defaultCompare(a, b, col.type);
}
/**
 * Validates column definitions and indexes them by id.
 */
function validateColumns(columns) {
    if (!Array.isArray(columns)) {
        throw new GridError("unknown_column", "columns must be an array");
    }
    if (columns.length > MAX_COLUMNS_LIMIT) {
        throw new GridError("unknown_column", "Column count exceeds maximum limit");
    }
    const colMap = new Map();
    for (const col of columns) {
        if (!col ||
            typeof col.id !== "string" ||
            typeof col.accessor !== "function" ||
            (col.type !== "string" &&
                col.type !== "number" &&
                col.type !== "date" &&
                col.type !== "boolean")) {
            throw new GridError("unknown_column", `Invalid column definition: ${String(col?.id)}`);
        }
        colMap.set(col.id, col);
    }
    return colMap;
}
/**
 * Validates sort specifications before any row evaluation.
 */
function validateSort(sort, colMap) {
    if (!Array.isArray(sort)) {
        throw new GridError("invalid_sort", "sort must be an array");
    }
    if (sort.length > MAX_SORT_SPECS_LIMIT) {
        throw new GridError("invalid_sort", "Sort specifications count exceeds limit");
    }
    const seen = new Set();
    for (const s of sort) {
        if (!s || typeof s !== "object" || typeof s.column !== "string") {
            throw new GridError("invalid_sort", "Sort item must be an object with column name");
        }
        if (!colMap.has(s.column)) {
            throw new GridError("unknown_column", `Unknown column in sort: ${s.column}`);
        }
        if (s.direction !== "asc" && s.direction !== "desc") {
            throw new GridError("invalid_sort", `Invalid sort direction: ${String(s.direction)}`);
        }
        if (seen.has(s.column)) {
            throw new GridError("invalid_sort", `Duplicate column in sort: ${s.column}`);
        }
        seen.add(s.column);
    }
}
/**
 * Validates filter specifications before any row evaluation.
 */
function validateFilters(filters, colMap) {
    if (!Array.isArray(filters)) {
        throw new GridError("invalid_filter", "filters must be an array");
    }
    if (filters.length > MAX_FILTERS_LIMIT) {
        throw new GridError("invalid_filter", "Filter count exceeds limit");
    }
    for (const f of filters) {
        if (!f || typeof f !== "object" || typeof f.column !== "string") {
            throw new GridError("invalid_filter", "Filter must be an object with column name");
        }
        if (!colMap.has(f.column)) {
            throw new GridError("unknown_column", `Unknown column in filter: ${f.column}`);
        }
        if (!VALID_OPS.has(f.op)) {
            throw new GridError("invalid_filter", `Invalid filter op: ${String(f.op)}`);
        }
        if (f.op === "contains" && typeof f.value !== "string") {
            throw new GridError("invalid_filter", "Filter 'contains' requires a string value");
        }
        if (f.op === "between" && (!Array.isArray(f.value) || f.value.length !== 2)) {
            throw new GridError("invalid_filter", "Filter 'between' requires an array of exactly two values");
        }
        if (f.op === "in" && !Array.isArray(f.value)) {
            throw new GridError("invalid_filter", "Filter 'in' requires an array value");
        }
    }
}
/**
 * Tests if a row matches a single filter.
 */
function matchesFilter(row, filter, col) {
    const val = col.accessor(row);
    const valEmpty = isEmpty(val, col.type);
    if (valEmpty) {
        if (filter.op === "isEmpty") {
            return true;
        }
        if (filter.op === "notEquals") {
            return !isEqual(val, filter.value);
        }
        return false;
    }
    switch (filter.op) {
        case "isEmpty":
            return false;
        case "equals":
            return isEqual(val, filter.value);
        case "notEquals":
            return !isEqual(val, filter.value);
        case "contains":
            return String(val)
                .toLowerCase()
                .includes(filter.value.toLowerCase());
        case "in": {
            const list = filter.value;
            return list.some((target) => isEqual(val, target));
        }
        case "between": {
            const [low, high] = filter.value;
            let min = low;
            let max = high;
            if (compareColumn(min, max, col) > 0) {
                min = high;
                max = low;
            }
            return compareColumn(val, min, col) >= 0 && compareColumn(val, max, col) <= 0;
        }
        case "gt":
            return compareColumn(val, filter.value, col) > 0;
        case "gte":
            return compareColumn(val, filter.value, col) >= 0;
        case "lt":
            return compareColumn(val, filter.value, col) < 0;
        case "lte":
            return compareColumn(val, filter.value, col) <= 0;
    }
}
/**
 * Applies sort and filter definitions to a dataset, returning both the filtered/sorted
 * rows and their original indices in the source array.
 *
 * Filters are evaluated first. Sorting decorates rows with their original index and uses
 * it as the final tie-breaker, guaranteeing deterministic and stable results.
 *
 * @param rows - Readonly array of rows. Not mutated.
 * @param columns - Column definitions.
 * @param view - Sort and filter configuration.
 * @returns Object with filtered/sorted rows and their original indices.
 * @throws {GridError} If columns, sort specs, or filter specs are invalid.
 */
export function applyView(rows, columns, view) {
    if (!Array.isArray(rows)) {
        throw new GridError("invalid_sort", "rows must be an array");
    }
    if (rows.length > MAX_ROWS_LIMIT) {
        throw new GridError("invalid_sort", "Row count exceeds maximum limit");
    }
    if (!view || typeof view !== "object") {
        throw new GridError("invalid_sort", "view must be an object");
    }
    const colMap = validateColumns(columns);
    validateSort(view.sort, colMap);
    validateFilters(view.filters, colMap);
    const filtered = [];
    const filterCount = view.filters.length;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let match = true;
        if (filterCount > 0) {
            for (let j = 0; j < filterCount; j++) {
                const f = view.filters[j];
                const col = colMap.get(f.column);
                if (!matchesFilter(row, f, col)) {
                    match = false;
                    break;
                }
            }
        }
        if (match) {
            filtered.push({ row, index: i });
        }
    }
    if (view.sort.length > 0) {
        filtered.sort((a, b) => {
            for (const s of view.sort) {
                const col = colMap.get(s.column);
                const valA = col.accessor(a.row);
                const valB = col.accessor(b.row);
                const emptyA = isEmpty(valA, col.type);
                const emptyB = isEmpty(valB, col.type);
                if (emptyA && emptyB) {
                    continue;
                }
                if (emptyA) {
                    return 1;
                }
                if (emptyB) {
                    return -1;
                }
                const cmp = compareColumn(valA, valB, col);
                if (cmp !== 0) {
                    return s.direction === "desc" ? -cmp : cmp;
                }
            }
            return a.index - b.index;
        });
    }
    return {
        rows: filtered.map((d) => d.row),
        indices: filtered.map((d) => d.index),
    };
}
/**
 * Sorts rows according to sort specifications, placing empty values last in both directions.
 *
 * @param rows - Readonly array of rows. Not mutated.
 * @param sort - Array of sort specifications.
 * @param columns - Column definitions.
 * @returns New sorted rows array.
 */
export function sortRows(rows, sort, columns) {
    return applyView(rows, columns, { sort, filters: [] }).rows;
}
/**
 * Filters rows according to filter specifications using AND conjunction.
 *
 * @param rows - Readonly array of rows. Not mutated.
 * @param filters - Array of filter specifications.
 * @param columns - Column definitions.
 * @returns New filtered rows array.
 */
export function filterRows(rows, filters, columns) {
    return applyView(rows, columns, { sort: [], filters }).rows;
}
/**
 * Calculates the visible slice indices and vertical scroll offset for fixed-height virtual scrolling.
 *
 * @param input - Virtual window geometry and scroll parameters.
 * @returns Calculated start index, end index, offsetTop, and totalHeight.
 * @throws {GridError} With code 'invalid_window' if geometry parameters are invalid.
 */
export function virtualWindow(input) {
    if (input == null || typeof input !== "object") {
        throw new GridError("invalid_window", "Window input must be an object");
    }
    const { rowCount, rowHeight, viewportHeight, scrollTop, overscan = 3 } = input;
    if (typeof rowCount !== "number" ||
        !Number.isFinite(rowCount) ||
        !Number.isInteger(rowCount) ||
        rowCount < 0 ||
        rowCount > MAX_ROWS_LIMIT) {
        throw new GridError("invalid_window", "rowCount must be a finite integer >= 0");
    }
    if (typeof rowHeight !== "number" || !Number.isFinite(rowHeight) || rowHeight <= 0) {
        throw new GridError("invalid_window", "rowHeight must be a finite number > 0");
    }
    if (typeof viewportHeight !== "number" ||
        !Number.isFinite(viewportHeight) ||
        viewportHeight < 0) {
        throw new GridError("invalid_window", "viewportHeight must be a finite number >= 0");
    }
    if (typeof scrollTop !== "number" || !Number.isFinite(scrollTop) || scrollTop < 0) {
        throw new GridError("invalid_window", "scrollTop must be a finite number >= 0");
    }
    if (typeof overscan !== "number" ||
        !Number.isFinite(overscan) ||
        !Number.isInteger(overscan) ||
        overscan < 0) {
        throw new GridError("invalid_window", "overscan must be an integer >= 0");
    }
    if (rowCount === 0) {
        return { start: 0, end: 0, offsetTop: 0, totalHeight: 0 };
    }
    const totalHeight = rowCount * rowHeight;
    const maxScroll = Math.max(0, totalHeight - viewportHeight);
    const clampedScrollTop = Math.min(Math.max(0, scrollTop), maxScroll);
    const first = Math.floor(clampedScrollTop / rowHeight);
    const visible = Math.ceil(viewportHeight / rowHeight);
    const start = Math.max(0, first - overscan);
    const end = Math.min(rowCount, first + visible + overscan);
    const offsetTop = start * rowHeight;
    return { start, end, offsetTop, totalHeight };
}
