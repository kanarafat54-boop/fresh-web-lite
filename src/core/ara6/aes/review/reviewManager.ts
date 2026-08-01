import type { EngineeringReview } from "./review";

class ReviewManager{

private reviews:EngineeringReview[]=[];

add(review:EngineeringReview){

this.reviews.push(review);

}

getMissionReviews(
missionId:string
){

return this.reviews.filter(

review=>
review.missionId===missionId

);

}

approved(
missionId:string
){

return this.getMissionReviews(
missionId
).every(

review=>

review.decision==="approve"

);

}

}

export const reviewManager=
new ReviewManager();
