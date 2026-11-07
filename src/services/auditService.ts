import type { AuditAction, AuditLog, User } from '@/types';
import { createId } from '@/utils/id';
import { getDb } from './db';

export function auditEntry(actor: User | null, action: AuditAction, entityType: string, entityId: string, summary: string): AuditLog {
  return {
    id: createId('aud'),
    action,
    actorId: actor?.id ?? 'system',
    actorName: actor?.name ?? 'System',
    actorRole: actor?.role ?? 'system',
    entityType,
    entityId,
    summary,
    at: new Date().toISOString(),
  };
}

export const auditService = {
  list(filter: { action?: AuditAction | 'all'; query?: string } = {}): AuditLog[] {
    const q = filter.query?.trim().toLowerCase();
    return getDb()
      .auditLogs.filter((l) => !filter.action || filter.action === 'all' || l.action === filter.action)
      .filter((l) => !q || l.summary.toLowerCase().includes(q) || l.actorName.toLowerCase().includes(q) || l.entityId.toLowerCase().includes(q));
  },
};
