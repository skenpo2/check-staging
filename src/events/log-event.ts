import { Request } from 'express';
import { EventName, EventProperties } from './event.types';
import EventLog from './event.model';

// --- Internal Types ---
type LogEntry<K extends EventName = EventName> = {
  event: K;
  properties: EventProperties[K];
  timestamp: Date;
};

// --- Queue Config ---
const eventQueue: LogEntry[] = [];
const BATCH_SIZE = 20;
const FLUSH_INTERVAL = 5000; // ms
let flushing = false;

// --- Periodic Flusher ---
setInterval(() => flushQueue(), FLUSH_INTERVAL);

// --- Flush Logic ---
async function flushQueue() {
  if (flushing || eventQueue.length === 0) return;

  flushing = true;
  const batch = eventQueue.splice(0, BATCH_SIZE);

  try {
    await EventLog.insertMany(
      batch.map((entry) => ({
        event: entry.event,
        properties: entry.properties,
        timestamp: entry.timestamp,
      }))
    );
  } catch (error) {
    console.error('logEvent flushQueue error:', error);
    eventQueue.unshift(...batch); // rollback into queue if failed
  } finally {
    flushing = false;
  }
}

// --- Main Function to Use in Code ---
export function logEvent<K extends EventName>(
  eventName: K,
  properties: Partial<EventProperties[K]>,
  req?: Request
): void {
  // Attempt to enrich from request context
  const user = req?.user as
    | { _id?: string; role?: 'customer' | 'expert' }
    | undefined;

  const user_id = user?._id ?? req?.body?.user_id;
  const user_type = user?.role ?? req?.body?.user_type;
  const location = req?.headers['x-user-location'] ?? req?.ip;

  const enriched: any = {
    ...properties,
    ...(user_id && { user_id }),
    ...(user_type && { user_type }),
    ...(location && { location }),
  };

  eventQueue.push({
    event: eventName,
    properties: enriched as EventProperties[K],
    timestamp: new Date(),
  });

  // Optional: immediate flush if batch limit is reached
  if (eventQueue.length >= BATCH_SIZE) flushQueue();
}
