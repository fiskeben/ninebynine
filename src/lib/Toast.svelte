<script lang="ts">
  export let message: string;
  export let duration: number = 3000;
  export let onClose: () => void;

  setTimeout(() => {
    onClose();
  }, duration);
</script>

<div class="toast">
  {message}
</div>

<style>
  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
    animation: fadeInOut 3s ease-in-out;
    z-index: 1000;
  }

  @keyframes fadeInOut {
    0% { opacity: 0; transform: translate(-50%, 20px); }
    10% { opacity: 1; transform: translate(-50%, 0); }
    90% { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, 20px); }
  }
</style> 