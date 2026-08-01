import "./AIWelcomeCard.css";

interface Props{

name:string;

}

export default function AIWelcomeCard({name}:Props){

return(

<div className="ai-welcome-card">

<div className="ai-header">

<h2>Fresh AI</h2>

<span className="ai-status">
● Online
</span>

</div>

<h3>

Welcome back,

{name}.

</h3>

<p>

Your digital world is ready.

</p>

<div className="ai-insights">

<div>

<strong>3</strong>

<span>Insights</span>

</div>

<div>

<strong>2</strong>

<span>Suggestions</span>

</div>

<div>

<strong>1</strong>

<span>Mission</span>

</div>

<div>

<strong>0</strong>

<span>Alerts</span>

</div>

</div>

<button className="open-ai-btn">

Open Fresh AI

</button>

</div>

);

}
