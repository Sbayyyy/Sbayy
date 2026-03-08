import type { User, SearchResponse } from '@sbay/shared';

export type BackendUserDto = Omit<User, 'name'> & {
  displayName?: string;
  name?: string;
  avatarUrl?: string;
};

/** Convert a backend user DTO to the frontend User type. */
export function toUser(dto: BackendUserDto): User {
  return {
    ...dto,
    name: dto.displayName ?? dto.name ?? '',
    avatar: dto.avatar ?? dto.avatarUrl,
  };
}

/**
 * Normalize the backend listings response into a consistent SearchResponse.
 * Handles both array and `{ items, total }` response shapes.
 */
export function normalizeListingsResponse(
  data: unknown,
  page: number,
  limit: number
): SearchResponse {
  if (data && typeof data === 'object') {
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page,
        limit,
        totalPages: 1,
      };
    }
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      const total = (typeof obj.total === 'number' ? obj.total : obj.items.length);
      return {
        items: obj.items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  }

  return { items: [], total: 0, page, limit, totalPages: 0 };
}
