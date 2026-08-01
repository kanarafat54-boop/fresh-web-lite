export interface Intent {

  text: string;

  goal: string;

  confidence: number;

}

class IntentAnalyzer {

  analyze(input: string): Intent {

    const text = input.trim().toLowerCase();

    return {

      text: input,

      goal: text,

      confidence: 1.0

    };

  }

}

export const intentAnalyzer =
new IntentAnalyzer();
