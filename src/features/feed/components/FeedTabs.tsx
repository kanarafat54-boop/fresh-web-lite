import { useState } from "react";
import { feedCategories } from "../data/categories";

export default function FeedTabs(){

  const [active,setActive]=useState("posts");

  return(

    <div className="feed-tabs">

      {feedCategories.map(category=>(

        <button

          key={category.id}

          className={
            active===category.id
            ? "feed-tab active"
            : "feed-tab"
          }

          onClick={()=>setActive(category.id)}

        >

          <span>{category.icon}</span>

          <span>{category.name}</span>

        </button>

      ))}

    </div>

  );

}
