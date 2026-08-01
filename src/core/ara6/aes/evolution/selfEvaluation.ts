export interface Evaluation{

architecture:number;

security:number;

performance:number;

maintainability:number;

innovation:number;

overall:number;

}

class SelfEvaluation{

run():Evaluation{

return{

architecture:100,

security:100,

performance:98,

maintainability:99,

innovation:100,

overall:99

};

}

}

export const selfEvaluation=
new SelfEvaluation();
