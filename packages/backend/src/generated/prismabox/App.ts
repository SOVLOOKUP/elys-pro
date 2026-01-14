import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const AppPlain = t.Object(
  {
    id: t.String(),
    name: t.String(),
    version: t.String(),
    path: t.String(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    storeId: t.String(),
  },
  { additionalProperties: false }
);

export const AppRelations = t.Object(
  {
    store: t.Object(
      {
        id: t.String(),
        name: t.String(),
        schema: t.String(),
        config: t.Any(),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

export const AppPlainInputCreate = t.Object(
  { name: t.String(), version: t.String(), path: t.String() },
  { additionalProperties: false }
);

export const AppPlainInputUpdate = t.Object(
  {
    name: t.Optional(t.String()),
    version: t.Optional(t.String()),
    path: t.Optional(t.String()),
  },
  { additionalProperties: false }
);

export const AppRelationsInputCreate = t.Object(
  {
    store: t.Object(
      {
        connect: t.Object(
          {
            id: t.String({ additionalProperties: false }),
          },
          { additionalProperties: false }
        ),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

export const AppRelationsInputUpdate = t.Partial(
  t.Object(
    {
      store: t.Object(
        {
          connect: t.Object(
            {
              id: t.String({ additionalProperties: false }),
            },
            { additionalProperties: false }
          ),
        },
        { additionalProperties: false }
      ),
    },
    { additionalProperties: false }
  )
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
          path: t.String(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
          storeId: t.String(),
        },
        { additionalProperties: false }
      ),
    { $id: "App" }
  )
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
                { additionalProperties: false }
              ),
            },
            { additionalProperties: false }
          ),
          { additionalProperties: false }
        ),
        t.Union(
          [
            t.Object({ id: t.String() }),
            t.Object({ name: t.String() }),
            t.Object({
              name_version: t.Object(
                { name: t.String(), version: t.String() },
                { additionalProperties: false }
              ),
            }),
          ],
          { additionalProperties: false }
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
          { additionalProperties: false }
        ),
        t.Partial(
          t.Object(
            {
              id: t.String(),
              name: t.String(),
              version: t.String(),
              path: t.String(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
              storeId: t.String(),
            },
            { additionalProperties: false }
          )
        ),
      ],
      { additionalProperties: false }
    ),
  { $id: "App" }
);

export const AppSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      name: t.Boolean(),
      version: t.Boolean(),
      path: t.Boolean(),
      createdAt: t.Boolean(),
      updatedAt: t.Boolean(),
      storeId: t.Boolean(),
      store: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false }
  )
);

export const AppInclude = t.Partial(
  t.Object(
    { store: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false }
  )
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
      path: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      createdAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      updatedAt: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      storeId: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
    },
    { additionalProperties: false }
  )
);

export const App = t.Composite([AppPlain, AppRelations], {
  additionalProperties: false,
});

export const AppInputCreate = t.Composite(
  [AppPlainInputCreate, AppRelationsInputCreate],
  { additionalProperties: false }
);

export const AppInputUpdate = t.Composite(
  [AppPlainInputUpdate, AppRelationsInputUpdate],
  { additionalProperties: false }
);
