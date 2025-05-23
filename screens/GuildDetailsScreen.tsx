import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Image,
  SafeAreaView,
  Alert
} from 'react-native';
import { useAuth } from '../app/AuthProvider';
import { supabase } from '../app/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
// Removed LinearGradient import completely

export default function GuildDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guild, setGuild] = useState(null);
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState('member');
  const [refreshing, setRefreshing] = useState(false);
  
  // Get the guildId from route params
  const guildId = route.params?.guildId;

  const fetchGuildDetails = async () => {
    if (!guildId || !user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log(`Fetching guild details for guild ID: ${guildId}`);
      
      // Fetch guild details
      const { data: guildData, error: guildError } = await supabase
        .from('guilds')
        .select('*')
        .eq('id', guildId)
        .single();
        
      if (guildError) {
        console.error("Error fetching guild:", guildError);
        Alert.alert("Error", "Failed to load guild information");
        setLoading(false);
        return;
      }
      
      if (!guildData) {
        console.error("No guild found with ID:", guildId);
        setLoading(false);
        return;
      }
      
      console.log("Guild data retrieved:", guildData.name);
      setGuild(guildData);
      
      // Fetch guild members
      console.log("Fetching guild members...");
      
      // Examining your database schema to find the actual columns
      try {
        // First, try to fetch guild members with the minimum required fields
        const { data: membersData, error: membersError } = await supabase
          .from('guild_members')
          .select(`
            guild_id,
            user_id,
            role,
            joined_at,
            contribution_points,
            name,
            character_level
          `)
          .eq('guild_id', guildId)
          .order('contribution_points', { ascending: false });
          
        if (membersError) {
          console.error("Error fetching guild members:", membersError);
          throw membersError;
        }
        
        if (membersData && membersData.length > 0) {
          console.log(`Retrieved ${membersData.length} members from the database`);
          
          // Find user's role in this guild
          const userMember = membersData.find(member => member.user_id === user.id);
          if (userMember) {
            console.log(`Current user's role: ${userMember.role}`);
            setUserRole(userMember.role);
          }
          
          setMembers(membersData);
          setLoading(false);
          return;
        }
      } catch (queryError) {
        console.error("Error retrieving guild members:", queryError);
      }
      
      // Fallback: Simple query without character data
      const { data: basicMembersData, error: basicError } = await supabase
        .from('guild_members')
        .select('*')
        .eq('guild_id', guildId)
        .order('contribution_points', { ascending: false });
        
      if (basicError) {
        console.error("Error fetching members (fallback):", basicError);
        Alert.alert("Error", "Failed to load guild members");
        setLoading(false);
        return;
      }
      
      if (basicMembersData) {
        console.log(`Retrieved ${basicMembersData.length} members (basic data)`);
        
        // Find user's role in this guild
        const userMember = basicMembersData.find(member => member.user_id === user.id);
        if (userMember) {
          console.log(`Current user's role: ${userMember.role}`);
          setUserRole(userMember.role);
        }
        
        setMembers(basicMembersData);
      } else {
        setMembers([]);
      }
      
    } catch (error) {
      console.error("Error fetching guild details:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchGuildDetails();
  }, [guildId, user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGuildDetails();
  };

  const renderMemberItem = (member, index) => {
    // Handle potential undefined values - using index as fallback key since id doesn't exist
    const characterName = member?.name || "Unknown";
    const characterInitial = characterName.charAt(0).toUpperCase() || "?";
    const role = member?.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : "Member";
    const level = member?.character_level || "?";
    const points = member?.contribution_points || 0;
    
    return (
      <View key={`member-${index}`} style={styles.memberRow}>
        <View style={styles.memberIcon}>
          <Text style={styles.memberIconText}>{characterInitial}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{characterName}</Text>
          <Text style={styles.memberRole}>
            {role} • Level {level}
          </Text>
        </View>
        <Text style={styles.memberContribution}>{points} pts</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4e60d3" />
        <Text style={styles.loadingText}>Loading guild details...</Text>
      </SafeAreaView>
    );
  }
  
  if (!guild) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Guild not found</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Guild Banner */}
      <View style={[styles.guildBanner, { backgroundColor: '#302b63' }]}>
        <Text style={styles.guildEmblem}>{guild.emblem || '⚔️'}</Text>
        <View style={styles.guildTitleContainer}>
          <Text style={styles.guildName}>{guild.name}</Text>
          <Text style={styles.guildMotto}>"{guild.motto || 'No motto set'}"</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Refresh Button */}
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? 'Refreshing...' : 'Refresh Guild Data'}
          </Text>
        </TouchableOpacity>

        {/* Guild Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.description}>{guild.description || 'No description available.'}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{guild.level || 1}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{members.length}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{guild.xp || 0}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
          </View>
        </View>
        
        {/* Member List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Members ({members.length})</Text>
          
          {members.length === 0 ? (
            <Text style={styles.emptyText}>No members found</Text>
          ) : (
            members.map(renderMemberItem)
          )}
        </View>
        
        {/* Admin Controls - Only visible to leader and officers */}
        {/* {(userRole === 'leader' || userRole === 'officer') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin Controls</Text>
            
            <TouchableOpacity 
              style={[styles.adminButton, { backgroundColor: '#4e60d3' }]}
              onPress={() => {
                try {
                  navigation.navigate('EditGuild', { guildId: guild.id });
                } catch (error) {
                  console.error("Navigation error:", error);
                  Alert.alert("Error", "Could not navigate to Edit Guild screen");
                }
              }}
            >
              <Text style={styles.buttonText}>Edit Guild Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.adminButton, { backgroundColor: '#2a9d8f' }]}
              onPress={() => {
                try {
                  navigation.navigate('ManageMembers', { guildId: guild.id });
                } catch (error) {
                  console.error("Navigation error:", error);
                  Alert.alert("Error", "Could not navigate to Manage Members screen");
                }
              }}
            >
              <Text style={styles.buttonText}>Manage Members</Text>
            </TouchableOpacity>
            
            {userRole === 'leader' && (
              <TouchableOpacity 
                style={[styles.adminButton, { backgroundColor: '#e76f51' }]}
                onPress={() => {
                  try {
                    navigation.navigate('DisbandGuild', { guildId: guild.id });
                  } catch (error) {
                    console.error("Navigation error:", error);
                    Alert.alert("Error", "Could not navigate to Disband Guild screen");
                  }
                }}
              >
                <Text style={styles.buttonText}>Disband Guild</Text>
              </TouchableOpacity>
            )}
          </View>
        )} */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e2e',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    marginBottom: 16,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  guildBanner: {
    height: 160,
    padding: 16,
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  guildEmblem: {
    fontSize: 40,
    marginRight: 16,
  },
  guildTitleContainer: {
    flex: 1,
  },
  guildName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  guildMotto: {
    fontSize: 14,
    color: '#ddd',
    fontStyle: 'italic',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  refreshButton: {
    backgroundColor: '#2a9d8f',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  description: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#bbb',
    fontSize: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a50',
  },
  memberIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4e60d3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberRole: {
    color: '#bbb',
    fontSize: 12,
  },
  memberContribution: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#4e60d3',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  adminButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   FlatList,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   ScrollView
// } from 'react-native';
// import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
// import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import { supabase } from '../app/supabase';
// import { useAuth } from '../app/AuthProvider';
// import { Guild, GuildMember, GuildEvent } from '../types/guildTypes';
// import { RootStackParamList } from '../types/navigation';
// import Icon from 'react-native-vector-icons/Ionicons';
// import LinearGradient from 'react-native-linear-gradient';

// type GuildDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
// type GuildDetailsScreenRouteProp = RouteProp<RootStackParamList, 'GuildDetails'>;

// export default function GuildDetailsScreen() {
//   const navigation = useNavigation<GuildDetailsScreenNavigationProp>();
//   const { user } = useAuth();
//   const route = useRoute<GuildDetailsScreenRouteProp>();
//   const { guildId } = route.params;

//   const [guild, setGuild] = useState<Guild | null>(null);
//   const [members, setMembers] = useState<GuildMember[]>([]);
//   const [events, setEvents] = useState<GuildEvent[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [userRole, setUserRole] = useState<'leader' | 'officer' | 'member' | null>(null);
//   const [activeTab, setActiveTab] = useState<'info' | 'members' | 'events'>('info');

//   useEffect(() => {
//     const fetchGuildDetails = async () => {
//       setLoading(true);
      
//       // Fetch guild details
//       const { data: guildData, error: guildError } = await supabase
//         .from('guilds')
//         .select('*')
//         .eq('id', guildId)
//         .single();
      
//       if (guildError) {
//         console.error('Error fetching guild:', guildError);
//       } else if (guildData) {
//         setGuild(guildData);
//       }

//       // Fetch guild members with character data
//       const { data: membersData, error: membersError } = await supabase
//         .from('guild_members')
//         .select(`
//           *,
//           characters:user_id(name, avatar_url),
//           characters(name, level)
//         `)
//         .eq('guild_id', guildId)
//         .order('role', { ascending: true })
//         .order('contribution_points', { ascending: false });
      
//       if (membersError) {
//         console.error('Error fetching members:', membersError);
//       } else if (membersData) {
//         // Format member data
//         const formattedMembers = membersData.map((member: any) => ({
//           ...member,
//           character_name: member.character_name || 
//             (member.characters && member.characters.name) || 'Unknown',
//           character_level: member.character_level || 
//             (member.characters && member.characters.level) || 1
//         }));
        
//         setMembers(formattedMembers);
        
//         // Find current user's role
//         if (user) {
//           const currentMember = formattedMembers.find(m => m.user_id === user.id);
//           if (currentMember) {
//             setUserRole(currentMember.role);
//           }
//         }
//       }

//       // Fetch guild events
//       const { data: eventsData, error: eventsError } = await supabase
//         .from('guild_events')
//         .select('*')
//         .eq('guild_id', guildId)
//         .order('start_date', { ascending: true });
      
//       if (eventsError) {
//         console.error('Error fetching events:', eventsError);
//       } else if (eventsData) {
//         setEvents(eventsData);
//       }
      
//       setLoading(false);
//     };

//     fetchGuildDetails();
//   }, [guildId, user]);

//   const calculateLevelProgress = () => {
//     if (!guild) return 0;
//     const xpForCurrentLevel = guild.level * 1000;
//     const xpForNextLevel = (guild.level + 1) * 1000;
//     const progress = (guild.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel);
//     return Math.max(0, Math.min(1, progress)); // Ensure between 0 and 1
//   };

//   const navigateToChat = () => {
//     navigation.navigate('GuildChat', { guildId });
//   };

//   const navigateToEvents = () => {
//     navigation.navigate('GuildEvents', { guildId });
//   };

//   const leaveGuild = async () => {
//     if (!user) return;
    
//     // Leader cannot leave unless they transfer leadership
//     if (userRole === 'leader') {
//       Alert.alert(
//         "Cannot Leave Guild",
//         "As the leader, you must transfer leadership before leaving the guild.",
//         [{ text: "OK" }]
//       );
//       return;
//     }
    
//     Alert.alert(
//       "Leave Guild",
//       "Are you sure you want to leave this guild?",
//       [
//         { text: "Cancel" },
//         {
//           text: "Leave",
//           style: "destructive",
//           onPress: async () => {
//             const { error } = await supabase
//               .from('guild_members')
//               .delete()
//               .eq('guild_id', guildId)
//               .eq('user_id', user.id);
              
//             if (error) {
//               console.error('Error leaving guild:', error);
//               Alert.alert("Error", "Failed to leave guild.");
//             } else {
//               // Update member count
//               await supabase
//                 .from('guilds')
//                 .update({ member_count: guild?.member_count ? guild.member_count - 1 : 0 })
//                 .eq('id', guildId);
                
//               Alert.alert("Success", "You have left the guild.");
//               // Navigate back to guild tab in Main
//               navigation.navigate('Main', { screen: 'Guild' });
//             }
//           }
//         }
//       ]
//     );
//   };

//   const getRoleBadge = (role: string) => {
//     switch (role) {
//       case 'leader':
//         return <Icon name="crown" size={16} color="#FFD700" />;
//       case 'officer':
//         return <Icon name="shield" size={16} color="#C0C0C0" />;
//       default:
//         return null;
//     }
//   };

//   const getEventStatusBadge = (status: string) => {
//     switch (status) {
//       case 'upcoming':
//         return (
//           <View style={[styles.statusBadge, { backgroundColor: '#4e60d3' }]}>
//             <Text style={styles.statusText}>Upcoming</Text>
//           </View>
//         );
//       case 'active':
//         return (
//           <View style={[styles.statusBadge, { backgroundColor: '#32a852' }]}>
//             <Text style={styles.statusText}>Active</Text>
//           </View>
//         );
//       case 'completed':
//         return (
//           <View style={[styles.statusBadge, { backgroundColor: '#a8a832' }]}>
//             <Text style={styles.statusText}>Completed</Text>
//           </View>
//         );
//       default:
//         return null;
//     }
//   };

//   const getEventTypeIcon = (eventType: string) => {
//     switch (eventType) {
//       case 'challenge':
//         return <Icon name="fitness" size={20} color="#4e60d3" />;
//       case 'raid':
//         return <Icon name="flame" size={20} color="#ff6b6b" />;
//       case 'tournament':
//         return <Icon name="trophy" size={20} color="#ffd700" />;
//       default:
//         return <Icon name="calendar" size={20} color="#4e60d3" />;
//     }
//   };

//   const formatEventDate = (dateString: string) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//   };

//   const renderInfoTab = () => {
//     if (!guild) return null;
    
//     return (
//       <>
//         {/* Guild Info */}
//         <View style={styles.infoContainer}>
//           <Text style={styles.guildName}>{guild.name}</Text>
//           {guild.motto && <Text style={styles.motto}>"{guild.motto}"</Text>}
          
//           <View style={styles.statsRow}>
//             <View style={styles.stat}>
//               <Icon name="people" size={18} color="#4e60d3" />
//               <Text style={styles.statValue}>{guild.member_count}</Text>
//               <Text style={styles.statLabel}>Members</Text>
//             </View>
            
//             <View style={styles.stat}>
//               <Icon name="trending-up" size={18} color="#4e60d3" />
//               <Text style={styles.statValue}>{guild.level}</Text>
//               <Text style={styles.statLabel}>Level</Text>
//             </View>
            
//             <View style={styles.stat}>
//               <Icon name="calendar" size={18} color="#4e60d3" />
//               <Text style={styles.statValue}>{new Date(guild.created_at).toLocaleDateString()}</Text>
//               <Text style={styles.statLabel}>Founded</Text>
//             </View>
//           </View>
          
//           {/* Level Progress */}
//           <View style={styles.progressContainer}>
//             <View style={styles.progressLabels}>
//               <Text style={styles.levelText}>Level {guild.level}</Text>
//               <Text style={styles.xpText}>{guild.xp} / {(guild.level + 1) * 1000} XP</Text>
//             </View>
//             <View style={styles.progressBar}>
//               <View 
//                 style={[
//                   styles.progressFill, 
//                   { width: `${calculateLevelProgress() * 100}%` }
//                 ]} 
//               />
//             </View>
//           </View>
          
//           {/* Description */}
//           {guild.description && (
//             <View style={styles.descriptionContainer}>
//               <Text style={styles.sectionTitle}>About</Text>
//               <Text style={styles.description}>{guild.description}</Text>
//             </View>
//           )}
//         </View>
//       </>
//     );
//   };

//   const renderMembersTab = () => (
//     <View style={styles.tabContent}>
//       <FlatList
//         data={members}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item }: { item: GuildMember }) => (
//           <View style={styles.memberRow}>
//             <View style={styles.memberInfo}>
//               <View style={styles.memberNameContainer}>
//                 {getRoleBadge(item.role)}
//                 <Text style={styles.memberName}>{item.character_name}</Text>
//               </View>
//               <Text style={styles.memberLevel}>Level {item.character_level}</Text>
//             </View>
//             <View style={styles.memberPoints}>
//               <Text style={styles.pointsValue}>{item.contribution_points}</Text>
//               <Text style={styles.pointsLabel}>points</Text>
//             </View>
//           </View>
//         )}
//         ListEmptyComponent={
//           <Text style={styles.emptyText}>No members found</Text>
//         }
//       />
//     </View>
//   );

//   const renderEventsTab = () => (
//     <View style={styles.tabContent}>
//       <FlatList
//         data={events}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item }: { item: GuildEvent }) => (
//           <TouchableOpacity 
//             style={styles.eventCard}
//             onPress={() => navigateToEvents()}
//           >
//             <View style={styles.eventHeader}>
//               <View style={styles.eventTypeContainer}>
//                 {getEventTypeIcon(item.event_type)}
//                 <Text style={styles.eventType}>{item.event_type.charAt(0).toUpperCase() + item.event_type.slice(1)}</Text>
//               </View>
//               {getEventStatusBadge(item.status)}
//             </View>
            
//             <Text style={styles.eventTitle}>{item.title}</Text>
//             <Text style={styles.eventDescription} numberOfLines={2}>{item.description}</Text>
            
//             <View style={styles.eventFooter}>
//               <View style={styles.eventDates}>
//                 <Text style={styles.eventDateLabel}>Start: </Text>
//                 <Text style={styles.eventDate}>{formatEventDate(item.start_date)}</Text>
//               </View>
              
//               <View style={styles.eventDates}>
//                 <Text style={styles.eventDateLabel}>End: </Text>
//                 <Text style={styles.eventDate}>{formatEventDate(item.end_date)}</Text>
//               </View>
              
//               <View style={styles.eventReward}>
//                 <Icon name="star" size={12} color="#ffd700" />
//                 <Text style={styles.eventXpReward}>{item.xp_reward} XP</Text>
//               </View>
//             </View>
//           </TouchableOpacity>
//         )}
//         ListEmptyComponent={
//           <View style={styles.emptyEventContainer}>
//             <Icon name="calendar-outline" size={50} color="#4e60d330" />
//             <Text style={styles.emptyText}>No guild events found</Text>
//             {(userRole === 'leader' || userRole === 'officer') && (
//               <TouchableOpacity 
//                 style={styles.createEventButton}
//                 onPress={() => navigation.navigate('CreateGuildEvent', { guildId })}
//               >
//                 <Text style={styles.createEventButtonText}>Create Event</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         }
//       />
//     </View>
//   );

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#4e60d3" />
//       </View>
//     );
//   }

//   if (!guild) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.errorText}>Guild not found</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Guild Banner */}
//       <View style={styles.bannerContainer}>
//         {guild?.banner_url ? (
//           <Image source={{ uri: guild.banner_url }} style={styles.banner} resizeMode="cover" />
//         ) : (
//           <LinearGradient colors={['#2a2a40', '#1e1e2e']} style={styles.banner}>
//             <Text style={styles.bannerText}>{guild?.name || 'Guild'}</Text>
//           </LinearGradient>
//         )}
        
//         {guild?.emblem && (
//           <View style={styles.emblemContainer}>
//             <Image source={{ uri: guild.emblem }} style={styles.emblem} />
//           </View>
//         )}
//       </View>
      
//       {/* Tab Navigation */}
//       <View style={styles.tabContainer}>
//         <TouchableOpacity 
//           style={[styles.tabButton, activeTab === 'info' && styles.activeTabButton]}
//           onPress={() => setActiveTab('info')}
//         >
//           <Text style={[styles.tabButtonText, activeTab === 'info' && styles.activeTabText]}>Info</Text>
//         </TouchableOpacity>
        
//         <TouchableOpacity 
//           style={[styles.tabButton, activeTab === 'members' && styles.activeTabButton]}
//           onPress={() => setActiveTab('members')}
//         >
//           <Text style={[styles.tabButtonText, activeTab === 'members' && styles.activeTabText]}>
//             Members ({guild?.member_count || 0})
//           </Text>
//         </TouchableOpacity>
        
//         <TouchableOpacity 
//           style={[styles.tabButton, activeTab === 'events' && styles.activeTabButton]}
//           onPress={() => setActiveTab('events')}
//         >
//           <Text style={[styles.tabButtonText, activeTab === 'events' && styles.activeTabText]}>
//             Events ({events.length})
//           </Text>
//         </TouchableOpacity>
//       </View>
      
//       {/* Tab Content */}
//       <ScrollView style={styles.contentContainer}>
//         {activeTab === 'info' && guild && renderInfoTab()}
//         {activeTab === 'members' && renderMembersTab()}
//         {activeTab === 'events' && renderEventsTab()}
//       </ScrollView>
      
//       {/* Action Buttons */}
//       <View style={styles.actionButtonsContainer}>
//         <TouchableOpacity 
//           style={styles.chatButton}
//           onPress={navigateToChat}
//         >
//           <Icon name="chatbubbles" size={24} color="#fff" />
//           <Text style={styles.chatButtonText}>Guild Chat</Text>
//         </TouchableOpacity>
        
//         {userRole && (
//           <TouchableOpacity style={styles.leaveButton} onPress={leaveGuild}>
//             <Icon name="exit-outline" size={24} color="#fff" />
//             <Text style={styles.leaveButtonText}>Leave Guild</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#1e1e2e',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#1e1e2e',
//   },
//   errorText: {
//     color: '#ff6b6b',
//     textAlign: 'center',
//     marginTop: 20,
//     fontSize: 16,
//   },
//   bannerContainer: {
//     height: 150,
//     position: 'relative',
//   },
//   banner: {
//     width: '100%',
//     height: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   bannerText: {
//     color: '#fff',
//     fontSize: 32,
//     fontWeight: 'bold',
//     textShadowColor: 'rgba(0, 0, 0, 0.5)',
//     textShadowOffset: { width: 1, height: 1 },
//     textShadowRadius: 3,
//   },
//   emblemContainer: {
//     position: 'absolute',
//     bottom: -30,
//     left: 20,
//     backgroundColor: '#1e1e2e',
//     borderRadius: 35,
//     padding: 3,
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   emblem: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#2a2a40',
//     marginTop: 20,
//   },
//   tabButton: {
//     flex: 1,
//     paddingVertical: 15,
//     alignItems: 'center',
//   },
//   activeTabButton: {
//     borderBottomWidth: 3,
//     borderBottomColor: '#4e60d3',
//   },
//   tabButtonText: {
//     color: '#aaa',
//     fontWeight: '500',
//   },
//   activeTabText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   contentContainer: {
//     flex: 1,
//   },
//   infoContainer: {
//     padding: 20,
//   },
//   guildName: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 5,
//   },
//   motto: {
//     fontSize: 14,
//     color: '#ccc',
//     fontStyle: 'italic',
//     marginBottom: 15,
//   },
//   statsRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginVertical: 15,
//   },
//   stat: {
//     alignItems: 'center',
//     padding: 10,
//     backgroundColor: '#2a2a40',
//     borderRadius: 10,
//     minWidth: 90,
//   },
//   statValue: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginTop: 5,
//   },
//   statLabel: {
//     color: '#aaa',
//     fontSize: 12,
//   },
//   progressContainer: {
//     marginVertical: 15,
//   },
//   progressLabels: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 5,
//   },
//   levelText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   xpText: {
//     color: '#aaa',
//     fontSize: 12,
//   },
//   progressBar: {
//     height: 8,
//     backgroundColor: '#2a2a40',
//     borderRadius: 5,
//     overflow: 'hidden',
//   },
//   progressFill: {
//     height: '100%',
//     backgroundColor: '#4e60d3',
//   },
//   descriptionContainer: {
//     marginVertical: 15,
//   },
//   description: {
//     color: '#ccc',
//     lineHeight: 20,
//   },
//   sectionTitle: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 10,
//   },
//   tabContent: {
//     padding: 20,
//   },
//   memberRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#333',
//   },
//   memberInfo: {
//     flex: 1,
//   },
//   memberNameContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   memberName: {
//     color: '#fff',
//     fontSize: 16,
//     marginLeft: 5,
//   },
//   memberLevel: {
//     color: '#aaa',
//     fontSize: 12,
//     marginTop: 3,
//   },
//   memberPoints: {
//     alignItems: 'flex-end',
//   },
//   pointsValue: {
//     color: '#4e60d3',
//     fontWeight: 'bold',
//   },
//   pointsLabel: {
//     color: '#aaa',
//     fontSize: 12,
//   },
//   eventCard: {
//     backgroundColor: '#2a2a40',
//     borderRadius: 10,
//     padding: 15,
//     marginBottom: 15,
//   },
//   eventHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   eventTypeContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   eventType: {
//     color: '#aaa',
//     marginLeft: 5,
//     fontSize: 12,
//     textTransform: 'uppercase',
//   },
//   statusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   statusText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   eventTitle: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 5,
//   },
//   eventDescription: {
//     color: '#ccc',
//     fontSize: 14,
//     marginBottom: 10,
//   },
//   eventFooter: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   eventDates: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   eventDateLabel: {
//     color: '#aaa',
//     fontSize: 12,
//   },
//   eventDate: {
//     color: '#fff',
//     fontSize: 12,
//   },
//   eventReward: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   eventXpReward: {
//     color: '#ffd700',
//     fontWeight: 'bold',
//     fontSize: 12,
//     marginLeft: 3,
//   },
//   emptyText: {
//     color: '#aaa',
//     textAlign: 'center',
//     marginTop: 20,
//   },
//   emptyEventContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 30,
//   },
//   createEventButton: {
//     backgroundColor: '#4e60d3',
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//     borderRadius: 20,
//     marginTop: 15,
//   },
//   createEventButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   actionButtonsContainer: {
//     flexDirection: 'row',
//     padding: 15,
//     borderTopWidth: 1,
//     borderTopColor: '#333',
//   },
//   chatButton: {
//     flex: 1,
//     backgroundColor: '#4e60d3',
//     borderRadius: 10,
//     padding: 15,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 10,
//   },
//   chatButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     marginLeft: 8,
//   },
//   leaveButton: {
//     flex: 1,
//     backgroundColor: '#ff6b6b',
//     borderRadius: 10,
//     padding: 15,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   leaveButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     marginLeft: 8,
//   }
// });