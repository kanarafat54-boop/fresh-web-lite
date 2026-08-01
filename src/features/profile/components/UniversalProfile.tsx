import "./UniversalProfile.css";
import { demoProfile } from "../services/profileService";

export default function UniversalProfile(){

return(

<div className="universal-profile">

<div className="profile-cover"/>

<div className="profile-header">

<div className="profile-avatar">
{demoProfile.displayName.charAt(0)}
</div>

<div>

<h2>{demoProfile.displayName}</h2>

<p>@{demoProfile.username}</p>

<p>{demoProfile.freshId}</p>

</div>

</div>

<div className="ai-card">

<h3>Fresh AI</h3>

<p>
Welcome back,
{demoProfile.displayName}.
Your digital world is ready.
</p>

</div>

<div className="profile-grid">

<div className="profile-card">
<h3>Identity</h3>
<p>{demoProfile.bio}</p>
</div>

<div className="profile-card">
<h3>Portfolio</h3>
<p>Projects, certificates and achievements.</p>
</div>

<div className="profile-card">
<h3>Analytics</h3>
<p>Personal insights will appear here.</p>
</div>

<div className="profile-card">
<h3>Ecosystems</h3>
<p>Learning • Wallet • Creator • Business</p>
</div>

</div>

</div>

);

}
