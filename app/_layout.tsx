import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import TabBar from '../components/TabBar';

// Prevent the splash screen from hiding automatically
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  
  useEffect(() => {
    // Wait for 5 seconds (5000ms), then hide the splash screen
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'black' },
          animation: 'fade',
        }}
      >
        <Tabs.Screen name="help" />
        <Tabs.Screen name="index" />
        <Tabs.Screen name="settings" />
      </Tabs>
    </GestureHandlerRootView>
  );
}