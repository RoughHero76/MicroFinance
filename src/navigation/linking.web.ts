// Web addresses for the screens, so a customer or loan can be bookmarked or
// shared as a link, and the browser's back button works.

import {
  getPathFromState as defaultPathFromState,
  getStateFromPath as defaultStateFromPath,
  type LinkingOptions,
} from '@react-navigation/native';
import {brand} from '@/brand';

type State = Parameters<typeof defaultPathFromState>[0];

const hasObjectParam = (params: object | undefined) =>
  !!params && Object.values(params).some(value => value !== null && typeof value === 'object');

// Screens that can't open without these, when reached from a bare address.
const REQUIRED: Record<string, string> = {CreateLoan: 'customerUid', CloseLoan: 'loanId'};

export const linking: LinkingOptions<ReactNavigation.RootParamList> | undefined = {
  prefixes: [window.location.origin],
  config: {
    // A detail opened from an address (a bookmark, a reload) gets the tabs
    // underneath it, so it has a back button.
    initialRouteName: 'Tabs' as never,
    screens: {
      Tabs: {
        path: '',
        screens: {Home: '', Collect: 'collect', Customers: 'customers', Loans: 'loans', Leads: 'leads', More: 'more'},
      },
      Customer: 'customers/:id',
      CustomerForm: 'customer-form',
      Loan: 'loans/:loanId',
      CreateLoan: 'create-loan',
      CloseLoan: 'close-loan',
      Lead: 'leads/:id',
      NewLead: 'new-lead',
      Employees: 'employees',
      Employee: 'employees/:uid',
      EmployeeForm: 'employee-form',
      EmployeeLoans: 'employee-loans',
      Logins: 'logins',
      Payments: 'payments',
      MyPayments: 'my-payments',
      Overdue: 'overdue',
      Reports: 'reports',
      Performance: 'performance',
      Risk: 'risk',
      Activity: 'activity',
      Notifications: 'notifications',
      SendNotification: 'send-notification',
      Calculator: 'calculator',
      CashHandover: 'cash-handover',
      CashHandovers: 'cash-handovers',
      Search: 'search',
      ProfileScreen: 'profile',
      Settings: 'settings',
      Security: 'security',
      Support: 'support',
      About: 'about',
      BusinessSettings: 'business-settings',
      Diagnostics: 'diagnostics',
    },
  },
  // A screen carrying a whole record (an edit form, a list narrowed to one
  // employee) can't be rebuilt from an address, so it keeps the address of
  // the screen under it: a reload shows that screen instead of a broken one.
  getPathFromState(state, options) {
    let current = state as State;
    while (current.routes.length > 1) {
      const top = current.routes[current.index ?? current.routes.length - 1];
      if (!hasObjectParam(top.params as object | undefined)) break;
      const routes = current.routes.slice(0, -1);
      current = {...current, routes, index: routes.length - 1} as State;
    }
    return defaultPathFromState(current, options);
  },
  getStateFromPath(path, options) {
    const state = defaultStateFromPath(path, options);
    const top = state?.routes[state.routes.length - 1];
    const params = top?.params as Record<string, unknown> | undefined;
    const needs = top && REQUIRED[top.name];
    // An address saved from a record that never fitted in it.
    const broken = Object.values(params ?? {}).includes('[object Object]');
    if (state && top && ((needs && !params?.[needs]) || broken)) {
      const routes = state.routes.slice(0, -1);
      return {...state, routes, index: routes.length - 1} as typeof state;
    }
    return state;
  },
};

/** Browser tab title: "Customers · EviFinance". */
export const documentTitle = {
  formatter: (options: {title?: string} | undefined, route: {name: string} | undefined) =>
    `${options?.title ?? route?.name ?? ''} · ${brand.name}`.replace(/^ · /, ''),
};
