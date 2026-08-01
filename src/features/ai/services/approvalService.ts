export interface Approval{

  id:string;

  action:string;

  approved:boolean;

}

class ApprovalService{

  private approvals:Approval[]=[];

  request(action:string){

    const approval={

      id:crypto.randomUUID(),

      action,

      approved:false

    };

    this.approvals.push(approval);

    return approval;

  }

  approve(id:string){

    const approval=

    this.approvals.find(

      item=>item.id===id

    );

    if(approval){

      approval.approved=true;

    }

  }

  getAll(){

    return this.approvals;

  }

}

export const approvalService=
new ApprovalService();
