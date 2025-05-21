<script lang="ts">
  import Modal from './Modal.svelte';
  export let isOpen = false;
  export let onClose: () => void;
</script>

<Modal 
  isOpen={isOpen} 
  onClose={onClose}
  title="About Nine by Nine"
>
  <div class="about-content">
    <p>
      Nine by Nine is a modern, user-friendly Sudoku game 
      for dedicated puzzle solvers to practice and sharpen their skills.
    </p>
    <p>
      It allows you to import any Sudoku puzzle from an image
      or manually replicate it by adding the numbers yourself.
    </p>
    
    <p>
      You have all the tools you need to solve the puzzle:
    </p>
    <ul>
      <li>Pencil marks for noting possible solutions</li>
      <li>Cell highlighting for advanced solving techniques</li>
      <li>Share puzzles with friends via URL</li>
      <li>Keyboard shortcuts for efficient gameplay</li>
    </ul>

    <h3>How to Play:</h3>
    <ol>
      <li>Start a new game by clicking "New board" and upload an image of a puzzle or manually add the numbers yourself</li>
      <li>Use arrow keys to navigate the board</li>
      <li>Click cells to select them and enter numbers (1-9)</li>
      <li>Use Space to toggle between solution and pencil mark modes</li>
      <li>Press M to enter highlighting mode for marking patterns</li>
      <li>Share your puzzle using the Share button and challenge your friends.</li>
    </ol>

    <p>
      I hope you enjoy using Nine by Nine!
    </p>
  </div>
</Modal>

<style>
  .about-content {
    color: #333;
    line-height: 1.6;
  }

  .about-content h3 {
    margin: 1.5rem 0 0.5rem;
    color: #1976d2;
  }

  .about-content ul,
  .about-content ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .about-content li {
    margin: 0.5rem 0;
  }

  .about-content p {
    margin: 1rem 0;
  }
</style> 