import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedProps,
  withSpring, 
  createAnimatedComponent
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// --- CONSTANTS ---
const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 3;
const TAB_HEIGHT = 80;
const BALL_SIZE = 64;
const CURVE_WIDTH = 75;
const CURVE_DEPTH = 38; // Slightly shallower depth for smoother look

// 1. Create Animated SVG Path Component
const AnimatedPath = createAnimatedComponent(Path);

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // 2. SharedValue tracks the decimal index (0 -> 1 -> 2)
  const activeIndex = useSharedValue(0);

  // Sync SharedValue with navigation state
  useEffect(() => {
    activeIndex.value = withSpring(state.index, {
      damping: 15,
      stiffness: 150,
    });
  }, [state.index]);

  // 3. ANIMATED SVG PROPS
  const animatedPathProps = useAnimatedProps(() => {
    const currentCenter = (activeIndex.value * TAB_WIDTH) + (TAB_WIDTH / 2);
    const start = currentCenter - (CURVE_WIDTH / 2);
    const end = currentCenter + (CURVE_WIDTH / 2);
    const totalHeight = TAB_HEIGHT + insets.bottom;

    const d = `
      M 0 0 
      L ${start} 0 
      Q ${currentCenter} ${CURVE_DEPTH} ${end} 0 
      L ${width} 0 
      L ${width} ${totalHeight} 
      L 0 ${totalHeight} 
      Z
    `;
    return { d };
  });

  // Animated Style for the Floating Ball
  const ballStyle = useAnimatedStyle(() => {
    const translateX = (activeIndex.value * TAB_WIDTH) + (TAB_WIDTH - BALL_SIZE) / 2;
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={[styles.container, { height: TAB_HEIGHT + insets.bottom }]}>
      
      {/* 4. Layer 1: The Animated SVG Background */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={width} height={TAB_HEIGHT + insets.bottom}>
          <AnimatedPath 
            fill="white" 
            animatedProps={animatedPathProps}
          />
        </Svg>
      </View>

      {/* 5. Layer 2: The Floating Ball */}
      <Animated.View style={[styles.ballContainer, ballStyle]}>
        <View style={styles.ball}>
          <Ionicons 
            name={
              state.index === 0 ? "help" :
              state.index === 1 ? "eye" : "settings"
            } 
            size={32} 
            color="#FFD700" 
          />
        </View>
      </Animated.View>

      {/* 6. Layer 3: The Interaction Tabs */}
      <View style={styles.tabBarRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name);
            }
          };

          let iconName: any = 'help-circle-outline';
          if (route.name === 'index') iconName = 'eye-outline';
          if (route.name === 'settings') iconName = 'settings-outline';

          return (
            <View key={route.key} style={styles.tabItemContainer}>
              <TouchableOpacity
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.9}
              >
                <View style={{ opacity: isFocused ? 0 : 1 }}>
                  <Ionicons 
                    name={iconName} 
                    size={28} 
                    color="rgba(0,0,0,0.6)" 
                  />
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: width,
    backgroundColor: 'transparent',
    // REMOVED ALL Z-INDEX AND ELEVATION HERE
  },
  tabBarRow: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
    width: width,
  },
  tabItemContainer: {
    width: TAB_WIDTH,
    height: TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  ballContainer: {
    position: 'absolute',
    top: -24, 
    left: 0,
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a', 
    // REMOVED SHADOW AND ELEVATION HERE TO FIX CAMERA BLACK SCREEN
  },
});