import { evolutionGraph } from "./evolutionGraph";

evolutionGraph.register({

id:"search-v1",

title:"Fresh Search",

description:"Universal search foundation.",

ecosystem:"search",

version:"1.0.0",

parentId:null,

createdAt:new Date().toISOString()

});

evolutionGraph.register({

id:"search-v2",

title:"AI Search",

description:"Context-aware intelligent search.",

ecosystem:"search",

version:"2.0.0",

parentId:"search-v1",

createdAt:new Date().toISOString()

});

evolutionGraph.register({

id:"search-v3",

title:"Knowledge Fusion",

description:"Search across internal and external knowledge.",

ecosystem:"search",

version:"3.0.0",

parentId:"search-v2",

createdAt:new Date().toISOString()

});
