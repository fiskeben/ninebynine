<script lang="ts">
  import Board from '$lib/Board.svelte';
  import Footer from '$lib/Footer.svelte';
  import About from '$lib/About.svelte';
  let isAboutModalOpen = false;
</script>

<div class="container">
  <Board />
</div>
<Footer on:openAbout={() => isAboutModalOpen = true} />
  <About isOpen={isAboutModalOpen} onClose={() => isAboutModalOpen = false} />
  

<style>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
