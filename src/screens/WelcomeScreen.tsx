import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { theme } from "../lib/theme";
import ScreenGlow from "../components/ScreenGlow";
import GlowButton from "../components/GlowButton";
import RiftWord from "../components/RiftWord";
import { setHasSeenWelcome } from "../lib/db";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

/**
 * One-time first-launch screen: welcomes the person, flags this as an alpha
 * build, and previews the short Vendetta-focused tutorial that starts once
 * they land on Home. Gated by hasSeenWelcome (see lib/db.ts) -- shown once
 * ever, same durability/persistence pattern as the tutorial's own
 * hasSeenTutorial flag, and deliberately a separate flag from it (see that
 * key's comment in db.web.ts/db.native.ts for why). App.tsx checks the flag
 * before the navigator ever mounts and picks this screen or Home as the
 * initial route accordingly -- this screen never appears again after the
 * first "Let's go" tap, short of clearing app data.
 */
export default function WelcomeScreen({ navigation }: Props) {
  function handleContinue() {
    setHasSeenWelcome(true);
    // replace, not navigate: this screen should never be reachable via the
    // back button once dismissed.
    navigation.replace("Home");
  }

  return (
    <View style={styles.screen}>
      <ScreenGlow />
      <View style={styles.content}>
        <RiftWord suffix="Academy" style={styles.title} />

        <View style={styles.alphaBadge}>
          <Text style={styles.alphaBadgeText}>ALPHA</Text>
        </View>

        <Text style={styles.body}>
          Welcome! You're trying out an early alpha build of RiftAcademy. Things may
          change, and you may run into rough edges as we keep building. If something
          looks off, tap the feedback bubble in the corner of any screen and tell us
          about it.
        </Text>

        <Text style={styles.body}>
          Next, we'll walk you through a quick tutorial using the new Vendetta cards so
          you can start practicing right away.
        </Text>

        <GlowButton
          label="Let's go"
          onPress={handleContinue}
          radius={12}
          style={styles.buttonWrap}
          contentStyle={styles.buttonBody}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  title: { fontSize: 32, fontWeight: "700", color: theme.text, textAlign: "center" },
  alphaBadge: {
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  alphaBadgeText: {
    color: theme.textDim,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  body: {
    color: "#c7c7d2",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  buttonWrap: { marginTop: 14, alignSelf: "stretch" },
  buttonBody: { paddingVertical: 16 },
});
