// FitRealmColors defines the color palette for the entire app
export const FitRealmColors = {
    // Primary brand colors
    primary: '#6C5CE7',      // Main brand color - purple
    primaryLight: '#8A7FF0', 
    primaryDark: '#5344C7',
    
    // Secondary brand colors
    secondary: '#00B894',    // Secondary brand color - teal
    secondaryLight: '#1DD1A1',
    secondaryDark: '#009B7F',
    
    // Status colors
    success: '#2ECC71',      // Green
    warning: '#F39C12',      // Orange/Amber
    error: '#E74C3C',        // Red
    info: '#3498DB',         // Blue
    
    // Background colors
    background: '#F7F9FC',       // Main background
    backgroundLight: '#F0F3F8',  // Lighter background for cards/panels
    cardBackground: '#FFFFFF',   // White for cards
    
    // Text colors
    textPrimary: '#2D3748',       // Primary text - dark gray
    textSecondary: '#718096',     // Secondary text - medium gray
    textTertiary: '#A0AEC0',      // Tertiary text - light gray
    textLight: '#E2E8F0',         // Very light text on dark backgrounds
    white: '#FFFFFF',             // White text
    
    // XP related colors
    xpBackground: '#FEF9E7',      // Light yellow background for XP
    xpText: '#F1C40F',            // Gold for XP text
    
    // Component specific colors
    border: '#E2E8F0',            // Border color
    divider: '#EDF2F7',           // Divider lines
    inputBackground: '#EDF2F7',   // Background for input fields
    modalOverlay: 'rgba(0,0,0,0.5)', // Modal overlay
    
    // Social features
    like: '#E53E3E',              // Red for likes/hearts
    mention: '#2B6CB0',           // Blue for mentions
    
    // Gaming elements
    questComplete: '#6C5CE7',     // Purple for completed quests
    questIncomplete: '#CBD5E0',   // Gray for incomplete quests
  };
  
  // FitRealmStyles defines common styles used across the app
  export const FitRealmStyles = {
    // Common text styles
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
      color: FitRealmColors.textPrimary,
      marginBottom: 16,
    },
    subheading: {
      fontSize: 18,
      fontWeight: '600',
      color: FitRealmColors.textPrimary,
      marginBottom: 12,
    },
    bodyText: {
      fontSize: 16,
      color: FitRealmColors.textPrimary,
      lineHeight: 24,
    },
    captionText: {
      fontSize: 14,
      color: FitRealmColors.textSecondary,
    },
    
    // Common container styles
    screenContainer: {
      flex: 1,
      backgroundColor: FitRealmColors.background,
      padding: 16,
    },
    card: {
      backgroundColor: FitRealmColors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    
    // Common button styles
    primaryButton: {
      backgroundColor: FitRealmColors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: FitRealmColors.white,
      fontWeight: '600',
      fontSize: 16,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: FitRealmColors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      color: FitRealmColors.primary,
      fontWeight: '600',
      fontSize: 16,
    },
    
    // Form styles
    input: {
      backgroundColor: FitRealmColors.inputBackground,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: FitRealmColors.textPrimary,
      marginBottom: 16,
    },
    
    // Badge styles
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: FitRealmColors.primary,
    },
    badgeText: {
      color: FitRealmColors.white,
      fontSize: 12,
      fontWeight: '500',
    },
    
    // Avatar styles
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    
    // Row styles
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    
    // Shadow styles
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  };