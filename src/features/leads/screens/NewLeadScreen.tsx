// E10 New lead: every field the old form had — photo (required; camera or
// gallery, cropped), name, 10-digit phone, optional email, street, city,
// state, loan type (7), amount, duration and purpose. Errors show under the
// field; the form keeps a draft on the phone (P-15).

import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {errorMessage} from '@/lib/api';
import {LOAN_DURATIONS, LOAN_TYPES, type LoanType} from '@/lib/enums';
import {pickImage, type ImageSource, type PickedImage} from '@/lib/image';
import {useDraft} from '@/lib/useDraft';
import {makeStyles} from '@/theme';
import {
  Button,
  Chips,
  ConfirmSheet,
  Fab,
  MoneyField,
  Screen,
  Section,
  SelectField,
  Text,
  TextField,
  Thumbnail,
  toast,
  useConfirm,
} from '@/ui';
import {createLead, leadKeys} from '../api';

interface Form {
  picture: PickedImage | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  loanType: LoanType;
  loanAmount: number | null;
  loanDuration: string;
  loanPurpose: string;
}

const EMPTY: Form = {
  picture: null,
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  loanType: 'Personal',
  loanAmount: null,
  loanDuration: LOAN_DURATIONS[0],
  loanPurpose: '',
};

export default function NewLeadScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const saved = useRef(false);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({...f, [key]: value}));

  const draft = useDraft('lead.new', form);
  useEffect(() => {
    if (!draft.checked) return;
    if (draft.saved && JSON.stringify(draft.saved) !== JSON.stringify(EMPTY)) {
      setForm(draft.saved);
      toast.info(t('leads.draftRestored'), {
        action: {
          label: t('leads.discard'),
          onPress: () => {
            setForm(EMPTY);
            draft.discard();
          },
        },
      });
    }
    draft.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.checked]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', e => {
      if (saved.current || JSON.stringify(form) === JSON.stringify(EMPTY)) return;
      e.preventDefault();
      confirm.ask({
        title: t('customerForm.leaveTitle'),
        message: t('customerForm.leaveMessage'),
        confirmLabel: t('customerForm.leave'),
        destructive: true,
        onConfirm: () => navigation.dispatch(e.data.action),
      });
    });
  }, [navigation, form, confirm, t]);

  const pick = async (source: ImageSource) => {
    try {
      const image = await pickImage('profile', source);
      if (image) {
        set('picture', image);
        setErrors(e => ({...e, picture: undefined}));
      }
    } catch (error) {
      toast.error(errorMessage(error, t));
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    const req = t('errors.required');
    if (!form.picture) e.picture = t('leads.photoRequired');
    if (!form.name.trim()) e.name = req;
    if (form.phone.replace(/\D/g, '').length !== 10) e.phone = t('errors.invalidPhone');
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = t('errors.invalidEmail');
    if (!form.address.trim()) e.address = req;
    if (!form.city.trim()) e.city = req;
    if (!form.state.trim()) e.state = req;
    if (!form.loanAmount || form.loanAmount <= 0) e.loanAmount = t('errors.invalidAmount');
    if (!form.loanPurpose.trim()) e.loanPurpose = req;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const create = useMutation({
    mutationFn: () =>
      createLead(
        {
          name: form.name.trim(),
          phone: form.phone.replace(/\D/g, ''),
          email: form.email.trim() || undefined,
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          loanType: form.loanType,
          loanAmount: form.loanAmount!,
          loanDuration: form.loanDuration,
          loanPurpose: form.loanPurpose.trim(),
          picture: form.picture!,
        },
        p => toast.progress('lead', p < 1 ? t('ui.uploading') : t('ui.finishing'), p),
      ),
    onSuccess: async res => {
      toast.hide('lead');
      saved.current = true;
      await draft.clear();
      queryClient.invalidateQueries({queryKey: leadKeys.all});
      queryClient.invalidateQueries({queryKey: ['dashboard']});
      toast.success(t('leads.created'));
      const id = (res as {data?: {_id?: string}})?.data?._id;
      if (id) navigation.dispatch({type: 'REPLACE', payload: {name: 'Lead', params: {id}}} as never);
      else navigation.goBack();
    },
    onError: error => {
      toast.hide('lead');
      toast.error(errorMessage(error, t));
    },
  });

  const field = (
    key: 'name' | 'phone' | 'email' | 'address' | 'city' | 'state' | 'loanPurpose',
    label: string,
    props: Partial<React.ComponentProps<typeof TextField>> = {},
  ) => <TextField label={label} value={form[key]} onChangeText={v => set(key, v)} error={errors[key]} {...props} />;

  return (
    <Screen
      header={{title: t('leads.newLead')}}
      scroll
      keyboard
      fab={
        <Fab
          icon="check"
          label={t('leads.create')}
          onPress={() => validate() && create.mutate()}
          loading={create.isPending}
        />
      }>
      <Section title={t('leads.photo')}>
        <View style={s.photoRow}>
          {form.picture ? <Thumbnail uri={form.picture.uri} size={72} /> : null}
          <View style={s.photoButtons}>
            <Button
              title={t('leads.camera')}
              icon="camera-outline"
              variant="secondary"
              onPress={() => pick('camera')}
            />
            <Button
              title={t('leads.gallery')}
              icon="image-outline"
              variant="secondary"
              onPress={() => pick('gallery')}
            />
          </View>
        </View>
        {errors.picture ? (
          <Text variant="caption" color="danger" style={s.error}>
            {errors.picture}
          </Text>
        ) : null}
      </Section>
      <Section title={t('leads.personal')}>
        {field('name', t('leads.name'), {required: true, autoCapitalize: 'words'})}
        {field('phone', t('leads.phone'), {required: true, keyboardType: 'phone-pad', maxLength: 14})}
        {field('email', t('leads.email'), {keyboardType: 'email-address', autoCapitalize: 'none'})}
        {field('address', t('leads.street'), {required: true, multiline: true})}
        {field('city', t('leads.city'), {required: true})}
        {field('state', t('leads.state'), {required: true})}
      </Section>
      <Section title={t('leads.loan')}>
        <Text variant="label" weight="semibold" style={s.label}>
          {t('leads.loanType')}
        </Text>
        <Chips
          wrap
          options={LOAN_TYPES.map(v => ({value: v, label: t(`enums.loanType.${v}`)}))}
          value={form.loanType}
          onChange={v => set('loanType', v)}
          style={s.chips}
        />
        <MoneyField
          label={t('leads.loanAmount')}
          required
          value={form.loanAmount}
          onChangeValue={v => set('loanAmount', v)}
          error={errors.loanAmount}
        />
        <SelectField
          label={t('leads.loanDuration')}
          required
          value={form.loanDuration}
          onChange={v => set('loanDuration', v)}
          options={LOAN_DURATIONS.map(v => ({value: v, label: v}))}
        />
        {field('loanPurpose', t('leads.loanPurpose'), {required: true, multiline: true})}
      </Section>
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  photoRow: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  photoButtons: {flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap', flex: 1},
  error: {marginTop: t.space.xs},
  label: {marginBottom: t.space.sm},
  chips: {marginBottom: t.space.md},
}));
