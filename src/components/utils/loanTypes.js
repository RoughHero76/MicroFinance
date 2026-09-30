// utils/loanTypes.js
// One list of loan types for leads and loans; mirrors the backend's
// src/utils/loanTypes.js. The value is what the server stores.
export const LOAN_TYPES = [
    { value: 'Personal', label: 'Personal Loan' },
    { value: 'Home', label: 'Home Loan' },
    { value: 'Business', label: 'Business Loan' },
    { value: 'Education', label: 'Education Loan' },
    { value: 'Vehicle', label: 'Vehicle Loan' },
    { value: 'Gold', label: 'Gold Loan' },
    { value: 'Other', label: 'Other' },
];

// Older leads stored the label ("Gold Loan"); both forms show the same label.
export const loanTypeLabel = (value) => {
    if (!value) return 'N/A';
    const base = String(value).trim().replace(/\s+loan$/i, '').toLowerCase();
    const type = LOAN_TYPES.find(t => t.value.toLowerCase() === base);
    return type ? type.label : value;
};
