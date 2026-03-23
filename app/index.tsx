import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useEffect, useRef } from 'react';
import { Button, StyleSheet, Text, View, Platform } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { runOnJS } from 'react-native-reanimated';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isListening, setIsListening] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // --- 1. VOICE EVENT HANDLERS ---
  const onSpeechResults = async (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      const spokenText = e.value[0].toLowerCase();
      console.log("Recognized:", spokenText);

      // Stop recognition immediately
      await stopListening();

      // Navigation Logic
      if (spokenText.includes("settings")) {
        await speak("Opening Settings");
        router.push("/settings");
      } else if (spokenText.includes("help")) {
        await speak("Opening Help");
        router.push("/help");
      } else if (spokenText.includes("home")) {
        await speak("Returning Home");
        router.push("/");
      }
    }
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.log("Voice Error:", e);
    setIsListening(false);
  };

  // --- 2. SETUP & CLEANUP ---
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.log("Audio setup error", error);
      }
    };

    configureAudio();

    // DEFENSIVE: Bind listeners only if Voice exists
    if (Voice) {
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
    }

    if (permission?.granted) {
      speak("Home. Camera Active. Long press for commands.");
    }

    // CLEANUP
    return () => {
      // Safe Audio Cleanup (Prevents Red Screen)
      if (soundRef.current) {
        try {
          soundRef.current.stopAsync(); // Just stop, don't unload to avoid thread issues
        } catch (e) { /* Ignore */ }
      }
      
      // Safe Voice Cleanup
      if (Voice) {
        try {
          Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
        } catch (e) { /* Ignore */ }
      }
    };
  }, [permission]);

  // --- 3. HELPER FUNCTIONS ---
  const speak = async (text: string) => {
    try {
      // Stop previous sound safely
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch (e) {}
      }
      
      // Google TTS (Simple & Free)
      const encodedText = encodeURIComponent(text);
      const uri = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodedText}`;
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
    } catch (error) {
      console.log("Speech playback failed", error);
    }
  };

  const startListening = async () => {
    try {
      if (!Voice) return; // Guard clause

      await Voice.stop(); 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsListening(true);
      await speak("Listening");

      // Small delay to let "Listening" speak before recording starts
      setTimeout(async () => {
        try {
          await Voice.start('en-US');
        } catch (e) {
          console.error("Voice Start Failed", e);
          setIsListening(false);
        }
      }, 500);

    } catch (e) {
      console.error("Start Voice Error:", e);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      if (Voice) {
        await Voice.stop();
      }
      setIsListening(false);
    } catch (e) {
      console.error("Stop Voice Error:", e);
    }
  };

  // --- 4. GESTURES ---
  const longPressGesture = Gesture.LongPress()
    .minDuration(800) // 800ms is snappier than 1000ms
    .onStart(() => {
      runOnJS(startListening)();
    });

  // --- 5. RENDER ---
  if (!permission) return <View style={styles.container} />;
  
  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.message}>Camera permission is required.</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return (
    // Wrap in GestureHandlerRootView for gestures to work reliably
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <GestureDetector gesture={longPressGesture}>
          <View style={{ flex: 1 }}>
            <CameraView style={styles.camera} facing="back">
              
              {/* Status Pill */}
              <View style={styles.statusContainer}>
                <View style={[styles.liveDot, isListening && styles.listeningDot]} />
                <Text style={styles.statusText}>
                  {isListening ? "LISTENING..." : "LIVE VISION"}
                </Text>
              </View>

              {/* Gradient Overlay for Readability */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
                style={styles.bottomGradient}
              />
            </CameraView>
          </View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  message: { textAlign: 'center', paddingBottom: 10, color: 'white' },
  camera: { flex: 1 },
  statusContainer: {
    position: 'absolute', 
    top: 60, 
    left: 20,
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 30,
    zIndex: 10,
  },
  liveDot: {
    width: 10, 
    height: 10, 
    borderRadius: 5,
    backgroundColor: '#FF3B30', // iOS Red
    marginRight: 8,
  },
  listeningDot: {
    backgroundColor: '#FFD60A', // iOS Yellow
    transform: [{ scale: 1.2 }],
    shadowColor: "#FFD60A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  statusText: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: '700', 
    letterSpacing: 1.5 
  },
  bottomGradient: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 200 
  },
});