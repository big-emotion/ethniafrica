"use strict";

/**
 * ESLint rule: no-bare-people-name (UX-DR49 #1 — decolonial posture)
 *
 * A people's or language's name must never reach the page on its own: it has
 * to go through `AutonymExonymHeading`, which pairs the autonym with its
 * exonyms and carries the `lang` attribute that gives endonym primacy.
 *
 * The rule fires on *data bindings* — a JSX child expression reading a field
 * known to hold such a name — rather than on prose. An earlier version treated
 * "any capitalised word in JSX text" as a name; on this codebase that produced
 * 43 errors, every one of them a French UI label ("Retour", "Sources",
 * "Spiritualité"), and not a single real violation.
 *
 * Hardcoded literals (`<div>Yoruba</div>`) are deliberately out of scope:
 * telling a people name from an ordinary capitalised word statically would
 * require matching against the AFRIK name corpus, and names belong in the
 * dataset rather than in components in the first place.
 */

// Fields that hold a people/language name, drawn from the shapes the people
// and country pages actually render: PeopleHeroData (peopleDataTransformer.ts)
// and the two AutonymExonymHeading prop sets.
const NAME_BEARING_FIELDS = new Set([
  "nameMain",
  "selfAppellation",
  "autonym",
  "autonyme",
  "endonym",
  "endonyme",
  "exonym",
  "exonyms",
  "exonyme",
  "exonymes",
  "alternateNames",
  "peopleName",
  "languageName",
]);

// Array methods whose callback parameter inherits the collection's meaning,
// so `exonyms.map((exo) => <span>{exo}</span>)` is caught through `exo`.
const ITERATION_METHODS = new Set(["map", "flatMap", "forEach"]);

/**
 * Name of the people/language field this expression reads, or null.
 *
 * `data.exonyms[0]` resolves through the computed access to `exonyms`: the
 * element of a name collection is itself a name. `data.exonyms.length` does
 * not — `length` is the final property and it is a count.
 */
function nameBearingField(node) {
  if (!node) return null;

  if (node.type === "Identifier") {
    return NAME_BEARING_FIELDS.has(node.name) ? node.name : null;
  }

  if (node.type === "MemberExpression") {
    if (node.computed) return nameBearingField(node.object);
    return node.property.type === "Identifier" &&
      NAME_BEARING_FIELDS.has(node.property.name)
      ? node.property.name
      : null;
  }

  return null;
}

function findVariable(scope, name) {
  for (let current = scope; current; current = current.upper) {
    const variable = current.variables.find((v) => v.name === name);
    if (variable) return variable;
  }
  return null;
}

/**
 * Field name when `node` is the callback parameter of an iteration over a
 * name-bearing collection, or null.
 */
function iteratedCollectionField(node, scope) {
  if (node.type !== "Identifier") return null;

  const variable = findVariable(scope, node.name);
  if (!variable) return null;

  for (const def of variable.defs) {
    if (def.type !== "Parameter") continue;

    const call = def.node.parent;
    if (!call || call.type !== "CallExpression") continue;

    const callee = call.callee;
    if (callee.type !== "MemberExpression" || callee.computed) continue;
    if (
      callee.property.type !== "Identifier" ||
      !ITERATION_METHODS.has(callee.property.name)
    ) {
      continue;
    }

    const field = nameBearingField(callee.object);
    if (field) return field;
  }

  return null;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow rendering people/language name bindings outside AutonymExonymHeading",
      category: "Decolonial Posture",
      recommended: false,
    },
    schema: [],
    messages: {
      noBarePeopleName:
        "People/language name '{{name}}' must be rendered through <AutonymExonymHeading> so the autonym keeps its exonyms and lang attribute (UX-DR49).",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    function isInsideAutonymExonymHeading(node) {
      for (let current = node.parent; current; current = current.parent) {
        if (
          current.type === "JSXElement" &&
          current.openingElement.name.type === "JSXIdentifier" &&
          current.openingElement.name.name === "AutonymExonymHeading"
        ) {
          return true;
        }
      }
      return false;
    }

    return {
      JSXExpressionContainer(node) {
        // Only rendered positions. An expression container in an attribute is
        // passing a value along (`<Chip label={x} />`), not painting a name.
        const parentType = node.parent.type;
        if (parentType !== "JSXElement" && parentType !== "JSXFragment") return;

        if (isInsideAutonymExonymHeading(node)) return;

        const name =
          nameBearingField(node.expression) ??
          iteratedCollectionField(
            node.expression,
            sourceCode.getScope(node.expression)
          );
        if (!name) return;

        context.report({
          node: node.expression,
          messageId: "noBarePeopleName",
          data: { name },
        });
      },
    };
  },
};
