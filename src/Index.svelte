<script>
  import Nav from "./Nav.svelte";
  import { onMount } from "svelte";
  import { link } from "svelte-spa-router";

  let username = null;
  onMount(() => {
    username = window.localStorage.getItem("username:authtoken");
    if (username != null) {
      username = username.split(":")[0];
    }
    window.console.log(
      "%cYashas Gowda (a.k.a Yacchi) developed this.\nPeace.",
      "color:#17a2b8;font-size:20px;"
    );
  });
  let userid;
  let userexps = [];
  let useredus = [];
  let devobjs = [];
  let d;

  let dateformator = (date) => {
    d = new Date(date);
    return d.toLocaleDateString();
  };

  onMount(() => {
    if (username != null) {
      fetch("https://yashas.pythonanywhere.com/api/developers/")
        .then((res) => res.json())
        .then((da) =>
          da.forEach((element) => {
            if (element.username == username) {
              userid = element.user;
              localStorage.setItem("userid", userid);
            }
          })
        );

      fetch("https://yashas.pythonanywhere.com/api/experiences/")
        .then((res) => res.json())
        .then((da) =>
          da.forEach((element) => {
            if (element.whose == localStorage.getItem("userid")) {
              userexps = [...userexps, element];
            }
          })
        );

      fetch("https://yashas.pythonanywhere.com/api/educations/")
        .then((res) => res.json())
        .then((da) =>
          da.forEach((element) => {
            if (element.whose == localStorage.getItem("userid")) {
              useredus = [...useredus, element];
            }
          })
        );
    }
  });
</script>

<svelte:head>
  {#if username == null}
    <title>Welcome to CodeConnector</title>
  {:else}
    <title>Welcome {username.toUpperCase()}</title>
  {/if}
</svelte:head>

<Nav />

{#if username == null}
  <div class="jumbotron bg-dark text-light text-center rounded-0">
    <h1 class="display-3 text-dark">Code Connector</h1>
    <p class="lead">
      Create a developer profile/portfolio, share posts and get help from other
      developers.
    </p>
    <hr class="mt-3 hr" />
    <a class="btn btn-dark mt-3 px-2" href="/register" role="button" use:link>
      Register
    </a>
    <a class="btn btn-dark mt-3 px-3" href="/login" role="button" use:link>
      Login
    </a>
  </div>
{:else}
  <div class="content">
    <div class="dash text-info">Dashboard</div>
    <div class="username">Welcome {username.toUpperCase()}</div>
    {#if userid}
      <a href="/profileEdit" class="btn btn-outline-info btn-sm mt-1" use:link>
        Edit Info
      </a>
      <a href="/addEdu" class="btn btn-outline-info btn-sm mt-1" use:link>
        Add Education
      </a>
      <a href="/addExp" class="btn btn-outline-info btn-sm mt-1" use:link>
        Add Experience
      </a>

      <div class="exp mt-4 text-info">Experience Credentials</div>
      <table
        class="table table-hover table-sm table-borderless table-active
        text-dark"
      >
        <thead>
          <tr>
            <th scope="col">Company</th>
            <th scope="col">Title</th>
            <th scope="col">Years</th>
          </tr>
        </thead>
        <tbody>
          {#each userexps as userexp}
            <tr>
              <td>{userexp.aff_company}</td>
              <td>{userexp.job_title}</td>
              <td>
                {dateformator(userexp.frm_date) +
                  " - " +
                  dateformator(userexp.to_date)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <div class="exp mt-3 text-info">Education Credentials</div>

      <table
        class="table table-hover table-sm table-borderless table-active
        text-dark"
      >
        <thead>
          <tr>
            <th scope="col">College</th>
            <th scope="col">Degree</th>
            <th scope="col">Years</th>
          </tr>
        </thead>
        <tbody>
          {#each useredus as useredu}
            <tr>
              <td>{useredu.college}</td>
              <td>{useredu.degree}</td>
              <td>
                {dateformator(useredu.frm_date) +
                  " - " +
                  dateformator(useredu.to_date)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- <button class="btn btn-danger btn-sm mt-4">Delete My Account</button> -->
    {:else}
      <div>
        You have not added any info to your profile yet, please do add some.
      </div>
      <a href="/profileEdit" use:link>
        <button class="btn btn-info btn-sm mt-3">Add Info</button>
      </a>
    {/if}
  </div>

  <div class="my-5">&nbsp;</div>
{/if}

<style>
  h1.display-3 {
    margin-top: 8%;
    background-color: #17a2b8;
  }
  .btn-dark {
    color: #343a40;
    background-color: #17a2b8;
  }
  .btn-info {
    font-size: 20px;
  }
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
  .btn-outline-info {
    max-width: 5in;
  }
  .exp {
    font-size: 30px;
    font-weight: 500;
  }
  .jumbotron {
    background-image: linear-gradient(
        to right,
        rgba(52, 58, 64, 0.7),
        rgba(52, 58, 64, 0.9)
      ),
      url("https://yashas.pythonanywhere.com/static/img/ccpic1.jpg");
    height: 90vh;
    background-position: 75% 85%;
  }
  table {
    max-width: 8in;
  }
  @media (max-width: 750px) {
    .display-3 {
      margin-top: 25% !important;
      margin-bottom: 10%;
      font-size: 40px;
    }
    .dash {
      font-size: 50px;
      font-weight: 600;
    }
    .username {
      font-size: 30px;
      font-weight: 500;
      margin: 3px 0;
    }
    .content {
      margin: 20px;
    }
  }
  .lead {
    color: #17a2b8;
    background-color: #343a40;
    display: inline-block;
  }
  .hr {
    background-color: #17a2b8;
    color: #17a2b8;
  }
</style>
