// utils/repaymentScheduleHelpers.js

// schedule.amount is overloaded: it's the cumulative amount paid so far while
// PartiallyPaid, but the full scheduled amount for every other status —
// including Pending/Overdue, where nothing has actually been paid yet.
export const getAmountPaidSoFar = (item) => {
    if (item.status === 'PartiallyPaid') return item.amount;
    if (['Paid', 'PartiallyPaidFullyPaid', 'OverduePaid', 'AdvancePaid'].includes(item.status)) {
        return item.originalAmount || item.amount;
    }
    return 0; // Pending, Overdue, Waived — nothing paid on this EMI yet
};

// A repayment's `amount` is its total, which can be spread across several
// schedules. `scheduleAllocations` (when present) says exactly how much of
// that total landed on a specific schedule; older repayments or ones that
// only ever touched one schedule won't have it, so fall back to the total.
export const getAllocationForSchedule = (repayment, scheduleId) => {
    if (repayment.scheduleAllocations && repayment.scheduleAllocations.length > 0) {
        const match = repayment.scheduleAllocations.find(
            (allocation) => (allocation.schedule?._id || allocation.schedule) === scheduleId
        );
        if (match) return match.amount;
    }
    return repayment.amount;
};
