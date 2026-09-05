# Interface copy

The site publishes two locales, English by default (REQ-140). Every string a
reader sees in the chrome — a label, a hint, an empty state, a pager — exists
in both, and one gate holds the two sides together. This page says where the
copy lives, what the gate checks, and how a directory of inline French moves
across.

## Where copy lives

One file per surface under `src/lib/i18n/copy/`: `footer.ts`, `quiz.ts`,
`patronymes.ts`, `hubs.ts`, `trail.ts` and so on. Each is written the same
way:

```ts
const en = { pageTitle: "Names", … };
type NamesCopy = typeof en;
const fr: NamesCopy = { pageTitle: "Noms", … };
export const namesCopy: Record<Language, NamesCopy> = { en, fr };
```

English first, because the type is read off it: a key present in `en` and
missing from `fr` fails to compile, and so does a key `fr` invents. No
`as const`, so the two sides may differ in every value while matching in
every key.

`src/lib/translations.ts` is a façade that composes the modules into the
`getTranslation(lang)` shape the older importers read. A budgeted client
island — the quiz play island, held under 15 KB gzipped — imports its own
module (`quizCopy`) instead of the façade, so its bundle carries one surface
and not fourteen.

Every module is listed once in `COPY_MODULES` (`src/lib/i18n/copy/index.ts`).
That list is what the parity suite walks; a module that is not on it is not
checked.

Locale-dependent formatting is not copy and has its own helpers in
`src/lib/languageTag.ts`: `localeTag`, `formatNumber`, `formatDate`,
`displayCountryName`. A component never spells `"fr-FR"` itself. It formats
in the locale it was handed (`language` prop, route params) or, deep in a
tree where no caller has it, in the route's locale through
`useRouteLanguage()`.

## The parity suite

`src/lib/i18n/__tests__/copyParity.test.ts` (REQ-145) asserts, for every
registered module:

- identical nested key sets across locales;
- no empty string on either side;
- no French value above three words byte-identical to the English one,
  unless the path is on the allow-list in the test (brand strings);
- and that the façade hands each module to each locale unchanged.

## The copy-literal guard

`npm run check:copy-literals` (`scripts/ci/checkCopyLiterals.ts`) fails on a
string literal, template part or JSX text carrying a French accented
character in a changed `.ts`/`.tsx` file under `src/`. It reads the syntax
tree, so comments are free to quote the label they explain.

It is diff-scoped like `lint:req`: `--staged` in the pre-commit hook, `--base
<ref>` in CI, and only the literals the change _adds_ are reported — a
literal already present in the previous version of the file is
grandfathered. A bare run or `--all` surveys the tree and exits 0; that
output is the backlog.

Exempt, in one exported list in the script: the dictionaries themselves,
tests, stories, fixtures, `src/test/`, the code-authored prose banks
(`lib/home`, `lib/dossiers`, `lib/legal-pages*`, `lib/games`,
`lib/glossaire`, `lib/doctrine`, `lib/email`) and the generated atlas assets.

## Migrating one directory

Each wave takes one directory of `src/components` or `src/app/[lang]`, and
nothing outside it but the registry line.

1. Add `src/lib/i18n/copy/<surface>.ts` with the directory's strings on the
   `fr` side and their British-English counterparts on `en`; register it in
   `COPY_MODULES`, and in the façade if older importers should reach it.
2. Replace each inline literal with a read from the module. A server
   component reads `<surface>Copy[language]` from the `language` it already
   receives; a client component takes `language` as a prop where a caller has
   it, and `useRouteLanguage()` where none does.
3. Replace `new Intl.NumberFormat("fr-FR")` and its siblings with the
   `languageTag` helpers.
4. In the directory's tests, put the component on a route before asserting
   its copy: `src/test/mockRouteLanguage.ts` documents the two lines.
5. Run `npm run check:copy-literals -- --base origin/recette`: the directory
   should report nothing, and the survey count should drop by what it held.
