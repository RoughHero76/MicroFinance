// Employee form (register and edit). Register asks for a password with the
// server's rules; edit has the "Account active" switch instead (the password
// is reset from the profile). Errors show under the field.

import React, {useEffect, useRef, useState} from 'react';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {errorMessage} from '@/lib/api';
import {makeStyles} from '@/theme';
import {Card, ConfirmSheet, Fab, OptionRow, Screen, Section, TextField, toast, useConfirm} from '@/ui';
import {registerEmployee, staffKeys, updateEmployee, type EmployeeInput, type EmployeeProfile} from '../api';

type Params = {EmployeeForm: {employee?: EmployeeProfile} | undefined};
type Form = Required<Omit<EmployeeInput, 'accountStatus'>> & {confirmPassword: string; accountStatus: boolean};

/** The server's rules (helpers/password.js). */
export function passwordOk(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[@$!%*?&]/.test(password)
  );
}

export default function EmployeeFormScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'EmployeeForm'>>();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const employee = route.params?.employee;
  const editing = !!employee;

  const initial = useRef<Form>({
    fname: employee?.fname ?? '',
    lname: employee?.lname ?? '',
    userName: employee?.userName ?? '',
    phoneNumber: employee?.phoneNumber ?? '',
    email: employee?.email ?? '',
    address: employee?.address ?? '',
    emergencyContact: employee?.emergencyContact ?? '',
    password: '',
    confirmPassword: '',
    accountStatus: employee?.accountStatus !== false,
  });
  const [form, setForm] = useState<Form>(initial.current);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const saved = useRef(false);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({...f, [key]: value}));

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
    if (!form.userName.trim()) e.userName = req;
    if (form.phoneNumber.replace(/\D/g, '').length !== 10) e.phoneNumber = t('errors.invalidPhone');
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = t('errors.invalidEmail');
    if (!editing) {
      if (!passwordOk(form.password)) e.password = t('staff.passwordRules');
      else if (form.password !== form.confirmPassword) e.confirmPassword = t('security.passwordsDontMatch');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useMutation({
    mutationFn: () => {
      const body: EmployeeInput = {
        fname: form.fname.trim(),
        lname: form.lname.trim(),
        userName: form.userName.trim(),
        phoneNumber: form.phoneNumber.replace(/\D/g, ''),
        email: form.email.trim(),
        address: form.address.trim(),
        emergencyContact: form.emergencyContact.trim(),
      };
      return editing
        ? updateEmployee(employee!.uid, {...body, accountStatus: form.accountStatus})
        : registerEmployee({...body, password: form.password});
    },
    onSuccess: () => {
      saved.current = true;
      queryClient.invalidateQueries({queryKey: staffKeys.all});
      toast.success(editing ? t('staff.saved') : t('staff.created'));
      navigation.goBack();
    },
    onError: error => toast.error(errorMessage(error, t)),
  });

  const field = (
    key: keyof Omit<Form, 'accountStatus'>,
    label: string,
    props: Partial<React.ComponentProps<typeof TextField>> = {},
  ) => <TextField label={label} value={form[key]} onChangeText={v => set(key, v)} error={errors[key]} {...props} />;

  return (
    <Screen
      header={{title: editing ? t('staff.editTitle') : t('staff.newTitle')}}
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
      <Section title={t('customerForm.personal')}>
        {field('fname', t('staff.firstName'), {required: true, autoCapitalize: 'words'})}
        {field('lname', t('staff.lastName'), {required: true, autoCapitalize: 'words'})}
        {field('userName', t('staff.userName'), {required: true, autoCapitalize: 'none'})}
      </Section>
      <Section title={t('customerForm.contact')}>
        {field('phoneNumber', t('staff.phone'), {required: true, keyboardType: 'phone-pad', maxLength: 14})}
        {field('email', t('staff.email'), {keyboardType: 'email-address', autoCapitalize: 'none'})}
        {field('address', t('staff.address'), {multiline: true})}
        {field('emergencyContact', t('staff.emergency'), {keyboardType: 'phone-pad'})}
      </Section>
      {editing ? (
        <Card padded={false} style={s.card}>
          <OptionRow
            title={t('staff.active')}
            hint={t('staff.activeHint')}
            toggle={{value: form.accountStatus, onChange: v => set('accountStatus', v)}}
          />
        </Card>
      ) : (
        <Section title={t('staff.password')}>
          {field('password', t('staff.password'), {
            required: true,
            secureToggle: true,
            autoCapitalize: 'none',
            hint: t('staff.passwordRules'),
          })}
          {field('confirmPassword', t('staff.confirmPassword'), {
            required: true,
            secureToggle: true,
            autoCapitalize: 'none',
          })}
        </Section>
      )}
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  card: {marginTop: t.space.md},
}));
