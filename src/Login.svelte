<script>
  import Nav from './Nav.svelte'
  import { onMount } from "svelte";
  import { push,link } from 'svelte-spa-router';

  onMount(() => {
    if (localStorage.getItem("username:authtoken") != null) {
      push('/')
    }
  });

  let username, password;
  let state = false;
  let error = false;

  const loginfun = e => {
    e.preventDefault();
    error = false;
    state = true;
    fetch("https://yashas.pythonanywhere.com/api/token/", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        username: username.toLowerCase(),
        password: password
      })
    })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem(
          "username:authtoken",
          String(username.toLowerCase() + ":" + data.token)
        );
        if (data.token === undefined) {
          localStorage.removeItem("username:authtoken");
          error = true;
        } else {
          state = false;
          push('/')
        }
      });
  };
</script>

<style>
  .cre {
    font-size: 30px;
  }
  .form {
    margin: 5px 15%;
  }

  span {
    font-size: 14px;
  }
  @media (max-width: 750px) {
    .form {
      margin: 5px 5%;
    }
    .cre {
      font-size: 25px;
    }
  }
</style>

<svelte:head>
  <title>Login into CC Account</title>
</svelte:head>

<Nav />

<div class="form" style="max-width:10in;">
  <div class="cre my-4">Login Into Your Account</div>
  <form>
    <div class="form-group">
      <input
        bind:value={username}
        placeholder="Username"
        class="form-control text-lowercase"
        id="exampleInputEmail1"
        aria-describedby="emailHelp" />
    </div>
    <div class="form-group">
      <input
        bind:value={password}
        type="password"
        placeholder="Password"
        class="form-control"
        id="exampleInputPassword1" />
    </div>
    <button type="submit" on:click={loginfun} class="btn btn-dark mr-2">
      Login
    </button>
    <span>
      Do not have an account?
      <a class="text-info" href="/register" use:link>Register</a>
    </span>
  </form>
  {#if state && !error}
    <div style="margin:5px 0;">Logging In...</div>
  {/if}
  {#if error}
    <div style="margin:5px 0;">LogIn Failed...</div>
  {/if}
</div>
