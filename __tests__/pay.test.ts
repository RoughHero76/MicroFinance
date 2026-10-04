// Recording a payment: admins can record on behalf of an employee; without a
// choice, the payment is recorded as whoever is signed in.

import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {recordPayment} from '@/features/loans/api';
import {api} from '@/lib/api';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('recordPayment', () => {
  const base = {loanId: 'L1', installmentId: 'I1', amount: 1065, paymentMethod: 'Cash' as const};

  it('sends the employee when recording on their behalf', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({data: {}} as never);
    await recordPayment({...base, collectedBy: 'E1'});
    expect(post).toHaveBeenCalledWith('/employee/loan/pay', expect.objectContaining({collectedBy: 'E1', amount: 1065}));
  });

  it('sends no collector otherwise', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({data: {}} as never);
    await recordPayment(base);
    expect((post.mock.calls[0][1] as {collectedBy?: string}).collectedBy).toBeUndefined();
  });
});
