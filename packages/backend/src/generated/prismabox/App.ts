import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const AppPlain = t.Object(
  {
    id: t.String(),
    name: t.String(),
    version: t.String(),
    url: t.String(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  },
  { additionalProperties: false },
);

export const AppRelations = t.Object({}, { additionalProperties: false });

export const AppPlainInputCreate = t.Object(
  { name: t.String(), version: t.String(), url: t.String() },
  { additionalProperties: false },
);

export const AppPlainInputUpdate = t.Object(
  {
    name: t.Optional(t.String()),
    version: t.Optional(t.String()),
    url: t.Optional(t.String()),
  },
  { additionalProperties: false },
);

export const AppRelationsInputCreate = t.Object(
  {},
  { additionalProperties: false },
);

export const AppRelationsInputUpdate = t.Partial(
  t.Object({}, { additionalProperties: false }),
);

export const AppWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          name: t.String(),
          version: t.String(),
          url: t.String(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "App" },
  ),
);

export const AppWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            {
              id: t.String(),
              name: t.String(),
              name_version: t.Object(
                { name: t.String(), version: t.String() },
                { additionalProperties: false },
              ),
            },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union(
          [
            t.Object({ id: t.String() }),
            t.Object({ name: t.String() }),
            t.Object({
              name_version: t.Object(
                { name: t.String(), version: t.String() },
                { additionalProperties: false },
              ),
            }),
          ],
          { additionalProperties: false },
        ),
        t.Partial(
          t.Object({
            AND: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            NOT: t.Union([
              Self,
              t.Array(Self, { additionalProperties: false }),
            ]),
            OR: t.Array(Self, { additionalProperties: false }),
          }),
          { additionalProperties: false },
        ),
        t.Partial(
          t.Object(
            {
              id: t.String(),
              name: t.String(),
              version: t.String(),
              url: t.String(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "App" },
);

export const AppSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      name: t.Boolean(),
      version: t.Boolean(),
      url: t.Boolean(),
      createdAt: t.Boolean(),
      updatedAt: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const AppInclude = t.Partial(
  t.Object({ _count: t.Boolean() }, { additionalProperties: false }),
);

export const AppOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      name: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      version: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      url: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      updatedAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false },
  ),
);

export const App = t.Composite([AppPlain, AppRelations], {
  additionalProperties: false,
});

export const AppInputCreate = t.Composite(
  [AppPlainInputCreate, AppRelationsInputCreate],
  { additionalProperties: false },
);

export const AppInputUpdate = t.Composite(
  [AppPlainInputUpdate, AppRelationsInputUpdate],
  { additionalProperties: false },
);
