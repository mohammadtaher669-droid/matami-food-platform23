import { useState, useRef, useCallback } from "react";
import { generateImageForItem } from "@/lib/aiImageUtils";
import type { MenuItem } from "@/lib/store";

export type ItemStatus = "queued" | "generating" | "done" | "failed";

export interface QueueEntry {
  item: MenuItem;
  force?: boolean;
}

export interface ImageQueueState {
  statuses: Record<string, ItemStatus>;
  total: number;
  completed: number;
  failed: number;
  isRunning: boolean;
}

const CONCURRENCY = 2;

export function useImageQueue() {
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [isRunning, setIsRunning] = useState(false);

  const queueRef = useRef<QueueEntry[]>([]);
  const activeRef = useRef(0);
  const retriesRef = useRef<Record<string, number>>({});
  const queuedIdsRef = useRef(new Set<string>());

  const processNext = useRef<() => void>(null!);
  processNext.current = () => {
    while (activeRef.current < CONCURRENCY && queueRef.current.length > 0) {
      const entry = queueRef.current.shift()!;
      activeRef.current++;

      setStatuses((prev) => ({ ...prev, [entry.item.id]: "generating" }));

      generateImageForItem(entry.item, { force: entry.force })
        .then(() => {
          setStatuses((prev) => ({ ...prev, [entry.item.id]: "done" }));
        })
        .catch(() => {
          const retryCount = (retriesRef.current[entry.item.id] || 0) + 1;
          retriesRef.current[entry.item.id] = retryCount;
          if (retryCount <= 1) {
            setTimeout(() => {
              queueRef.current.push(entry);
              processNext.current();
            }, 3000);
          } else {
            setStatuses((prev) => ({ ...prev, [entry.item.id]: "failed" }));
          }
        })
        .finally(() => {
          activeRef.current--;
          processNext.current();
          if (activeRef.current === 0 && queueRef.current.length === 0) {
            setIsRunning(false);
          }
        });
    }
  };

  const addToQueue = useCallback((entries: QueueEntry[]) => {
    const toAdd = entries.filter(({ item, force }) => {
      if (force) return true;
      return !queuedIdsRef.current.has(item.id);
    });
    if (toAdd.length === 0) return;

    toAdd.forEach(({ item }) => queuedIdsRef.current.add(item.id));
    queueRef.current.push(...toAdd);

    setStatuses((prev) => {
      const update: Record<string, ItemStatus> = {};
      toAdd.forEach(({ item }) => {
        update[item.id] = "queued";
      });
      return { ...prev, ...update };
    });
    setIsRunning(true);
    setTimeout(() => processNext.current(), 0);
  }, []);

  const stop = useCallback(() => {
    queueRef.current = [];
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    queueRef.current = [];
    retriesRef.current = {};
    queuedIdsRef.current = new Set();
    activeRef.current = 0;
    setStatuses({});
    setIsRunning(false);
  }, []);

  const statusValues = Object.values(statuses);
  const total = statusValues.length;
  const completed = statusValues.filter((s) => s === "done").length;
  const failed = statusValues.filter((s) => s === "failed").length;

  return { statuses, isRunning, total, completed, failed, addToQueue, stop, reset };
}
