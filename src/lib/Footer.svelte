<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<footer class="footer">
  <div class="footer-content">
    <p>Created by Ricco Førgaard</p>
    <button class="link-button" on:click={() => dispatch('openAbout')}>About</button>
  </div>
</footer>

<style>
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    margin-top: 0;
    padding: 1rem;
    border-top: 1px solid #eee;
    text-align: center;
    z-index: 10;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #666;
  }

  .footer p {
    margin: 0;
  }

  .link-button {
    background: none;
    border: none;
    color: #1976d2;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
    text-decoration: underline;
    width: auto;
  }

  .link-button:hover {
    color: #1565c0;
    background: none;
  }

  @media (max-width: 900px) {
    .footer {
      position: static;
    }
  }
</style> 