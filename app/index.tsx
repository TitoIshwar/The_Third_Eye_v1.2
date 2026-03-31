import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

export default function HomeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isListening, setIsListening] = useState(false);
  const soundRef = useRef<AudioPlayer | null>(null);

  // --- 1. VOICE EVENT HANDLERS (expo-speech-recognition hooks) ---
  useSpeechRecognitionEvent('result', async (event) => {
    if (event.results && event.results.length > 0) {
      const spokenText = event.results[0]?.transcript?.toLowerCase() ?? '';
      console.log('Recognized:', spokenText);

      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);

      if (spokenText.includes('settings')) {
        await speak('Opening Settings');
        router.push('/settings');
      } else if (spokenText.includes('help')) {
        await speak('Opening Help');
        router.push('/help');
      } else if (spokenText.includes('home')) {
        await speak('Returning Home');
        router.push('/');
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Voice Error:', event);
    setIsListening(false);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  // --- 2. SETUP & CLEANUP ---
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'doNotMix',
        });
      } catch (error) {
        console.log('Audio setup error', error);
      }
    };

    configureAudio();

    if (permission?.granted) {
      speak('Home. Camera Active. Long press for commands.');
    }

    return () => {
      if (soundRef.current) {
        try { soundRef.current.release(); } catch (e) { /* Ignore */ }
      }
      try { ExpoSpeechRecognitionModule.stop(); } catch (e) { /* Ignore */ }
    };
  }, [permission]);

  // --- 3. HELPER FUNCTIONS ---
  const speak = async (text: string) => {
    try {
      if (soundRef.current) {
        try { soundRef.current.release(); } catch (e) {}
      }
      const encodedText = encodeURIComponent(text);
      const uri = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodedText}`;
      soundRef.current = createAudioPlayer(uri);
      soundRef.current.play();
    } catch (error) {
      console.log('Speech playback failed', error);
    }
  };

  const startListening = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsListening(true);
      await speak('Listening');

      setTimeout(() => {
        try {
          ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false });
        } catch (e) {
          console.error('Voice Start Failed', e);
          setIsListening(false);
        }
      }, 500);
    } catch (e) {
      console.error('Start Voice Error:', e);
      setIsListening(false);
    }
  };

  // --- 4. GESTURES ---
  const longPressGesture = Gesture.LongPress()
    .minDuration(800)
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <GestureDetector gesture={longPressGesture}>
          <View style={{ flex: 1 }}>
            <CameraView style={styles.camera} facing="back" />

            {/* Status Pill */}
            <View style={styles.statusContainer}>
              <View style={[styles.liveDot, isListening && styles.listeningDot]} />
              <Text style={styles.statusText}>
                {isListening ? 'LISTENING...' : 'LIVE VISION'}
              </Text>
            </View>

            {/* Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
              style={styles.bottomGradient}
            />
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
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  listeningDot: {
    backgroundColor: '#FFD60A',
    transform: [{ scale: 1.2 }],
    shadowColor: '#FFD60A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
});