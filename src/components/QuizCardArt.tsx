import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { FOIL, GLOW } from "../lib/theme";

const RADIUS = 16;

type Props = {
  aspectRatio: number;
  children: React.ReactNode;
  /** Optional overlay rendered on the OUTER (unclipped, overflow: visible)
   *  container, after the trim SVG — for decoration that needs to be
   *  positioned relative to the card's own box and allowed to bleed past
   *  its edge (e.g. Sparklet), as opposed to `children`, which renders
   *  inside the clipped region and gets masked at the card's rounded
   *  corners. */
  decoration?: React.ReactNode;
};

/**
 * "Foil Rare" wrapper for the quiz card-art container — and the ONLY place the
 * foil treatment is used (never buttons, feature boxes, or nav). It layers,
 * from back to front:
 *   1. an outer blurple glow ring (GLOW.cardRing) on an unclipped wrapper,
 *   2. a clipped inner region with a gold rim (FOIL.rim) and rounded corners,
 *   3. the foil base gradient (shows during load / behind letterboxed art),
 *   4. the card image + quiz masks (passed as `children`),
 *   5. a diagonal holographic sheen over the art,
 *   6. a blurple→gold→blurple gradient border trim on top.
 *
 * SVG viewBoxes are stretched to fill (`preserveAspectRatio="none"`) so no
 * onLayout measurement is needed. All decorative layers are pointer-transparent
 * so taps still reach whatever the caller renders.
 */
export default function QuizCardArt({ aspectRatio, children, decoration }: Props) {
  // All three SVG overlays below use a 100-wide viewBox whose HEIGHT is
  // derived from the real `aspectRatio` prop, rather than a hardcoded
  // approximation (previously "0 0 100 140", i.e. a fixed ratio of
  // 100/140 = 0.7143). The real card ratio (744/1039 = 0.7161) is close but
  // not identical, and preserveAspectRatio="none" stretches each SVG
  // non-uniformly to fill its box -- any mismatch between the viewBox's
  // ratio and the box's actual rendered ratio scales the trim stroke's
  // rounded corners into a slight ellipse, which doesn't line up with the
  // `clip` View's perfectly circular CSS borderRadius and shows up as a
  // stray line segment at the corner. Deriving the viewBox height from the
  // same aspectRatio the box itself uses keeps the stretch uniform (and
  // therefore corner-radius-safe) for whatever ratio is passed in, not just
  // today's card art.
  const viewBoxHeight = 100 / aspectRatio;
  const viewBox = `0 0 100 ${viewBoxHeight.toFixed(3)}`;
  const trimRadius = 8; // single consistent rx=ry now that scaling is uniform

  return (
    <View style={[styles.outer, { aspectRatio }, GLOW.cardRing]}>
      <View style={styles.clip}>
        {/* 3. base gradient (behind the image) */}
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
          viewBox={viewBox}
          preserveAspectRatio="none"
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="foilBase" x1="0.1" y1="0" x2="0.9" y2="1">
              {FOIL.baseStops.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height={viewBoxHeight} fill="url(#foilBase)" />
        </Svg>

        {/* 4. card image + masks */}
        {children}

        {/* 5. holographic sheen (over the art) */}
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
          viewBox={viewBox}
          preserveAspectRatio="none"
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="foilSheen" x1="0" y1="1" x2="1" y2="0">
              {FOIL.sheenStops.map((s, i) => (
                <Stop
                  key={i}
                  offset={s.offset}
                  stopColor={s.color}
                  stopOpacity={s.opacity}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height={viewBoxHeight} fill="url(#foilSheen)" />
        </Svg>
      </View>

      {/* 6. gradient border trim (on the unclipped outer, so it traces the rim) */}
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="foilTrim" x1="0" y1="0" x2="1" y2="1">
            {FOIL.trimStops.map((s, i) => (
              <Stop
                key={i}
                offset={s.offset}
                stopColor={s.color}
                stopOpacity={s.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect
          x="0.6"
          y="0.6"
          width="98.8"
          height={viewBoxHeight - 1.2}
          rx={trimRadius}
          ry={trimRadius}
          fill="none"
          stroke="url(#foilTrim)"
          strokeWidth="1.2"
          opacity={FOIL.trimOpacity}
        />
      </Svg>

      {decoration}
    </View>
  );
}

const styles = StyleSheet.create({
  // 78% width + caller aspectRatio, matching the pre-foil card sizing exactly
  // (no layout change). overflow visible so the glow ring can bleed past.
  outer: {
    width: "78%",
    alignSelf: "center",
    borderRadius: RADIUS,
    overflow: "visible",
    position: "relative",
  },
  // Clipped, rounded, gold-rimmed region holding the gradient + art + sheen.
  clip: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS,
    overflow: "hidden",
    ...FOIL.rim,
  },
});
