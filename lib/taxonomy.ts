// lib/taxonomy.ts
// Single source of truth for the subject taxonomy used to categorise the
// ~32k free-form tags into sub-subjects grouped under broad subject areas.
//
// `patterns` are case-insensitive substrings matched against a tag's name.
// A tag is assigned to the FIRST matching sub-subject in declaration order
// (subjects listed first, and sub-subjects within them, win ties), so order
// the more specific / discriminative buckets earlier.
//
// This file is consumed by:
//   • scripts/generate-subject-sql.mjs  → emits the Supabase migration + seed
//   • the /subjects browse UI            → labels, descriptions, ordering

export interface SubSubject {
  slug: string;
  name: string;
  patterns: string[];
}

export interface Subject {
  slug: string;
  name: string;
  description: string;
  subsubjects: SubSubject[];
}

export const SUBJECTS: Subject[] = [
  {
    slug: 'philosophy-doctrine',
    name: 'Philosophy & Doctrine',
    description:
      'Metaphysics, epistemology, ethics and the core doctrinal systems of Jain and Indic thought.',
    subsubjects: [
      {
        slug: 'metaphysics-reality',
        name: 'Metaphysics & Reality',
        patterns: [
          'anekant', 'syadvad', 'saptabhangi', 'nayavad', 'naya ', 'dravya', 'substance',
          'reality', 'ontolog', 'metaphysic', 'tattva', 'nine principle', 'navatattva', 'pudgala',
        ],
      },
      {
        slug: 'karma-soul',
        name: 'Karma & the Soul',
        patterns: [
          'karma', 'jiva', 'soul', 'atman', 'atma', 'bondage', 'rebirth', 'transmigrat',
          'reincarnat', 'gunasthana', 'leshya', 'nirjara', 'liberation', 'moksha', 'mukti',
        ],
      },
      {
        slug: 'ethics-conduct',
        name: 'Ethics & Conduct',
        patterns: [
          'ahimsa', 'non-violence', 'nonviolence', 'ethic', 'moral', 'conduct', 'vrata', 'vow',
          'aparigraha', 'satya', 'brahmacharya', 'celibacy', 'anuvrata', 'virtue', 'compassion',
        ],
      },
      {
        slug: 'epistemology-logic',
        name: 'Epistemology & Logic',
        patterns: [
          'pramana', 'epistemolog', 'logic', 'nyaya', 'inference', 'perception', 'jnana',
          'knowledge', 'kevala', 'omniscience', 'valid cognition',
        ],
      },
    ],
  },
  {
    slug: 'scripture-canon',
    name: 'Scripture & Canon',
    description:
      'The canonical texts, their commentaries and the exegetical tradition that preserves them.',
    subsubjects: [
      {
        slug: 'agamas-canon',
        name: 'Agamas & Canon',
        patterns: [
          'agama', 'canon', 'sutra', 'anga', 'siddhanta', 'scripture', 'uttaradhyayana',
          'acaranga', 'kalpasutra', 'tattvartha', 'sacred text', 'prakirnaka',
        ],
      },
      {
        slug: 'commentary-exegesis',
        name: 'Commentaries & Exegesis',
        patterns: [
          'commentary', 'commentaries', 'bhashya', 'bhasya', 'tika', 'niryukti', 'curni', 'churni',
          'vritti', 'vrtti', 'exegesis', 'gloss', 'bhasa',
        ],
      },
    ],
  },
  {
    slug: 'literature-language',
    name: 'Literature & Language',
    description:
      'Poetry, narrative, drama and the Prakrit, Sanskrit and Apabhramsa languages of the corpus.',
    subsubjects: [
      {
        slug: 'prakrit-pali',
        name: 'Prakrit, Pali & Apabhramsa',
        patterns: ['prakrit', 'pali', 'ardhamagadhi', 'apabhram', 'magadhi', 'sauraseni'],
      },
      {
        slug: 'sanskrit-kavya',
        name: 'Sanskrit & Kavya',
        patterns: ['sanskrit', 'kavya', 'mahakavya', 'poem', 'poetry', 'poet', 'verse', 'stotra', 'hymn'],
      },
      {
        slug: 'narrative-story',
        name: 'Narrative & Story',
        patterns: [
          'narrative', 'story', 'stories', 'tale', 'katha', 'legend', 'fable', 'charita',
          'cariyam', 'carita', 'purana', 'prabandha', 'folklore', 'myth',
        ],
      },
      {
        slug: 'language-grammar',
        name: 'Language & Grammar',
        patterns: ['grammar', 'grammatical', 'linguistic', 'philolog', 'lexicon', 'lexical', 'language', 'etymolog'],
      },
    ],
  },
  {
    slug: 'art-architecture',
    name: 'Art, Architecture & Iconography',
    description:
      'Temples and shrines, sculpture and images, and the painted manuscript traditions.',
    subsubjects: [
      {
        slug: 'temple-architecture',
        name: 'Temple & Architecture',
        patterns: [
          'architect', 'temple', 'shrine', 'basadi', 'basti', 'cave', 'mandapa', 'stupa',
          'monument', 'tirtha', 'pilgrimage site', 'khajuraho', 'building',
        ],
      },
      {
        slug: 'sculpture-iconography',
        name: 'Sculpture & Iconography',
        patterns: [
          'iconograph', 'sculpture', 'sculptur', 'image', 'idol', 'statue', 'bronze', 'murti',
          'relief', 'carving', 'yaksha', 'yakshi', 'bahubali', 'gommat',
        ],
      },
      {
        slug: 'painting-manuscript-art',
        name: 'Painting & Manuscript Art',
        patterns: ['painting', 'miniature', 'illustrat', 'folio', 'pata', 'mural', 'colour', 'pictorial'],
      },
    ],
  },
  {
    slug: 'history-politics',
    name: 'History & Politics',
    description:
      'Dynasties and rulers, inscriptions, regional histories and the social fabric of the past.',
    subsubjects: [
      {
        slug: 'epigraphy-inscriptions',
        name: 'Epigraphy & Inscriptions',
        patterns: ['inscription', 'epigraph', 'copper plate', 'copper-plate', 'charter', 'seal', 'prashasti', 'grant'],
      },
      {
        slug: 'dynasties-rulers',
        name: 'Dynasties & Rulers',
        patterns: [
          'dynasty', 'empire', 'kingdom', 'ruler', 'reign', 'king', 'emperor', 'chola', 'gupta',
          'maurya', 'mughal', 'akbar', 'rashtrakuta', 'chalukya', 'hoysala', 'ganga', 'pallava', 'kushan',
        ],
      },
      {
        slug: 'regional-history',
        name: 'Regional & Local History',
        patterns: [
          'gujarat', 'rajasthan', 'karnataka', 'bengal', 'tamil', 'deccan', 'maharashtra', 'orissa',
          'odisha', 'kerala', 'mathura', 'regional', 'local history',
        ],
      },
      {
        slug: 'society-community',
        name: 'Society & Community',
        patterns: [
          'community', 'society', 'social', 'caste', 'sangha', 'sangh', 'gaccha', 'gachchha',
          'sect', 'digambara', 'svetambara', 'shvetambara', 'terapanth', 'sthanakvasi', 'patronage',
        ],
      },
    ],
  },
  {
    slug: 'biography-people',
    name: 'Biography & People',
    description:
      'The Tirthankaras and Jinas, the great acharyas and scholars, and modern figures.',
    subsubjects: [
      {
        slug: 'tirthankaras-jinas',
        name: 'Tirthankaras & Jinas',
        patterns: [
          'tirthankar', 'trithankar', 'jina', 'mahavira', 'mahavir', 'parshva', 'parsva',
          'rishabha', 'rsabha', 'adinatha', 'neminatha', 'shantinath', 'ford-maker', 'ford maker',
        ],
      },
      {
        slug: 'acharyas-scholars',
        name: 'Acharyas & Scholars',
        patterns: [
          'acharya', 'acarya', 'hemachandra', 'hemacandra', 'kundakunda', 'umasvati', 'umaswati',
          'haribhadra', 'yasovijaya', 'siddhasena', 'samantabhadra', 'scholar', 'preceptor', 'guru',
        ],
      },
      {
        slug: 'modern-figures',
        name: 'Modern Figures & Reformers',
        patterns: ['reformer', 'biograph', 'life of', 'life and work', 'personality', 'leader', 'saint'],
      },
    ],
  },
  {
    slug: 'religion-ritual',
    name: 'Religion, Ritual & Practice',
    description:
      'Worship and festivals, meditation and yoga, and the ascetic life of renunciation.',
    subsubjects: [
      {
        slug: 'worship-ritual',
        name: 'Worship, Ritual & Festivals',
        patterns: [
          'puja', 'worship', 'ritual', 'ceremony', 'festival', 'paryushan', 'mantra', 'aarti',
          'arti', 'consecration', 'pratishtha', 'vidhi', 'observance', 'diwali', 'mahavir jayanti',
        ],
      },
      {
        slug: 'meditation-yoga',
        name: 'Meditation & Yoga',
        patterns: ['meditat', 'dhyana', 'yoga', 'samayika', 'preksha', 'contemplat', 'mindful', 'kayotsarga'],
      },
      {
        slug: 'asceticism-renunciation',
        name: 'Asceticism & Renunciation',
        patterns: [
          'ascetic', 'asceticism', 'monk', 'muni', 'sadhu', 'sadhvi', 'nun', 'mendicant',
          'sallekhana', 'santhara', 'renunciat', 'fasting', 'tapas', 'austerit', 'diksha', 'initiation',
        ],
      },
      {
        slug: 'cosmology-metaphysical-worlds',
        name: 'Cosmology & Worlds',
        patterns: ['cosmolog', 'cosmograph', 'loka', 'universe', 'naraka', 'hell', 'heaven', 'cycle of time', 'kalachakra'],
      },
    ],
  },
  {
    slug: 'manuscripts-texts',
    name: 'Manuscripts & Textual Studies',
    description:
      'Manuscript collections and catalogues, and the critical editing of texts.',
    subsubjects: [
      {
        slug: 'manuscripts-catalogues',
        name: 'Manuscripts & Catalogues',
        patterns: [
          'manuscript', 'palm-leaf', 'palm leaf', 'codex', 'bhandar', 'bhandara', 'catalogue',
          'catalog', 'collection', 'colophon', 'scriptorium', 'archive',
        ],
      },
      {
        slug: 'editions-criticism',
        name: 'Editions & Textual Criticism',
        patterns: ['critical edition', 'edition', 'textual', 'recension', 'variant reading', 'emendation', 'philological'],
      },
    ],
  },
  {
    slug: 'comparative-religion',
    name: 'Comparative & Interreligious Studies',
    description:
      'Buddhism, Hinduism and Vedanta, and dialogue across the religious traditions of India.',
    subsubjects: [
      {
        slug: 'buddhism',
        name: 'Buddhism',
        patterns: ['buddhis', 'buddha', 'bodhi', 'bodhisattva', 'theravada', 'mahayana', 'nirvana '],
      },
      {
        slug: 'hinduism-vedanta',
        name: 'Hinduism & Vedanta',
        patterns: [
          'hindu', 'vedanta', 'vedic', 'upanishad', 'brahmin', 'brahman', 'bhagavad', 'gita',
          'vaishnav', 'shaiv', 'saiva', 'purana ', 'ramayana', 'mahabharata',
        ],
      },
      {
        slug: 'comparative-interreligious',
        name: 'Comparative & Interreligious',
        patterns: ['comparative', 'interreligious', 'inter-religious', 'dialogue', 'christian', 'islam', 'sufi', 'sikh'],
      },
    ],
  },
  {
    slug: 'society-culture',
    name: 'Society, Culture & Modern Issues',
    description:
      'Ecology and ethics, education and institutions, trade, and the contemporary diaspora.',
    subsubjects: [
      {
        slug: 'environment-ecology',
        name: 'Environment & Ecology',
        patterns: ['environment', 'ecolog', 'nature', 'vegetarian', 'veganism', 'animal', 'climate', 'sustainab'],
      },
      {
        slug: 'education-institutions',
        name: 'Education & Institutions',
        patterns: ['education', 'school', 'pathshala', 'university', 'institution', 'academ', 'pedagog', 'teaching of'],
      },
      {
        slug: 'trade-economy',
        name: 'Trade & Economy',
        patterns: ['trade', 'merchant', 'economy', 'economic', 'commerce', 'guild', 'business', 'banking', 'wealth'],
      },
      {
        slug: 'diaspora-contemporary',
        name: 'Diaspora & Contemporary',
        patterns: ['diaspora', 'global', 'contemporary', 'modern jain', 'america', 'western', 'overseas', 'nri'],
      },
    ],
  },
];

/** Flat helper: [{ subjectSlug, subsubject }] in priority order. */
export function flatSubsubjects(): { subjectSlug: string; sub: SubSubject; priority: number }[] {
  const out: { subjectSlug: string; sub: SubSubject; priority: number }[] = [];
  let priority = 0;
  for (const subject of SUBJECTS) {
    for (const sub of subject.subsubjects) {
      out.push({ subjectSlug: subject.slug, sub, priority: (priority += 1) });
    }
  }
  return out;
}

export function subjectBySlug(slug: string): Subject | undefined {
  return SUBJECTS.find((s) => s.slug === slug);
}
