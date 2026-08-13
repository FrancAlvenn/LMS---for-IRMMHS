import { z } from 'zod';

import { permissionSchema } from '@/types/permission';
import type { Permission } from '@/types/permission';

export const roleInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(permissionSchema),
});

export const roleUpdateSchema = roleInputSchema.partial();

export type RoleInput = z.infer<typeof roleInputSchema>;
export type RoleUpdate = z.infer<typeof roleUpdateSchema>;

export type Role = {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  // true only for the seeded "Admin" role — can't be deleted, can't have
  // role:write/user:write stripped via the API. See contract §2.
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};
