// E-01 Move loans / Remove with a hand-over. One sheet for both: pick who
// takes the employee's open loans (the same picker as Record payment's
// "Collected by"). Move: all open loans or chosen ones, and optionally the
// open leads. Remove: all loans and leads move, with a warning when cash
// hasn't been handed over yet; then the employee is removed (Undo restores
// them, the loans stay with the new employee).

import React, {forwardRef, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {errorMessage} from '@/lib/api';
import {formatMoney} from '@/lib/format';
import type {CustomerRef} from '@/features/loans/types';
import {makeStyles} from '@/theme';
import {
  BottomSheet,
  Button,
  OptionRow,
  SegmentedControl,
  SelectField,
  SkeletonRows,
  Text,
  toast,
  type SheetHandle,
} from '@/ui';
import {getOpenLoansOf, listEmployees, moveEmployeeLoans, staffKeys, type EmployeeProfile} from '../api';

export type MoveMode = 'move' | 'remove';
export interface MoveLoansHandle {
  open: (mode: MoveMode) => void;
  close: () => void;
}

interface Props {
  employee: EmployeeProfile;
  /** After a move (to refresh the profile). */
  onMoved: () => void;
  /** Remove: called with the chosen employee's uid; it removes and shows Undo. */
  onRemove: (moveTo: string) => Promise<void>;
}

export const MoveLoansSheet = forwardRef<MoveLoansHandle, Props>(function MoveLoansSheet(
  {employee, onMoved, onRemove},
  ref,
) {
  const s = useStyles();
  const {t} = useTranslation();
  const sheetRef = useRef<SheetHandle>(null);
  const [mode, setMode] = useState<MoveMode>('move');
  const [to, setTo] = useState<string | null>(null);
  const [which, setWhich] = useState<'all' | 'choose'>('all');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [withLeads, setWithLeads] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const name = `${employee.fname} ${employee.lname}`.trim();
  const openLoans = employee.work?.openLoans ?? 0;
  const openLeads = employee.work?.openLeads ?? 0;
  const cashHeld = employee.today?.cashHeld ?? 0;

  useImperativeHandle(ref, () => ({
    open: next => {
      setMode(next);
      setTo(null);
      setWhich('all');
      setChosen(new Set());
      setWithLeads(true);
      setError(null);
      sheetRef.current?.open();
    },
    close: () => sheetRef.current?.close(),
  }));

  const employees = useQuery({queryKey: staffKeys.list(), queryFn: listEmployees});
  const options = useMemo(
    () =>
      (employees.data ?? [])
        .filter(e => e.uid !== employee.uid && e.accountStatus !== false)
        .map(e => ({value: e.uid, label: `${e.fname} ${e.lname}`.trim()})),
    [employees.data, employee.uid],
  );
  const toName = options.find(o => o.value === to)?.label ?? '';

  // "Choose…": the employee's open loans, newest first (Pending, Approved
  // and Active; the server moves only those).
  const loans = useQuery({
    queryKey: staffKeys.openLoans(employee._id),
    queryFn: () => getOpenLoansOf(employee._id),
    enabled: mode === 'move' && which === 'choose',
  });
  const openList = loans.data ?? [];

  const move = useMutation({
    mutationFn: () =>
      moveEmployeeLoans(employee.uid, to!, {
        loanIds: which === 'choose' ? [...chosen] : undefined,
        includeLeads: openLeads > 0 && withLeads,
      }),
    onSuccess: res => {
      sheetRef.current?.close();
      toast.success(res.message || t('staff.moved', {count: res.data?.loans ?? 0, name: toName}));
      onMoved();
    },
    onError: e => setError(errorMessage(e, t)),
  });

  const count = which === 'choose' ? chosen.size : openLoans;
  const submit = async () => {
    if (!to) return setError(t('staff.chooseWho'));
    if (mode === 'move') {
      if (!count) return setError(t('staff.chooseLoans'));
      setError(null);
      return move.mutate();
    }
    setError(null);
    setRemoving(true);
    try {
      await onRemove(to);
      sheetRef.current?.close();
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setRemoving(false);
    }
  };

  const toggle = (id: string) =>
    setChosen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <BottomSheet
      ref={sheetRef}
      title={mode === 'move' ? t('staff.moveTitle', {name}) : t('staff.removeConfirm', {name})}
      subtitle={mode === 'move' ? t('staff.moveHint', {name}) : t('staff.removeWithLoans', {count: openLoans})}
      footer={
        <>
          <Button title={t('common.cancel')} variant="text" onPress={() => sheetRef.current?.close()} />
          {mode === 'move' ? (
            <Button title={t('staff.moveCount', {count})} onPress={submit} loading={move.isPending} />
          ) : (
            <Button title={t('staff.moveAndRemove')} variant="danger" onPress={submit} loading={removing} />
          )}
        </>
      }>
      <SelectField<string>
        label={mode === 'move' ? t('staff.moveTo') : t('staff.moveTheirLoansTo')}
        value={to}
        onChange={setTo}
        options={options}
        placeholder={t('staff.chooseWho')}
      />
      {mode === 'move' ? (
        <>
          <Text variant="small" weight="semibold" style={s.label}>
            {t('staff.whichLoans')}
          </Text>
          <SegmentedControl<'all' | 'choose'>
            options={[
              {value: 'all', label: t('staff.allOpen', {count: openLoans})},
              {value: 'choose', label: t('staff.chooseEllipsis')},
            ]}
            value={which}
            onChange={setWhich}
          />
          {which === 'choose' ? (
            loans.isPending ? (
              <SkeletonRows count={3} avatar={false} />
            ) : (
              <View style={s.loans}>
                {openList.map(loan => {
                  const c = typeof loan.customer === 'object' ? (loan.customer as CustomerRef) : null;
                  return (
                    <OptionRow
                      key={loan._id}
                      icon={chosen.has(loan._id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      title={c ? `${c.fname} ${c.lname}`.trim() : `#${loan.loanNumber}`}
                      hint={`#${loan.loanNumber} · ${formatMoney(loan.loanAmount)} · ${t(`status.loan.${loan.status}`)}`}
                      onPress={() => toggle(loan._id)}
                    />
                  );
                })}
              </View>
            )
          ) : null}
          {openLeads > 0 ? (
            <OptionRow
              title={t('staff.alsoLeads', {count: openLeads})}
              toggle={{value: withLeads, onChange: setWithLeads}}
            />
          ) : null}
        </>
      ) : (
        <>
          {openLeads > 0 ? (
            <Text variant="small" color="muted">
              {t('staff.leadsMoveToo', {count: openLeads})}
            </Text>
          ) : null}
          {cashHeld > 0 ? (
            <Text variant="small" color="warning" style={s.warn}>
              {t('staff.cashNotHanded', {amount: formatMoney(cashHeld)})}
            </Text>
          ) : null}
        </>
      )}
      {error ? (
        <Text variant="small" color="danger">
          {error}
        </Text>
      ) : null}
    </BottomSheet>
  );
});

const useStyles = makeStyles(t => ({
  label: {marginTop: t.space.md, marginBottom: t.space.xs},
  loans: {marginTop: t.space.sm},
  warn: {marginTop: t.space.sm},
}));
