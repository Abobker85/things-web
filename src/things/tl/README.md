# Things schema

`things.tl` is the Things additions to the API at layer 232: every Things type, method and update, each with its constructor id.

It is a copy, unchanged, of `docs/v4/contract/v4-schema-ids.tl` in the Things backend repository, taken at commit `032f833` (2026-11-12). That file is the source of truth: never edit the copy here. To update it, copy the newer file over this one, note its commit above, and run `npm run gramjs:tl`.

`npm run gramjs:tl` appends this file to upstream's schema when it generates the MTProto layer, and keeps every Things method (upstream methods are kept only when listed in `src/lib/gramjs/tl/static/api.json`).
