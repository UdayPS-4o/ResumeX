// Pure drag-and-drop geometry for the Application Tracker board.
//
// The authoritative reorder/renumber lives in applicationStore.move(id, status,
// position) (storage.js). Critically, move() builds the destination column with
// the dragged card EXCLUDED (`c.id !== id`), then splices it back in at
// `position` and rewrites every card's `position` to a contiguous 0..n-1
// sequence. So the UI only has to compute one number: the insertion index into
// that already-without-the-dragged-card list. indexFromPointer() does exactly
// that, in the SAME coordinate space move() uses — no extra ±1 correction.

// Where to insert a dragged card within a column, from the pointer's Y position
// (viewport coords) and the DOM rects of the cards currently rendered there.
//
// We walk the cards in render order (= position order) and stop at the first one
// whose vertical midpoint is below the pointer, inserting above it; past the last
// card we append. `draggedId` is skipped so the returned index lives in the
// "column without the dragged card" space that applicationStore.move() expects.
//
//   cards:    Array<{ id: string, rect: DOMRect }>  (render order)
//   pointerY: number   (e.clientY)
//   draggedId:string   (excluded from the count)
// → integer index in [0, count(cards excluding draggedId)]
export function indexFromPointer(cards, pointerY, draggedId) {
  let index = 0;
  for (const { id, rect } of cards) {
    if (id === draggedId) continue;
    const midpoint = rect.top + rect.height / 2;
    if (pointerY < midpoint) return index;
    index += 1;
  }
  return index; // below every card → append
}

// Would this drop leave the card exactly where it already is? Inserting the card
// at `targetIndex` into the without-the-card list reproduces the ORIGINAL full
// column precisely when `targetIndex` equals the card's original index in the
// full column. (e.g. full [A,B,C], drag A: without-A list is [B,C]; dropping at 0
// → [A,B,C], unchanged, and A's original index was 0.) Only same-column drops can
// be no-ops; cross-column always changes something. Letting the board short-
// circuit these avoids a pointless write + re-render.
//
//   fromIndexFull: the dragged card's index within its current (full) column.
export function isNoopMove(sameColumn, fromIndexFull, targetIndex) {
  return sameColumn && targetIndex === fromIndexFull;
}
