const item = (calories, protein, carbs, fat, fibre) => ({ calories, protein, carbs, fat, fibre });

// Per usual Indian home-serving. These are deliberately estimates, not medical-grade values.
export const foods = [
  { names: ["chicken biryani", "veg biryani", "vegetable biryani", "egg biryani", "mutton biryani", "biryani"], value: item(520, 20, 69, 18, 4), unit: "plate(s)", baseAmount: 1 },
  { names: ["paneer butter masala", "butter chicken", "chicken curry", "paneer curry", "mutton curry", "curry"], value: item(330, 19, 12, 23, 3), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["masala dosa", "plain dosa", "ghee roast dosa", "dosa"], value: item(270, 6, 42, 9, 3) },
  { names: ["idli", "idly"], value: item(58, 2, 12, 0.4, 0.7) },
  { names: ["medu vada", "vada", "wada"], value: item(140, 4, 15, 7, 2) },
  { names: ["sambar", "sambhar"], value: item(120, 5, 18, 3, 5), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["coconut chutney", "chutney"], value: item(80, 1, 3, 7, 1.5) },
  { names: ["upma"], value: item(230, 6, 38, 6, 4) },
  { names: ["poha", "aval"], value: item(250, 5, 45, 6, 3) },
  { names: ["chapati", "roti", "phulka", "fulka"], value: item(110, 3.5, 22, 1.5, 3) },
  { names: ["paratha", "parantha", "aloo paratha", "paneer paratha"], value: item(220, 5, 31, 9, 4) },
  { names: ["dal", "dhal", "dal fry", "dal tadka", "yellow dal"], value: item(180, 10, 27, 4, 7), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["rajma"], value: item(250, 13, 40, 5, 11), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["chole", "chana masala", "chickpea curry"], value: item(280, 14, 42, 7, 12), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["white rice", "steamed rice", "boiled rice", "rice", "jeera rice"], value: item(205, 4, 45, 0.4, 0.6) },
  { names: ["curd rice", "yogurt rice", "thayir sadam"], value: item(280, 8, 45, 7, 1), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["lemon rice", "pulihora", "tamarind rice"], value: item(300, 5, 50, 9, 3) },
  { names: ["vegetable pulao", "veg pulao", "pulao", "pulav"], value: item(320, 7, 55, 8, 4) },
  { names: ["paneer tikka"], value: item(290, 20, 10, 19, 2) },
  { names: ["paneer"], value: item(265, 18, 6, 20, 0) },
  { names: ["chicken breast", "grilled chicken", "boiled chicken"], value: item(165, 31, 0, 3.6, 0) },
  { names: ["chicken"], value: item(230, 27, 0, 13, 0) },
  { names: ["egg bhurji", "scrambled egg", "omelette", "omelet"], value: item(190, 13, 3, 14, 1) },
  { names: ["boiled egg", "egg"], value: item(78, 6, 0.6, 5, 0) },
  { names: ["egg white"], value: item(17, 3.6, 0.2, 0.1, 0) },
  { names: ["fish curry"], value: item(220, 26, 8, 10, 1), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["fish fry", "grilled fish", "fish"], value: item(210, 26, 3, 10, 0) },
  { names: ["buttermilk", "chaas", "mattha"], value: item(70, 4, 8, 2, 0), unit: "glass(es)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["milk", "cow milk", "full cream milk", "toned milk"], value: item(150, 8, 12, 8, 0), unit: "ml", baseAmount: 250, isLiquidOrSemi: true },
  { names: ["curd", "yogurt", "dahi"], value: item(100, 6, 8, 5, 0), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["banana"], value: item(105, 1.3, 27, 0.4, 3) },
  { names: ["apple"], value: item(95, 0.5, 25, 0.3, 4.4) },
  { names: ["mango"], value: item(135, 1.1, 35, 0.6, 3.7) },
  { names: ["papaya"], value: item(60, 0.7, 15, 0.4, 2.5) },
  { names: ["protein shake", "whey protein", "whey scoop", "whey"], value: item(130, 24, 4, 2, 1), unit: "scoop(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["peanut butter"], value: item(190, 8, 7, 16, 2) },
  { names: ["peanuts", "groundnuts"], value: item(170, 7, 6, 14, 3) },
  { names: ["almonds", "badam"], value: item(160, 6, 6, 14, 3.5) },
  { names: ["samosa"], value: item(260, 5, 31, 14, 3) },
  { names: ["pakora", "pakoda", "bhajji"], value: item(190, 5, 20, 10, 3) },
  { names: ["gulab jamun"], value: item(150, 3, 25, 5, 0.5) },
  { names: ["rasgulla"], value: item(125, 3, 27, 1, 0.2) },
  { names: ["chai", "tea", "milk tea"], value: item(90, 3, 12, 3, 0), unit: "cup(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["black tea", "green tea"], value: item(5, 0, 1, 0, 0), unit: "cup(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["coffee", "filter coffee"], value: item(80, 3, 10, 3, 0), unit: "cup(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["black coffee"], value: item(5, 0.3, 0, 0, 0), unit: "cup(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["rasam", "soup", "tomato soup", "chicken soup"], value: item(65, 2, 10, 1.5, 1), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["kheer", "payasam"], value: item(240, 6, 36, 8, 1), unit: "bowl(s)", baseAmount: 1, isLiquidOrSemi: true },
  { names: ["oats", "oatmeal"], value: item(150, 5, 27, 3, 4) },
  { names: ["bread slice", "slice of bread", "bread"], value: item(75, 2.5, 14, 1, 1) },
  { names: ["sweet potato"], value: item(115, 2, 27, 0.2, 4) }
];

export const rounded = (value) => Math.round(value * 10) / 10;
export const add = (total, value, multiplier) => Object.fromEntries(
  Object.entries(total).map(([key, amount]) => [key, rounded(amount + value[key] * multiplier)])
);

// Recognizes portions like: 2 rotis, 1.5 cups dal, 2 bowls rice, 300 ml milk
export function parseQuantity(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Check for unit or direct multiplier preceding the phrase
  // e.g. "2 x roti", "2 rotis", "1.5 cups of rice", "2 bowls dal", "250 ml milk"
  const regex = new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s*(?:x|×|cups?|bowls?|plates?|servings?|pieces?|pcs?|slices?|glasses?|scoops?)?\\s*(?:of\\s+)?${escaped}s?\\b`, "i");
  const match = text.match(regex);
  if (match) {
    const val = Number(match[1]);
    return Number.isFinite(val) && val > 0 ? Math.min(20, val) : 1;
  }
  return 1;
}

export function estimateFood(text, customFoods = []) {
  if (!text || typeof text !== "string") return null;
  // Preserve decimal points in portions (e.g. 1.5 rotis)
  const normalized = text.toLowerCase().replace(/[^a-z0-9.\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  let total = item(0, 0, 0, 0, 0);
  const matched = [];
  const claimed = [];
  const matchedDetails = [];

  // Check custom foods first
  for (const cf of customFoods) {
    const cfName = cf.name.toLowerCase().trim();
    if (normalized.includes(cfName) && !claimed.some((used) => used.includes(cfName) || cfName.includes(used))) {
      const multiplier = parseQuantity(normalized, cfName);
      total = add(total, cf, multiplier);
      matched.push(`${multiplier !== 1 ? `${multiplier} × ` : ""}${cf.name} (Custom)`);
      claimed.push(cfName);
      matchedDetails.push({
        name: cf.name,
        value: { calories: cf.calories, protein: cf.protein, carbs: cf.carbs, fat: cf.fat, fibre: cf.fibre },
        multiplier,
        unit: cf.unit || null,
        baseAmount: cf.baseAmount || 1,
        isLiquidOrSemi: Boolean(cf.unit)
      });
    }
  }

  // Check built-in catalog
  for (const food of foods) {
    const match = food.names.find((name) =>
      normalized.includes(name) && !claimed.some((used) => used.includes(name) || name.includes(used))
    );
    if (!match) continue;
    let multiplier = parseQuantity(normalized, match);
    if (food.unit === "ml" && normalized.includes("ml")) {
      const mlRegex = new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s*ml\\s*(?:of\\s+)?${match}s?\\b`, "i");
      const mlMatch = normalized.match(mlRegex);
      if (mlMatch) {
        multiplier = Number(mlMatch[1]) / (food.baseAmount || 250);
      }
    }
    total = add(total, food.value, multiplier);
    matched.push(`${multiplier !== 1 ? `${multiplier} × ` : ""}${match}`);
    claimed.push(match);
    matchedDetails.push({
      name: match,
      value: food.value,
      multiplier,
      unit: food.unit || null,
      baseAmount: food.baseAmount || 1,
      isLiquidOrSemi: Boolean(food.isLiquidOrSemi || food.unit)
    });
  }

  if (!matched.length) return null;

  // Identify any semi-liquid or liquid item that has a defined portion unit
  const scalableItem = matchedDetails.find((d) => d.isLiquidOrSemi) || matchedDetails.find((d) => d.unit);

  let quantityUnit = undefined;
  let baseAmount = undefined;
  let defaultAmount = undefined;
  let unitItemName = undefined;

  if (scalableItem) {
    quantityUnit = scalableItem.unit;
    baseAmount = scalableItem.baseAmount;
    unitItemName = scalableItem.name;
    defaultAmount = scalableItem.unit === "ml"
      ? Math.round(scalableItem.multiplier * scalableItem.baseAmount)
      : scalableItem.multiplier;
  }

  return {
    ...total,
    matched,
    confidence: "approximate",
    items: matchedDetails,
    ...(quantityUnit ? { quantityUnit, baseAmount, defaultAmount, unitItemName } : {})
  };
}

/**
 * Calculates scaled nutrition based on user-entered quantity for liquid and semi-liquid items.
 * @param {Object} estimate - Result from estimateFood
 * @param {number|string} amount - Quantity entered by the user
 * @returns {{ calories: number, protein: number, carbs: number, fat: number, fibre: number }}
 */
export function calculateScaledNutrition(estimate, amount) {
  if (!estimate) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  }
  if (!estimate.quantityUnit) {
    return {
      calories: Math.round(estimate.calories),
      protein: Math.round(estimate.protein),
      carbs: Math.round(estimate.carbs),
      fat: Math.round(estimate.fat),
      fibre: Math.round(estimate.fibre)
    };
  }

  const userAmt = Number(amount);
  const validAmt = Number.isFinite(userAmt) && userAmt > 0 ? userAmt : estimate.baseAmount;

  if (Array.isArray(estimate.items) && estimate.items.length > 0) {
    let totCal = 0, totProt = 0, totCarb = 0, totFat = 0, totFib = 0;
    for (const it of estimate.items) {
      if (it.isLiquidOrSemi || it.unit === estimate.quantityUnit) {
        const itemFactor = validAmt / it.baseAmount;
        totCal += it.value.calories * itemFactor;
        totProt += it.value.protein * itemFactor;
        totCarb += it.value.carbs * itemFactor;
        totFat += it.value.fat * itemFactor;
        totFib += it.value.fibre * itemFactor;
      } else {
        totCal += it.value.calories * it.multiplier;
        totProt += it.value.protein * it.multiplier;
        totCarb += it.value.carbs * it.multiplier;
        totFat += it.value.fat * it.multiplier;
        totFib += it.value.fibre * it.multiplier;
      }
    }
    return {
      calories: Math.round(totCal),
      protein: Math.round(totProt * 10) / 10,
      carbs: Math.round(totCarb * 10) / 10,
      fat: Math.round(totFat * 10) / 10,
      fibre: Math.round(totFib * 10) / 10
    };
  }

  const factor = validAmt / estimate.baseAmount;
  return {
    calories: Math.round(estimate.calories * factor),
    protein: Math.round(estimate.protein * factor * 10) / 10,
    carbs: Math.round(estimate.carbs * factor * 10) / 10,
    fat: Math.round(estimate.fat * factor * 10) / 10,
    fibre: Math.round(estimate.fibre * factor * 10) / 10
  };
}

