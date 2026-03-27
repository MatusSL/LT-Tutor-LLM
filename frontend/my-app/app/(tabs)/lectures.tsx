import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ListRenderItem,
} from "react-native";

import { router } from "expo-router";

import { FontAwesome } from "@expo/vector-icons";
import { requestEpisodeTopics } from "@/services/tutor-api";

export default function Lectures() {
  const [selectedLecture, setSelectedLecture] = useState<number>(0);

  const lectures: number[] = Array.from({ length: 90 }, (_, i) => i + 1);

  const handlePress = (lecture: number) => {
    if (lecture === selectedLecture) {
      setSelectedLecture(0);
    } else {
      setSelectedLecture(lecture);
    }
  };

  const renderItem: ListRenderItem<number> = ({ item }) => {
    const isSelected = item <= selectedLecture;

    return (
      <Pressable style={styles.row} onPress={() => handlePress(item)}>
        <Text style={styles.text}>Lecture {item}</Text>

        <View
          style={[
            styles.circle,
            isSelected ? styles.circleSelected : styles.circleUnselected,
          ]}
        />
      </Pressable>
    );
  };

  const sendSelectedEpisodes = async () => {
    if (selectedLecture === 0) {
      return;
    }

    try {
      const data = await requestEpisodeTopics(selectedLecture);

      router.push({
        pathname: "/chat",
        params: {
          episode: selectedLecture.toString(),
          topics: JSON.stringify(data.topics.topics),
        },
      });
    } catch (error) {
      console.error("Failed to send episodes:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.header_text}>Selected completed episodes</Text>
        <Pressable
          disabled={selectedLecture === 0}
          onPress={sendSelectedEpisodes}
        >
          <FontAwesome name="check" size={18} color="#007AFF" />
        </Pressable>
      </View>
      <FlatList<number>
        data={lectures}
        renderItem={renderItem}
        keyExtractor={(item) => item.toString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    color: "#8A8A8C",
  },

  header_text: {
    fontSize: 20,
    fontWeight: "600",
  },

  header: {
    // backgroundColor: "#8A8A8C",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  text: {
    fontSize: 16,
  },

  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },

  circleUnselected: {
    borderColor: "#9CA3AF",
    backgroundColor: "transparent",
  },

  circleSelected: {
    borderColor: "#0071E3",
    backgroundColor: "#0071E3",
  },
});
