<script lang="ts">
  import { processImage } from './processImage';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

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
  let isDraggingFile = false;
  let uploadedImageUrl: string | null = null;
  let shareUrl: string = '';

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
    e.preventDefault();
    isDraggingFile = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = false;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = false;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please drop an image file');
      return;
    }

    try {
      // Create URL for the dropped image
      uploadedImageUrl = URL.createObjectURL(file);
      
      // Process image with Google Cloud Vision
      const grid = await processImage(file);
      
      // Update the board with the extracted numbers
      values = grid.flat().map(val => val || '');
      
      // Set initialization mode to allow editing
      isInitializationMode = true;
      
      // Validate the board
      validateAllConflicts();
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
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
    // Handle Tab key for mode switching
    if (event.key === 'Tab') {
      event.preventDefault();
      toggleMode();
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
    
    if (event.key === ' ' || event.key === 'Backspace') {
      for (const index of selectedCells) {
        // Don't modify locked cells unless in initialization mode
        if (lockedCells.has(index) && !isInitializationMode) continue;
        
        values[index] = '';
        pencilMarks[index] = new Set<string>();
      }
      values = [...values]; // trigger reactivity
      pencilMarks = [...pencilMarks]; // trigger reactivity
      validateAllConflicts();
      return;
    }
    
    const num = parseInt(event.key);
    if (num >= 1 && num <= 9) {
      const useForcesPencilMode = selectedCells.size > 1;
      
      for (const index of selectedCells) {
        // Don't modify locked cells unless in initialization mode
        if (lockedCells.has(index) && !isInitializationMode) continue;

        if (!useForcesPencilMode && mode === 'solution') {
          // Clear pencil marks when entering a value
          pencilMarks[index] = new Set<string>();
          values[index] = event.key;
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
</script>

<svelte:window 
  on:keydown={handleKeydown}
  on:click={handleWindowClick}
  on:mouseup={handleWindowMouseUp}
/>

<div class="container">
  <header class="game-header">
    <h1>
      <span class="nine">nine</span>
      <span class="by">by</span>
      <span class="nine">nine</span>
    </h1>
  </header>
  <div class="game-area">
    {#if uploadedImageUrl}
      <div class="image-container">
        <img src={uploadedImageUrl} alt="Uploaded sudoku" />
        {#if isInitializationMode}
          <div class="image-overlay">
            Make adjustments to the numbers if needed, then click "Lock Board & Start Playing"
          </div>
        {/if}
      </div>
    {/if}
    
    <div class="play-area">
      <div 
        class="board"
        class:dragging={isDraggingFile}
        class:with-image={uploadedImageUrl}
        bind:this={boardElement}
        on:dragenter={handleDragEnter}
        on:dragleave={handleDragLeave}
        on:dragover={handleDragOver}
        on:drop={handleDrop}
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

      <div class="controls">
        <button on:click={startNewGame}>
          New Game
        </button>
        {#if isInitializationMode}
          <button on:click={finishInitialization} class="primary-button">
            Lock Board & Start Playing
          </button>
        {/if}
        <button on:click={toggleMode}>
          Mode: {mode === 'solution' ? 'Solution' : 'Pencil'}
        </button>
        {#if !isInitializationMode}
          <button on:click={() => navigator.clipboard.writeText(shareUrl)}>
            Share
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }

  .game-header {
    text-align: center;
    margin-bottom: 2rem;
    padding: 1rem;
  }

  .game-header h1 {
    font-size: 3.5rem;
    font-weight: 900;
    letter-spacing: -1px;
    color: #1976d2;
    text-shadow: 2px 2px 0px rgba(0,0,0,0.1);
    animation: fadeIn 0.8s ease-out;
  }

  .game-header .nine {
    display: inline-block;
    position: relative;
  }

  .game-header .by {
    font-size: 2.5rem;
    color: #666;
    margin: 0 1rem;
    font-style: italic;
    font-weight: 300;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .game-area {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    position: relative;
    min-height: min(90vw, 500px);
  }

  .image-container {
    width: min(90vw, 500px);
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

  .image-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 1rem;
    font-size: 0.9rem;
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
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

  .play-area {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    flex: 0 0 auto;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 0 0 auto;
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
    width: min(90vw, 500px);
    aspect-ratio: 1;
    border: 2px solid #666;
    box-sizing: border-box;
    position: relative;
    flex: 0 0 auto;
    transform: none;
  }

  .board.with-image {
    transform: none;
  }

  .board.dragging::after {
    content: "Drop image here";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    z-index: 10;
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

  .cell.matching-digit {
    background-color: #fff3e0;
  }

  .cell.matching-pencil {
    background-color: #fff3e0;
  }

  .has-pencil-marks {
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

  .cell.locked {
    color: #1976d2;
    font-weight: bold;
  }

  @media (max-width: 1600px) {
    .game-area {
      flex-wrap: wrap;
    }
    
    .play-area {
      width: 100%;
      justify-content: flex-start;
    }
  }
</style> 