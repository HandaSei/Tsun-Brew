import { z } from 'zod';
import { 
  insertUserSchema, 
  insertTeaSchema, 
  insertTeaLogSchema, 
  insertGuideSchema, 
  insertReviewSchema,
  users, teas, teaLogs, brewingGuides, reviews 
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>().nullable(),
      },
    },
  },
  teas: {
    list: {
      method: 'GET' as const,
      path: '/api/teas',
      responses: {
        200: z.array(z.custom<typeof teas.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/teas/:id',
      responses: {
        200: z.custom<typeof teas.$inferSelect & { attributes: any[] }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/teas/:id',
      input: insertTeaSchema.partial().extend({
        attributes: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
      }),
      responses: {
        200: z.custom<typeof teas.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/teas',
      input: insertTeaSchema.extend({
        attributes: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
      }),
      responses: {
        201: z.custom<typeof teas.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  logs: {
    list: {
      method: 'GET' as const,
      path: '/api/logs',
      responses: {
        200: z.array(z.custom<typeof teaLogs.$inferSelect & { tea: typeof teas.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'POST' as const, // Upsert (Add to list or update)
      path: '/api/logs',
      input: insertTeaLogSchema.extend({
        incrementBrew: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof teaLogs.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  guides: {
    create: {
      method: 'POST' as const,
      path: '/api/guides',
      input: insertGuideSchema,
      responses: {
        201: z.custom<typeof brewingGuides.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/teas/:teaId/guides',
      responses: {
        200: z.array(z.custom<typeof brewingGuides.$inferSelect & { author: { username: string } }>()),
      },
    },
  },
  reviews: {
    create: {
      method: 'POST' as const,
      path: '/api/reviews',
      input: insertReviewSchema,
      responses: {
        201: z.custom<typeof reviews.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/teas/:teaId/reviews',
      responses: {
        200: z.array(z.custom<typeof reviews.$inferSelect & { user: { username: string } }>()),
      },
    },
  },
  admin: {
    getUsers: {
      method: 'GET' as const,
      path: '/api/admin/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
        403: errorSchemas.forbidden,
      },
    },
    updateRole: {
      method: 'PATCH' as const,
      path: '/api/admin/users/:id/role',
      input: z.object({ role: z.enum(['user', 'mod', 'admin']) }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
