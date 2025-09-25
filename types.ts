
export interface Book {
  id: string;
  class_level: string;
  subject: string;
  language: string | null;
  variant: string;
  price_inr: number;
}

export interface LanguageSelection {
  language: string;
  variant: string | null;
}

export interface QuestionnaireAnswers {
  classLevel: 'Nursery' | 'LKG' | 'UKG' | null;
  englishSkill: string | null;
  englishSkillWritingFocus: 'Caps' | 'Small' | 'Caps & Small' | null;
  englishWorkbookAssist: boolean | null;
  mathWorkbookAssist: boolean | null;
  mathSkill: string | null;
  assessment: 'Termwise' | 'Annual' | 'Annual (no marks)' | null;
  includeEVS: boolean;
  includeRhymes: boolean;
  includeArt: boolean;
  languages: {
    count: 0 | 1 | 2;
    selections: LanguageSelection[];
  };
}
