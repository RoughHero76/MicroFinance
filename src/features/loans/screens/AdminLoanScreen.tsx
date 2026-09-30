// A6 · A10 (admin): the shared LoanScreen plus the admin's actions.
// ⋯ menu: reassign, close, delete (not Active), activity, copy loan ID.
// Pending loans (A10) show the review checks with Reject · Approve; approve
// offers Undo for 10 minutes (BE-19). The hidden 5-tap force delete (same
// top-right spot as before) opens the A6c safety sheet. Installments get
// Edit (A7c) and Remove penalty; documents get Add (with crop) and
// long-press Delete.

import React, {useRef, useState} from 'react';
import {Pressable, View} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useNavigation} from '@react-navigation/native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {errorMessage} from '@/lib/api';
import {DOCUMENT_TYPES, type DocumentType} from '@/lib/enums';
import {formatMoney} from '@/lib/format';
import {pickDocuments, pickImage, type PickedImage} from '@/lib/image';
import {listEmployees, staffKeys} from '@/features/staff/api';
import {makeStyles} from '@/theme';
import {
  BottomSheet,
  Button,
  Card,
  Chips,
  ConfirmSheet,
  Icon,
  IconButton,
  KeyValueRows,
  OptionRow,
  Text,
  TextField,
  Thumbnail,
  toast,
  useConfirm,
  type SheetHandle,
} from '@/ui';
import {
  addDocuments,
  approveLoan,
  assignLoan,
  deleteDocuments,
  deleteLoan,
  getDeletePreview,
  rejectLoan,
  unapproveLoan,
  type NewDocument,
} from '../adminApi';
import {loanKeys, removePenalty} from '../api';
import {EditInstallmentSheet} from '../components/EditInstallmentSheet';
import type {Installment, LoanDetail} from '../types';
import LoanScreen from './LoanScreen';

export default function AdminLoanScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const menuRef = useRef<SheetHandle>(null);
  const assignRef = useRef<SheetHandle>(null);
  const forceRef = useRef<SheetHandle>(null);
  const editRef = useRef<SheetHandle>(null);
  const uploadRef = useRef<SheetHandle>(null);
  const [current, setCurrent] = useState<LoanDetail | null>(null);
  const [editing, setEditing] = useState<Installment | null>(null);
  const taps = useRef<number[]>([]);

  const employees = useQuery({queryKey: staffKeys.list(), queryFn: listEmployees, staleTime: 5 * 60 * 1000});

  const refresh = (loanId: string) => {
    queryClient.invalidateQueries({queryKey: loanKeys.detail(loanId)});
    queryClient.invalidateQueries({queryKey: ['loans', 'list']});
    queryClient.invalidateQueries({queryKey: ['dashboard']});
  };

  const act = async (fn: () => Promise<unknown>, done?: () => void) => {
    try {
      await fn();
      done?.();
    } catch (error) {
      toast.error(errorMessage(error, t));
      throw error;
    }
  };

  const approve = async (detail: LoanDetail) => {
    await act(
      () => approveLoan(detail.loan._id),
      () => {
        refresh(detail.loan._id);
        toast.success(t('loanAdmin.approved'), {
          message: `#${detail.loan.loanNumber}`,
          action: {
            label: t('common.undo'),
            onPress: () =>
              act(
                () => unapproveLoan(detail.loan._id),
                () => {
                  refresh(detail.loan._id);
                  toast.info(t('loanAdmin.undone'));
                },
              ).catch(() => undefined),
          },
        });
      },
    ).catch(() => undefined);
  };

  const onHiddenTap = (detail: LoanDetail) => {
    const now = Date.now();
    taps.current = [...taps.current.filter(ts => now - ts < 2000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      setCurrent(detail);
      queryClient.prefetchQuery({
        queryKey: ['loans', 'deletePreview', detail.loan._id],
        queryFn: () => getDeletePreview(detail.loan._id),
      });
      requestAnimationFrame(() => forceRef.current?.open());
    }
  };

  return (
    <>
      <LoanScreen
        extras={{
          headerRight: detail => (
            <View style={s.headerRight}>
              {/* The hidden force delete: an invisible area, 5 taps (as before). */}
              <Pressable
                onPress={() => onHiddenTap(detail)}
                style={s.hidden}
                accessible={false}
                importantForAccessibility="no"
              />
              <IconButton
                icon="dots-vertical"
                label={t('loanAdmin.menu')}
                variant="plain"
                onPress={() => {
                  setCurrent(detail);
                  menuRef.current?.open();
                }}
              />
            </View>
          ),
          overviewTop: detail =>
            detail.loan.status === 'Pending' ? (
              <Card style={s.pending}>
                <Text variant="title">{t('loanAdmin.waiting')}</Text>
                <KeyValueRows
                  rows={[
                    {
                      label: t('loanAdmin.business'),
                      value:
                        detail.loan.businessFirmName &&
                        detail.loan.businessAddress &&
                        detail.loan.businessPhone &&
                        detail.loan.businessEmail
                          ? `${t('loanAdmin.complete')} ✓`
                          : t('loanAdmin.incomplete'),
                      keepEmpty: true,
                    },
                    {label: t('loan.documents'), value: String(detail.documents.length), keepEmpty: true},
                    {
                      label: t('loanAdmin.collectorRow'),
                      value:
                        typeof detail.loan.assignedTo === 'object' && detail.loan.assignedTo
                          ? `${detail.loan.assignedTo.fname ?? ''} ${detail.loan.assignedTo.lname ?? ''}`
                          : t('loanAdmin.assign'),
                      onPress: () => {
                        setCurrent(detail);
                        assignRef.current?.open();
                      },
                      keepEmpty: true,
                    },
                  ]}
                />
                <View style={s.actions}>
                  <Button
                    title={t('loanAdmin.reject')}
                    variant="secondary"
                    onPress={() =>
                      confirm.ask({
                        title: t('loanAdmin.rejectConfirm', {number: detail.loan.loanNumber}),
                        message: t('loanAdmin.rejectHint'),
                        confirmLabel: t('loanAdmin.reject'),
                        destructive: true,
                        onConfirm: () =>
                          act(
                            () => rejectLoan(detail.loan._id),
                            () => {
                              refresh(detail.loan._id);
                              toast.success(t('loanAdmin.rejected'));
                            },
                          ),
                      })
                    }
                  />
                  <Button title={t('loanAdmin.approve')} onPress={() => approve(detail)} />
                </View>
              </Card>
            ) : null,
          installmentActions: (detail, installment, close) => ({
            onEdit: () => {
              close();
              setCurrent(detail);
              setEditing(installment);
              requestAnimationFrame(() => editRef.current?.open());
            },
            onRemovePenalty: installment.penaltyApplied
              ? () => {
                  close();
                  confirm.ask({
                    title: t('loanAdmin.removePenaltyConfirm', {number: installment.loanInstallmentNumber ?? '-'}),
                    confirmLabel: t('loan.removePenalty'),
                    destructive: true,
                    onConfirm: () =>
                      act(
                        () => removePenalty(detail.loan._id, installment._id),
                        () => {
                          refresh(detail.loan._id);
                          queryClient.invalidateQueries({queryKey: ['loans', 'schedule', detail.loan._id]});
                          toast.success(t('loanAdmin.penaltyRemoved'));
                        },
                      ),
                  });
                }
              : undefined,
          }),
          documentsTop: detail => (
            <View style={s.docsTop}>
              <Button
                title={t('loanAdmin.addDocuments')}
                icon="file-plus-outline"
                variant="secondary"
                onPress={() => {
                  setCurrent(detail);
                  uploadRef.current?.open();
                }}
              />
            </View>
          ),
          onLongPressDocument: (detail, doc) =>
            confirm.ask({
              title: t('loanAdmin.deleteDocConfirm', {name: doc.documentName}),
              confirmLabel: t('common.delete'),
              destructive: true,
              onConfirm: () =>
                act(
                  () => deleteDocuments(detail.loan._id, [doc._id]),
                  () => {
                    refresh(detail.loan._id);
                    toast.success(t('loanAdmin.docDeleted'));
                  },
                ),
            }),
        }}
      />

      <BottomSheet ref={menuRef} title={current ? t('loan.title', {number: current.loan.loanNumber}) : undefined}>
        {current ? (
          <>
            {current.loan.status === 'Active' || current.loan.status === 'Pending' ? (
              <OptionRow
                icon="account-switch-outline"
                title={current.loan.assignedTo ? t('loanAdmin.reassign') : t('loanAdmin.assign')}
                onPress={() => {
                  menuRef.current?.close();
                  assignRef.current?.open();
                }}
              />
            ) : null}
            {current.loan.status === 'Active' ? (
              <OptionRow
                icon="lock-check-outline"
                title={t('loanAdmin.close')}
                onPress={() => {
                  menuRef.current?.close();
                  navigation.navigate('CloseLoan' as never, {loanId: current.loan._id} as never);
                }}
              />
            ) : null}
            <OptionRow
              icon="history"
              title={t('loanAdmin.activity')}
              onPress={() => {
                menuRef.current?.close();
                navigation.navigate(
                  'Activity' as never,
                  {loanId: current.loan._id, loanNumber: current.loan.loanNumber} as never,
                );
              }}
            />
            <OptionRow
              icon="content-copy"
              title={t('loanAdmin.copyId')}
              onPress={() => {
                Clipboard.setString(current.loan.uid ?? current.loan._id);
                menuRef.current?.close();
                toast.info(t('loanAdmin.copied'));
              }}
            />
            {current.loan.status !== 'Active' ? (
              <OptionRow
                icon="delete-outline"
                title={t('loanAdmin.delete')}
                destructive
                onPress={() => {
                  menuRef.current?.close();
                  confirm.ask({
                    title: t('loanAdmin.deleteConfirm', {number: current.loan.loanNumber}),
                    message: t('loanAdmin.deleteHint'),
                    confirmLabel: t('common.delete'),
                    destructive: true,
                    typeToConfirm: current.loan.loanNumber,
                    onConfirm: () =>
                      act(
                        () => deleteLoan(current.loan._id),
                        () => {
                          queryClient.invalidateQueries({queryKey: ['loans']});
                          toast.success(t('loanAdmin.deleted'));
                          navigation.goBack();
                        },
                      ),
                  });
                }}
              />
            ) : null}
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet ref={assignRef} title={t('loanAdmin.reassign')} snapPoints={['60%']}>
        {(employees.data ?? []).length === 0 ? <Text color="muted">{t('loanAdmin.noCollector')}</Text> : null}
        {(employees.data ?? [])
          .filter(e => e.accountStatus !== false)
          .map(e => (
            <OptionRow
              key={e._id}
              icon="account-outline"
              title={`${e.fname} ${e.lname}`}
              hint={e.userName ? `@${e.userName}` : undefined}
              onPress={() => {
                assignRef.current?.close();
                if (!current) return;
                const loanId = current.loan._id;
                act(
                  () => assignLoan(loanId, e._id),
                  () => {
                    refresh(loanId);
                    toast.success(t('loanAdmin.assigned', {name: `${e.fname} ${e.lname}`}));
                  },
                ).catch(() => undefined);
              }}
            />
          ))}
      </BottomSheet>

      <ForceDeleteSheet sheetRef={forceRef} detail={current} onDeleted={() => navigation.goBack()} />
      <EditInstallmentSheet ref={editRef} installment={editing} loanId={current?.loan._id ?? ''} />
      <UploadSheet
        sheetRef={uploadRef}
        loanId={current?.loan._id ?? null}
        onDone={() => current && refresh(current.loan._id)}
      />
      <ConfirmSheet ref={confirm.ref} />
    </>
  );
}

function ForceDeleteSheet({
  sheetRef,
  detail,
  onDeleted,
}: {
  sheetRef: React.RefObject<SheetHandle>;
  detail: LoanDetail | null;
  onDeleted: () => void;
}) {
  const s = useStyles();
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState('');
  const loanId = detail?.loan._id ?? '';
  const preview = useQuery({
    queryKey: ['loans', 'deletePreview', loanId],
    queryFn: () => getDeletePreview(loanId),
    enabled: !!loanId,
  });
  const remove = useMutation({
    mutationFn: () => deleteLoan(loanId, true),
    onSuccess: () => {
      sheetRef.current?.close();
      queryClient.invalidateQueries({queryKey: ['loans']});
      queryClient.invalidateQueries({queryKey: ['dashboard']});
      toast.success(t('loanAdmin.deleted'));
      onDeleted();
    },
    onError: error => toast.error(errorMessage(error, t)),
  });
  const p = preview.data;
  return (
    <BottomSheet
      ref={sheetRef}
      title={t('loanAdmin.forceTitle')}
      subtitle={t('loanAdmin.forceWarning')}
      onClose={() => setTyped('')}
      dismissible={!remove.isPending}
      footer={
        <>
          <Button title={t('common.cancel')} variant="text" onPress={() => sheetRef.current?.close()} />
          <Button
            title={t('loanAdmin.forceButton')}
            variant="danger"
            loading={remove.isPending}
            disabled={!p || typed.trim() !== p.loanNumber}
            onPress={() => remove.mutate()}
          />
        </>
      }>
      {p ? (
        <>
          <KeyValueRows
            rows={[
              {
                label: t('loanAdmin.forcePayments'),
                value: `${p.payments.count} · ${formatMoney(p.payments.amount)}`,
                keepEmpty: true,
              },
              {label: t('loanAdmin.forceInstallments'), value: String(p.installments), keepEmpty: true},
              {label: t('loanAdmin.forceDocuments'), value: String(p.documents), keepEmpty: true},
              {
                label: t('loanAdmin.forcePenalties'),
                value: `${p.penalties.count} · ${formatMoney(p.penalties.amount)}`,
                keepEmpty: true,
              },
            ]}
          />
          {p.collector ? (
            <Text variant="small" color="muted" style={s.gap}>
              {t('loanAdmin.forceCollector', {name: p.collector})}
            </Text>
          ) : null}
          <View style={[s.note, s.gap]}>
            <Icon name="content-save-outline" size={18} color="info" />
            <Text variant="small" style={s.flex}>
              {t('loanAdmin.forceSnapshot')}
            </Text>
          </View>
          <TextField
            label={t('ui.typeToConfirm', {value: p.loanNumber})}
            value={typed}
            onChangeText={setTyped}
            keyboardType="number-pad"
            containerStyle={s.gap}
          />
        </>
      ) : (
        <Text color="muted">{t('common.loading')}</Text>
      )}
    </BottomSheet>
  );
}

function UploadSheet({
  sheetRef,
  loanId,
  onDone,
}: {
  sheetRef: React.RefObject<SheetHandle>;
  loanId: string | null;
  onDone: () => void;
}) {
  const s = useStyles();
  const {t} = useTranslation();
  const [docs, setDocs] = useState<NewDocument[]>([]);
  const [type, setType] = useState<DocumentType>('Id Proof');

  const add = (images: PickedImage[]) =>
    setDocs(list => [
      ...list,
      ...images.map((image, i) => ({image, type, name: `${t(`enums.documentType.${type}`)} ${list.length + i + 1}`})),
    ]);

  const upload = useMutation({
    mutationFn: () =>
      addDocuments(loanId!, docs, p => toast.progress('docs', p < 1 ? t('ui.uploading') : t('ui.finishing'), p)),
    onSuccess: () => {
      toast.hide('docs');
      toast.success(t('loanAdmin.uploaded'));
      setDocs([]);
      sheetRef.current?.close();
      onDone();
    },
    onError: error => {
      toast.hide('docs');
      // The picked files stay, so a failed upload can be retried as is.
      toast.error(errorMessage(error, t));
    },
  });

  return (
    <BottomSheet
      ref={sheetRef}
      title={t('loanAdmin.addDocuments')}
      snapPoints={['85%']}
      dismissible={!upload.isPending}
      footer={
        <>
          <Button
            title={t('common.cancel')}
            variant="text"
            onPress={() => sheetRef.current?.close()}
            disabled={upload.isPending}
          />
          <Button
            title={t('loanAdmin.upload', {count: docs.length})}
            icon="cloud-upload-outline"
            onPress={() => upload.mutate()}
            loading={upload.isPending}
            disabled={!docs.length || !loanId}
          />
        </>
      }>
      <Text variant="label" color="muted">
        {t('loanAdmin.documentType')}
      </Text>
      <Chips<DocumentType>
        wrap
        options={DOCUMENT_TYPES.map(dt => ({value: dt, label: t(`enums.documentType.${dt}`)}))}
        value={type}
        onChange={setType}
        style={s.gap}
      />
      <View style={[s.actions, s.gap]}>
        <Button
          title={t('loanAdmin.camera')}
          icon="camera-outline"
          variant="secondary"
          onPress={async () => {
            const image = await pickImage('document', 'camera').catch(() => null);
            if (image) add([image]);
          }}
        />
        <Button
          title={t('loanAdmin.gallery')}
          icon="image-multiple-outline"
          variant="secondary"
          onPress={async () => add(await pickDocuments().catch(() => []))}
        />
      </View>
      {docs.map((doc, i) => (
        <View key={doc.image.uri} style={s.docRow}>
          <Thumbnail uri={doc.image.uri} size={56} />
          <View style={s.flex}>
            <TextField
              label={t('loanAdmin.documentName')}
              value={doc.name}
              onChangeText={name => setDocs(list => list.map((d, j) => (j === i ? {...d, name} : d)))}
              containerStyle={s.noMargin}
            />
            <Text variant="caption" color="muted">
              {t(`enums.documentType.${doc.type}`)} · {Math.round(doc.image.size / 1024)} KB
            </Text>
          </View>
          <IconButton
            icon="close"
            label={t('common.delete')}
            variant="plain"
            onPress={() => setDocs(list => list.filter((_, j) => j !== i))}
          />
        </View>
      ))}
    </BottomSheet>
  );
}

const useStyles = makeStyles(t => ({
  headerRight: {flexDirection: 'row', alignItems: 'center'},
  hidden: {width: 50, height: 50},
  pending: {marginBottom: t.space.md, gap: t.space.sm, borderColor: t.colors.warning},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: t.space.sm, flexWrap: 'wrap'},
  docsTop: {flexDirection: 'row', justifyContent: 'flex-end', marginBottom: t.space.md},
  gap: {marginTop: t.space.sm},
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.infoSoft,
  },
  flex: {flex: 1, minWidth: 0},
  docRow: {flexDirection: 'row', alignItems: 'center', gap: t.space.md, marginTop: t.space.md},
  noMargin: {marginBottom: 2},
}));
