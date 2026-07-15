import React from "react";
import { createPortal } from "react-dom";
import { StyleSheet, View } from "react-native";

// The feedback layer has to live ABOVE every modal the app can open. On web
// that's harder than it sounds, and the naive fix does not work:
//
//   1. react-native-web's <Modal> createPortal()s a div straight onto
//      document.body (ModalPortal.js). Modals are therefore siblings of #root,
//      not descendants of it.
//   2. Every react-native-web <View> carries `position: relative; z-index: 0`
//      in its base style (View/index.js:134). That pair *creates a stacking
//      context* — on every View in the tree.
//
// Together those mean an overlay rendered inside the app tree is sealed inside
// its parent's stacking context, and no z-index value, however large, can lift
// it above a body-level modal. Which is exactly what we saw: the bubble sat
// under the New Match modal and swallowed no clicks at all.
//
// So: escape #root the same way the modals do. Portal to document.body and take
// a z-index above them. Now the comparison actually happens in the root stacking
// context, where a positioned element with z-index 10000 beats a positioned
// element with z-index auto — no matter which was appended to the DOM first.
const HOST_ID = "ra-feedback-layer";

function getHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.zIndex = "10000"; // above RNW's modal layer, which is z-index auto
    host.style.pointerEvents = "none"; // children opt back in individually
    host.style.display = "flex";
    host.style.justifyContent = "center"; // keep the layer on the 480px app column
    document.body.appendChild(host);

    // React Native has no way to style a placeholder differently from the typed
    // text — `fontStyle: "italic"` on a TextInput italicises what the user
    // types, which is the opposite of the point. ::placeholder is CSS-only, so
    // it goes in as a scoped stylesheet. Scoped to this host, so it can't leak
    // into the app's own inputs.
    const style = document.createElement("style");
    style.textContent = `
      #${HOST_ID} input::placeholder,
      #${HOST_ID} textarea::placeholder {
        font-style: italic;
        color: #5A5A68;
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }
  return host;
}

export default function TopLayer({ children }: { children: React.ReactNode }) {
  const host = getHost();
  return createPortal(
    <View pointerEvents="box-none" style={styles.column}>
      {children}
    </View>,
    host
  );
}

const styles = StyleSheet.create({
  // Mirrors App.tsx's webWrapper so the bubble pins to the right edge of the app
  // COLUMN, not the right edge of a 27-inch monitor.
  //
  // Not absoluteFillObject: that sets left:0 AND right:0, which — combined with
  // maxWidth — anchors the column to the left edge of the viewport rather than
  // centering it, stranding the bubble in the empty margin next to the app. The
  // host div is already `display:flex; justify-content:center`, so a plain flex
  // child with a max width lands exactly on the app column.
  column: { flex: 1, width: "100%", maxWidth: 480 },
});
