import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch } from "react-redux";

import type { RootStackParamList } from "../App";
import { login } from "../reducers/user";
import { colors } from "../config/theme";

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

export default function SignInScreen({ navigation }: Props) {
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/users/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => response.json())
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
      <Text style={styles.title}>Se connecter</Text>

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

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Connexion</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
        <Text style={styles.link}>Pas encore de compte ? S'inscrire</Text>
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
});
