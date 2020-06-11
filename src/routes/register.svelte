<script>
import { goto } from '@sapper/app';
import Nav from '../components/Nav.svelte';

let username = ''
let password1 = ''
let email = ''
let password2 = ''
let createdalert = false

let registerfun=()=>{
  if (username!='' && password2!='' && email!='' && password1==password2 && email.includes('@') && email.includes('.')){
    fetch('https://yashas.pythonanywhere.com/api/users/',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({"username":username.toLowerCase(),"email":email,"password":password2})}).then((res)=>{
      if(res.ok){
        username=''
        password2=''
        password1=''
        email=''
        createdalert = true
        setTimeout(()=>goto('/login'),2000)
      }
    })
  }
}


</script>

<style>
.cre{
    font-size: 30px;
}
.form{
    margin: 5px 15%;
}
span{
    font-size: 14px;
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
<title>Register to CodeConnector</title>
</svelte:head>

<Nav />


{#if createdalert}
<div class="alert alert-info alert-dismissible fade show" role="alert">
  <strong>Account Registered --></strong> You're now a part of CodeConnector.
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>
{/if}
<div class="form" style="max-width:10in;">
<div class="cre my-4">Create Your Account</div>
<div class="form-group">
    <input bind:value={username} placeholder="Username" class="form-control text-lowercase" id="exampleInputEmail1" aria-describedby="emailHelp">
    <small id="emailHelp" class="form-text text-muted">Username must be one word.</small>
  </div>
  <div class="form-group">
    <input bind:value={email} type="email" placeholder="Email" class="form-control" id="exampleInputEmail2" aria-describedby="emailHelp">
    <small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small>
  </div>
  <div class="form-group">
    <input bind:value={password1} type="password" placeholder="Password" class="form-control" id="exampleInputPassword1">
  </div>
  <div class="form-group">
    <input bind:value={password2} type="password" placeholder="Confirm Password" class="form-control" id="exampleInputPassword2">
  </div>
  <button type="submit" on:click={registerfun} class="btn btn-dark mr-2">Register</button><span>Already have an account? <a class="text-info" href="/login">Log In</a></span>
</div>
