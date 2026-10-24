/** Fixed, versioned rules; archives keep input + version so changes are never silent. */
export interface QimenInput {
  date: string; // Gregorian YYYY-MM-DD, Beijing civil calendar
  time: string; // HH:mm, fixed UTC+08:00
  title?: string;
}

export interface QimenPalace {
  number: number;
  name: string;
  direction: string;
  element: string;
  branches: string;
  stars: string[];
  door: string;
  deity: string;
  heavenStem: string;
  earthStem: string;
  hostedHeavenStem: string;
  hostedEarthStem: string;
  voidBranches: string;
  horse: boolean;
  isChiefStar: boolean;
  isChiefDoor: boolean;
}

export interface QimenChart {
  version: string;
  input: Required<QimenInput>;
  method: string;
  timezone: string;
  rules: string[];
  lunarDate: string;
  pillars: { year: string; month: string; day: string; hour: string };
  solarTerm: string;
  solarTermAt: string;
  nextSolarTerm: string;
  nextSolarTermAt: string;
  yuan: string;
  fuTou: string;
  dun: string;
  ju: number;
  xun: string;
  hiddenJia: string;
  voidBranches: string;
  horseBranch: string;
  chiefStar: { name: string; palace: number; origin: number };
  chiefDoor: { name: string; palace: number; rawPalace: number };
  palaces: QimenPalace[]; // display order 4 9 2 / 3 5 7 / 8 1 6
}
