// E-12: sends the offline payment queue when the phone is back online, when
// the app comes to the foreground, and every minute while anything waits.
// Mounted once for the signed-in app (RootNavigator).

import {useEffect, type RefObject} from 'react';
import type {NavigationContainerRef} from '@react-navigation/native';
import {AppState} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {formatMoney} from '@/lib/format';
import {useSession} from '@/features/auth/SessionProvider';
import {recordPayment} from '@/features/loans/api';
import {toast} from '@/ui';
import {flushQueue, getQueue, loadQueue, type QueuedPayment} from './payQueue';

export function sendQueued(payment: QueuedPayment) {
  return recordPayment({
    loanId: payment.loanId,
    installmentId: payment.installmentId,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    transactionId: payment.transactionId,
    collectedBy: payment.collectedBy,
    clientRef: payment.clientRef,
    offline: true,
    collectedAt: payment.collectedAt,
  });
}

type NavRef = RefObject<NavigationContainerRef<ReactNavigation.RootParamList>>;

export function PayQueueSync({navRef}: {navRef?: NavRef}) {
  const {user} = useSession();
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const uid = user?.uid ?? null;

  useEffect(() => {
    let alive = true;
    const flush = async () => {
      if (!getQueue().some(p => p.state === 'waiting')) return;
      const before = getQueue().filter(p => p.state === 'waiting');
      const sent = await flushQueue(sendQueued);
      if (!alive) return;
      // E-02: a refusal is money the collector holds; say so at once instead
      // of waiting for them to open My payments.
      const refused = before.filter(p => getQueue().some(q => q.clientRef === p.clientRef && q.state === 'refused'));
      if (refused.length) {
        toast.error(t('payQueue.refusedTitle', {count: refused.length}), {
          message: `${formatMoney(refused.reduce((sum, p) => sum + p.amount, 0))} · ${t('payQueue.refusedHint')}`,
          action: navRef
            ? {label: t('notifications.open'), onPress: () => navRef.current?.navigate('MyPayments' as never)}
            : undefined,
        });
      } else if (sent) {
        const amount = before
          .filter(p => !getQueue().some(q => q.clientRef === p.clientRef))
          .reduce((sum, p) => sum + p.amount, 0);
        toast.success(t('payQueue.sent', {count: sent}), {message: formatMoney(amount)});
      }
      if (sent || refused.length) queryClient.invalidateQueries();
    };
    loadQueue(uid).then(flush);
    const net = NetInfo.addEventListener(state => {
      if (state.isConnected !== false && state.isInternetReachable !== false) flush();
    });
    const app = AppState.addEventListener('change', state => {
      if (state === 'active') flush();
    });
    const timer = setInterval(flush, 60000);
    return () => {
      alive = false;
      net();
      app.remove();
      clearInterval(timer);
    };
  }, [uid, queryClient, t, navRef]);

  return null;
}
