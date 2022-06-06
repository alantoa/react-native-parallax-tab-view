/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  NativeGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Extrapolate,
  interpolate,
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { HeaderTabContext } from './context';
import { useRefreshDerivedValue, useSceneInfo } from './hooks';
import RefreshControlContainer from './refresh-control';
import type { GestureContainerProps } from './types';
import { animateToRefresh, mScrollTo } from './utils';
const { width } = Dimensions.get('window');

export type GestureContainerRef = {
  setCurrentIndex: (index: number) => void;
} | null;

export const GestureContainer = React.forwardRef<
  GestureContainerRef,
  GestureContainerProps
>(function Container(
  {
    refreshHeight = 80,
    pullExtendedCoefficient = 0.1,
    overflowPull = 50,
    overflowHeight = 0,
    scrollEnabled = true,
    minHeaderHeight = 0,
    isRefreshing: _isRefreshing = false,
    initialPage,
    onStartRefresh,
    initTabbarHeight = 49,
    initHeaderHeight = 0,
    renderScrollHeader,
    renderTabView,
    renderRefreshControl: _renderRefreshControl,
    animationHeaderPosition,
    animationHeaderHeight,
    panHeaderMaxOffset,
    onPullEnough,
    refreshControlColor,
    headerSimultaneousWithExternalGesture = [],
    refreshControlTop = 0,
  },
  forwardedRef
) {
  const shareAnimatedValue = useSharedValue(0);
  const curIndexValue = useSharedValue(initialPage);
  const isSlidingHeader = useSharedValue(false);
  const slideIndex = useSharedValue(curIndexValue.value);
  const headerTrans = useSharedValue(0);
  const opacityValue = useSharedValue(initHeaderHeight === 0 ? 0 : 1);

  // layout
  const [tabbarHeight, setTabbarHeight] = useState(initTabbarHeight);
  const [tabviewHeight, setTabviewHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(
    initHeaderHeight - overflowHeight
  );

  // ref
  const [childGestures, setChildRefs] = useState<NativeGesture[]>([]);

  // pull-refresh
  const isDragging = useSharedValue(false);
  const tabsTrans = useSharedValue(0);
  const tabsRefreshTrans = useSharedValue(refreshHeight);
  const isRefreshing = useSharedValue(false);
  const isStartRefreshing = useSharedValue(false);
  const isRefreshingWithAnimation = useSharedValue(false);
  const basyY = useSharedValue(0);
  const startY = useSharedValue(0);
  const isPullEnough = useSharedValue(false);

  const headerTransStartY = useSharedValue(0);
  const dragIndex = useSharedValue(curIndexValue.value);

  const { childScrollRef, childScrollYTrans, sceneIsReady, updateSceneInfo } =
    useSceneInfo(curIndexValue);

  const calcHeight = useMemo(
    () => headerHeight - minHeaderHeight,
    [headerHeight, minHeaderHeight]
  );

  const animateTabsToRefresh = useCallback(
    (isToRefresh: boolean) => {
      'worklet';

      if (isToRefresh) {
        animateToRefresh({
          transRefreshing: tabsRefreshTrans,
          isRefreshing: isRefreshing,
          isRefreshingWithAnimation: isRefreshingWithAnimation,
          destPoi: 0,
          isToRefresh,
          onStartRefresh,
        });
      } else {
        const destPoi =
          tabsRefreshTrans.value > refreshHeight
            ? tabsRefreshTrans.value + refreshHeight
            : refreshHeight;
        animateToRefresh({
          transRefreshing: tabsRefreshTrans,
          isRefreshing: isRefreshing,
          isRefreshingWithAnimation: isRefreshingWithAnimation,
          destPoi,
          isToRefresh,
        });
      }
    },
    [_isRefreshing, refreshHeight, onStartRefresh]
  );

  const stopScrollView = () => {
    'worklet';
    if (!sceneIsReady.value[curIndexValue.value]) return;
    mScrollTo(
      childScrollRef[curIndexValue.value],
      0,
      childScrollYTrans[curIndexValue.value].value + 0.1,
      false
    );
  };

  const onTabsStartRefresh = useCallback(() => {
    'worklet';
    animateTabsToRefresh(true);
  }, [animateTabsToRefresh, onStartRefresh]);

  const onTabsEndRefresh = useCallback(() => {
    'worklet';
    animateTabsToRefresh(false);
  }, [animateTabsToRefresh]);

  const gestureHandlerHeader = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .simultaneousWithExternalGesture(...headerSimultaneousWithExternalGesture)
    .shouldCancelWhenOutside(false)
    .enabled(scrollEnabled !== false)
    .onBegin(() => {
      if (isRefreshing.value) return;
      stopScrollView();
    })
    .onUpdate((event) => {
      if (!sceneIsReady.value[curIndexValue.value]) return;

      if (isSlidingHeader.value === false) {
        slideIndex.value = curIndexValue.value;
        headerTransStartY.value =
          childScrollYTrans[curIndexValue.value].value + event.translationY;

        isSlidingHeader.value = true;
      }
      headerTrans.value = Math.max(
        -event.translationY + headerTransStartY.value,
        0
      );
    })
    .onEnd((event) => {
      if (!sceneIsReady.value[curIndexValue.value]) return;
      if (isSlidingHeader.value === false) return;

      headerTransStartY.value = 0;
      headerTrans.value = withDecay(
        {
          velocity: -event.velocityY,
          clamp: [
            0,
            panHeaderMaxOffset ??
              headerHeight - minHeaderHeight + overflowHeight,
          ],
        },
        () => {
          isSlidingHeader.value = false;
        }
      );
    });
  const stopAllAnimation = () => {
    'worklet';
    if (!sceneIsReady.value[curIndexValue.value]) return;
    cancelAnimation(headerTrans);
    slideIndex.value = -1;
    dragIndex.value = -1;

    const handleSceneSync = (sIndex: number) => {
      if (!childScrollYTrans[sIndex]) return;
      const syncPosition = Math.min(shareAnimatedValue.value, calcHeight);
      if (
        childScrollYTrans[sIndex].value >= calcHeight &&
        shareAnimatedValue.value >= calcHeight
      )
        return;

      mScrollTo(childScrollRef[sIndex], 0, syncPosition, false);
    };

    for (const key in childScrollRef) {
      if (Object.prototype.hasOwnProperty.call(childScrollRef, key)) {
        if (parseInt(key, 10) === curIndexValue.value) continue;
        handleSceneSync(parseInt(key, 10));
      }
    }
  };
  const gestureHandler = Gesture.Pan()
    .simultaneousWithExternalGesture(gestureHandlerHeader, ...childGestures)
    .shouldCancelWhenOutside(false)
    .enabled(scrollEnabled)
    .activeOffsetX([-width, width])
    .activeOffsetY([-10, 10])
    .onBegin(() => {
      runOnUI(stopAllAnimation)();
    })
    .onStart(() => {
      isPullEnough.value = false;
    })
    .onUpdate((event) => {
      if (
        !sceneIsReady.value[curIndexValue.value] ||
        !onStartRefresh ||
        childScrollYTrans[curIndexValue.value]?.value === undefined
      )
        return;
      const onReadyToActive = (isPulling: boolean) => {
        dragIndex.value = curIndexValue.value;
        if (isPulling) {
          return event.translationY;
        } else {
          return (
            refreshHeight -
            tabsTrans.value +
            childScrollYTrans[curIndexValue.value].value
          );
        }
      };
      if (isRefreshing.value !== isRefreshingWithAnimation.value) return;
      if (isRefreshing.value) {
        if (isDragging.value === false) {
          const starty = onReadyToActive(false);
          startY.value = starty;
          isDragging.value = true;
        }
        tabsRefreshTrans.value = Math.max(
          -event.translationY + startY.value,
          0
        );
      } else {
        if (
          childScrollYTrans[curIndexValue.value].value !== 0 ||
          event.translationY <= 0
        )
          return;

        if (isDragging.value === false) {
          basyY.value = onReadyToActive(true);
          isDragging.value = true;
          return;
        }
        tabsRefreshTrans.value =
          refreshHeight - (event.translationY - basyY.value);
        if (!isPullEnough.value && tabsRefreshTrans.value < 0 && onPullEnough) {
          isPullEnough.value = true;
          runOnJS(onPullEnough)();
        }
      }
    })
    .onEnd((event) => {
      if (!sceneIsReady.value[curIndexValue.value] || !onStartRefresh) return;
      if (isDragging.value === false) return;
      isDragging.value = false;
      if (isRefreshing.value !== isRefreshingWithAnimation.value) return;
      if (isRefreshing.value) {
        startY.value = 0;
        tabsRefreshTrans.value = withDecay(
          {
            velocity: -event.velocityY,
            deceleration: 0.998,
            clamp: [0, Number.MAX_VALUE],
          },
          () => {
            isDragging.value = false;
          }
        );
      } else {
        tabsRefreshTrans.value < 0 ? onTabsStartRefresh() : onTabsEndRefresh();
      }
    });

  useEffect(() => {
    if (headerHeight !== 0) {
      opacityValue.value = withTiming(1);
    }
  }, [headerHeight]);

  useEffect(() => {
    animateTabsToRefresh(_isRefreshing);
  }, [animateTabsToRefresh]);

  // render Refresh component
  const renderRefreshControl = () => {
    if (!onStartRefresh) return;
    return (
      <RefreshControlContainer
        top={refreshControlTop}
        refreshHeight={refreshHeight}
        overflowPull={overflowPull}
        refreshValue={tabsTrans}
        opacityValue={opacityValue}
        isRefreshing={isRefreshing}
        isRefreshingWithAnimation={isRefreshingWithAnimation}
        pullExtendedCoefficient={pullExtendedCoefficient}
        renderContent={_renderRefreshControl}
        refreshControlColor={refreshControlColor}
      />
    );
  };

  const refHasChanged = useCallback(
    (ref: NativeGesture) => {
      if (!ref) return;
      const findItem = childGestures.find((item) => item === ref);
      if (findItem) return;
      setChildRefs((prechildRefs) => {
        return [...prechildRefs, ref];
      });
    },
    [childGestures]
  );

  const headerOnLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (headerHeight === event.nativeEvent.layout.height) return;
      const height = event.nativeEvent.layout.height - overflowHeight;
      setHeaderHeight(height);
      if (animationHeaderHeight) {
        animationHeaderHeight.value = Math.abs(calcHeight - minHeaderHeight);
      }
    },
    [headerHeight]
  );

  const tabbarOnLayout = useCallback(
    ({
      nativeEvent: {
        layout: { height },
      },
    }: LayoutChangeEvent) => {
      if (overflowHeight > height) {
        console.warn('overflowHeight must be less than the tabbar height');
      }
      if (Math.abs(tabbarHeight - height) < 1) return;
      setTabbarHeight(height);
    },
    [tabbarHeight, overflowHeight]
  );

  const containerOnLayout = useCallback((event: LayoutChangeEvent) => {
    setTabviewHeight(event.nativeEvent.layout.height);
  }, []);

  useAnimatedReaction(
    () => {
      return tabsRefreshTrans.value;
    },
    (mTrans) => {
      tabsTrans.value = Math.max(refreshHeight - mTrans, 0);
    },
    [refreshHeight, tabsRefreshTrans]
  );

  // isRefreshing
  useAnimatedReaction(
    () => {
      return (
        tabsRefreshTrans.value > refreshHeight &&
        isRefreshingWithAnimation.value
      );
    },
    (isStart) => {
      if (!isStart) return;
      if (!childScrollRef[curIndexValue.value]) return;
      const transY = tabsRefreshTrans.value - refreshHeight;

      if (childScrollYTrans[curIndexValue.value].value === transY) return;
      mScrollTo(childScrollRef[curIndexValue.value], 0, transY, false);
    },
    [
      tabsRefreshTrans,
      curIndexValue,
      isRefreshingWithAnimation,
      childScrollRef,
      refreshHeight,
    ]
  );

  // slide header
  useAnimatedReaction(
    () => {
      return (
        headerTrans &&
        slideIndex.value === curIndexValue.value &&
        isSlidingHeader.value
      );
    },
    (start) => {
      if (!start) return;
      if (!childScrollRef[curIndexValue.value]) return;
      if (childScrollYTrans[curIndexValue.value].value === headerTrans.value)
        return;

      mScrollTo(
        childScrollRef[curIndexValue.value],
        0,
        headerTrans.value || 0,
        false
      );
    },
    [
      headerTrans,
      slideIndex,
      curIndexValue,
      childScrollRef,
      childScrollYTrans,
      isSlidingHeader,
    ]
  );
  // isRefreshing
  useAnimatedReaction(
    () => {
      return (
        tabsRefreshTrans.value > refreshHeight &&
        isRefreshingWithAnimation.value
      );
    },
    (isStart) => {
      if (!isStart) return;
      if (!childScrollRef[curIndexValue.value]) return;
      const transY = tabsRefreshTrans.value - refreshHeight;

      if (childScrollYTrans[curIndexValue.value].value === transY) return;
      mScrollTo(childScrollRef[curIndexValue.value], 0, transY, false);
    },
    [
      tabsRefreshTrans,
      curIndexValue,
      isRefreshingWithAnimation,
      childScrollRef,
      refreshHeight,
    ]
  );

  // drag
  useAnimatedReaction(
    () => {
      // The dragIndex judgment is added to avoid TAB switching confusion
      return (
        tabsRefreshTrans.value < refreshHeight &&
        shareAnimatedValue.value !== 0 &&
        dragIndex.value === curIndexValue.value &&
        (isDragging.value || isRefreshingWithAnimation.value)
      );
    },
    (isStart) => {
      if (!isStart) return;

      mScrollTo(childScrollRef[curIndexValue.value], 0, 0, false);
    },
    [
      tabsRefreshTrans,
      refreshHeight,
      shareAnimatedValue,
      dragIndex,
      onStartRefresh,
      curIndexValue,
      isDragging,
      isRefreshingWithAnimation,
      childScrollRef,
    ]
  );
  const headerTransValue = useDerivedValue(() => {
    const headerTransY = interpolate(
      shareAnimatedValue.value,
      [0, calcHeight],
      [0, -calcHeight],
      Extrapolate.CLAMP
    );

    if (animationHeaderPosition && headerTransY < calcHeight) {
      animationHeaderPosition.value = headerTransY;
    }
    return headerTransY;
  });

  const tabbarAnimateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: headerTransValue.value,
        },
      ],
    };
  });

  const translateYValue = useRefreshDerivedValue({
    animatedValue: tabsTrans,
    refreshHeight,
    overflowPull,
    pullExtendedCoefficient,
  });

  const animateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translateYValue.value,
        },
      ],
    };
  });

  const opacityStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityValue.value,
    };
  });

  const _renderTabBarContainer = (children: React.ReactElement) => {
    return (
      <Animated.View style={[styles.tabbarStyle, tabbarAnimateStyle]}>
        <GestureDetector gesture={gestureHandlerHeader}>
          <Animated.View style={styles.container}>
            <View onLayout={headerOnLayout}>
              {React.isValidElement(renderScrollHeader)
                ? renderScrollHeader
                : renderScrollHeader()}
            </View>

            <Animated.View
              style={{ transform: [{ translateY: -overflowHeight }] }}
              onLayout={tabbarOnLayout}
            >
              {children}
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    );
  };

  useImperativeHandle(
    forwardedRef,
    () => ({
      setCurrentIndex: (index: number) => {
        curIndexValue.value = index;
      },
    }),
    [curIndexValue]
  );

  return (
    <HeaderTabContext.Provider
      value={{
        shareAnimatedValue,
        headerTrans,
        tabbarHeight,
        expectHeight: Math.floor(
          headerHeight + tabviewHeight - minHeaderHeight
        ),
        headerHeight,
        refreshHeight,
        overflowPull,
        pullExtendedCoefficient,
        refHasChanged,
        curIndexValue,
        minHeaderHeight,
        updateSceneInfo,
        isSlidingHeader,
        isStartRefreshing,
      }}
    >
      <GestureDetector gesture={gestureHandler}>
        <Animated.View style={[styles.container, opacityStyle]}>
          <Animated.View
            style={[styles.container, animateStyle]}
            onLayout={containerOnLayout}
          >
            {renderTabView({
              renderTabBarContainer: _renderTabBarContainer,
            })}
          </Animated.View>
          {renderRefreshControl()}
        </Animated.View>
      </GestureDetector>
    </HeaderTabContext.Provider>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  tabbarStyle: {
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
});
