export interface FeedCategory{

  id:string;

  name:string;

  icon:string;

}

export const feedCategories:FeedCategory[]=[

  {
    id:"stories",
    name:"Stories",
    icon:"📖"
  },

  {
    id:"posts",
    name:"Posts",
    icon:"📝"
  },

  {
    id:"shorts",
    name:"Shorts",
    icon:"🎬"
  },

  {
    id:"videos",
    name:"Videos",
    icon:"📺"
  },

  {
    id:"live",
    name:"Live",
    icon:"🔴"
  },

  {
    id:"news",
    name:"News",
    icon:"📰"
  },

  {
    id:"communities",
    name:"Communities",
    icon:"👥"
  },

  {
    id:"learn",
    name:"Learn",
    icon:"🎓"
  },

  {
    id:"market",
    name:"Market",
    icon:"🛒"
  },

  {
    id:"jobs",
    name:"Jobs",
    icon:"💼"
  }

];
