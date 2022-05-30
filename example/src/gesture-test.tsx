import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
export const GestureTest = () => {
  const translateY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const style = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translateY.value,
        },
      ],
    };
  });
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const nativeGesture = Gesture.Native();
  const panGesture = Gesture.Pan()
    .simultaneousWithExternalGesture(nativeGesture)
    .activeOffsetX([-500, 500])
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
      console.log(scrollY.value !== 0);

      if (scrollY.value !== 0 || e.translationY <= 0) return;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      translateY.value = withTiming(0);
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[{ flex: 1, backgroundColor: '#e1e1e1' }, style]}>
        <View style={{ backgroundColor: '#333', height: 300 }} />

        <GestureDetector gesture={nativeGesture}>
          <AnimatedScrollView
            bounces={false}
            style={{ flex: 1 }}
            onScroll={onScroll}
          >
            {new Array(100).fill(0).map((_, i) => (
              <View
                style={{
                  height: 40,
                  backgroundColor: '#fff',
                  marginBottom: 10,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                key={`${i}`}
              >
                <Text>Item-{i}</Text>
              </View>
            ))}
          </AnimatedScrollView>
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
};
