const toolList = [
  {
    "ID": 1,
    "translationLabel": "alchemistsSuppliesLabel",
    "toolCategoryNumber": 1,
    "toolAbility": "intelligenceLabel",
    "utilizeToolLabel": "alchemistsSuppliesUtilizeLabel",
    "toolCraft": ["acidLabel", "alchemistsFireLabel", "componentPouchLabel", "oilLabel", "paperLabel", "perfumeLabel"],
    "costValue": 50,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 2,
    "translationLabel": "brewersSuppliesLabel",
    "toolCategoryNumber": 1,
    "toolAbility": "intelligenceLabel",
    "utilizeToolLabel": "brewersSuppliesUtilizeLabel",
    "toolCraft": ["antitoxinLabel"],
    "costValue": 20,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 3,
    "translationLabel": "calligraphersSuppliesLabel",
    "toolCategoryNumber": 1,
    "toolAbility": "dexterityLabel",
    "utilizeToolLabel": "calligraphersSuppliesUtilizeLabel",
    "toolCraft": ["inkLabel", "spellScrollLabel"],
    "costValue": 10,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 4,
    "translationLabel": "carpentersToolsLabel",
    "toolCategoryNumber": 3,
    "toolAbility": "strengthLabel",
    "utilizeToolLabel": "carpentersToolsUtilizeLabel",
    "toolCraft": ["clubLabel", "greatclubLabel", "quarterstaffLabel", "barrelLabel", "chestLabel", "ladderLabel", "poleLabel", "portableRamLabel", "torchLabel"],
    "costValue": 8,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 5,
    "translationLabel": "cartographersToolsLabel",
    "toolCategoryNumber": 1,
    "toolAbility": "wisdomLabel",
    "utilizeToolLabel": "cartographersToolsUtilizeLabel",
    "toolCraft": ["mapLabel"],
    "costValue": 15,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 6,
    "translationLabel": "cobblersToolsLabel",
    "toolCategoryNumber": 1,
    "toolAbility": "dexterityLabel",
    "utilizeToolLabel": "cobblersToolsUtilizeLabel",
    "toolCraft": ["climbersKitLabel"],
    "costValue": 5,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 7,
    "translationLabel": "cooksUtensilsLabel",
    "toolCategoryNumber": 1,
    "toolAbility": "wisdomLabel",
    "utilizeToolLabel": "cooksUtensilsUtilizeLabel",
    "toolCraft": ["rationsLabel"],
    "costValue": 1,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 8,
    "translationLabel": "glassblowersToolsLabel",
    "toolCategoryNumber": 1,
    "toolAbility": "intelligenceLabel",
    "utilizeToolLabel": "glassblowersToolsUtilizeLabel",
    "toolCraft": ["glassBottleLabel", "magnifyingGlassLabel", "spyglassLabel", "vialLabel"],
    "costValue": 30,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 9,
    "translationLabel": "jewelersToolsLabel",
    "toolCategoryNumber": 1,
    "toolAbility": "intelligenceLabel",
    "utilizeToolLabel": "jewelersToolsUtilizeLabel",
    "toolCraft": ["arcaneFocusLabel", "holySymbolLabel"],
    "costValue": 25,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 10,
    "translationLabel": "leatherworkersToolsLabel",
    "toolCategoryNumber": 3,
    "toolAbility": "dexterityLabel",
    "utilizeToolLabel": "leatherworkersToolsUtilizeLabel",
    "toolCraft": ["slingLabel", "whipLabel", "hideArmorLabel", "leatherArmorLabel", "studdedLeatherArmorLabel", "backpackLabel", "crossbowBoltCaseLabel", "mapOrScrollCaseLabel", "parchmentLabel", "pouchLabel", "quiverLabel", "waterskinLabel"],
    "costValue": 5,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 11,
    "translationLabel": "masonsToolsLabel",
    "toolCategoryNumber": 3,
    "toolAbility": "strengthLabel",
    "utilizeToolLabel": "masonsToolsUtilizeLabel",
    "toolCraft": ["blockAndTackleLabel"],
    "costValue": 10,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 12,
    "translationLabel": "paintersSuppliesLabel",
    "toolCategoryNumber": 1,
    "toolAbility": "wisdomLabel",
    "utilizeToolLabel": "paintersSuppliesUtilizeLabel",
    "toolCraft": ["druidicFocusLabel", "holySymbolLabel"],
    "costValue": 10,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 13,
    "translationLabel": "pottersToolsLabel",
    "toolCategoryNumber": 3,
    "toolAbility": "intelligenceLabel",
    "utilizeToolLabel": "pottersToolsUtilizeLabel",
    "toolCraft": ["jugLabel", "lampLabel"],
    "costValue": 10,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 14,
    "translationLabel": "smithsToolsLabel",
    "toolCategoryNumber": 3,
    "toolAbility": "strengthLabel",
    "utilizeToolLabel": "smithsToolsUtilizeLabel",
    "toolCraft": ["anyMeleeWeaponLabel", "mediumArmorLabel", "heavyArmorLabel", "ballBearingsLabel", "bucketLabel", "caltropsLabel", "chainLabel", "crowbarLabel", "firearmBulletsLabel", "grapplingHookLabel", "ironPotLabel", "ironSpikesLabel", "slingBulletsLabel"],
    "costValue": 20,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 15,
    "translationLabel": "tinkersToolsLabel",
    "toolCategoryNumber": 3,
    "toolAbility": "dexterityLabel",
    "utilizeToolLabel": "tinkersToolsUtilizeLabel",
    "toolCraft": ["musketLabel", "pistolLabel", "bellLabel", "bullseyeLanternLabel", "flaskLabel", "hoodedLanternLabel", "huntersTrapLabel", "lockLabel", "manaclesLabel", "mirrorLabel", "shovelLabel", "signalWhistleLabel", "tinderboxLabel"],
    "costValue": 50,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 16,
    "translationLabel": "weaversToolsLabel",
    "toolCategoryNumber": 3,
    "toolAbility": "dexterityLabel",
    "utilizeToolLabel": "weaversToolsUtilizeLabel",
    "toolCraft": ["paddedArmorLabel", "basketLabel", "bedrollLabel", "blanketLabel", "fineClothesLabel", "netLabel", "robeLabel", "ropeLabel", "sackLabel", "stringLabel", "tentLabel", "travelersClothesLabel"],
    "costValue": 1,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 17,
    "translationLabel": "woodcarversToolsLabel",
    "toolCategoryNumber": 3,
    "toolAbility": "dexterityLabel",
    "utilizeToolLabel": "woodcarversToolsUtilizeLabel",
    "toolCraft": ["clubLabel", "greatclubLabel", "quarterstaffLabel", "rangedWeaponsLabel", "arcaneFocusLabel", "arrowsLabel", "boltsLabel", "druidicFocusLabel", "inkPenLabel", "needlesLabel"],
    "costValue": 1,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 18,
    "translationLabel": "disguiseKitLabel",
    "toolCategoryNumber": 2,
    "toolAbility": "charismaLabel",
    "utilizeToolLabel": "disguiseKitUtilizeLabel",
    "toolCraft": ["costumeLabel"],
    "costValue": 25,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 19,
    "translationLabel": "forgeryKitLabel",
    "toolCategoryNumber": 2,
    "toolAbility": "dexterityLabel",
    "utilizeToolLabel": "forgeryKitUtilizeLabel",
    "toolCraft": 0,
    "costValue": 15,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 20,
    "translationLabel": "gamingSetLabel",
    "toolCategoryNumber": 2,
    "toolAbility": "wisdomLabel",
    "utilizeToolLabel": "gamingSetUtilizeLabel",
    "toolCraft": 0,
    "costValue": 0,
    "costUnit": "GPLabel",
    "varies": ["diceLabel", "dragonchessLabel", "playingCardsLabel", "threeDragonAnteLabel"]
  },
  {
    "ID": 21,
    "translationLabel": "herbalismKitLabel",
    "toolCategoryNumber": 2,
    "toolAbility": "intelligenceLabel",
    "utilizeToolLabel": "herbalismKitUtilizeLabel",
    "toolCraft": ["antitoxinLabel", "candleLabel", "healersKitLabel", "potionOfHealingLabel"],
    "costValue": 5,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 22,
    "translationLabel": "musicalInstrumentLabel",
    "toolCategoryNumber": 2,
    "toolAbility": "charismaLabel",
    "utilizeToolLabel": "musicalInstrumentUtilizeLabel",
    "toolCraft": 0,
    "costValue": 0,
    "costUnit": "GPLabel",
    "varies": ["bagpipesLabel", "drumLabel", "dulcimerLabel", "fluteLabel", "hornLabel", "luteLabel", "lyreLabel", "panFluteLabel", "shawmLabel", "violLabel"]
  },
  {
    "ID": 23,
    "translationLabel": "navigatorsToolsLabel",
    "toolCategoryNumber": 2,
    "toolAbility": "wisdomLabel",
    "utilizeToolLabel": "navigatorsToolsUtilizeLabel",
    "toolCraft": 0,
    "costValue": 25,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 24,
    "translationLabel": "poisonersKitLabel",
    "toolCategoryNumber": 2,
    "toolAbility": "intelligenceLabel",
    "utilizeToolLabel": "poisonersKitUtilizeLabel",
    "toolCraft": ["basicPoisonLabel"],
    "costValue": 50,
    "costUnit": "GPLabel",
    "varies": 0
  },
  {
    "ID": 25,
    "translationLabel": "thievesToolsLabel",
    "toolCategoryNumber": 2,
    "toolAbility": "dexterityLabel",
    "utilizeToolLabel": "thievesToolsUtilizeLabel",
    "toolCraft": 0,
    "costValue": 25,
    "costUnit": "GPLabel",
    "varies": 0
  }
];

const toolCategoryList = [
    {
        "toolCategoryNumber": 1,
        "translationLabel": "artisansToolsLabel"
    },
    {
        "toolCategoryNumber": 2,
        "translationLabel": "otherToolsLabel"
    },
    {
        "toolCategoryNumber": 3,
        "translationLabel": "artisansFastCraftingToolsLabel"
    }
];

const instrumentList = [
    {
        "instrumentCategoryNumber": 1,
        "translationLabel": "bagpipesLabel",
        "weight": 6,
        "costValue": 30,
        "costUnit": "GPLabel"
    },
    {
        "instrumentCategoryNumber": 2,
        "translationLabel": "drumLabel",
        "weight": 3,
        "costValue": 6,
        "costUnit": "GPLabel"
    },
    {
        "instrumentCategoryNumber": 3,
        "translationLabel": "dulcimerLabel",
        "weight": 10,
        "costValue": 25,
        "costUnit": "GPLabel"
    },
    {
        "instrumentCategoryNumber": 4,
        "translationLabel": "fluteLabel",
        "weight": 1,
        "costValue": 2,
        "costUnit": "GPLabel"
    },
    {
        "instrumentCategoryNumber": 5,
        "translationLabel": "hornLabel",
        "weight": 2,
        "costValue": 3,
        "costUnit": "GPLabel"
    },
    {
        "instrumentCategoryNumber": 6,
        "translationLabel": "luteLabel",
        "weight": 2,
        "costValue": 35,
        "costUnit": "GPLabel"
    },
    {
        "instrumentCategoryNumber": 7,
        "translationLabel": "lyreLabel",
        "weight": 2,
        "costValue": 30,
        "costUnit": "GPLabel"
    },
    {
        "instrumentCategoryNumber": 8,
        "translationLabel": "panFluteLabel",
        "weight": 2,
        "costValue": 12,
        "costUnit": "GPLabel"
    },
    {
        "instrumentCategoryNumber": 9,
        "translationLabel": "shawmLabel",
        "weight": 1,
        "costValue": 2,
        "costUnit": "GPLabel"
    },
    {
        "instrumentCategoryNumber": 10,
        "translationLabel": "violLabel",
        "weight": 1,
        "costValue": 30,
        "costUnit": "GPLabel"
    }
];

const gameList = [
  {
    gameCategoryNumber: 1,
    translationLabel: "diceLabel",
    weight: 0,
    costValue: 1,
    costUnit: "SPLabel"
  },
  {
    gameCategoryNumber: 2,
    translationLabel: "dragonchessLabel",
    weight: 0,
    costValue: 1,
    costUnit: "GPLabel"
  },
  {
    gameCategoryNumber: 3,
    translationLabel: "playingCardsLabel",
    weight: 0,
    costValue: 5,
    costUnit: "SPLabel"
  },
  {
    gameCategoryNumber: 4,
    translationLabel: "threeDragonAnteLabel",
    weight: 0,
    costValue: 1,
    costUnit: "GPLabel"
  }
];