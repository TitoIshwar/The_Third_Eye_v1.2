import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function HelpScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.mainTitle}>HOW TO USE</Text>

        {/* Step 1 Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Hold to Speak</Text>
            <Text style={styles.cardText}>
              Press and hold the screen to activate the camera and microphone.
            </Text>
          </View>
          {/* Watermark Number */}
          <Text style={styles.watermark}>01</Text>
        </Animated.View>

        {/* Step 2 Card */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Listen</Text>
            <Text style={styles.cardText}>
              The app will describe objects in front of you using voice commands.
            </Text>
          </View>
          <Text style={styles.watermark}>02</Text>
        </Animated.View>

        {/* Step 3 Card */}
        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Haptic Feedback</Text>
            <Text style={styles.cardText}>
              Short vibrations indicate a button press. Long vibrations mean processing.
            </Text>
          </View>
          <Text style={styles.watermark}>03</Text>
        </Animated.View>

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
    paddingBottom: 100,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 30,
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 24,
    height: 140,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#222',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 24,
    zIndex: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700', // Gold
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    maxWidth: '85%',
  },
  watermark: {
    position: 'absolute',
    right: -10,
    bottom: -20,
    fontSize: 100,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.05)', // Very subtle
    zIndex: 1,
  },
});