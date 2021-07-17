<script>
	import { Router, link, Route } from "svelte-routing";
	import { onMount } from "svelte";
	import Index from './Index.svelte'
	import AddEdu from './AddEdu.svelte'
	import AddExp from './AddExp.svelte'
	import DevDetails from './DevDetails.svelte'
	import Developers from './Developers.svelte'
	import Login from './Login.svelte'
	import Logout from './Logout.svelte'
	import Posts from './Posts.svelte'
	import ProfileEdit from './ProfileEdit.svelte'
	import Register from './Register.svelte'
  	
	export let url = "";
  	let authorised = false;
    let username = null;

  	onMount(() => {
		document.addEventListener("itemInserted", ()=>{
			username = window.localStorage.getItem("username:authtoken");
		});
		document.addEventListener("itemRemoved", ()=>{
			username = window.localStorage.getItem("username:authtoken");
		});
  	});

  </script>
  
  <Router url="{url}">
	<nav class="navbar sticky-top navbar-expand-lg navbar-dark bg-dark py-1">
		<a class="navbar-brand" href="/" use:link>
		  <img class="code-icon" src="/img/code-solid.svg" alt="Code" />
		  &nbsp;CodeConnector
		</a>
		<button
		  class="navbar-toggler"
		  type="button"
		  data-toggle="collapse"
		  data-target="#navbarNav"
		  aria-controls="navbarNav"
		  aria-expanded="false"
		  aria-label="Toggle navigation">
		  <span class="navbar-toggler-icon" />
		</button>
		<div class="collapse navbar-collapse" id="navbarNav">
		  {#if username != null}
			<ul class="navbar-nav">
			  <li class="nav-item">
				<a class="nav-link" href="/developers" use:link>Developers</a>
			  </li>
			  <li class="nav-item">
				<a class="nav-link" href="/posts" use:link>Posts</a>
			  </li>
			  <li class="nav-item">
				<a class="nav-link" href="/" use:link>Dashboard</a>
			  </li>
			  <li class="nav-item">
				<a class="nav-link" href="/logout" use:link>Logout</a>
			  </li>
			</ul>
		  {:else}
			<ul class="navbar-nav">
			  <li class="nav-item">
				<a
				  class="nav-link"
				  rel="noopener"
				  target="_blank"
				  href="https://yashasgowda.web.app/">
				  Yashas
				</a>
			  </li>
			  <li class="nav-item">
				<a class="nav-link" href="/developers" use:link>Developers</a>
			  </li>
			  <li class="nav-item">
				<a class="nav-link" href="/register" use:link>Register</a>
			  </li>
			  <li class="nav-item">
				<a class="nav-link" href="/login" use:link>Login</a>
			  </li>
			</ul>
		  {/if}
		</div>
	  </nav>
	<div>
	  <Route path="/"><Index /></Route>
	  <Route path="/addEdu"><AddEdu /></Route>
	  <Route path="/addExp"><AddExp /></Route>
	  <Route path="/devDetails"><DevDetails /></Route>
	  <Route path="/developers"><Developers /></Route>
	  <Route path="/login"><Login /></Route>
	  <Route path="/logout"><Logout /></Route>
	  <Route path="/posts"><Posts /></Route>
	  <Route path="/profileEdit"><ProfileEdit /></Route>
	  <Route path="/register"><Register /></Route>
	</div>
  </Router>

  <style>
	  nav {
    font-family: "Quicksand", sans-serif;
    font-size: 20px;
    border-bottom: 3px solid #17a2b8;
  }
  .navbar-nav {
    margin-left: 45%;
  }
  .navbar-brand {
    font-size: 30px;
    margin-left: 8%;
  }
  .navbar-brand:hover {
    filter: invert(48%) sepia(88%) saturate(429%) hue-rotate(140deg)
      brightness(93%) contrast(92%);
  }
  .nav-link:hover {
    border-bottom: 1px solid #17a2b8;
    transform: translateY(1px);
  }
  .code-icon {
    width: 35px;
    height: auto;
    margin-bottom: 5px;
    filter: invert(100%);
  }
  @media (max-width: 750px) {
    .navbar-brand {
      margin-left: 1%;
      font-size: 25px;
    }
    nav {
      border-bottom: 2px solid #17a2b8;
    }
    .navbar-nav {
      margin-left: 68%;
    }
    .navbar-brand {
      color: #17a2b8;
    }
    .code-icon {
      filter: invert(51%) sepia(39%) saturate(875%) hue-rotate(140deg)
        brightness(95%) contrast(94%);
    }
  }
  </style>