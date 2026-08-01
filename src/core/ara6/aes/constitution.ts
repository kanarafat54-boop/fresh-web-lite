export interface ConstitutionRule{

  id:string;

  title:string;

  description:string;

  mandatory:boolean;

}

export const constitution:ConstitutionRule[]=[

{
id:"R001",
title:"No Duplicate Features",
description:"Ara6 must never create functionality that already exists.",
mandatory:true
},

{
id:"R002",
title:"Core Registration",
description:"Every new ecosystem must register itself with Fresh Core.",
mandatory:true
},

{
id:"R003",
title:"Frontend Required",
description:"Every backend capability must have a user interface.",
mandatory:true
},

{
id:"R004",
title:"Permission First",
description:"Sensitive operations require explicit permission.",
mandatory:true
},

{
id:"R005",
title:"Architecture Compliance",
description:"Every proposal must follow Fresh Core architecture.",
mandatory:true
},

{
id:"R006",
title:"Owner Approval",
description:"No deployment without owner approval.",
mandatory:true
},

{
id:"R007",
title:"Security Review",
description:"Security validation must pass before deployment.",
mandatory:true
},

{
id:"R008",
title:"Testing Required",
description:"All generated code must pass automated tests.",
mandatory:true
},

{
id:"R009",
title:"Explainability",
description:"Every AI decision must include its reasoning summary.",
mandatory:true
},

{
id:"R010",
title:"Continuous Learning",
description:"Ara6 should learn from approved and rejected proposals.",
mandatory:true
}

];
