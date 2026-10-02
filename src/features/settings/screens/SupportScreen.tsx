// X4: phone, WhatsApp, email, hours and FAQs from the brand file, so each
// white-label client shows its own. No backend work.

import React, {useState} from 'react';
import {Pressable, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {callPhone, openEmail, openWhatsApp} from '@/lib/messaging';
import {useSession} from '@/features/auth/SessionProvider';
import {makeStyles} from '@/theme';
import {Card, Icon, OptionRow, Screen, Section, Text} from '@/ui';

export default function SupportScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {settings} = useSession();
  const {phone, whatsapp, email, hours} = brand.support;
  const hasContact = !!(phone || whatsapp || email);
  const rate = Math.round((settings?.penaltyRate ?? 0.1) * 100);

  const faqs = [
    {q: t('support.q1'), a: t('support.a1')},
    {q: t('support.q2'), a: t('support.a2', {rate})},
    {q: t('support.q3'), a: t('support.a3')},
  ];

  return (
    <Screen header={{title: t('support.title')}} scroll>
      <Card style={s.intro}>
        <Text variant="title">{t('support.needHelp')}</Text>
        <Text color="muted">
          {hasContact ? [brand.name, hours].filter(Boolean).join(' · ') : t('support.contactAdmin')}
        </Text>
      </Card>

      {hasContact ? (
        <Card padded={false} style={s.gap}>
          {whatsapp ? (
            <OptionRow icon="whatsapp" title={t('support.whatsapp')} onPress={() => openWhatsApp(whatsapp)} />
          ) : null}
          {phone ? (
            <OptionRow icon="phone-outline" title={t('support.call')} value={phone} onPress={() => callPhone(phone)} />
          ) : null}
          {email ? (
            <OptionRow icon="email-outline" title={t('support.email')} value={email} onPress={() => openEmail(email)} />
          ) : null}
        </Card>
      ) : null}

      <Section title={t('support.faq')} style={s.gap}>
        <Card padded={false}>
          {faqs.map(faq => (
            <Faq key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </Card>
      </Section>
    </Screen>
  );
}

function Faq({question, answer}: {question: string; answer: string}) {
  const s = useStyles();
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen(o => !o)}
      accessibilityRole="button"
      accessibilityState={{expanded: open}}
      style={s.faq}>
      <View style={s.faqHead}>
        <Text variant="bodyLg" style={s.faqQ}>
          {question}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color="muted" />
      </View>
      {open ? <Text color="muted">{answer}</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles(t => ({
  intro: {gap: t.space.xs},
  gap: {marginTop: t.space.md},
  faq: {padding: t.space.lg, gap: t.space.sm, borderBottomWidth: 1, borderBottomColor: t.colors.border},
  faqHead: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  faqQ: {flex: 1},
}));
