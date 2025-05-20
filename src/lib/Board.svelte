<script lang="ts">
  // Create a 9x9 grid of cells
  const cells = Array(81).fill(null);
  let selectedIndex: number | null = null;
  let values = Array(81).fill('');
  let boardElement: HTMLElement;

  function handleCellClick(index: number, event: MouseEvent) {
    event.stopPropagation();
    selectedIndex = index;
  }

  function handleWindowClick(event: MouseEvent) {
    if (!boardElement.contains(event.target as Node)) {
      selectedIndex = null;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (selectedIndex === null) return;
    
    const num = parseInt(event.key);
    if (num >= 1 && num <= 9) {
      values[selectedIndex] = event.key;
      values = values; // trigger reactivity
    }
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

<div 
  class="board"
  bind:this={boardElement}
>
  {#each cells as cell, i}
    <div 
      class="cell" 
      class:selected={selectedIndex === i}
      class:highlighted={isInSelectedRowOrCol(i)}
      data-index={i}
      on:click={(e) => handleCellClick(i, e)}
    >
      {values[i]}
    </div>
  {/each}
</div>

<style>
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
</style> 