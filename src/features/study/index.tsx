import type { FeatureMeta } from "../../shell/registry";
import { Icon } from "../../shell/Icon";

export const meta: FeatureMeta = { title: "Study", icon: <Icon name="study" size={20} />, order: 20, placement: "side" };

export { default } from "./StudySidebar";
export { loadStudy, type StudyData, type FocusDay } from "./studyStore";
