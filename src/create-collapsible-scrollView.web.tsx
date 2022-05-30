import type { ComponentClass } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { LayoutChangeEvent, ScrollViewProps, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useHeaderTabContext } from './context';
import { useSharedScrollableRef, useSyncInitialPosition } from './hooks';
import type { SceneProps } from './types';

export function createCollapsibleScrollView<
  P extends ComponentClass<any>,
  T = any
>(Component: P) {
  const AnimatePageView = Animated.createAnimatedComponent(Component);
  return React.forwardRef<
    P,
    T & {
      index: number;
    }
  >(function tabView(props, ref) {
    return (
      <SceneComponent
        {...props}
        forwardedRef={ref}
        ContainerView={AnimatePageView}
      />
    );
  });
}
function SceneComponent<P extends ScrollViewProps>({
  index,
  onScroll,
  ContainerView,
  contentContainerStyle,
  scrollIndicatorInsets,
  forwardedRef,
  onLayout,
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
  const { opacityValue, initialPosition } =
    useSyncInitialPosition(scollViewRef);

  const calcHeight = useMemo(() => {
    return tabbarHeight + headerHeight;
  }, [tabbarHeight, headerHeight]);

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
  const _onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onLayout?.(e);
      initialPosition(shareAnimatedValue.value);
    },
    [initialPosition, onLayout, shareAnimatedValue.value]
  );
  const sceneStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(opacityValue.value),
    };
  }, [opacityValue]);
  return (
    <Animated.View style={[styles.container, sceneStyle]}>
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
        onLayout={_onLayout}
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
