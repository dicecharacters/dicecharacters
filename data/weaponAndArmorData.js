const weaponList = [
    {
        "ID": 1,
        "translationLabel": "clubLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d4",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": 1,
        "weaponMasteryCategoryNumber": 1,
        "weight": 2,
        "costValue": 1,
        "costUnit": "SPLabel"
    },
    {
        "ID": 2,
        "translationLabel": "daggerLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d4",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": [1,2,3],
        "weaponMasteryCategoryNumber": 2,
        "weight": 1,
        "costValue": 2,
        "costUnit": "GPLabel"
    },
    {
        "ID": 3,
        "translationLabel": "greatClubLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": 4,
        "weaponMasteryCategoryNumber": 3,
        "weight": 10,
        "costValue": 2,
        "costUnit": "SPLabel"
    },
    {
        "ID": 4,
        "translationLabel": "handaxeLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d6",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": [1,3],
        "weaponMasteryCategoryNumber": 5,
        "weight": 2,
        "costValue": 5,
        "costUnit": "GPLabel"
    },
    {
        "ID": 5,
        "translationLabel": "javelinLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d6",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": 3,
        "weaponMasteryCategoryNumber": 1,
        "weight": 2,
        "costValue": 5,
        "costUnit": "SPLabel"
    },
    {
        "ID": 6,
        "translationLabel": "lightHammeLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d4",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": [1,3],
        "weaponMasteryCategoryNumber": 2,
        "weight": 2,
        "costValue": 2,
        "costUnit": "GPLabel"
    },
    {
        "ID": 7,
        "translationLabel": "maceLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d6",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": 0,
        "weaponMasteryCategoryNumber": 5,
        "weight": 4,
        "costValue": 5,
        "costUnit": "GPLabel"
    },
    {
        "ID": 8,
        "translationLabel": "quarterstaffLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d6",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": 5,
        "weaponMasteryCategoryNumber": 6,
        "weight": 4,
        "costValue": 2,
        "costUnit": "SPLabel"
    },
    {
        "ID": 9,
        "translationLabel": "sickleLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d4",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": 1,
        "weaponMasteryCategoryNumber": 2,
        "weight": 2,
        "costValue": 1,
        "costUnit": "GPLabel"
    },
    {
        "ID": 10,
        "translationLabel": "spearLabel",
        "weaponCategoryNumber": 1,
        "weaponDamageValue": "1d6",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": [3,5],
        "weaponMasteryCategoryNumber": 5,
        "weight": 3,
        "costValue": 1,
        "costUnit": "GPLabel"
    },
    {
        "ID": 11,
        "translationLabel": "dartLabel",
        "weaponCategoryNumber": 2,
        "weaponDamageValue": "1d4",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": [2,3],
        "weaponMasteryCategoryNumber": 4,
        "weight": 1,
        "costValue": 5,
        "costUnit": "CPLabel"
    },
    {
        "ID": 12,
        "translationLabel": "lightCrossbowLabel",
        "weaponCategoryNumber": 2,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": [6,7,4],
        "weaponMasteryCategoryNumber": 1,
        "weight": 5,
        "costValue": 25,
        "costUnit": "GPLabel"
    },
    {
        "ID": 13,
        "translationLabel": "shortbowLabel",
        "weaponCategoryNumber": 2,
        "weaponDamageValue": "1d6",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": [6,4],
        "weaponMasteryCategoryNumber": 4,
        "weight": 2,
        "costValue": 25,
        "costUnit": "SPLabel"
    },
    {
        "ID": 14,
        "translationLabel": "slingLabel",
        "weaponCategoryNumber": 2,
        "weaponDamageValue": "1d4",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": 6,
        "weaponMasteryCategoryNumber": 1,
        "weight": 0,
        "costValue": 1,
        "costUnit": "GPLabel"
    },
    {
        "ID": 15,
        "translationLabel": "battleaxeLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": 5,
        "weaponMasteryCategoryNumber": 6,
        "weight": 4,
        "costValue": 10,
        "costUnit": "GPLabel"
    },
    {
        "ID": 16,
        "translationLabel": "flailLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": 0,
        "weaponMasteryCategoryNumber": 5,
        "weight": 2,
        "costValue": 10,
        "costUnit": "GPLabel"
    },
    {
        "ID": 17,
        "translationLabel": "glaiveLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d10",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": [8,9,4],
        "weaponMasteryCategoryNumber": 7,
        "weight": 6,
        "costValue": 20,
        "costUnit": "GPLabel"
    },
    {
        "ID": 18,
        "translationLabel": "greataxeLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d12",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": [8,4],
        "weaponMasteryCategoryNumber": 8,
        "weight": 7,
        "costValue": 30,
        "costUnit": "GPLabel"
    },
    {
        "ID": 19,
        "translationLabel": "greatswordLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "2d6",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": [8,4],
        "weaponMasteryCategoryNumber": 7,
        "weight": 6,
        "costValue": 50,
        "costUnit": "GPLabel"
    },
    {
        "ID": 20,
        "translationLabel": "halberdLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d10",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": [8,9,4],
        "weaponMasteryCategoryNumber": 8,
        "weight": 6,
        "costValue": 20,
        "costUnit": "GPLabel"
    },
    {
        "ID": 21,
        "translationLabel": "lanceLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d10",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": [8,9,4],
        "weaponMasteryCategoryNumber": 6,
        "weight": 6,
        "costValue": 10,
        "costUnit": "GPLabel"
    },
    {
        "ID": 22,
        "translationLabel": "longswordLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": 5,
        "weaponMasteryCategoryNumber": 5,
        "weight": 3,
        "costValue": 15,
        "costUnit": "GPLabel"
    },
    {
        "ID": 23,
        "translationLabel": "maulLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "2d6",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": [8,4],
        "weaponMasteryCategoryNumber": 6,
        "weight": 10,
        "costValue": 10,
        "costUnit": "GPLabel"
    },
    {
        "ID": 24,
        "translationLabel": "morningstarLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": 0,
        "weaponMasteryCategoryNumber": 5,
        "weight": 4,
        "costValue": 15,
        "costUnit": "GPLabel"
    },
    {
        "ID": 25,
        "translationLabel": "pikeLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d10",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": [8,9,4],
        "weaponMasteryCategoryNumber": 3,
        "weight": 18,
        "costValue": 5,
        "costUnit": "GPLabel"
    },
    {
        "ID": 26,
        "translationLabel": "rapierLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": 2,
        "weaponMasteryCategoryNumber": 4,
        "weight": 2,
        "costValue": 25,
        "costUnit": "GPLabel"
    },
    {
        "ID": 27,
        "translationLabel": "scimitarLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d6",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": [1,2],
        "weaponMasteryCategoryNumber": 2,
        "weight": 3,
        "costValue": 25,
        "costUnit": "GPLabel"
    },
    {
        "ID": 28,
        "translationLabel": "shortswordLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d6",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": [1,2],
        "weaponMasteryCategoryNumber": 4,
        "weight": 2,
        "costValue": 10,
        "costUnit": "GPLabel"
    },
    {
        "ID": 29,
        "translationLabel": "tridentLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": [3,5],
        "weaponMasteryCategoryNumber": 6,
        "weight": 4,
        "costValue": 5,
        "costUnit": "GPLabel"
    },
    {
        "ID": 30,
        "translationLabel": "warhammerLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": 5,
        "weaponMasteryCategoryNumber": 5,
        "weight": 3,
        "costValue": 15,
        "costUnit": "GPLabel"
    },
    {
        "ID": 31,
        "translationLabel": "warPickLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 2,
        "weaponPropertyCategoryNumber": 5,
        "weaponMasteryCategoryNumber": 5,
        "weight": 2,
        "costValue": 5,
        "costUnit": "GPLabel"
    },
    {
        "ID": 32,
        "translationLabel": "whipLabel",
        "weaponCategoryNumber": 3,
        "weaponDamageValue": "1d4",
        "damageCategoryNumber": 3,
        "weaponPropertyCategoryNumber": [1,9],
        "weaponMasteryCategoryNumber": 1,
        "weight": 3,
        "costValue": 2,
        "costUnit": "GPLabel"
    },
    {
        "ID": 33,
        "translationLabel": "blowgunLabel",
        "weaponCategoryNumber": 4,
        "weaponDamageValue": "1",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": [6,7],
        "weaponMasteryCategoryNumber": 4,
        "weight": 1,
        "costValue": 10,
        "costUnit": "GPLabel"
    },
    {
        "ID": 34,
        "translationLabel": "handCrossbowLabel",
        "weaponCategoryNumber": 4,
        "weaponDamageValue": "1d6",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": [1,6,7],
        "weaponMasteryCategoryNumber": 4,
        "weight": 3,
        "costValue": 75,
        "costUnit": "GPLabel"
    },
    {
        "ID": 35,
        "translationLabel": "heavyCrossbowLabel",
        "weaponCategoryNumber": 4,
        "weaponDamageValue": "1d10",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": [6,8,7,4],
        "weaponMasteryCategoryNumber": 3,
        "weight": 18,
        "costValue": 50,
        "costUnit": "GPLabel"
    },
    {
        "ID": 36,
        "translationLabel": "longbowLabel",
        "weaponCategoryNumber": 4,
        "weaponDamageValue": "1d8",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": [6,8,4],
        "weaponMasteryCategoryNumber": 1,
        "weight": 2,
        "costValue": 50,
        "costUnit": "GPLabel"
    },
    {
        "ID": 37,
        "translationLabel": "musketLabel",
        "weaponCategoryNumber": 4,
        "weaponDamageValue": "1d12",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": [6,8,4],
        "weaponMasteryCategoryNumber": 1,
        "weight": 10,
        "costValue": 500,
        "costUnit": "GPLabel"
    },
    {
        "ID": 38,
        "translationLabel": "pistolLabel",
        "weaponCategoryNumber": 4,
        "weaponDamageValue": "1d10",
        "damageCategoryNumber": 1,
        "weaponPropertyCategoryNumber": [6,7],
        "weaponMasteryCategoryNumber": 4,
        "weight": 3,
        "costValue": 250,
        "costUnit": "GPLabel"
    }
];

const weaponCategory = [
    {
        "weaponCategoryNumber": 1,
        "translationLabel": "simpleMeleeWeaponsLabel"
    },
    {
        "weaponCategoryNumber": 2,
        "translationLabel": "simpleRangedWeaponsLabel"
    },
    {
        "weaponCategoryNumber": 3,
        "translationLabel": "martialMeleeWeaponsLabel"
    },
    {
        "weaponCategoryNumber": 4,
        "translationLabel": "martialRangedWeaponsLabel"
    }
];

const weaponProperty = [
    {
        "weaponPropertyCategoryNumber": 1,
        "translationLabel": "lightWeaponLabel"
    },
    {
        "weaponPropertyCategoryNumber": 2,
        "translationLabel": "finesseLabel"
    },
    {
        "weaponPropertyCategoryNumber": 3,
        "translationLabel": "thrownLabel"
    },
    {
        "weaponPropertyCategoryNumber": 4,
        "translationLabel": "twoHandedLabel"
    },
    {
        "weaponPropertyCategoryNumber": 5,
        "translationLabel": "versatileLabel"
    },
    {
        "weaponPropertyCategoryNumber": 6,
        "translationLabel": "ammunitionLabel"
    },
    {
        "weaponPropertyCategoryNumber": 7,
        "translationLabel": "loadingLabel"
    },
    {
        "weaponPropertyCategoryNumber": 8,
        "translationLabel": "heavyWeaponLabel"
    },
    {
        "weaponPropertyCategoryNumber": 9,
        "translationLabel": "reachLabel"
    }
];

const damageType = [
    {
        "damageCategoryNumber": 1,
        "translationLabel": "bludgeoningLabel"
    },
    {
        "damageCategoryNumber": 2,
        "translationLabel": "piercingLabel"
    },
    {
        "damageCategoryNumber": 3,
        "translationLabel": "slashingLabel"
    }
];

const weaponMastery = [
    {
        "weaponMasteryCategoryNumber": 1,
        "translationLabel": "slowMLabel",
        "weaponMasteryDLabel": "slowMD"
    },
    {
        "weaponMasteryCategoryNumber": 2,
        "translationLabel": "nickLabel",
        "weaponMasteryDLabel": "nickD"
    },
    {
        "weaponMasteryCategoryNumber": 3,
        "translationLabel": "pushLabel",
        "weaponMasteryDLabel": "pushD"
    },
    {
        "weaponMasteryCategoryNumber": 4,
        "translationLabel": "vexLabel",
        "weaponMasteryDLabel": "vexD"
    },
    {
        "weaponMasteryCategoryNumber": 5,
        "translationLabel": "sapLabel",
        "weaponMasteryDLabel": "sapD"
    },
    {
        "weaponMasteryCategoryNumber": 6,
        "translationLabel": "toppleLabel",
        "weaponMasteryDLabel": "toppleD"
    },
    {
        "weaponMasteryCategoryNumber": 7,
        "translationLabel": "grazeLabel",
        "weaponMasteryDLabel": "grazeD"
    },
    {
        "weaponMasteryCategoryNumber": 8,
        "translationLabel": "cleaveLabel",
        "weaponMasteryDLabel": "cleaveD"
    }
];

const armorList = [
  {
    "ID": 1,
    "translationLabel": "paddedArmorLabel",
    "translationShortLabel": "paddedArmorShortLabel",
    "armorCategoryNumber": 1,
    "armorClassValue": 11,
    "armorClassMod": "dexMod",
    "strengthAttr": 0,
    "stealthDisadvantage": 1,
    "weight": 8,
    "costValue": 5,
    "costUnit": "GPLabel"
  },
  {
    "ID": 2,
    "translationLabel": "leatherArmorLabel",
    "translationShortLabel": "leatherArmorShortLabel",
    "armorCategoryNumber": 1,
    "armorClassValue": 11,
    "armorClassMod": "dexMod",
    "strengthAttr": 0,
    "stealthDisadvantage": 0,
    "weight": 10,
    "costValue": 10,
    "costUnit": "GPLabel"
  },
  {
    "ID": 3,
    "translationLabel": "studdedLeatherArmorLabel",
    "translationShortLabel": "studdedLeatherArmorShortLabel",
    "armorCategoryNumber": 1,
    "armorClassValue": 12,
    "armorClassMod": "dexMod",
    "strengthAttr": 0,
    "stealthDisadvantage": 0,
    "weight": 13,
    "costValue": 45,
    "costUnit": "GPLabel"
  },
  {
    "ID": 4,
    "translationLabel": "hideArmorLabel",
    "translationShortLabel": "hideArmorShortLabel",
    "armorCategoryNumber": 2,
    "armorClassValue": 12,
    "armorClassMod": "dexMod",
    "strengthAttr": 0,
    "stealthDisadvantage": 0,
    "weight": 12,
    "costValue": 10,
    "costUnit": "GPLabel"
  },
  {
    "ID": 5,
    "translationLabel": "chainShirtLabel",
    "translationShortLabel": "chainShirtShortLabel",
    "armorCategoryNumber": 2,
    "armorClassValue": 13,
    "armorClassMod": "dexMod",
    "strengthAttr": 0,
    "stealthDisadvantage": 0,
    "weight": 20,
    "costValue": 50,
    "costUnit": "GPLabel"
  },
  {
    "ID": 6,
    "translationLabel": "scaleMailLabel",
    "translationShortLabel": "scaleMailShortLabel",
    "armorCategoryNumber": 2,
    "armorClassValue": 14,
    "armorClassMod": "dexMod",
    "strengthAttr": 0,
    "stealthDisadvantage": 1,
    "weight": 45,
    "costValue": 50,
    "costUnit": "GPLabel"
  },
  {
    "ID": 7,
    "translationLabel": "breastplateLabel",
    "translationShortLabel": "breastplateShortLabel",
    "armorCategoryNumber": 2,
    "armorClassValue": 14,
    "armorClassMod": "dexMod",
    "strengthAttr": 0,
    "stealthDisadvantage": 0,
    "weight": 20,
    "costValue": 400,
    "costUnit": "GPLabel"
  },
  {
    "ID": 8,
    "translationLabel": "halfPlateArmorLabel",
    "translationShortLabel": "halfPlateArmorShortLabel",
    "armorCategoryNumber": 2,
    "armorClassValue": 15,
    "armorClassMod": "dexMod",
    "strengthAttr": 0,
    "stealthDisadvantage": 1,
    "weight": 40,
    "costValue": 750,
    "costUnit": "GPLabel"
  },
  {
    "ID": 9,
    "translationLabel": "ringMailLabel",
    "translationShortLabel": "ringMailShortLabel",
    "armorCategoryNumber": 3,
    "armorClassValue": 14,
    "armorClassMod": 0,
    "strengthAttr": 0,
    "stealthDisadvantage": 1,
    "weight": 40,
    "costValue": 30,
    "costUnit": "GPLabel"
  },
  {
    "ID": 10,
    "translationLabel": "chainMailLabel",
    "translationShortLabel": "chainMailShortLabel",
    "armorCategoryNumber": 3,
    "armorClassValue": 16,
    "armorClassMod": 0,
    "strengthAttr": 13,
    "stealthDisadvantage": 1,
    "weight": 55,
    "costValue": 75,
    "costUnit": "GPLabel"
  },
  {
    "ID": 11,
    "translationLabel": "splintArmorLabel",
    "translationShortLabel": "splintArmorShortLabel",
    "armorCategoryNumber": 3,
    "armorClassValue": 17,
    "armorClassMod": 0,
    "strengthAttr": 15,
    "stealthDisadvantage": 1,
    "weight": 60,
    "costValue": 200,
    "costUnit": "GPLabel"
  },
  {
    "ID": 12,
    "translationLabel": "plateArmorLabel",
    "translationShortLabel": "plateArmorShortLabel",
    "armorCategoryNumber": 3,
    "armorClassValue": 18,
    "armorClassMod": 0,
    "strengthAttr": 15,
    "stealthDisadvantage": 1,
    "weight": 65,
    "costValue": 1500,
    "costUnit": "GPLabel"
  },
  {
    "ID": 13,
    "translationLabel": "shieldLabel",
    "translationShortLabel": 0,
    "armorCategoryNumber": 4,
    "armorClassValue": "+2",
    "armorClassMod": 0,
    "strengthAttr": 0,
    "stealthDisadvantage": 0,
    "weight": 6,
    "costValue": 10,
    "costUnit": "GPLabel"
  }
];

const armorCategory = [
  {
    "armorCategoryNumber": 1,
    "translationLabel": "lightArmorLabel"
  },
  {
    "armorCategoryNumber": 2,
    "translationLabel": "mediumArmorLabel"
  },
  {
    "armorCategoryNumber": 3,
    "translationLabel": "heavyArmorLabel"
  },
  {
    "armorCategoryNumber": 4,
    "translationLabel": "shieldLabel"
  }
];