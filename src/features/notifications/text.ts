// X5: a notification's title and line, written in the app's language from
// its type and parameters (BE-16). Types the app doesn't know (added on the
// server later) show the server's own text, in Hindi when the server sent
// it, so new kinds of notification need no app update.

import type {TFunction} from 'i18next';
import i18n from '@/i18n';
import {formatMoney} from '@/lib/format';
import type {AppNotification} from './api';

export function notificationText(n: AppNotification, t: TFunction): {title: string; body?: string} {
  const p = n.params ?? {};
  const money = (v: unknown) => formatMoney(Number(v) || 0);
  const known = `notifications.types.${n.type}`;
  switch (n.type) {
    case 'payment.pending':
      return {
        title: t(`${known}.title`, {count: Number(p.count) || 0}),
        body: ((p.byCollector as {name: string; count: number}[]) ?? [])
          .map(c => `${c.name === 'Admin' ? t('common.admin') : c.name} ${c.count}`)
          .join(' · '),
      };
    case 'payment.approved':
    case 'payment.rejected':
      return {
        title: t(`${known}.title`, {amount: money(p.amount)}),
        body: [`${p.name ?? ''} #${p.loanNo ?? ''}`.trim(), p.reason ? `"${p.reason}"` : null]
          .filter(Boolean)
          .join(' · '),
      };
    case 'payment.approvedMany':
      return {title: t(`${known}.title`, {count: Number(p.count) || 0, amount: money(p.amount)})};
    case 'loan.pending':
      return {title: t(`${known}.title`, {number: p.loanNo}), body: `${p.name ?? ''} · ${money(p.amount)}`};
    case 'loan.assigned':
      return {title: t(`${known}.title`, {number: p.loanNo}), body: String(p.name ?? '')};
    case 'lead.assigned':
      return {title: t(`${known}.title`, {name: p.name})};
    case 'lead.status':
      return {
        title: t(`${known}.title`, {
          name: p.name,
          status: t(`status.lead.${p.status}`, {defaultValue: String(p.status)}),
        }),
        body: p.remarks ? String(p.remarks) : undefined,
      };
    case 'lead.conversionRequested':
      return {title: t(`${known}.title`, {name: p.name}), body: p.by ? String(p.by) : undefined};
    case 'lead.followupDue':
      return {
        title: t(`${known}.title`, {count: Number(p.count) || 0}),
        body: ((p.names as string[]) ?? []).join(', '),
      };
    case 'risk.moved':
      return {
        title: t(`${known}.title`, {count: Number(p.total) || 0}),
        body: `SMA-1 ${p.sma1 ?? 0} · SMA-2 ${p.sma2 ?? 0} · NPA ${p.npa ?? 0}`,
      };
    case 'test.push':
      return {title: t(`${known}.title`), body: t(`${known}.body`)};
    case 'cron.failed':
      return {title: t(`${known}.title`), body: String(p.job ?? '')};
    case 'cash.handover':
      return {title: t(`${known}.title`, {amount: money(p.amount)}), body: String(p.name ?? '')};
    case 'cash.confirmed':
      return p.short
        ? {title: t(`${known}.short`, {amount: money(p.short)}), body: p.note ? String(p.note) : undefined}
        : {title: t(`${known}.title`, {amount: money(p.amount)})};
    case 'custom.message':
      // An admin's own words: the same in every language.
      return {title: String(p.title ?? n.title ?? ''), body: p.message ? String(p.message) : undefined};
    default: {
      const hi = i18n.language === 'hi' ? n.i18n?.hi : undefined;
      return {title: hi?.title || n.title || n.type, body: hi?.body ?? n.body};
    }
  }
}

/** Where a tap goes: [route, params]. */
export function notificationTarget(n: AppNotification): [string, object | undefined] | null {
  const link = n.link ?? {};
  switch (link.screen) {
    case 'Loan':
      return link.id ? ['Loan', {loanId: link.id}] : null;
    case 'Lead':
      return link.id ? ['Lead', {id: link.id}] : null;
    case 'Customer':
      return link.id ? ['Customer', {id: link.id}] : null;
    case 'Leads':
    case 'Collect':
    case 'Customers':
    case 'Loans':
      return ['Tabs', {screen: link.screen}];
    case 'Notifications':
      return ['Notifications', undefined];
    case 'Payments':
    case 'MyPayments':
    case 'Risk':
    case 'Overdue':
    case 'CashHandovers':
    case 'CashHandover':
      return [link.screen, undefined];
    default:
      return null;
  }
}
