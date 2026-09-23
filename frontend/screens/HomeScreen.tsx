import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";

import type { RootState, RootStackParamList, TabParamList } from "../App";
import { logout } from "../reducers/user";
import { colors } from "../config/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Accueil">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.value);

  const handleLogout = () => {
    dispatch(logout());
    navigation.navigate("Welcome");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Salut {user.username}</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 32,
  },
  button: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "700",
  },
});
