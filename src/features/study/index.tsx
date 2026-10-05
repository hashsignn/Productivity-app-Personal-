import type { FeatureMeta } from "../../shell/registry";

export const meta: FeatureMeta = { title: "Study", icon: "📚", order: 20, placement: "side" };

export { default } from "./StudySidebar";
export { loadStudy, type StudyData, type FocusDay } from "./studyStore";
