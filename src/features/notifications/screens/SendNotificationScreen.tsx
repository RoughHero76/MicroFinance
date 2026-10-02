// Admins: send a message of their own (holiday, a reminder…) to all
// employees, chosen employees, admins or everyone. It lands in the app's
// notification list and on phones. The server limits how often (one every
// 2 minutes, 5 a day, no repeats within an hour), so nothing goes out twice
// by accident.

import React, {useState} from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {errorMessage} from '@/lib/api';
import {listEmployees, staffKeys} from '@/features/staff/api';
import {makeStyles} from '@/theme';
import {
  Card,
  Chips,
  ConfirmSheet,
  Fab,
  OptionRow,
  Screen,
  Section,
  SkeletonRows,
  Text,
  TextField,
  toast,
  useConfirm,
} from '@/ui';
import {sendNotification, type SendTo} from '../api';

type Audience = 'employees' | 'chosen' | 'admins' | 'everyone';
const TITLE_MAX = 80;
const MESSAGE_MAX = 500;

export default function SendNotificationScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const confirm = useConfirm();
  const [audience, setAudience] = useState<Audience>('employees');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const employees = useQuery({queryKey: staffKeys.list(), queryFn: listEmployees, staleTime: 5 * 60 * 1000});
  const active = (employees.data ?? []).filter(e => e.accountStatus !== false);

  const toggle = (id: string) =>
    setChosen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const who = audience === 'chosen' ? t('send.toChosen', {count: chosen.size}) : t(`send.to.${audience}`);
  const ready = !!title.trim() && (audience !== 'chosen' || chosen.size > 0);

  const send = () =>
    confirm.ask({
      title: t('send.confirm', {who}),
      message: [title.trim(), message.trim()].filter(Boolean).join('\n'),
      confirmLabel: t('send.send'),
      onConfirm: async () => {
        const to: SendTo = audience === 'chosen' ? [...chosen] : audience;
        try {
          const r = await sendNotification({to, title: title.trim(), message: message.trim()});
          toast.success(t('send.sent', {count: r.recipients}), {
            message: r.push?.configured ? t('send.phones', {count: r.push.sent ?? 0}) : undefined,
          });
          navigation.goBack();
        } catch (error) {
          toast.error(errorMessage(error, t));
          throw error;
        }
      },
    });

  return (
    <Screen
      header={{title: t('send.title')}}
      scroll
      keyboard
      fab={<Fab icon="send" label={t('send.send')} onPress={send} disabled={!ready} />}>
      <Section title={t('send.who')}>
        <Chips<Audience>
          wrap
          options={[
            {value: 'employees', label: t('send.to.employees')},
            {value: 'chosen', label: t('send.chooseEmployees')},
            {value: 'admins', label: t('send.to.admins')},
            {value: 'everyone', label: t('send.to.everyone')},
          ]}
          value={audience}
          onChange={setAudience}
        />
      </Section>

      {audience === 'chosen' ? (
        <Section title={t('send.toChosen', {count: chosen.size})}>
          {employees.isPending ? (
            <SkeletonRows count={4} />
          ) : (
            <Card padded={false} dividers>
              {active.map(e => (
                <OptionRow
                  key={e._id}
                  title={`${e.fname} ${e.lname}`.trim()}
                  hint={e.userName ? `@${e.userName}` : undefined}
                  toggle={{value: chosen.has(e._id), onChange: () => toggle(e._id)}}
                />
              ))}
            </Card>
          )}
        </Section>
      ) : null}

      <Section title={t('send.message')}>
        <TextField
          label={t('send.titleLabel')}
          placeholder={t('send.titlePlaceholder')}
          value={title}
          onChangeText={setTitle}
          maxLength={TITLE_MAX}
          required
        />
        <TextField
          label={t('send.messageLabel')}
          placeholder={t('send.messagePlaceholder')}
          value={message}
          onChangeText={setMessage}
          maxLength={MESSAGE_MAX}
          multiline
          hint={`${message.length}/${MESSAGE_MAX}`}
        />
      </Section>
      <View style={s.note}>
        <Text variant="small" color="muted">
          {t('send.limits')}
        </Text>
      </View>
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  note: {marginTop: t.space.xs},
}));
