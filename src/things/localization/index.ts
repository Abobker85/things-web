import type { LangPackStringValuePlural } from '../../api/types';
import type { LangKey } from '../../types/language';

import { buildFallbackStrings } from '../../util/data/readFallbackStrings';
import arStrings from './ar.strings?raw';
import enStrings from './en.strings?raw';

// The files here never mark a text as deleted, which a server language pack can
type ThingsStringValue = string | LangPackStringValuePlural;

const DEFAULT_LANG_CODE = 'en';

const STRINGS_BY_LANG_CODE: Record<string, Record<string, ThingsStringValue>> = {
  en: readThingsStrings(enStrings),
  ar: readThingsStrings(arStrings),
};

export const THINGS_LANG_CODES = Object.keys(STRINGS_BY_LANG_CODE);

/**
 * Returns Things' own text for a key, in the given language when Things has it and in English otherwise.
 * `isFallback` tells the caller that the text is English although another language was asked for.
 */
export function getThingsString(langCode: string | undefined, langKey: LangKey): {
  value: ThingsStringValue;
  isFallback: boolean;
} | undefined {
  const ownValue = langCode ? STRINGS_BY_LANG_CODE[langCode]?.[langKey] : undefined;
  if (ownValue !== undefined) {
    return { value: ownValue, isFallback: false };
  }

  const defaultValue = STRINGS_BY_LANG_CODE[DEFAULT_LANG_CODE][langKey];
  if (defaultValue === undefined) return undefined;

  return { value: defaultValue, isFallback: langCode !== DEFAULT_LANG_CODE };
}

function readThingsStrings(fileData: string) {
  return buildFallbackStrings(fileData).langPack.strings as Record<string, ThingsStringValue>;
}
