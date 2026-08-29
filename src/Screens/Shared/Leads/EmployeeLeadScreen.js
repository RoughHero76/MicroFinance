import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { apiCall } from "../../../components/api/apiUtils";
import { showToast } from "../../../components/toast/CustomToast";
import CustomToast from "../../../components/toast/CustomToast";
import { useNavigation } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";
import { useHomeContext } from "../../../components/context/HomeContext";
import { colors, spacing, radii, type, shadow } from "../../../theme/tokens";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";

const LeadItem = ({ item, onPress }) => {
  const [imageSource, setImageSource] = useState(
    item.pictureUrl ? { uri: item.pictureUrl } : ProfilePicturePlaceHolder
  );


  return (
    <TouchableOpacity style={styles.leadCard} onPress={() => onPress(item._id)}>
      <Image source={imageSource} style={styles.leadImage} />
      <View style={styles.leadInfo}>
        <Text style={styles.leadName}>{item.name}</Text>
        <Text style={styles.leadDetail}>Phone: {item.phone}</Text>
        <Text style={styles.leadDetail}>
          Loan: ₹{item.loanAmount} ({item.loanType})
        </Text>
        <View style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
          <StatusBadge status={item.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const LeadListScreen = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const navigation = useNavigation();


  const { user } = useHomeContext();

  useEffect(() => {
    fetchLeads();
  }, [page, searchQuery]);

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

  const handleLeadPress = (leadId) => {
    const lead = leads.find((item) => item._id === leadId);
    if (lead) {
      if (lead.AssignedTo === user._id) {
        navigation.navigate('LeadDetailsScreen', { leadId });
      } else {
        showToast("info", "Access Denied", "Lead is not assigned to you.");
        return
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

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Lead Statistics</Text>
          <View style={styles.statsRow}>
            <StatItem label="Total" value={stats.total} />
            <StatItem label="Pending" value={stats.pending} />
            <StatItem label="In Progress" value={stats.inProgress} />
            <StatItem label="Approved" value={stats.approved} />
            <StatItem label="Converted" value={stats.converted} />
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={colors.inkFaint} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          value={searchQuery}
          placeholderTextColor={colors.inkFaint}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={leads}
        renderItem={({ item }) => <LeadItem item={item} onPress={handleLeadPress} />}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <EmptyState
            icon="file-search-outline"
            title="No Leads Found"
            message="There are no leads to show yet."
            style={{ marginTop: spacing.xxl }}
          />
        }
        contentContainerStyle={styles.listContainer}
      />

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.disabledButton]}
            onPress={handlePrevPage}
            disabled={page === 1}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            Page {page} of {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageButton, page === totalPages && styles.disabledButton]}
            onPress={handleNextPage}
            disabled={page === totalPages}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
      <CustomToast />
    </SafeAreaView>
  );
};

const StatItem = ({ label, value }) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  statsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    margin: spacing.sm,
    ...shadow.card,
  },
  statsTitle: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    marginBottom: spacing.md,
    color: colors.ink,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    width: "30%",
    marginBottom: spacing.md,
  },
  statLabel: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
  },
  statValue: {
    fontSize: type.sizes.md,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    margin: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  searchIcon: {
    marginRight: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: type.sizes.md,
    color: colors.ink,
  },
  listContainer: {
    paddingBottom: spacing.xl,
  },
  leadCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    ...shadow.card,
  },
  leadImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.lg,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  leadDetail: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.card,
  },
  pageButton: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
  },
  disabledButton: {
    backgroundColor: colors.line,
  },
  pageButtonText: {
    color: colors.white,
    fontWeight: type.weights.bold,
  },
  pageInfo: {
    fontSize: type.sizes.md,
    color: colors.ink,
  },
});

export default LeadListScreen;
