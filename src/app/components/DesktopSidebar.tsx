import { useLayout } from "../contexts/useLayout";
import "./DesktopSidebar.css";

type NavItem={id:string;label:string;icon:string;badge?:string};
const primary:NavItem[]=[
  {id:"feed",label:"Home",icon:"⌂"},{id:"fresh-flow",label:"Fresh AI",icon:"✦"},{id:"work",label:"Work",icon:"▦"},
  {id:"saved",label:"History",icon:"◷"},{id:"creator",label:"Templates",icon:"◇"},{id:"api-hub",label:"Integrations",icon:"⌘"},
];
const more:NavItem[]=[{id:"connect",label:"Connect",icon:"◌"},{id:"learn",label:"Academy",icon:"◎"},{id:"marketplace",label:"Marketplace",icon:"◇"}];
export default function DesktopSidebar(){
 const {activeRoute,setActiveRoute}=useLayout();
 const go=(id:string)=>setActiveRoute(id);
 return <aside className="fresh-desktop-sidebar" aria-label="Fresh workspace navigation">
  <div className="fresh-sidebar-workspace"><div className="fresh-sidebar-mark">F</div><div><strong>Fresh</strong><span>Universal workspace</span></div><button type="button" aria-label="Workspace menu">⌄</button></div>
  <button className="fresh-sidebar-create" type="button" onClick={()=>go("fresh-flow")}><span>＋</span><strong>New chat</strong><kbd>⌘ N</kbd></button>
  <div className="fresh-sidebar-scroll">
   <div className="fresh-sidebar-group"><span className="fresh-sidebar-label">Workspace</span>{primary.map(item=><button key={item.id} type="button" className={`fresh-sidebar-item ${activeRoute===item.id?"active":""}`} onClick={()=>go(item.id)} aria-current={activeRoute===item.id?"page":undefined}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></button>)}</div>
   <div className="fresh-sidebar-group"><span className="fresh-sidebar-label">Explore</span>{more.map(item=><button key={item.id} type="button" className={`fresh-sidebar-item ${activeRoute===item.id?"active":""}`} onClick={()=>go(item.id)}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></button>)}</div>
   <div className="fresh-sidebar-group"><span className="fresh-sidebar-label">Quick access</span><button type="button" className="fresh-sidebar-item" onClick={()=>go("create")}><i>＋</i><span>Create</span></button><button type="button" className="fresh-sidebar-item" onClick={()=>go("upload")}><i>↑</i><span>Upload</span></button></div>
  </div>
  <div className="fresh-sidebar-footer"><button type="button" onClick={()=>go("settings")}><span>⚙</span><span>Settings</span></button><button type="button" onClick={()=>go("profile")}><span className="fresh-sidebar-avatar">M</span><span className="fresh-sidebar-profile-copy"><strong>My profile</strong><small>Account & workspace</small></span><span>›</span></button></div>
 </aside>;
}
