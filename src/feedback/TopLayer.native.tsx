import React from "react";
import { StyleSheet, View } from "react-native";

// Native has no DOM to portal into, and no stacking-context problem to solve —
// a root-level absolutely-positioned View is already above the navigator.
export default function TopLayer({ children }: { children: React.ReactNode }) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {children}
    </View>
  );
}
