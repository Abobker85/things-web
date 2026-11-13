import { describe, expect, it } from 'vitest';
import { BinaryReader } from '../../lib/gramjs/extensions';
import { Api } from '../../lib/gramjs/tl';
import { tlobjects } from '../../lib/gramjs/tl/AllTLObjects';

import { listThingsDeclarations } from '../../../dev/things/schema';

const DECLARATIONS = listThingsDeclarations();
// A floor that catches a truncated copy of the contract file
const MIN_DECLARATIONS = 200;

function buildClassName(name: string) {
  const [namespace, localName] = name.includes('.') ? name.split('.') : [undefined, name];
  const className = `${localName[0].toUpperCase()}${localName.slice(1)}`;

  return namespace ? `${namespace}.${className}` : className;
}

describe('Things schema', () => {
  it('reads every declaration of the contract file', () => {
    expect(DECLARATIONS.length).toBeGreaterThan(MIN_DECLARATIONS);
    expect(DECLARATIONS.some(({ isFunction }) => isFunction)).toBe(true);
    expect(new Set(DECLARATIONS.map(({ constructorId }) => constructorId)).size).toBe(DECLARATIONS.length);
  });

  it.each(DECLARATIONS)('generates $name with the id of the contract', ({ name, constructorId, isFunction }) => {
    const generated = tlobjects[constructorId];

    expect(generated, `no generated class has the id of ${name}`).toBeDefined();
    expect(generated.className).toBe(buildClassName(name));
    expect(generated.classType).toBe(isFunction ? 'request' : 'constructor');
  });

  it('has the wrapper that carries story extras', () => {
    expect(Api.InvokeWithStoryExtra.classType).toBe('request');
  });

  it('decodes a batch of updates that carries Things updates', () => {
    const updates = new Api.Updates({
      updates: [
        new Api.UpdateFeedPost({ tabIds: [1, 2], post: new Api.PostDeleted({ id: 7n }) }),
        new Api.UpdateFeedForYouBatch(),
        new Api.UpdateUserTyping({ userId: 5n, action: new Api.SendMessageTypingAction() }),
      ],
      users: [],
      chats: [],
      date: 1,
      seq: 0,
    });

    const decoded = new BinaryReader(updates.getBytes()).tgReadObject();

    expect(decoded).toBeInstanceOf(Api.Updates);
    expect(decoded.updates).toHaveLength(3);
    expect(decoded.updates[0]).toBeInstanceOf(Api.UpdateFeedPost);
    expect(decoded.updates[0].tabIds).toEqual([1, 2]);
    expect(decoded.updates[0].post.id).toBe(7n);
    expect(decoded.updates[1]).toBeInstanceOf(Api.UpdateFeedForYouBatch);
    expect(decoded.updates[2]).toBeInstanceOf(Api.UpdateUserTyping);
  });
});
