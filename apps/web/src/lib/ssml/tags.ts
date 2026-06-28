/**
 * SSML tag registry with provider compatibility matrix.
 *
 * Each tag definition includes attributes, provider support, and metadata
 * used by the toolbar and validator.
 */

export type SsmlAttrDef = {
  name: string;
  label: string;
  type: 'select' | 'text' | 'number' | 'duration';
  options?: { value: string; label: string }[];
  default?: string;
  placeholder?: string;
  required?: boolean;
};

export type SsmlTagDef = {
  tag: string;
  label: string;
  description: string;
  category: 'flow' | 'prosody' | 'pronunciation' | 'identity';
  selfClosing: boolean;
  attributes: SsmlAttrDef[];
  /** providerId → supported. Only SSML-capable providers listed. */
  providers: Record<string, boolean>;
};

/** All four SSML-capable provider families in the catalog. */
const SSML_PROVIDERS = ['aws-polly', 'azure-speech', 'gcp-tts', 'edge-tts'] as const;

function providerFlags(
  awsPolly: boolean,
  azure: boolean,
  gcp: boolean,
  edge: boolean
): Record<string, boolean> {
  return {
    'aws-polly': awsPolly,
    'azure-speech': azure,
    'gcp-tts': gcp,
    'edge-tts': edge,
  };
}

export const SSML_TAGS: SsmlTagDef[] = [
  {
    tag: 'break',
    label: 'Break',
    description: 'Insert a pause between words.',
    category: 'flow',
    selfClosing: true,
    attributes: [
      {
        name: 'time',
        label: 'Duration',
        type: 'duration',
        default: '500ms',
        placeholder: 'e.g. 500ms, 1s',
      },
      {
        name: 'strength',
        label: 'Strength',
        type: 'select',
        options: [
          { value: '', label: '(use time)' },
          { value: 'none', label: 'None' },
          { value: 'x-weak', label: 'Extra weak' },
          { value: 'weak', label: 'Weak' },
          { value: 'medium', label: 'Medium' },
          { value: 'strong', label: 'Strong' },
          { value: 'x-strong', label: 'Extra strong' },
        ],
      },
    ],
    providers: providerFlags(true, true, true, true),
  },
  {
    tag: 'emphasis',
    label: 'Emphasis',
    description: 'Emphasize the wrapped text.',
    category: 'prosody',
    selfClosing: false,
    attributes: [
      {
        name: 'level',
        label: 'Level',
        type: 'select',
        default: 'moderate',
        options: [
          { value: 'strong', label: 'Strong' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'reduced', label: 'Reduced' },
          { value: 'none', label: 'None' },
        ],
      },
    ],
    providers: providerFlags(true, true, true, true),
  },
  {
    tag: 'prosody',
    label: 'Prosody',
    description: 'Control rate, pitch, and volume.',
    category: 'prosody',
    selfClosing: false,
    attributes: [
      {
        name: 'rate',
        label: 'Rate',
        type: 'select',
        options: [
          { value: '', label: '(default)' },
          { value: 'x-slow', label: 'Extra slow' },
          { value: 'slow', label: 'Slow' },
          { value: 'medium', label: 'Medium' },
          { value: 'fast', label: 'Fast' },
          { value: 'x-fast', label: 'Extra fast' },
        ],
      },
      {
        name: 'pitch',
        label: 'Pitch',
        type: 'select',
        options: [
          { value: '', label: '(default)' },
          { value: 'x-low', label: 'Extra low' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'x-high', label: 'Extra high' },
        ],
      },
      {
        name: 'volume',
        label: 'Volume',
        type: 'select',
        options: [
          { value: '', label: '(default)' },
          { value: 'silent', label: 'Silent' },
          { value: 'x-soft', label: 'Extra soft' },
          { value: 'soft', label: 'Soft' },
          { value: 'medium', label: 'Medium' },
          { value: 'loud', label: 'Loud' },
          { value: 'x-loud', label: 'Extra loud' },
        ],
      },
    ],
    providers: providerFlags(true, true, true, true),
  },
  {
    tag: 'say-as',
    label: 'Say-as',
    description: 'Control how text is interpreted (number, date, etc.).',
    category: 'pronunciation',
    selfClosing: false,
    attributes: [
      {
        name: 'interpret-as',
        label: 'Interpret as',
        type: 'select',
        required: true,
        default: 'cardinal',
        options: [
          { value: 'cardinal', label: 'Cardinal number' },
          { value: 'ordinal', label: 'Ordinal number' },
          { value: 'characters', label: 'Characters / Spell out' },
          { value: 'date', label: 'Date' },
          { value: 'telephone', label: 'Telephone number' },
          { value: 'time', label: 'Time' },
          { value: 'address', label: 'Address' },
          { value: 'fraction', label: 'Fraction' },
          { value: 'unit', label: 'Unit' },
        ],
      },
      {
        name: 'format',
        label: 'Format',
        type: 'text',
        placeholder: 'e.g. mdy, dmy (for dates)',
      },
    ],
    providers: providerFlags(true, true, true, true),
  },
  {
    tag: 'phoneme',
    label: 'Phoneme',
    description: 'Specify exact pronunciation using phonetic alphabet.',
    category: 'pronunciation',
    selfClosing: false,
    attributes: [
      {
        name: 'alphabet',
        label: 'Alphabet',
        type: 'select',
        required: true,
        default: 'ipa',
        options: [
          { value: 'ipa', label: 'IPA' },
          { value: 'x-sampa', label: 'X-SAMPA' },
        ],
      },
      {
        name: 'ph',
        label: 'Phonemes',
        type: 'text',
        required: true,
        placeholder: 'e.g. təˈmeɪ.toʊ',
      },
    ],
    providers: providerFlags(true, true, true, false),
  },
  {
    tag: 'sub',
    label: 'Sub',
    description: 'Substitute spoken text with an alias.',
    category: 'pronunciation',
    selfClosing: false,
    attributes: [
      {
        name: 'alias',
        label: 'Alias',
        type: 'text',
        required: true,
        placeholder: 'Spoken replacement text',
      },
    ],
    providers: providerFlags(true, true, true, true),
  },
  {
    tag: 'lang',
    label: 'Lang',
    description: 'Switch language for a section of text.',
    category: 'identity',
    selfClosing: false,
    attributes: [
      {
        name: 'xml:lang',
        label: 'Language',
        type: 'text',
        required: true,
        default: 'en-US',
        placeholder: 'e.g. en-US, fr-FR, de-DE',
      },
    ],
    providers: providerFlags(true, true, false, true),
  },
];

/** Look up a tag definition by tag name. */
export function getTagDef(tagName: string): SsmlTagDef | undefined {
  return SSML_TAGS.find((t) => t.tag.toLowerCase() === tagName.toLowerCase());
}

/** Return only tags supported by the given provider. */
export function getTagsForProvider(providerId: string): SsmlTagDef[] {
  return SSML_TAGS.filter((t) => t.providers[providerId] === true);
}

/** Check if a specific tag is supported by a provider. */
export function isTagSupportedByProvider(tagName: string, providerId: string): boolean {
  const def = getTagDef(tagName);
  return def?.providers[providerId] === true;
}

/** All provider IDs that support SSML. */
export const SSML_PROVIDER_IDS = SSML_PROVIDERS as readonly string[];
