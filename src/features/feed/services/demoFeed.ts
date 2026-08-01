import { feedService } from "./feedService";

feedService.add({

 id:"1",

 type:"post",

 author:"Fresh Team",

 title:"Welcome to Fresh Web Lite",

 description:"Your intelligent digital ecosystem starts here.",

 createdAt:new Date().toISOString()

});

feedService.add({

 id:"2",

 type:"short",

 author:"Fresh AI",

 title:"60 Seconds of AI",

 description:"Discover today's AI insight.",

 createdAt:new Date().toISOString()

});
