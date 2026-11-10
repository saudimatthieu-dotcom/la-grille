import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch } from "react-redux";

import type { RootStackParamList } from "../App";
import { login } from "../reducers/user";
import { colors } from "../config/theme";
import { signUp } from "../data/users";

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

// The public pages on our server (routes/legal.ts): the box links to them
const LEGAL_URL = `${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/legal`;

export default function SignUpScreen({ navigation }: Props) {
  const dispatch = useDispatch();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  const handleSubmit = () => {
    setError("");

    signUp({ username, email, password, acceptedTerms: accepted })
      .then((data) => {
        if (data.result) {
          dispatch(login({ token: data.token, ...data.user }));
          navigation.navigate("MainTabs");
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Créer un compte</Text>

      <TextInput
        style={styles.input}
        placeholder="Pseudo"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <View style={styles.consentRow}>
        <TouchableOpacity
          onPress={() => setAccepted(!accepted)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <Ionicons name={accepted ? "checkbox" : "square-outline"} size={26} color={colors.accent} />
        </TouchableOpacity>

        <Text style={styles.consentText}>
          J&apos;ai 15 ans ou plus et j&apos;accepte les{" "}
          <Text style={styles.consentLink} onPress={() => Linking.openURL(`${LEGAL_URL}/cgu`)}>
            CGU
          </Text>{" "}
          et la{" "}
          <Text style={styles.consentLink} onPress={() => Linking.openURL(`${LEGAL_URL}/confidentialite`)}>
            politique de confidentialité
          </Text>
          .
        </Text>
      </View>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, !accepted && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!accepted}
      >
        <Text style={styles.buttonText}>S&apos;inscrire</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "800",
  },
  link: {
    color: colors.text,
    textAlign: "center",
    marginTop: 20,
    textDecorationLine: "underline",
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  consentText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  consentLink: {
    color: colors.text,
    textDecorationLine: "underline",
  },
  buttonDisabled: {
    opacity: 0.5,
  },

});
