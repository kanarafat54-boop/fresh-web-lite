class ValidationEngine{

validate(){

return{

valid:true,

errors:[] as string[],

warnings:[] as string[]

};

}

}

export const validationEngine=
new ValidationEngine();
