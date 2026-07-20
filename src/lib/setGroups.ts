// Four set groups, matching how Ashwin actually wants to practice by set —
// Origins and Proving Grounds are small/old enough to always study together.
// Swap this list once a set after Vendetta needs its own group.
//
// Lives in its own file (not inline in SettingsScreen.tsx) specifically so
// tutorialSteps.ts can import it too, without SettingsScreen and the
// tutorial engine importing each other (a circular import).
export type SetGroup = { label: string; ids: string[] };

export const SET_GROUPS: SetGroup[] = [
  { label: "Origins & Proving Grounds", ids: ["OGN", "OGS"] },
  { label: "Spiritforged", ids: ["SFD"] },
  { label: "Unleashed", ids: ["UNL"] },
  { label: "Vendetta", ids: ["VEN"] },
];
