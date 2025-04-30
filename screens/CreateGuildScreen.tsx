    import React, { useState } from 'react';
    import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    } from 'react-native';
    import { useAuth } from '../app/AuthProvider';
    import { supabase } from '../app/supabase';
    import { useNavigation } from '@react-navigation/native';
    import { NativeStackNavigationProp } from '@react-navigation/native-stack';
    import { RootStackParamList } from '../types/navigation';
    import { Ionicons } from '@expo/vector-icons';
    import { LinearGradient } from 'expo-linear-gradient';

    type CreateGuildNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateGuild'>;

    // Guild emblems to choose from
    const GUILD_EMBLEMS = ['⚔️', '🏃', '🧘', '🛡️', '💪', '🏋️', '🧠', '🧗', '🏆', '🏅'];

    // Guild tags available for selection
    const GUILD_TAGS = [
    { id: 'strength', label: 'Strength' },
    { id: 'cardio', label: 'Cardio' },
    { id: 'flexibility', label: 'Flexibility' },
    { id: 'endurance', label: 'Endurance' },
    { id: 'balance', label: 'Balance' },
    { id: 'hiit', label: 'HIIT' },
    { id: 'yoga', label: 'Yoga' },
    { id: 'casual', label: 'Casual' },
    { id: 'competitive', label: 'Competitive' },
    { id: 'beginner', label: 'Beginner Friendly' },
    ];

    export default function CreateGuildScreen() {
    const navigation = useNavigation<CreateGuildNavigationProp>();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [creating, setCreating] = useState(false);
    
    // Guild form data
    const [guildName, setGuildName] = useState('');
    const [guildMotto, setGuildMotto] = useState('');
    const [guildDescription, setGuildDescription] = useState('');
    const [selectedEmblem, setSelectedEmblem] = useState('⚔️');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [guildPrivacy, setGuildPrivacy] = useState('public'); // public, restricted, private
    
    const handleNextStep = () => {
        // Validate first step
        if (currentStep === 1) {
        if (!guildName.trim()) {
            Alert.alert('Required Field', 'Please enter a name for your guild');
            return;
        }
        if (guildName.length < 3) {
            Alert.alert('Invalid Guild Name', 'Guild name must be at least 3 characters');
            return;
        }
        }
        
        // Validate second step
        if (currentStep === 2) {
        if (selectedTags.length === 0) {
            Alert.alert('Required Field', 'Please select at least one guild tag');
            return;
        }
        }
        
        setCurrentStep(prev => prev + 1);
    };
    
    const handlePreviousStep = () => {
        setCurrentStep(prev => prev - 1);
    };
    
    const toggleTag = (tagId: string) => {
        if (selectedTags.includes(tagId)) {
        setSelectedTags(selectedTags.filter(id => id !== tagId));
        } else {
        if (selectedTags.length < 3) {
            setSelectedTags([...selectedTags, tagId]);
        } else {
            Alert.alert('Maximum Tags', 'You can select up to 3 tags for your guild');
        }
        }
    };
    
    const createGuild = async () => {
        if (!user) return;
      
        if (!guildDescription.trim()) {
          Alert.alert('Required Field', 'Please enter a description for your guild');
          return;
        }
      
        setCreating(true);
      
        try {
          // 1. Insert new guild into the "guilds" table
          const { data: guildData, error: guildError } = await supabase
            .from('guilds')
            .insert([
              {
                name: guildName.trim(),
                description: guildDescription.trim(),
                motto: guildMotto.trim() || 'United we train, together we gain',
                emblem: selectedEmblem,
                leader_id: user.id,
                member_count: 1,
                level: 1,
                xp: 0,
                privacy: guildPrivacy,
                tags: selectedTags,
                created_at: new Date().toISOString(),
              },
            ])
            .select('id') // get back the guild ID
            .single();
      
          if (guildError) throw guildError;
      
          // 2. Insert the user into "guild_members" as the leader
          const { error: memberError } = await supabase.from('guild_members').insert([
            {
              guild_id: guildData.id,
              user_id: user.id,
              role: 'leader',
              joined_at: new Date().toISOString(),
              contribution_points: 0,
            },
          ]);
      
          if (memberError) throw memberError;
      
          // 3. Navigate to guilds tab
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main', params: { screen: 'Guilds' } }],
          });
        } catch (error) {
          console.error('Error creating guild:', error);
          Alert.alert('Error', 'Failed to create guild. Please try again.');
        } finally {
          setCreating(false);
        }
      };
      
    
    // Render step 1: Basic Guild Info
    const renderStep1 = () => (
        <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Guild Basics</Text>
        <Text style={styles.stepDescription}>
            Let's start with the essentials for your new guild
        </Text>
        
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Guild Name *</Text>
            <TextInput
            style={styles.textInput}
            placeholder="Enter a name for your guild"
            placeholderTextColor="#aaa"
            value={guildName}
            onChangeText={setGuildName}
            maxLength={25}
            />
            <Text style={styles.characterCount}>{guildName.length}/25</Text>
        </View>
        
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Guild Motto</Text>
            <TextInput
            style={styles.textInput}
            placeholder="Enter a short, catchy motto"
            placeholderTextColor="#aaa"
            value={guildMotto}
            onChangeText={setGuildMotto}
            maxLength={40}
            />
            <Text style={styles.characterCount}>{guildMotto.length}/40</Text>
        </View>
        
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Choose an Emblem</Text>
            <View style={styles.emblemSelector}>
            {GUILD_EMBLEMS.map((emblem) => (
                <TouchableOpacity
                key={emblem}
                style={[
                    styles.emblemOption,
                    selectedEmblem === emblem && styles.selectedEmblemOption
                ]}
                onPress={() => setSelectedEmblem(emblem)}
                >
                <Text style={styles.emblemText}>{emblem}</Text>
                </TouchableOpacity>
            ))}
            </View>
        </View>
        </View>
    );
    
    // Render step 2: Guild Tags and Privacy
    const renderStep2 = () => (
        <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Guild Classification</Text>
        <Text style={styles.stepDescription}>
            Help others find your guild by adding tags and setting privacy
        </Text>
        
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Guild Tags * <Text style={styles.subText}>(Select up to 3)</Text></Text>
            <View style={styles.tagsContainer}>
            {GUILD_TAGS.map((tag) => (
                <TouchableOpacity
                key={tag.id}
                style={[
                    styles.tagOption,
                    selectedTags.includes(tag.id) && styles.selectedTagOption
                ]}
                onPress={() => toggleTag(tag.id)}
                >
                <Text 
                    style={[
                    styles.tagText,
                    selectedTags.includes(tag.id) && styles.selectedTagText
                    ]}
                >
                    {tag.label}
                </Text>
                </TouchableOpacity>
            ))}
            </View>
        </View>
        
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Guild Privacy</Text>
            
            <TouchableOpacity
            style={[
                styles.privacyOption,
                guildPrivacy === 'public' && styles.selectedPrivacyOption
            ]}
            onPress={() => setGuildPrivacy('public')}
            >
            <View style={styles.privacyHeader}>
                <Ionicons name="globe-outline" size={24} color="#4e60d3" />
                <Text style={styles.privacyTitle}>Public</Text>
            </View>
            <Text style={styles.privacyDescription}>
                Anyone can find and join your guild
            </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
            style={[
                styles.privacyOption,
                guildPrivacy === 'restricted' && styles.selectedPrivacyOption
            ]}
            onPress={() => setGuildPrivacy('restricted')}
            >
            <View style={styles.privacyHeader}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#4e60d3" />
                <Text style={styles.privacyTitle}>Restricted</Text>
            </View>
            <Text style={styles.privacyDescription}>
                Anyone can find but approval is required to join
            </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
            style={[
                styles.privacyOption,
                guildPrivacy === 'private' && styles.selectedPrivacyOption
            ]}
            onPress={() => setGuildPrivacy('private')}
            >
            <View style={styles.privacyHeader}>
                <Ionicons name="lock-closed-outline" size={24} color="#4e60d3" />
                <Text style={styles.privacyTitle}>Private</Text>
            </View>
            <Text style={styles.privacyDescription}>
                Only invited members can join, not visible in searches
            </Text>
            </TouchableOpacity>
        </View>
        </View>
    );
    
    // Render step 3: Guild Description
    const renderStep3 = () => (
        <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Final Details</Text>
        <Text style={styles.stepDescription}>
            Describe your guild to attract members with similar fitness goals
        </Text>
        
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Guild Description *</Text>
            <TextInput
            style={[styles.textInput, styles.textareaInput]}
            placeholder="Tell others what your guild is about, what fitness goals you focus on, and what kind of members you're looking for..."
            placeholderTextColor="#aaa"
            value={guildDescription}
            onChangeText={setGuildDescription}
            multiline={true}
            numberOfLines={6}
            maxLength={300}
            textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{guildDescription.length}/300</Text>
        </View>
        
        <View style={styles.guildPreview}>
            <LinearGradient 
            colors={['#302b63', '#24243e']} 
            style={styles.previewBanner}
            >
            <Text style={styles.previewEmblem}>{selectedEmblem}</Text>
            <View style={styles.previewTitleContainer}>
                <Text style={styles.previewName}>
                {guildName || 'Your Guild Name'}
                </Text>
                <Text style={styles.previewMotto}>
                "{guildMotto || 'United we train, together we gain'}"
                </Text>
            </View>
            </LinearGradient>
            
            <View style={styles.previewDetails}>
            <Text style={styles.previewLabel}>Tags:</Text>
            <View style={styles.previewTags}>
                {selectedTags.length > 0 ? (
                GUILD_TAGS.filter(tag => selectedTags.includes(tag.id)).map(tag => (
                    <View key={tag.id} style={styles.previewTagChip}>
                    <Text style={styles.previewTagText}>{tag.label}</Text>
                    </View>
                ))
                ) : (
                <Text style={styles.noPreviewContent}>No tags selected</Text>
                )}
            </View>
            
            <Text style={styles.previewLabel}>Privacy:</Text>
            <Text style={styles.previewPrivacy}>
                {guildPrivacy.charAt(0).toUpperCase() + guildPrivacy.slice(1)}
            </Text>
            </View>
        </View>
        </View>
    );
    
    return (
        <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
        <View style={styles.header}>
            <TouchableOpacity 
            style={styles.backButton}
            onPress={currentStep === 1 ? () => navigation.goBack() : handlePreviousStep}
            >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Guild</Text>
            <Text style={styles.stepIndicator}>Step {currentStep}/3</Text>
        </View>
        
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
        </ScrollView>
        
        <View style={styles.footer}>
            {currentStep < 3 ? (
            <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleNextStep}
            >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
            ) : (
            <TouchableOpacity 
                style={[styles.primaryButton, creating && styles.disabledButton]}
                onPress={createGuild}
                disabled={creating}
            >
                {creating ? (
                <ActivityIndicator size="small" color="#fff" />
                ) : (
                <>
                    <Text style={styles.primaryButtonText}>Create Guild</Text>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                </>
                )}
            </TouchableOpacity>
            )}
        </View>
        </KeyboardAvoidingView>
    );
    }

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1e1e2e',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 24,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8f8f2',
    },
    stepIndicator: {
        color: '#bbb',
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    stepContainer: {
        marginBottom: 16,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f8f8f2',
        marginBottom: 8,
    },
    stepDescription: {
        color: '#bbb',
        marginBottom: 24,
        fontSize: 16,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        color: '#f8f8f2',
        marginBottom: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    subText: {
        fontWeight: 'normal',
        color: '#bbb',
        fontSize: 14,
    },
    textInput: {
        backgroundColor: '#2a2a40',
        borderRadius: 12,
        padding: 12,
        color: '#fff',
        fontSize: 16,
    },
    textareaInput: {
        height: 120,
        paddingTop: 12,
    },
    characterCount: {
        color: '#bbb',
        fontSize: 12,
        marginTop: 4,
        textAlign: 'right',
    },
    emblemSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    emblemOption: {
        width: '18%',
        aspectRatio: 1,
        backgroundColor: '#2a2a40',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    selectedEmblemOption: {
        backgroundColor: '#4e60d3',
        borderWidth: 2,
        borderColor: '#fff',
    },
    emblemText: {
        fontSize: 24,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    tagOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#2a2a40',
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    selectedTagOption: {
        backgroundColor: '#4e60d3',
    },
    tagText: {
        color: '#ddd',
        fontSize: 14,
    },
    selectedTagText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    privacyOption: {
        backgroundColor: '#2a2a40',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    selectedPrivacyOption: {
        borderWidth: 2,
        borderColor: '#4e60d3',
    },
    privacyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    privacyTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    privacyDescription: {
        color: '#bbb',
        fontSize: 14,
        paddingLeft: 32,
    },
    guildPreview: {
        backgroundColor: '#2a2a40',
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 16,
    },
    previewBanner: {
        height: 80,
        padding: 16,
        justifyContent: 'flex-end',
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewEmblem: {
        fontSize: 32,
        marginRight: 16,
    },
    previewTitleContainer: {
        flex: 1,
    },
    previewName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    previewMotto: {
        fontSize: 12,
        color: '#ddd',
        fontStyle: 'italic',
    },
    previewDetails: {
        padding: 16,
    },
    previewLabel: {
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    previewTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    previewTagChip: {
        backgroundColor: '#4e60d3',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    previewTagText: {
        color: '#fff',
        fontSize: 12,
    },
    previewPrivacy: {
        color: '#ddd',
        marginBottom: 8,
    },
    noPreviewContent: {
        color: '#777',
        fontStyle: 'italic',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1e1e2e',
        borderTopWidth: 1,
        borderTopColor: '#2a2a40',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    primaryButton: {
        backgroundColor: '#4e60d3',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: '#666',
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginRight: 8,
    },
    });