import { View, Text, StyleSheet } from "react-native";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LT Tutor</Text>
      <Text>Welcome to the learning assistant.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#1D1D1F",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
});
