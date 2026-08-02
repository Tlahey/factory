# Bug: Drag-and-drop lacks a shared, typed interface

**Status:** Not started

## Description

`onDragStart`/`onDragEnd` handlers don't implement a common interface for draggable elements. Applying a drag rule today requires ad-hoc logic per call site, which gets complex fast.

## Requirements

- Define a shared interface for draggable elements that `onDragStart`/`onDragEnd` implement consistently.
- Make the interface generic (`<T>`) so drag-and-drop is only possible between elements of matching types (e.g. an inventory item can't be dropped somewhere expecting a different element type).
