import React, { useEffect, useMemo } from 'react';
import { ScrollViewProps, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useHeaderTabContext } from './context';
import { useSharedScrollableRef } from './hooks';
import type { SceneProps } from './types';

export function SceneComponent<P extends ScrollViewProps>({
  index,
  onScroll,
  ContainerView,
  contentContainerStyle,
  scrollIndicatorInsets,
  forwardedRef,
  ...restProps
}: SceneProps<P>) {
  if (onScroll !== undefined) {
    console.warn(
      `Don't support the custom onScroll, please use the 'useHeaderTabContext' hooks!`
    );
  }
  const {
    shareAnimatedValue,
    tabbarHeight,
    headerHeight,
    curIndexValue,
    updateSceneInfo,
  } = useHeaderTabContext();
  const scollViewRef =
    useSharedScrollableRef<Animated.ScrollView>(forwardedRef);

  const scrollY = useSharedValue(0);

  const calcHeight = useMemo(() => {
    return tabbarHeight;
  }, [tabbarHeight]);

  const onScrollAnimateEvent = useAnimatedScrollHandler({
    onScroll: (e) => {
      const moveY = Math.max(e.contentOffset.y, 0);
      scrollY.value = Math.max(moveY, 0);
      if (curIndexValue.value !== index) return;
      shareAnimatedValue.value = moveY;
    },
  });

  useEffect(() => {
    if (scollViewRef && scollViewRef.current) {
      updateSceneInfo({
        scrollRef: scollViewRef,
        index,
        scrollY,
      });
    }
  }, [scollViewRef, index, scrollY, updateSceneInfo]);

  return (
    <Animated.View style={styles.container}>
      {/* @ts-ignore */}
      <ContainerView
        ref={scollViewRef}
        scrollEventThrottle={16}
        directionalLockEnabled
        contentContainerStyle={[
          {
            paddingTop: calcHeight,
          },
          contentContainerStyle,
        ]}
        onScroll={onScrollAnimateEvent}
        scrollIndicatorInsets={{
          top: headerHeight,
          ...scrollIndicatorInsets,
        }}
        bounces={false}
        {...restProps}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
