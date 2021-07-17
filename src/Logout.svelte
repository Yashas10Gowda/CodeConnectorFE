<script>
import { push } from 'svelte-spa-router';

window.localStorage.removeItem('username:authtoken')
window.localStorage.removeItem('userid')
push('/')

</script>

