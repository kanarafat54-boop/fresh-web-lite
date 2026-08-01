export interface NavigationItem{

  id:string;

  title:string;

  icon:string;

  children?:NavigationItem[];

}

export const homeNavigation:NavigationItem[]=[

{
id:"stories",
title:"Stories",
icon:"📖",
children:[

{ id:"friends",title:"Friends",icon:"👥" },

{ id:"discover",title:"Discover",icon:"✨" },

{ id:"business",title:"Business",icon:"🏢" },

{ id:"archive",title:"Archive",icon:"📚" },

{ id:"studio",title:"Story Studio",icon:"🎨" }

]

},

{
id:"posts",
title:"Posts",
icon:"📝",
children:[

{ id:"foryou",title:"For You",icon:"⭐" },

{ id:"following",title:"Following",icon:"❤️" },

{ id:"discussions",title:"Discussions",icon:"💬" },

{ id:"knowledge",title:"Knowledge",icon:"🧠" },

{ id:"saved",title:"Saved",icon:"🔖" }

]

},

{
id:"shorts",
title:"Shorts",
icon:"🎬",
children:[

{ id:"learn",title:"Learn",icon:"🎓" },

{ id:"music",title:"Music",icon:"🎵" },

{ id:"gaming",title:"Gaming",icon:"🎮" },

{ id:"sports",title:"Sports",icon:"⚽" },

{ id:"technology",title:"Technology",icon:"💻" }

]

}

];
