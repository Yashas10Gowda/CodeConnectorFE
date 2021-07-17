<script>
  import Nav from './Nav.svelte'
  const devobj = JSON.parse(sessionStorage.getItem("devdetail"));

  let devid = devobj.user;
  let devexps = [];
  let devedus = [];

  fetch("https://yashas.pythonanywhere.com/api/experiences/")
    .then(res => res.json())
    .then(da => {
      da.forEach(element => {
        if (element.whose == devid) {
          devexps = [...devexps, element];
        }
      });
    });

  fetch("https://yashas.pythonanywhere.com/api/educations/")
    .then(res => res.json())
    .then(da => {
      da.forEach(element => {
        if (element.whose == devid) {
          devedus = [...devedus, element];
        }
      });
    });
</script>

<style>
  .card {
    max-width: 11in;
    border-radius: 0px;
    color: white;
  }
  .usr {
    font-size: 40px;
    font-weight: 600;
  }
  .car {
    font-size: 20px;
  }
  .user {
    font-size: 25px;
  }
</style>

<svelte:head>
  <title>{devobj.username.toUpperCase()}'s Details</title>
</svelte:head>

<Nav />

<div class="card bg-info mx-auto mt-3">

  <div class="card-body text-center">
    <img
      style="max-width:300px;"
      src={devobj.avatarurl ? devobj.avatarurl : 'https://yashas.pythonanywhere.com/static/img/profile-icon.png'}
      class="rounded-circle mb-4"
      alt="" />
    <div class="usr text-center">{devobj.username.toUpperCase()}</div>
    <div class="car text-center">{devobj.career}</div>
    <div class="text-center mt-4">{devobj.location}</div>
    <div class="mx-auto my-2 text-center">
      {#if devobj.portfolioweb != null}
        <a
          class="btn btn-sm btn-outline-light mb-2"
          target="_blank"
          href={devobj.portfolioweb}
          role="button">
          Web
        </a>
      {/if}
      {#if devobj.github != null}
        <a
          class="btn btn-sm btn-outline-light mb-2"
          target="_blank"
          href="https://github.com/{devobj.github}/"
          role="button">
          GitHub
        </a>
      {/if}
      {#if devobj.linkedinlink != null}
        <a
          class="btn btn-sm btn-outline-light mb-2"
          target="_blank"
          href={devobj.linkedinlink}
          role="button">
          LinkedIn
        </a>
      {/if}
      {#if devobj.tweetlink != null}
        <a
          class="btn btn-sm btn-outline-light mb-2"
          target="_blank"
          href={devobj.tweetlink}
          role="button">
          Twitter
        </a>
      {/if}
      {#if devobj.fblink != null}
        <a
          class="btn btn-sm btn-outline-light mb-2"
          target="_blank"
          href={devobj.fblink}
          role="button">
          Facebook
        </a>
      {/if}
      {#if devobj.instalink != null}
        <a
          class="btn btn-sm btn-outline-light mb-2"
          target="_blank"
          href={devobj.instalink}
          role="button">
          Instagram
        </a>
      {/if}
      {#if devobj.youtubelink != null}
        <a
          class="btn btn-sm btn-outline-light mb-2"
          target="_blank"
          href={devobj.youtubelink}
          role="button">
          Youtube
        </a>
      {/if}
    </div>
  </div>
</div>

<div class="card bg-light my-3 mx-auto">
  <div class="card-body text-dark text-center">
    <div class="user text-info">{devobj.username.toUpperCase()}'s Bio</div>
    {devobj.bio}
    <hr />
    <div class="user text-info mb-2">Skills</div>
    {#each devobj.skills.split(',') as skill}
      <span
        style="border-radius:15px;display:inline-block;"
        class="bg-info center text-light mr-1 px-2 mb-1">
        {skill.trim()}
      </span>
    {/each}
  </div>
</div>

<div class="card mx-auto">
  <div class="row">
    <div class="col-md-6">
      <div class="card border border-light">
        <div class="card-body">
          <div class="user text-info">Experience</div>
          {#each devexps as devexp}
            <div class="car text-dark">{devexp.aff_company}</div>
            <div class="text-dark">
              <strong>From</strong>
              : {devexp.frm_date} &nbsp;
              <strong>To</strong>
              : {devexp.to_date}
            </div>
            <div class="text-dark">
              <strong>Position</strong>
              : {devexp.job_title}
            </div>
            <div class="text-dark">
              <strong>Description</strong>
              : {devexp.job_des}
            </div>
            <br />
          {:else}
            <div class="text-dark">Not Available</div>
          {/each}
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="card border border-light">
        <div class="card-body">
          <div class="user text-info">Education</div>
          {#each devedus as devedu}
            <div class="car text-dark">{devedu.college}</div>
            <div class="text-dark">
              <strong>From</strong>
              : {devedu.frm_date} &nbsp;
              <strong>To</strong>
              : {devedu.to_date}
            </div>
            <div class="text-dark">
              <strong>Degree</strong>
              : {devedu.degree}
            </div>
            <br />
          {:else}
            <div class="text-dark">Not Available</div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<div class="my-4" />
