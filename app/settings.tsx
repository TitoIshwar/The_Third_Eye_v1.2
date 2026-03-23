import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// Dummy Settings Data (Preserving your existing logic structure)
// We just add state here for the UI demo, assuming you connect this to your real store
export default function SettingsScreen() {
  const [highContrast, setHighContrast] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(false); // fast/slow toggle
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const toggleSwitch = (setter: any, value: boolean) => {
    Haptics.selectionAsync(); // Micro-interaction
    setter(!value);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SETTINGS</Text>
          <View style={styles.headerLine} />
        </View>

        {/* Section 1: Accessibility */}
        <Text style={styles.sectionTitle}>VISION & AUDIO</Text>
        
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>High Contrast</Text>
              <Text style={styles.settingDesc}>Maximize visibility</Text>
            </View>
            <Switch
              trackColor={{ false: "#333", true: "#FFD700" }}
              thumbColor={highContrast ? "#FFF" : "#f4f3f4"}
              onValueChange={() => toggleSwitch(setHighContrast, highContrast)}
              value={highContrast}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Voice Speed</Text>
              <Text style={styles.settingValue}>{voiceSpeed ? "FAST" : "NORMAL"}</Text>
            </View>
            <Switch
              trackColor={{ false: "#333", true: "#FFD700" }}
              thumbColor={voiceSpeed ? "#FFF" : "#f4f3f4"}
              onValueChange={() => toggleSwitch(setVoiceSpeed, voiceSpeed)}
              value={voiceSpeed}
            />
          </View>
        </View>

        {/* Section 2: System */}
        <Text style={styles.sectionTitle}>SYSTEM</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDesc}>Vibrate on interaction</Text>
            </View>
            <Switch
              trackColor={{ false: "#333", true: "#FFD700" }}
              thumbColor={hapticsEnabled ? "#FFF" : "#f4f3f4"}
              onValueChange={() => toggleSwitch(setHapticsEnabled, hapticsEnabled)}
              value={hapticsEnabled}
            />
          </View>
        </View>

        {/* Info Footer */}
        <View style={styles.footer}>
          <Ionicons name="eye-outline" size={24} color="#333" />
          <Text style={styles.footerText}>The Third Eye v1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120, // Space for bottom bar
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerLine: {
    marginTop: 10,
    width: 60,
    height: 4,
    backgroundColor: '#FFD700', // Gold accent
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 8,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#222',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  settingValue: {
    fontSize: 14,
    color: '#FFD700', // Gold for values
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    opacity: 0.5,
  },
  footerText: {
    color: '#666',
    marginTop: 8,
    fontSize: 12,
  },
});