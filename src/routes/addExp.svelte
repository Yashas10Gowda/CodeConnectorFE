<script>
import Nav from '../components/Nav.svelte'

let updatealert = false,erroralert=false,addingtext=false
let company='',jobtitle='',location='',jobdes='',frmdate,todate


let sendfun=()=>{
    addingtext=true
    //console.log(company,jobtitle,location,jobdes,frmdate,todate)
    fetch('https://yashas.pythonanywhere.com/api/experiences/',{headers:{'Content-Type':'application/json','Authorization':'Token '+localStorage.getItem('username:authtoken').split(':')[1]},method:"POST",body:JSON.stringify({
    "aff_company": company,
    "loc_company": location,
    "job_title":jobtitle,
    "job_des":jobdes,
    "to_date":todate,
    "frm_date":frmdate
})}).then((res)=>res).then((da)=>{da.ok?updatealert=true:erroralert=true;addingtext=false;window.scrollTo(0,0)})
}



</script>

<style>
.cre{
    font-size: 30px;
}
.form{
    margin: 5px 15%;
}
.alert{
    margin: 2px 15%;
}

@media(max-width:750px){
    .form{
        margin: 5px 5%;
    }
    .cre{
        font-size: 25px;
    }
    .alert{
      margin: 0px 5%;
    }
}
</style>

<svelte:head>
    <title>Add Experience</title>
</svelte:head>

<Nav />

{#if erroralert}
<div class="alert alert-danger alert-dismissible fade show" role="alert">
  <strong>Error --></strong> Oops something went wrong. Peace.
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>
{/if}

{#if updatealert}
<div class="alert alert-info alert-dismissible fade show" role="alert">
  <strong>Experience Added --></strong> Successful.
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>
{/if}

<div class="form" style="max-width:10in;">
<div class="cre my-4">Add Experience</div>
 


<div class="input-group my-2">
  <input bind:value={company} type="text" class="form-control" placeholder="Company Name" aria-label="Username" aria-describedby="basic-addon1">
</div>

<div class="input-group my-2">
  <input bind:value={jobtitle} type="text" class="form-control" placeholder="Job Title" aria-label="Username" aria-describedby="basic-addon1">
</div>

<div class="input-group my-2">
  <input bind:value={location} type="text" class="form-control" placeholder="Location of the Company" aria-label="Username" aria-describedby="basic-addon1">
  
</div><small id="emailHelp" class="form-text text-muted mb-3">&nbsp;City & state suggested (eg. Bengaluru, Karnataka).</small>

<div><span class="mr-2">From Date:</span><input bind:value={frmdate} type="date"></div>
<div class="my-3"><span class="mr-4">To Date:</span>&nbsp;<input bind:value={todate} type="date"></div>

<div class="input-group my-2">
  <textarea bind:value={jobdes} class="form-control" placeholder="Job Description." aria-label="With textarea"></textarea>
</div><small id="emailHelp" class="form-text text-muted mb-3">&nbsp;Description of how your job was.</small>

<button on:click={sendfun} class="btn btn-info">Add Experience</button>
{#if addingtext}
<div class="text-info mt-1 mb-4">Adding...</div>
{/if}
</div>