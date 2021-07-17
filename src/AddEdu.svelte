<script>
  import { link } from "svelte-routing"

  let updatealert = false,
    erroralert = false,
    addingtext = false;
  let college = "",
    degree = "",
    frmdate,
    todate;

  let sendfun = () => {
    addingtext = true;
    //console.log(company,jobtitle,location,jobdes,frmdate,todate)
    fetch("https://yashas.pythonanywhere.com/api/educations/", {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Token " + localStorage.getItem("username:authtoken").split(":")[1]
      },
      method: "POST",
      body: JSON.stringify({
        college: college,
        degree: degree,
        to_date: todate,
        frm_date: frmdate
      })
    })
      .then(res => res)
      .then(da => {
        da.ok ? (updatealert = true) : (erroralert = true);
        addingtext = false;
        window.scrollTo(0, 0);
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
  .alert {
    margin: 2px 15%;
  }

  @media (max-width: 750px) {
    .form {
      margin: 5px 5%;
    }
    .cre {
      font-size: 25px;
    }
    .alert {
      margin: 0px 5%;
    }
  }
</style>

<svelte:head>
  <title>Add Education</title>
</svelte:head>


{#if erroralert}
  <div class="alert alert-danger alert-dismissible fade show" role="alert">
    <strong>Error --></strong>
    Oops something went wrong. Peace.
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
{/if}

{#if updatealert}
  <div class="alert alert-info alert-dismissible fade show" role="alert">
    <strong>Education Added --></strong>
    Successful.
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
{/if}

<div class="form" style="max-width:10in;">
  <div class="cre my-4">Add Education</div>

  <div class="input-group my-2">
    <input
      bind:value={college}
      type="text"
      class="form-control"
      placeholder="College"
      aria-label="Username"
      aria-describedby="basic-addon1" />
  </div>

  <div class="input-group my-2">
    <input
      bind:value={degree}
      type="text"
      class="form-control"
      placeholder="Degree"
      aria-label="Username"
      aria-describedby="basic-addon1" />
  </div>

  <div class="mt-3">
    <span class="mr-2">From Date:</span>
    <input bind:value={frmdate} type="date" />
  </div>
  <div class="my-3">
    <span class="mr-4">To Date:</span>
    &nbsp;
    <input bind:value={todate} type="date" />
  </div>

  <button on:click={sendfun} class="btn btn-info mt-2">Add Education</button>
  <a href="/">
    <button class="btn btn-light mt-2 ml-2" use:link>Go Back</button>
  </a>
  {#if addingtext}
    <div class="text-info my-1">Adding...</div>
  {/if}
</div>
