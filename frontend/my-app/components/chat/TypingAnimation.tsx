import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { C } from "@/constants/colors";

export function TypingAnimation() {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim1, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(anim2, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(anim3, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(anim1, { toValue: 0, duration: 300, useNativeDriver: false }),
        Animated.timing(anim2, { toValue: 0, duration: 300, useNativeDriver: false }),
        Animated.timing(anim3, { toValue: 0, duration: 300, useNativeDriver: false }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [anim1, anim2, anim3]);

  const opacity = (v: Animated.Value) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.dot, { opacity: opacity(anim1) }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: opacity(anim2) }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: opacity(anim3) }]}>•</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 20,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    fontSize: 16,
    color: C.text.secondary,
    lineHeight: 22,
    height: 22,
  },
});
