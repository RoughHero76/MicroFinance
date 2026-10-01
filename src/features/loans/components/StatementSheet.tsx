// M-5 Loan statement (both roles, from the loan's header). Make a new one
// in English or Hindi, then share it (WhatsApp, email…) or open it. Every
// statement made stays in the history below for sharing again.

import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {View} from 'react-native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {appFileExists, downloadToApp, MIME, openAppFile, shareAppFile, type AppFile} from '@/lib/files';
import {formatDateTime} from '@/lib/format';
import {makeStyles} from '@/theme';
import {
  BottomSheet,
  Button,
  IconButton,
  ListRow,
  SegmentedControl,
  Skeleton,
  Text,
  toast,
  type SheetHandle,
} from '@/ui';
import {createStatement, getStatements, statementPdfPath, type LoanStatement} from '../api';

const FOLDER = 'statements';

export interface StatementSheetHandle {
  open: () => void;
}

export const StatementSheet = forwardRef<StatementSheetHandle, {loanId: string; loanNumber: string}>(
  function StatementSheet({loanId, loanNumber}, ref) {
    const s = useStyles();
    const {t} = useTranslation();
    const {lang: appLang} = useI18n();
    const queryClient = useQueryClient();
    const sheet = useRef<SheetHandle>(null);
    const [open, setOpen] = useState(false);
    const [lang, setLang] = useState<'en' | 'hi'>(appLang === 'hi' ? 'hi' : 'en');
    const [busy, setBusy] = useState<string | null>(null);
    const key = ['loans', 'statements', loanId];
    const history = useQuery({queryKey: key, queryFn: () => getStatements(loanId), enabled: open});

    useImperativeHandle(ref, () => ({
      open: () => {
        setOpen(true);
        sheet.current?.open();
      },
    }));

    const fileOf = async (st: LoanStatement): Promise<AppFile> => {
      const name = `statement_${loanNumber}_${st.createdAt.slice(0, 10)}_${st.lang}_${st._id.slice(-6)}.pdf`;
      return (await appFileExists(FOLDER, name)) ?? downloadToApp(statementPdfPath(loanId, st._id), FOLDER, name);
    };

    const withFile = async (st: LoanStatement, action: 'share' | 'open') => {
      setBusy(st._id);
      try {
        const file = await fileOf(st);
        if (action === 'share') await shareAppFile(file, MIME.pdf, t('statement.title'));
        else await openAppFile(file, MIME.pdf).catch(() => toast.error(t('reports.noApp')));
      } catch (error) {
        toast.error(errorMessage(error, t));
      } finally {
        setBusy(null);
      }
    };

    const make = async () => {
      setBusy('new');
      try {
        const st = await createStatement(loanId, lang);
        queryClient.invalidateQueries({queryKey: key});
        setBusy(null);
        await withFile(st, 'share');
      } catch (error) {
        toast.error(errorMessage(error, t));
        setBusy(null);
      }
    };

    return (
      <BottomSheet
        ref={sheet}
        title={t('statement.title')}
        subtitle={t('loan.title', {number: loanNumber})}
        snapPoints={['70%']}
        onClose={() => setOpen(false)}>
        <Text variant="label" weight="semibold" style={s.label}>
          {t('statement.language')}
        </Text>
        <SegmentedControl<'en' | 'hi'>
          options={[
            {value: 'en', label: 'English'},
            {value: 'hi', label: 'हिन्दी'},
          ]}
          value={lang}
          onChange={setLang}
        />
        <Button
          title={t('statement.makeAndShare')}
          icon="share-variant-outline"
          loading={busy === 'new'}
          disabled={!!busy}
          onPress={make}
          style={s.make}
        />

        <Text variant="overline" color="muted" style={s.history}>
          {t('statement.history')}
        </Text>
        {history.isPending ? (
          <Skeleton height={48} />
        ) : history.data?.length ? (
          history.data.map(st => (
            <ListRow
              key={st._id}
              title={formatDateTime(st.createdAt, appLang)}
              subtitle={[st.lang === 'hi' ? 'हिन्दी' : 'English', st.createdByName].filter(Boolean).join(' · ')}
              onPress={() => withFile(st, 'open')}
              right={
                <View style={s.actions}>
                  <IconButton
                    icon="share-variant-outline"
                    label={t('common.share')}
                    variant="plain"
                    disabled={!!busy}
                    onPress={() => withFile(st, 'share')}
                  />
                </View>
              }
            />
          ))
        ) : (
          <Text color="muted">{t('statement.none')}</Text>
        )}
      </BottomSheet>
    );
  },
);

const useStyles = makeStyles(t => ({
  label: {marginBottom: t.space.sm},
  make: {marginTop: t.space.md, alignSelf: 'flex-start'},
  history: {marginTop: t.space.xl, marginBottom: t.space.xs},
  actions: {flexDirection: 'row'},
}));
