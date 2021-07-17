<script>
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";

  let posts = [];
  let d,
    text = "",
    addsuc = false,
    delsuc = false;

  let dateformator = date => {
    d = new Date(date);
    return d.toLocaleDateString();
  };

  onMount(() => {
    if (localStorage.getItem("username:authtoken") == null) {
      navigate('/')
    } else {
      fetch("https://yashas.pythonanywhere.com/api/posts/", {
        headers: {
          Authorization:
            "Token " + localStorage.getItem("username:authtoken").split(":")[1]
        }
      })
        .then(res => res.json())
        .then(da => (posts = da.reverse()));
    }
  });

  let refreshfun = () => {
    fetch("https://yashas.pythonanywhere.com/api/posts/", {
      headers: {
        Authorization:
          "Token " + localStorage.getItem("username:authtoken").split(":")[1]
      }
    })
      .then(res => res.json())
      .then(da => (posts = da.reverse()));
  };

  let sendfun = () => {
    if (text != "") {
      fetch("https://yashas.pythonanywhere.com/api/posts/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Token " + localStorage.getItem("username:authtoken").split(":")[1]
        },
        body: JSON.stringify({ text: text })
      })
        .then(res => res)
        .then(da => {
          if (da.ok) {
            refreshfun();
            text = "";
            scrollTo(0, 0);
            addsuc = true;
            window.setTimeout(() => (addsuc = false), 3000);
          }
        });
    }
  };

  let delfun = i => {
    fetch(`https://yashas.pythonanywhere.com/api/posts/${i}/`, {
      method: "DELETE",
      headers: {
        Authorization:
          "Token " + localStorage.getItem("username:authtoken").split(":")[1]
      }
    })
      .then(res => res)
      .then(da => {
        if (da.ok) {
          refreshfun();
          scrollTo(0, 0);
          delsuc = true;
          window.setTimeout(() => (delsuc = false), 3000);
        }
      });
  };
</script>

<style>
  .content {
    margin: 17px 12%;
  }
  .dash {
    font-size: 50px;
    font-weight: 600;
  }
  .username {
    font-size: 25px;
    margin: 10px 0;
    font-weight: 300;
  }
  .ss {
    font-size: 25px;
  }
  .text-muted {
    font-size: 10px;
  }
  .alert {
    margin: 2px 15%;
  }
  .text-right {
    cursor: pointer;
  }
  .text-right:active {
    transform: translateY(2px);
  }
  @media (max-width: 750px) {
    .dash {
      font-size: 50px;
      font-weight: 600;
    }
    .username {
      font-size: 20px;
      font-weight: 500;
      margin: 3px 0;
    }
    .content {
      margin: 20px;
    }
    .alert {
      margin: 0px 5%;
    }
  }
</style>


{#if addsuc}
  <div class="alert alert-info" role="alert">
    <strong>Success -></strong>
    Post Posted ;).
  </div>
{/if}

{#if delsuc}
  <div class="alert alert-info" role="alert">
    <strong>Success -></strong>
    Post Deleted ;).
  </div>
{/if}

<div class="content">
  <div class="dash text-info">Posts</div>
  <div class="username mb-3">Welcome to the community!</div>
  <div class="ss text-light bg-info p-1">Create Post</div>
  <div class="input-group">
    <textarea
      bind:value={text}
      rows="4"
      class="form-control mt-3 mb-2"
      placeholder="Say Something..."
      aria-label="With textarea" />
  </div>
  <button on:click={sendfun} class="btn btn-outline-info mb-4 px-4">
    Post!
  </button>
  <div on:click={refreshfun} class="text-right text-info mb-1 mr-1">
    Refresh
  </div>
  {#each posts as post}
    <div class="card">
      <div class="card-body">

        {#if post.whose == localStorage.getItem('userid')}
          <button
            type="button"
            on:click={() => delfun(post.id)}
            class="close"
            aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        {/if}

        <div class="card-title text-info font-weight-bold text-capitalize">
          {post.username}
        </div>
        <h6 class="card-subtitle">{post.text}</h6>
        <div class="text-muted text-right">{dateformator(post.date)}</div>
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
</div>
