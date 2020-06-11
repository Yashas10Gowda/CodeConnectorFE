<script>
import {goto} from '@sapper/app'

window.localStorage.removeItem('username:authtoken')
window.localStorage.removeItem('userid')
goto('/')

</script>

