
export interface Ecosystem {


 id:string;

 name:string;

 category:string;

 description:string;

 enabled:boolean;

}



export const ecosystems:Ecosystem[]=[


{
id:"social",
name:"Social",
category:"communication",
description:"Feed, communities, groups and content",
enabled:true
},


{
id:"ai",
name:"Fresh AI",
category:"intelligence",
description:"Personal AI and assistants",
enabled:true
},


{
id:"creator",
name:"Creator Economy",
category:"creation",
description:"Creation and monetization tools",
enabled:true
},


{
id:"finance",
name:"Fresh Finance",
category:"money",
description:"Wallet payments and economy",
enabled:true
},


{
id:"learning",
name:"Fresh Academy",
category:"education",
description:"Learning and knowledge",
enabled:true
},


{
id:"developer",
name:"Developer Studio",
category:"software",
description:"Build applications with Ara6",
enabled:true
}


];

