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

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

// Step 1: my email → a code is sent — Step 2: the code + my new password
export default function ForgotPasswordScreen({ navigation }: Props) {
  const dispatch = useDispatch();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSendCode = () => {
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/users/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setStep("code");
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  };

  const handleReset = () => {
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/users/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          // The new password logs me in straight away
          dispatch(login({ token: data.token, ...data.user }));
          navigation.navigate("MainTabs");
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Text style={styles.title}>Mot de passe oublié</Text>

      {step === "email" ? (
        <>
          <Text style={styles.text}>Entre ton email : on t&apos;envoie un code à 6 chiffres.</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {error !== "" && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleSendCode}>
            <Text style={styles.buttonText}>Recevoir un code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.text}>
            Si un compte existe pour {email}, un code vient d&apos;être envoyé. Il est valable 15 minutes.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Code à 6 chiffres"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <TextInput
            style={styles.input}
            placeholder="Nouveau mot de passe"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error !== "" && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleReset}>
            <Text style={styles.buttonText}>Changer mon mot de passe</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSendCode}>
            <Text style={styles.link}>Renvoyer un code</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Retour à la connexion</Text>
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
    marginBottom: 16,
  },
  text: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 20,
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
