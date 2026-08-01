import "./ProfileHeader.css";

interface Props{

displayName:string;

username:string;

freshId:string;

verified:boolean;

followers:number;

following:number;

posts:number;

}

export default function ProfileHeader({

displayName,

username,

freshId,

verified,

followers,

following,

posts

}:Props){

return(

<div className="profile-header-card">

<div className="profile-cover"/>

<div className="profile-avatar">

{displayName.charAt(0)}

</div>

<h2>

{displayName}

{verified && <span className="verified-badge">✓</span>}

</h2>

<p>@{username}</p>

<p className="fresh-id">{freshId}</p>

<div className="profile-stats">

<div>

<strong>{followers}</strong>

<span>Followers</span>

</div>

<div>

<strong>{following}</strong>

<span>Following</span>

</div>

<div>

<strong>{posts}</strong>

<span>Posts</span>

</div>

</div>

</div>

);

}
