<script lang="ts">
  import Board from '$lib/Board.svelte';
  import Footer from '$lib/Footer.svelte';
  import About from '$lib/About.svelte';
  import Header from '$lib/Header.svelte';
  let isAboutModalOpen = false;
  let isDraggingFile = false;
  let boardComponent: any;

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    // Only set dragging to false if we're leaving the viewport
    if (e.relatedTarget === null) {
      isDraggingFile = false;
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = false;
    if (boardComponent) {
      boardComponent.handleDrop(e);
    }
  }
</script>

<div 
  class="page"
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
>
  <Header />
  <div class="container">
    <Board bind:this={boardComponent} {isDraggingFile} />
  </div>
  <Footer on:openAbout={() => isAboutModalOpen = true} />
  <About isOpen={isAboutModalOpen} onClose={() => isAboutModalOpen = false} />
  
  {#if isDraggingFile}
    <div class="drag-overlay">
      <div class="drag-message">Drop Sudoku image here</div>
    </div>
  {/if}
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  
  .container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .drag-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
  }

  .drag-message {
    font-size: 2rem;
    color: white;
    padding: 2rem;
    border: 4px dashed white;
    border-radius: 1rem;
    background: rgba(0, 0, 0, 0.5);
  }
</style>
