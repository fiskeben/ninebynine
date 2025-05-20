<script lang="ts">
  // Create a 9x9 grid of cells
  const cells = Array(81).fill(null);
  let selectedIndex: number | null = null;
  let values = Array(81).fill('');
  let pencilMarks = Array(81).fill(null).map(() => new Set<string>());
  let boardElement: HTMLElement;
  let errorCells = new Set<number>();
  let mode: 'solution' | 'pencil' = 'solution';

  function toggleMode() {
    mode = mode === 'solution' ? 'pencil' : 'solution';
  }

  function handleCellClick(index: number, event: MouseEvent) {
    event.stopPropagation();
    selectedIndex = index;
    validateAllConflicts();
  }

  function handleWindowClick(event: MouseEvent) {
    if (!boardElement.contains(event.target as Node)) {
      selectedIndex = null;
      errorCells.clear();
      errorCells = errorCells; // trigger reactivity
    }
  }

  function getRow(index: number): number[] {
    const row = Math.floor(index / 9);
    return Array.from({length: 9}, (_, i) => row * 9 + i);
  }

  function getColumn(index: number): number[] {
    const col = index % 9;
    return Array.from({length: 9}, (_, i) => i * 9 + col);
  }

  function getBox(index: number): number[] {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;
    const indices: number[] = [];
    
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        indices.push((boxStartRow + r) * 9 + (boxStartCol + c));
      }
    }
    return indices;
  }

  function findConflict(index: number, value: string): number | null {
    if (!value) return null;
    
    const rowIndices = getRow(index);
    const colIndices = getColumn(index);
    const boxIndices = getBox(index);
    
    const allIndices = new Set([...rowIndices, ...colIndices, ...boxIndices]);
    allIndices.delete(index);

    for (const idx of allIndices) {
      if (values[idx] === value) {
        return idx;
      }
    }
    return null;
  }

  function validateAllConflicts() {
    const newErrorCells = new Set<number>();
    
    // Check all cells that were previously in error or the selected cell
    const cellsToCheck = new Set([...errorCells, ...(selectedIndex !== null ? [selectedIndex] : [])]);
    
    for (const index of cellsToCheck) {
      const conflictIndex = findConflict(index, values[index]);
      if (conflictIndex !== null) {
        newErrorCells.add(index);
        newErrorCells.add(conflictIndex);
      }
    }

    errorCells = newErrorCells;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (selectedIndex === null) return;
    
    const num = parseInt(event.key);
    if (num >= 1 && num <= 9) {
      if (mode === 'solution') {
        // Clear pencil marks when entering a value
        pencilMarks[selectedIndex] = new Set<string>();
        values[selectedIndex] = event.key;
        values = values; // trigger reactivity
        pencilMarks = pencilMarks; // trigger reactivity
        validateAllConflicts();
      } else {
        // Don't allow pencil marks if cell has a value
        if (values[selectedIndex]) return;
        
        const marks = pencilMarks[selectedIndex];
        if (marks.has(event.key)) {
          marks.delete(event.key);
        } else {
          marks.add(event.key);
        }
        pencilMarks = [...pencilMarks]; // trigger reactivity
      }
    }
  }

  function formatPencilMarks(marks: Set<string>): string[] {
    // Return an array of 9 elements, with numbers in their positions or empty strings
    return Array(9).fill('').map((_, i) => marks.has((i + 1).toString()) ? (i + 1).toString() : '');
  }

  $: selectedRow = selectedIndex !== null ? Math.floor(selectedIndex / 9) : null;
  $: selectedCol = selectedIndex !== null ? selectedIndex % 9 : null;

  function isInSelectedRowOrCol(index: number): boolean {
    if (selectedIndex === null) return false;
    const row = Math.floor(index / 9);
    const col = index % 9;
    return row === selectedRow || col === selectedCol;
  }
</script>

<svelte:window 
  on:keydown={handleKeydown}
  on:click={handleWindowClick}
/>

<div class="controls">
  <button on:click={toggleMode}>
    Mode: {mode === 'solution' ? 'Solution' : 'Pencil'}
  </button>
</div>

<div 
  class="board"
  bind:this={boardElement}
>
  {#each cells as cell, i}
    <div 
      class="cell" 
      class:selected={selectedIndex === i}
      class:highlighted={isInSelectedRowOrCol(i)}
      class:error={errorCells.has(i)}
      class:pencil={mode === 'pencil' && !values[i] && pencilMarks[i].size > 0}
      data-index={i}
      on:click={(e) => handleCellClick(i, e)}
    >
      {#if values[i]}
        {values[i]}
      {:else if pencilMarks[i].size > 0}
        <div class="pencil-marks">
          {#each formatPencilMarks(pencilMarks[i]) as mark}
            <div class="pencil-mark">{mark}</div>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .controls {
    margin-bottom: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    border: 1px solid #666;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  button:hover {
    background: #f0f0f0;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    gap: 2px;
    background-color: #666;
    padding: 2px;
    width: min(90vw, 500px);
    aspect-ratio: 1;
    border: 2px solid #666;
    box-sizing: border-box;
  }

  .cell {
    background-color: white;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    user-select: none;
    cursor: pointer;
    position: relative;
  }

  /* Add thicker borders for 3x3 groups */
  .cell:nth-child(9n + 4),
  .cell:nth-child(9n + 7) {
    margin-left: 2px;
  }

  .cell:nth-child(n + 28):nth-child(-n + 36),
  .cell:nth-child(n + 55):nth-child(-n + 63) {
    margin-top: 2px;
  }

  .cell:hover {
    background-color: #f0f0f0;
  }

  .cell.selected {
    background-color: #e3f2fd;
  }

  .cell.highlighted {
    background-color: #f5f9ff;
  }

  .cell.error {
    background-color: #ffebee;
  }

  .cell.pencil {
    font-size: 0.7rem;
  }

  .pencil-marks {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    height: 100%;
    width: 100%;
  }

  .pencil-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
</style> 