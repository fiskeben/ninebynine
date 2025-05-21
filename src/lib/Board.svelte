<script lang="ts">
  import { processImage } from './processImage';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Modal from './Modal.svelte';
  import Footer from './Footer.svelte';
  import About from './About.svelte';
  import Toast from './Toast.svelte';

  // Props
  export let isDraggingFile = false;

  // Create a 9x9 grid of cells
  const cells = Array(81).fill(null);
  let selectedIndex: number | null = null;
  let values = Array(81).fill('');
  let pencilMarks = Array(81).fill(null).map(() => new Set<string>());
  let boardElement: HTMLElement;
  let errorCells = new Set<number>();
  let mode: 'solution' | 'pencil' = 'solution';
  let isDragging = false;
  let selectedCells = new Set<number>();
  let dragStartIndex: number | null = null;
  let isInitializationMode = false;
  let lockedCells = new Set<number>();
  let uploadedImageUrl: string | null = null;
  let shareUrl: string = '';
  let uploadError: string | null = null;
  let showToast = false;

  // Highlighting state
  type HighlightColor = 'red' | 'green' | 'blue';
  let highlightedCells: { [key: number]: HighlightColor } = {};

  // Move history for undo
  type Move = {
    cells: number[];
    oldValues: string[];
    newValues: string[];
    oldPencilMarks: Set<string>[];
    newPencilMarks: Set<string>[];
  };
  let moveHistory: Move[] = [];

  let isAboutModalOpen = false;

  function recordMove(cells: number[], oldValues: string[], newValues: string[], oldPencilMarks: Set<string>[], newPencilMarks: Set<string>[]) {
    moveHistory.push({ cells, oldValues, newValues, oldPencilMarks, newPencilMarks });
    moveHistory = moveHistory; // trigger reactivity
  }

  function undo() {
    const lastMove = moveHistory.pop();
    if (!lastMove) return;

    lastMove.cells.forEach((cellIndex, i) => {
      values[cellIndex] = lastMove.oldValues[i];
      pencilMarks[cellIndex] = new Set(lastMove.oldPencilMarks[i]);
    });

    values = [...values]; // trigger reactivity
    pencilMarks = [...pencilMarks]; // trigger reactivity
    moveHistory = moveHistory; // trigger reactivity
    validateAllConflicts();
  }

  onMount(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const board = searchParams.get('board');
    if (board) {
      values = Array(81).fill('');
      board.split(';').forEach(coord => {
        if (!coord) return;
        const [pos, val] = coord.split(':');
        const [x, y] = pos.split(',').map(Number);
        if (x >= 0 && x < 9 && y >= 0 && y < 9) {
          values[y * 9 + x] = val;
        }
      });
      isInitializationMode = true;
      finishInitialization();
    }
    updateShareUrl();
  });

  function updateShareUrl() {
    const coords = values
      .map((v, i) => v ? `${i % 9},${Math.floor(i / 9)}:${v}` : null)
      .filter(Boolean)
      .join(';');
    
    const url = new URL(window.location.href);
    url.searchParams.set('board', coords);
    shareUrl = url.toString();
  }

  function startNewGame() {
    values = Array(81).fill('');
    pencilMarks = Array(81).fill(null).map(() => new Set<string>());
    errorCells.clear();
    selectedCells.clear();
    selectedIndex = null;
    lockedCells.clear();
    isInitializationMode = true;
    mode = 'solution';
    moveHistory = [];
    updateShareUrl();
  }

  function finishInitialization() {
    if (isInitializationMode) {
      // Lock all non-empty cells
      values.forEach((value, index) => {
        if (value) {
          lockedCells.add(index);
        }
      });
      isInitializationMode = false;
      uploadedImageUrl = null;
      updateShareUrl();
    }
  }

  function toggleMode() {
    mode = mode === 'solution' ? 'pencil' : 'solution';
  }

  function handleCellClick(index: number, event: MouseEvent) {
    event.stopPropagation();
    
    selectedIndex = index;
    selectedCells = new Set([index]);
    validateAllConflicts();
  }

  function handleCellMouseDown(index: number, event: MouseEvent) {
    event.preventDefault();
    isDragging = true;
    dragStartIndex = index;
    selectedCells = new Set([index]);
    selectedIndex = index;
    validateAllConflicts();
  }

  function handleCellMouseEnter(index: number) {
    if (!isDragging) return;
    selectedCells.add(index);
    selectedCells = selectedCells; // trigger reactivity
  }

  function handleWindowMouseUp() {
    isDragging = false;
  }

  function handleWindowClick(event: MouseEvent) {
    if (!boardElement.contains(event.target as Node)) {
      selectedIndex = null;
      selectedCells.clear();
      errorCells.clear();
      errorCells = errorCells; // trigger reactivity
    }
  }

  function handleDragEnter(e: DragEvent) {
    if (!isInitializationMode) return;
    e.preventDefault();
    isDraggingFile = true;
  }

  function handleDragLeave(e: DragEvent) {
    if (!isInitializationMode) return;
    e.preventDefault();
    isDraggingFile = false;
  }

  function handleDragOver(e: DragEvent) {
    if (!isInitializationMode) return;
    e.preventDefault();
  }

  // Expose handleDrop for the parent component
  export function handleDrop(e: DragEvent) {
    if (!isInitializationMode) return;
    e.preventDefault();
    uploadError = null;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      uploadError = 'Please drop an image file';
      return;
    }

    try {
      // Create URL for the dropped image
      uploadedImageUrl = URL.createObjectURL(file);
      
      // Process image with Google Cloud Vision
      processImage(file).then(grid => {
        // Update the board with the extracted numbers
        values = grid.flat().map(val => val || '');
        
        // Set initialization mode to allow editing
        isInitializationMode = true;
        
        // Validate the board
        validateAllConflicts();
      }).catch(error => {
        console.error('Error processing image:', error);
        uploadError = 'Error processing image. Please try again.';
        uploadedImageUrl = null;
      });
    } catch (error) {
      console.error('Error processing image:', error);
      uploadError = 'Error processing image. Please try again.';
      uploadedImageUrl = null;
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
    const cellsToCheck = new Set([...errorCells, ...(selectedCells.size > 0 ? Array.from(selectedCells) : [])]);
    
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
    // Handle Tab key for center cell selection
    if (event.key === 'Tab') {
      event.preventDefault();
      if (selectedIndex === null) {
        selectedIndex = 40;
        selectedCells = new Set([40]);
        validateAllConflicts();
      }
      return;
    }

    // Handle Space key for mode switching
    if (event.key === ' ') {
      event.preventDefault();
      toggleMode();
      return;
    }

    // Handle M key for mark mode
    if (event.key.toLowerCase() === 'm') {
      event.preventDefault();
      return;
    }

    // Handle Undo
    if (event.key.toLowerCase() === 'u') {
      event.preventDefault();
      undo();
      return;
    }

    if (selectedCells.size === 0) {
      // If no cell is selected and arrow key is pressed, select cell 0
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        selectedIndex = 0;
        selectedCells = new Set([0]);
        return;
      }
      return;
    }

    // Handle arrow key navigation
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const currentIndex = selectedIndex ?? 0;
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowUp':
          newIndex = Math.max(0, currentIndex - 9);
          break;
        case 'ArrowDown':
          newIndex = Math.min(80, currentIndex + 9);
          break;
        case 'ArrowLeft':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowRight':
          newIndex = Math.min(80, currentIndex + 1);
          break;
      }

      selectedIndex = newIndex;
      selectedCells = new Set([newIndex]);
      validateAllConflicts();
      return;
    }
    
    if (event.key === 'Backspace') {
      const oldValues = Array.from(selectedCells).map(index => values[index]);
      const oldPencilMarks = Array.from(selectedCells).map(index => new Set(pencilMarks[index]));
      
      for (const index of selectedCells) {
        // Don't modify locked cells unless in initialization mode
        if (lockedCells.has(index) && !isInitializationMode) continue;
        
        values[index] = '';
        pencilMarks[index] = new Set<string>();
      }
      
      const newValues = Array.from(selectedCells).map(index => values[index]);
      const newPencilMarks = Array.from(selectedCells).map(index => new Set(pencilMarks[index]));
      
      recordMove(Array.from(selectedCells), oldValues, newValues, oldPencilMarks, newPencilMarks);
      values = [...values]; // trigger reactivity
      pencilMarks = [...pencilMarks]; // trigger reactivity
      validateAllConflicts();
      return;
    }
    
    const num = parseInt(event.key);
    if (num >= 1 && num <= 9) {
      const useForcesPencilMode = selectedCells.size > 1;
      const oldValues = Array.from(selectedCells).map(index => values[index]);
      const oldPencilMarks = Array.from(selectedCells).map(index => new Set(pencilMarks[index]));
      
      for (const index of selectedCells) {
        // Don't modify locked cells unless in initialization mode
        if (lockedCells.has(index) && !isInitializationMode) continue;

        if (!useForcesPencilMode && mode === 'solution') {
          // Clear pencil marks when entering a value
          pencilMarks[index] = new Set<string>();
          values[index] = event.key;
          // Remove invalidated pencil marks
          removePencilMarksForValue(index, event.key);
        } else {
          // Don't allow pencil marks if cell has a value
          if (values[index]) continue;
          
          const marks = pencilMarks[index];
          if (marks.has(event.key)) {
            marks.delete(event.key);
          } else {
            marks.add(event.key);
          }
        }
      }
      
      const newValues = Array.from(selectedCells).map(index => values[index]);
      const newPencilMarks = Array.from(selectedCells).map(index => new Set(pencilMarks[index]));
      
      recordMove(Array.from(selectedCells), oldValues, newValues, oldPencilMarks, newPencilMarks);
      values = [...values]; // trigger reactivity
      pencilMarks = [...pencilMarks]; // trigger reactivity
      validateAllConflicts();
    }
  }

  function formatPencilMarks(marks: Set<string>): string[] {
    // Return an array of 9 elements, with numbers in their positions or empty strings
    return Array(9).fill('').map((_, i) => marks.has((i + 1).toString()) ? (i + 1).toString() : '');
  }

  $: selectedRow = selectedIndex !== null ? Math.floor(selectedIndex / 9) : null;
  $: selectedCol = selectedIndex !== null ? selectedIndex % 9 : null;

  function isInSelectedRowOrCol(index: number): boolean {
    if (selectedIndex === null || selectedCells.size > 1) return false;
    const row = Math.floor(index / 9);
    const col = index % 9;
    return row === selectedRow || col === selectedCol;
  }

  function hasMatchingPencilMark(index: number): boolean {
    if (selectedIndex === null || !values[selectedIndex]) return false;
    const selectedValue = values[selectedIndex];
    const indices = new Set([
      ...getRow(selectedIndex),
      ...getColumn(selectedIndex),
      ...getBox(selectedIndex)
    ]);
    return indices.has(index) && pencilMarks[index].has(selectedValue);
  }

  function hasMatchingDigit(index: number): boolean {
    if (selectedIndex === null) return false;
    const selectedValue = values[selectedIndex];
    if (!selectedValue) return false;
    
    // Check both regular values and pencil marks
    return values[index] === selectedValue || pencilMarks[index].has(selectedValue);
  }

  function removePencilMarksForValue(index: number, value: string) {
    const rowIndices = getRow(index);
    const colIndices = getColumn(index);
    const boxIndices = getBox(index);
    
    const allIndices = new Set([...rowIndices, ...colIndices, ...boxIndices]);
    allIndices.delete(index);

    for (const idx of allIndices) {
      pencilMarks[idx].delete(value);
    }
  }

  function toggleHighlightForSelectedCells(color: HighlightColor | null) {
    // If clear button is clicked with no selection, clear all highlights
    if (color === null && selectedCells.size === 0) {
      highlightedCells = {};
      return;
    }

    // Check if any selected cells have this color
    const hasColor = Array.from(selectedCells).some(index => 
      color === null ? highlightedCells[index] : highlightedCells[index] === color
    );
    
    // Toggle color for all selected cells
    selectedCells.forEach(index => {
      if (hasColor || color === null) {
        delete highlightedCells[index];
      } else {
        highlightedCells[index] = color;
      }
    });
    highlightedCells = highlightedCells; // trigger reactivity
  }
</script>

<svelte:window 
  on:keydown={handleKeydown}
  on:click={handleWindowClick}
  on:mouseup={handleWindowMouseUp}
/>

<div class="container">
  <div class="game-area">
    {#if uploadError}
      <div 
        class="image-container error"
        class:dragging={isDraggingFile}
      >
        <div class="error-message">
          {uploadError}
        </div>
      </div>
    {:else if uploadedImageUrl}
      <div class="image-container">
        <img src={uploadedImageUrl} alt="Uploaded sudoku" />
        {#if isInitializationMode}
          <div class="help-text">
            Make adjustments to the numbers if needed, then click "Play" to start.
          </div>
        {/if}
      </div>
    {/if}
    
    <div class="play-area">
      <div class="board-container">
        <div 
          class="board"
          class:dragging={isDraggingFile}
          class:with-image={uploadedImageUrl}
          bind:this={boardElement}
        >
          {#each cells as cell, i}
            <div 
              class="cell" 
              class:selected={selectedCells.has(i)}
              class:highlighted={isInSelectedRowOrCol(i)}
              class:error={errorCells.has(i)}
              class:has-pencil-marks={!values[i] && pencilMarks[i].size > 0}
              class:matching-pencil={hasMatchingPencilMark(i)}
              class:matching-digit={hasMatchingDigit(i)}
              class:locked={lockedCells.has(i)}
              data-index={i}
              data-highlight={highlightedCells[i] || null}
              on:click={(e) => handleCellClick(i, e)}
              on:mousedown={(e) => handleCellMouseDown(i, e)}
              on:mouseenter={() => handleCellMouseEnter(i)}
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
        {#if isInitializationMode && !uploadedImageUrl}
          <div class="drag-hint">
            <p>Drag and drop an image of a Sudoku puzzle here</p>
            <p>or add the numbers manually and then click "Play" to start.</p>
          </div>
        {/if}
      </div>

      <div class="controls-container">
        <div class="controls">
          {#if !isInitializationMode}
            <button on:click={startNewGame}>
              New board
            </button>
          {/if}
          {#if isInitializationMode}
            <button on:click={finishInitialization} class="primary-button">
              Play!
            </button>
          {/if}
          {#if !isInitializationMode}
            <button on:click={toggleMode}>
              Mode: {mode === 'solution' ? 'Solution' : 'Pencil'}
            </button>
            <button on:click={undo} disabled={moveHistory.length === 0}>
              Undo
            </button>
            <button on:click={() => {
              navigator.clipboard.writeText(shareUrl);
              showToast = true;
            }}>
              Share
            </button>
            <div class="color-buttons">
              <button 
                class="color-button" 
                style="background-color: #ffcdd2" 
                on:click={() => toggleHighlightForSelectedCells('red')}
              ></button>
              <button 
                class="color-button" 
                style="background-color: #c8e6c9" 
                on:click={() => toggleHighlightForSelectedCells('green')}
              ></button>
              <button 
                class="color-button" 
                style="background-color: #fff3c4" 
                on:click={() => toggleHighlightForSelectedCells('blue')}
              ></button>
              <button 
                class="color-button clear" 
                style="background-color: white" 
                on:click={() => toggleHighlightForSelectedCells(null)}
              ></button>
            </div>
          {/if}
        </div>

        <div class="shortcuts-info">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li><kbd>1-9</kbd> Enter number</li>
            <li><kbd>Space</kbd> Toggle solution/pencil mode</li>
            <li><kbd>Backspace</kbd> Clear cell</li>
            <li><kbd>U</kbd> Undo</li>
            <li><kbd>Tab</kbd> Select center cell</li>
            <li><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Navigate board</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

{#if showToast}
  <Toast 
    message="The link has been copied to your clipboard" 
    onClose={() => showToast = false}
  />
{/if}

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .game-area {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    position: relative;
    min-height: min(calc(60vh - 160px), 60vw);
  }

  .image-container {
    width: min(calc(90vh - 160px), 90vw, 500px);
    aspect-ratio: 1;
    position: relative;
    flex: 0 0 auto;
  }

  .image-container img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    background: #f5f5f5;
  }

  .help-text {
    margin-top: 1rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #333;
    font-family: inherit;
  }

  .play-area {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    flex: 1;
  }

  .board-container {
    flex: 1;
    max-width: min(calc(90vh - 160px), 90vw, 500px);
  }

  .controls-container {
    flex: 0 0 auto;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: max-content;
  }

  button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    border: 1px solid #666;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    white-space: nowrap;
    width: 200px;
    font-family: inherit;
  }

  button:hover {
    background: #f0f0f0;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    gap: 2px;
    background-color: #666;
    padding: 2px 6px 2px 2px;
    width: 100%;
    aspect-ratio: 1;
    border: 2px solid #666;
    box-sizing: border-box;
    position: relative;
  }

  .board.with-image {
    transform: none;
  }

  .board.dragging::after {
    content: none;
  }

  .cell {
    background-color: white;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: min(1.5rem, 4vw);
    user-select: none;
    cursor: pointer;
    position: relative;
    font-family: inherit;
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

  .cell.selected,
  .cell.highlighted.selected {
    background-color: #a4c1d9;
  }

  .cell.highlighted {
    background-color: #f5f9ff;
  }

  .cell.error {
    background-color: #ffebee;
  }

  .cell.matching-digit {
    background-color: #fff3e0;
  }

  .cell.matching-pencil {
    background-color: #fff3e0;
  }

  .cell[data-highlight="red"] {
    background-color: #ffcdd2;
  }

  .cell[data-highlight="green"] {
    background-color: #c8e6c9;
  }

  .cell[data-highlight="blue"] {
    background-color: #fff3c4;
  }

  .cell[data-highlight] {
    opacity: 0.8;
  }

  .cell[data-highlight]:hover {
    opacity: 1;
  }

  .has-pencil-marks {
    font-size: min(0.7rem, 1.5vw);
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

  .cell.locked {
    color: #1976d2;
    font-weight: bold;
  }

  @media (max-width: 900px) {
    .game-area {
      flex-direction: column;
      align-items: center;
    }

    .play-area {
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .board-container {
      width: 100%;
    }

    .controls {
      width: 100%;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
    }

    button {
      width: auto;
      min-width: 120px;
    }

    .shortcuts-info {
      width: 100%;
      max-width: 500px;
      margin: 1rem auto;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes fadeOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(-20px); }
  }

  @keyframes slideRight {
    from { transform: translateX(0); }
    to { transform: translateX(calc(100% + 2rem)); }
  }

  @keyframes slideCenter {
    from { transform: translateX(calc(100% + 2rem)); }
    to { transform: translateX(0); }
  }

  .primary-button {
    background: #1976d2;
    color: white;
    font-weight: bold;
  }

  .primary-button:hover {
    background: #1565c0;
  }

  .image-container.error {
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .image-container.error.dragging::after {
    content: none;
  }

  .error-message {
    padding: 2rem;
    text-align: center;
    color: #d32f2f;
    font-size: 1.2rem;
  }

  .drag-hint {
    text-align: center;
    margin-top: 1rem;
    color: #666;
    font-size: 0.9rem;
    animation: fadeIn 0.3s ease-out;
    font-family: inherit;
  }

  .shortcuts-info {
    margin-top: 2rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
    font-size: 0.9rem;
  }

  .shortcuts-info h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-family: inherit;
  }

  .shortcuts-info ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .shortcuts-info li {
    margin: 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  kbd {
    background: #e0e0e0;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0.1rem 0.4rem;
    font-size: 0.8rem;
    font-family: monospace;
  }

  .color-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .color-button {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
  }

  .color-button.clear {
    border-color: #ccc;
  }

  .color-button:hover {
    border-color: #1976d2;
  }
</style> 