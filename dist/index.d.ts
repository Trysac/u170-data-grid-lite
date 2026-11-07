/**
 * Headless data grid core: stable multi-column sort with nulls last,
 * ten typed filter operators, index-preserving views, and fixed-height virtual scrolling.
 *
 * @packageDocumentation
 */
/**
 * Supported column data types.
 */
export type ColumnType = "string" | "number" | "date" | "boolean";
/**
 * Definition of a grid column.
 */
export type ColumnDef<T> = {
    id: string;
    type: ColumnType;
    accessor: (row: T) => unknown;
    compare?: (a: unknown, b: unknown) => number;
};
/**
 * Direction for sorting rows.
 */
export type SortDirection = "asc" | "desc";
/**
 * Specification for sorting by a single column.
 */
export type SortSpec = {
    column: string;
    direction: SortDirection;
};
/**
 * Supported filter operators.
 */
export type FilterOp = "equals" | "notEquals" | "contains" | "gt" | "gte" | "lt" | "lte" | "between" | "in" | "isEmpty";
/**
 * Specification for filtering rows.
 */
export type Filter = {
    column: string;
    op: FilterOp;
    value?: unknown;
};
/**
 * View configuration containing sort and filter definitions.
 */
export type ViewSpec = {
    sort: readonly SortSpec[];
    filters: readonly Filter[];
};
/**
 * Result of applying a view to rows.
 */
export type ViewResult<T> = {
    rows: T[];
    indices: number[];
};
/**
 * Input parameters for calculating a virtual scrolling window.
 */
export type VirtualWindowInput = {
    rowCount: number;
    rowHeight: number;
    viewportHeight: number;
    scrollTop: number;
    overscan?: number;
};
/**
 * Resulting index slice and height offset for a virtual scrolling window.
 */
export type VirtualWindowResult = {
    start: number;
    end: number;
    offsetTop: number;
    totalHeight: number;
};
/**
 * Error codes emitted by {@link GridError}.
 */
export type GridErrorCode = "unknown_column" | "invalid_filter" | "invalid_window" | "invalid_sort";
/**
 * Named limits enforcing safe resource usage on untrusted inputs.
 */
export declare const MAX_ROWS_LIMIT = 10000000;
export declare const MAX_COLUMNS_LIMIT = 10000;
export declare const MAX_SORT_SPECS_LIMIT = 100;
export declare const MAX_FILTERS_LIMIT = 1000;
/**
 * Error class thrown for invalid grid operations and configurations.
 */
export declare class GridError extends Error {
    readonly code: GridErrorCode;
    constructor(code: GridErrorCode, message: string);
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
export declare function applyView<T>(rows: readonly T[], columns: readonly ColumnDef<T>[], view: ViewSpec): ViewResult<T>;
/**
 * Sorts rows according to sort specifications, placing empty values last in both directions.
 *
 * @param rows - Readonly array of rows. Not mutated.
 * @param sort - Array of sort specifications.
 * @param columns - Column definitions.
 * @returns New sorted rows array.
 */
export declare function sortRows<T>(rows: readonly T[], sort: readonly SortSpec[], columns: readonly ColumnDef<T>[]): T[];
/**
 * Filters rows according to filter specifications using AND conjunction.
 *
 * @param rows - Readonly array of rows. Not mutated.
 * @param filters - Array of filter specifications.
 * @param columns - Column definitions.
 * @returns New filtered rows array.
 */
export declare function filterRows<T>(rows: readonly T[], filters: readonly Filter[], columns: readonly ColumnDef<T>[]): T[];
/**
 * Calculates the visible slice indices and vertical scroll offset for fixed-height virtual scrolling.
 *
 * @param input - Virtual window geometry and scroll parameters.
 * @returns Calculated start index, end index, offsetTop, and totalHeight.
 * @throws {GridError} With code 'invalid_window' if geometry parameters are invalid.
 */
export declare function virtualWindow(input: VirtualWindowInput): VirtualWindowResult;
