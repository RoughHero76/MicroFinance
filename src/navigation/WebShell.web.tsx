// Web: on a wide window the 5 tabs and the More list become a sidebar that
// stays on screen (the tab bar at the bottom is hidden, see AppTabBar.web).
// Entries come from navItems.ts, so they are the phone's own.

import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, View, type PressableStateCallbackType} from 'react-native';
import type {NavigationContainerRef} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {usePayQueue} from '@/features/collect/payQueue';
import {useBreakpoint} from '@/lib/useBreakpoint';
import {makeStyles} from '@/theme';
import {Avatar, BrandLogo, ConfirmSheet, Icon, Text, useConfirm} from '@/ui';
import {useAdminNav, useEmployeeNav, type RoleNav} from './navItems';

type NavRef = React.RefObject<NavigationContainerRef<any>>;

// Screens opened from a section (also straight from an address) keep that
// section highlighted.
const SECTION_OF: Record<string, string> = {
  Customer: 'Customers',
  CustomerForm: 'Customers',
  Loan: 'Loans',
  CreateLoan: 'Loans',
  CloseLoan: 'Loans',
  Lead: 'Leads',
  NewLead: 'Leads',
  Employee: 'Employees',
  EmployeeForm: 'Employees',
  EmployeeLoans: 'Employees',
  Logins: 'Employees',
};

export function WebShell({navRef, children}: {navRef: NavRef; children: React.ReactNode}) {
  const {wide} = useBreakpoint();
  const {role} = useSession();
  const s = useStyles();
  if (!wide) return <>{children}</>;
  return (
    <View style={s.row}>
      {role === 'admin' ? <AdminSidebar navRef={navRef} /> : <EmployeeSidebar navRef={navRef} />}
      <View style={s.content}>{children}</View>
    </View>
  );
}

const AdminSidebar = ({navRef}: {navRef: NavRef}) => <Sidebar nav={useAdminNav()} navRef={navRef} />;
const EmployeeSidebar = ({navRef}: {navRef: NavRef}) => <Sidebar nav={useEmployeeNav()} navRef={navRef} />;

function Sidebar({nav, navRef}: {nav: RoleNav<string>; navRef: NavRef}) {
  const s = useStyles();
  const {t} = useTranslation();
  const can = useCan();
  const {user, signOut} = useSession();
  const confirm = useConfirm();
  const unsent = usePayQueue();
  const [active, setActive] = useState('Home');
  const name = [user?.fname, user?.lname].filter(Boolean).join(' ');

  const tabs = nav.tabs.filter(tab => tab.visible !== false && tab.name !== 'More');
  const work = nav.work.filter(item => item.visible !== false);
  const tabNames = tabs.map(tab => tab.name as string);

  // Follow the screen on show: a tab, a More item's screen, or the section a
  // detail belongs to. Anywhere else the last highlight stays.
  useEffect(() => {
    const ref = navRef.current;
    if (!ref) return;
    const update = () => {
      const current = ref.getCurrentRoute()?.name;
      if (!current) return;
      const route = SECTION_OF[current] ?? current;
      if (tabNames.includes(route)) setActive(route);
      else {
        const item = work.find(w => w.route === route);
        if (item) setActive(item.key);
      }
    };
    update();
    return ref.addListener('state', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navRef, tabNames.join(','), work.map(w => w.route).join(',')]);

  const goTab = (tab: string) => navRef.current?.navigate('Tabs' as never, {screen: tab} as never);
  const goRoute = (route: string) => navRef.current?.navigate(route as never);

  return (
    <View style={s.side}>
      <ScrollView contentContainerStyle={s.sideContent}>
        <BrandLogo width={120} height={40} style={s.logo} />
        {tabs.map(tab => (
          <Item
            key={tab.name}
            icon={active === tab.name ? tab.iconFocused : tab.icon}
            label={tab.label}
            badge={tab.badge}
            active={active === tab.name}
            onPress={() => goTab(tab.name)}
          />
        ))}
        {work.length ? (
          <>
            <Text variant="caption" weight="bold" color="muted" style={s.section}>
              {(can('employee.manage') ? t('more.manage') : t('more.work')).toUpperCase()}
            </Text>
            {work.map(item => (
              <Item
                key={item.key}
                icon={item.icon}
                label={item.title}
                badge={item.badge}
                active={active === item.key}
                onPress={() => goRoute(item.route)}
              />
            ))}
          </>
        ) : null}
        <Text variant="caption" weight="bold" color="muted" style={s.section}>
          {t('more.app').toUpperCase()}
        </Text>
        <Item icon="cog-outline" label={t('more.settings')} onPress={() => goRoute('Settings')} />
        <Item icon="lifebuoy" label={t('more.support')} onPress={() => goRoute('Support')} />
        <Item
          icon="logout"
          label={t('common.logout')}
          destructive
          onPress={() =>
            confirm.ask({
              title: t('more.logoutConfirm', {brand: brand.name}),
              message: unsent.length
                ? `${t('more.logoutHint')} ${t('payQueue.logoutUnsent', {count: unsent.length})}`
                : t('more.logoutHint'),
              confirmLabel: t('common.logout'),
              destructive: true,
              onConfirm: () => signOut(),
            })
          }
        />
      </ScrollView>
      <Pressable
        onPress={() => goRoute('ProfileScreen')}
        accessibilityRole="button"
        accessibilityLabel={t('more.viewProfile')}
        style={s.user}>
        <Avatar name={name} uri={user?.profilePic} size={34} />
        <View style={s.userText}>
          <Text variant="small" weight="bold" numberOfLines={1}>
            {name || user?.userName}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {t('more.viewProfile')}
          </Text>
        </View>
      </Pressable>
      <ConfirmSheet ref={confirm.ref} />
    </View>
  );
}

function Item({
  icon,
  label,
  badge,
  active,
  destructive,
  onPress,
}: {
  icon: string;
  label: string;
  badge?: number;
  active?: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  const s = useStyles();
  const color = destructive ? 'danger' : active ? 'primary' : 'muted';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{selected: !!active}}
      style={(state: PressableStateCallbackType & {hovered?: boolean}) => [
        s.item,
        active && s.itemActive,
        !active && state.hovered && s.itemHover,
      ]}>
      <Icon name={icon} size={20} color={color} />
      <Text
        weight={active ? 'bold' : 'semibold'}
        color={destructive ? 'danger' : active ? 'primary' : 'text'}
        numberOfLines={1}
        style={s.itemLabel}>
        {label}
      </Text>
      {badge ? (
        <View style={s.badge}>
          <Text variant="caption" weight="bold" style={s.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles(t => ({
  row: {flex: 1, flexDirection: 'row', width: '100%'},
  content: {flex: 1, minWidth: 0},
  side: {width: 244, backgroundColor: t.colors.surface, borderRightWidth: 1, borderRightColor: t.colors.border},
  sideContent: {padding: t.space.md, gap: 2},
  logo: {marginBottom: t.space.md, marginLeft: t.space.sm},
  section: {marginTop: t.space.lg, marginBottom: t.space.xs, marginLeft: t.space.sm, letterSpacing: 0.8},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    paddingVertical: 10,
    paddingHorizontal: t.space.md,
    borderRadius: 12,
  },
  itemActive: {backgroundColor: t.colors.primarySoft},
  itemHover: {backgroundColor: t.colors.bg},
  itemLabel: {flex: 1},
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: t.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: t.colors.white, fontSize: 11, lineHeight: 14},
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    padding: t.space.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  userText: {flex: 1, minWidth: 0},
}));
