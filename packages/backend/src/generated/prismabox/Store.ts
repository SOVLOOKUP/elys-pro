import { t } from "elysia";

import { __transformDate__ } from "./__transformDate__";

import { __nullable__ } from "./__nullable__";

export const StorePlain = t.Object(
  {
    id: t.String(),
    name: t.String(),
    schema: t.String(),
    config: t.Any(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  },
  { additionalProperties: false },
);

export const StoreRelations = t.Object(
  {
    apps: t.Array(
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
        { additionalProperties: false },
      ),
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const StorePlainInputCreate = t.Object(
  { name: t.String(), schema: t.String(), config: t.Any() },
  { additionalProperties: false },
);

export const StorePlainInputUpdate = t.Object(
  {
    name: t.Optional(t.String()),
    schema: t.Optional(t.String()),
    config: t.Optional(t.Any()),
  },
  { additionalProperties: false },
);

export const StoreRelationsInputCreate = t.Object(
  {
    apps: t.Optional(
      t.Object(
        {
          connect: t.Array(
            t.Object(
              {
                id: t.String({ additionalProperties: false }),
              },
              { additionalProperties: false },
            ),
            { additionalProperties: false },
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const StoreRelationsInputUpdate = t.Partial(
  t.Object(
    {
      apps: t.Partial(
        t.Object(
          {
            connect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
            disconnect: t.Array(
              t.Object(
                {
                  id: t.String({ additionalProperties: false }),
                },
                { additionalProperties: false },
              ),
              { additionalProperties: false },
            ),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
);

export const StoreWhere = t.Partial(
  t.Recursive(
    (Self) =>
      t.Object(
        {
          AND: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          NOT: t.Union([Self, t.Array(Self, { additionalProperties: false })]),
          OR: t.Array(Self, { additionalProperties: false }),
          id: t.String(),
          name: t.String(),
          schema: t.String(),
          config: t.Any(),
          createdAt: t.Date(),
          updatedAt: t.Date(),
        },
        { additionalProperties: false },
      ),
    { $id: "Store" },
  ),
);

export const StoreWhereUnique = t.Recursive(
  (Self) =>
    t.Intersect(
      [
        t.Partial(
          t.Object(
            { id: t.String(), name: t.String() },
            { additionalProperties: false },
          ),
          { additionalProperties: false },
        ),
        t.Union(
          [t.Object({ id: t.String() }), t.Object({ name: t.String() })],
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
              schema: t.String(),
              config: t.Any(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            },
            { additionalProperties: false },
          ),
        ),
      ],
      { additionalProperties: false },
    ),
  { $id: "Store" },
);

export const StoreSelect = t.Partial(
  t.Object(
    {
      id: t.Boolean(),
      name: t.Boolean(),
      schema: t.Boolean(),
      config: t.Boolean(),
      createdAt: t.Boolean(),
      updatedAt: t.Boolean(),
      apps: t.Boolean(),
      _count: t.Boolean(),
    },
    { additionalProperties: false },
  ),
);

export const StoreInclude = t.Partial(
  t.Object(
    { apps: t.Boolean(), _count: t.Boolean() },
    { additionalProperties: false },
  ),
);

export const StoreOrderBy = t.Partial(
  t.Object(
    {
      id: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      name: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      schema: t.Union([t.Literal("asc"), t.Literal("desc")], {
        additionalProperties: false,
      }),
      config: t.Union([t.Literal("asc"), t.Literal("desc")], {
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

export const Store = t.Composite([StorePlain, StoreRelations], {
  additionalProperties: false,
});

export const StoreInputCreate = t.Composite(
  [StorePlainInputCreate, StoreRelationsInputCreate],
  { additionalProperties: false },
);

export const StoreInputUpdate = t.Composite(
  [StorePlainInputUpdate, StoreRelationsInputUpdate],
  { additionalProperties: false },
);
