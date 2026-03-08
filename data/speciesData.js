const speciesList = [
  {
    "ID": 1,
    "translationLabel": "aasimarLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 160,
    "size": ["mediumLabel", "smallLabel"],
    "sizeRange_ft": [2.3,6.4],
    "speedFT": 30,
    "speciesTraitLabel": [
      "celestialResistanceLabel",
      "darkvision1Label",
      "healingHandsLabel",
      "lightBearerLabel",
      "celestialRevelationLabel"
    ],
    "ancestryLabel": 0,
    "lineageLabel": 0,
    "speciesDLabel": "aasimarD"
  },
  {
    "ID": 2,
    "translationLabel": "dragonbornLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 80,
    "size": ["mediumLabel"],
    "sizeRange_ft": [5.6,6.8],
    "speedFT": 30,
    "speciesTraitLabel": [
      "draconicAncestryLabel",
      "breathWeaponLabel",
      "damageResistanceLabel",
      "darkvision1Label",
      "draconicFlightLabel"
    ],
    "ancestryLabel": [
      "blackLabel",
      "blueLabel",
      "brassLabel",
      "bronzeLabel",
      "copperLabel",
      "goldLabel",
      "greenLabel",
      "redLabel",
      "silverLabel",
      "whiteLabel"
    ],
    "lineageLabel": 0,
    "speciesDLabel": "dragonbornD"
  },
  {
    "ID": 3,
    "translationLabel": "dwarfLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 350,
    "size": ["mediumLabel"],
    "sizeRange_ft": [3.8,5.4],
    "speedFT": 30,
    "speciesTraitLabel": [
      "darkvision2Label",
      "dwarvenResilienceLabel",
      "dwarvenToughnessLabel",
      "stonecunningLabel"
    ],
    "ancestryLabel": 0,
    "lineageLabel": 0,
    "speciesDLabel": "dwarfD"
  },
  {
    "ID": 4,
    "translationLabel": "elfLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 750,
    "size": ["mediumLabel"],
    "sizeRange_ft": [5.5,6.6],
    "speedFT": 30,
    "speciesTraitLabel": [
      "darkvision1Label",
      "elvenLineageLabel",
      "feyAncestryLabel",
      "keenSensesLabel",
      "tranceLabel"
    ],
    "ancestryLabel": 0,
    "lineageLabel": ["drowLabel", "highElfLabel", "woodElfLabel"],
    "speciesDLabel": "elfD"
  },
  {
    "ID": 5,
    "translationLabel": "gnomeLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 425,
    "size": ["smallLabel"],
    "sizeRange_ft": [2.7,3.8],
    "speedFT": 30,
    "speciesTraitLabel": [
      "darkvision1Label",
      "gnomishCunningLabel",
      "gnomishLineageLabel"
    ],
    "ancestryLabel": 0,
    "lineageLabel": ["forestGnomeLabel", "rockGnomeLabel"],
    "speciesDLabel": "gnomeD"
  },
  {
    "ID": 6,
    "translationLabel": "goliathLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 110,
    "size": ["tallLabel"],
    "sizeRange_ft": [7.2,8.5],
    "speedFT": 35,
    "speciesTraitLabel": [
      "giantAncestryLabel",
      "largeFormLabel",
      "powerfulBuildLabel"
    ],
    "ancestryLabel": [
      "cloudsJauntLabel",
      "firesBurnLabel",
      "frostsChillLabel",
      "hillsTumbleLabel",
      "stonesEnduranceLabel",
      "stormsThunderLabel"
    ],
    "lineageLabel": 0,
    "speciesDLabel": "goliathD"
  },
  {
    "ID": 7,
    "translationLabel": "halflingLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 150,
    "size": ["smallLabel"],
    "sizeRange_ft": [1.8,3.2],
    "speedFT": 30,
    "speciesTraitLabel": [
      "braveLabel",
      "halflingNimblenessLabel",
      "luckLabel",
      "naturallyStealthyLabel"
    ],
    "ancestryLabel": 0,
    "lineageLabel": 0,
    "speciesDLabel": "halflingD"
  },
  {
    "ID": 8,
    "translationLabel": "humanLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 85,
    "size": ["mediumLabel", "smallLabel"],
    "sizeRange_ft": [4.0,6.6],
    "speedFT": 30,
    "speciesTraitLabel": [
      "resourcefulLabel",
      "skillfulLabel",
      "versatileLabel"
    ],
    "ancestryLabel": 0,
    "lineageLabel": 0,
    "speciesDLabel": "humanD"
  },
  {
    "ID": 9,
    "translationLabel": "orcLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 70,
    "size": ["mediumLabel"],
    "sizeRange_ft": [5.8,6.9],
    "speedFT": 30,
    "speciesTraitLabel": [
      "adrenalineRushLabel",
      "darkvision2Label",
      "relentlessEnduranceLabel"
    ],
    "ancestryLabel": 0,
    "lineageLabel": 0,
    "speciesDLabel": "orcD"
  },
  {
    "ID": 10,
    "translationLabel": "tieflingLabel",
    "creatureType": "humanoidLabel",
    "speciesAge_years": 90,
    "size": ["mediumLabel", "smallLabel"],
    "sizeRange_ft": [3.0,6.5],
    "speedFT": 30,
    "speciesTraitLabel": [
      "darkvision1Label",
      "fiendishLegacyLabel",
      "otherworldlyPresenceLabel"
    ],
    "ancestryLabel": 0,
    "lineageLabel": ["abyssalLabel", "chthonicLabel", "infernalLabel"],
    "speciesDLabel": "tieflingD"
  }
];

const speciesTraitList = [
    {
        "speciesTraitCategoryNumber": 1,
        "speciesTraitLabel": "darkvision1Label",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "darkvision1DSheet",
        "speciesTraitDLabel": "darkvision1D",
        "speciesTraitShortDLabel": "darkvision1ShortD"
    },
    {
        "speciesTraitCategoryNumber": 2,
        "speciesTraitLabel": "darkvision2Label",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "darkvision2DSheet",
        "speciesTraitDLabel": "darkvision2D",
        "speciesTraitShortDLabel": "darkvision2ShortD"
    },
    {
        "speciesTraitCategoryNumber": 3,
        "speciesTraitLabel": "celestialResistanceLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "celestialResistanceDSheet",
        "speciesTraitDLabel": "celestialResistanceD",
        "speciesTraitShortDLabel": "celestialResistanceShortD"
    },
    {
        "speciesTraitCategoryNumber": 4,
        "speciesTraitLabel": "healingHandsLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "healingHandsDSheet",
        "speciesTraitDLabel": "healingHandsD",
        "speciesTraitShortDLabel": "healingHandsShortD"
    },
    {
        "speciesTraitCategoryNumber": 5,
        "speciesTraitLabel": "lightBearerLabel",
        "spellLabel": "lightLabel",
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 0,
        "speciesTraitDSheet": "lightBearerDSheet",
        "speciesTraitDLabel": "lightBearerD",
        "speciesTraitShortDLabel": "lightBearerShortD"
    },
    {
        "speciesTraitCategoryNumber": 6,
        "speciesTraitLabel": "celestialRevelationLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": "1:LEVEL:3",
        "speciesTraitDSheet": "celestialRevelationDSheet",
        "speciesTraitDLabel": "celestialRevelationD",
        "speciesTraitShortDLabel": "celestialRevelationShortD"
    },
    {
        "speciesTraitCategoryNumber": 7,
        "speciesTraitLabel": "draconicAncestryLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": "0:ANC",
        "speciesTraitDSheet": "draconicAncestryDSheet",
        "speciesTraitDLabel": "draconicAncestryD",
        "speciesTraitShortDLabel": "draconicAncestryShortD"
    },
    {
        "speciesTraitCategoryNumber": 8,
        "speciesTraitLabel": "breathWeaponLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "breathWeaponDSheet",
        "speciesTraitDLabel": "breathWeaponD",
        "speciesTraitShortDLabel": "breathWeaponShortD"
    },
    {
        "speciesTraitCategoryNumber": 9,
        "speciesTraitLabel": "damageResistanceLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "damageResistanceDSheet",
        "speciesTraitDLabel": "damageResistanceD",
        "speciesTraitShortDLabel": "damageResistanceShortD"
    },
    {
        "speciesTraitCategoryNumber": 10,
        "speciesTraitLabel": "draconicFlightLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": "1:LEVEL:5",
        "speciesTraitDSheet": "draconicFlightDSheet",
        "speciesTraitDLabel": "draconicFlightD",
        "speciesTraitShortDLabel": "draconicFlightShortD"
    },
    {
        "speciesTraitCategoryNumber": 11,
        "speciesTraitLabel": "dwarvenResilienceLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "dwarvenResilienceDSheet",
        "speciesTraitDLabel": "dwarvenResilienceD",
        "speciesTraitShortDLabel": "dwarvenResilienceShortD"
    },
    {
        "speciesTraitCategoryNumber": 12,
        "speciesTraitLabel": "dwarvenToughnessLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 3,
        "speciesTraitDSheet": "dwarvenToughnessDSheet",
        "speciesTraitDLabel": "dwarvenToughnessD",
        "speciesTraitShortDLabel": "dwarvenToughnessShortD"
    },
    {
        "speciesTraitCategoryNumber": 13,
        "speciesTraitLabel": "stonecunningLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "stonecunningDSheet",
        "speciesTraitDLabel": "stonecunningD",
        "speciesTraitShortDLabel": "stonecunningShortD"
    },
    {
        "speciesTraitCategoryNumber": 14,
        "speciesTraitLabel": "elvenLineageLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": "0:LIN",
        "speciesTraitDSheet": "elvenLineageDSheet",
        "speciesTraitDLabel": "elvenLineageD",
        "speciesTraitShortDLabel": "elvenLineageShortD"
    },
    {
        "speciesTraitCategoryNumber": 15,
        "speciesTraitLabel": "feyAncestryLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "feyAncestryDSheet",
        "speciesTraitDLabel": "feyAncestryD",
        "speciesTraitShortDLabel": "feyAncestryShortD"
    },
    {
        "speciesTraitCategoryNumber": 16,
        "speciesTraitLabel": "keenSensesLabel",
        "spellLabel": 0,
        "skillLabel": ["insightLabel","perceptionLabel","survivalLabel"],
        "featLabel": 0,
        "characterSheet": 0,
        "speciesTraitDSheet": "keenSensesDSheet",
        "speciesTraitDLabel": "keenSensesD",
        "speciesTraitShortDLabel": "keenSensesShortD"
    },
    {
        "speciesTraitCategoryNumber": 17,
        "speciesTraitLabel": "tranceLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "tranceDSheet",
        "speciesTraitDLabel": "tranceD",
        "speciesTraitShortDLabel": "tranceShortD"
    },
    {
        "speciesTraitCategoryNumber": 18,
        "speciesTraitLabel": "gnomishCunningLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "gnomishCunningDSheet",
        "speciesTraitDLabel": "gnomishCunningD",
        "speciesTraitShortDLabel": "gnomishCunningShortD"
    },
    {
        "speciesTraitCategoryNumber": 19,
        "speciesTraitLabel": "gnomishLineageLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": "0:LIN",
        "speciesTraitDSheet": "gnomishLineageDSheet",
        "speciesTraitDLabel": "gnomishLineageD",
        "speciesTraitShortDLabel": "gnomishLineageShortD"
    },
    {
        "speciesTraitCategoryNumber": 20,
        "speciesTraitLabel": "giantAncestryLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": "0:ANC",
        "speciesTraitDSheet": "giantAncestryDSheet",
        "speciesTraitDLabel": "giantAncestryD",
        "speciesTraitShortDLabel": "giantAncestryShortD"
    },
    {
        "speciesTraitCategoryNumber": 21,
        "speciesTraitLabel": "largeFormLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": "1:LEVEL:5",
        "speciesTraitDSheet": "largeFormDSheet",
        "speciesTraitDLabel": "largeFormD",
        "speciesTraitShortDLabel": "largeFormShortD"
    },
    {
        "speciesTraitCategoryNumber": 22,
        "speciesTraitLabel": "powerfulBuildLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "powerfulBuildDSheet",
        "speciesTraitDLabel": "powerfulBuildD",
        "speciesTraitShortDLabel": "powerfulBuildShortD"
    },
    {
        "speciesTraitCategoryNumber": 23,
        "speciesTraitLabel": "braveLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "braveDSheet",
        "speciesTraitDLabel": "braveD",
        "speciesTraitShortDLabel": "braveShortD"
    },
    {
        "speciesTraitCategoryNumber": 24,
        "speciesTraitLabel": "halflingNimblenessLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "halflingNimblenessDSheet",
        "speciesTraitDLabel": "halflingNimblenessD",
        "speciesTraitShortDLabel": "halflingNimblenessShortD"
    },
    {
        "speciesTraitCategoryNumber": 25,
        "speciesTraitLabel": "luckLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "luckDSheet",
        "speciesTraitDLabel": "luckD",
        "speciesTraitShortDLabel": "luckShortD"
    },
    {
        "speciesTraitCategoryNumber": 26,
        "speciesTraitLabel": "naturallyStealthyLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "naturallyStealthyDSheet",
        "speciesTraitDLabel": "naturallyStealthyD",
        "speciesTraitShortDLabel": "naturallyStealthyShortD"
    },
    {
        "speciesTraitCategoryNumber": 27,
        "speciesTraitLabel": "resourcefulLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "resourcefulDSheet",
        "speciesTraitDLabel": "resourcefulD",
        "speciesTraitShortDLabel": "resourcefulShortD"
    },
    {
        "speciesTraitCategoryNumber": 28,
        "speciesTraitLabel": "skillfulLabel",
        "spellLabel": 0,
        "skillLabel": 1,
        "featLabel": 0,
        "characterSheet": 0,
        "speciesTraitDSheet": "skillfulDSheet",
        "speciesTraitDLabel": "skillfulD",
        "speciesTraitShortDLabel": "skillfulShortD"
    },
    {
        "speciesTraitCategoryNumber": 29,
        "speciesTraitLabel": "versatileLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 1,
        "characterSheet": 0,
        "speciesTraitDSheet": "versatileDSheet",
        "speciesTraitDLabel": "versatileD",
        "speciesTraitShortDLabel": "versatileShortD"
    },
    {
        "speciesTraitCategoryNumber": 30,
        "speciesTraitLabel": "adrenalineRushLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "adrenalineRushDSheet",
        "speciesTraitDLabel": "adrenalineRushD",
        "speciesTraitShortDLabel": "adrenalineRushShortD"
    },
    {
        "speciesTraitCategoryNumber": 31,
        "speciesTraitLabel": "relentlessEnduranceLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "relentlessEnduranceDSheet",
        "speciesTraitDLabel": "relentlessEnduranceD",
        "speciesTraitShortDLabel": "relentlessEnduranceShortD"
    },
    {
        "speciesTraitCategoryNumber": 32,
        "speciesTraitLabel": "fiendishLegacyLabel",
        "spellLabel": 0,
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": "0:LIN",
        "speciesTraitDSheet": "fiendishLegacyDSheet",
        "speciesTraitDLabel": "fiendishLegacyD",
        "speciesTraitShortDLabel": "fiendishLegacyShortD"
    },
    {
        "speciesTraitCategoryNumber": 33,
        "speciesTraitLabel": "otherworldlyPresenceLabel",
        "spellLabel": "thaumaturgyLabel",
        "skillLabel": 0,
        "featLabel": 0,
        "characterSheet": 1,
        "speciesTraitDSheet": "otherworldlyPresenceDSheet",
        "speciesTraitDLabel": "otherworldlyPresenceD",
        "speciesTraitShortDLabel": "otherworldlyPresenceShortD"
    }
];

const lineageList = [
  {
    "level": 1,
    "species": "elfLabel",
    "speciesTraitLabel": "elvenLineageLabel",
    "lineageLabel": "drowLabel",
    "lineageDLabel": "drowD",
    "spellLabel": "dancingLightsLabel",
    "lineageTraitDLabel": "drowTraitD",
    "characterSheet": 1,
    "lineageTraitDSheet": "drowTraitDSheet"
  },
  {
    "level": 3,
    "species": "elfLabel",
    "speciesTraitLabel": "elvenLineageLabel",
    "lineageLabel": "drowLabel",
    "lineageDLabel": 0,
    "spellLabel": "faerieFireLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 5,
    "species": "elfLabel",
    "speciesTraitLabel": "elvenLineageLabel",
    "lineageLabel": "drowLabel",
    "lineageDLabel": 0,
    "spellLabel": "darknessLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 1,
    "species": "elfLabel",
    "speciesTraitLabel": "elvenLineageLabel",
    "lineageLabel": "highElfLabel",
    "lineageDLabel": "highElfD",
    "spellLabel": "prestidigitationLabel",
    "lineageTraitDLabel": "highElfTraitD",
    "characterSheet": 1,
    "lineageTraitDSheet": "highElfTraitDSheet"
  },
  {
    "level": 3,
    "species": "elfLabel",
    "speciesTraitLabel": "elvenLineageLabel",
    "lineageLabel": "highElfLabel",
    "lineageDLabel": 0,
    "spellLabel": "detectMagicLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 5,
    "species": "elfLabel",
    "speciesTraitLabel": "elvenLineageLabel",
    "lineageLabel": "highElfLabel",
    "lineageDLabel": 0,
    "spellLabel": "mistyStepLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 1,
    "species": "elfLabel",
    "speciesTraitLabel": "elvenLineageLabel",
    "lineageLabel": "woodElfLabel",
    "lineageDLabel": "woodElfD",
    "spellLabel": "druidcraftLabel",
    "lineageTraitDLabel": "woodElfTraitD",
    "characterSheet": 3,
    "lineageTraitDSheet": "woodElfTraitDSheet"
  },
  {
    "level": 3,
    "species": "elfLabel",
    "lineageLabel": "woodElfLabel",
    "lineageDLabel": 0,
    "spellLabel": "longstriderLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 5,
    "species": "elfLabel",
    "speciesTraitLabel": "elvenLineageLabel",
    "lineageLabel": "woodElfLabel",
    "lineageDLabel": 0,
    "spellLabel": "passWithoutTraceLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 1,
    "species": "gnomeLabel",
    "speciesTraitLabel": "gnomishLineageLabel",
    "lineageLabel": "forestGnomeLabel",
    "lineageDLabel": "forestGnomeD",
    "spellLabel": ["minorIllusionLabel", "speakWithAnimalsLabel"],
    "lineageTraitDLabel": "forestGnomeTraitD",
    "characterSheet": 1,
    "lineageTraitDSheet": "forestGnomeTraitDSheet"
  },
  {
    "level": 1,
    "species": "gnomeLabel",
    "speciesTraitLabel": "gnomishLineageLabel",
    "lineageLabel": "rockGnomeLabel",
    "lineageDLabel": "rockGnomeD",
    "spellLabel": ["mendingLabel", "prestidigitationLabel"],
    "lineageTraitDLabel": "rockGnomeTraitD",
    "characterSheet": 1,
    "lineageTraitDSheet": "rockGnomeTraitDSheet"
  },
  {
    "level": 1,
    "species": "tieflingLabel",
    "speciesTraitLabel": "fiendishLegacyLabel",
    "lineageLabel": "abyssalLabel",
    "lineageDLabel": "abyssalD",
    "spellLabel": "poisonSprayLabel",
    "lineageTraitDLabel": "abyssalTraitD",
    "characterSheet": 1,
    "lineageTraitDSheet": "abyssalTraitDSheet"
  },
  {
    "level": 3,
    "species": "tieflingLabel",
    "speciesTraitLabel": "fiendishLegacyLabel",
    "lineageLabel": "abyssalLabel",
    "lineageDLabel": 0,
    "spellLabel": "rayOfSicknessLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 5,
    "species": "tieflingLabel",
    "speciesTraitLabel": "fiendishLegacyLabel",
    "lineageLabel": "abyssalLabel",
    "lineageDLabel": 0,
    "spellLabel": "holdPersonLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 1,
    "species": "tieflingLabel",
    "speciesTraitLabel": "fiendishLegacyLabel",
    "lineageLabel": "chthonicLabel",
    "lineageDLabel": "chthonicD",
    "spellLabel": "chillTouchLabel",
    "lineageTraitDLabel": "chthonicTraitD",
    "characterSheet": 1,
    "lineageTraitDSheet": "chthonicTraitDSheet"
  },
  {
    "level": 3,
    "species": "tieflingLabel",
    "speciesTraitLabel": "fiendishLegacyLabel",
    "lineageLabel": "chthonicLabel",
    "lineageDLabel": 0,
    "spellLabel": "falseLifeLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 5,
    "species": "tieflingLabel",
    "speciesTraitLabel": "fiendishLegacyLabel",
    "lineageLabel": "chthonicLabel",
    "lineageDLabel": 0,
    "spellLabel": "rayOfEnfeeblementLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 1,
    "species": "tieflingLabel",
    "speciesTraitLabel": "fiendishLegacyLabel",
    "lineageLabel": "infernalLabel",
    "lineageDLabel": "infernalD",
    "spellLabel": "fireBoltLabel",
    "lineageTraitDLabel": "infernalTraitD",
    "characterSheet": 1,
    "lineageTraitDSheet": "infernalTraitDSheet"
  },
  {
    "level": 3,
    "species": "tieflingLabel",
    "speciesTraitLabel": "fiendishLegacyLabel",
    "lineageLabel": "infernalLabel",
    "lineageDLabel": 0,
    "spellLabel": "hellishRebukeLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  },
  {
    "level": 5,
    "species": "tieflingLabel",
    "speciesTraitLabel": "fiendishLegacyLabel",
    "lineageLabel": "infernalLabel",
    "lineageDLabel": 0,
    "spellLabel": "darknessLabel",
    "lineageTraitDLabel": 0,
    "characterSheet": 0,
    "lineageTraitDSheet": 0
  }
];

const ancestryList = [
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "blackLabel",
    "physicAncestryLabel": "blackDragonLabel",
    "damageType": "acidLabel",
    "characterSheet": 1,
    "ancestryDLabel": "blackD"
  },
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "blueLabel",
    "physicAncestryLabel": "blueDragonLabel",
    "damageType": "lightningLabel",
    "characterSheet": 1,
    "ancestryDLabel": "blueD"
  },
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "brassLabel",
    "physicAncestryLabel": "brassDragonLabel",
    "damageType": "fireLabel",
    "characterSheet": 1,
    "ancestryDLabel": "brassD"
  },
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "bronzeLabel",
    "physicAncestryLabel": "bronzeDragonLabel",
    "damageType": "lightningLabel",
    "characterSheet": 1,
    "ancestryDLabel": "bronzeD"
  },
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "copperLabel",
    "physicAncestryLabel": "copperDragonLabel",
    "damageType": "acidLabel",
    "characterSheet": 1,
    "ancestryDLabel": "copperD"
  },
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "goldLabel",
    "physicAncestryLabel": "goldDragonLabel",
    "damageType": "fireLabel",
    "characterSheet": 1,
    "ancestryDLabel": "goldD"
  },
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "greenLabel",
    "physicAncestryLabel": "greenDragonLabel",
    "damageType": "poisonLabel",
    "characterSheet": 1,
    "ancestryDLabel": "greenD"
  },
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "redLabel",
    "physicAncestryLabel": "redDragonLabel",
    "damageType": "fireLabel",
    "characterSheet": 1,
    "ancestryDLabel": "redD"
  },
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "silverLabel",
    "physicAncestryLabel": "silverDragonLabel",
    "damageType": "coldLabel",
    "characterSheet": 1,
    "ancestryDLabel": "silverD"
  },
  {
    "species": "dragonbornLabel",
    "speciesTraitLabel": "draconicAncestryLabel",
    "ancestryLabel": "whiteLabel",
    "physicAncestryLabel": "whiteDragonLabel",
    "damageType": "coldLabel",
    "characterSheet": 1,
    "ancestryDLabel": "whiteD"
  },
  {
    "species": "goliathLabel",
    "speciesTraitLabel": "giantAncestryLabel",
    "ancestryLabel": "cloudsJauntLabel",
    "physicAncestryLabel": "cloudGiantLabel",
    "damageType": 0,
    "characterSheet": 1,
    "ancestryDLabel": "cloudsJauntD"
  },
  {
    "species": "goliathLabel",
    "speciesTraitLabel": "giantAncestryLabel",
    "ancestryLabel": "firesBurnLabel",
    "physicAncestryLabel": "fireGiantLabel",
    "damageType": 0,
    "characterSheet": 1,
    "ancestryDLabel": "firesBurnD"
  },
  {
    "species": "goliathLabel",
    "speciesTraitLabel": "giantAncestryLabel",
    "ancestryLabel": "frostsChillLabel",
    "physicAncestryLabel": "frostGiantLabel",
    "damageType": 0,
    "characterSheet": 1,
    "ancestryDLabel": "frostsChillD"
  },
  {
    "species": "goliathLabel",
    "speciesTraitLabel": "giantAncestryLabel",
    "ancestryLabel": "hillsTumbleLabel",
    "physicAncestryLabel": "hillGiantLabel",
    "damageType": 0,
    "characterSheet": 1,
    "ancestryDLabel": "hillsTumbleD"
  },
  {
    "species": "goliathLabel",
    "speciesTraitLabel": "giantAncestryLabel",
    "ancestryLabel": "stonesEnduranceLabel",
    "physicAncestryLabel": "stoneGiantLabel",
    "damageType": 0,
    "characterSheet": 1,
    "ancestryDLabel": "stonesEnduranceD"
  },
  {
    "species": "goliathLabel",
    "speciesTraitLabel": "giantAncestryLabel",
    "ancestryLabel": "stormsThunderLabel",
    "physicAncestryLabel": "stormGiantLabel",
    "damageType": 0,
    "characterSheet": 1,
    "ancestryDLabel": "stormsThunderD"
  }
];

const sizeList = [
  {
    "ID": 1,
    "sizeCategory": "smallLabel",
    "sizeRange_ft": [0.0, 3.9]
  },
  {
    "ID": 2,
    "sizeCategory": "mediumLabel",
    "sizeRange_ft": [4.0, 6.9]
  },
  {
    "ID": 3,
    "sizeCategory": "tallLabel",
    "sizeRange_ft": [7.0, 10.0]
  }
];