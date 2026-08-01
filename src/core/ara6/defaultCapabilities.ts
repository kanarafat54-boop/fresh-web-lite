import { capabilityRegistry } from "./capabilityRegistry";

capabilityRegistry.register({

  id:"build-website",

  name:"Build Website",

  description:"Create and deploy a website",

  tools:[
    "fresh-ai",
    "security"
  ],

  ecosystems:[
    "ai",
    "developer"
  ]

});

capabilityRegistry.register({

  id:"send-money",

  name:"Send Money",

  description:"Transfer money securely",

  tools:[
    "wallet",
    "security"
  ],

  ecosystems:[
    "finance"
  ]

});

capabilityRegistry.register({

  id:"publish-video",

  name:"Publish Video",

  description:"Upload and distribute videos",

  tools:[
    "feed",
    "fresh-ai"
  ],

  ecosystems:[
    "social",
    "creator"
  ]

});
