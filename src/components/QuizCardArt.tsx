import React from "react";
import { StyleSheet, View } from "react-native";
import { GLOW } from "../lib/theme";

const RADIUS = 16;

type Props = {
  aspectRatio: number;
  children: React.ReactNode;
  /** Optional overlay rendered on the OUTER (unclipped, overflow: visible)
   *  container -- for decoration that needs to be positioned relative to
   *  the card's own box and allowed to bleed past its edge (e.g. Sparklet),
   *  as opposed to `children`, which renders inside the clipped region and
   *  gets masked at the card's rounded corners. */
  decoration?: React.ReactNode;
};

/**
 * Quiz card-art container: a rounded-corner clip around the card image, with
 * an ambient blurple glow (GLOW.cardRing) rendered behind/around it via RN's
 * shadow* props on the unclipped outer wrapper.
 *
 * Previously also drew an on-top "foil rare" treatment -- a gold rim, a
 * holographic sheen, and a gradient border trim layered on top of the art
 * via three separate SVG overlays. Dropped (per Ashwin, July 19 UI-polish
 * pass) in favor of just the glow: the trim SVG's rounded-corner stroke
 * kept drifting out of alignment with the clip's CSS borderRadius across
 * different card aspect ratios (see git history for the specific artifact
 * this caused on Blade Twirler), and the card art already has its own
 * illustrated border doing the framing job -- an on-top rim was fighting
 * the art rather than complementing it. The glow alone doesn't have that
 * failure mode: RN shadows render outside the view's own bounds, so there's
 * no edge-alignment to get wrong.
 */
export default function QuizCardArt({ aspectRatio, children, decoration }: Props) {
  return (
    <View style={[styles.outer, { aspectRatio }, GLOW.cardRing]}>
      <View style={styles.clip}>{children}</View>
      {decoration}
    </View>
  );
}

const styles = StyleSheet.create({
  // 78% width + caller aspectRatio. overflow visible so the glow can bleed
  // past, and so `decoration` (e.g. Sparklet) can peek past the edge too.
  outer: {
    width: "78%",
    alignSelf: "center",
    borderRadius: RADIUS,
    overflow: "visible",
    position: "relative",
  },
  // Clipped, rounded region holding the card art. backgroundColor is a
  // fallback fill visible only during image load or, for a landscape
  // (Battlefield) card whose real aspect ratio isn't a perfect match for
  // its container, in any thin letterboxed margin -- see BATTLEFIELD_ASPECT_RATIO
  // in QuizScreen.tsx, which sizes the container to the card's actual
  // orientation specifically to keep that margin near zero.
  clip: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS,
    overflow: "hidden",
    backgroundColor: "#1a1a24",
  },
});
