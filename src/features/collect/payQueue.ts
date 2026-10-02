// E-12 Payments saved on the phone while offline (or when a send times out),
// sent in order once the phone is back online. Each carries the key it was
// made with (clientRef), so a payment that did reach the server before the
// connection dropped is recorded only once. A payment the server refuses
// (say the loan was closed) stays here, marked, until the person retries or
// removes it: it's cash they're holding.
//
// The queue belongs to the signed-in person (payQueue.<uid>) and survives
// logout, so nothing collected is lost on a shared phone.

import {useSyncExternalStore} from 'react';
import {isApiError} from '@/lib/api';
import type {PaymentMethod} from '@/lib/enums';
import {readJson, StorageKeys, writeJson} from '@/lib/storage';

export interface QueuedPayment {
  clientRef: string;
  loanId: string;
  installmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  collectedBy?: string;
  /** When it was collected (ISO). */
  collectedAt: string;
  customerName: string;
  loanNumber: string;
  installmentNumber?: number;
  state: 'waiting' | 'refused';
  /** The server's reason, when refused. */
  error?: string;
}

let owner: string | null = null;
let items: QueuedPayment[] = [];
let flushing = false;
const listeners = new Set<() => void>();

const keyOf = (uid: string) => `${StorageKeys.payQueuePrefix}${uid}`;

function set(next: QueuedPayment[]) {
  items = next;
  if (owner) writeJson(keyOf(owner), items);
  listeners.forEach(listener => listener());
}

/** A key the server accepts (8–64 of A–Z, a–z, 0–9, _ and -). */
export function newClientRef(): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `p${Date.now().toString(36)}${random}`.replace(/[^A-Za-z0-9_-]/g, '');
}

/** Loads the signed-in person's queue (null when signed out). */
export async function loadQueue(uid: string | null) {
  owner = uid;
  const saved = uid ? await readJson<QueuedPayment[]>(keyOf(uid), []) : [];
  if (owner === uid) set(Array.isArray(saved) ? saved : []);
}

export function getQueue(): QueuedPayment[] {
  return items;
}

export function usePayQueue(): QueuedPayment[] {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => items,
  );
}

export function enqueue(payment: Omit<QueuedPayment, 'state' | 'error'>) {
  if (items.some(p => p.clientRef === payment.clientRef)) return;
  set([...items, {...payment, state: 'waiting'}]);
}

export function removeQueued(clientRef: string) {
  set(items.filter(p => p.clientRef !== clientRef));
}

export function retryQueued(clientRef: string) {
  set(items.map(p => (p.clientRef === clientRef ? {...p, state: 'waiting', error: undefined} : p)));
}

/**
 * Sends waiting payments one by one, oldest first. Stops at the first one
 * that can't reach the server (still offline, a timeout or a server error);
 * a refusal (4xx) marks that one and moves on. Returns how many were sent.
 */
export async function flushQueue(send: (payment: QueuedPayment) => Promise<unknown>): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const payment of items.filter(p => p.state === 'waiting')) {
      try {
        await send(payment);
        removeQueued(payment.clientRef);
        sent += 1;
      } catch (error) {
        const refused = isApiError(error) && error.kind === 'http' && !!error.status && error.status < 500;
        if (!refused) break;
        const reason = isApiError(error) ? error.serverMessage : undefined;
        set(items.map(p => (p.clientRef === payment.clientRef ? {...p, state: 'refused', error: reason} : p)));
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/** Whether a failed send should go to the queue (no answer from the server). */
export function shouldQueue(error: unknown): boolean {
  return isApiError(error) && (error.kind === 'offline' || error.kind === 'timeout');
}
