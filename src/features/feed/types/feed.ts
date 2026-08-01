export interface FeedItem{

  id:string;

  type:
    |"post"
    |"short"
    |"video"
    |"live"
    |"story"
    |"news";

  author:string;

  title:string;

  description:string;

  thumbnail?:string;

  createdAt:string;

}
