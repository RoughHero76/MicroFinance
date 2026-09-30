// Route names for both roles. Tab routes keep the old screen names for now,
// so the old screens' navigate('AllCustomerView') calls switch tabs; each
// wave renames what it replaces.

export type AdminTabParamList = {
  Home: undefined;
  AllCustomerView: undefined;
  LoansView: undefined;
  AdminLeadsScreen: undefined;
  More: undefined;
};

export type EmployeeTabParamList = {
  Home: undefined;
  TodaysCollectionScreen: undefined;
  AllCustomerView: undefined;
  LeadListScreen: undefined;
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
  // Old screens, until their wave replaces them
  CustomerView: Record<string, unknown> | undefined;
  EditCustomer: Record<string, unknown> | undefined;
  RepaymentSchedule: Record<string, unknown> | undefined;
  CustomerRegistration: Record<string, unknown> | undefined;
  CreateLoan: Record<string, unknown> | undefined;
  LoanDetails: Record<string, unknown> | undefined;
  PaymentHistory: Record<string, unknown> | undefined;
  CloseLoan: Record<string, unknown> | undefined;
  ReportsScreen: undefined;
  NpaReportScreen: undefined;
  LoanStatusDetails: Record<string, unknown> | undefined;
  AllEmployeeView: undefined;
  EmployeeView: Record<string, unknown> | undefined;
  EditEmployee: Record<string, unknown> | undefined;
  EmployeeRegistration: undefined;
  RepaymentApprovalScreen: undefined;
  SearchScreen: undefined;
  LoanCalculator: undefined;
  LoanDetailsScreen: Record<string, unknown> | undefined;
  LeadDetailsScreen: Record<string, unknown> | undefined;
  CreateLeadScreen: undefined;
};
