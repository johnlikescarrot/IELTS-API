/**
 * Topic-based vocabulary packs for IELTS Writing and Speaking.
 *
 * Each pack collects high-value terms, collocations and original example
 * sentences for one recurring IELTS topic. Original study content.
 */

export interface TopicVocabEntry {
  readonly term: string;
  readonly meaning: string;
  readonly example: string;
  readonly collocations: readonly string[];
}

export interface TopicVocabPack {
  readonly id: string;
  readonly topic: string;
  readonly words: readonly TopicVocabEntry[];
}

export const TOPIC_VOCAB: readonly TopicVocabPack[] = [
  {
    id: 'education',
    topic: 'Education',
    words: [
      {
        term: 'compulsory schooling',
        meaning: 'education that children are legally required to receive',
        example:
          'Compulsory schooling ensures that every child acquires basic literacy and numeracy.',
        collocations: ['attend compulsory schooling', 'years of compulsory schooling']
      },
      {
        term: 'curriculum',
        meaning: 'the subjects included in a course of study',
        example: 'A broad curriculum gives students the chance to discover their strengths.',
        collocations: [
          'a broad/balanced curriculum',
          'the national curriculum',
          'curriculum reform'
        ]
      },
      {
        term: 'academic achievement',
        meaning: 'success in formal study measured by results or qualifications',
        example: 'Parental involvement is strongly linked to academic achievement.',
        collocations: ['improve academic achievement', 'measures of academic achievement']
      },
      {
        term: 'vocational training',
        meaning: 'practical education that prepares people for a specific trade',
        example:
          'Vocational training addresses skills shortages more directly than academic degrees.',
        collocations: ['provide vocational training', 'vocational training programme']
      },
      {
        term: 'lifelong learning',
        meaning: 'the continued pursuit of knowledge throughout adult life',
        example: 'Automation makes lifelong learning essential for today’s workforce.',
        collocations: ['promote lifelong learning', 'a culture of lifelong learning']
      },
      {
        term: 'tuition fees',
        meaning: 'money paid for instruction, especially at university',
        example: 'Rising tuition fees deter students from low-income families.',
        collocations: ['cover tuition fees', 'waive tuition fees', 'soaring tuition fees']
      },
      {
        term: 'distance learning',
        meaning: 'study delivered remotely rather than on campus',
        example: 'Distance learning has opened universities to students in remote regions.',
        collocations: ['distance learning courses', 'through distance learning']
      },
      {
        term: 'rote learning',
        meaning: 'memorising material through repetition without deep understanding',
        example: 'Critics argue that rote learning stifles creativity and independent thought.',
        collocations: ['rely on rote learning', 'rote memorisation of facts']
      }
    ]
  },
  {
    id: 'environment',
    topic: 'Environment',
    words: [
      {
        term: 'carbon emissions',
        meaning: 'gases such as CO2 released into the atmosphere by human activity',
        example: 'Carbon emissions must fall by half this decade to limit global warming.',
        collocations: ['cut/reduce carbon emissions', 'carbon emissions target']
      },
      {
        term: 'renewable energy',
        meaning: 'energy from sources that are not depleted by use, such as wind or solar',
        example: 'Investment in renewable energy creates jobs while cutting pollution.',
        collocations: ['switch to renewable energy', 'renewable energy sector']
      },
      {
        term: 'climate change',
        meaning: 'long-term shifts in global weather patterns, largely human-caused',
        example: 'Climate change threatens agriculture and coastal communities alike.',
        collocations: ['combat climate change', 'the effects of climate change']
      },
      {
        term: 'sustainable development',
        meaning: 'growth that meets present needs without harming future generations',
        example: 'Sustainable development balances economic growth with environmental protection.',
        collocations: ['pursue sustainable development', 'principles of sustainable development']
      },
      {
        term: 'deforestation',
        meaning: 'the large-scale clearing of forests',
        example: 'Deforestation destroys habitats and releases stored carbon.',
        collocations: ['combat deforestation', 'deforestation rates']
      },
      {
        term: 'ecosystem',
        meaning: 'a community of living things interacting with their environment',
        example: 'Pollution can collapse an entire ecosystem within a few years.',
        collocations: ['damage/protect ecosystems', 'fragile ecosystem']
      },
      {
        term: 'carbon footprint',
        meaning: 'the total greenhouse gases caused by an individual or activity',
        example: 'Cycling to work dramatically reduces your carbon footprint.',
        collocations: ['reduce/shrink a carbon footprint', 'measure a carbon footprint']
      },
      {
        term: 'conservation',
        meaning: 'protection of natural resources, wildlife or habitats',
        example: 'Conservation programmes have saved several species from extinction.',
        collocations: ['conservation efforts', 'wildlife conservation project']
      }
    ]
  },
  {
    id: 'technology',
    topic: 'Technology',
    words: [
      {
        term: 'artificial intelligence',
        meaning: 'computer systems able to perform tasks that normally need human intelligence',
        example: 'Artificial intelligence is transforming industries from healthcare to logistics.',
        collocations: ['artificial intelligence systems', 'powered by artificial intelligence']
      },
      {
        term: 'digital divide',
        meaning: 'the gap between people who have access to technology and those who do not',
        example: 'The digital divide leaves rural students at a disadvantage.',
        collocations: ['bridge/close the digital divide', 'widen the digital divide']
      },
      {
        term: 'automation',
        meaning: 'the use of machines to do work previously done by people',
        example: 'Automation will reshape manufacturing and clerical work alike.',
        collocations: ['automation of jobs', 'driven by automation']
      },
      {
        term: 'cybersecurity',
        meaning: 'protection of computers and data from unauthorised access',
        example: 'Cybersecurity has become a national priority as attacks multiply.',
        collocations: ['cybersecurity threats', 'invest in cybersecurity']
      },
      {
        term: 'screen time',
        meaning: 'the amount of time spent using devices with screens',
        example: 'Excessive screen time is linked to poor sleep in teenagers.',
        collocations: ['limit screen time', 'excessive screen time']
      },
      {
        term: 'technological breakthrough',
        meaning: 'an important discovery or development in technology',
        example: 'Every technological breakthrough brings both opportunities and risks.',
        collocations: ['a major technological breakthrough', 'recent breakthroughs in computing']
      },
      {
        term: 'data privacy',
        meaning: 'the right of individuals to control how their personal data is used',
        example: 'Stricter laws on data privacy are demanded by consumers.',
        collocations: ['data privacy regulations', 'concerns about data privacy']
      },
      {
        term: 'obsolete',
        meaning: 'no longer used because something newer has replaced it',
        example: 'Skills can quickly become obsolete in fast-changing industries.',
        collocations: ['become obsolete', 'render something obsolete']
      }
    ]
  },
  {
    id: 'health',
    topic: 'Health',
    words: [
      {
        term: 'public health',
        meaning: 'the health of the population as a whole',
        example: 'Vaccination is one of the greatest public health achievements.',
        collocations: ['public health campaign', 'public health system']
      },
      {
        term: 'sedentary lifestyle',
        meaning: 'a way of life with little physical activity',
        example: 'A sedentary lifestyle increases the risk of heart disease.',
        collocations: ['lead a sedentary lifestyle', 'increasingly sedentary lifestyles']
      },
      {
        term: 'balanced diet',
        meaning: 'a diet containing the right proportions of different foods',
        example: 'A balanced diet in childhood supports lifelong health.',
        collocations: ['maintain a balanced diet', 'a healthy, balanced diet']
      },
      {
        term: 'preventive care',
        meaning: 'medical care aimed at stopping illness before it starts',
        example: 'Preventive care is cheaper than treating advanced disease.',
        collocations: ['invest in preventive care', 'access to preventive care']
      },
      {
        term: 'obesity epidemic',
        meaning: 'a rapid, widespread rise in obesity within a population',
        example: 'Sugary drink taxes aim to reverse the obesity epidemic.',
        collocations: ['tackle the obesity epidemic', 'growing obesity epidemic']
      },
      {
        term: 'mental well-being',
        meaning: 'a positive state of mind and emotional health',
        example: 'Workplace policies should protect employees’ mental well-being.',
        collocations: ['support mental well-being', 'safeguard mental well-being']
      },
      {
        term: 'life expectancy',
        meaning: 'the average number of years a person is expected to live',
        example: 'Life expectancy has risen steadily in most developed countries.',
        collocations: ['increase/raise life expectancy', 'rising life expectancy']
      },
      {
        term: 'healthcare system',
        meaning: 'the organisation of medical services in a country',
        example: 'An ageing population places pressure on every healthcare system.',
        collocations: ['overburdened healthcare system', 'reform the healthcare system']
      }
    ]
  },
  {
    id: 'work',
    topic: 'Work and careers',
    words: [
      {
        term: 'work-life balance',
        meaning: 'a healthy division between working hours and personal life',
        example: 'Flexible hours improve employees’ work-life balance.',
        collocations: ['achieve a work-life balance', 'poor work-life balance']
      },
      {
        term: 'job security',
        meaning: 'the assurance of keeping one’s job',
        example: 'Gig workers often lack job security and benefits.',
        collocations: ['lack job security', 'offer job security']
      },
      {
        term: 'career prospects',
        meaning: 'opportunities for future advancement in a profession',
        example: 'Graduates move to cities for better career prospects.',
        collocations: ['enhance career prospects', 'limited career prospects']
      },
      {
        term: 'remote working',
        meaning: 'working from home or another location outside the office',
        example: 'Remote working cuts commuting time but can isolate staff.',
        collocations: ['embrace remote working', 'shift to remote working']
      },
      {
        term: 'redundancy',
        meaning: 'the loss of a job because the position is no longer needed',
        example: 'Automation has led to redundancies across the sector.',
        collocations: ['face redundancy', 'voluntary redundancy']
      },
      {
        term: 'skilled workforce',
        meaning: 'workers trained with the abilities an economy needs',
        example: 'Immigration can ease shortages in the skilled workforce.',
        collocations: ['a highly skilled workforce', 'train a skilled workforce']
      },
      {
        term: 'glass ceiling',
        meaning: 'invisible barriers that block promotion for particular groups',
        example: 'Mentoring schemes help women break through the glass ceiling.',
        collocations: ['break the glass ceiling', 'shatter the glass ceiling']
      },
      {
        term: 'gig economy',
        meaning: 'a labour market based on short-term contracts and freelance work',
        example: 'The gig economy offers flexibility but few protections.',
        collocations: ['thrive in the gig economy', 'regulate the gig economy']
      }
    ]
  },
  {
    id: 'cities',
    topic: 'Cities and urbanisation',
    words: [
      {
        term: 'urban sprawl',
        meaning: 'the uncontrolled spread of a city into surrounding areas',
        example: 'Urban sprawl consumes farmland around many growing cities.',
        collocations: ['contain urban sprawl', 'unchecked urban sprawl']
      },
      {
        term: 'traffic congestion',
        meaning: 'heavy, slow-moving traffic on roads',
        example: 'Congestion charges have reduced traffic congestion in central London.',
        collocations: ['ease traffic congestion', 'chronic traffic congestion']
      },
      {
        term: 'affordable housing',
        meaning: 'homes priced so ordinary residents can rent or buy them',
        example: 'A shortage of affordable housing pushes workers to distant suburbs.',
        collocations: ['build affordable housing', 'crisis in affordable housing']
      },
      {
        term: 'public transport',
        meaning: 'buses, trains and other services available to everyone',
        example: 'Reliable public transport is the backbone of a liveable city.',
        collocations: ['invest in public transport', 'public transport network']
      },
      {
        term: 'overcrowding',
        meaning: 'too many people living in a space designed for fewer',
        example: 'Overcrowding worsens sanitation in informal settlements.',
        collocations: ['severe overcrowding', 'relieve overcrowding']
      },
      {
        term: 'quality of life',
        meaning: 'how comfortable and satisfying life is in a place',
        example: 'Green spaces measurably improve urban quality of life.',
        collocations: ['enhance quality of life', 'declining quality of life']
      },
      {
        term: 'inner city',
        meaning: 'the older, often poorer central area of a city',
        example: 'Regeneration has revived many inner-city districts.',
        collocations: ['inner-city schools', 'inner-city regeneration']
      },
      {
        term: 'rural depopulation',
        meaning: 'the movement of people away from the countryside',
        example: 'Rural depopulation leaves villages without young workers.',
        collocations: ['reverse rural depopulation', 'suffer rural depopulation']
      }
    ]
  },
  {
    id: 'crime',
    topic: 'Crime and punishment',
    words: [
      {
        term: 'deterrent',
        meaning: 'something that discourages people from committing a crime',
        example: 'Supporters argue that tough sentences act as a deterrent.',
        collocations: ['act as a deterrent', 'an effective deterrent to crime']
      },
      {
        term: 'rehabilitation',
        meaning: 'helping offenders return to society as law-abiding citizens',
        example: 'Rehabilitation reduces reoffending more effectively than punishment alone.',
        collocations: ['rehabilitation programmes', 'focus on rehabilitation']
      },
      {
        term: 'juvenile delinquency',
        meaning: 'criminal or antisocial behaviour by young people',
        example: 'After-school programmes can curb juvenile delinquency.',
        collocations: ['prevent juvenile delinquency', 'rise in juvenile delinquency']
      },
      {
        term: 'reoffending',
        meaning: 'committing another crime after being punished',
        example: 'High reoffending rates suggest prisons fail to reform inmates.',
        collocations: ['rates of reoffending', 'reduce reoffending']
      },
      {
        term: 'law enforcement',
        meaning: 'the activity of making people obey the law',
        example: 'Better-funded law enforcement does not always lower crime.',
        collocations: ['law enforcement agencies', 'strengthen law enforcement']
      },
      {
        term: 'community service',
        meaning: 'unpaid work done by offenders as a punishment',
        example: 'Community service suits minor, non-violent offences.',
        collocations: ['sentence someone to community service', 'perform community service']
      },
      {
        term: 'petty crime',
        meaning: 'minor crimes such as shoplifting or vandalism',
        example: 'Better street lighting deters petty crime.',
        collocations: ['petty crime wave', 'guilty of petty crime']
      },
      {
        term: 'capital punishment',
        meaning: 'execution as a legal penalty',
        example: 'Many countries have abolished capital punishment.',
        collocations: ['abolish capital punishment', 'in favour of capital punishment']
      }
    ]
  },
  {
    id: 'globalisation',
    topic: 'Globalisation and culture',
    words: [
      {
        term: 'cultural diversity',
        meaning: 'the existence of many cultures within one society',
        example: 'Immigration enriches cultural diversity in cities.',
        collocations: ['celebrate cultural diversity', 'threaten cultural diversity']
      },
      {
        term: 'multinational corporation',
        meaning: 'a company operating in several countries',
        example: 'Multinational corporations can relocate wherever costs are lowest.',
        collocations: ['multinational corporations dominate', 'regulate multinational corporations']
      },
      {
        term: 'cultural homogenisation',
        meaning: 'the process by which local cultures become similar to one another',
        example: 'Critics blame global brands for cultural homogenisation.',
        collocations: ['lead to cultural homogenisation', 'resist cultural homogenisation']
      },
      {
        term: 'free trade',
        meaning: 'trade between countries without tariffs or quotas',
        example: 'Free trade agreements lower prices but expose local firms.',
        collocations: ['free trade agreement', 'promote free trade']
      },
      {
        term: 'brain drain',
        meaning: 'the emigration of highly trained people from a country',
        example: 'Low salaries accelerate the brain drain of doctors.',
        collocations: ['suffer a brain drain', 'reverse the brain drain']
      },
      {
        term: 'cultural heritage',
        meaning: 'traditions, monuments and arts passed down through generations',
        example: 'Tourism revenue can fund the protection of cultural heritage.',
        collocations: ['preserve cultural heritage', 'UNESCO cultural heritage site']
      },
      {
        term: 'outsourcing',
        meaning: 'moving work to outside companies, often abroad',
        example: 'Outsourcing customer service cuts costs but reduces quality.',
        collocations: ['outsource jobs to', 'the outsourcing of services']
      },
      {
        term: 'global village',
        meaning: 'the world viewed as one interconnected community',
        example: 'The internet has turned the planet into a global village.',
        collocations: ['become a global village', 'the concept of a global village']
      }
    ]
  },
  {
    id: 'media',
    topic: 'Media and communication',
    words: [
      {
        term: 'mass media',
        meaning: 'means of communication reaching large audiences',
        example: 'The mass media shapes public opinion on politics.',
        collocations: ['the role of the mass media', 'mass media coverage']
      },
      {
        term: 'misinformation',
        meaning: 'false information spread regardless of intent',
        example: 'Misinformation spreads faster than corrections online.',
        collocations: ['combat misinformation', 'the spread of misinformation']
      },
      {
        term: 'sensationalism',
        meaning: 'presenting news in a shocking, exaggerated way',
        example: 'Sensationalism sells papers but distorts reality.',
        collocations: ['accuse the press of sensationalism', 'tabloid sensationalism']
      },
      {
        term: 'freedom of the press',
        meaning: 'the right of media to report without censorship',
        example: 'Freedom of the press underpins any healthy democracy.',
        collocations: ['defend freedom of the press', 'restrictions on freedom of the press']
      },
      {
        term: 'influencer',
        meaning: 'a person who affects buyers’ choices through social media',
        example: 'Influencers now rival television in advertising reach.',
        collocations: ['social media influencer', 'influencer marketing']
      },
      {
        term: 'echo chamber',
        meaning: 'an environment where people meet only opinions they already hold',
        example: 'Algorithms can trap users in echo chambers.',
        collocations: ['create an echo chamber', 'escape the echo chamber']
      },
      {
        term: 'censorship',
        meaning: 'the suppression of content considered unacceptable',
        example: 'Censorship of the internet is debated worldwide.',
        collocations: ['impose censorship', 'internet censorship']
      },
      {
        term: 'tabloid',
        meaning: 'a newspaper with short, sensational stories',
        example: 'Tabloids prioritise celebrity gossip over analysis.',
        collocations: ['tabloid journalism', 'a tabloid scandal']
      }
    ]
  },
  {
    id: 'society',
    topic: 'Society and family',
    words: [
      {
        term: 'nuclear family',
        meaning: 'parents and their children living as one household',
        example: 'The nuclear family is less common than fifty years ago.',
        collocations: ['traditional nuclear family', 'rise of the nuclear family']
      },
      {
        term: 'gender equality',
        meaning: 'equal rights and opportunities regardless of gender',
        example: 'Gender equality in pay remains unfinished business.',
        collocations: ['achieve gender equality', 'promote gender equality']
      },
      {
        term: 'social mobility',
        meaning: 'the ability to move up or down the social ladder',
        example: 'Good schools are engines of social mobility.',
        collocations: ['increase social mobility', 'limited social mobility']
      },
      {
        term: 'ageing population',
        meaning: 'a population with a growing proportion of elderly people',
        example: 'An ageing population strains pension systems.',
        collocations: ['cater for an ageing population', 'rapidly ageing population']
      },
      {
        term: 'single-parent household',
        meaning: 'a family with one parent raising the children',
        example: 'Single-parent households often need extra childcare support.',
        collocations: [
          'grow up in a single-parent household',
          'support for single-parent households'
        ]
      },
      {
        term: 'social cohesion',
        meaning: 'the strength of relationships and sense of solidarity in a community',
        example: 'Mixed housing designs strengthen social cohesion.',
        collocations: ['foster social cohesion', 'undermine social cohesion']
      },
      {
        term: 'generation gap',
        meaning: 'differences in attitudes between older and younger generations',
        example: 'The generation gap shows itself most clearly in technology use.',
        collocations: ['bridge the generation gap', 'widen the generation gap']
      },
      {
        term: 'extended family',
        meaning: 'a family including grandparents, aunts and cousins',
        example: 'The extended family provides free childcare in many cultures.',
        collocations: ['live with the extended family', 'a close extended family']
      }
    ]
  },
  {
    id: 'tourism',
    topic: 'Travel and tourism',
    words: [
      {
        term: 'mass tourism',
        meaning: 'tourism by very large numbers of visitors',
        example: 'Mass tourism strains water supplies on small islands.',
        collocations: ['the effects of mass tourism', 'depend on mass tourism']
      },
      {
        term: 'overtourism',
        meaning: 'excessive tourism that damages local life and heritage',
        example: 'Venice suffers acute overtourism each summer.',
        collocations: ['combat overtourism', 'a victim of overtourism']
      },
      {
        term: 'ecotourism',
        meaning: 'responsible travel that supports conservation and local people',
        example: 'Ecotourism funds parks while educating visitors.',
        collocations: ['promote ecotourism', 'ecotourism initiative']
      },
      {
        term: 'tourist attraction',
        meaning: 'a place visitors travel to see',
        example: 'The ancient temple is the country’s main tourist attraction.',
        collocations: ['a popular tourist attraction', 'a major tourist attraction']
      },
      {
        term: 'cultural exchange',
        meaning: 'sharing ideas and traditions between different cultures',
        example: 'Student travel encourages genuine cultural exchange.',
        collocations: ['encourage cultural exchange', 'a programme of cultural exchange']
      },
      {
        term: 'off the beaten track',
        meaning: 'far from places where tourists usually go',
        example: 'The village remains off the beaten track.',
        collocations: ['venture off the beaten track', 'destinations off the beaten track']
      },
      {
        term: 'local economy',
        meaning: 'the businesses and jobs of a particular area',
        example: 'Tourism props up the local economy in coastal towns.',
        collocations: ['boost the local economy', 'damage the local economy']
      },
      {
        term: 'sustainable tourism',
        meaning: 'tourism that limits harm to environment and culture',
        example: 'Visitor caps are one tool of sustainable tourism.',
        collocations: ['practise sustainable tourism', 'a model of sustainable tourism']
      }
    ]
  },
  {
    id: 'government',
    topic: 'Government and society',
    words: [
      {
        term: 'public spending',
        meaning: 'money the government spends on services and projects',
        example: 'Public spending on railways fell sharply last decade.',
        collocations: ['cut public spending', 'prioritise public spending']
      },
      {
        term: 'legislation',
        meaning: 'laws, or the process of making them',
        example: 'New legislation banned smoking in public places.',
        collocations: ['introduce legislation', 'tighten legislation']
      },
      {
        term: 'welfare state',
        meaning: 'a system in which the state protects citizens’ basic welfare',
        example: 'The welfare state provides healthcare and unemployment benefit.',
        collocations: ['dismantle the welfare state', 'a generous welfare state']
      },
      {
        term: 'taxpayer',
        meaning: 'a person who pays taxes to the government',
        example: 'Taxpayers should not fund private sports stadiums.',
        collocations: ['taxpayers’ money', 'a burden on taxpayers']
      },
      {
        term: 'public policy',
        meaning: 'the principles and laws guiding government action',
        example: 'Evidence should drive public policy on housing.',
        collocations: ['shape public policy', 'a shift in public policy']
      },
      {
        term: 'civic responsibility',
        meaning: 'the duties citizens owe to their community',
        example: 'Voting is a basic civic responsibility.',
        collocations: ['a sense of civic responsibility', 'promote civic responsibility']
      },
      {
        term: 'infrastructure',
        meaning: 'the basic physical systems a country needs, such as roads and power',
        example: 'Ageing infrastructure is costly to maintain.',
        collocations: ['invest in infrastructure', ' crumbling infrastructure']
      },
      {
        term: 'transparency',
        meaning: 'openness in government decisions and spending',
        example: 'Transparency reduces corruption in public contracts.',
        collocations: ['ensure transparency', 'a lack of transparency']
      }
    ]
  }
];

export const TOPIC_INDEX: ReadonlyMap<string, TopicVocabPack> = new Map(
  TOPIC_VOCAB.map((pack) => [pack.id, pack])
);
