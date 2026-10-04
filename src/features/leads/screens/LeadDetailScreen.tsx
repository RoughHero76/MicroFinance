// A14 · E9: one LeadDetail for both roles. Header card with photo, call and
// WhatsApp; a 5-step progress bar (Added → Follow-up → Requested → Approved
// → Customer); 3 facts; the next follow-up as its own card; remarks as a
// short conversation. One main action:
//   employee: Log follow-up, then Request conversion once it's Completed;
//   admin: Approve and convert (remarks required) → A14b customer form.
// ⋯ holds All details (purpose, full address) and, for admins, reject,
// status, assign (Undo) and delete (Undo, BE-19c).

import React, {useRef, useState} from 'react';
import {View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {FOLLOWUP_STATUSES, LEAD_STATUSES, leadDisplayStatus, normalizeLoanType} from '@/lib/enums';
import {formatDate, formatDateTime, formatMoney, toISODate} from '@/lib/format';
import {callPhone, openEmail, openMaps} from '@/lib/messaging';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {ContactActions} from '@/features/customers/components/CustomerParts';
import {listEmployees, staffKeys} from '@/features/staff/api';
import {makeStyles} from '@/theme';
import {
  Appear,
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chips,
  ConfirmSheet,
  DateField,
  ErrorState,
  Fab,
  IconButton,
  KeyValueRows,
  OptionRow,
  PhotoViewer,
  Screen,
  Section,
  SkeletonRows,
  StatusBadge,
  StepTracker,
  Text,
  TextField,
  Timeline,
  toast,
  useConfirm,
  type SheetHandle,
  RefreshControl,
} from '@/ui';
import {
  assignLead,
  deleteLead,
  getLead,
  leadKeys,
  requestConversion,
  restoreLead,
  setLeadStatus,
  updateFollowup,
  type Lead,
} from '../api';
import {followupLine} from './LeadListScreen';

type Params = {Lead: {id: string}};

const personName = (p: Lead['AssignedTo'] | Lead['addedBy']) =>
  p && typeof p === 'object' ? `${p.fname ?? ''} ${p.lname ?? ''}`.trim() : null;

/** Where the lead is on Added → Follow-up → Requested → Approved → Customer. */
export function leadStep(lead: Lead): {current: number; failed: boolean} {
  if (lead.isLeadConverted) return {current: 4, failed: false};
  if (lead.status === 'Rejected') return {current: 3, failed: true};
  if (lead.status === 'Approved') return {current: 3, failed: false};
  if (lead.conversionRequested || lead.followupStatus === 'Completed') return {current: 2, failed: false};
  return {current: 1, failed: false};
}

export default function LeadDetailScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'Lead'>>();
  const {role, user} = useSession();
  const can = useCan();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const menuRef = useRef<SheetHandle>(null);
  const detailsRef = useRef<SheetHandle>(null);
  const followupRef = useRef<SheetHandle>(null);
  const assignRef = useRef<SheetHandle>(null);
  const statusRef = useRef<SheetHandle>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [followup, setFollowup] = useState({
    date: null as string | null,
    status: 'Pending' as 'Pending' | 'Completed',
    remarks: '',
  });
  const id = route.params.id;
  const admin = role === 'admin';

  const query = useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () => getLead(role!, id),
    enabled: !!role,
    meta: {persist: true},
  });
  const lead = query.data;
  const employees = useQuery({
    queryKey: staffKeys.list(),
    queryFn: listEmployees,
    enabled: admin,
    staleTime: 5 * 60 * 1000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({queryKey: leadKeys.all});
  };
  const fail = (error: unknown) => {
    toast.error(errorMessage(error, t));
    throw error;
  };

  const saveFollowup = useMutation({
    mutationFn: () =>
      updateFollowup(id, {
        followupDate: followup.date ?? undefined,
        followupStatus: followup.status,
        remarksEmployee: followup.remarks.trim() || undefined,
      }),
    onSuccess: () => {
      followupRef.current?.close();
      refresh();
      toast.success(t('leads.followupSaved'));
    },
    onError: error => toast.error(errorMessage(error, t)),
  });

  if (query.isPending || query.isError || !lead) {
    return (
      <Screen header={{title: t('leads.title')}}>
        {query.isPending ? (
          <SkeletonRows count={5} />
        ) : (
          <ErrorState error={query.error} what={t('leads.title')} onRetry={query.refetch} />
        )}
      </Screen>
    );
  }

  const step = leadStep(lead);
  const steps = [
    t('leads.stepAdded'),
    t('leads.stepFollowup'),
    t('leads.stepRequested'),
    t('leads.stepApproved'),
    t('leads.stepCustomer'),
  ];
  const type = t(`enums.loanType.${normalizeLoanType(lead.loanType) ?? 'Other'}`);
  const address = [lead.address, lead.city, lead.state].filter(Boolean).join(', ');
  const addedBy = personName(lead.addedBy);
  const assigned = personName(lead.AssignedTo);
  const due = followupLine(lead, t, lang);
  const customer = lead.customerId && typeof lead.customerId === 'object' ? lead.customerId : null;
  const closed = lead.isLeadConverted || lead.status === 'Rejected';

  const remarks = (
    lead.remarks?.length
      ? lead.remarks
      : [
          ...(lead.remarksEmployee
            ? [
                {
                  by: 'employee' as const,
                  text: lead.remarksEmployee,
                  at: lead.conversionRequestedAt ?? lead.createdAt ?? '',
                },
              ]
            : []),
          ...(lead.remarksByAdmin ? [{by: 'admin' as const, text: lead.remarksByAdmin, at: ''}] : []),
        ]
  ).map((r, i) => {
    // Admins have no _id in the session, so any admin remark reads as theirs.
    const authorId = 'authorId' in r ? r.authorId : undefined;
    const mine = r.by === role && (!authorId || !user?._id || authorId === user._id);
    const who = mine
      ? t('leads.you')
      : ('authorName' in r && r.authorName) || (r.by === 'admin' ? t('leads.admin') : addedBy ?? '');
    return {
      key: String(i),
      title: r.text,
      mine,
      meta: [who, r.at ? formatDate(r.at, lang, {short: true}) : null].filter(Boolean).join(' · '),
    };
  });

  // --- Actions

  const openFollowup = () => {
    setFollowup({date: lead.followupDate ?? null, status: lead.followupStatus ?? 'Pending', remarks: ''});
    followupRef.current?.open();
  };

  const askRequest = () => {
    menuRef.current?.close();
    if (lead.followupStatus !== 'Completed') {
      toast.info(t('leads.requestNeedsFollowup'));
      return;
    }
    confirm.ask({
      title: t('leads.requestConversion'),
      message: t('leads.requestHint'),
      confirmLabel: t('leads.requestConversion'),
      input: {label: t('leads.remarks'), required: true, multiline: true},
      onConfirm: async remarks => {
        await requestConversion(id, remarks).catch(fail);
        refresh();
        toast.success(t('leads.requestSent'));
      },
    });
  };

  const convert = () => navigation.navigate('CustomerForm' as never, {lead} as never);

  const askApprove = () => {
    if (lead.status === 'Approved') return convert();
    confirm.ask({
      title: t('leads.approveTitle', {name: lead.name}),
      message: t('leads.approveHint'),
      confirmLabel: t('leads.approveConvert'),
      input: {label: t('leads.remarks'), required: true, multiline: true},
      onConfirm: async remarks => {
        await setLeadStatus(id, 'Approved', remarks).catch(fail);
        refresh();
        convert();
      },
    });
  };

  const askStatus = (status: Lead['status']) => {
    statusRef.current?.close();
    menuRef.current?.close();
    const needsRemarks = status === 'Approved' || status === 'Rejected';
    confirm.ask({
      title: status === 'Rejected' ? t('leads.rejectTitle', {name: lead.name}) : t('leads.setStatus'),
      message: needsRemarks ? t('leads.remarksRequired') : undefined,
      confirmLabel: t(`status.lead.${status}`),
      destructive: status === 'Rejected',
      input: {label: t('leads.remarks'), required: needsRemarks, multiline: true},
      onConfirm: async remarks => {
        await setLeadStatus(id, status, remarks || undefined).catch(fail);
        refresh();
        toast.success(t('leads.statusSaved'));
      },
    });
  };

  const assign = async (employeeId: string, name: string) => {
    assignRef.current?.close();
    const previous = lead.AssignedTo && typeof lead.AssignedTo === 'object' ? lead.AssignedTo._id : null;
    try {
      await assignLead(id, employeeId);
      refresh();
      toast.success(t('leads.assigned', {name}), {
        action: previous
          ? {
              label: t('common.undo'),
              onPress: () => assignLead(id, previous).then(refresh, error => toast.error(errorMessage(error, t))),
            }
          : undefined,
      });
    } catch (error) {
      toast.error(errorMessage(error, t));
    }
  };

  const askDelete = () => {
    menuRef.current?.close();
    confirm.ask({
      title: t('leads.deleteConfirm'),
      message: lead.name,
      confirmLabel: t('leads.delete'),
      destructive: true,
      onConfirm: async () => {
        await deleteLead(id).catch(fail);
        refresh();
        navigation.goBack();
        toast.success(t('leads.deleted'), {
          action: {
            label: t('common.undo'),
            onPress: () => restoreLead(id).then(refresh, error => toast.error(errorMessage(error, t))),
          },
        });
      },
    });
  };

  // One main action per role and state.
  let fab: React.ReactNode;
  if (lead.isLeadConverted && customer) {
    fab = (
      <Fab
        icon="account-arrow-right-outline"
        label={t('leads.openCustomer')}
        onPress={() => navigation.navigate('Customer' as never, {id: customer._id, uid: customer.uid} as never)}
      />
    );
  } else if (!closed && admin && can('lead.convert')) {
    fab = <Fab icon="account-check-outline" label={t('leads.approveConvert')} onPress={askApprove} />;
  } else if (!closed && !admin && lead.status !== 'Approved') {
    fab =
      lead.followupStatus === 'Completed' && !lead.conversionRequested && can('lead.requestConversion') ? (
        <Fab icon="send-outline" label={t('leads.requestConversion')} onPress={askRequest} />
      ) : can('lead.followup') ? (
        <Fab icon="phone-log-outline" label={t('leads.logFollowup')} onPress={openFollowup} />
      ) : undefined;
  }

  return (
    <Screen
      header={{
        title: t('leads.title'),
        right: (
          <IconButton
            icon="dots-vertical"
            label={t('common.more')}
            variant="plain"
            onPress={() => menuRef.current?.open()}
          />
        ),
      }}
      scroll
      defer
      fab={fab}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      <Appear>
        <Card style={s.head}>
          <View style={s.headRow}>
            <Avatar
              name={lead.name}
              uri={lead.pictureUrl}
              size={56}
              onPress={lead.pictureUrl ? () => setPhotoOpen(true) : undefined}
            />
            <View style={s.headText}>
              <Text variant="title" weight="bold" numberOfLines={1}>
                {lead.name}
              </Text>
              <Text variant="small" color="muted" numberOfLines={1}>
                {admin && addedBy
                  ? t('leads.addedBy', {name: addedBy})
                  : [lead.city, lead.state].filter(Boolean).join(', ')}
              </Text>
            </View>
            <StatusBadge set="lead" status={leadDisplayStatus(lead)} />
          </View>
          <ContactActions phone={lead.phone} address={address} name={lead.name} variant="ring" align="start" />
          {/* Mock E9: the 5-step progress lives in the header card. */}
          <View>
            <StepTracker steps={steps} current={step.current} failed={step.failed} showLabels={false} />
            <Text variant="small" color="muted" align="center" style={s.stepText}>
              {t('leads.stepOf', {
                step: step.current + 1,
                name: step.failed ? t('status.lead.Rejected') : steps[step.current],
              })}
            </Text>
          </View>
        </Card>
      </Appear>

      <Appear index={1}>
        <Card style={s.facts}>
          <KeyValueRows
            rows={[
              {
                label: t('leads.amount'),
                value: (
                  <Text weight="bold" tabular>
                    {formatMoney(lead.loanAmount)}
                  </Text>
                ),
              },
              {
                label: t('leads.duration'),
                value: lead.loanDuration ? <Text weight="bold">{lead.loanDuration}</Text> : '',
              },
              {label: t('leads.type'), value: <Text weight="bold">{type}</Text>},
            ]}
          />
        </Card>
      </Appear>

      {!closed && lead.followupDate ? (
        <Appear index={2}>
          <Card style={[s.block, due && lead.followupStatus !== 'Completed' && s.followupDue]}>
            <View style={s.headRow}>
              <View style={s.headText}>
                <Text variant="small" color="muted">
                  {t('leads.nextFollowup')}
                </Text>
                <Text variant="bodyLg" weight="bold">
                  {formatDate(lead.followupDate, lang)}
                </Text>
              </View>
              {lead.followupStatus === 'Completed' ? (
                <StatusBadge set="followup" status="Completed" />
              ) : due ? (
                <StatusBadge tone="warning" label={t('leads.due')} />
              ) : null}
            </View>
          </Card>
        </Appear>
      ) : null}

      {admin && lead.conversionRequested && !lead.isLeadConverted ? (
        <Text variant="small" color="primary" style={s.block}>
          {t('leads.conversionRequest')}
          {lead.conversionRequestedAt ? ` · ${formatDate(lead.conversionRequestedAt, lang, {short: true})}` : ''}
        </Text>
      ) : null}

      {remarks.length ? (
        <Section title={t('leads.notes')}>
          <Timeline conversation items={remarks} />
        </Section>
      ) : null}

      {/* ⋯ menu */}
      <BottomSheet ref={menuRef} title={lead.name}>
        <OptionRow
          icon="card-account-details-outline"
          title={t('leads.allDetails')}
          onPress={() => {
            menuRef.current?.close();
            detailsRef.current?.open();
          }}
        />
        {!admin && !closed && lead.status !== 'Approved' && can('lead.followup') ? (
          <OptionRow
            icon="phone-log-outline"
            title={t('leads.logFollowup')}
            onPress={() => {
              menuRef.current?.close();
              openFollowup();
            }}
          />
        ) : null}
        {!admin &&
        !closed &&
        !lead.conversionRequested &&
        lead.status !== 'Approved' &&
        can('lead.requestConversion') ? (
          <OptionRow icon="send-outline" title={t('leads.requestConversion')} onPress={askRequest} />
        ) : null}
        {admin && !lead.isLeadConverted ? (
          <>
            {lead.status !== 'Rejected' ? (
              <OptionRow
                icon="close-circle-outline"
                title={t('leads.rejectInstead')}
                onPress={() => askStatus('Rejected')}
              />
            ) : null}
            <OptionRow
              icon="swap-horizontal"
              title={t('leads.setStatus')}
              value={t(`status.lead.${lead.status}`)}
              onPress={() => {
                menuRef.current?.close();
                statusRef.current?.open();
              }}
            />
            <OptionRow
              icon="account-arrow-right-outline"
              title={t('leads.assign')}
              value={assigned ?? t('leads.unassigned')}
              onPress={() => {
                menuRef.current?.close();
                assignRef.current?.open();
              }}
            />
            <OptionRow icon="delete-outline" title={t('leads.delete')} destructive onPress={askDelete} />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet ref={detailsRef} title={t('leads.allDetails')}>
        <KeyValueRows
          rows={[
            {label: t('leads.phone'), value: lead.phone, onPress: () => callPhone(lead.phone), copy: true},
            {
              label: t('customers.email'),
              value: lead.email,
              onPress: lead.email ? () => openEmail(lead.email!) : undefined,
            },
            {label: t('customers.address'), value: address, onPress: address ? () => openMaps(address) : undefined},
            {label: t('leads.purpose'), value: lead.loanPurpose},
            {
              label: t('leads.followupStatus'),
              value: lead.followupStatus ? t(`status.followup.${lead.followupStatus}`) : undefined,
            },
            {label: t('leads.assignedTo'), value: assigned ?? t('leads.unassigned')},
            {
              label: t('leads.addedOn'),
              value: lead.createdAt || lead.date ? formatDateTime((lead.createdAt || lead.date)!, lang) : undefined,
            },
            ...(admin && addedBy ? [{label: t('leads.addedByLabel'), value: addedBy}] : []),
          ]}
        />
      </BottomSheet>

      {/* Employee: log follow-up */}
      <BottomSheet
        ref={followupRef}
        title={t('leads.logFollowup')}
        subtitle={lead.name}
        footer={
          <>
            <Button title={t('common.cancel')} variant="text" onPress={() => followupRef.current?.close()} />
            <Button title={t('common.save')} onPress={() => saveFollowup.mutate()} loading={saveFollowup.isPending} />
          </>
        }>
        <Text variant="label" weight="semibold" style={s.label}>
          {t('leads.followupStatus')}
        </Text>
        <Chips
          wrap
          options={FOLLOWUP_STATUSES.map(v => ({value: v, label: t(`status.followup.${v}`)}))}
          value={followup.status}
          onChange={v => setFollowup(f => ({...f, status: v}))}
          style={s.chips}
        />
        {followup.status === 'Pending' ? (
          <DateField
            label={t('leads.followupDate')}
            value={followup.date ? new Date(followup.date) : null}
            onChange={d => setFollowup(f => ({...f, date: d ? toISODate(d) : null}))}
            minimumDate={new Date()}
          />
        ) : null}
        <TextField
          label={t('leads.remarks')}
          value={followup.remarks}
          onChangeText={v => setFollowup(f => ({...f, remarks: v}))}
          multiline
        />
      </BottomSheet>

      {admin ? (
        <>
          <BottomSheet ref={statusRef} title={t('leads.setStatus')}>
            {LEAD_STATUSES.map(v => (
              <OptionRow
                key={v}
                title={t(`status.lead.${v}`)}
                value={v === lead.status ? '✓' : undefined}
                onPress={() => (v === lead.status ? statusRef.current?.close() : askStatus(v))}
              />
            ))}
          </BottomSheet>
          <BottomSheet ref={assignRef} title={t('leads.assign')} snapPoints={['60%']}>
            {(employees.data ?? []).map(e => {
              const name = `${e.fname} ${e.lname}`.trim();
              return (
                <OptionRow
                  key={e._id}
                  title={name}
                  hint={e.phoneNumber}
                  value={assigned === name ? '✓' : undefined}
                  onPress={() => assign(e._id, name)}
                />
              );
            })}
          </BottomSheet>
        </>
      ) : null}

      {lead.pictureUrl ? (
        <PhotoViewer
          photos={[{uri: lead.pictureUrl, title: lead.name}]}
          visible={photoOpen}
          onClose={() => setPhotoOpen(false)}
        />
      ) : null}
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  head: {gap: t.space.md},
  headRow: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  headText: {flex: 1, minWidth: 0},
  block: {marginTop: t.space.md},
  facts: {marginTop: t.space.md, paddingVertical: t.space.xs, paddingHorizontal: t.space.lg},
  followupDue: {borderColor: t.colors.warning, borderWidth: 1.5},
  stepText: {marginTop: t.space.sm},
  label: {marginBottom: t.space.sm},
  chips: {marginBottom: t.space.md},
}));
