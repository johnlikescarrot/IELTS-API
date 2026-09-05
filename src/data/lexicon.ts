/**
 * Reference word lists used by the text-analysis endpoints.
 *
 * Two inventories are published here.
 *
 * **Cohesive devices.** IELTS Writing and Speaking are both assessed on
 * *Coherence and Cohesion*, and the published descriptors talk about the
 * *range* and *accuracy* of cohesive devices rather than their raw number.
 * The inventory below groups discourse markers by the relation they signal,
 * following the standard functional taxonomy used in the description of
 * English cohesion (addition, contrast, cause, result, exemplification,
 * comparison, sequence, concession, condition, summary, emphasis).
 *
 * **Function words.** A closed-class stop list, used to separate the lexical
 * (content) vocabulary of a text from its grammatical scaffolding, so that
 * lexical density and lexical diversity are measured over content words only.
 *
 * Both lists are original compilations written for this project and carry no
 * third-party licence.
 */

/** The discourse relations a cohesive device can signal. */
export const COHESION_RELATIONS = [
  'addition',
  'contrast',
  'cause',
  'result',
  'exemplification',
  'comparison',
  'sequence',
  'concession',
  'condition',
  'summary',
  'emphasis',
] as const;

/** A discourse relation signalled by a cohesive device. */
export type CohesionRelation = (typeof COHESION_RELATIONS)[number];

/** A cohesive device and the relation it signals. */
export interface CohesiveDevice {
  /** The device, lower-cased; may be multi-word. */
  phrase: string;
  /** Relation the device signals. */
  relation: CohesionRelation;
  /**
   * Register band: `basic` devices are expected at band 5-6, `academic` ones
   * are typical of band 7+ writing. The split is indicative and describes
   * frequency in academic prose, not correctness.
   */
  register: 'basic' | 'academic';
}

const DEVICE_ROWS: readonly (readonly [CohesionRelation, 'basic' | 'academic', string])[] = [
  ['addition', 'basic', 'and also,as well as,besides,in addition,also,too,another,what is more'],
  ['addition', 'academic', 'furthermore,moreover,in addition to this,not only that,coupled with'],
  ['contrast', 'basic', 'but,however,on the other hand,in contrast,instead,yet,whereas,while'],
  ['contrast', 'academic', 'nevertheless,nonetheless,conversely,by contrast,on the contrary,notwithstanding'],
  ['cause', 'basic', 'because,since,as,due to,owing to,because of'],
  ['cause', 'academic', 'on account of,in view of,given that,for this reason,stems from,arises from'],
  ['result', 'basic', 'so,therefore,as a result,thus,which means that'],
  ['result', 'academic', 'consequently,hence,accordingly,as a consequence,thereby,resulting in'],
  ['exemplification', 'basic', 'for example,for instance,such as,like,namely'],
  ['exemplification', 'academic', 'to illustrate,a case in point,by way of illustration,as evidenced by'],
  ['comparison', 'basic', 'similarly,likewise,in the same way,equally,just as'],
  ['comparison', 'academic', 'correspondingly,in much the same way,by the same token,analogously'],
  ['sequence', 'basic', 'first,firstly,second,secondly,third,thirdly,next,then,finally,lastly,afterwards'],
  ['sequence', 'academic', 'initially,subsequently,ultimately,in the first instance,thereafter'],
  ['concession', 'basic', 'although,though,even though,even if,despite,in spite of'],
  ['concession', 'academic', 'admittedly,granted that,while it is true that,albeit,it could be argued that'],
  ['condition', 'basic', 'if,unless,as long as,provided that,otherwise'],
  ['condition', 'academic', 'in the event that,on condition that,assuming that,were it not for'],
  ['summary', 'basic', 'in conclusion,to sum up,overall,in short,all in all,to conclude'],
  ['summary', 'academic', 'in summary,on balance,taking everything into account,to summarise'],
  ['emphasis', 'basic', 'indeed,in fact,clearly,obviously,certainly,of course'],
  ['emphasis', 'academic', 'notably,significantly,crucially,above all,it is worth noting that'],
];

/** Every cohesive device recognised by `/v1/analyze/cohesion`. */
export const COHESIVE_DEVICES: readonly CohesiveDevice[] = DEVICE_ROWS.flatMap(
  ([relation, register, phrases]) =>
    phrases.split(',').map((phrase) => ({ phrase: phrase.trim(), relation, register })),
);

/**
 * Devices sorted longest first, so that a greedy scan matches
 * `in addition to this` before `in addition` and `also`.
 */
export const COHESIVE_DEVICES_BY_LENGTH: readonly CohesiveDevice[] = [...COHESIVE_DEVICES].sort(
  (left, right) => right.phrase.length - left.phrase.length || left.phrase.localeCompare(right.phrase),
);

const FUNCTION_WORD_LIST = [
  'a,an,the,this,that,these,those,my,your,his,her,its,our,their,some,any,no,each,every,both,either,neither',
  'i,you,he,she,it,we,they,me,him,us,them,myself,yourself,himself,herself,itself,ourselves,themselves',
  'who,whom,whose,which,what,where,when,why,how,there,here',
  'be,am,is,are,was,were,been,being,have,has,had,having,do,does,did,doing',
  'will,would,shall,should,can,could,may,might,must,ought,need,dare,let',
  'of,in,on,at,by,for,with,about,against,between,into,through,during,before,after,above,below,to,from,up',
  'down,out,off,over,under,again,further,than,then,once,upon,within,without,across,behind,beyond,near',
  'and,but,or,nor,so,yet,because,as,if,unless,although,though,while,whereas,whether,that,since,until',
  'not,only,own,same,such,very,too,also,just,more,most,less,least,much,many,few,several,all,none',
  's,t,re,ve,ll,d,m,o',
] as const;

/** Closed-class function words, used to compute lexical density. */
export const FUNCTION_WORDS: ReadonlySet<string> = new Set(
  FUNCTION_WORD_LIST.flatMap((row) => row.split(',')),
);

/**
 * Return `true` when a token is a closed-class function word.
 *
 * @param word - Token, any case.
 */
export function isFunctionWord(word: string): boolean {
  return FUNCTION_WORDS.has(word.toLowerCase());
}
