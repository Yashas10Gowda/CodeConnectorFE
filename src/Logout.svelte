<script>
import { navigate } from 'svelte-routing';

window.localStorage.removeItem('username:authtoken')
window.localStorage.removeItem('userid')
navigate('/')

</script>

