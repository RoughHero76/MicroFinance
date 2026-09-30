import {useCallback, useMemo, useState} from 'react';
import {useInfiniteQuery, type QueryKey} from '@tanstack/react-query';

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

  return {
    items,
    total,
    /** The first page as returned, for extras sent with it (e.g. counts). */
    firstPage: query.data?.pages[0],
    isLoading: query.isPending && query.fetchStatus !== 'idle',
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
