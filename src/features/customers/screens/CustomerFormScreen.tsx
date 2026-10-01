// A4 Customer form (register and edit) and step 1 of A14b (convert lead).
// Exactly today's 11 fields; country defaults to India; errors show under
// the field. From a lead, the form is pre-filled and saving creates the
// customer and links the lead (BE-4); then "Customer + loan" opens Create
// loan pre-filled from the lead, or "Customer only" opens the profile.

import React, {useEffect, useRef, useState} from 'react';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {errorMessage, isApiError} from '@/lib/api';
import {GENDERS, normalizeLoanType, type Gender} from '@/lib/enums';
import {formatMoney} from '@/lib/format';
import {useDraft} from '@/lib/useDraft';
import {createCustomerFromLead, type Lead} from '@/features/leads/api';
import {makeStyles} from '@/theme';
import {
  BottomSheet,
  Chips,
  ConfirmSheet,
  Fab,
  OptionRow,
  Screen,
  Section,
  Text,
  TextField,
  toast,
  useConfirm,
  type SheetHandle,
} from '@/ui';
import {customerKeys, registerCustomer, updateCustomer, type CustomerInput, type CustomerProfile} from '../api';

type Params = {CustomerForm: {customer?: CustomerProfile; lead?: Lead} | undefined};

const EMPTY: Required<CustomerInput> = {
  fname: '',
  lname: '',
  gender: '',
  phoneNumber: '',
  email: '',
  userName: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
};

function fromLead(lead: Lead): Required<CustomerInput> {
  const [fname = '', ...rest] = (lead.name || '').trim().split(/\s+/);
  return {
    ...EMPTY,
    fname,
    lname: rest.join(' '),
    phoneNumber: lead.phone ?? '',
    email: lead.email ?? '',
    address: lead.address ?? '',
    city: lead.city ?? '',
    state: lead.state ?? '',
  };
}

export default function CustomerFormScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'CustomerForm'>>();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const nextRef = useRef<SheetHandle>(null);
  const {customer, lead} = route.params ?? {};
  const editing = !!customer;

  const initial = useRef<Required<CustomerInput>>(
    customer
      ? {
          ...EMPTY,
          fname: customer.fname ?? '',
          lname: customer.lname ?? '',
          gender: (customer as {gender?: string}).gender ?? '',
          phoneNumber: customer.phoneNumber ?? '',
          email: customer.email ?? '',
          userName: customer.userName ?? '',
          address: customer.address ?? '',
          city: customer.city ?? '',
          state: customer.state ?? '',
          country: customer.country ?? 'India',
          pincode: customer.pincode ?? '',
        }
      : lead
      ? fromLead(lead)
      : EMPTY,
  );
  const [form, setForm] = useState(initial.current);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInput, string>>>({});
  const [created, setCreated] = useState<{_id: string; uid: string} | null>(null);
  const saved = useRef(false);
  const set = (key: keyof CustomerInput, value: string) => setForm(f => ({...f, [key]: value}));

  // P-15: a new customer's form survives a crash (not for edits or leads).
  const draft = useDraft('customer.new', form, {enabled: !editing && !lead});
  useEffect(() => {
    if (!draft.checked) return;
    if (draft.saved && !editing && !lead && JSON.stringify(draft.saved) !== JSON.stringify(EMPTY)) {
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

  // U-02: leaving with unsaved changes asks first.
  useEffect(() => {
    return navigation.addListener('beforeRemove', e => {
      if (saved.current || JSON.stringify(form) === JSON.stringify(initial.current)) return;
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

  const validate = () => {
    const e: typeof errors = {};
    const req = t('errors.required');
    if (!form.fname.trim()) e.fname = req;
    if (!form.lname.trim()) e.lname = req;
    if (!form.gender) e.gender = req;
    if (form.phoneNumber.replace(/\D/g, '').length !== 10) e.phoneNumber = t('errors.invalidPhone');
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = t('errors.invalidEmail');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      const body: CustomerInput = {...form, phoneNumber: form.phoneNumber.replace(/\D/g, '')};
      if (editing) {
        await updateCustomer(customer!.uid!, body);
        return {_id: customer!._id, uid: customer!.uid!};
      }
      if (lead) {
        const res = await createCustomerFromLead(lead._id, body);
        return {_id: res.customerId, uid: res.customerUid};
      }
      return registerCustomer(body);
    },
    onSuccess: async result => {
      saved.current = true;
      await draft.clear();
      queryClient.invalidateQueries({queryKey: customerKeys.all});
      queryClient.invalidateQueries({queryKey: ['leads']});
      queryClient.invalidateQueries({queryKey: ['dashboard']});
      toast.success(editing ? t('customerForm.saved') : t('customerForm.created'));
      if (lead) {
        setCreated(result);
        requestAnimationFrame(() => nextRef.current?.open());
      } else if (editing) {
        navigation.goBack();
      } else {
        // After registering, open the new customer instead of going Home.
        navigation.dispatch({
          type: 'REPLACE',
          payload: {name: 'Customer', params: {id: result._id, uid: result.uid}},
        } as never);
      }
    },
    onError: error => {
      const message = errorMessage(error, t);
      if (isApiError(error) && /phone/i.test(message)) setErrors({phoneNumber: message});
      else toast.error(message);
    },
  });

  const field = (
    key: keyof CustomerInput,
    label: string,
    props: Partial<React.ComponentProps<typeof TextField>> = {},
  ) => <TextField label={label} value={form[key]} onChangeText={v => set(key, v)} error={errors[key]} {...props} />;

  return (
    <Screen
      header={{
        title: editing ? t('customerForm.editTitle') : t('customerForm.newTitle'),
        subtitle: lead ? lead.name : undefined,
      }}
      scroll
      keyboard
      fab={
        <Fab
          icon="content-save-outline"
          label={t('common.save')}
          onPress={() => validate() && save.mutate()}
          loading={save.isPending}
        />
      }>
      {lead ? (
        <Text color="muted" style={s.note}>
          {t('customerForm.fromLead', {name: lead.name})}
        </Text>
      ) : null}
      <Section title={t('customerForm.personal')}>
        {field('fname', t('customerForm.firstName'), {required: true, autoCapitalize: 'words'})}
        {field('lname', t('customerForm.lastName'), {required: true, autoCapitalize: 'words'})}
        <Text variant="label" weight="semibold" style={s.label}>
          {t('customerForm.gender')}
          <Text color="danger"> *</Text>
        </Text>
        <Chips<Gender>
          wrap
          options={GENDERS.map(g => ({value: g, label: t(`enums.gender.${g}`)}))}
          value={(form.gender as Gender) || null}
          onChange={g => set('gender', g)}
        />
        {errors.gender ? (
          <Text variant="caption" color="danger" style={s.error}>
            {errors.gender}
          </Text>
        ) : null}
      </Section>
      <Section title={t('customerForm.contact')}>
        {field('phoneNumber', t('customerForm.phone'), {required: true, keyboardType: 'phone-pad', maxLength: 14})}
        {field('email', t('customerForm.email'), {keyboardType: 'email-address', autoCapitalize: 'none'})}
        {field('userName', t('customerForm.userName'), {autoCapitalize: 'none'})}
      </Section>
      <Section title={t('customerForm.address')}>
        {field('address', t('customerForm.street'), {multiline: true})}
        {field('city', t('customerForm.city'))}
        {field('state', t('customerForm.state'))}
        {field('country', t('customerForm.country'))}
        {field('pincode', t('customerForm.pincode'), {keyboardType: 'number-pad', maxLength: 6})}
      </Section>

      <BottomSheet ref={nextRef} title={t('customerForm.nextStep')} dismissible={false}>
        <OptionRow
          icon="bank-plus"
          title={t('customerForm.customerAndLoan')}
          hint={
            lead
              ? t('customerForm.customerAndLoanHint', {
                  amount: formatMoney(lead.loanAmount),
                  type: t(`enums.loanType.${normalizeLoanType(lead.loanType) ?? 'Other'}`),
                })
              : undefined
          }
          onPress={() => {
            nextRef.current?.close();
            navigation.dispatch({
              type: 'REPLACE',
              payload: {
                name: 'CreateLoan',
                params: {
                  customerUid: created!.uid,
                  customerName: `${form.fname} ${form.lname}`,
                  leadId: lead!._id,
                  prefill: {loanAmount: lead!.loanAmount, loanDuration: lead!.loanDuration, loanType: lead!.loanType},
                },
              },
            } as never);
          }}
        />
        <OptionRow
          icon="account-check-outline"
          title={t('customerForm.customerOnly')}
          hint={t('customerForm.customerOnlyHint')}
          onPress={() => {
            nextRef.current?.close();
            navigation.dispatch({
              type: 'REPLACE',
              payload: {name: 'Customer', params: {id: created!._id, uid: created!.uid}},
            } as never);
          }}
        />
      </BottomSheet>
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  note: {marginBottom: t.space.md},
  label: {marginBottom: t.space.sm},
  error: {marginTop: t.space.xs},
}));
