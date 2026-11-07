# Headless Data Grid Core Architecture

Status: accepted (generated, pending human review)

## Context

Admin panels and web applications require predictable multi-column sorting, filtering with nulls-last semantics, and virtual scroll calculations without coupling to UI frameworks or mutating data.

## Decision

Implement a zero-dependency headless core using pure functions (sortRows, filterRows, applyView, virtualWindow), typed error reporting via GridError, immutable decorations for index preservation, and deterministic UTF-16/timestamp comparators.

## Consequences

Sorting and filtering are completely deterministic across environments, input arrays remain untouched, null handling is consistent across all operators, and view state can be seamlessly integrated with React, Vue, Svelte, or vanilla JS without DOM dependencies.
