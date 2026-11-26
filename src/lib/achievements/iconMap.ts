import {
  faCalendarCheck,
  faZap,
  faArrowTrendUp,
  faRefresh,
  faRocket,
  faSearch,
  faDog,
  faTrophy,
  faPiggyBank,
  faWallet,
  faBank,
  faGem,
  faUserCheck,
  faGift,
  faFolderOpen,
  faStar,
  faBolt,
  faBagShopping,
  faBullseye,
  faMedal,
  faCrown,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

export const iconMap: Record<string, IconDefinition> = {
  faCalendarCheck,
  faZap,
  faArrowTrendUp,
  faRefresh,
  faRocket,
  faSearch,
  faDog,
  faTrophy,
  faPiggyBank,
  faWallet,
  faBank,
  faGem,
  faUserCheck,
  faGift,
  faFolderOpen,
  faStar,
  faBolt,
  faBagShopping,
  faBullseye,
  faMedal,
  faCrown,
};

export function getAchievementIcon(key: string | null | undefined, fallback: IconDefinition = faGift): IconDefinition {
  return (key && iconMap[key]) || fallback;
}
