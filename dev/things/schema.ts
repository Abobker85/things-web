import fs from 'fs';
import path from 'path';

const THINGS_TL_PATH = path.resolve(import.meta.dirname, '../../src/things/tl/things.tl');
const FUNCTIONS_MARKER = '---functions---';
const TYPES_MARKER = '---types---';
const DECLARATION_RE = /^([\w.]+)#([0-9a-f]+)\s/;

export type ThingsDeclaration = {
  name: string;
  constructorId: number;
  isFunction: boolean;
};

export function readThingsTl() {
  return fs.readFileSync(THINGS_TL_PATH, 'utf-8').replace(/\r/g, '');
}

// Upstream's schema ends inside its functions section, so the Things types need their own marker
export function appendThingsSchema(apiTl: string) {
  return `${apiTl}\n${TYPES_MARKER}\n${readThingsTl()}\n`;
}

export function listThingsDeclarations(thingsTl = readThingsTl()) {
  const declarations: ThingsDeclaration[] = [];
  let isFunction = false;

  for (const line of thingsTl.split('\n')) {
    if (line.startsWith(FUNCTIONS_MARKER)) {
      isFunction = true;
      continue;
    }

    const match = line.match(DECLARATION_RE);
    if (!match) continue;

    declarations.push({
      name: match[1],
      constructorId: Number.parseInt(match[2], 16),
      isFunction,
    });
  }

  return declarations;
}

export function listThingsMethods() {
  return listThingsDeclarations().filter(({ isFunction }) => isFunction).map(({ name }) => name);
}
