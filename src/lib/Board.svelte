<script lang="ts">
  // Create a 9x9 grid of cells
  const cells = Array(81).fill(null);
  let selectedIndex: number | null = null;

  function handleCellClick(index: number) {
    selectedIndex = index;
  }
</script>

<div class="board">
  {#each cells as cell, i}
    <div 
      class="cell" 
      class:selected={selectedIndex === i}
      data-index={i}
      on:click={() => handleCellClick(i)}
    ></div>
  {/each}
</div>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    gap: 1px;
    background-color: #ccc;
    padding: 1px;
    width: min(90vw, 500px);
    aspect-ratio: 1;
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
  }

  .cell:hover {
    background-color: #f0f0f0;
  }

  .cell.selected {
    background-color: #e3f2fd;
  }
</style> 