/* eslint-disable react-native/no-inline-styles */
import { HeaderTabView, TabFlatList } from '@alantoa/tab-view';
import React, { useCallback, useRef, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const StatusBarHeight = StatusBar.currentHeight ?? 0;
const TabScrollView = ({ route }: any) => {
  return (
    <TabFlatList
      style={{ backgroundColor: '#333' }}
      index={route.index}
      data={new Array(20).fill(0)}
      renderItem={({ index }) => {
        return (
          <View
            style={{
              height: 60,
              backgroundColor: '#fff',
              marginBottom: 8,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text>{`${route.title}-Item-${index}`}</Text>
          </View>
        );
      }}
    />
  );
};
export default function Home() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const ref = useRef(null);
  const [routes] = useState([
    { key: 'like', title: 'Like', index: 0 },
    { key: 'owner', title: 'Owner', index: 1 },
    { key: 'created', title: 'Created', index: 2 },
  ]);
  const [index, setIndex] = useState(0);
  const animationHeaderPosition = useSharedValue(0);
  const animationHeaderHeight = useSharedValue(0);

  const renderScene = useCallback(({ route }) => {
    switch (route.key) {
      case 'like':
        return <TabScrollView route={route} index={0} />;

      case 'owner':
        return <TabScrollView route={route} index={1} />;

      case 'created':
        return <TabScrollView route={route} index={2} />;

      default:
        return null;
    }
  }, []);

  const onStartRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      console.log('onStartRefresh');
      console.log(ref.current);

      setIsRefreshing(false);
    }, 300);
  };
  const renderHeader = () => (
    <View style={{ height: 300, backgroundColor: '#000' }}></View>
  );

  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <HeaderTabView
        onStartRefresh={onStartRefresh}
        isRefreshing={isRefreshing}
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        lazy
        renderScrollHeader={renderHeader}
        minHeaderHeight={insets.top + StatusBarHeight}
        animationHeaderPosition={animationHeaderPosition}
        animationHeaderHeight={animationHeaderHeight}
        ref={ref}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
