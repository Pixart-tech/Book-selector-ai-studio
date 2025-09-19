
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QuestionnaireAnswers, LanguageSelection } from '../types';
import { useAuth } from '../hooks/useAuth';
import { saveSelection } from '../services/api';
import { CATALOG } from '../data/catalog';

// --- OPTIONS CONFIGURATION ---
const OPTIONS = {
  englishSkill: {
    Nursery: ['ABCD', 'SATPIN', 'LTI', 'Jolly Phonics'],
    LKG: ['Caps+vowels', 'Small+vowels'],
    UKG: ['With cursive', 'Without cursive']
  },
  mathSkill: {
    Nursery: ['1–10', '1–20', '1–50'],
    LKG: ['1–100', '1–100 & 1–50 number names', '1–50 tens & ones'],
    UKG: ['1–100 & names', '1–200', '1–500']
  },
  assessment: [
    { value: 'Termwise', description: 'Assessments conducted at the end of each academic term.' },
    { value: 'Annual', description: 'Includes 4 tests, 1 mid-term, and 1 final term exam.' },
    { value: 'Annual (no marks)', description: 'Same structure as Annual, but without grade or mark reporting.' },
  ],
  languageOptions: {
    count: ['None', 'One', 'Two'],
    regions: ['Karnataka', 'Tamil Nadu', 'Other'],
    list: ['Kannada', 'Hindi', 'Tamil', 'Telugu', 'Marathi'],
    variants: {
        LKG: ['Swara V1', 'Swara V2'],
        UKG: ['Swara & Vyanjana V1', 'Swara & Vyanjana V2']
    },
    presets: {
        'Karnataka': ['Kannada', 'Hindi'],
        'Tamil Nadu': ['Tamil', 'Hindi'],
        'Other': []
    }
  }
};

type SummaryEntry = { label: string; value: string };

type SummaryItem = {
    key: string;
    label: string;
    value: string;
    step: number;
    canRemove?: boolean;
    onRemove?: () => void;
    bookId?: string | null;
    bookLabel?: string;
};

type SummaryBookIds = {
    englishSkill: string | null;
    englishWorkbook: string | null;
    mathSkill: string | null;
    mathWorkbook: string | null;
    assessment: string | null;
    evs: string | null;
    rhymes: string | null;
    art: string | null;
};

const formatEnglishSkillSummary = (answers: QuestionnaireAnswers): string => {
    if (!answers.englishSkill) return 'Not selected';
    return answers.englishSkillWritingFocus
        ? `${answers.englishSkill} (${answers.englishSkillWritingFocus})`
        : answers.englishSkill;
};

const getEnglishWorkbookSummary = (answers: QuestionnaireAnswers): string => {
    if (!answers.englishSkill) return 'Not selected';

    if (answers.classLevel === 'UKG' || answers.englishSkill === 'Jolly Phonics') {
        return answers.englishSkill;
    }

    if (answers.englishWorkbookAssist === null) {
        return 'Writing Assist not selected';
    }

    let skillVariant = answers.englishSkill;
    if (answers.englishSkill === 'LTI') {
        skillVariant = 'LTI (Caps)';
    } else if (answers.englishSkillWritingFocus) {
        skillVariant = `${answers.englishSkill} (${answers.englishSkillWritingFocus})`;
    }

    const assistText = answers.englishWorkbookAssist ? 'Writing Assist' : 'Normal';
    if (!skillVariant.includes('(')) {
        return `${skillVariant} (${assistText})`;
    }

    return `${skillVariant.slice(0, -1)}, ${assistText})`;
};

const getMathWorkbookSummary = (answers: QuestionnaireAnswers): string => {
    if (!answers.mathSkill) return 'Not selected';

    if (answers.classLevel === 'Nursery' || answers.classLevel === 'LKG') {
        if (answers.mathWorkbookAssist === null) {
            return 'Writing Assist not selected';
        }

        const assistText = answers.mathWorkbookAssist ? 'Writing Assist' : 'Normal';
        return `${answers.mathSkill} (${assistText})`;
    }

    return answers.mathSkill;
};

const getClassSummaryEntries = (answers: QuestionnaireAnswers): SummaryEntry[] => {
    const entries: SummaryEntry[] = [
        { label: 'English Skill', value: formatEnglishSkillSummary(answers) },
        { label: 'English Workbook', value: getEnglishWorkbookSummary(answers) },
        { label: 'Math Skill', value: answers.mathSkill || 'Not selected' },
        { label: 'Math Workbook', value: getMathWorkbookSummary(answers) },
        { label: 'Assessment', value: answers.assessment || 'Not selected' },
        { label: 'EVS', value: answers.includeEVS ? 'Included' : 'Not included' },
        { label: 'Rhymes & Stories', value: answers.includeRhymes ? 'Included' : 'Not included' },
        { label: 'Art & Craft', value: answers.includeArt ? 'Included' : 'Not included' },
    ];

    if (answers.classLevel && answers.classLevel !== 'Nursery') {
        const languages = answers.languages.selections
            .map(selection => {
                if (!selection.language) return null;
                return selection.variant
                    ? `${selection.language} (${selection.variant})`
                    : `${selection.language} (Variant pending)`;
            })
            .filter((value): value is string => Boolean(value));

        entries.push({
            label: 'Languages',
            value: languages.length ? languages.join(', ') : 'None selected',
        });
    }

    return entries;
};

const SummaryList: React.FC<{ entries: SummaryEntry[]; containerClassName?: string; itemClassName?: string; textClassName?: string }> = ({
    entries,
    containerClassName = '',
    itemClassName = 'px-6 py-3',
    textClassName = 'text-gray-700',
}) => (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${containerClassName}`}>
        <dl className={`divide-y divide-gray-200 ${textClassName}`}>
            {entries.map(({ label, value }, index) => (
                <div key={`${label}-${index}`} className={`${itemClassName} sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start`}>
                    <dt className="font-semibold text-gray-900">{label}</dt>
                    <dd className="mt-1 sm:mt-0 sm:col-span-2">{value}</dd>
                </div>
            ))}
        </dl>
    </div>
);

// --- UI COMPONENTS ---
const RadioCard = ({ id, name, value, label, description, checked, onChange }: { id: string, name: string, value: string, label: string, description: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <label
        className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 ${checked ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500' : 'bg-white border-gray-300 hover:border-primary-400'}`}
    >
        <div className="flex items-center h-5">
            <input
                id={id}
                name={name}
                type="radio"
                value={value}
                checked={checked}
                onChange={onChange}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
            />
        </div>
        <div className="ml-3 text-sm">
            <span className="font-medium text-gray-900">{label}</span>
            {description && <p className="text-gray-500">{description}</p>}
        </div>
    </label>
);

const CheckboxCard = ({ id, name, label, description, checked, onChange }: { id: string, name: string, label: string, description: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${checked ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500' : 'bg-white border-gray-300 hover:border-primary-400'}`}>
        <div className="flex items-center h-5"><input id={id} name={name} type="checkbox" checked={checked} onChange={onChange} className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"/></div>
        <div className="ml-3 text-sm">
            <label htmlFor={id} className="font-medium text-gray-900 cursor-pointer">{label}</label>
            <p className="text-gray-500">{description}</p>
        </div>
    </div>
);

const BookPreviewLink: React.FC<{ bookId: string | null; label: string }> = ({ bookId, label }) => {
    if (!bookId) return <span className="text-sm text-gray-500">{label} (selection incomplete)</span>;
    return (
        <Link to={`/pdf/${bookId}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary-600 hover:underline hover:text-primary-800 transition-colors">
            {label} ↗
        </Link>
    );
};

type ClassLevel = 'Nursery' | 'LKG' | 'UKG';

// --- MAIN PAGE COMPONENT ---
const QuestionnairePage: React.FC = () => {
    const { user } = useAuth();
    
    // --- STATE MANAGEMENT ---
    const classOrder: ClassLevel[] = ['Nursery', 'LKG', 'UKG'];
    const [currentClassIndex, setCurrentClassIndex] = useState(0);
    const [step, setStep] = useState(1);
    const [showFinalSummary, setShowFinalSummary] = useState(false);
    const [returningFromSummary, setReturningFromSummary] = useState(false);
    
    const initialAnswers: QuestionnaireAnswers = {
        classLevel: null,
        englishSkill: null,
        englishSkillWritingFocus: null,
        englishWorkbookAssist: null,
        mathWorkbookAssist: null,
        mathSkill: null,
        assessment: null,
        includeEVS: true,
        includeRhymes: true,
        includeArt: true,
        languages: { count: 0, region: 'Other', selections: [] },
    };

    const [allAnswers, setAllAnswers] = useState<Record<ClassLevel, QuestionnaireAnswers>>({
        Nursery: { ...initialAnswers, classLevel: 'Nursery' },
        LKG: { ...initialAnswers, classLevel: 'LKG', languages: { count: 0, region: 'Other', selections: [] } },
        UKG: { ...initialAnswers, classLevel: 'UKG', languages: { count: 0, region: 'Other', selections: [] } },
    });
    
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [savedId, setSavedId] = useState<string | null>(null);

    const currentClass = classOrder[currentClassIndex];
    const answers = allAnswers[currentClass];
    
    const updateClassAnswers = useCallback((className: ClassLevel, updater: (current: QuestionnaireAnswers) => QuestionnaireAnswers) => {
        setStatus('idle');
        setSavedId(null);
        setAllAnswers(prev => {
            const currentAnswers = prev[className];
            const nextAnswers = updater(currentAnswers);
            return { ...prev, [className]: nextAnswers };
        });
    }, []);

    const setAnswers = (newAnswers: Partial<QuestionnaireAnswers>) => {
        updateClassAnswers(currentClass, prevAnswers => ({ ...prevAnswers, ...newAnswers }));
    };

    // Effect to manage language presets
    useEffect(() => {
        if (currentClass === 'Nursery') return;
        const preset = OPTIONS.languageOptions.presets[answers.languages.region] || [];
        const newSelections: LanguageSelection[] = Array.from({ length: answers.languages.count }).map((_, i) => ({
            language: preset[i] || answers.languages.selections[i]?.language || '',
            variant: answers.languages.selections[i]?.variant || null,
        }));

        if (JSON.stringify(newSelections) !== JSON.stringify(answers.languages.selections)) {
            setAnswers({ languages: { ...answers.languages, selections: newSelections }});
        }
    }, [answers.languages.count, answers.languages.region, currentClass]);


    // --- NAVIGATION ---
    const totalStepsPerClass = 6;

    const returnToSummary = useCallback(() => {
        setShowFinalSummary(true);
        setReturningFromSummary(false);
    }, [setShowFinalSummary, setReturningFromSummary]);
    const handleNext = () => {
        if (showFinalSummary) return;

        const isNurseryLangStep = currentClass === 'Nursery' && step === 4; // Step before languages
        if (isNurseryLangStep) {
            setStep(step + 2); // Skip language step for Nursery
            return;
        }

        if (step < totalStepsPerClass) {
            setStep(step + 1);
            return;
        }

        if (returningFromSummary) {
            returnToSummary();
            return;
        }

        if (currentClassIndex < classOrder.length - 1) {
            setCurrentClassIndex(currentClassIndex + 1);
            setStep(1);
        } else {
            setShowFinalSummary(true);
        }
    };

    const handleBack = () => {
        setStatus('idle');
        if (showFinalSummary) {
            setShowFinalSummary(false);
            return;
        }

        if (returningFromSummary && step === 1) {
            returnToSummary();
            return;
        }

        const isNurserySummaryStep = currentClass === 'Nursery' && step === 6;
        if (isNurserySummaryStep) {
            setStep(step - 2); // Skip back over language step
            return;
        }

        if (step > 1) {
            setStep(step - 1);
        } else {
            if (currentClassIndex > 0) {
                setCurrentClassIndex(currentClassIndex - 1);
                setStep(totalStepsPerClass);
            }
        }
    };

    const navigateToStep = (classIndex: number, targetStep: number, options: { fromSummary?: boolean } = {}) => {
        setStatus('idle');
        setSavedId(null);
        setCurrentClassIndex(classIndex);
        setStep(targetStep);
        setReturningFromSummary(!!options.fromSummary);
        setShowFinalSummary(false);
    };

    const handleEditClass = (classIndex: number) => {
        navigateToStep(classIndex, 1, { fromSummary: true });
    };
    
    // --- DATA & LOGIC ---
    const handleSave = async () => {
        if (!user) return;
        setStatus('saving');
        try {
            const result = await saveSelection(allAnswers, user.schoolId);
            if (result.ok) { setStatus('success'); setSavedId(result.id); } 
            else { setStatus('error'); }
        } catch(e) { setStatus('error'); }
    }

    const progress = useMemo(() => {
        let base = 0;
        if (answers.englishSkill) base += 2; if (answers.mathSkill) base += 2; if (answers.assessment) base++;
        if (answers.includeEVS) base++; if (answers.includeRhymes) base++; if (answers.includeArt) base++;
        return { base, languages: answers.languages.count };
    }, [answers]);

    // --- BOOK ID GENERATION ---
    const getBookId = useCallback((subject: string, sourceAnswers: QuestionnaireAnswers = answers): string | null => {
        const book = CATALOG.find(b => {
            if (b.class_level !== sourceAnswers.classLevel || b.subject !== subject) return false;

            let expectedVariant = '';
            switch (subject) {
                case 'English Skill':
                    if (!sourceAnswers.englishSkill) return false;
                    expectedVariant = sourceAnswers.englishSkill;
                    if (sourceAnswers.englishSkill === 'LTI') {
                        expectedVariant = 'LTI (Caps)';
                    } else if (sourceAnswers.englishSkillWritingFocus) {
                        expectedVariant = `${sourceAnswers.englishSkill} (${sourceAnswers.englishSkillWritingFocus})`;
                    }
                    return b.variant === expectedVariant;

                case 'English Workbook': {
                    if (!sourceAnswers.englishSkill) return false;

                    if (sourceAnswers.classLevel === 'UKG' || sourceAnswers.englishSkill === 'Jolly Phonics') {
                        return b.variant === sourceAnswers.englishSkill;
                    }

                    if (sourceAnswers.englishWorkbookAssist === null) return false;
                    const assistText = sourceAnswers.englishWorkbookAssist ? 'Writing Assist' : 'Normal';

                    let skillVariant = '';
                    if (sourceAnswers.englishSkill === 'LTI') {
                        skillVariant = 'LTI (Caps)';
                    } else if (sourceAnswers.englishSkillWritingFocus) {
                        skillVariant = `${sourceAnswers.englishSkill} (${sourceAnswers.englishSkillWritingFocus})`;
                    } else {
                        skillVariant = sourceAnswers.englishSkill;
                    }

                    if (!skillVariant.includes('(')) {
                        expectedVariant = `${skillVariant} (${assistText})`;
                    } else {
                        expectedVariant = `${skillVariant.slice(0, -1)}, ${assistText})`;
                    }
                    return b.variant === expectedVariant;
                }

                case 'Math Skill':
                    return b.variant === sourceAnswers.mathSkill;
                case 'Math Workbook': {
                    if (!sourceAnswers.mathSkill) return false;

                    if (sourceAnswers.classLevel === 'Nursery' || sourceAnswers.classLevel === 'LKG') {
                        if (sourceAnswers.mathWorkbookAssist === null) return false;
                        const assistText = sourceAnswers.mathWorkbookAssist ? 'Writing Assist' : 'Normal';
                        expectedVariant = `${sourceAnswers.mathSkill} (${assistText})`;
                        return b.variant === expectedVariant;
                    }

                    return b.variant === sourceAnswers.mathSkill;
                }

                case 'Assessment':
                    return b.variant === sourceAnswers.assessment;

                case 'EVS':
                case 'Rhymes & Stories':
                case 'Art & Craft':
                    return b.variant === 'Standard';

                default:
                    return false;
            }
        });
        return book ? book.id : null;
    }, [answers]);

    const bookIds = useMemo<SummaryBookIds>(() => ({
        englishSkill: answers.englishSkill ? getBookId('English Skill') : null,
        englishWorkbook: answers.englishSkill ? getBookId('English Workbook') : null,
        mathSkill: answers.mathSkill ? getBookId('Math Skill') : null,
        mathWorkbook: answers.mathSkill ? getBookId('Math Workbook') : null,
        assessment: answers.assessment ? getBookId('Assessment') : null,
        evs: getBookId('EVS'),
        rhymes: getBookId('Rhymes & Stories'),
        art: getBookId('Art & Craft'),
    }), [answers, getBookId]);

    type SummaryAction =
        | { type: 'english' }
        | { type: 'math' }
        | { type: 'assessment' }
        | { type: 'core'; subject: 'EVS' | 'Rhymes & Stories' | 'Art & Craft' }
        | { type: 'language'; index: number };

    const handleRemoveSelection = (className: ClassLevel, action: SummaryAction) => {
        updateClassAnswers(className, current => {
            switch (action.type) {
                case 'english':
                    return {
                        ...current,
                        englishSkill: null,
                        englishSkillWritingFocus: null,
                        englishWorkbookAssist: null,
                    };
                case 'math':
                    return {
                        ...current,
                        mathSkill: null,
                        mathWorkbookAssist: null,
                    };
                case 'assessment':
                    return {
                        ...current,
                        assessment: null,
                    };
                case 'core':
                    if (action.subject === 'EVS') {
                        return { ...current, includeEVS: false };
                    }
                    if (action.subject === 'Rhymes & Stories') {
                        return { ...current, includeRhymes: false };
                    }
                    return { ...current, includeArt: false };
                case 'language': {
                    const newSelections = current.languages.selections.filter((_, idx) => idx !== action.index);
                    return {
                        ...current,
                        languages: {
                            ...current.languages,
                            count: Math.max(0, newSelections.length), // ✅ safer than type cast
                            selections: newSelections,
                        },
                    };
                }
                default:
                    return current;
            }
        });
    };




    const buildSummaryItems = (className: ClassLevel, classAnswers: QuestionnaireAnswers, classBookIds: SummaryBookIds): SummaryItem[] => {
        const englishSkillValue = classAnswers.englishSkill
            ? classAnswers.englishSkillWritingFocus
                ? `${classAnswers.englishSkill} (${classAnswers.englishSkillWritingFocus})`
                : classAnswers.englishSkill
            : 'Not selected';

        const englishWorkbookValue = (() => {
            if (!classAnswers.englishSkill) return 'Requires English skill selection';
            if (classAnswers.classLevel === 'UKG' || classAnswers.englishSkill === 'Jolly Phonics') {
                return 'Matches English skill selection';
            }
            if (classAnswers.englishWorkbookAssist === null) return 'Assist not selected';
            return classAnswers.englishWorkbookAssist ? 'Writing Assist' : 'Normal';
        })();

        const mathWorkbookValue = (() => {
            if (!classAnswers.mathSkill) return 'Requires Math skill selection';
            if (classAnswers.classLevel !== 'Nursery' && classAnswers.classLevel !== 'LKG') {
                return 'Matches Math skill selection';
            }
            if (classAnswers.mathWorkbookAssist === null) return 'Assist not selected';
            return classAnswers.mathWorkbookAssist ? 'Writing Assist' : 'Normal';
        })();

        const summaryItems: SummaryItem[] = [
            {
                key: 'english-skill',
                label: 'English Skill Book',
                value: englishSkillValue,
                step: 1,
                canRemove: !!classAnswers.englishSkill,
                onRemove: () => handleRemoveSelection(className, { type: 'english' }),
                bookId: classBookIds.englishSkill,
                bookLabel: 'View English Skill Book',
            },
            {
                key: 'english-workbook',
                label: 'English Workbook',
                value: englishWorkbookValue,
                step: 1,
                canRemove: !!classAnswers.englishSkill,
                onRemove: () => handleRemoveSelection(className, { type: 'english' }),
                bookId: classBookIds.englishWorkbook,
                bookLabel: 'View English Workbook',
            },
            {
                key: 'math-skill',
                label: 'Math Skill Book',
                value: classAnswers.mathSkill || 'Not selected',
                step: 2,
                canRemove: !!classAnswers.mathSkill,
                onRemove: () => handleRemoveSelection(className, { type: 'math' }),
                bookId: classBookIds.mathSkill,
                bookLabel: 'View Math Skill Book',
            },
            {
                key: 'math-workbook',
                label: 'Math Workbook',
                value: mathWorkbookValue,
                step: 2,
                canRemove: !!classAnswers.mathSkill,
                onRemove: () => handleRemoveSelection(className, { type: 'math' }),
                bookId: classBookIds.mathWorkbook,
                bookLabel: 'View Math Workbook',
            },
            {
                key: 'assessment',
                label: 'Assessment',
                value: classAnswers.assessment || 'Not selected',
                step: 3,
                canRemove: !!classAnswers.assessment,
                onRemove: () => handleRemoveSelection(className, { type: 'assessment' }),
                bookId: classBookIds.assessment,
                bookLabel: 'View Assessment Book',
            },
            {
                key: 'core-evs',
                label: 'EVS',
                value: classAnswers.includeEVS ? 'Included' : 'Not included',
                step: 4,
                canRemove: classAnswers.includeEVS,
                onRemove: () => handleRemoveSelection(className, { type: 'core', subject: 'EVS' }),
                bookId: classAnswers.includeEVS ? classBookIds.evs : null,
                bookLabel: 'View EVS Book',
            },
            {
                key: 'core-rhymes',
                label: 'Rhymes & Stories',
                value: classAnswers.includeRhymes ? 'Included' : 'Not included',
                step: 4,
                canRemove: classAnswers.includeRhymes,
                onRemove: () => handleRemoveSelection(className, { type: 'core', subject: 'Rhymes & Stories' }),
                bookId: classAnswers.includeRhymes ? classBookIds.rhymes : null,
                bookLabel: 'View Rhymes Book',
            },
            {
                key: 'core-art',
                label: 'Art & Craft',
                value: classAnswers.includeArt ? 'Included' : 'Not included',
                step: 4,
                canRemove: classAnswers.includeArt,
                onRemove: () => handleRemoveSelection(className, { type: 'core', subject: 'Art & Craft' }),
                bookId: classAnswers.includeArt ? classBookIds.art : null,
                bookLabel: 'View Art Book',
            },
        ];

        if (className !== 'Nursery') {
            if (classAnswers.languages.selections.length === 0) {
                summaryItems.push({
                    key: 'language-none',
                    label: 'Languages',
                    value: 'No additional languages selected',
                    step: 5,
                });
            } else {
                classAnswers.languages.selections.forEach((selection, langIndex) => {
                    summaryItems.push({
                        key: `language-${langIndex}`,
                        label: `Language ${langIndex + 1}`,
                        value: selection.language
                            ? selection.variant
                                ? `${selection.language} (${selection.variant})`
                                : selection.language
                            : 'Not selected',
                        step: 5,
                        canRemove: true,
                        onRemove: () => handleRemoveSelection(className, { type: 'language', index: langIndex }),
                    });
                });
            }
        }

        return summaryItems;
    };

    
    
    
    // --- RENDER METHODS ---
    const renderStepContent = () => {
        // Step definitions: 1: English, 2: Math, 3: Assessment, 4: Core, 5: Languages, 6: Class Summary
        switch (step) {
            case 1: // English
                const showWritingFocus = currentClass === 'Nursery' && (answers.englishSkill === 'ABCD' || answers.englishSkill === 'SATPIN');
                
                const isSkillSelectionComplete = (() => {
                    if (!answers.englishSkill) return false;
                    if (showWritingFocus) {
                        return !!answers.englishSkillWritingFocus;
                    }
                    if (currentClass === 'Nursery' || currentClass === 'LKG') {
                        return answers.englishWorkbookAssist !== null;
                    }
                    // For UKG and Jolly Phonics, assist is not asked
                    return true;
                })();

                return (<div>
                    <h2 className="text-xl font-semibold mb-1">Choose English Skill Variant</h2>
                    <p className="text-gray-600 mb-4">The English Workbook will automatically match your selection.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {OPTIONS.englishSkill[currentClass].map(skill => (<RadioCard key={skill} id={`eng-${skill}`} name="englishSkill" value={skill} label={skill} description={skill === 'LTI' ? "Caps only writing" : "Select one option"} checked={answers.englishSkill === skill} onChange={e => setAnswers({ englishSkill: e.target.value, englishWorkbookAssist: null, englishSkillWritingFocus: null })} />))}
                    </div>
                    {showWritingFocus && (<div className="mt-6 border-t pt-6">
                        <h3 className="text-lg font-semibold mb-2">What do you focus on writing?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <RadioCard id="focus-caps" name="writingFocus" value="Caps" label="Caps" description="" checked={answers.englishSkillWritingFocus === 'Caps'} onChange={() => setAnswers({ englishSkillWritingFocus: 'Caps' })} />
                            <RadioCard id="focus-small" name="writingFocus" value="Small" label="Small" description="" checked={answers.englishSkillWritingFocus === 'Small'} onChange={() => setAnswers({ englishSkillWritingFocus: 'Small' })} />
                            <RadioCard id="focus-caps-small" name="writingFocus" value="Caps & Small" label="Caps & Small" description="" checked={answers.englishSkillWritingFocus === 'Caps & Small'} onChange={() => setAnswers({ englishSkillWritingFocus: 'Caps & Small' })} />
                        </div>
                    </div>)}
                    {(currentClass === 'Nursery' || currentClass === 'LKG') && answers.englishSkill && answers.englishSkill !== 'Jolly Phonics' && (<div className="mt-6 border-t pt-6">
                        <h3 className="text-lg font-semibold mb-2">English Workbook Writing Assist</h3>
                        <div className="flex gap-4">
                            <RadioCard id="assist-yes" name="englishWorkbookAssist" value="yes" label="Yes" description="All rows dotted." checked={answers.englishWorkbookAssist === true} onChange={() => setAnswers({ englishWorkbookAssist: true })} />
                            <RadioCard id="assist-no" name="englishWorkbookAssist" value="no" label="No" description="Only first 2 rows dotted." checked={answers.englishWorkbookAssist === false} onChange={() => setAnswers({ englishWorkbookAssist: false })} />
                        </div>
                    </div>)}
                    {isSkillSelectionComplete && <div className="mt-6 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-around">
                        <BookPreviewLink bookId={bookIds.englishSkill} label="View Skill Book" />
                        <BookPreviewLink bookId={bookIds.englishWorkbook} label="View Workbook" />
                    </div>}
                </div>);
            case 2: // Math
                return (<div>
                    <h2 className="text-xl font-semibold mb-1">Choose Math Skill Variant</h2>
                    <p className="text-gray-600 mb-2">The Math Workbook will automatically match this selection.</p>
                    <p className="text-sm text-gray-500 mb-4">All variants include pre-math concepts, basic shapes and colours.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {OPTIONS.mathSkill[currentClass].map(skill => (<RadioCard key={skill} id={`math-${skill}`} name="mathSkill" value={skill} label={skill} description="" checked={answers.mathSkill === skill} onChange={e => setAnswers({ mathSkill: e.target.value, mathWorkbookAssist: null })} />))}
                    </div>
                    {(currentClass === 'Nursery' || currentClass === 'LKG') && answers.mathSkill && (
                        <div className="mt-6 border-t pt-6">
                            <h3 className="text-lg font-semibold mb-2">Math Workbook Writing Assist</h3>
                            <div className="flex gap-4">
                                <RadioCard id="math-assist-yes" name="mathWorkbookAssist" value="yes" label="Yes" description="All rows dotted." checked={answers.mathWorkbookAssist === true} onChange={() => setAnswers({ mathWorkbookAssist: true })} />
                                <RadioCard id="math-assist-no" name="mathWorkbookAssist" value="no" label="No" description="Only first 2 rows dotted." checked={answers.mathWorkbookAssist === false} onChange={() => setAnswers({ mathWorkbookAssist: false })} />
                            </div>
                        </div>
                    )}
                    {answers.mathSkill && ((currentClass !== 'Nursery' && currentClass !== 'LKG') || answers.mathWorkbookAssist !== null) && <div className="mt-6 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-around">
                        <BookPreviewLink bookId={bookIds.mathSkill} label="View Skill Book" />
                        <BookPreviewLink bookId={bookIds.mathWorkbook} label="View Workbook" />
                    </div>}
                </div>);
            case 3: // Assessment
                return (<div>
                    <h2 className="text-xl font-semibold mb-1">Assessment Type</h2>
                    <p className="text-gray-600 mb-4">Select the assessment format for the academic year.</p>
                    <div className="space-y-4">
                        {OPTIONS.assessment.map(type => (<RadioCard key={type.value} id={`assess-${type.value}`} name="assessment" value={type.value} label={type.value} description={type.description} checked={answers.assessment === type.value} onChange={e => setAnswers({ assessment: e.target.value as any })} />))}
                    </div>
                </div>);
            case 4: // Core Subjects
                 return (<div>
                    <h2 className="text-xl font-semibold mb-1">Core Subjects</h2>
                    <p className="text-gray-600 mb-4">These subjects are included by default, but you can opt out.</p>
                    <div className="space-y-4">
                        <CheckboxCard id="evs" name="evs" label="EVS" description="Concepts: My body, family, school, animals, transport, seasons, etc." checked={answers.includeEVS} onChange={e => setAnswers({ includeEVS: e.target.checked })}/>
                        <CheckboxCard id="rhymes" name="rhymes" label="Rhymes & Stories" description="Customise 25 rhymes & 5 stories, or select our default book." checked={answers.includeRhymes} onChange={e => setAnswers({ includeRhymes: e.target.checked })}/>
                        <CheckboxCard id="art" name="art" label="Art & Craft" description="Age-appropriate colouring and simple craft activities." checked={answers.includeArt} onChange={e => setAnswers({ includeArt: e.target.checked })}/>
                    </div>
                    <div className="mt-6 p-3 bg-primary-50 border border-primary-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-2 items-center justify-around text-center">
                        {answers.includeEVS && <BookPreviewLink bookId={bookIds.evs} label="View EVS Book" />}
                        {answers.includeRhymes && <BookPreviewLink bookId={bookIds.rhymes} label="View Rhymes Book" />}
                        {answers.includeArt && <BookPreviewLink bookId={bookIds.art} label="View Art Book" />}
                    </div>
                </div>);
            case 5: // Languages
                const handleLanguageChange = (index: number, language: string) => {
                    const newSelections = [...answers.languages.selections];
                    newSelections[index] = { language, variant: null }; // Reset variant
                    setAnswers({ languages: { ...answers.languages, selections: newSelections }});
                };
                const handleVariantChange = (index: number, variant: string) => {
                    const newSelections = [...answers.languages.selections];
                    newSelections[index].variant = variant;
                    setAnswers({ languages: { ...answers.languages, selections: newSelections }});
                };
                return (<div>
                    <h2 className="text-xl font-semibold mb-1">Add Extra Languages (Optional)</h2>
                    <p className="text-gray-600 mb-4">Choose your region for presets, then select languages and variants.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Region</h3>
                            <select value={answers.languages.region} onChange={e => setAnswers({ languages: { ...answers.languages, region: e.target.value as any, selections: [] }})} className="block w-full max-w-xs p-2 border border-gray-300 rounded-md">
                                {OPTIONS.languageOptions.regions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Number of Languages</h3>
                            <div className="flex gap-4">
                                {OPTIONS.languageOptions.count.map((c, i) => (<RadioCard key={c} id={`lang-count-${i}`} name="lang-count" value={String(i)} label={c} description="" checked={answers.languages.count === i} onChange={e => setAnswers({ languages: { ...answers.languages, count: Number(e.target.value) as any }})} />))}
                            </div>
                        </div>
                    </div>
                    {answers.languages.selections.map((selection, index) => (
                        <div key={index} className="mt-6 border-t pt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Language {index + 1} Selection</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                                    <select value={selection.language} onChange={e => handleLanguageChange(index, e.target.value)} className="block w-full p-2 border border-gray-300 rounded-md">
                                        <option value="">-- Select --</option>
                                        {OPTIONS.languageOptions.list.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                {selection.language && <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
                                    <div className="flex flex-wrap gap-2">
                                        {OPTIONS.languageOptions.variants[currentClass].map(v => (<button key={v} onClick={() => handleVariantChange(index, v)} className={`px-3 py-1.5 text-sm rounded-md border ${selection.variant === v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white hover:bg-gray-100'}`}>{v}</button>))}
                                    </div>
                                </div>}
                            </div>
                        </div>
                    ))}
                </div>);
            case 6: // Class Summary
                const summaryEntries = getClassSummaryEntries(answers);
                const summaryItems = buildSummaryItems(currentClass, answers, bookIds);
                return (<div>
                    <h2 className="text-xl font-semibold mb-2">{currentClass} Selection Summary</h2>
                    <p className="text-gray-600 mb-4">Review your selections for this class. Click "Next" to proceed.</p>
                    <div className="mt-4 divide-y divide-gray-200">
                        {summaryItems.map(item => (<div key={item.key} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                                <p className="text-sm text-gray-600">{item.value}</p>
                                {item.bookLabel && <div className="mt-1"><BookPreviewLink bookId={item.bookId || null} label={item.bookLabel} /></div>}
                            </div>
                            {item.canRemove && item.onRemove && (
                                <div className="flex gap-2">
                                    <button onClick={item.onRemove} className="text-sm font-semibold text-red-600 hover:text-red-800 px-3 py-1 rounded-md hover:bg-red-100">
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>))}
                    </div>
                    <div className="mt-4">
                        <SummaryList entries={summaryEntries} containerClassName="bg-white" textClassName="text-gray-700" />
                    </div>
                </div>);
            default: return null;
        }
    };

    const renderFinalSummary = () => (
        <div>
            <h2 className="text-xl font-semibold mb-2">Final Summary & Save</h2>
            <p className="text-gray-600 mb-4">Review all your selections below. Click "Save Selection" to confirm.</p>
            <div className="space-y-6">
                {classOrder.map((className, index) => {
                    const classAnswers = allAnswers[className];
                    const classBookIds: SummaryBookIds = {
                        englishSkill: classAnswers.englishSkill ? getBookId('English Skill', classAnswers) : null,
                        englishWorkbook: classAnswers.englishSkill ? getBookId('English Workbook', classAnswers) : null,
                        mathSkill: classAnswers.mathSkill ? getBookId('Math Skill', classAnswers) : null,
                        mathWorkbook: classAnswers.mathSkill ? getBookId('Math Workbook', classAnswers) : null,
                        assessment: classAnswers.assessment ? getBookId('Assessment', classAnswers) : null,
                        evs: classAnswers.includeEVS ? getBookId('EVS', classAnswers) : null,
                        rhymes: classAnswers.includeRhymes ? getBookId('Rhymes & Stories', classAnswers) : null,
                        art: classAnswers.includeArt ? getBookId('Art & Craft', classAnswers) : null,
                    };

                    const summaryItems = buildSummaryItems(className, classAnswers, classBookIds);
                    const summaryEntries = getClassSummaryEntries(classAnswers);
                    return (
                        <div key={className} className="bg-gray-50 border rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-primary-700">{className}</h3>
                                <button onClick={() => handleEditClass(index)} className="text-sm font-semibold text-primary-600 hover:text-primary-800 px-3 py-1 rounded-md hover:bg-primary-100">
                                    Edit
                                </button>
                            </div>
                            <div className="mt-3 divide-y divide-gray-200">
                                {summaryItems.map(item => (
                                    <div key={item.key} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                                            <p className="text-sm text-gray-600">{item.value}</p>
                                            {item.bookLabel && (
                                                <div className="mt-1">
                                                    <BookPreviewLink bookId={item.bookId || null} label={item.bookLabel} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => navigateToStep(index, item.step, { fromSummary: true })} className="text-sm font-semibold text-primary-600 hover:text-primary-800 px-3 py-1 rounded-md hover:bg-primary-100">
                                                Edit
                                            </button>
                                            {item.canRemove && item.onRemove && (
                                                <button onClick={item.onRemove} className="text-sm font-semibold text-red-600 hover:text-red-800 px-3 py-1 rounded-md hover:bg-red-100">
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3">
                                <SummaryList
                                    entries={summaryEntries}
                                    containerClassName="bg-white"
                                    itemClassName="px-4 py-2"
                                    textClassName="text-sm text-gray-700"
                                />
                            </div>
                        </div>
                    );

                })}
            </div>
            {status === 'idle' && <button onClick={handleSave} className="mt-6 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors">Save All Selections</button>}
            {status === 'saving' && <p className="mt-6 text-center text-blue-600">Saving...</p>}
            {status === 'success' && <p className="mt-6 text-center text-green-600 font-semibold">Selection saved successfully! (ID: {savedId})</p>}
            {status === 'error' && <p className="mt-6 text-center text-red-600">Failed to save selection. Please try again.</p>}
        </div>
    );
    
    // --- MAIN RENDER ---
    return (<div className="container mx-auto max-w-4xl">
      <div className="bg-white p-8 rounded-lg shadow-md border">
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Book Package Questionnaire</h1>
                    {!showFinalSummary && <p className="text-md font-semibold text-primary-700">Configuring: {currentClass}</p>}
                </div>
                {!showFinalSummary && <span className="text-sm font-semibold text-gray-500">Step {step} of {totalStepsPerClass}</span>}
            </div>
            {!showFinalSummary && <>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${(step / totalStepsPerClass) * 100}%` }}></div>
                </div>
                <div className="mt-3 text-sm font-semibold text-primary-700">
                    <span>Base selected: {progress.base}/8</span>
                    <span className="mx-2">•</span>
                    <span>Languages: {progress.languages}/2</span>
                </div>
            </>}
        </div>
        
        <div className="min-h-[400px] py-4">
            {showFinalSummary ? renderFinalSummary() : renderStepContent()}
        </div>

        <div className="mt-8 flex justify-between items-center">
          <button onClick={handleBack} disabled={currentClassIndex === 0 && step === 1 && !showFinalSummary} className="bg-gray-300 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed">
            Back
          </button>
          <div className="flex gap-3">
            {returningFromSummary && !showFinalSummary && (
              <button
                onClick={returnToSummary}
                className="border border-primary-600 text-primary-600 px-6 py-2 rounded-md hover:bg-primary-50"
              >
                Return to Final Summary
              </button>
            )}
            {!showFinalSummary && (
              <button onClick={handleNext} className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700">
                {step === totalStepsPerClass
                    ? (returningFromSummary
                        ? 'Next'
                        : (currentClass === 'UKG'
                            ? 'Finish & View Summary'
                            : `Next: Configure ${classOrder[currentClassIndex+1]}`))
                    : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>);
};

export default QuestionnairePage;
