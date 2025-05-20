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
import { useNavigation } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";
import { useHomeContext } from "../../../components/context/HomeContext";

const LeadItem = ({ item, onPress }) => {
  const [imageSource, setImageSource] = useState(
    item.pictureUrl ? { uri: item.pictureUrl } : ProfilePicturePlaceHolder
  );


  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "#FFC107";
      case "InProgress":
        return "#2196F3";
      case "Approved":
        return "#4CAF50";
      case "Rejected":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  return (
    <TouchableOpacity style={styles.leadCard} onPress={() => onPress(item._id)}>
      <Image source={imageSource} style={styles.leadImage} />
      <View style={styles.leadInfo}>
        <Text style={styles.leadName}>{item.name}</Text>
        <Text style={styles.leadDetail}>Phone: {item.phone}</Text>
        <Text style={styles.leadDetail}>
          Loan: ₹{item.loanAmount} ({item.loanType})
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
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
          <ActivityIndicator size="large" color="#4CAF50" />
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
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={leads}
        renderItem={({ item }) => <LeadItem item={item} onPress={handleLeadPress} />}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <Text style={styles.noLeadsText}>No leads found</Text>
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
    backgroundColor: "#f0f0f0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    margin: 10,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    width: "30%",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: 10,
    paddingHorizontal: 10,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333",
  },
  listContainer: {
    paddingBottom: 20,
  },
  leadCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    elevation: 3,
  },
  leadImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  leadDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 5,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  noLeadsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
  },
  pageButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  pageButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  pageInfo: {
    fontSize: 16,
    color: "#333",
  },
});

export default LeadListScreen;