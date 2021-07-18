<script>
	import Router from "svelte-spa-router";
	import Index from "./Index.svelte";
	import AddEdu from "./AddEdu.svelte";
	import AddExp from "./AddExp.svelte";
	import DevDetails from "./DevDetails.svelte";
	import Developers from "./Developers.svelte";
	import Login from "./Login.svelte";
	import Logout from "./Logout.svelte";
	import Posts from "./Posts.svelte";
	import ProfileEdit from "./ProfileEdit.svelte";
	import Register from "./Register.svelte";

	const routes = {
		"/": Index,
		"/addEdu": AddEdu,
		"/addExp": AddExp,
		"/devDetails": DevDetails,
		"/developers": Developers,
		"/login": Login,
		"/logout": Logout,
		"/posts": Posts,
		"/profileEdit": ProfileEdit,
		"/register": Register,
	};
</script>

<Router {routes} />
