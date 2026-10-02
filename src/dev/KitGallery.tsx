// Developer-only: every kit component in one scroll, with palette, mode and
// language switches (W0 "done when"). Reached from About (5 taps on the
// version) in debug builds only.

import React, {useState} from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {Lang} from '@/brand';
import {LANGUAGES, setLanguage, useI18n} from '@/i18n';
import {formatMoney} from '@/lib/format';
import {makeStyles, useThemeSettings, type ModeSetting, type PaletteId} from '@/theme';
import {
  ActionRow,
  Avatar,
  BottomSheet,
  BrandLogo,
  Button,
  Card,
  Chips,
  ConfirmSheet,
  DateField,
  EmptyState,
  ErrorState,
  FactTiles,
  IconButton,
  KeyValueRows,
  ListRow,
  MoneyField,
  OptionRow,
  ProgressBar,
  Screen,
  SearchField,
  Section,
  SegmentedControl,
  SelectField,
  SkeletonRows,
  StatusBadge,
  StepTracker,
  Text,
  TextField,
  Timeline,
  UnderlineTabs,
  toast,
  useConfirm,
  useSheet,
} from '@/ui';
import {LOAN_DURATIONS, SCHEDULE_STATUSES} from '@/lib/enums';
import {ApiError} from '@/lib/api';

export default function KitGallery() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const settings = useThemeSettings();
  const sheet = useSheet();
  const confirm = useConfirm();
  const [amount, setAmount] = useState<number | null>(1065);
  const [chip, setChip] = useState<string>('Pending');
  const [tab, setTab] = useState<'overview' | 'schedule' | 'docs'>('overview');
  const [date, setDate] = useState<Date | null>(new Date());
  const [duration, setDuration] = useState<string | null>('300 days');
  const [toggle, setToggle] = useState(true);

  return (
    <Screen header={{title: 'UI kit'}} scroll>
      <Section title="Theme">
        <SegmentedControl<ModeSetting>
          options={[
            {value: 'light', label: 'Light'},
            {value: 'dark', label: 'Dark'},
            {value: 'system', label: 'System'},
          ]}
          value={settings.modeSetting}
          onChange={settings.setModeSetting}
        />
        <Chips<PaletteId>
          wrap
          style={s.gapTop}
          options={settings.allowedPalettes.map(p => ({value: p, label: p}))}
          value={settings.theme.palette}
          onChange={settings.setPalette}
        />
        <Chips<Lang>
          wrap
          style={s.gapTop}
          options={LANGUAGES.map(l => ({value: l.id, label: l.label}))}
          value={lang}
          onChange={setLanguage}
        />
      </Section>

      <Section title="Brand">
        <BrandLogo />
      </Section>

      <Section title="Buttons">
        <ActionRow style={s.left}>
          <Button title="Collect" />
          <Button title="Reject" variant="secondary" />
          <Button title="Penalty" variant="text" />
          <Button title="Delete" variant="danger" />
          <Button title="Saving" loading />
        </ActionRow>
        <ActionRow style={[s.left, s.gapTop]}>
          <IconButton icon="phone" label="Call" />
          <IconButton icon="message-text" label="SMS" />
          <IconButton icon="whatsapp" label="WhatsApp" />
          <IconButton icon="bell-outline" label="Notifications" variant="plain" badge={9} />
        </ActionRow>
      </Section>

      <Section title="Fields">
        <TextField label="Username" placeholder="meena.s" icon="account" />
        <TextField label="Password" secureToggle placeholder="••••••••" />
        <TextField label="Phone" error={t('errors.invalidPhone')} value="98765" />
        <MoneyField label="Amount" value={amount} onChangeValue={setAmount} hint="Min ₹100" />
        <DateField label="Start date" value={date} onChange={setDate} />
        <SelectField
          label="Duration"
          value={duration}
          onChange={setDuration}
          options={LOAN_DURATIONS.map(d => ({value: d, label: d}))}
        />
        <SearchField value="" onSearch={() => {}} placeholder="Search customers" />
      </Section>

      <Section title="Chips and tabs">
        <Chips
          options={SCHEDULE_STATUSES.map(st => ({value: st, label: t(`status.schedule.${st}`), count: 3}))}
          value={chip}
          onChange={setChip}
        />
        <UnderlineTabs
          style={s.gapTop}
          options={[
            {value: 'overview', label: 'Overview'},
            {value: 'schedule', label: 'Schedule'},
            {value: 'docs', label: 'Documents'},
          ]}
          value={tab}
          onChange={setTab}
        />
      </Section>

      <Section title="Status">
        <View style={s.wrap}>
          {SCHEDULE_STATUSES.map(st => (
            <StatusBadge key={st} set="schedule" status={st} />
          ))}
          <StatusBadge set="loan" status="Active" />
          <StatusBadge set="repayment" status="Pending" />
          <StatusBadge set="lead" status="Converted" />
        </View>
      </Section>

      <Section title="Rows and cards">
        <Card padded={false}>
          <ListRow
            left={<Avatar name="Sunita Devi" />}
            title="Sunita Devi"
            value={formatMoney(25000)}
            subtitle="#1039 · Meena S."
            badge={<StatusBadge set="loan" status="Active" />}
            onPress={() => {}}
          />
        </Card>
        <Card style={s.gapTop}>
          <FactTiles
            facts={[
              {label: 'Borrowed', value: '₹40k'},
              {label: 'Outstanding', value: '₹36.6k'},
              {label: 'On time', value: '82%', color: 'success'},
            ]}
          />
          <ProgressBar value={0.2} style={s.gapTop} />
          <KeyValueRows
            style={s.gapTop}
            rows={[
              {label: 'Method', value: 'Cash'},
              {label: 'Remaining', value: formatMoney(32060)},
              {label: 'Transaction', value: ''},
              {label: 'Loan terms', value: '₹25,000 · 300 days', onPress: () => {}},
            ]}
          />
        </Card>
        <Card style={s.gapTop}>
          <Avatar name="Arif Khan" size={72} onEditPhoto={() => {}} />
        </Card>
      </Section>

      <Section title="Steps and timeline">
        <StepTracker steps={['Added', 'Follow-up', 'Requested', 'Approved', 'Customer']} current={2} />
        <View style={s.gapTop}>
          <Timeline
            conversation
            items={[
              {key: '1', title: 'Will bring documents Friday', meta: 'You · 27 Sep', mine: true},
              {key: '2', title: 'Check shop licence too', meta: 'Admin · 28 Sep'},
            ]}
          />
        </View>
      </Section>

      <Section title="Rows">
        <Card padded={false}>
          <OptionRow
            title="Forgive penalties"
            hint="Waive all pending penalties"
            toggle={{value: toggle, onChange: setToggle}}
          />
          <OptionRow title="Security" icon="shield-lock-outline" onPress={() => {}} />
          <OptionRow title="Payments" icon="cash-check" badge={9} onPress={() => {}} />
        </Card>
      </Section>

      <Section title="Overlays">
        <ActionRow style={s.left}>
          <Button
            title="Toast"
            variant="secondary"
            onPress={() => toast.success('Payment recorded', {message: formatMoney(1065)})}
          />
          <Button
            title="Undo toast"
            variant="secondary"
            onPress={() =>
              toast.success('Approved Kavita · ₹1,150', {action: {label: t('common.undo'), onPress: () => {}}})
            }
          />
          <Button title="Error" variant="secondary" onPress={() => toast.error(t('errors.offline'))} />
          <Button title="Sheet" variant="secondary" onPress={sheet.open} />
          <Button
            title="Confirm"
            variant="secondary"
            onPress={() =>
              confirm.ask({
                title: 'Force delete active loan',
                message: "This can't be undone",
                confirmLabel: 'Delete forever',
                destructive: true,
                typeToConfirm: '1039',
                onConfirm: () => undefined,
              })
            }
          />
        </ActionRow>
      </Section>

      <Section title="States">
        <Card padded={false}>
          <SkeletonRows count={2} />
        </Card>
        <EmptyState icon="party-popper" title="All collected for today" message="Nice — everyone is on time" />
        <ErrorState what="loans" error={new ApiError('timeout')} onRetry={() => {}} />
      </Section>

      <BottomSheet ref={sheet.ref} title="Record payment" subtitle="Sunita · #1039 · inst. 11">
        <MoneyField label="Amount" value={amount} onChangeValue={setAmount} />
        <Text color="muted">Toasts show above this sheet.</Text>
        <ActionRow style={s.gapTop}>
          <Button title={t('common.cancel')} variant="text" onPress={sheet.close} />
          <Button title={`Confirm ${formatMoney(amount ?? 0)}`} onPress={() => toast.success('Payment recorded')} />
        </ActionRow>
      </BottomSheet>
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  gapTop: {marginTop: t.space.md},
  left: {justifyContent: 'flex-start'},
  wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm},
}));
