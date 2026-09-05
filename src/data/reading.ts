/**
 * CEFR-graded original reading dataset.
 *
 * Every passage here was written for this project — none is extracted or
 * adapted from Cambridge papers, commercial practice sites or scraped
 * mirrors (see RESEARCH.md §7 for why that matters). Each passage carries an
 * indicative CEFR level, a thematic category, a suggested timing and three
 * exam-style items: one multiple-choice, one True/False/Not-given and one
 * short-answer question. The fixed 1+1+1 shape keeps items comparable across
 * levels, which is what a coverage or difficulty study needs; teachers who
 * want a different mix can compose their own tasks from the `text` field.
 *
 * Level guidance follows the Common European Framework descriptors: A2 uses
 * high-frequency vocabulary and short coordinated sentences; B1 adds connected
 * discourse and concrete argument; B2 introduces abstract topics and
 * concession; C1 requires precision, implied stance and low-frequency lexis.
 */

import { matchesQuery, paginate, sortBy } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { CefrLevel, ReadingPassage, ReadingStats, ReadingSummary } from '../types.js';

/** CEFR levels covered by the dataset, ordered. */
export const READING_LEVELS: readonly CefrLevel[] = ['A2', 'B1', 'B2', 'C1', 'C2'];

/** The passages. */
export const READING_PASSAGES: readonly ReadingPassage[] = [
  {
    id: 'rd-a2-cities-01',
    title: 'Moving to the City',
    cefrLevel: 'A2',
    topic: 'cities',
    summary: 'Why families move from small towns to big cities, and what they gain and lose.',
    minutes: 6,
    text:
      'Every year, thousands of families leave small towns and move to big cities. ' +
      'They usually have the same reason: work. Cities have more factories, offices, shops and ' +
      'hospitals, so it is easier to find a job. Parents also think that their children will go to ' +
      'better schools and universities there.\n\n' +
      'Mai is nineteen. She moved from a village in the north to a big city last year and now she ' +
      'works in an electronics factory. She earns twice as much as her father did in the village, ' +
      'but life is not cheap. She pays about half of her salary for a small room near the factory, ' +
      'and she takes a bus for one hour every morning and every evening.\n\n' +
      'Cities are growing so quickly that many governments are trying to change this life. They are ' +
      'building new metro lines, ring roads and parks so that people do not all need a car. Some ' +
      'cities are also building flats for factory workers, because long journeys make people tired ' +
      'and late.\n\n' +
      'Moving to a city can give a family a better income and better schools. However, the family ' +
      'should plan carefully. Rent, transport and food in a city are expensive, and a plan on paper ' +
      'is much safer than hope.',
    questions: [
      {
        id: 'rd-a2-cities-01-q1',
        format: 'multiple-choice',
        prompt: 'Why do most families in the passage move to big cities?',
        options: [
          'To find work and better schools',
          'To live closer to nature',
          'To pay a lower rent',
          'To escape from long bus journeys',
        ],
        answer: 'To find work and better schools',
        explanation:
          'The first paragraph says families move because cities have more jobs, and parents think their children will attend better schools.',
      },
      {
        id: 'rd-a2-cities-01-q2',
        format: 'true-false-notgiven',
        prompt: 'Mai spends less than half of her salary on rent.',
        answer: 'False',
        explanation:
          'The passage states that she pays about half of her salary for her room, which contradicts "less than half".',
      },
      {
        id: 'rd-a2-cities-01-q3',
        format: 'short-answer',
        prompt: 'Name the two things some cities build for factory workers, according to the passage.',
        answer: 'Metro lines and flats',
        explanation:
          'Paragraph three lists new metro lines, ring roads and parks, and adds that some cities build flats for factory workers.',
      },
    ],
  },
  {
    id: 'rd-a2-environment-01',
    title: 'Recycling at Home',
    cefrLevel: 'A2',
    topic: 'environment',
    summary: 'Simple habits that make household recycling actually work, and the mistakes that ruin it.',
    minutes: 6,
    text:
      'Most households are given two or three bins, and the rules for filling them seem obvious. ' +
      'In fact, a surprising amount of family recycling never becomes anything. The problem is ' +
      'usually not that people are lazy; it is that the system is delicate.\n\n' +
      'The first rule is to sort waste exactly as your town asks, not as your neighbour does. ' +
      'Paper, glass, plastic and food waste are each processed in a different factory, and one ' +
      'container of greasy pizza boxes can damage a whole batch of paper. The second rule is to ' +
      'empty and rinse your containers. A dirty jar does not have to be washed with hot water, but ' +
      'it should be clean enough that nothing spoils the load. The third rule is to keep recycling ' +
      'out of the general waste bin when you can: a plastic bag in the paper stream can stop an ' +
      'entire delivery from being accepted.\n\n' +
      'Food waste deserves a bin of its own. Composting turns peels and coffee grounds into soil ' +
      'that gardens and parks need, and it produces far less smell than people expect. If your ' +
      'street has no food collection, a small compost box on a balcony works well.\n\n' +
      'Recycling is not a moral test; it is a technical process that families join for two minutes ' +
      'a day. Made carefully, it saves real resources: re-melting an old aluminium can uses only a ' +
      'small fraction of the energy needed to make a new one from rock.',
    questions: [
      {
        id: 'rd-a2-environment-01-q1',
        format: 'multiple-choice',
        prompt: 'According to the passage, what can happen if one load of recycling is dirty?',
        options: [
          'A whole batch can be damaged and never recycled',
          'The family must pay a fine',
          'The bin will be emptied anyway',
          'The paper factory will wash it for free',
        ],
        answer: 'A whole batch can be damaged and never recycled',
        explanation:
          'The second paragraph explains that greasy boxes or plastic bags can stop a whole delivery from being accepted.',
      },
      {
        id: 'rd-a2-environment-01-q2',
        format: 'true-false-notgiven',
        prompt: 'The recycling rules are identical in every town.',
        answer: 'False',
        explanation:
          'The passage tells households to follow "the rules of your town", precisely because different towns ask for different sorting.',
      },
      {
        id: 'rd-a2-environment-01-q3',
        format: 'short-answer',
        prompt: 'What does composting turn food waste into?',
        answer: 'Soil for gardens and parks',
        explanation:
          'The third paragraph says composting turns peels and coffee grounds into soil that gardens and parks need.',
      },
    ],
  },
  {
    id: 'rd-b1-health-01',
    title: 'Sleep and Study',
    cefrLevel: 'B1',
    topic: 'health',
    summary: 'What happens to learning while we sleep, and why the all-nighter is a bad trade.',
    minutes: 8,
    text:
      'Students treat sleep as the first thing they can sacrifice, yet the brain does a great deal of ' +
      'its schoolwork at night. During deep sleep, the hippocampus — where the day’s facts are held — ' +
      'appears to replay the material and transfer it to long-term storage in the cortex. Skip the ' +
      'sleep and the notes stay where they were, fragile and hard to reach under exam pressure.\n\n' +
      'This changes the arithmetic of the all-nighter. A student who studies until two in the morning ' +
      'may have covered six more chapters, but recall tests consistently show that tired students ' +
      'lose more to poor retrieval than they gain from extra exposure. The efficient trade is the ' +
      'opposite one: fewer hours of reading, more hours of sleep, and a short review the following ' +
      'morning, when the material is met again in fresh light.\n\n' +
      'Timing matters as well. Caffeine blocks sleep receptors for six or seven hours, so an ' +
      'afternoon coffee is partly a night-time decision. A nap of about twenty minutes, taken early ' +
      'in the afternoon, improves alertness without the grogginess of a longer one; beyond half an ' +
      'hour, the sleeper may wake inside deep sleep and feel worse than before. A fixed waking time, ' +
      'even on weekends, keeps the body clock steady and makes falling asleep easier.\n\n' +
      'None of this requires a student to sleep ten hours. It asks for something more modest and ' +
      'harder: to treat the last hour before the exam like the first hour after it, and to stop ' +
      'believing that an exhausted brain is a full one.',
    questions: [
      {
        id: 'rd-b1-health-01-q1',
        format: 'multiple-choice',
        prompt: 'Why does the author call the all-nighter a bad trade?',
        options: [
          'Loss from tired recall outweighs the extra material covered',
          'Students sleep through the exam itself',
          'Caffeine stops working after two in the morning',
          'Teachers mark tired students more harshly',
        ],
        answer: 'Loss from tired recall outweighs the extra material covered',
        explanation:
          'The second paragraph argues tired students lose more to poor retrieval than they gain from extra exposure.',
      },
      {
        id: 'rd-b1-health-01-q2',
        format: 'true-false-notgiven',
        prompt: 'The passage advises a nap of at least an hour before studying.',
        answer: 'False',
        explanation:
          'The third paragraph recommends about twenty minutes and warns that longer naps cause grogginess.',
      },
      {
        id: 'rd-b1-health-01-q3',
        format: 'short-answer',
        prompt: 'How long does caffeine continue to block sleep receptors, according to the passage?',
        answer: 'Six or seven hours',
        explanation: 'The third paragraph gives this figure when advising against afternoon coffee.',
      },
    ],
  },
  {
    id: 'rd-b1-technology-01',
    title: 'The Food Delivery Model',
    cefrLevel: 'B1',
    topic: 'technology',
    summary: 'How delivery apps changed restaurants, couriers and cities — and who pays for the convenience.',
    minutes: 8,
    text:
      'A decade ago, ordering a meal meant telephoning a restaurant that had a menu near your home. ' +
      'Today a delivery app shows every kitchen within a few kilometres, tracks the rider on a map ' +
      'and settles the payment before the food is cooked. The convenience has been so complete that ' +
      'it has quietly rebuilt the industry around it.\n\n' +
      'For restaurants, the apps are both a shop window and a tax. Being visible on a platform ' +
      'brings customers a small family kitchen could never reach on its own, but platforms typically ' +
      'take a commission on each order — often somewhere between fifteen and thirty per cent. Thin ' +
      'margins do not survive that, which is why some kitchens now exist only for delivery: no ' +
      'tables, no waiters, no dining room at all. Urban planners have a name for them: ghost ' +
      'kitchens.\n\n' +
      'The riders are where the model is most contested. Apps describe them as independent partners ' +
      'who choose their own hours, but the algorithm assigns the work, sets the prices and can end ' +
      'an account without notice. Courts in several countries have argued about whether that makes ' +
      'riders employees with paid leave and sick pay. Cities, meanwhile, deal with the physical ' +
      'result: scooters on pavements and restaurants lobbying for curbside parking.\n\n' +
      'The honest summary is that the delivery revolution has been a transfer of cost as much as a ' +
      'creation of value. Meals are easier to order, restaurants reach more customers — and the bill ' +
      'is paid by the kitchens, the riders and the streets.',
    questions: [
      {
        id: 'rd-b1-technology-01-q1',
        format: 'multiple-choice',
        prompt: 'Why do some kitchens operate with no dining room at all?',
        options: [
          'Restaurant margins cannot easily absorb platform commissions',
          'Customers refuse to eat inside',
          'Cities have banned dine-in restaurants',
          'Apps forbid restaurants from hiring waiters',
        ],
        answer: 'Restaurant margins cannot easily absorb platform commissions',
        explanation:
          'The second paragraph links thin margins plus 15–30% commissions to the rise of delivery-only "ghost kitchens".',
      },
      {
        id: 'rd-b1-technology-01-q2',
        format: 'true-false-notgiven',
        prompt: 'Ghost kitchens are more profitable than ordinary restaurants.',
        answer: 'Not given',
        explanation:
          'The passage describes why they exist but offers no information about their relative profitability.',
      },
      {
        id: 'rd-b1-technology-01-q3',
        format: 'short-answer',
        prompt: 'What term does the passage use for rider work conditions that courts have disputed?',
        answer: 'Independent partners',
        explanation:
          'The third paragraph says apps classify riders as independent partners, though algorithms assign work and set prices.',
      },
    ],
  },
  {
    id: 'rd-b2-education-01',
    title: 'Laptops Versus Pen and Paper',
    cefrLevel: 'B2',
    topic: 'education',
    summary:
      'What note-taking research suggests about screens in lectures — and why the answer is task-dependent.',
    minutes: 9,
    text:
      'When lecture halls filled with laptops, two confident predictions were made. One camp argued ' +
      'that typing would transform learning: students could capture more of the lecture, search their ' +
      'notes instantly and never lose a page. The other predicted catastrophe — that screens would ' +
      'turn every student into a chronic mail-checker. Both camps were half right, and the surviving ' +
      'research suggests something more awkward than either slogan.\n\n' +
      'The central finding concerns encoding. Because typists can nearly transcribe a lecture verbatim, ' +
      'they are rarely forced to decide what matters. Writers by hand cannot keep up with the ' +
      'speaker and must compress, paraphrase and select — the very operations that appear to bind new ' +
      'material to prior knowledge. On conceptual questions, hand-writers have repeatedly out-' +
      'performed typists, while typists hold an advantage on factual recall, consistent with the ' +
      'greater volume of their notes.\n\n' +
      'That advantage evaporates outside the lecture, however. Students who keep notes on a general-' +
      'purpose machine divide attention between the lecture and everything the machine offers, and ' +
      'the cost is measurable in the learning of the students sitting near them, not only the user’s ' +
      'own. A minority of students — those with disabilities that make handwriting slow or painful — ' +
      'face the opposite problem when laptops are simply banned, which is why blanket bans remain ' +
      'rare in universities that take access obligations seriously.\n\n' +
      'The defensible conclusion is that the tool is not the variable; the demand of the task is. ' +
      'Where a lecture develops an argument, compression helps; where a seminar dictates formulae and ' +
      'dates, capture helps. A thoughtful course designer, or a thoughtful student, switches — and ' +
      'grades the notes, not the sentiment, on either choice.',
    questions: [
      {
        id: 'rd-b2-education-01-q1',
        format: 'multiple-choice',
        prompt: 'Why do hand-writers often outperform typists on conceptual questions?',
        options: [
          'Forced compression makes them select and paraphrase, which deepens processing',
          'They attend lectures more attentively than laptop users',
          'Screens damage eyesight and slow reading',
          'Typists are banned from reviewing before exams',
        ],
        answer: 'Forced compression makes them select and paraphrase, which deepens processing',
        explanation:
          'The second paragraph attributes the hand-writing edge to the selecting and paraphrasing compression requires.',
      },
      {
        id: 'rd-b2-education-01-q2',
        format: 'true-false-notgiven',
        prompt: 'Most universities have replaced laptop bans with exam-only restrictions.',
        answer: 'Not given',
        explanation:
          'The passage notes that blanket bans remain rare and mentions access obligations, but never reports what most universities do.',
      },
      {
        id: 'rd-b2-education-01-q3',
        format: 'short-answer',
        prompt: 'According to the passage, on what kind of recall do typists keep an advantage?',
        answer: 'Factual recall',
        explanation:
          'The second paragraph says typists retain an advantage on factual recall because their notes are more complete.',
      },
    ],
  },
  {
    id: 'rd-b2-science-01',
    title: 'Rivers Under the Motorway',
    cefrLevel: 'B2',
    topic: 'science',
    summary: 'Cities are uncovering streams they buried a century ago — with measurable returns.',
    minutes: 9,
    text:
      'Between the wars, the stream was the least fashionable piece of urban infrastructure. Culverting ' +
      'a watercourse — sealing it in a brick pipe beneath a road — seemed to deliver two benefits at ' +
      'once: it reclaimed the marshy land beside it, and it buried the smell of a city’s untreated ' +
      'sewage out of public sight. Thousands of kilometres of urban river disappeared this way, ' +
      'including several that still give districts their names.\n\n' +
      'Engineers have since discovered that a buried stream is a debt, not an asset. A culvert carries ' +
      'the flow the neighbourhood produced in 1930; when paved catchments multiply, heavy rain ' +
      'overwhelms the pipe and floods the streets above it — streets that, being sealed, cannot ' +
      'absorb a drop. So a growing number of cities are now paying to reverse the original decision. ' +
      'The most quoted case is a capital in East Asia that demolished a six-lane expressway built ' +
      'over a stream, excavated the channel, and reconnected it to the bay; temperatures along the ' +
      'new waterway fell measurably in summer, and fish returned within a few years.\n\n' +
      'The returns are not only aesthetic. Open water cools its corridor through shade and evaporation, ' +
      'a serious advantage as heatwaves lengthen; a restored channel detains stormwater upstream of ' +
      'the old bottlenecks; and biodiversity surveys on restored reaches routinely record insects, ' +
      'bats and breeding birds absent from the culverted status quo. The costs are real too — land ' +
      'is expensive once it has been built over, maintenance of urban banks never ends, and parking ' +
      'spaces given up are counted by someone.\n\n' +
      'What has changed is the ledger. For eighty years, burying a river showed up as a saving. Now ' +
      'the flooding, the heat and the cleaning bills show up too, and the old motorways are starting ' +
      'to look like the most expensive form of flood defence ever invented.',
    questions: [
      {
        id: 'rd-b2-science-01-q1',
        format: 'multiple-choice',
        prompt: 'Why do buried streams worsen modern flooding?',
        options: [
          'Culverts were sized for lighter flows and paved catchments shed more rain',
          'Fish block the pipes during migration',
          'Cities stopped maintaining any drainage at all',
          'Open rivers simply absorb all heavy rainfall',
        ],
        answer: 'Culverts were sized for lighter flows and paved catchments shed more rain',
        explanation:
          'The second paragraph pairs 1930s culvert capacity with paved, non-absorbing catchments as the cause of flooding.',
      },
      {
        id: 'rd-b2-science-01-q2',
        format: 'true-false-notgiven',
        prompt: 'Daylighted rivers can make their immediate surroundings cooler.',
        answer: 'True',
        explanation:
          'The third paragraph cites the restored East Asian waterway, where summer temperatures along the corridor fell measurably.',
      },
      {
        id: 'rd-b2-science-01-q3',
        format: 'short-answer',
        prompt: 'Name two costs the passage associates with uncovering rivers.',
        answer: 'Expensive land and endless maintenance',
        explanation:
          'The third paragraph lists costly urban land, continuing bank maintenance and lost parking as the costs.',
      },
    ],
  },
  {
    id: 'rd-b2-history-01',
    title: 'The Box That Shrank the World',
    cefrLevel: 'B2',
    topic: 'history',
    summary: 'The shipping container’s success was about standards and politics as much as steel.',
    minutes: 9,
    text:
      'On April 26, 1956, a refitted Second World War tanker named the Ideal X left Newark, New Jersey ' +
      'carrying fifty-eight steel boxes and nothing else. The voyage was uneventful, and its inventor, ' +
      'a trucking entrepreneur named Malcom McLean, had not so much built a machine as identified a ' +
      'bottleneck: cargo had never been slowed by crossing the ocean, but by the men, ropes and ' +
      'warehouse floors on each side of it.\n\n' +
      'The economics were extreme. Loading conventional break-bulk cargo cost several dollars per ' +
      'ton; moving the same goods in boxes cost a few cents, and a ship that had spent a week at the ' +
      'pier could turn around in hours. Yet the box itself was trivial engineering — corrugated steel ' +
      'had existed for a century. What made the system work were the corners: standard fittings that ' +
      'let a crane, a truck chassis and a rail wagon handle the identical geometry without asking ' +
      'what was inside. Standards, not ships, did the shrinking.\n\n' +
      'Nor was adoption automatic. Longshoremen’s unions, port authorities and national governments ' +
      'each had a veto, and in several countries containerisation arrived late precisely because that ' +
      'veto was used. Where it went first, the map was redrawn: New York’s waterfront piers closed ' +
      'and traffic shifted to the deeper, more open terminals across the river in New Jersey, while ' +
      'cities that had built their identity around a dock found the dock moving past them.\n\n' +
      'The familiar celebration — "the container globalised trade" — gets the direction right but the ' +
      'mechanism wrong. Boxes did not lower the cost of ocean crossings; they lowered the cost of ' +
      'stopping, which is what trade had always paid for. Today, as ports automate their cranes and ' +
      'their gatehouses, the same lesson is being repeated with the next generation of dockworkers ' +
      'reading about it from the same pier that used to employ them.',
    questions: [
      {
        id: 'rd-b2-history-01-q1',
        format: 'multiple-choice',
        prompt: 'What does the passage present as the decisive ingredient of containerisation?',
        options: [
          'Standard corner fittings that made ships, trucks and cranes compatible',
          'The larger hulls of post-war tankers',
          'Government subsidies for new ports',
          'Faster ocean routes across the Atlantic',
        ],
        answer: 'Standard corner fittings that made ships, trucks and cranes compatible',
        explanation:
          'The second paragraph argues the steel box was trivial; standard geometry across all handlers "did the shrinking".',
      },
      {
        id: 'rd-b2-history-01-q2',
        format: 'true-false-notgiven',
        prompt:
          'Containerisation increased the number of dockworkers in the countries that adopted it first.',
        answer: 'False',
        explanation:
          'The passage describes terminals turning round faster and New York’s waterfront piers closing as containerisation moved work elsewhere; it records no growth in dock employment.',
      },
      {
        id: 'rd-b2-history-01-q3',
        format: 'short-answer',
        prompt: 'According to the last paragraph, which cost did containers actually reduce?',
        answer: 'The cost of stopping',
        explanation:
          'The final paragraph says boxes did not lower ocean crossings but "the cost of stopping", which is what trade always paid for.',
      },
    ],
  },
  {
    id: 'rd-c1-science-01',
    title: 'Mapping Urban Silence',
    cefrLevel: 'C1',
    topic: 'science',
    summary: 'Noise maps made sound measurable — and exposed how little decibels tell us about annoyance.',
    minutes: 10,
    text:
      'European cities are required to publish strategic noise maps: modelled surfaces of traffic, ' +
      'rail, airport and industrial sound around their densest areas, refreshed on a five-year cycle. ' +
      'The exercise rests on a wager familiar to every planner — that a nuisance becomes manageable ' +
      'the moment it can be measured. The maps are technically impressive and, for their stated ' +
      'purpose, effective. They are also documenting a construct, and the gap between the construct ' +
      'and the experience is where the interesting problems live.\n\n' +
      'The measured quantity, usually an annual average weighted for the night’s sensitivity to sound, ' +
      'compresses everything a city’s ears do not. It treats a distant tyre roar and the church ' +
      'bells three streets away as equivalent magnitudes; it cannot express the finding that ' +
      'annoyance correlates weakly with level, since identical exposure ratings produce calm in one ' +
      'respondent and desperation in another. Perception tracks controllability and meaning — noise ' +
      'attributed to a neighbour’s choice irritates more than the same energy from a road — and a ' +
      'decibel carries neither variable. Consequently a district can be "compliant" on every map and ' +
      'uninhabitable in every interview.\n\n' +
      'Health guidance gives the measurement its due, and then some. Long-term exposure to ' +
      'transport noise has been associated with ischaemic heart disease, hypertension and sleep ' +
      'disturbance, the last at levels well below those that wake a sleeping person fully: the ' +
      'cardiovascular system, it seems, keeps better attendance records than consciousness. The ' +
      'advisory bodies’ recommended limits are consequently far stricter than what most mapped cities ' +
      'currently satisfy — an inconvenient comparison that map-makers occasionally note is the point.\n\n' +
      'The response in the research community has been a "soundscape" turn: evaluating the acoustic ' +
      'environment by what it affords — conversation, birdsong, the audibility of a tram one must ' +
      'hear — rather than by a single suppressed magnitude. Critics call it soft science in a policy ' +
      'world that needs numbers; its defenders reply that a regime which only protects quiet ' +
      'guarantees the quiet of the wealthy and the noise of everyone else. Whether or not that ' +
      'distributional verdict holds, the strategic maps remain. They have simply begun to be read as ' +
      'what they were always going to be: a very precise answer to one question, asked in a city ' +
      'full of others.',
    questions: [
      {
        id: 'rd-c1-science-01-q1',
        format: 'multiple-choice',
        prompt: 'Why can a district appear compliant on noise maps yet feel unliveable to residents?',
        options: [
          'Annoyance depends on meaning and controllability, which decibels cannot encode',
          'Cities rarely update the maps often enough to matter',
          'Modelling software systematically underestifies night-time sound',
          'Residents mishear distant sounds as nearer ones',
        ],
        answer: 'Annoyance depends on meaning and controllability, which decibels cannot encode',
        explanation:
          'The second paragraph explains that perception tracks controllability and meaning, variables absent from a decibel figure.',
      },
      {
        id: 'rd-c1-science-01-q2',
        format: 'true-false-notgiven',
        prompt:
          'Sleep disturbance has been associated with noise levels below those that fully wake a person.',
        answer: 'True',
        explanation:
          'The third paragraph states sleep disturbance occurs at levels well below full awakening, citing cardiovascular responsiveness.',
      },
      {
        id: 'rd-c1-science-01-q3',
        format: 'short-answer',
        prompt:
          'What do defenders of the soundscape approach claim an exclusively quiet-protection regime preserves?',
        answer: 'The quiet of the wealthy',
        explanation:
          'The fourth paragraph reports defenders arguing that protecting only measured quiet leaves the wealthy quiet and everyone else exposed.',
      },
    ],
  },
  {
    id: 'rd-c1-cities-01',
    title: 'The Fifteen-Minute City',
    cefrLevel: 'C1',
    topic: 'cities',
    summary: 'An old urban idea, modern measurement, and a controversy about who the neighbourhood serves.',
    minutes: 10,
    text:
      'The fifteen-minute city is usually presented as a provocation, but its arithmetic is ' +
      'unremarkable: measure daily life by what a resident can reach on foot or bicycle within a ' +
      'quarter of an hour, rather than by how fast a car can cross the city. Its intellectual lineage ' +
      'is deeper than its branding — a nineteenth-century Spanish engineer’s vision of self-sufficient ' +
      'hexagonal districts, a late-twentieth-century “urban village” literature, and the ' +
      'contemporary academic who popularised the slogan after observing that metropolitan life had ' +
      'stopped being about the city and started being about the commute.\n\n' +
      'The measurable content of the idea is real. Mixed-use density is not a style preference; it ' +
      'statistically predicts shorter trip distances, higher walking rates and — the variable ' +
      'researchers actually prize — higher accessibility, defined as opportunities reachable within ' +
      'the time budget, not speed. A neighbourhood with a school, clinic, grocer and metro inside the ' +
      'fifteen-minute radius genuinely offers its residents a different relationship with time, and ' +
      'cities that piloted "school streets" and pedestrian punctual interventions have documented ' +
      'the expected shifts in mode share and street activity.\n\n' +
      'Two critiques are harder to wave away. The first is distributional: accessibility is ' +
      'capitalisable into land values, and everything a neighbourhood makes more liveable makes more ' +
      'desirable, which — absent a housing policy with a spine — prices out precisely the households ' +
      'whose journeys the plan was meant to shorten. A fifteen-minute district for its current ' +
      'residents and a fifteen-minute district for their future replacements are not the same ' +
      'policy. The second critique arrived in a distorted form: during an election cycle, the ' +
      'concept was recast in viral claims as a lockdown architecture for confining residents. The ' +
      'plan documents, read at leisure, contain no such mechanism — but a movement that answers ' +
      'car-dependent suburbs with “you will prefer your streets” will not be surprised to find its ' +
      'slogans mistrusted by the people whose preference was, in fact, never consulted.\n\n' +
      'The idea’s future will likely be decided by the boring parts: bus lanes, school siting, ' +
      'zoning for groceries between apartments, and the courage to reallocate an intersection.',
    questions: [
      {
        id: 'rd-c1-cities-01-q1',
        format: 'multiple-choice',
        prompt: 'What distributional risk does the passage attribute to fifteen-minute-city planning?',
        options: [
          'Improved accessibility raises land values and can displace the residents helped',
          'Mixed-use zoning reduces the total number of jobs available',
          'Walking infrastructure lowers street activity in poor districts',
          'Capping car speed removes emergency-service access',
        ],
        answer: 'Improved accessibility raises land values and can displace the residents helped',
        explanation:
          'The third paragraph argues accessibility capitalises into land values and, without housing policy, prices out current residents.',
      },
      {
        id: 'rd-c1-cities-01-q2',
        format: 'true-false-notgiven',
        prompt: 'The fifteen-minute-city concept was entirely invented in the twenty-first century.',
        answer: 'False',
        explanation:
          'The first paragraph traces the idea to a nineteenth-century engineer’s self-sufficient districts and later urban-village literature.',
      },
      {
        id: 'rd-c1-cities-01-q3',
        format: 'short-answer',
        prompt: 'What variable do researchers prize over travel speed when assessing the concept?',
        answer: 'Accessibility',
        explanation:
          'The second paragraph defines the prized variable as opportunities reachable within the time budget — accessibility.',
      },
    ],
  },
];

/** Derive the collection representation from a full passage. */
function toSummary(passage: ReadingPassage): ReadingSummary {
  return {
    id: passage.id,
    title: passage.title,
    cefrLevel: passage.cefrLevel,
    topic: passage.topic,
    summary: passage.summary,
    minutes: passage.minutes,
    wordCount: passage.text.split(/\s+/).length,
    questionCount: passage.questions.length,
  };
}

/** Thematic categories present in the dataset, sorted. */
export const READING_TOPICS: readonly string[] = [...new Set(READING_PASSAGES.map((p) => p.topic))].sort();

/**
 * Aggregate statistics for the graded reading dataset.
 */
export function readingStats(): ReadingStats {
  const byLevel: Record<string, number> = {};
  for (const passage of READING_PASSAGES) {
    byLevel[passage.cefrLevel] = (byLevel[passage.cefrLevel] ?? 0) + 1;
  }
  return {
    passages: READING_PASSAGES.length,
    questions: READING_PASSAGES.reduce((sum, passage) => sum + passage.questions.length, 0),
    words: READING_PASSAGES.reduce((sum, passage) => sum + passage.text.split(/\s+/).length, 0),
    byLevel,
  };
}

/** Options accepted by {@link searchReading}. */
export type ReadingQuery = {
  /** Restrict to one CEFR level. */
  level?: CefrLevel;
  /** Restrict to one thematic category. */
  topic?: string;
  /** Free-text search over title, summary and topic. */
  query?: string;
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

/** Order key: level, then identifier, so results are stable across releases. */
function orderKey(passage: ReadingPassage): string {
  const level = READING_LEVELS.indexOf(passage.cefrLevel);
  return `${String(level).padStart(2, '0')}:${passage.id}`;
}

/**
 * Filter and paginate the graded reading dataset (summaries, no full text).
 *
 * @param options - Search options.
 */
export function searchReading(options: ReadingQuery): Page<ReadingSummary> {
  const { level, topic, query = '' } = options;
  const filtered = READING_PASSAGES.filter((passage) => {
    if (level !== undefined && passage.cefrLevel !== level) {
      return false;
    }
    if (topic !== undefined && passage.topic !== topic) {
      return false;
    }
    if (query.length > 0 && !matchesQuery([passage.title, passage.summary, passage.topic], query)) {
      return false;
    }
    return true;
  });
  const sorted = sortBy(filtered, orderKey, 'asc');
  const page = paginate(sorted, options.limit, options.offset);
  return { ...page, items: page.items.map(toSummary) };
}

/**
 * Look up one full passage by identifier.
 *
 * @param id - Passage identifier.
 */
export function findPassage(id: string): ReadingPassage | undefined {
  const needle = id.trim().toLowerCase();
  return READING_PASSAGES.find((passage) => passage.id.toLowerCase() === needle);
}
