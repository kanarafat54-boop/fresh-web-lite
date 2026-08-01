import { worldModel } from "./worldModel";

class DependencyAnalyzer{

analyze(id:string){

return worldModel
.getDependencies()
.filter(

dependency=>

dependency.from===id||

dependency.to===id

);

}

}

export const dependencyAnalyzer=
new DependencyAnalyzer();
