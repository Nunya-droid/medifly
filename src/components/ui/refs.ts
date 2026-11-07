import type React from 'react';
import type { ScrollView, TextInput, View } from 'react-native';

/** Instance types for refs (React Native 0.88 components are function components). */
export type ViewRef = React.ComponentRef<typeof View>;
export type ScrollViewRef = React.ComponentRef<typeof ScrollView>;
export type TextInputRef = React.ComponentRef<typeof TextInput>;
