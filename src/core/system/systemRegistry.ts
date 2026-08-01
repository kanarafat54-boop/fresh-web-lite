import type { SystemComponent } from "./component";

class SystemRegistry{

  private components:SystemComponent[]=[];

  register(component:SystemComponent){

    this.components.push(component);

  }

  getAll(){

    return this.components;

  }

  getByType(type:SystemComponent["type"]){

    return this.components.filter(

      component=>component.type===type

    );

  }

  updateStatus(

    id:string,

    status:SystemComponent["status"]

  ){

    const component=

      this.components.find(

        item=>item.id===id

      );

    if(component){

      component.status=status;

      component.updatedAt=

        new Date().toISOString();

    }

  }

}

export const systemRegistry=
new SystemRegistry();
