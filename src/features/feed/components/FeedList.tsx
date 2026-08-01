import FeedCard from "./FeedCard";
import { feedService } from "../services/feedService";

export default function FeedList(){

  const items=feedService.getFeed();

  return(

    <div>

      {items.map((item: any)=>(

        <FeedCard
          key={item.id}
          item={item}
        />

      ))}

    </div>

  );

}
