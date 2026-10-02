// Route names for both roles. Tab routes keep the old screen names for now,
// and each wave renames what it replaces.

/** E-05: a list narrowed to one employee (from their profile). */
export type EmployeeFilter = {id: string; name: string};

export type AdminTabParamList = {
  Home: undefined;
  Customers: undefined;
  Loans: undefined;
  Leads: undefined;
  More: undefined;
};

export type EmployeeTabParamList = {
  Home: undefined;
  Collect: undefined;
  Customers: undefined;
  Leads: undefined;
  More: undefined;
};

// Screens opened on top of the tabs (both roles; each navigator registers
// the ones its role can use). Old screens take loose params.
export type AppStackParamList = {
  Tabs: undefined;
  // New shared screens (W1)
  ProfileScreen: undefined;
  Settings: undefined;
  Security: undefined;
  Support: undefined;
  About: undefined;
  KitGallery: undefined;
  // New shared screens (W2)
  Customer: {id?: string; uid?: string} | undefined;
  Loan: {loanId: string; tab?: 'overview' | 'schedule' | 'documents'};
  Overdue: {bucket?: 'all' | 'sma0' | 'sma1' | 'sma2' | 'npa'; employee?: EmployeeFilter} | undefined;
  MyPayments: undefined;
  // New admin screens (W3)
  Payments: {employee?: EmployeeFilter} | undefined;
  Activity: {loanId?: string; loanNumber?: string} | undefined;
  BusinessSettings: undefined;
  // New screens (W4)
  CustomerForm: Record<string, unknown> | undefined;
  Search: undefined;
  Lead: {id: string};
  NewLead: undefined;
  Employees: undefined;
  Employee: {uid: string};
  EmployeeForm: Record<string, unknown> | undefined;
  // Employee accounts (round E)
  Logins: {uid?: string; name?: string} | undefined;
  EmployeeLoans: {employee: EmployeeFilter};
  // New screens (W5)
  Notifications: undefined;
  SendNotification: undefined;
  Reports: undefined;
  Performance: undefined;
  Risk: undefined;
  Calculator: undefined;
  CashHandover: undefined;
  CashHandovers: undefined;
  Diagnostics: undefined;
  CreateLoan: Record<string, unknown> | undefined;
  CloseLoan: Record<string, unknown> | undefined;
};
