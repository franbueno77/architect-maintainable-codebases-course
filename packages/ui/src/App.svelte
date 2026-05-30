<script lang="ts">
import Seeds from './routes/Seeds.svelte';
import Home from './routes/Home.svelte';

let path = $state(window.location.pathname);

window.addEventListener('popstate', () => {
	path = window.location.pathname;
});
</script>

{#if path === '/seeds'}
	<Seeds />
{:else}
	<Home />
{/if}
