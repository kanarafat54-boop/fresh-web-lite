import {
  createContext,
  useContext,
  useState,
  type ReactNode
} from "react";

interface DashboardState {

  mission:string;

  progress:number;

  runtime:string;

  suggestion:string;

}

interface DashboardContextType{

  dashboard:DashboardState;

  setDashboard:(data:DashboardState)=>void;

}

const DashboardContext =
createContext<DashboardContextType | null>(null);

export function DashboardProvider({
  children
}:{
  children:ReactNode;
}){

  const [dashboard,setDashboard]=useState<DashboardState>({

    mission:"Build Fresh Web Lite",

    progress:18,

    runtime:"Healthy",

    suggestion:"Continue building Fresh AI"

  });

  return(

    <DashboardContext.Provider
      value={{
        dashboard,
        setDashboard
      }}
    >

      {children}

    </DashboardContext.Provider>

  );

}

export function useDashboard(){

  const context=
  useContext(DashboardContext);

  if(!context){

    throw new Error(
      "DashboardProvider missing"
    );

  }

  return context;

}
