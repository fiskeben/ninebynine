<script lang="ts">
  import Board from '$lib/Board.svelte';
  import Footer from '$lib/Footer.svelte';
  import About from '$lib/About.svelte';
  import Header from '$lib/Header.svelte';
  let isAboutModalOpen = false;
</script>

<div class="page">
  <Header />
  <div class="container">
    <Board />
  </div>
  <Footer on:openAbout={() => isAboutModalOpen = true} />
  <About isOpen={isAboutModalOpen} onClose={() => isAboutModalOpen = false} />
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
