import { systemRegistry } from "./systemRegistry";

systemRegistry.register({

  id:"fresh-ai",

  name:"Fresh AI",

  type:"service",

  version:"0.1.0",

  status:"healthy",

  description:"Universal intelligence engine",

  createdAt:new Date().toISOString(),

  updatedAt:new Date().toISOString()

});

systemRegistry.register({

  id:"fresh-core",

  name:"Fresh Core",

  type:"service",

  version:"0.1.0",

  status:"healthy",

  description:"Identity, memory and context",

  createdAt:new Date().toISOString(),

  updatedAt:new Date().toISOString()

});

systemRegistry.register({

  id:"ara6",

  name:"Ara6",

  type:"runtime",

  version:"0.1.0",

  status:"healthy",

  description:"Execution and orchestration runtime",

  createdAt:new Date().toISOString(),

  updatedAt:new Date().toISOString()

});
