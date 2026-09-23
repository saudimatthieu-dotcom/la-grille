import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { colors } from "../config/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LA GRILLE</Text>
      <Text style={styles.subtitle}>Pronostique avec tes potes. Chambre-les quand tu gagnes.</Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("SignUp")}>
        <Text style={styles.buttonText}>Créer un compte</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
        <Text style={styles.link}>J'ai déjà un compte</Text>
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
    color: colors.accent,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 2,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 48,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "800",
  },
  link: {
    color: colors.text,
    fontSize: 15,
    marginTop: 20,
    textDecorationLine: "underline",
  },
});
