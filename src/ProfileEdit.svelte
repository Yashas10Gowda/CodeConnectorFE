<script>
  import { onMount } from "svelte";
  import { link } from "svelte-routing"
  
  let socnet = false;
  let updatealert = false,
    erroralert = false,
    submittingtext = false;
  let selectedcareer = "",
    company = "",
    website = "",
    location = "",
    skills = "",
    githubUsername = null,
    bio = null,
    tweet = null,
    insta = null,
    yt = null,
    linkedin = null,
    fb = null;

  onMount(() => {
    // Since it was unable to bind the value as such.
    selectedcareer = document.getElementById("inputGroupSelect01");
    fetch(
      `https://yashas.pythonanywhere.com/api/developers/${localStorage.getItem(
        "userid"
      )}/`
    )
      .then(res => res.json())
      .then(da => {
        selectedcareer.options[selectedcareer.selectedIndex].text =
          da.career == undefined
            ? "Select Your Professional Status"
            : da.career;
        company = da.company == undefined ? "" : da.company;
        website = da.portfolioweb == undefined ? "" : da.portfolioweb;
        location = da.location == undefined ? "" : da.location;
        skills = da.skills == undefined ? "" : da.skills;
        bio = da.bio == undefined ? null : da.bio;
        githubUsername = da.github == undefined ? null : da.github;
        linkedin = da.linkedinlink == undefined ? null : da.linkedinlink;
        tweet = da.tweetlink == undefined ? null : da.tweetlink;
        fb = da.fblink == undefined ? null : da.fblink;
        yt = da.youtubelink == undefined ? null : da.youtubelink;
        insta = da.instalink == undefined ? null : da.instalink;
      });
  });

  let sendfun = () => {
    submittingtext = true;
    //console.log(selectedcareer.options[selectedcareer.selectedIndex].text,company,website,location,skills,githubUsername,bio,tweet,insta,yt,linkedin,fb)
    fetch("https://yashas.pythonanywhere.com/api/developers/", {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Token " + localStorage.getItem("username:authtoken").split(":")[1]
      },
      method: "POST",
      body: JSON.stringify({
        career: selectedcareer.options[selectedcareer.selectedIndex].text,
        company: company,
        portfolioweb: website,
        location: location,
        skills: skills,
        bio: bio,
        github: githubUsername == "" ? null : githubUsername,
        linkedinlink: linkedin == "" ? null : linkedin,
        tweetlink: tweet == "" ? null : tweet,
        fblink: fb == "" ? null : fb,
        instalink: insta == "" ? null : insta,
        youtubelink: yt == "" ? null : yt,
        username: localStorage.getItem("username:authtoken").split(":")[0]
      })
    })
      .then(res => res)
      .then(da => {
        da.ok ? (updatealert = true) : (erroralert = true);
        submittingtext = false;
        window.setTimeout(() => {
          erroralert = false;
          updatealert = false;
        }, 3000);
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
  <title>Edit your Profile</title>
</svelte:head>

{#if erroralert}
  <!-- <div class="alert alert-danger alert-dismissible fade show" role="alert">
  <strong>Error -></strong> Oops something went wrong. Peace.
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div> -->
  <div class="alert alert-info" role="alert">
    <strong>Error --></strong>
    Oops something went wrong. Peace.
  </div>
{/if}

{#if updatealert}
  <!-- <div class="alert alert-info alert-dismissible fade show" role="alert">
  <strong>Profile Updated -></strong> You're developer profile is up to date.
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div> -->
  <div class="alert alert-info" role="alert">
    <strong>Profile Updated -></strong>
    You're developer profile is up to date.
  </div>
{/if}

<div class="form" style="max-width:10in;">
  <div class="cre my-4">Edit/Create Your Profile</div>
  <div class="input-group">
    <select class="custom-select" id="inputGroupSelect01">
      <option selected>Select Your Professional Status</option>
      <option>Developer</option>
      <option>Senior Developer</option>
      <option>Junior Developer</option>
      <option>Manager</option>
      <option>Student or Learning</option>
      <option>Instructor or Teacher</option>
      <option>Intern</option>
      <option>Other</option>
    </select>
  </div>
  <small id="emailHelp" class="form-text text-muted mb-3">
    &nbsp;Give us an idea of where you are at in your career.
  </small>

  <div class="input-group">
    <input
      bind:value={company}
      type="text"
      class="form-control"
      placeholder="Company Name"
      aria-label="Username"
      aria-describedby="basic-addon1" />

  </div>
  <small id="emailHelp" class="form-text text-muted mb-3">
    &nbsp;Could be your own company or one you work for.
  </small>

  <div class="input-group">
    <input
      bind:value={website}
      type="url"
      class="form-control"
      placeholder="Website"
      aria-label="Username"
      aria-describedby="basic-addon1" />

  </div>
  <small id="emailHelp" class="form-text text-muted mb-3">
    &nbsp;Could be your own portfolio or your company's website.
  </small>

  <div class="input-group">
    <input
      bind:value={location}
      type="text"
      class="form-control"
      placeholder="Location"
      aria-label="Username"
      aria-describedby="basic-addon1" />

  </div>
  <small id="emailHelp" class="form-text text-muted mb-3">
    &nbsp;City & state suggested (eg. Bengaluru, Karnataka).
  </small>

  <div class="input-group">
    <input
      bind:value={skills}
      type="text"
      class="form-control"
      placeholder="Skills"
      aria-label="Username"
      aria-describedby="basic-addon1" />

  </div>
  <small id="emailHelp" class="form-text text-muted mb-3">
    &nbsp;Please use commas(eg. Python,JavaScript).
  </small>

  <div class="input-group">
    <input
      bind:value={githubUsername}
      type="text"
      class="form-control"
      placeholder="GitHub Username"
      aria-label="Username"
      aria-describedby="basic-addon1" />

  </div>
  <small id="emailHelp" class="form-text text-muted mb-3">
    &nbsp;If you want your Avatar and Github link to appear, Do include your
    username.
  </small>

  <div class="input-group">
    <textarea
      bind:value={bio}
      class="form-control"
      placeholder="A short bio of yourself."
      aria-label="With textarea" />
  </div>
  <small id="emailHelp" class="form-text text-muted mb-3">
    &nbsp;Tell us a little about yourself.
  </small>

  <button on:click={() => (socnet = !socnet)} class="btn btn-secondary mr-4">
    Add Social Network Skills
  </button>
  <span>Optional</span>
  <br />

  {#if socnet}
    <div class="socnet my-3">
      <div class="input-group mb-2">
        <input
          bind:value={tweet}
          type="url"
          class="form-control"
          placeholder="Your Twitter URL"
          aria-label="Username"
          aria-describedby="basic-addon1" />
      </div>
      <div class="input-group mb-2">
        <input
          bind:value={insta}
          type="url"
          class="form-control"
          placeholder="Your Instagram URL"
          aria-label="Username"
          aria-describedby="basic-addon1" />
      </div>
      <div class="input-group mb-2">
        <input
          bind:value={fb}
          type="url"
          class="form-control"
          placeholder="Your Facebook URL"
          aria-label="Username"
          aria-describedby="basic-addon1" />
      </div>
      <div class="input-group mb-2">
        <input
          bind:value={linkedin}
          type="url"
          class="form-control"
          placeholder="Your LinkedIn URL"
          aria-label="Username"
          aria-describedby="basic-addon1" />
      </div>
      <div class="input-group mb-2">
        <input
          bind:value={yt}
          type="url"
          class="form-control"
          placeholder="Your Youtube URL"
          aria-label="Username"
          aria-describedby="basic-addon1" />
      </div>
    </div>
  {/if}

  <button on:click={sendfun} class="btn btn-info mt-4">Submit</button>
  <a href="/" use:link>
    <button class="btn btn-light mt-4 ml-2">Go Back</button>
  </a>
  {#if submittingtext}
    <div class="text-info my-1">Submitting...</div>
  {/if}
  <div class="my-5" />
</div>
