import { Stack } from "expo-router";

export default function ReviewLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAFAF7' },
        animation: "slide_from_right",
      }}
    />
  );
}
