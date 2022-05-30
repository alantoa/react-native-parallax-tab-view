import type {
  FlatListProps,
  ScrollViewProps,
  SectionListProps,
} from 'react-native';
import { FlatList, ScrollView, SectionList } from 'react-native';
import { TabView } from 'react-native-tab-view';
import { createCollapsibleScrollView } from './create-collapsible-scrollView';
import { createHeaderTabsComponent } from './create-header-tabs';

export const TabScrollView = createCollapsibleScrollView<
  typeof ScrollView,
  ScrollViewProps
>(ScrollView);

export const TabFlatList = createCollapsibleScrollView<
  typeof FlatList,
  FlatListProps<any>
>(FlatList);

export const TabSectionList = createCollapsibleScrollView<
  typeof SectionList,
  SectionListProps<any>
>(SectionList);

export const HeaderTabView = createHeaderTabsComponent(TabView);
