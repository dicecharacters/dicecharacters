const attributeList = [
  {
    "ID": 1,
    "translationLabel": "strengthLabel",
    "skillCategoryNumber": 4
  },
  {
    "ID": 2,
    "translationLabel": "dexterityLabel",
    "skillCategoryNumber": [1, 16, 17]
  },
  {
    "ID": 3,
    "translationLabel": "constitutionLabel",
    "skillCategoryNumber": 0
  },
  {
    "ID": 4,
    "translationLabel": "intelligenceLabel",
    "skillCategoryNumber": [3, 6, 9, 11, 15]
  },
  {
    "ID": 5,
    "translationLabel": "wisdomLabel",
    "skillCategoryNumber": [2, 7, 10, 12, 18]
  },
  {
    "ID": 6,
    "translationLabel": "charismaLabel",
    "skillCategoryNumber": [5, 8, 13, 14]
  }
];

const attributeScorePointCosts = [
  {
    "score": 8,
    "cost": 0
  },
  {
    "score": 9,
    "cost": 1
  },
  {
    "score": 10,
    "cost": 2
  },
  {
    "score": 11,
    "cost": 3
  },
  {
    "score": 12,
    "cost": 4
  },
  {
    "score": 13,
    "cost": 5
  },
  {
    "score": 14,
    "cost": 7
  },
  {
    "score": 15,
    "cost": 9
  }
];

const modifierList = [
  {
    "score": 3,
    "modifier": -4
  },
  {
    "score": 4,
    "modifier": -3
  },
  {
    "score": 5,
    "modifier": -3
  },
  {
    "score": 6,
    "modifier": -2
  },
  {
    "score": 7,
    "modifier": -2
  },
  {
    "score": 8,
    "modifier": -1
  },
  {
    "score": 9,
    "modifier": -1
  },
  {
    "score": 10,
    "modifier": 0
  },
  {
    "score": 11,
    "modifier": 0
  },
  {
    "score": 12,
    "modifier": +1
  },
  {
    "score": 13,
    "modifier": +1
  },
  {
    "score": 14,
    "modifier": +2
  },
  {
    "score": 15,
    "modifier": +2
  },
  {
    "score": 16,
    "modifier": +3
  },
  {
    "score": 17,
    "modifier": +3
  },
  {
    "score": 18,
    "modifier": +4
  },
  {
    "score": 19,
    "modifier": +4
  },
  {
    "score": 20,
    "modifier": +5
  }
];

const XPList = [
  {
    "level": 1,
    "xp": 0
  },
  {
    "level": 2,
    "xp": 300
  },
  {
    "level": 3,
    "xp": 900
  },
  {
    "level": 4,
    "xp": 2700
  },
  {
    "level": 5,
    "xp": 6500
  },
  {
    "level": 6,
    "xp": 14000
  },
  {
    "level": 7,
    "xp": 23000
  },
  {
    "level": 8,
    "xp": 34000
  },
  {
    "level": 9,
    "xp": 48000
  },
  {
    "level": 10,
    "xp": 64000
  },
  {
    "level": 11,
    "xp": 85000
  },
  {
    "level": 12,
    "xp": 100000
  },
  {
    "level": 13,
    "xp": 120000
  },
  {
    "level": 14,
    "xp": 140000
  },
  {
    "level": 15,
    "xp": 165000
  },
  {
    "level": 16,
    "xp": 195000
  },
  {
    "level": 17,
    "xp": 225000
  },
  {
    "level": 18,
    "xp": 265000
  },
  {
    "level": 19,
    "xp": 305000
  },
  {
    "level": 20,
    "xp": 355000
  }
];

const classCoreTraitsList = [
  {
    "ID": 1,
    "translationLabel": "barbarian",
    "primaryAbility": "strengthLabel",
    "hitPointDie": "D12",
    "savingThrowProficiencies": ["strengthLabel", "constitutionLabel"],
    "skillCategoryNumber": [2, 4, 8, 11, 12, 18],
    "spellcastingLabel": 0,
    "spellcastingAbility": 0,
    "spellcastingFocus": 0,
    "weaponCategoryNumber": [1, 2, 3, 4],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": [1, 2, 4],
    "toolLabel": 0,
    "startingEquipmentA": ["greataxeLabel", "4xhandaxeLabel", "explorersPackLabel", "15 GP"],
    "startingEquipmentB": "75 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 2,
    "translationLabel": "bard",
    "primaryAbility": "charismaLabel",
    "hitPointDie": "D8",
    "savingThrowProficiencies": ["dexterityLabel", "charismaLabel"],
    "skillCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    "spellcastingLabel": 1,
    "spellcastingAbility": "charismaLabel",
    "spellcastingFocus": "musicalInstrumentLabel",
    "weaponCategoryNumber": [1, 2],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": 1,
    "toolLabel": "musicalInstrumentLabel",
    "startingEquipmentA": ["leatherArmorLabel", "2xdaggerLabel", "musicalInstrumentLabel(3)", "entertainersPackLabel", "19 GP"],
    "startingEquipmentB": "90 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 3,
    "translationLabel": "cleric",
    "primaryAbility": "wisdomLabel",
    "hitPointDie": "D8",
    "savingThrowProficiencies": ["wisdomLabelLabel", "charismaLabel"],
    "skillCategoryNumber": [6, 7, 10, 14, 15],
    "spellcastingLabel": 1,
    "spellcastingAbility": "wisdomLabel",
    "spellcastingFocus": "holySymbolLabel",
    "weaponCategoryNumber": [1, 2],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": [1, 2, 4],
    "toolLabel": 0,
    "startingEquipmentA": ["chainShirtLabel", "shieldLabel", "maceLabel", "list_holySymbolLabel", "priestsPackLabel", "7 GP"],
    "startingEquipmentB": "110 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 4,
    "translationLabel": "druid",
    "primaryAbility": "wisdomLabel",
    "hitPointDie": "D8",
    "savingThrowProficiencies": ["intelligenceLabel", "wisdomLabel"],
    "skillCategoryNumber": [3, 2, 7, 10, 11, 12, 15, 18],
    "spellcastingLabel": 1,
    "spellcastingAbility": "wisdomLabel",
    "spellcastingFocus": "druidicFocusLabel",
    "weaponCategoryNumber": [1, 2],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": [1, 4],
    "toolLabel": "herbalismKitLabel",
    "startingEquipmentA": ["leatherArmorLabel", "shieldLabel", "sickleLabel", "woodenStaffFocusLabel", "explorersPackLabel", "herbalismKitLabel", "9 GP"],
    "startingEquipmentB": "50 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 5,
    "translationLabel": "fighter",
    "primaryAbility": ["strengthLabel", "dexterityLabel"],
    "hitPointDie": "D10",
    "savingThrowProficiencies": ["strengthLabel", "constitutionLabel"],
    "skillCategoryNumber": [1, 2, 4, 6, 7, 8, 14, 12, 18],
    "spellcastingLabel": 0,
    "spellcastingAbility": 0,
    "spellcastingFocus": 0,
    "weaponCategoryNumber": [1, 2, 3, 4],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": [1, 2, 3, 4],
    "toolLabel": 0,
    "startingEquipmentA": ["chainMailLabel", "greatswordLabel", "flailLabel", "8xjavelinLabel", "dungeoneersPackLabel", "4 GP"],
    "startingEquipmentB": ["studdedLeatherArmorLabel", "scimitarLabel", "shortswordLabel", "longbowLabel", "20xarrowLabel", "quiverLabel", "dungeoneersPackLabel", "11 GP"],
    "startingEquipmentC": "155 GP"
  },
  {
    "ID": 6,
    "translationLabel": "monk",
    "primaryAbility": ["dexterityLabel", "wisdomLabel"],
    "hitPointDie": "D8",
    "savingThrowProficiencies": ["strengthLabel", "dexterityLabel"],
    "skillCategoryNumber": [1, 4, 6, 7, 15, 17],
    "spellcastingLabel": 0,
    "spellcastingAbility": 0,
    "spellcastingFocus": 0,
    "weaponCategoryNumber": [1, 2, 3, 4],
    "weaponPropertyCategoryNumber": [1],
    "armorCategoryNumber": 0,
    "toolLabel": ["artisansToolsLabel", "musicalInstrumentLabel"],
    "startingEquipmentA": ["spearLabel", "5xdaggerLabel", "artisansToolsLabel(1)","musicalInstrumentLabel(1)","explorersPackLabel", "11 GP"],
    "startingEquipmentB": "50 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 7,
    "translationLabel": "paladin",
    "primaryAbility": ["strengthLabel", "charismaLabel"],
    "hitPointDie": "D10",
    "savingThrowProficiencies": ["wisdomLabel", "charismaLabel"],
    "skillCategoryNumber": [4, 7, 8, 10, 14, 15],
    "spellcastingLabel": 1,
    "spellcastingAbility": "charismaLabel",
    "spellcastingFocus": "holySymbolLabel",
    "weaponCategoryNumber": [1, 2, 3, 4],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": [1, 2, 3, 4],
    "toolLabel": 0,
    "startingEquipmentA": ["chainMailLabel", "shieldLabel", "longswordLabel", "6xjavelinLabel", "list_holySymbolLabel", "priestsPackLabel", "9 GP"],
    "startingEquipmentB": "150 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 8,
    "translationLabel": "ranger",
    "primaryAbility": ["dexterityLabel", "wisdomLabel"],
    "hitPointDie": "D10",
    "savingThrowProficiencies": ["dexterityLabel", "wisdomLabel"],
    "skillCategoryNumber": [2, 4, 7, 9, 11, 12, 17, 18],
    "spellcastingLabel": 1,
    "spellcastingAbility": "wisdomLabel",
    "spellcastingFocus": "druidicFocusLabel",
    "weaponCategoryNumber": [1, 2, 3, 4],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": [1, 2, 4],
    "toolLabel": 0,
    "startingEquipmentA": ["studdedLeatherArmorLabel", "scimitarLabel", "shortswordLabel", "longbowLabel", "20xarrowLabel", "quiverLabel", "sprigOfMistletoeFocusLabel", "explorersPackLabel", "7 GP"],
    "startingEquipmentB": "150 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 9,
    "translationLabel": "rogue",
    "primaryAbility": "dexterityLabel",
    "hitPointDie": "D8",
    "savingThrowProficiencies": ["dexterityLabel", "intelligenceLabel"],
    "skillCategoryNumber": [1, 4, 5, 7, 8, 9, 12, 14, 16, 17],
    "spellcastingLabel": 0,
    "spellcastingAbility": 0,
    "spellcastingFocus": 0,
    "weaponCategoryNumber": [1, 2, 3, 4],
    "weaponPropertyCategoryNumber": [1, 2],
    "armorCategoryNumber": 1,
    "toolLabel": "thievesToolsLabel",
    "startingEquipmentA": ["leatherArmorLabel", "2xdaggerLabel", "shortswordLabel", "shortbowLabel", "20xarrowLabel", "quiverLabel", "thievesToolsLabel", "burglarsPackLabel", "8 GP"],
    "startingEquipmentB": "100 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 10,
    "translationLabel": "sorcerer",
    "primaryAbility": "charismaLabel",
    "hitPointDie": "D6",
    "savingThrowProficiencies": ["charismaLabel", "constitutionLabel"],
    "skillCategoryNumber": [3, 5, 7, 8, 14, 15],
    "spellcastingLabel": 1,
    "spellcastingAbility": "charismaLabel",
    "spellcastingFocus": "arcaneFocusLabel",
    "weaponCategoryNumber": [1, 2],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": 0,
    "toolLabel": 0,
    "startingEquipmentA": ["spearLabel", "2xdaggerLabel", "crystalFocusLabel", "dungeoneersPackLabel", "28 GP"],
    "startingEquipmentB": "50 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 11,
    "translationLabel": "warlock",
    "primaryAbility": "charismaLabel",
    "hitPointDie": "D8",
    "savingThrowProficiencies": ["wisdomLabel", "charismaLabel"],
    "skillCategoryNumber": [3, 5, 6, 8, 9, 11, 15],
    "spellcastingLabel": 1,
    "spellcastingAbility": "charismaLabel",
    "spellcastingFocus": "arcaneFocusLabel",
    "weaponCategoryNumber": [1, 2],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": 1,
    "toolLabel": 0,
    "startingEquipmentA": ["leatherArmorLabel", "sickleLabel", "2xdaggerLabel", "orbFocusLabel", "bookOccultLoreLabel", "scholarsPackLabel", "15 GP"],
    "startingEquipmentB": "100 GP",
    "startingEquipmentC": 0
  },
  {
    "ID": 12,
    "translationLabel": "wizard",
    "primaryAbility": "intelligenceLabel",
    "hitPointDie": "D6",
    "savingThrowProficiencies": ["intelligenceLabel", "wisdomLabel"],
    "skillCategoryNumber": [3, 6, 7, 9, 10, 11, 15],
    "spellcastingLabel": 1,
    "spellcastingAbility": "intelligenceLabel",
    "spellcastingFocus": ["arcaneFocusLabel", "spellbookLabel"],
    "weaponCategoryNumber": [1, 2],
    "weaponPropertyCategoryNumber": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "armorCategoryNumber": 0,
    "toolLabel": 0,
    "startingEquipmentA": ["2xdaggerLabel", "staffFocusLabel", "robeLabel", "spellbookLabel", "scholarsPackLabel", "5 GP"],
    "startingEquipmentB": "55 GP",
    "startingEquipmentC": 0
  }
];

const subclassSpellAbillityList = [
  {
    "classLabel": "barbarian",
    "subclassLabel": "pathOfWildHeartLabel",
    "subclassCategoryNumber": 2,
    "spellAbillityLabel": "wisdomLabel"
  },
  {
    "classLabel": "fighter",
    "subclassLabel": "eldritchKnightLabel",
    "subclassCategoryNumber": 3,
    "spellAbillityLabel": "intelligenceLabel"
  },
  {
    "classLabel": "monk",
    "subclassLabel": "warriorOfShadowLabel",
    "subclassCategoryNumber": 2,
    "spellAbillityLabel": "wisdomLabel"
  },
  {
    "classLabel": "monk",
    "subclassLabel": "warriorOfTheElementsLabel",
    "subclassCategoryNumber": 3,
    "spellAbillityLabel": "wisdomLabel"
  },
  {
    "classLabel": "rogue",
    "subclassLabel": "arcaneTricksterLabel",
    "subclassCategoryNumber": 1,
    "spellAbillityLabel": "intelligenceLabel"
  }
];

const skillList = [
    {
        skillCategoryNumber: 1,
        translationLabel: "acrobaticsLabel",
        skillDLabel: "acrobaticsDLabel"
    },
    {
        skillCategoryNumber: 2,
        translationLabel: "animalHandlingLabel",
        skillDLabel: "animalHandlingDLabel"
    },
    {
        skillCategoryNumber: 3,
        translationLabel: "arcanaLabel",
        skillDLabel: "arcanaDLabel"
    },
    {
        skillCategoryNumber: 4,
        translationLabel: "athleticsLabel",
        skillDLabel: "athleticsDLabel"
    },
    {
        skillCategoryNumber: 5,
        translationLabel: "deceptionLabel",
        skillDLabel: "deceptionDLabel"
    },
    {
        skillCategoryNumber: 6,
        translationLabel: "historyLabel",
        skillDLabel: "historyDLabel"
    },
    {
        skillCategoryNumber: 7,
        translationLabel: "insightLabel",
        skillDLabel: "insightDLabel"
    },
    {
        skillCategoryNumber: 8,
        translationLabel: "intimidationLabel",
        skillDLabel: "intimidationDLabel"
    },
    {
        skillCategoryNumber: 9,
        translationLabel: "investigationLabel",
        skillDLabel: "investigationDLabel"
    },
    {
        skillCategoryNumber: 10,
        translationLabel: "medicineLabel",
        skillDLabel: "medicineDLabel"
    },
    {
        skillCategoryNumber: 11,
        translationLabel: "natureLabel",
        skillDLabel: "natureDLabel"
    },
    {
        skillCategoryNumber: 12,
        translationLabel: "perceptionLabel",
        skillDLabel: "perceptionDLabel"
    },
    {
        skillCategoryNumber: 13,
        translationLabel: "performanceLabel",
        skillDLabel: "performanceDLabel"
    },
    {
        skillCategoryNumber: 14,
        translationLabel: "persuasionLabel",
        skillDLabel: "persuasionDLabel"
    },
    {
        skillCategoryNumber: 15,
        translationLabel: "religionLabel",
        skillDLabel: "religionDLabel"
    },
    {
        skillCategoryNumber: 16,
        translationLabel: "sleightOfHandLabel",
        skillDLabel: "sleightOfHandDLabel"
    },
    {
        skillCategoryNumber: 17,
        translationLabel: "stealthLabel",
        skillDLabel: "stealthDLabel"
    },
    {
        skillCategoryNumber: 18,
        translationLabel: "survivalLabel",
        skillDLabel: "survivalDLabel"
    }
];

const coinList = [
  {
    "coinCategoryNumber": 1,
    "translationLabel": "CPLabel",
    "valueInGP": 0.01
  },
  {
    "coinCategoryNumber": 2,
    "translationLabel": "SPLabel",
    "valueInGP": 0.10
  },
  {
    "coinCategoryNumber": 3,
    "translationLabel": "EPLabel",
    "valueInGP": 0.50
  },
  {
    "coinCategoryNumber": 4,
    "translationLabel": "GPLabel",
    "valueInGP": 1.00
  },
  {
    "coinCategoryNumber": 5,
    "translationLabel": "PPLabel",
    "valueInGP": 10.00
  }
];

const languageList = [
  {
    "languageCategoryNumber": 1,
    "translationLabel": "commonLangLabel",
    "originSpeciesLabel": "sigilLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 2,
    "translationLabel": "commonSignLangLabel",
    "originSpeciesLabel": "sigilLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 3,
    "translationLabel": "draconicLangLabel",
    "originSpeciesLabel": "dragonLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 4,
    "translationLabel": "dwarvishLangLabel",
    "originSpeciesLabel": "dwarfLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 5,
    "translationLabel": "elvishLangLabel",
    "originSpeciesLabel": "elfLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 6,
    "translationLabel": "giantLangLabel",
    "originSpeciesLabel": "giantLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 7,
    "translationLabel": "gnomishLangLabel",
    "originSpeciesLabel": "gnomeLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 8,
    "translationLabel": "goblinLangLabel",
    "originSpeciesLabel": "goblinLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 9,
    "translationLabel": "halflingLangLabel",
    "originSpeciesLabel": "halflingLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 10,
    "translationLabel": "orcLangLabel",
    "originSpeciesLabel": "orcLabel",
    "langRarity": "standard"
  },
  {
    "languageCategoryNumber": 11,
    "translationLabel": "abyssalLangLabel",
    "originSpeciesLabel": "demonAbyssLabel",
    "langRarity": "rare"
  },
  {
    "languageCategoryNumber": 12,
    "translationLabel": "celestialLangLabel",
    "originSpeciesLabel": "celestialLabel",
    "langRarity": "rare"
  },
  {
    "languageCategoryNumber": 13,
    "translationLabel": "deepSpeechLangLabel",
    "originSpeciesLabel": "aberrationLabel",
    "langRarity": "rare"
  },
  {
    "languageCategoryNumber": 14,
    "translationLabel": "druidicLangLabel",
    "originSpeciesLabel": "druidicCircleLabel",
    "langRarity": "rare"
  },
  {
    "languageCategoryNumber": 15,
    "translationLabel": "infernalLangLabel",
    "originSpeciesLabel": "devilNineHellsLabel",
    "langRarity": "rare"
  },
  {
    "languageCategoryNumber": 16,
    "translationLabel": "primordialLangLabel",
    "originSpeciesLabel": "elementalLabel",
    "langRarity": "rare"
  },
  {
    "languageCategoryNumber": 17,
    "translationLabel": "sylvanLangLabel",
    "originSpeciesLabel": "feywildLabel",
    "langRarity": "rare"
  },
  {
    "languageCategoryNumber": 18,
    "translationLabel": "thievesCantLangLabel",
    "originSpeciesLabel": "criminalGuildLabel",
    "langRarity": "rare"
  },
  {
    "languageCategoryNumber": 19,
    "translationLabel": "undercommonLangLabel",
    "originSpeciesLabel": "underdarkLabel",
    "langRarity": "rare"
  }
];

const alignmentList = [
  {
    "alignmentCategoryNumber": 1,
    "alignmentAbbrLabel": "alignLGLabel",
    "translationLabel": "lawfulGoodLabel",
    "alignmentDLabel": "lawfulGoodDLabel"
  },
  {
    "alignmentCategoryNumber": 2,
    "alignmentAbbrLabel": "alignNGLabel",
    "translationLabel": "neutralGoodLabel",
    "alignmentDLabel": "neutralGoodDLabel"
  },
  {
    "alignmentCategoryNumber": 3,
    "alignmentAbbrLabel": "alignCGLabel",
    "translationLabel": "chaoticGoodLabel",
    "alignmentDLabel": "chaoticGoodDLabel"
  },
  {
    "alignmentCategoryNumber": 4,
    "alignmentAbbrLabel": "alignLNLabel",
    "translationLabel": "lawfulNeutralLabel",
    "alignmentDLabel": "lawfulNeutralDLabel"
  },
  {
    "alignmentCategoryNumber": 5,
    "alignmentAbbrLabel": "alignNLabel",
    "translationLabel": "neutralLabel",
    "alignmentDLabel": "neutralDLabel"
  },
  {
    "alignmentCategoryNumber": 6,
    "alignmentAbbrLabel": "alignCNLabel",
    "translationLabel": "chaoticNeutralLabel",
    "alignmentDLabel": "chaoticNeutralDLabel"
  },
  {
    "alignmentCategoryNumber": 7,
    "alignmentAbbrLabel": "alignLELabel",
    "translationLabel": "lawfulEvilLabel",
    "alignmentDLabel": "lawfulEvilDLabel"
  },
  {
    "alignmentCategoryNumber": 8,
    "alignmentAbbrLabel": "alignNELabel",
    "translationLabel": "neutralEvilLabel",
    "alignmentDLabel": "neutralEvilDLabel"
  },
  {
    "alignmentCategoryNumber": 9,
    "alignmentAbbrLabel": "alignCELabel",
    "translationLabel": "chaoticEvilLabel",
    "alignmentDLabel": "chaoticEvilDLabel"
  }
];

const personalityTraitList = [
  {
    "ID": 1,
    "alignmentCatergory": "chaoticLabel",
    "traitLabel": "boastfulLabel"
  },
  {
    "ID": 2,
    "alignmentCatergory": "chaoticLabel",
    "traitLabel": "impulsiveLabel"
  },
  {
    "ID": 3,
    "alignmentCatergory": "chaoticLabel",
    "traitLabel": "rebelliousLabel"
  },
  {
    "ID": 4,
    "alignmentCatergory": "chaoticLabel",
    "traitLabel": "selfAbsorbedLabel"
  },
  {
    "ID": 5,
    "alignmentCatergory": "goodLabel",
    "traitLabel": "compassionateLabel"
  },
  {
    "ID": 6,
    "alignmentCatergory": "goodLabel",
    "traitLabel": "helpfulLabel"
  },
  {
    "ID": 7,
    "alignmentCatergory": "goodLabel",
    "traitLabel": "honestLabel"
  },
  {
    "ID": 8,
    "alignmentCatergory": "goodLabel",
    "traitLabel": "kindLabel"
  },
  {
    "ID": 9,
    "alignmentCatergory": "evilLabel",
    "traitLabel": "dishonestLabel"
  },
  {
    "ID": 10,
    "alignmentCatergory": "evilLabel",
    "traitLabel": "vengefulLabel"
  },
  {
    "ID": 11,
    "alignmentCatergory": "evilLabel",
    "traitLabel": "cruelLabel"
  },
  {
    "ID": 12,
    "alignmentCatergory": "evilLabel",
    "traitLabel": "greedyLabel"
  },
  {
    "ID": 13,
    "alignmentCatergory": "lawfulLabel",
    "traitLabel": "cooperativeLabel"
  },
  {
    "ID": 14,
    "alignmentCatergory": "lawfulLabel",
    "traitLabel": "loyalLabel"
  },
  {
    "ID": 15,
    "alignmentCatergory": "lawfulLabel",
    "traitLabel": "judgmentalLabel"
  },
  {
    "ID": 16,
    "alignmentCatergory": "lawfulLabel",
    "traitLabel": "methodicalLabel"
  },
  {
    "ID": 17,
    "alignmentCatergory": "neutralLabel",
    "traitLabel": "selfishLabel"
  },
  {
    "ID": 18,
    "alignmentCatergory": "neutralLabel",
    "traitLabel": "disinterestedLabel"
  },
  {
    "ID": 19,
    "alignmentCatergory": "neutralLabel",
    "traitLabel": "laconicLabel"
  },
  {
    "ID": 20,
    "alignmentCatergory": "neutralLabel",
    "traitLabel": "pragmaticLabel"
  }
];

const damageType_All = [
  {
    "ID": 1,
    "damageCategory": 1,
    "translationLabel": "bludgeoningLabel"
  },
  {
    "ID": 2,
    "damageCategory": 1,
    "translationLabel": "piercingLabel"
  },
  {
    "ID": 3,
    "damageCategory": 1,
    "translationLabel": "slashingLabel"
  },
  {
    "ID": 4,
    "damageCategory": 2,
    "translationLabel": "acidLabel"
  },
  {
    "ID": 5,
    "damageCategory": 2,
    "translationLabel": "coldLabel"
  },
  {
    "ID": 6,
    "damageCategory": 2,
    "translationLabel": "fireLabel"
  },
  {
    "ID": 7,
    "damageCategory": 2,
    "translationLabel": "lightningLabel"
  },
  {
    "ID": 8,
    "damageCategory": 2,
    "translationLabel": "poisonLabel"
  },
  {
    "ID": 9,
    "damageCategory": 2,
    "translationLabel": "thunderLabel"
  },
  {
    "ID": 10,
    "damageCategory": 3,
    "translationLabel": "forceLabel"
  },
  {
    "ID": 11,
    "damageCategory": 3,
    "translationLabel": "necroticLabel"
  },
  {
    "ID": 12,
    "damageCategory": 3,
    "translationLabel": "psychicLabel"
  },
  {
    "ID": 13,
    "damageCategory": 3,
    "translationLabel": "radiantLabel"
  }
];

const genderList = [
  {
    "ID": 1,
    "genderLabel": "maleLabel",
    "genderAbbrLabel": "maleAbbrLabel"

  },
  {
    "ID": 2,
    "genderLabel": "femaleLabel",
    "genderAbbrLabel": "femaleAbbrLabel"
  },
  {
    "ID": 3,
    "genderLabel": "notDefinedLabel",
    "genderAbbrLabel": "notDefinedAbbrLabel"
  }
];