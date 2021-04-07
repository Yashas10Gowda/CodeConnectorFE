<script>
  import { onMount } from "svelte";
  import Nav from "../components/Nav.svelte";

  let devs = [];
  let devnames = [];

  async function gitfun(x) {
    if (x.github == null) {
      x.avatarurl = "profile-icon.png";
      return "profile-icon.png";
    }
    let res = await fetch(`https://api.github.com/users/${x.github}`);
    let resj = await res.json();
    x.avatarurl = resj.avatar_url;
    return res.ok ? resj.avatar_url : "profile-icon.png";
  }

  onMount(async () => {
    let res = await fetch("https://yashas.pythonanywhere.com/api/developers/");
    devs = await res.json();
    window.console.log("New Update!");
  });
</script>

<style>
  .name {
    font-size: 30px;
    font-weight: 600;
  }
  .text-muted {
    font-size: 18px;
  }
  .dev-noth {
    font-size: 17px;
  }
  .card {
    max-width: 11in;
  }
</style>

<svelte:head>
  <title>Our Developers</title>
</svelte:head>

<Nav />

<h1 class="text-info text-center my-3">Developers</h1>
<h1 class="text-center mb-3 dev-noth">Browse and connect with developers.</h1>

{#each devs as dev}
  <div class="card mb-3 mx-auto">
    <div class="row no-gutters">
      <div class="col-md-4 text-center">
        {#await gitfun(dev)}
          <img
            src="profile-icon.png"
            style="max-width:200px;"
            class="card-img rounded-circle mt-3"
            alt="..." />
        {:then src}
          <img
            {src}
            style="max-width:200px;"
            class="card-img rounded-circle mt-3"
            alt="..." />
        {/await}
        <div class="text-center">{dev.career}</div>
      </div>
      <div class="col-md-8 text-center">
        <div class="card-body">
          <p class="card-text name">{dev.username.toUpperCase()}</p>
          <p class="text-muted mb-0">{dev.skills}</p>
          <hr />
          <p class="card-text">
            <small class="text-muted">{dev.location}</small>
          </p>
          <a
            on:click={() => sessionStorage.setItem('devdetail', JSON.stringify(dev))}
            href="/devDetails">
            <button class="btn btn-info">View Profile</button>
          </a>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="progress container">
    <div
      class="progress-bar progress-bar-striped progress-bar-animated bg-info"
      role="progressbar"
      aria-valuenow="100"
      aria-valuemin="0"
      aria-valuemax="100"
      style="width: 100%" />
  </div>
{/each}

<div class="mb-5" />
