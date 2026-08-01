
import {
createContext,
useContext,
useEffect,
useState
} from "react";

import {
contextService
} from "../../core/fresh-core";


const FreshCoreContext =
createContext<any>(null);



export function FreshCoreProvider(
{
children
}:{
children:React.ReactNode
}
){


const [ready,setReady]=useState(false);



useEffect(()=>{


contextService.initialize({

userId:"guest",

activeSpace:"ai",

goals:[],

interests:[],

skills:[],

projects:[],

device:{
platform:navigator.platform,
type:"web"
},

timestamp:
new Date().toISOString()

});


setReady(true);


},[]);



return (

<FreshCoreContext.Provider
value={{
ready,
context:contextService.get()
}}
>

{children}

</FreshCoreContext.Provider>

);


}



export function useFreshCore(){

return useContext(
FreshCoreContext
);

}

