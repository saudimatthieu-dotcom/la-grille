import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";

import type { RootState } from "../App";
import { colors } from "../config/theme";
import { deleteMyAccount } from "../data/users";

type Props = {
  // The account is gone: the Profil page logs out
  onDeleted: () => void;
  // The Profil page shows the errors, with its own
  onError: (message: string) => void;
};

// "Supprimer mon compte" at the bottom of the Profil page (RGPD + Google Play): a warning, then the password
export default function DeleteAccount({ onDeleted, onError }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);

  // The password field only appears once the user has confirmed the warning
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");

  // Step 1: the warning. Only "Continuer" shows the password field
  const askDeleteAccount = () => {
    Alert.alert(
      "Supprimer mon compte ?",
      "C'est définitif : tes pronos, tes bonus et tes messages seront effacés, et tu quittes toutes tes ligues. " +
        "Les ligues que tu as créées passent au joueur arrivé après toi (ou disparaissent si tu es seul).",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Continuer", style: "destructive", onPress: () => setConfirming(true) },
      ]
    );
  };

  // Step 2: the server checks the password, deletes everything, then we log out
  const deleteAccount = () => {
    onError("");

    deleteMyAccount({ token, password })
      .then((data) => {
        if (data.result) {
          onDeleted();
        } else {
          onError(data.error === "Wrong password" ? "Mot de passe incorrect" : data.error);
        }
      })
      .catch(() => onError("Impossible de contacter le serveur"));
  };

  return (
    <View>
      <TouchableOpacity onPress={askDeleteAccount}>
        <Text style={styles.deleteLink}>Supprimer mon compte</Text>
      </TouchableOpacity>

      {confirming && (
        <View style={styles.deleteBox}>
          <Text style={styles.deleteHint}>Pour confirmer, entre ton mot de passe :</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Mot de passe"
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity style={styles.deleteButton} onPress={deleteAccount} disabled={password === ""}>
            <Text style={styles.deleteButtonText}>Supprimer définitivement</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  deleteLink: {
    color: colors.danger,
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "center",
    marginTop: 24,
  },
  deleteBox: {
    gap: 10,
    marginTop: 16,
  },
  deleteHint: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  deleteButton: {
    backgroundColor: colors.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
});
