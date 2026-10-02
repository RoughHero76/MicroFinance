// A9 Create loan, 3 steps. 1 Terms: loan number (manual), loan type (7),
// amount, principal, duration (100–2200 days), frequency, the fixed
// interest and grace (from Business settings), start date, and a live
// preview from /shared/loan/calculate. 2 Business: the 4 required fields.
// 3 Documents: at least one (camera or gallery, cropped), then a review
// summary instead of the old OK popup. The draft survives (P-15).

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';
import Animated, {SlideInLeft, SlideInRight} from 'react-native-reanimated';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {
  DOCUMENT_TYPES,
  FREQUENCIES,
  LOAN_DURATIONS,
  LOAN_TYPES,
  normalizeLoanType,
  type DocumentType,
  type Frequency,
  type LoanType,
} from '@/lib/enums';
import {formatDate, formatMoney} from '@/lib/format';
import {pickDocuments, pickImage, type PickedImage} from '@/lib/image';
import {useDraft} from '@/lib/useDraft';
import {useSession} from '@/features/auth/SessionProvider';
import {makeStyles} from '@/theme';
import {
  Button,
  Card,
  Chips,
  DateField,
  Fab,
  IconButton,
  KeyValueRows,
  MoneyField,
  Screen,
  SegmentedControl,
  SelectField,
  Stepper,
  Text,
  TextField,
  Thumbnail,
  toast,
} from '@/ui';
import {calculateLoan, createLoan, type NewDocument} from '../adminApi';

type Params = {
  CreateLoan: {
    customerUid: string;
    customerName?: string;
    leadId?: string;
    // Pre-fills from the calculator (X7) or a lead (A14b).
    prefill?: Partial<{
      loanAmount: number;
      principalAmount: number;
      loanDuration: string;
      installmentFrequency: Frequency;
      loanType: string;
      loanStartDate: string;
    }>;
  };
};

interface Form {
  loanNumber: string;
  loanType: LoanType;
  loanAmount: number | null;
  principalAmount: number | null;
  loanDuration: string | null;
  installmentFrequency: Frequency;
  loanStartDate: string;
  businessFirmName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
}

export default function CreateLoanScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'CreateLoan'>>();
  const {customerUid, customerName, prefill, leadId} = route.params;
  const {settings} = useSession();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  // The step shown before this render, to pick the slide direction.
  const lastStep = useRef(0);
  useEffect(() => {
    lastStep.current = step;
  }, [step]);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | 'documents', string>>>({});
  const [docs, setDocs] = useState<NewDocument[]>([]);
  const [docType, setDocType] = useState<DocumentType>('Id Proof');
  const askedDraft = useRef(false);

  const interest = settings?.defaultInterestRate ?? 3.38;
  const grace = settings?.gracePeriod ?? 0;

  const [form, setForm] = useState<Form>({
    loanNumber: settings?.loanNumberPrefix ?? '',
    loanType: normalizeLoanType(prefill?.loanType) ?? 'Personal',
    loanAmount: prefill?.loanAmount ?? null,
    principalAmount: prefill?.principalAmount ?? null,
    loanDuration: prefill?.loanDuration ?? null,
    installmentFrequency: prefill?.installmentFrequency ?? 'Daily',
    loanStartDate: prefill?.loanStartDate ?? new Date().toISOString(),
    businessFirmName: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
  });
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({...f, [key]: value}));

  // Documents aren't kept in the draft: the cropped files are temporary.
  const draft = useDraft(`loan.${customerUid}`, form);
  const initial = useRef(form);
  useEffect(() => {
    if (!draft.checked || askedDraft.current) return;
    askedDraft.current = true;
    // An unfinished loan for this customer comes back as it was, with a way
    // to start again.
    if (draft.saved && !prefill) {
      setForm(draft.saved);
      toast.info(t('create.draft'), {
        message: t('create.draftHint'),
        action: {
          label: t('create.draftDiscard'),
          onPress: () => {
            setForm(initial.current);
            draft.discard();
          },
        },
      });
    }
    draft.start();
  }, [draft, prefill, t]);

  const preview = useQuery({
    queryKey: [
      'calculate',
      form.loanAmount,
      form.loanDuration,
      form.installmentFrequency,
      form.loanStartDate.slice(0, 10),
      grace,
    ],
    queryFn: () =>
      calculateLoan({
        loanAmount: form.loanAmount!,
        loanDuration: form.loanDuration!,
        installmentFrequency: form.installmentFrequency,
        loanStartDate: new Date(form.loanStartDate),
        gracePeriod: grace,
      }),
    enabled: !!form.loanAmount && !!form.loanDuration,
    staleTime: Infinity,
  });

  const validate = (which: number) => {
    const e: typeof errors = {};
    const req = t('errors.required');
    if (which === 0) {
      if (!form.loanNumber.trim()) e.loanNumber = req;
      if (!form.loanAmount) e.loanAmount = req;
      if (!form.principalAmount) e.principalAmount = req;
      if (form.loanAmount && form.principalAmount && form.principalAmount > form.loanAmount)
        e.principalAmount = t('create.principalTooHigh');
      if (!form.loanDuration) e.loanDuration = req;
    }
    if (which === 1) {
      if (!form.businessFirmName.trim()) e.businessFirmName = req;
      if (!form.businessAddress.trim()) e.businessAddress = req;
      if (form.businessPhone.replace(/\D/g, '').length < 10) e.businessPhone = t('errors.invalidPhone');
      if (!/^\S+@\S+\.\S+$/.test(form.businessEmail.trim())) e.businessEmail = t('errors.invalidEmail');
    }
    if (which === 2 && !docs.length) e.documents = t('create.documentsHint');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const create = useMutation({
    mutationFn: () =>
      createLoan(
        {
          customerUid,
          loanNumber: form.loanNumber.trim(),
          loanType: form.loanType,
          loanAmount: form.loanAmount!,
          principalAmount: form.principalAmount!,
          loanDuration: form.loanDuration!,
          installmentFrequency: form.installmentFrequency,
          interestRate: interest,
          gracePeriod: grace,
          loanStartDate: new Date(form.loanStartDate),
          businessFirmName: form.businessFirmName.trim(),
          businessAddress: form.businessAddress.trim(),
          businessPhone: form.businessPhone.trim(),
          businessEmail: form.businessEmail.trim(),
          documents: docs,
          leadId,
        },
        p => toast.progress('create-loan', p < 1 ? t('ui.uploading') : t('ui.finishing'), p),
      ),
    onSuccess: async res => {
      toast.hide('create-loan');
      await draft.clear();
      queryClient.invalidateQueries({queryKey: ['loans']});
      queryClient.invalidateQueries({queryKey: ['customers']});
      queryClient.invalidateQueries({queryKey: ['dashboard']});
      toast.success(t('create.created'), {message: `#${form.loanNumber}`});
      const loanId = (res as {loan?: {_id: string}}).loan?._id;
      if (loanId) navigation.dispatch({type: 'REPLACE', payload: {name: 'Loan', params: {loanId}}} as never);
      else navigation.goBack();
    },
    onError: error => {
      toast.hide('create-loan');
      toast.error(errorMessage(error, t));
    },
  });

  const next = () => {
    if (!validate(step)) return;
    if (step < 2) setStep(step + 1);
    else create.mutate();
  };

  const addDocs = (images: PickedImage[]) =>
    setDocs(list => [
      ...list,
      ...images.map((image, i) => ({
        image,
        type: docType,
        name: `${t(`enums.documentType.${docType}`)} ${list.length + i + 1}`,
      })),
    ]);

  const summary = useMemo(
    () => [
      {label: t('create.loanNumber'), value: form.loanNumber},
      {label: t('create.loanType'), value: t(`enums.loanType.${form.loanType}`)},
      {label: t('create.amount'), value: form.loanAmount ? formatMoney(form.loanAmount) : ''},
      {label: t('create.principal'), value: form.principalAmount ? formatMoney(form.principalAmount) : ''},
      {label: t('create.duration'), value: form.loanDuration ?? ''},
      {label: t('create.frequency'), value: t(`enums.frequency.${form.installmentFrequency}`)},
      {label: t('create.startDate'), value: formatDate(form.loanStartDate, lang)},
      {
        label: t('create.preview'),
        value: preview.data
          ? t('create.previewValue', {
              amount: formatMoney(preview.data.repaymentAmountPerInstallment),
              count: preview.data.numberOfInstallments,
            })
          : '',
      },
      {label: t('create.firmName'), value: form.businessFirmName},
      {label: t('loan.documents'), value: String(docs.length)},
    ],
    [form, preview.data, docs.length, t, lang],
  );

  return (
    <Screen
      header={{
        title: customerName ? t('create.title', {name: customerName.split(' ')[0]}) : t('create.titleShort'),
        onBack: step > 0 ? () => setStep(step - 1) : undefined,
      }}
      scroll
      keyboard
      fab={
        <Fab
          icon={step < 2 ? 'arrow-right' : 'check'}
          label={step < 2 ? t('common.next') : t('create.create')}
          onPress={next}
          loading={create.isPending}
        />
      }>
      <Stepper steps={[t('create.stepTerms'), t('create.stepBusiness'), t('create.stepDocuments')]} current={step} />
      {/* Each step slides in from the side it comes from. */}
      <Animated.View
        key={step}
        entering={(step >= lastStep.current ? SlideInRight : SlideInLeft).duration(220)}
        style={s.body}>
        {step === 0 ? (
          <>
            <TextField
              label={t('create.loanNumber')}
              required
              value={form.loanNumber}
              onChangeText={v => set('loanNumber', v)}
              keyboardType="number-pad"
              error={errors.loanNumber}
            />
            <Text variant="label" weight="semibold" style={s.label}>
              {t('create.loanType')}
            </Text>
            <Chips<LoanType>
              wrap
              options={LOAN_TYPES.map(lt => ({value: lt, label: t(`enums.loanType.${lt}`)}))}
              value={form.loanType}
              onChange={v => set('loanType', v)}
              style={s.chips}
            />
            <View style={s.row}>
              <View style={s.half}>
                <MoneyField
                  label={t('create.amount')}
                  required
                  value={form.loanAmount}
                  onChangeValue={v => set('loanAmount', v)}
                  error={errors.loanAmount}
                />
              </View>
              <View style={s.half}>
                <MoneyField
                  label={t('create.principal')}
                  required
                  value={form.principalAmount}
                  onChangeValue={v => set('principalAmount', v)}
                  error={errors.principalAmount}
                />
              </View>
            </View>
            <SelectField<string>
              label={t('create.duration')}
              required
              value={form.loanDuration}
              options={LOAN_DURATIONS.map(d => ({value: d, label: t('enums.days', {count: parseInt(d, 10)})}))}
              onChange={v => set('loanDuration', v)}
              error={errors.loanDuration}
            />
            <Text variant="label" weight="semibold" style={s.label}>
              {t('create.frequency')}
            </Text>
            <SegmentedControl<Frequency>
              options={FREQUENCIES.map(f => ({value: f, label: t(`enums.frequency.${f}`)}))}
              value={form.installmentFrequency}
              onChange={v => set('installmentFrequency', v)}
              style={s.chips}
            />
            <DateField
              label={t('create.startDate')}
              value={new Date(form.loanStartDate)}
              onChange={d => d && set('loanStartDate', d.toISOString())}
            />
            <Text variant="small" color="muted">
              {t('create.fixed', {interest, grace})}
            </Text>
            {preview.data ? (
              <Card style={s.preview}>
                <KeyValueRows
                  dense
                  rows={[
                    {
                      label: t('create.preview'),
                      value: t('create.previewValue', {
                        amount: formatMoney(preview.data.repaymentAmountPerInstallment),
                        count: preview.data.numberOfInstallments,
                      }),
                    },
                    {
                      label: t('create.total'),
                      value: t('create.totalValue', {
                        amount: formatMoney(preview.data.totalRepaymentAmount),
                        date: formatDate(preview.data.loanEndDate, lang),
                      }),
                    },
                  ]}
                />
              </Card>
            ) : null}
          </>
        ) : step === 1 ? (
          <>
            <TextField
              label={t('create.firmName')}
              required
              value={form.businessFirmName}
              onChangeText={v => set('businessFirmName', v)}
              error={errors.businessFirmName}
            />
            <TextField
              label={t('create.businessAddress')}
              required
              value={form.businessAddress}
              onChangeText={v => set('businessAddress', v)}
              error={errors.businessAddress}
              multiline
            />
            <TextField
              label={t('create.businessPhone')}
              required
              value={form.businessPhone}
              onChangeText={v => set('businessPhone', v)}
              keyboardType="phone-pad"
              error={errors.businessPhone}
            />
            <TextField
              label={t('create.businessEmail')}
              required
              value={form.businessEmail}
              onChangeText={v => set('businessEmail', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.businessEmail}
            />
          </>
        ) : (
          <>
            <Text variant="label" weight="semibold">
              {t('loanAdmin.documentType')}
            </Text>
            <Chips<DocumentType>
              wrap
              options={DOCUMENT_TYPES.map(dt => ({value: dt, label: t(`enums.documentType.${dt}`)}))}
              value={docType}
              onChange={setDocType}
              style={s.chips}
            />
            <View style={s.buttons}>
              <Button
                title={t('loanAdmin.camera')}
                icon="camera-outline"
                variant="secondary"
                onPress={async () => {
                  const image = await pickImage('document', 'camera').catch(() => null);
                  if (image) addDocs([image]);
                }}
              />
              <Button
                title={t('loanAdmin.gallery')}
                icon="image-multiple-outline"
                variant="secondary"
                onPress={async () => addDocs(await pickDocuments().catch(() => []))}
              />
            </View>
            {errors.documents ? (
              <Text variant="small" color="danger">
                {errors.documents}
              </Text>
            ) : null}
            {docs.map((doc, i) => (
              <View key={doc.image.uri} style={s.docRow}>
                <Thumbnail uri={doc.image.uri} size={56} />
                <View style={s.flex}>
                  <TextField
                    label={t('loanAdmin.documentName')}
                    value={doc.name}
                    onChangeText={name => setDocs(list => list.map((d, j) => (j === i ? {...d, name} : d)))}
                  />
                </View>
                <IconButton
                  icon="close"
                  label={t('common.delete')}
                  variant="plain"
                  onPress={() => setDocs(list => list.filter((_, j) => j !== i))}
                />
              </View>
            ))}
            <Card style={s.preview}>
              <Text variant="title" style={s.label}>
                {t('create.review')}
              </Text>
              <KeyValueRows dense rows={summary} />
            </Card>
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  body: {marginTop: t.space.xl},
  label: {marginBottom: t.space.sm},
  chips: {marginBottom: t.space.md},
  row: {flexDirection: 'row', gap: t.space.md},
  half: {flex: 1, minWidth: 0},
  preview: {marginTop: t.space.md},
  buttons: {flexDirection: 'row', gap: t.space.sm, marginBottom: t.space.md},
  docRow: {flexDirection: 'row', alignItems: 'center', gap: t.space.md, marginTop: t.space.sm},
  flex: {flex: 1, minWidth: 0},
}));
