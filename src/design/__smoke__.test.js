/**
 * Smoke render test — renders every design-system component once to catch
 * runtime import/reference errors that syntax-checking cannot.
 * (Not shipped; deleted before handoff.)
 */
import React from 'react';
import renderer from 'react-test-renderer';

// -- Minimal environment mocks -------------------------------------------
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: () => false,
    goBack: () => {},
    navigate: () => {},
  }),
  NavigationContainer: ({ children }) => children,
}));

import * as D from './index';

const render = (node) => {
  const tree = renderer.create(node);
  tree.unmount();
  return tree.toJSON();
};

describe('design system smoke render', () => {
  test('tokens shape', () => {
    expect(D.colors.accent).toBe('#F7B500');
    expect(typeof D.spacing.xl).toBe('number');
    expect(D.statusTheme('Active').color).toBeTruthy();
  });

  test('Icon + aliases resolve', () => {
    expect(() => render(<D.Icon name="bank" size={24} />)).not.toThrow();
    expect(() => render(<D.Icon name="magnify" />)).not.toThrow(); // MDI alias
    expect(() => render(<D.Icon name="delete" />)).not.toThrow();  // MDI alias
    expect(() => render(<D.Icon name="does-not-exist" />)).not.toThrow(); // fallback
  });

  test('Button variants', () => {
    ['primary', 'accent', 'outline', 'ghost', 'danger', 'subtle'].forEach((v) => {
      expect(() => render(<D.Button label="Go" variant={v} onPress={() => {}} />)).not.toThrow();
    });
    expect(() => render(<D.Button label="L" loading icon="check" full />)).not.toThrow();
    expect(() => render(<D.Button iconOnly icon="plus" onPress={() => {}} />)).not.toThrow();
  });

  test('Card / Chip / Avatar / Divider', () => {
    expect(() => render(<D.Card tone="accent">hi</D.Card>)).not.toThrow();
    expect(() => render(<D.Card onPress={() => {}} tappable>hi</D.Card>)).not.toThrow();
    expect(() => render(<D.Chip label="Active" tone="success" icon="check" />)).not.toThrow();
    expect(() => render(<D.Avatar name="Priya Sharma" />)).not.toThrow();
    expect(() => render(<D.Avatar name="A" image="x" />)).not.toThrow();
    expect(() => render(<D.Divider />)).not.toThrow();
  });

  test('TextField', () => {
    expect(() =>
      render(
        <D.TextField
          label="Password"
          value="secret"
          onChangeText={() => {}}
          leftIcon="lock"
          secureTextEntry
          error="too short"
          rightSlot={<D.Icon name="eye" />}
        />
      )
    ).not.toThrow();
  });

  test('SegmentedControl / SearchBar', () => {
    expect(() =>
      render(<D.SegmentedControl options={['All', 'Active', 'Closed']} value="Active" onChange={() => {}} />)
    ).not.toThrow();
    expect(() => render(<D.SearchBar value="x" onChangeText={() => {}} />)).not.toThrow();
  });

  test('EmptyState / ListRow / StatCard / StatusPill', () => {
    expect(() =>
      render(
        <D.EmptyState icon="search" title="None" subtitle="msg" action={{ label: 'Add', onPress: () => {} }} />
      )
    ).not.toThrow();
    expect(() =>
      render(
        <D.ListRow
          avatar="Priya Sharma"
          title="Priya"
          subtitle="2 loans"
          right={<D.StatusPill status="Active" />}
          onPress={() => {}}
        />
      )
    ).not.toThrow();
    expect(() => render(<D.StatCard icon="bank" label="Active" value={5} tone="accent" delta="+12%" />)).not.toThrow();
  });

  test('Skeleton / LoadingView', () => {
    expect(() => render(<D.Skeleton width="100%" height={40} />)).not.toThrow();
    expect(() => render(<D.SkeletonCircle size={44} />)).not.toThrow();
    expect(() => render(<D.LoadingView label="Loading" />)).not.toThrow();
  });

  test('Screen / AppHeader / BottomSheet', () => {
    expect(() => render(<D.Screen scroll keyboardAvoid><D.Card>content</D.Card></D.Screen>)).not.toThrow();
    expect(() => render(<D.AppHeader title="Customer" right={<D.Button iconOnly icon="pencil" />} />)).not.toThrow();
    expect(() => render(<D.BottomSheet visible title="Actions" drag><D.Button label="X" /></D.BottomSheet>)).not.toThrow();
  });

  test('charts', () => {
    const data = [
      { label: 'Jan', value: 10 },
      { label: 'Feb', value: 22 },
      { label: 'Mar', value: 15 },
    ];
    expect(() => render(<D.LineChart data={data} />)).not.toThrow();
    expect(() => render(<D.BarChart data={data} />)).not.toThrow();
    expect(() =>
      render(
        <D.DonutChart
          data={[
            { label: 'A', value: 5, color: '#000' },
            { label: 'B', value: 3, color: '#f00' },
          ]}
          centerValue="8"
          centerLabel="Total"
        />
      )
    ).not.toThrow();
    expect(() => render(<D.Sparkline values={[1, 3, 2, 5]} />)).not.toThrow();
    expect(() => render(<D.ProgressRing progress={0.7} centerValue="70%" />)).not.toThrow();
  });
});
