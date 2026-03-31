export type BulkOperationType = "update_price" | "update_tags" | "update_channel" | "update_status" | "delete";

export type BulkOperationItem = {
  id: string;
  title: string;
  currentValue?: string | number;
  newValue?: string | number;
};

export type BulkOperationPreview = {
  operationType: BulkOperationType;
  itemCount: number;
  items: BulkOperationItem[];
  estimatedDurationMs: number;
  requiresConfirmation: boolean;
  warnings: string[];
};

export type BulkOperationResult = {
  operationType: BulkOperationType;
  totalItems: number;
  succeeded: number;
  failed: number;
  errors: Array<{ itemId: string; error: string }>;
  completedAt: string;
  undoAvailable: boolean;
  undoId?: string;
};

export type UndoSnapshot = {
  id: string;
  operationType: BulkOperationType;
  items: Array<{ id: string; previousValue: unknown }>;
  createdAt: string;
  expiresAt: string;
};

const undoStore = new Map<string, UndoSnapshot>();

export function createBulkPreview(
  operationType: BulkOperationType,
  items: BulkOperationItem[],
): BulkOperationPreview {
  const warnings: string[] = [];

  if (items.length > 100) {
    warnings.push(`Large batch: ${items.length} items. This may take a while.`);
  }

  if (operationType === "delete") {
    warnings.push("This action is destructive and may not be fully undoable.");
  }

  return {
    operationType,
    itemCount: items.length,
    items: items.slice(0, 50),
    estimatedDurationMs: items.length * 200,
    requiresConfirmation: operationType === "delete" || items.length > 50,
    warnings,
  };
}

export function saveUndoSnapshot(
  operationType: BulkOperationType,
  items: Array<{ id: string; previousValue: unknown }>,
): string {
  const id = `undo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  undoStore.set(id, {
    id,
    operationType,
    items,
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  return id;
}

export function getUndoSnapshot(undoId: string): UndoSnapshot | null {
  const snapshot = undoStore.get(undoId);
  if (!snapshot) return null;
  if (new Date(snapshot.expiresAt) < new Date()) {
    undoStore.delete(undoId);
    return null;
  }
  return snapshot;
}

export function clearExpiredUndos(): number {
  const now = new Date();
  let cleared = 0;
  for (const [key, snapshot] of undoStore) {
    if (new Date(snapshot.expiresAt) < now) {
      undoStore.delete(key);
      cleared++;
    }
  }
  return cleared;
}
