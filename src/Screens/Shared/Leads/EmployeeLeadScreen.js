import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiCall } from "../../../components/api/apiUtils";
import { showToast } from "../../../components/toast/CustomToast";
import CustomToast from "../../../components/toast/CustomToast";
import { useNavigation } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";
import { useHomeContext } from "../../../components/context/HomeContext";
import Icon from "../../../design/Icon";
import Card from "../../../design/components/Card";
import Button from "../../../design/components/Button";
import TextField from "../../../design/components/TextField";
import EmptyState from "../../../design/components/EmptyState";
import Skeleton from "../../../design/components/Skeleton";
import { colors, spacing, radius, type } from "../../../design/tokens";

/**
 * Employee lead list — rebuilt on the "Ink & Amber" design system.
 *  - behaviour preserved 1:1: the same /api/employee/lead fetch
 *    (page / limit=10 / search), stats + pagination from the response,
 *    the assignment guard on press (only your own leads open, everything
 *    else shows the 'Lead is not assigned to you' info toast), search
 *    reset-to-page-1, and Previous/Next pagination
 *  - toasts keep their original 3-arg (type, title, message) shape
 *  - fix: the original fired a network request on *every* keystroke;
 *    the fetch is now debounced 300ms (identical end state, no request
 *    storm)
 *  - status colours mapped to the semantic tokens: Pending → warning,
 *    InProgress → info, Approved → success, Rejected → danger,
 *    anything else → neutral
 *  - design: a stats strip, a design search field, lead cards with
 *    avatar + icon detail rows + status pill, Previous/Next pagination
 *    buttons, skeletons and a proper empty state
 */

const STATUS_CONFIG = {
  Pending: { bg: colors.warningSoft, fg: colors.warningInk },
  InProgress: { bg: colors.infoSoft, fg: colors.infoInk },
  Approved: { bg: colors.successSoft, fg: colors.successInk },
  Rejected: { bg: colors.dangerSoft, fg: colors.dangerInk },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { bg: colors.neutralSoft, fg: colors.neutralInk };
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusBadgeText, { color: config.fg }]} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
};

const DetailRow = ({ icon, children }) => (
  <View style={styles.detailRow}>
    <Icon name={icon} size={15} color={colors.inkMuted} />
    <Text style={styles.detailText} numberOfLines={1}>
      {children}
    </Text>
  </View>
);

const LeadItem = React.memo(({ item, onPress }) => (
  <Card elevation="subtle" onPress={() => onPress(item._id)} style={{ marginBottom: spacing.md }}>
    <View style={styles.leadRow}>
      <Image
        source={item.pictureUrl ? { uri: item.pictureUrl } : ProfilePicturePlaceHolder}
        style={styles.leadImage}
        resizeMode="cover"
      />
      <View style={styles.leadInfo}>
        <Text style={styles.leadName} numberOfLines={1}>
          {item.name}
        </Text>
        <DetailRow icon="phone">Phone: {item.phone}</DetailRow>
        <DetailRow icon="currency-inr">
          Loan: ₹{item.loanAmount} ({item.loanType})
        </DetailRow>
        <View style={styles.statusWrap}>
          <StatusBadge status={item.status} />
        </View>
      </View>
      <Icon name="chevron-right" size={20} color={colors.borderStrong} />
    </View>
  </Card>
));

const StatChip = ({ icon, label, value, tint }) => (
  <View style={styles.statChip}>
    <Icon name={icon} size={14} color={tint} />
    <Text style={styles.statChipText} numberOfLines={1}>
      {label} {value}
    </Text>
  </View>
);

const LoadingList = () => (
  <View style={styles.page}>
    <Card padded={false} style={{ marginBottom: spacing.md }}>
      <View style={{ padding: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={86} height={28} radius={radius.full} />
        ))}
      </View>
    </Card>
    {[0, 1, 2].map((i) => (
      <Card key={i} padded={false} style={{ marginBottom: spacing.md }}>
        <View style={{ padding: spacing.lg, flexDirection: 'row', gap: spacing.sm }}>
          <Skeleton width={56} height={56} radius={radius.full} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Skeleton width="50%" height={16} />
            <Skeleton width="70%" height={12} />
            <Skeleton width="60%" height={12} />
          </View>
        </View>
      </Card>
    ))}
  </View>
);

const LeadListScreen = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const navigation = useNavigation();
  const { user } = useHomeContext();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: 10,
        search: searchQuery,
      }).toString();
      const response = await apiCall(`/api/employee/lead?${queryParams}`, "GET");
      if (response.status === "success") {
        setLeads(response.data.leads);
        setStats(response.data.stats);
        setTotalPages(response.pagination.totalPages);
      } else {
        showToast("error", "Error", response.message || "Failed to fetch leads");
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      showToast("error", "Error", "An error occurred while fetching leads");
    } finally {
      setLoading(false);
    }
  };

  // Debounced so a keystroke doesn't fire a request (original refetched per
  // character); the resolved fetch is identical to the original.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  const handleLeadPress = (leadId) => {
    const lead = leads.find((item) => item._id === leadId);
    if (lead) {
      if (lead.AssignedTo === user?._id) {
        navigation.navigate('LeadDetailsScreen', { leadId });
      } else {
        showToast("info", "Access Denied", "Lead is not assigned to you.");
        return;
      }
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    setPage(1);
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  if (loading && page === 1 && leads.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingList />
        <CustomToast />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {stats && (
        <Card padded={false} style={styles.statsCard}>
          <Text style={styles.statsTitle}>Lead Statistics</Text>
          <View style={styles.statsRow}>
            <StatChip icon="briefcase" label="Total" value={stats.total} tint={colors.neutralInk} />
            <StatChip icon="clock" label="Pending" value={stats.pending} tint={colors.warningInk} />
            <StatChip icon="progress-check" label="In Progress" value={stats.inProgress} tint={colors.infoInk} />
            <StatChip icon="check-circle" label="Approved" value={stats.approved} tint={colors.successInk} />
            <StatChip icon="trending-up" label="Converted" value={stats.converted} tint={colors.primary} />
          </View>
        </Card>
      )}

      <View style={styles.searchWrap}>
        <TextField
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search leads..."
          leftIcon="search"
          rightSlot={
            searchQuery.length > 0 ? (
              <Button iconOnly icon="close-circle" size="sm" onPress={() => handleSearch('')} />
            ) : null
          }
        />
      </View>

      <FlatList
        data={leads}
        renderItem={({ item }) => <LeadItem item={item} onPress={handleLeadPress} />}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="lead-pencil"
              title="No leads found"
              subtitle="Leads matching your search will appear here."
              style={{ marginTop: spacing.xxxl }}
            />
          )
        }
        contentContainerStyle={styles.page}
      />

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <Button
            label="Previous"
            icon="chevron-left"
            variant="outline"
            size="sm"
            disabled={page === 1}
            onPress={handlePrevPage}
          />
          <Text style={styles.pageInfo}>
            Page {page} of {totalPages}
          </Text>
          <Button
            label="Next"
            icon="chevron-right"
            variant="accent"
            size="sm"
            disabled={page === totalPages}
            onPress={handleNextPage}
          />
        </View>
      )}
      <CustomToast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  page: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  statsCard: {
    margin: spacing.md,
    marginBottom: 0,
  },
  statsTitle: {
    ...type.bodyBold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  statChipText: {
    ...type.caption,
    fontWeight: '600',
    color: colors.ink,
    marginLeft: 5,
  },
  searchWrap: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },

  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadImage: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    marginRight: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  leadInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  leadName: {
    ...type.h2,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  detailText: {
    ...type.sub,
    color: colors.inkSecondary,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  statusWrap: {
    marginTop: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...type.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageInfo: {
    ...type.bodyBold,
    color: colors.ink,
  },
});

export default LeadListScreen;
