import "./SmartProfileCard.css";

interface Props{

mode:string;

}

export default function SmartProfileCard({mode}:Props){

return(

<div className="smart-profile-card">

<div className="smart-header">

<h2>Dynamic Smart Profile</h2>

<span className="smart-mode">

{mode}

</span>

</div>

<div className="smart-grid">

<div className="smart-tile">

<h3>Creator</h3>

<p>Create content and grow your audience.</p>

</div>

<div className="smart-tile">

<h3>Learning</h3>

<p>Continue your learning journey.</p>

</div>

<div className="smart-tile">

<h3>Developer</h3>

<p>Build projects with Ara6.</p>

</div>

<div className="smart-tile">

<h3>Business</h3>

<p>Manage business and revenue.</p>

</div>

</div>

</div>

);

}
