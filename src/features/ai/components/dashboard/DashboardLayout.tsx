import ConversationPanel from "../chat/ConversationPanel";

import MissionCard from "./MissionCard";
import PlanningCard from "./PlanningCard";
import Ara6RuntimeCard from "./Ara6RuntimeCard";
import FreshCoreCard from "./FreshCoreCard";
import QuickActionsCard from "./QuickActionsCard";
import AISuggestionsCard from "./AISuggestionsCard";

export default function DashboardLayout(){

  return(

    <>

      <ConversationPanel/>

      <MissionCard/>

      <PlanningCard/>

      <Ara6RuntimeCard/>

      <FreshCoreCard/>

      <QuickActionsCard/>

      <AISuggestionsCard/>

    </>

  );

}
