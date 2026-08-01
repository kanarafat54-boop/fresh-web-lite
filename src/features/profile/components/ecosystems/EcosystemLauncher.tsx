import "./EcosystemLauncher.css";

const ecosystems=[

"Discovery",

"Messages",

"Wallet",

"Learning",

"Creator",

"Developer",

"Business",

"Marketplace",

"Groups",

"Gaming",

"Health",

"Travel"

];

export default function EcosystemLauncher(){

return(

<div className="ecosystem-launcher">

<h2>Your Ecosystems</h2>

<div className="ecosystem-grid">

{ecosystems.map(item=>(

<button
key={item}
className="ecosystem-card">

<h3>{item}</h3>

<p>Open</p>

</button>

))}

</div>

</div>

);

}
