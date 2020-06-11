<script>
  import { onMount } from "svelte";
  let authorised = false,
    username = null;
  onMount(() => {
    username = window.localStorage.getItem("username:authtoken");
  });
</script>

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
  }
</style>

<nav class="navbar sticky-top navbar-expand-lg navbar-dark bg-dark py-1">

  <a class="navbar-brand" href="/">
    <img class="code-icon" src="code-solid.svg" alt="Code" />
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
          <a class="nav-link" href="/developers">Developers</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/posts">Posts</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/">Dashboard</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/logout">Logout</a>
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
          <a class="nav-link" href="/developers">Developers</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/register">Register</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/login">Login</a>
        </li>
      </ul>
    {/if}
  </div>
</nav>
