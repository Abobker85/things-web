import { describe, expect, it } from 'vitest';

import readStrings from '../../util/data/readStrings';
import arStrings from './ar.strings?raw';
import enStrings from './en.strings?raw';
import { getThingsString, THINGS_LANG_CODES } from '.';

const VARIABLE_RE = /\{\w+\}/g;

function extractVariables(text: string) {
  return (text.match(VARIABLE_RE) || []).sort();
}

describe('Things texts', () => {
  const en = readStrings(enStrings);
  const ar = readStrings(arStrings);

  it('reads every line of both files', () => {
    expect(Object.keys(en)).toHaveLength(enStrings.trim().split('\n').length);
    expect(Object.keys(ar)).toHaveLength(arStrings.trim().split('\n').length);
  });

  it('has the same keys and variables in English and Arabic', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());

    for (const key of Object.keys(en)) {
      expect(extractVariables(ar[key]), key).toEqual(extractVariables(en[key]));
    }
  });

  it('answers in the asked language, and in English for a language Things has no texts in', () => {
    expect(THINGS_LANG_CODES).toEqual(['en', 'ar']);
    expect(getThingsString('ar', 'ThingsAuthEmailPlaceholder')).toEqual({
      value: ar.ThingsAuthEmailPlaceholder, isFallback: false,
    });
    expect(getThingsString('en', 'ThingsAuthEmailPlaceholder')).toEqual({ value: 'Email', isFallback: false });
    expect(getThingsString('fr', 'ThingsAuthEmailPlaceholder')).toEqual({ value: 'Email', isFallback: true });
    expect(getThingsString(undefined, 'ThingsAuthEmailPlaceholder')).toEqual({ value: 'Email', isFallback: true });
  });

  it('leaves keys it does not have to upstream', () => {
    expect(getThingsString('en', 'Next')).toBeUndefined();
  });
});
