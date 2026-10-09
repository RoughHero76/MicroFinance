import {describe, expect, it} from '@jest/globals';
import {openFromList, popPane, pushInPane, setTopParams} from '@/navigation/splitNav';

describe('split view pane stack', () => {
  it('a row in the list starts the pane over', () => {
    const a = openFromList([], 'Customer', {id: '1'});
    const b = openFromList(a, 'Customer', {id: '2'});
    expect(b).toHaveLength(1);
    expect(b[0].params).toEqual({id: '2'});
  });

  it('a link inside a detail opens on top, and back returns', () => {
    const customer = openFromList([], 'Customer', {id: '1'});
    const loan = pushInPane(customer, 'Loan', {loanId: 'L1'});
    expect(loan.map(e => e.name)).toEqual(['Customer', 'Loan']);
    expect(popPane(loan).map(e => e.name)).toEqual(['Customer']);
    expect(popPane(popPane(loan))).toEqual([]);
  });

  it('the same screen again replaces instead of piling up', () => {
    const a = pushInPane(openFromList([], 'Customer', {id: '1'}), 'Loan', {loanId: 'L1'});
    const b = pushInPane(a, 'Loan', {loanId: 'L2'});
    expect(b.map(e => e.name)).toEqual(['Customer', 'Loan']);
    expect(b[1].params).toEqual({loanId: 'L2'});
    expect(b[1].key).not.toBe(a[1].key);
  });

  it('merges new params into the top screen', () => {
    const a = openFromList([], 'Loan', {loanId: 'L1', tab: 'overview'});
    expect(setTopParams(a, {tab: 'schedule'})[0].params).toEqual({loanId: 'L1', tab: 'schedule'});
    expect(setTopParams([], {x: 1})).toEqual([]);
  });
});
