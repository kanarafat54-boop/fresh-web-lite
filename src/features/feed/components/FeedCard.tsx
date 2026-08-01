import type { FeedItem } from "../types/feed";

interface Props{
  item:FeedItem;
}

export default function FeedCard({item}:Props){

  return(

    <div className="feed-card">

      <div className="feed-card-header">

        <strong>{item.author}</strong>

        <span>{item.type.toUpperCase()}</span>

      </div>

      <h3>{item.title}</h3>

      <p>{item.description}</p>

    </div>

  );

}
