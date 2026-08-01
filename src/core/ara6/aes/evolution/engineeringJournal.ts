export interface EngineeringJournalEntry{

id:string;

type:string;

title:string;

details:string;

timestamp:string;

}

class EngineeringJournal{

private entries:EngineeringJournalEntry[]=[];

record(entry:EngineeringJournalEntry){

this.entries.unshift(entry);

}

getAll(){

return this.entries;

}

}

export const engineeringJournal=
new EngineeringJournal();
