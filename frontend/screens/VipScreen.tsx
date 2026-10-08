import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import type { RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { VIP_PERKS } from "../config/vip";
import { useMe } from "../utils/useMe";

type Props = NativeStackScreenProps<RootStackParamList, "Vip">;

// The VIP pass: what it gives, and whether I have it. No payment yet: an admin gives it (Profil > Administration)
export default function VipScreen({ navigation }: Props) {
  const me = useMe();

  const perkRows = VIP_PERKS.map((perk) => (
    <View key={perk.title} style={styles.perk}>
      <Ionicons name={perk.icon} size={24} color={colors.gold} />
      <View style={styles.perkBody}>
        <Text style={styles.perkTitle}>{perk.title}</Text>
        <Text style={styles.perkDescription}>{perk.description}</Text>
      </View>
    </View>
  ));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>PASS VIP 👑</Text>
      </View>

      {me && (
        <View style={[styles.status, me.isVip && styles.statusActive]}>
          <Text style={styles.statusText}>
            {me.isVip && me.vipUntil
              ? `Tu es VIP jusqu'au ${new Date(me.vipUntil).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}`
              : "Tu n'es pas encore VIP"}
          </Text>
        </View>
      )}

      <Text style={styles.section}>Ce que le pass débloque</Text>
      <View style={styles.card}>{perkRows}</View>

      {me && !me.isVip && (
        <>
          <View style={[styles.button, styles.buttonDisabled]}>
            <Text style={styles.buttonText}>S&apos;ABONNER — BIENTÔT</Text>
          </View>
          <Text style={styles.hint}>L&apos;abonnement arrive avec la version de l&apos;app sur les stores.</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingTop: 64,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  status: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statusActive: {
    borderColor: colors.gold,
  },
  statusText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  section: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  perk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  perkBody: {
    flex: 1,
  },
  perkTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  perkDescription: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "900",
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
