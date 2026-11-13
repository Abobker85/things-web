# Things texts

`en.strings` and `ar.strings` hold Things' own texts. They come before the server's language pack and upstream's fallback, so a key that upstream also has (for example `LoginQRTitle`) is replaced by the wording here.

- One `"Key" = "Value";` per line, with no comments and no blank lines: the reader skips a line that follows either.
- Every key in `en.strings` needs the same key in `ar.strings` (a test checks this).
- New keys start with `Things`. After adding one, run `npm run lang:ts` so it is typed.
