import {useCallback, useMemo, useState} from 'react';
import {useInfiniteQuery, useQueryClient, type InfiniteData, type QueryKey} from '@tanstack/react-query';
import {animateNextLayout} from './motion';

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total?: number;
}

interface Options<P> {
  queryKey: QueryKey;
  fetchPage: (page: number) => Promise<P>;
  enabled?: boolean;
  /** Save the first pages on the phone for offline viewing. */
  persist?: boolean;
  staleTime?: number;
}

/**
 * Paged list with load-more-on-scroll and pull to refresh (U-05, U-06).
 * Pages never cut the list: everything is reachable by scrolling.
 */
export function useInfiniteList<P extends Page<unknown>>({
  queryKey,
  fetchPage,
  enabled = true,
  persist = false,
  staleTime,
}: Options<P>) {
  type T = P['items'][number];
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({pageParam}) => fetchPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: last => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled,
    staleTime,
    meta: persist ? {persist: true} : undefined,
  });

  const items = useMemo<T[]>(() => query.data?.pages.flatMap(p => p.items as T[]) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total;

  // Pull to refresh shows its own spinner, separate from background refetches.
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  /**
   * Takes rows out of the list at once, with an animation (W7), e.g. after
   * Approve. Returns a function that puts them back (for Undo). A refetch
   * later replaces the cache either way.
   */
  const removeLocally = useCallback(
    (match: (item: T) => boolean) => {
      const before = queryClient.getQueryData<InfiniteData<P>>(queryKey);
      if (!before) {
        return () => {};
      }
      animateNextLayout();
      queryClient.setQueryData<InfiniteData<P>>(queryKey, {
        ...before,
        pages: before.pages.map(page => ({...page, items: (page.items as T[]).filter(item => !match(item))})),
      });
      return () => {
        animateNextLayout();
        queryClient.setQueryData(queryKey, before);
      };
    },
    // queryKey is an array literal at call sites; compare it by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, JSON.stringify(queryKey)],
  );

  return {
    items,
    removeLocally,
    total,
    /** The first page as returned, for extras sent with it (e.g. counts). */
    firstPage: query.data?.pages[0],
    // Waiting to be enabled (e.g. for a saved filter) counts as loading.
    isLoading: query.isPending && (query.fetchStatus !== 'idle' || !enabled),
    isError: query.isError && items.length === 0,
    error: query.error,
    hasMore: !!query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore,
    refreshing,
    refresh,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}
