
export interface Permission {

 id:string;

 userId:string;

 resource:string;

 action:string;

 allowed:boolean;

 createdAt:string;

}



class PermissionEngine {


 private permissions:Permission[]=[];



 grant(permission:Permission){

   this.permissions.push(permission);

 }



 revoke(id:string){

   this.permissions =
   this.permissions.filter(
    permission =>
    permission.id !== id
   );

 }



 check(
 resource:string,
 action:string
 ){

 return this.permissions.some(
 permission =>
 permission.resource === resource &&
 permission.action === action &&
 permission.allowed
 );

 }



 list(){

  return this.permissions;

 }


}



export const permissionEngine =
new PermissionEngine();

