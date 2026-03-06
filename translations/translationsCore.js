// translationsCore.js

const translations = {
    de: {
    // Schritt-Titel
    "pageTitle": "DnD Charakter Erstellen",
    "step1Title": "Schritt 1: Klasse wählen",
    "step2Title": "Schritt 2: Hintergrund wählen",
    "step3Title": "Schritt 3: Volk wählen",
    "step4Title": "Schritt 4: Attribute setzen",
    "step5Title": "Schritt 5: Stufe wählen",
    "step6Title": "Schritt 6: Spezialisierung",
    "step7Title": "Schritt 7: Zauber wählen",
    "step8Title": "Schritt 8: Ausrüstung wählen",
    "step9Title": "Schritt 9: Erzähle deine Geschichte",
    "step10Title": "Schritt 10: Gesinnung gewichten",
    "step11Title": "Schritt 11: Aussehen beschreiben",
    "step12Title": "Schritt 12: Namensgebung",
    "step1Description": "Wähle die Klasse deines Charakters.",
    "step2Description": "Wähle den Hintergrund deines Charakters.",
    "step3Description": "Wähle den Volk deines Charakters.",
    "step4Description": "Bestimme die Schwächen und Stärken deines Charakters.",
    "step5Description": "Wähle eine Stufe (1-20) für deinen Charakter.",
    "step6Description": "Wähle Fähigkeiten basierend auf Klasse und Level.",
    "step7Description": "Wähle die Zauber für deinen Charakter.",
    "step8Description": "Wähle die Ausrüstung für deinen Charakter.",
    "step9Description": "Beschreibe die Herkunft und Erlebnisse deines Charakters.",
    "step10Description": "Bestimme die Persönlichkeit und Gesinnung deines Charakters.",
    "step11Description": "Beschreibe das Aussehen deines Charakters.",
    "step12Description": "Überprüfe deine Auswahl und gebe deinem Charakter einen Namen.",

    // Buttons
    "step1Btn": "Schritt 1",
    "step2Btn": "Schritt 2",
    "step3Btn": "Schritt 3",
    "step4Btn": "Schritt 4",
    "step5Btn": "Schritt 5",
    "step6Btn": "Schritt 6",
    "step7Btn": "Schritt 7",
    "step8Btn": "Schritt 8",
    "step9Btn": "Schritt 9",
    "step10Btn": "Schritt 10",
    "step11Btn": "Schritt 11",
    "step12Btn": "Schritt 12",
    "saveSpecies": "speichern & weiter",
    "saveClass": "speichern & weiter",
    "saveBackground": "speichern & weiter",
    "saveAttributes": "speichern & weiter",
    "saveLevel": "speichern & weiter",
    "saveClassForm": "speichern & weiter",
    "saveSpells": "speichern & weiter",
    "saveEquipment": "speichern & weiter",
    "saveStory": "speichern & weiter",
    "saveAlignment": "speichern & weiter",
    "saveAppearance": "speichern & weiter",
    "saveAndContinueLabel": "speichern & weiter",
    "finish": "Abschließen",
    "finishLabel": "Fertig",
    "back": "zurück",
    "editLabel": "Bearbeiten",

    // Allgemein
    "allLabel": "Alle",
    "noneLabel": "Keine",
    "optionsLabel": "Optionen",
    "infoBoxTraitTitle": "Erkläuterung der Merkmale",
    "requiredLabel": "Benötigt",
    "spellInfoBoxTitle": "Zauber Details",
    "amountLabel": "Anzahl",
    "identifierLabel": "Bezeichnung",
    "categoryLabel": "Kategorie",
    "propertyLabel": "Eigenschaft",
    "propertiesLabel": "Eigenschaften",
    "masteryLabel": "Meisterschaft",
    "damageLabel": "Schaden",
    "requirementsLabel": "Vorraussetzung",
    "variesLabel": "Varianten",
    "typeLabel": "Typ",
    "capacityLabel": "Kapazität",
    "crewLabel": "Bemannung",
    "passangersLabel": "Mitreisende",
    "costsLabel": "Preis",
    "optionLabel": "Option",
    "purseLabel": "Geldbörse",
    "type2Label": "Art",
    "bonusLabel": "Bonus",
    "attacksLabel": "Angriffe",
    "descriptionLabel": "Beschreibung",
    "symbolLabel": "Symbol",
    "characterStoryLabel": "Charaktergeschichte",
    "backstoryLabel": "Hintergrundgeschichte",
    "freeTextLabel": "Freitext",
    "selectionLabel": "Auswahl",
    "personalityLabel": "Persönlichkeit",
    "personalityTraitsLabel": "Persönlichkeitsmerkmale",
    "summaryLabel": "Zusammenfassung",
    "specializationLabel": "Spezialisierung",
    "characterNameLabel": "Charaktername",
    "DCLabel": "SG",
    "actionLabel": "Aktion",
    "bonusActionLabel": "Bonusaktion",
    "reactionLabel": "Reaktion",

    // Fortschritt
    "progressTitle": "Aktueller Fortschritt",
    "progressClassLabel": "Klasse:",
    "progressBackgroundLabel": "Hintergrund:",
    "progressSpeciesLabel": "Volk:",
    "progressAttributesLabel": "Attribute:",
    "progressLevelLabel": "Stufe:",
    "progressClassFormLabel": "Spezialisierung:",
    "progressSpellsLabel": "Zauber:",
    "progressAlignmentLabel": "Gesinnung:",
    "notSet": "Nicht festgelegt",
    "selected": "Ausgewählt",

    // Auswahl
    "chooseAbilityLabel": "Wähle ein Attribut",
    "chooseSkillLabel": "Wähle eine Fertigkeit",
    "chooseWTLabel": "Wähle einen Waffentyp",
    "chooseExpertiseLabel": "Wähle eine Fertigkeit für Expertise",
    "chooseInsrumentLabel": "Wähle ein Instrument",
    "chooseFightingStyleLabel": "Wähle einen Kampfstil",
    "chooseLanguageLabel": "Wähle eine Sprache",
    "chooseMetamagicLabel": "Wähle eine Metamagie",
    "chooseInvocationLabel": "Wähle eine Anrufung",
    "chooseOptionLabel": "Wähle eine Option",
    "chooseFeatLabel": "Wähle ein Talent",
    "chooseDeityLabel": "Wähle eine Gottheit",
    "nameOfDeityLabel": "Name der Gottheit",
    "choosePantheonLabel": "Wähle ein Pantheon",
    "pleaseSelectLabel": "-Bitte wählen-",

    // Warnungen
    "selectSpeciesAlert": "Bitte wähle ein Volk aus.",
    "selectClassAlert": "Bitte wähle eine Klasse aus.",
    "levelRangeAlert": "Bitte wähle eine Stufe zwischen 1 und 20.",
    "selectClassFormAlert": "Bitte forme deine Klasse.",
    "selectSpellsAlert": "Bitte wähle einen Zauber aus.",
    "selectBackgroundAlert": "Bitte wähle einen Hintergrund aus.",

    // Attribute
    "strengthLabel": "Stärke",
    "dexterityLabel": "Geschicklichkeit",
    "constitutionLabel": "Konstitution",
    "intelligenceLabel": "Intelligenz",
    "wisdomLabel": "Weisheit",
    "charismaLabel": "Charisma",
    "abilityLabel": "Attribut",
    "abilitiesLabel": "Attribute",
    "modifierLabel": "Modifikator",
    "scoreLabel": "Wert",
    "attributePointsLabel": "Verfügbare Punkte",
    "distributePointsLabel": "Punkte verteilen",
    "remainingPointsLabel": "Verbleibend",
    "distributionMethodsLabel": "Verteilungsmethode",
    "standardArrayLabel": "Standardsatz",
    "randomGenerationLabel": "Zufallserstellung",
    "pointCostLabel": "Punktkosten",
    "totalScoreLabel": "Gesamt",
    "modificatorLabel": "Modifikator",
    "attributeScoreLabel": "Attributwert",
    "abilityOverviewLabel": "Attributübersicht",
    "rollAttributesBtnLabel": "Werte würfeln",
    "remainingPointsTextLabel": "Verbleibende Punkte",
    "basicLabel": "Basis",
    "backgroundAttributeBonusLabel": "Hintergrund-Bonus",

    // Fertigkeiten
    "skillProfTitle": "Gemeisterte Fertigkeiten",
    "skillProfAbbr": "Fertigkeit",
    "skillsLabel": "Fertigkeiten",
    "savingThrowLabel": "Rettungswurf",
    "savingThrowAttrLabel": "Rettungswurfattr.",
    "acrobaticsLabel": "Akrobatik",
    "animalHandlingLabel": "Mit Tieren umgehen",
    "arcanaLabel": "Arkane Kunde",
    "athleticsLabel": "Athletik",
    "deceptionLabel": "Täuschen",
    "historyLabel": "Geschichte",
    "insightLabel": "Motiv erkennen",
    "intimidationLabel": "Einschüchtern",
    "investigationLabel": "Nachforschungen",
    "medicineLabel": "Heilkunde",
    "natureLabel": "Naturkunde",
    "perceptionLabel": "Wahrnehmung",
    "performanceLabel": "Auftreten",
    "persuasionLabel": "Überzeugen",
    "religionLabel": "Religion",
    "sleightOfHandLabel": "Fingerfertigkeit",
    "stealthLabel": "Heimlichkeit",
    "survivalLabel": "Überlebenskunst",

    // Weitere Eigenschaften
    "heroicInspirationLabel": "Heroische Inspiration",
    "passivePerceptionLabel": "Passive Wahrnehmung",
    "initiativeLabel": "Initiative",
    "speedLabel": "Bewegungsrate",

    // Währungen
    "CPLabel": "KM",
    "SPLabel": "SM",
    "EPLabel": "EM",
    "GPLabel": "GM",
    "PPLabel": "PM",

    // Gemeinschaften
    "communityLabel": "Gemeinschaft",
    "communityTitleLabel": "Gemeinschaften",
    "nameOfCommunityLabel": "Name der Gemeinschaft, welcher du anghörst",
    "cummunitySymbolLabel": "Symbol der Gemeinschaft",
    "communityDescLabel": "Beschreibung",

    // Gesinnungen
    "alignmentLabel": "Gesinnung",
    "chaoticLabel": "Chaotisch",
    "goodLabel": "Gut",
    "evilLabel": "Böse",
    "lawfulLabel": "Rechtschaffen",
    "neutralLabel": "Neutral",
    "alignLGLabel": "RG",
    "alignNGLabel": "NG",
    "alignCGLabel": "CG",
    "alignLNLabel": "RN",
    "alignNLabel": "N",
    "alignCNLabel": "CN",
    "alignLELabel": "RB",
    "alignNELabel": "NB",
    "alignCELabel": "CB",
    "lawfulGoodLabel": "Rechtschaffen Gut",
    "neutralGoodLabel": "Neutral Gut",
    "chaoticGoodLabel": "Chaotisch Gut",
    "lawfulNeutralLabel": "Rechtschaffen Neutral",
    "neutralLabel": "Neutral",
    "chaoticNeutralLabel": "Chaotisch Neutral",
    "lawfulEvilLabel": "Rechtschaffen Böse",
    "neutralEvilLabel": "Neutral Böse",
    "chaoticEvilLabel": "Chaotisch Böse",
    "lawfulGoodDLabel": "Rechtschaffene gute Kreaturen streben danach, das Richtige zu tun, wie es von der Gesellschaft erwartet wird. Jemand, der ohne zu zögern gegen Ungerechtigkeit kämpft und die Unschuldigen schützt, ist wahrscheinlich Rechtschaffen Gut.",
    "neutralGoodDLabel": "Neutrale gute Kreaturen tun das Beste, was sie können, arbeiten innerhalb der Regeln, fühlen sich aber nicht an sie gebunden. Eine freundliche Person, die anderen nach ihren Bedürfnissen hilft, ist wahrscheinlich Neutral Gut.",
    "chaoticGoodDLabel": "Chaotische gute Kreaturen handeln nach ihrem Gewissen, ohne Rücksicht darauf, was andere erwarten. Ein Rebell, der die Steuereintreiber eines grausamen Barons aufhält und das gestohlene Geld verwendet, um den Armen zu helfen, ist wahrscheinlich Chaotisch Gut.",
    "lawfulNeutralDLabel": "Rechtschaffen neutrale Individuen handeln gemäß Gesetzen, Traditionen oder persönlichen Kodizes. Jemand, der einem disziplinierten Lebensstil folgt und sich weder von den Anforderungen der Bedürftigen noch von den Versuchungen des Bösen beeinflussen lässt, ist wahrscheinlich Rechtschaffen Neutral.",
    "neutralDLabel": "Neutral ist die Ausrichtung derjenigen, die moralische Fragen lieber vermeiden und keine Partei ergreifen, sondern das tun, was ihnen zu der Zeit am besten erscheint. Jemand, der von moralischen Debatten gelangweilt ist, ist wahrscheinlich Neutral.",
    "chaoticNeutralDLabel": "Chaotisch neutrale Kreaturen folgen ihren Launen und schätzen ihre persönliche Freiheit über alles. Ein Schurke, der das Land durchstreift und von seinen eigenen Fähigkeiten lebt, ist wahrscheinlich Chaotisch Neutral.",
    "lawfulEvilDLabel": "Rechtschaffen böse Kreaturen nehmen methodisch das, was sie wollen, innerhalb der Grenzen eines Kodexes von Tradition, Loyalität oder Ordnung. Ein Aristokrat, der Bürger ausnutzt und gleichzeitig nach Macht strebt, ist wahrscheinlich Rechtschaffen Böse.",
    "neutralEvilDLabel": "Neutral Böse ist die Ausrichtung derjenigen, die sich nicht um den Schaden kümmern, den sie verursachen, während sie ihren Wünschen nachgehen. Ein Krimineller, der nach Belieben raubt und mordet, ist wahrscheinlich Neutral Böse.",
    "chaoticEvilDLabel": "Chaotisch böse Kreaturen handeln mit willkürlicher Gewalt, getrieben von ihrem Hass oder Blutdurst. Ein Schurke, der Rache- und Verwüstungsschemen verfolgt, ist wahrscheinlich Chaotisch Böse.",
    "boastfulLabel": "Prahlerisch",
    "impulsiveLabel": "Impulsiv",
    "rebelliousLabel": "Rebellisch",
    "selfAbsorbedLabel": "Selbstbezogen",
    "compassionateLabel": "Mitfühlend",
    "helpfulLabel": "Hilfsbereit",
    "honestLabel": "Ehrlich",
    "kindLabel": "Freundlich",
    "dishonestLabel": "Unehrlich",
    "vengefulLabel": "Rachsüchtig",
    "cruelLabel": "Grausam",
    "greedyLabel": "Gierig",
    "cooperativeLabel": "Kooperativ",
    "loyalLabel": "Loyal",
    "judgmentalLabel": "Verurteilend",
    "methodicalLabel": "Methodisch",
    "selfishLabel": "Egoistisch",
    "disinterestedLabel": "Desinteressiert",
    "laconicLabel": "Wortkarg",
    "pragmaticLabel": "Pragmatisch",

    // Sprachen
    "languagesLabel": "Sprachen",
    "commonLangLabel": "Gemeinsprache",
    "commonSignLangLabel": "Gemeinsprache Gebärdensprache",
    "draconicLangLabel": "Drakonisch",
    "dwarvishLangLabel": "Zwergisch",
    "elvishLangLabel": "Elfisch",
    "giantLangLabel": "Riesisch",
    "gnomishLangLabel": "Gnomisch",
    "goblinLangLabel": "Goblinisch",
    "halflingLangLabel": "Halblingisch",
    "orcLangLabel": "Orkisch",
    "abyssalLangLabel": "Abgründig",
    "celestialLangLabel": "Himmlisch",
    "deepSpeechLangLabel": "Tiefensprache",
    "druidicLangLabel": "Druidisch",
    "infernalLangLabel": "Infernalisch",
    "primordialLangLabel": "Ursprachen",
    "sylvanLangLabel": "Sylvanisch",
    "thievesCantLangLabel": "Diebessprache",
    "undercommonLangLabel": "Untergemeinsprache",
    "storyLang1Label": "Sprache (Festgelegt)",

    // Klasse
    "classDetails": "Klassendetails",
    "pushSymbolLabel": "Drücke das Symbol für",
    "classLabel": "Klasse",
    "subclass": "Unterklasse",
    "classFeaturesTitle": "Klassenmerkmale",
    "proficiencyBonusLabel": "Übungsbonus",
    "proficiencyBonusShortD": "Bonus, den du auf Würfe erhältst, wenn du in einer Fertigkeit geübt bist.",
    "primaryAbilityLabel": "Primär-Attribut",
    "hitPointDieLabel": "Trefferpunktewürfel",
    "hitDiceLabel": "Trefferwürfel",
    "classFeaturesLabel": "Levelbasierte Merkmale",
    "subclassTitle": "Unterklasse",
    "subclassFeaturesLabel": "Levelbasierte Unterklassenmerkmale",
    "subclassFeaturesTitle": "Unterklassenmerkmale",
    "spellcasterLabel": "Zauberwirker",
    "spellcastingFocusLabel": "Zauberfokus",
    "magicFeatNotice": "Du erlernst Zauber\n(Auswahl erfolgt in Schritt 7)",
    "spellcastingAbilityLabel": "Zauberattribut",
    "spellListLabel": "Zauberliste",

    // Level
    "levelLabel": "Stufe:",
    "levelLabel2": "Stufe",
    "levelAbbr": "St",
    "expansionAtLevelLabel": "Erweiterung auf Stufe",

    // Schadenstypen: Allgemein
    "damageTypeLabel": "Schadenstyp",
    "bludgeoningLabel": "Wucht",
    "piercingLabel": "Stich",
    "slashingLabel": "Hieb",
    "acidLabel": "Säure",
    "coldLabel": "Kälte",
    "fireLabel": "Feuer",
    "lightningLabel": "Blitz",
    "poisonLabel": "Gift",
    "thunderLabel": "Schall",
    "forceLabel": "Kraft",
    "necroticLabel": "Nekrotisch",
    "psychicLabel": "Psychisch",
    "radiantLabel": "Gleißend",

    // Schadenstypen: Energien
    "acidEnergyLabel": "Säure",
    "coldEnergyLabel": "Kälte",
    "fireEnergyLabel": "Feuer",
    "lightningEnergyLabel": "Blitz",
    "thunderEnergyLabel": "Schall",

    // Physische Klassen-Merkmale
    "niceSmellLabel": "Angenehmer Duft",
    "shadowDanceLabel": "Schattentanz",
    "hornsLabel": "Hörner",
    "colorChangeLabel": "Farbwechsel",

    // Tiere
    "butterfliesLabel": "Schmetterlinge",

    // Ausrüstung
    "equipmentLabel": "Ausrüstung",
    "equippedLabel": "angelegt",
    "equipmentProvidedLabel": "Gewährte Ausrüstung",
    "equipmentOptionsLabel": "Ausrüstungsoptionen",
    "additionalEquipmentTitle": "Ausrüstung hinzufügen & entfernen",
    "addItemButtonLabel": "Hinzufügen",

    // Aussehen
    "physicalCharacteristicsLabel": "Körperliche Merkmale",
    "appearanceLabel": "Aussehen",
    "appearanceDescLabel": "Beschreibung des Aussehens",
    "genderLabel": "Geschlecht",
    "maleLabel": "Männlich",
    "maleAbbrLabel": "m",
    "femaleLabel": "Weiblich",
    "femaleAbbrLabel": "w",
    "notDefinedLabel": "Nicht definiert",
    "notDefinedAbbrLabel": "n.d.",
    "ageLabel": "Alter",
    "yearsLabel": "Jahre",
    "eyeColorLabel": "Augenfarbe",
    "eyesLabel": "Augen",
    "hairColorLabel": "Haarfarbe",
    "hairsLabel": "Haare",
    "skinToneLabel": "Hautfarbe",
    "sizeLabel": "Größe",
    "sizeCategoryLabel": "Größenkategorie",

    // Sonstiges
    "poisonLabel": "Gift",
    "landLabel": "Land",
    "aridLabel": "Trockenes Land",
    "polarLand": "Polares Land",
    "temperateLabel": "Gemäßigtes Land",
    "tropicalLabel": "Tropisches Land",

    //Placeholder Texte
    "storyPlaceholderText": "Beschreibungen deiner bisherigen Erlebnisse allein oder in einer Gemeinschaft, deiner Schicksalsschläge und Triumphe sowie Einblicke in deine Sehnsüchte, Makel und Ideale",
    "communityPlaceholderText": "Beschreibe die Gemeinschaft, Organisation, den Orden, Kult, Clan, die Kaste, Gruppierung oder das Adelshaus, dem du angehörst. Beschreibe euer Zeichen, Symbol oder Wappen. Beschreibe die Riten, Bräuche und Traditionen deiner Gemeinschaft.",
    "alignmentPlaceholderText": "Liste Persönlichkeitsmerkmale auf. Führe die Grundsätze, Ideale und Werte deines Charakters an. Du kannst aus der untenstehenden Tabelle Merkmale in diese Textbox ziehen und auch eigene hineinschreiben.",
    "appearancePlaceholderText": "Beschreibe dein Aussehen. Führe körperliche Merkmale auf, welche dich von anderen abheben.",
    "namePlaceholderText": "Name deines Charakters",
    "portraitPlaceholderText": "Portrait",
    "symbolLabelText": "Symbol",

    // Mobile Version
    "confirmFinish": "Möchtest du die Charaktererstellung abschließen und den Bogen erstellen?",
    "swipeHint": "Wische zum Navigieren",

    // Charakterbogen
    "playerNameLabel": "Spielername",
    "pageNumerLabel": "Seite",
    "appendixPageLabel": "Anhang Seite",
    "appendixPage2Label": "Anh. S.",
    "xpLabel": "XP",
    "heroicInspirationLabel": "Heroische Inspiration",
    "passivePerceptionLabel": "Passive Wahrnehmung",
    "initiativeLabel": "Initiative",
    "armorClassLabel": "Rüstungsklasse",
    "equipedArmorLabel": "Rüstung",
    "shieldActiveLabel": "Schild",
    "hitPointsLabel": "Trefferpunkte",
    "currentHPLabel": "aktuell",
    "tempHPLabel": "temp.",
    "maxHPLabel": "max.",
    "spentHDLabel": "eingesetzt",
    "maxHDLabel": "max.",
    "deathSavesLabel": "Todesrettungswürfe",
    "successDSLabel": "Erfolge",
    "failDSLabel": "Fehlschläge",
    "physicalAttacksLabel": "Physische Angriffe",
    "luggageLabel": "Gepäck & Reichtümer",
    "storyAndAlignmentLabel": "Geschichte & Gesinnung",
    "changePicText": "Bild ändern",
    "autoValueText": "Dieser Wert wird automatisch berechnet",
    "editButtonLabel": "Bearbeiten",
    "downloadPdfLabel": "Als PDF herunterladen"
},

    en: {
    // Schritt-Titel
    "pageTitle": "Create DnD Character",
    "step1Title": "Step 1: Choose Class",
    "step2Title": "Step 2: Choose Background",
    "step3Title": "Step 3: Choose Species",
    "step4Title": "Step 4: Set Abilities",
    "step5Title": "Step 5: Choose Level",
    "step6Title": "Step 6: Specialization",
    "step7Title": "Step 7: Choose Spells",
    "step8Title": "Step 8: Choose Equipment",
    "step9Title": "Step 9: Tell your story",
    "step10Title": "Step 10: Weight alignment",
    "step11Title": "Step 11: Describe appearance",
    "step12Title": "Step 12: Naming",
    "step1Description": "Choose your character's class.",
    "step2Description": "Choose your character's background.",
    "step3Description": "Choose your character's species.",
    "step4Description": "Determine your character's strengths and weaknesses.",
    "step5Description": "Choose a level (1-20) for your character.",
    "step6Description": "Choose abilities based on class and level.",
    "step7Description": "Choose the spells for your character.",
    "step8Description": "Choose the euipment for your character.",
    "step9Description": "Describe your character's origin and experiences.",
    "step10Description": "Determine your character's personality and alignment.",
    "step11Description": "Describe your character's appearance.",
    "step12Description": "Review your choices and give your character a name.",

    // Buttons
    "step1Btn": "Step 1",
    "step2Btn": "Step 2",
    "step3Btn": "Step 3",
    "step4Btn": "Step 4",
    "step5Btn": "Step 5",
    "step6Btn": "Step 6",
    "step7Btn": "Step 7",
    "step8Btn": "Step 8",
    "step9Btn": "Step 9",
    "step10Btn": "Step 10",
    "step11Btn": "Step 11",
    "step12Btn": "Step 12",
    "saveSpecies": "save & continue",
    "saveClass": "save & continue",
    "saveBackground": "save & continue",
    "saveAttributes": "save & continue",
    "saveLevel": "save & continue",
    "saveClassForm": "save & continue",
    "saveSpells": "save & continue",
    "saveEquipment": "save & continue",
    "saveStory": "save & continue",
    "saveAlignment": "save & continue",
    "saveAppearance": "save & continue",
    "saveAndContinueLabel": "save & continue",
    "finish": "Finalize",
    "finishLabel": "Finish",
    "back": "back",
    "editLabel": "Edit",

    // General
    "allLabel": "All",
    "noneLabel": "None",
    "optionsLabel": "options",
    "infoBoxTraitTitle": "Explanation of Traits",
    "requiredLabel": "Required",
    "spellInfoBoxTitle": "Spell Details",
    "amountLabel": "Amount",
    "identifierLabel": "Name",
    "categoryLabel": "Category",
    "propertyLabel": "Property",
    "propertiesLabel": "Properties",
    "masteryLabel": "Mastery",
    "damageLabel": "Damage",
    "requirementsLabel": "Requirements",
    "variesLabel": "Varies",
    "typeLabel": "Type",
    "capacityLabel": "Capacity",
    "crewLabel": "Crew",
    "passangersLabel": "Passangers",
    "costsLabel": "Costs",
    "optionLabel": "option",
    "purseLabel": "Purse",
    "type2Label": "Type",
    "bonusLabel": "Bonus",
    "attacksLabel": "Attacks",
    "descriptionLabel": "Description",
    "symbolLabel": "Symbol",
    "characterStoryLabel": "Character story",
    "backstoryLabel": "Backstory",
    "freeTextLabel": "Free text",
    "selectionLabel": "Selection",
    "personalityLabel": "Personality",
    "personalityTraitsLabel": "Personality traits",
    "summaryLabel": "Summary",
    "specializationLabel": "Specialization",
    "characterNameLabel": "Character Name",
    "DCLabel": "DC",
    "actionLabel": "Action",
    "bonusActionLabel": "Bonus Action",
    "reactionLabel": "Reaction",

    // Progress
    "progressTitle": "Current Progress",
    "progressClassLabel": "Class:",
    "progressBackgroundLabel": "Background:",
    "progressSpeciesLabel": "Species:",
    "progressAttributesLabel": "Abilities:",
    "progressLevelLabel": "Level:",
    "progressClassFormLabel": "Specialization:",
    "progressSpellsLabel": "Spells:",
    "progressAlignmentLabel": "Alignment:",
    "notSet": "Not Set",
    "selected": "Selected",

    // Selection
    "chooseAbilityLabel": "Choose an Ability",
    "chooseSkillLabel": "Choose a Skill",
    "chooseWTLabel": "Choose a Weapon Type",
    "chooseExpertiseLabel": "Choose a Skill for Expertise",
    "chooseInsrumentLabel": "Choose an Instrument",
    "chooseFightingStyleLabel": "Choose a Fighting Style",
    "chooseLanguageLabel": "Choose a Language",
    "chooseMetamagicLabel": "Choose a Metamagic",
    "chooseInvocationLabel": "Choose a Invocation",
    "chooseOptionLabel": "Choose an Option",
    "chooseFeatLabel": "Choose a Feat",
    "chooseDeityLabel": "Choose a Deity",
    "nameOfDeityLabel": "Name of the Deity",
    "choosePantheonLabel": "Choose a Pantheon",
    "pleaseSelectLabel": "-Please Select-",

    // Warnings
    "selectSpeciesAlert": "Please choose a species.",
    "selectClassAlert": "Please choose a class.",
    "levelRangeAlert": "Please select a level between 1 and 20.",
    "selectClassFormAlert": "Please form your class.",
    "selectSpellsAlert": "Please choose a spell.",
    "selectBackgroundAlert": "Please choose a background.",

    // Attributes
    "strengthLabel": "Strength",
    "dexterityLabel": "Dexterity",
    "constitutionLabel": "Constitution",
    "intelligenceLabel": "Intelligence",
    "wisdomLabel": "Wisdom",
    "charismaLabel": "Charisma",
    "abilityLabel": "Ability",
    "abilitiesLabel": "Abilities",
    "modifierLabel": "Modifier",
    "scoreLabel": "Score",
    "attributePointsLabel": "Available Points",
    "distributePointsLabel": "Distribute Points",
    "remainingPointsLabel": "Remaining",
    "distributionMethodsLabel": "Distribution Method",
    "standardArrayLabel": "Standard Array",
    "randomGenerationLabel": "Random Generation",
    "pointCostLabel": "Point Cost",
    "totalScoreLabel": "Total",
    "modificatorLabel": "Modifier",
    "attributeScoreLabel": "Ability Score",
    "abilityOverviewLabel": "Attribute Overview",
    "rollAttributesBtnLabel": "Roll Abilities",
    "remainingPointsTextLabel": "Remaining Points",
    "basicLabel": "Base",
    "backgroundAttributeBonusLabel": "Background Bonus",

    // Skills
    "skillProfTitle": "Mastered Skills",
    "skillProfAbbr": "Skill",
    "skillsLabel": "Skills",
    "savingThrowLabel": "Saving Throw",
    "savingThrowAttrLabel": "Saving Throw Attr.",
    "acrobaticsLabel": "Acrobatics",
    "animalHandlingLabel": "Animal Handling",
    "arcanaLabel": "Arcana",
    "athleticsLabel": "Athletics",
    "deceptionLabel": "Deception",
    "historyLabel": "History",
    "insightLabel": "Insight",
    "intimidationLabel": "Intimidation",
    "investigationLabel": "Investigation",
    "medicineLabel": "Medicine",
    "natureLabel": "Nature",
    "perceptionLabel": "Perception",
    "performanceLabel": "Performance",
    "persuasionLabel": "Persuasion",
    "religionLabel": "Religion",
    "sleightOfHandLabel": "Sleight of Hand",
    "stealthLabel": "Stealth",
    "survivalLabel": "Survival",

    // Additional Properties
    "heroicInspirationLabel": "Heroic Inspiration",
    "passivePerceptionLabel": "Passive Perception",
    "initiativeLabel": "Initiative",
    "speedLabel": "Speed",

    // Currencies
    "CPLabel": "CP",
    "SPLabel": "SP",
    "EPLabel": "EP",
    "GPLabel": "GP",
    "PPLabel": "PP",

    // Communities
    "communityLabel": "Community",
    "communityTitleLabel": "Communities",
    "nameOfCommunityLabel": "Name of the community",
    "cummunitySymbolLabel": "Community symbol",
    "communityDescLabel": "Description",

    // Alignments
    "alignmentLabel": "Alignment",
    "chaoticLabel": "Chaotic",
    "goodLabel": "Good",
    "evilLabel": "Evil",
    "lawfulLabel": "Lawful",
    "neutralLabel": "Neutral",
    "alignLGLabel": "LG",
    "alignNGLabel": "NG",
    "alignCGLabel": "CG",
    "alignLNLabel": "LN",
    "alignNLabel": "N",
    "alignCNLabel": "CN",
    "alignLELabel": "LE",
    "alignNELabel": "NE",
    "alignCELabel": "CE",
    "lawfulGoodLabel": "Lawful Good",
    "neutralGoodLabel": "Neutral Good",
    "chaoticGoodLabel": "Chaotic Good",
    "lawfulNeutralLabel": "Lawful Neutral",
    "neutralLabel": "Neutral",
    "chaoticNeutralLabel": "Chaotic Neutral",
    "lawfulEvilLabel": "Lawful Evil",
    "neutralEvilLabel": "Neutral Evil",
    "chaoticEvilLabel": "Chaotic Evil",
    "lawfulGoodDLabel": "Lawful Good creatures endeavor to do the right thing as expected by society. Someone who fights injustice and protects the innocent without hesitation is probably Lawful Good.",
    "neutralGoodDLabel": "Neutral Good creatures do the best they can, working within rules but not feeling bound by them. A kindly person who helps others according to their needs is probably Neutral Good.",
    "chaoticGoodDLabel": "Chaotic Good creatures act as their conscience directs with little regard for what others expect. A rebel who waylays a cruel baron’s tax collectors and uses the stolen money to help the poor is probably Chaotic Good.",
    "lawfulNeutralDLabel": "Lawful Neutral individuals act in accordance with law, tradition, or personal codes. Someone who follows a disciplined rule of life—and isn’t swayed either by the demands of those in need or by the temptations of evil—is probably Lawful Neutral.",
    "neutralDLabel": "Neutral is the alignment of those who prefer to avoid moral questions and don’t take sides, doing what seems best at the time. Someone who’s bored by moral debate is probably Neutral.",
    "chaoticNeutralDLabel": "Chaotic Neutral creatures follow their whims, valuing their personal freedom above all else. A scoundrel who wanders the land living by their wits is probably Chaotic Neutral.",
    "lawfulEvilDLabel": "Lawful Evil creatures methodically take what they want within the limits of a code of tradition, loyalty, or order. An aristocrat exploiting citizens while scheming for power is probably Lawful Evil.",
    "neutralEvilDLabel": "Neutral Evil is the alignment of those who are untroubled by the harm they cause as they pursue their desires. A criminal who robs and murders as they please is probably Neutral Evil.",
    "chaoticEvilDLabel": "Chaotic Evil creatures act with arbitrary violence, spurred by their hatred or bloodlust. A villain pursuing schemes of vengeance and havoc is probably Chaotic Evil.",
    "boastfulLabel": "Boastful",
    "impulsiveLabel": "Impulsive",
    "rebelliousLabel": "Rebellious",
    "selfAbsorbedLabel": "Self-absorbed",
    "compassionateLabel": "Compassionate",
    "helpfulLabel": "Helpful",
    "honestLabel": "Honest",
    "kindLabel": "Kind",
    "dishonestLabel": "Dishonest",
    "vengefulLabel": "Vengeful",
    "cruelLabel": "Cruel",
    "greedyLabel": "Greedy",
    "cooperativeLabel": "Cooperative",
    "loyalLabel": "Loyal",
    "judgmentalLabel": "Judgmental",
    "methodicalLabel": "Methodical",
    "selfishLabel": "Selfish",
    "disinterestedLabel": "Disinterested",
    "laconicLabel": "Laconic",
    "pragmaticLabel": "Pragmatic",

    // Languages
    "languagesLabel": "Languages",
    "commonLangLabel": "Common",
    "commonSignLangLabel": "Common Sign Language",
    "draconicLangLabel": "Draconic",
    "dwarvishLangLabel": "Dwarvish",
    "elvishLangLabel": "Elvish",
    "giantLangLabel": "Giant",
    "gnomishLangLabel": "Gnomish",
    "goblinLangLabel": "Goblin",
    "halflingLangLabel": "Halfling",
    "orcLangLabel": "Orc",
    "abyssalLangLabel": "Abyssal",
    "celestialLangLabel": "Celestial",
    "deepSpeechLangLabel": "Deep Speech",
    "druidicLangLabel": "Druidic",
    "infernalLangLabel": "Infernal",
    "primordialLangLabel": "Primordial",
    "sylvanLangLabel": "Sylvan",
    "thievesCantLangLabel": "Thieves' Cant",
    "undercommonLangLabel": "Undercommon",
    "storyLang1Label": "Language (Fixed)",

    // Class
    "classDetails": "Class Details",
    "pushSymbolLabel": "Click the symbol for",
    "classLabel": "Class",
    "subclass": "Subclass",
    "classFeaturesTitle": "Class Features",
    "proficiencyBonusLabel": "Proficiency Bonus",
    "proficiencyBonusShortD": "Bonus you receive on rolls when you are proficient in a skill.",
    "primaryAbilityLabel": "Primary Ability",
    "hitPointDieLabel": "Hit Point Dice",
    "hitDiceLabel": "Hit Dice",
    "classFeaturesLabel": "Level-Based Features",
    "subclassTitle": "Subclass",
    "subclassFeaturesLabel": "Level-Based Subclass Features",
    "subclassFeaturesTitle": "Subclass Features",
    "spellcasterLabel": "Spellcaster",
    "spellcastingFocusLabel": "Spellcasting Focus",
    "magicFeatNotice": "You learn spells\n(Selection happens in Step 7)",
    "spellcastingAbilityLabel": "Spellcasting Ability",
    "spellListLabel": "Spell List",

    // Level
    "levelLabel": "Level:",
    "levelLabel2": "Level",
    "levelAbbr": "Lvl",
    "expansionAtLevelLabel": "Expansion at level",

    // Damage Types: Generell
    "damageTypeLabel": "Damage Type",
    "bludgeoningLabel": "Bludgeoning",
    "piercingLabel": "Piercing",
    "slashingLabel": "Slashing",
    "acidLabel": "Acid",
    "coldLabel": "Cold",
    "fireLabel": "Fire",
    "lightningLabel": "Lightning",
    "poisonLabel": "Poison",
    "thunderLabel": "Thunder",
    "forceLabel": "Force",
    "necroticLabel": "Necrotic",
    "psychicLabel": "Psychic",
    "radiantLabel": "Radiant",

    // Damage Types: Energies
    "acidEnergyLabel": "Acid",
    "coldEnergyLabel": "Cold",
    "fireEnergyLabel": "Firer",
    "lightningEnergyLabel": "Lightning",
    "thunderEnergyLabel": "Thunder",

    // Physical class-characteristics
    "niceSmellLabel": "Nice Smell",
    "shadowDanceLabel": "Shadow Dance",
    "hornsLabel": "Horns",
    "colorChangeLabel": "Color Change",

    // Animals
    "butterfliesLabel": "Butterflies",

    // Euipment
    "equipmentLabel": "Equipment",
    "equippedLabel": "equipped",
    "equipmentProvidedLabel": "Provided Equipment",
    "equipmentOptionsLabel": "Equipment Options",
    "additionalEquipmentTitle": "Add & delete equipment",
    "addItemButtonLabel": "Add Item",

    // Appearance
    "physicalCharacteristicsLabel": "Physical characteristics",
    "appearanceLabel": "Appearance",
    "appearanceDescLabel": "Appearance description",
    "genderLabel": "Gender",
    "maleLabel": "Male",
    "maleAbbrLabel": "m",
    "femaleLabel": "Female",
    "femaleAbbrLabel": "f",
    "notDefinedLabel": "Not defined",
    "notDefinedAbbrLabel": "n.d.",
    "ageLabel": "Age",
    "yearsLabel": "years",
    "eyeColorLabel": "Eye color",
    "eyesLabel": "Eyes",
    "hairColorLabel": "Hair color",
    "hairsLabel": "Hairs",
    "skinToneLabel": "Skin tone",
    "sizeLabel": "Size",
    "sizeCategoryLabel": "Size Category",

    // Miscellaneous
    "poisonLabel": "Poison",
    "landLabel": "Land",
    "aridLabel": "Arid Land",
    "polarLand": "Polar Land",
    "temperateLabel": "Temperate Land",
    "tropicalLabel": "Tropical Land",

    //Placeholder texts
    "storyPlaceholderText": "Descriptions of your past experiences alone or as part of a community; your hardships and triumphs; and insights into your longings, flaws, and ideals",
    "communityPlaceholderText": "Describe the community, organization, order, cult, clan, caste, group, or noble house you belong to. Describe your emblem, symbol, or coat of arms. Describe the rites, customs, and traditions of your community.",
    "alignmentPlaceholderText": "List personality traits. Outline your character’s principles, ideals, and values. You can drag traits from the table below into this textbox and also write your own.",
    "appearancePlaceholderText": "Describe your appearance. List physical characteristics that set you apart from others.",
    "namePlaceholderText": "Name of your character",
    "portraitPlaceholderText": "Portrait",
    "symbolLabelText": "Symbol",

    // mobile cersion
    "confirmFinish": "Do you want to complete the character creation and generate the sheet?",
    "swipeHint": "Swipe to navigate",

    // character sheet
    "playerNameLabel": "Player Name",
    "pageNumerLabel": "page",
    "appendixPageLabel": "appendix page",
    "appendixPage2Label": "App. p.",
    "xpLabel": "XP",
    "heroicInspirationLabel": "Heroic Inspiration",
    "passivePerceptionLabel": "Passive Perception",
    "initiativeLabel": "Initiative",
    "armorClassLabel": "Armor Class",
    "equipedArmorLabel": "Armor",
    "shieldActiveLabel": "Shield",
    "hitPointsLabel": "Hit Points",
    "currentHPLabel": "current",
    "tempHPLabel": "temp.",
    "maxHPLabel": "max.",
    "spentHDLabel": "spent",
    "maxHDLabel": "max.",
    "deathSavesLabel": "Death Saves",
    "successDSLabel": "Success",
    "failDSLabel": "Fails",
    "physicalAttacksLabel": "Physical Attacks",
    "luggageLabel": "Equipment & Wealth",
    "storyAndAlignmentLabel": "Story & Alignment",
    "changePicText": "Change image",
    "autoValueText": "This value is calculated automatically",
    "editButtonLabel": "Edit",
    "downloadPdfLabel": "Download as PDF"
  }
};

function setTextContent(id, text) {
    const element = document.getElementById(id);
    if (element) {
        const formattedText = text
            .replace(/\n/g, '<br>') // Zeilenumbrüche durch <br> ersetzen
            .replace(/(\b[A-Z][a-zA-Z\s]*:)/g, '<strong>$1</strong>'); // Merkmale fett machen
        element.innerHTML = formattedText;
    } else {
        console.warn(`Element with ID ${id} not found.`);
    }
}

function applyTranslations(translations, currentLang) {
    const elements = translations[currentLang];
    if (!elements) {
        console.error("No translations found for the current language: " + currentLang);
        return;
    }

   // Definition welcher Schritt welches Label bekommt (deine Liste)
    const labelMapping = {
        1: "classLabel", 2: "backgroundLabel", 3: "speciesLabel", 4: "abilitiesLabel",
        5: "levelLabel2", 6: "specializationLabel", 7: "spellsLabel", 8: "equipmentLabel",
        9: "characterStoryLabel", 10: "alignmentLabel", 11: "appearanceLabel", 12: "characterNameLabel"
    };

    for (let i = 1; i <= 12; i++) {
        // Haupt-Text (Schritt X)
        const span = document.querySelector(`#step${i}Btn > span`);
        if (span) span.innerText = elements[`step${i}Btn`] || `Schritt ${i}`;

        // Festes Label (Kategorie)
        const lbl = document.getElementById(`lblStep${i}`);
        if (lbl) lbl.innerText = elements[labelMapping[i]] || labelMapping[i];
    }

    setTextContent('pageTitle', elements.pageTitle);
    setTextContent('step1Title', elements.step1Title);
    setTextContent('step2Title', elements.step2Title);
    setTextContent('step3Title', elements.step3Title);
    setTextContent('step4Title', elements.step4Title);
    setTextContent('step5Title', elements.step5Title);
    setTextContent('step6Title', elements.step6Title);
    setTextContent('step7Title', elements.step7Title);
    setTextContent('step8Title', elements.step8Title);
    setTextContent('step9Title', elements.step9Title);
    setTextContent('step10Title', elements.step10Title);
    setTextContent('step11Title', elements.step11Title);
    setTextContent('step12Title', elements.step12Title);
    setTextContent('skillProfTitle', elements.skillProfTitle);
    const chooseSkillLabelHTML = `${elements.chooseSkillLabel} (${elements.levelLabel2} 1):`;
    setTextContent('chooseSkillLabelA', chooseSkillLabelHTML);
    setTextContent('chooseSkillLabelB', chooseSkillLabelHTML);
    setTextContent('distributionMethodsLabel', elements.distributionMethodsLabel);
    setTextContent('standardArrayLabel', elements.standardArrayLabel);
    setTextContent('randomGenerationLabel', elements.randomGenerationLabel);
    setTextContent('pointCostLabel', elements.pointCostLabel);
    setTextContent('subclassTitle', elements.subclassTitle);
    setTextContent('improvTitle', elements.improvTitle);
    setTextContent('step1Description', elements.step1Description);
    setTextContent('step2Description', elements.step2Description);
    setTextContent('step3Description', elements.step3Description);
    setTextContent('step4Description', elements.step4Description);
    setTextContent('step5Description', elements.step5Description);
    setTextContent('step6Description', elements.step6Description);
    // setTextContent('step7Description', elements.step7Description); Auskommentiert, wegen Übersetzungslogik
    setTextContent('step8Description', elements.step8Description);
    setTextContent('step9Description', elements.step9Description);
    setTextContent('step10Description', elements.step10Description);
    setTextContent('step11Description', elements.step11Description);
    setTextContent('step12Description', elements.step12Description);
    setTextContent('toggleText', elements.pushSymbolLabel);
    setTextContent('classDetailsHeader', elements.classDetails);
    setTextContent('backgroundDetailsHeader', elements.backgroundDetails);
    setTextContent('levelLabel', elements.levelLabel);
    setTextContent('infoBoxTraitTitle', elements.infoBoxTraitTitle);
    setTextContent('infoBoxTraitTitle2', elements.infoBoxTraitTitle);
    setTextContent('rollAttributesBtn', elements.rollAttributesBtnLabel);
    setTextContent('remainingPointsTextLabel', elements.remainingPointsTextLabel);
    // setTextContent('additionalEquipmentTitle', elements.additionalEquipmentTitle); Auskommentiert, wegen Übersetzungslogik        	
    setTextContent('purseLabel', elements.purseLabel)

    // Setze die Völkernamen in den Labels
    setTextContent('aasimarLabel', elements.aasimarLabel);
    setTextContent('dragonbornLabel', elements.dragonbornLabel);
    setTextContent('dwarfLabel', elements.dwarfLabel);
    setTextContent('elfLabel', elements.elfLabel);
    setTextContent('gnomeLabel', elements.gnomeLabel);
    setTextContent('goliathLabel', elements.goliathLabel);
    setTextContent('halflingLabel', elements.halflingLabel);
    setTextContent('humanLabel', elements.humanLabel);
    setTextContent('orcLabel', elements.orcLabel);
    setTextContent('tieflingLabel', elements.tieflingLabel);

    // Setze die Völkerbeschreibung in den Labels
    setTextContent('aasimarD', elements.aasimarD);
    setTextContent('dragonbornD', elements.dragonbornD);
    setTextContent('dwarfD', elements.dwarfD);
    setTextContent('elfD', elements.elfD);
    setTextContent('gnomeD', elements.gnomeD);
    setTextContent('goliathD', elements.goliathD);
    setTextContent('halflingD', elements.halflingD);
    setTextContent('humanD', elements.humanD);
    setTextContent('orcD', elements.orcD);
    setTextContent('tieflingD', elements.tieflingD);

    // Setze die Klassennamen in den Labels
    setTextContent('barbarianLabel', elements.barbarian);
    setTextContent('bardLabel', elements.bard);
    setTextContent('clericLabel', elements.cleric);
    setTextContent('druidLabel', elements.druid);
    setTextContent('fighterLabel', elements.fighter);
    setTextContent('monkLabel', elements.monk);
    setTextContent('paladinLabel', elements.paladin);
    setTextContent('rangerLabel', elements.ranger);
    setTextContent('rogueLabel', elements.rogue);
    setTextContent('sorcererLabel', elements.sorcerer);
    setTextContent('warlockLabel', elements.warlock);
    setTextContent('wizardLabel', elements.wizard);

    // Setze die Klassenbeschreibung in den Labels
    setTextContent('barbarianText', elements.barbarianText);
    setTextContent('bardText', elements.bardText);
    setTextContent('clericText', elements.clericText);
    setTextContent('druidText', elements.druidText);
    setTextContent('fighterText', elements.fighterText);
    setTextContent('monkText', elements.monkText);
    setTextContent('paladinText', elements.paladinText);
    setTextContent('rangerText', elements.rangerText);
    setTextContent('rogueText', elements.rogueText);
    setTextContent('sorcererText', elements.sorcererText);
    setTextContent('warlockText', elements.warlockText);
    setTextContent('wizardText', elements.wizardText);

    // Setze die Hintergrundnamen in den Labels
    setTextContent('acolyteLabel', elements.acolyte);
    setTextContent('artisanLabel', elements.artisan);
    setTextContent('charlatanLabel', elements.charlatan);
    setTextContent('criminalLabel', elements.criminal);
    setTextContent('entertainerLabel', elements.entertainer);
    setTextContent('farmerLabel', elements.farmer);
    setTextContent('guardLabel', elements.guard);
    setTextContent('guideLabel', elements.guide);
    setTextContent('hermitLabel', elements.hermit);
    setTextContent('merchantLabel', elements.merchant);
    setTextContent('nobleLabel', elements.noble);
    setTextContent('sageLabel', elements.sage);
    setTextContent('sailorLabel', elements.sailor);
    setTextContent('scribeLabel', elements.scribe);
    setTextContent('soldierLabel', elements.soldier);
    setTextContent('wayfarerLabel', elements.wayfarer);

    // Setze die Hintergrundbeschreibung in den Labels
    setTextContent('acolyteText', elements.acolyteText);
    setTextContent('artisanText', elements.artisanText);
    setTextContent('charlatanText', elements.charlatanText);
    setTextContent('criminalText', elements.criminalText);
    setTextContent('entertainerText', elements.entertainerText);
    setTextContent('farmerText', elements.farmerText);
    setTextContent('guardText', elements.guardText);
    setTextContent('guideText', elements.guideText);
    setTextContent('hermitText', elements.hermitText);
    setTextContent('merchantText', elements.merchantText);
    setTextContent('nobleText', elements.nobleText);
    setTextContent('sageText', elements.sageText);
    setTextContent('sailorText', elements.sailorText);
    setTextContent('scribeText', elements.scribeText);
    setTextContent('soldierText', elements.soldierText);
    setTextContent('wayfarerText', elements.wayfarerText);

    // --- Charaktergeschichte & Glaube ---
    setTextContent('languagesLabel', elements.languagesLabel);
    setTextContent('faithLabel', elements.faithLabel);
    setTextContent('selectionLabel', elements.selectionLabel);
    setTextContent('freeTextLabel', elements.freeTextLabel);
    setTextContent('forgottenRealmsLabel', elements.forgottenRealmsLabel);
    setTextContent('choosePantheonLabel', elements.choosePantheonLabel);
    setTextContent('chooseDeityLabel', elements.chooseDeityLabel);
    setTextContent('alignmentLabel', elements.alignmentLabel);
    setTextContent('symbolLabel', elements.symbolLabel);
    setTextContent('nameOfDeityLabel', elements.nameOfDeityLabel);

    // Gemeinschaft
    setTextContent('communityTitleLabel', elements.communityTitleLabel);
    setTextContent('nameOfCommunityLabel', elements.nameOfCommunityLabel);
    setTextContent('communityDescLabel', elements.communityDescLabel);

    // Sprachen
    setTextContent('storyLang1Label', elements.storyLang1Label);
    setTextContent('chooseLanguageLabel2', elements.chooseLanguageLabel);
    setTextContent('chooseLanguageLabel3', elements.chooseLanguageLabel);

    // Gesinnung
    setTextContent('alignmentSelectionLabel', elements.alignmentLabel);

    // Aussehen
    setTextContent('speciesLabel', elements.speciesLabel);
    setTextContent('lineageLabel', elements.lineageLabel);
    setTextContent('ancestryLabel', elements.ancestryLabel);
    setTextContent('physicalCharacteristicsLabel', elements.physicalCharacteristicsLabel);
    setTextContent('genderLabel', elements.genderLabel);
    setTextContent('ageLabel', elements.ageLabel);
    setTextContent('yearsLabel', elements.yearsLabel);
    setTextContent('eyeColorLabel', elements.eyeColorLabel);
    setTextContent('hairColorLabel', elements.hairColorLabel);
    setTextContent('skinToneLabel', elements.skinToneLabel);
    setTextContent('sizeLabel', elements.sizeLabel);
    setTextContent('sizeCategoryLabel', elements.sizeCategoryLabel);

    // Name & Abschluss
    setTextContent('summaryLabel', elements.summaryLabel);

    // Onboarding Labels übersetzen
    setTextContent('onboardingBackLabel', elements.back);
    setTextContent('onboardingSaveLabel', elements.saveAndContinueLabel);
    setTextContent('onboardingSwipeHint', elements.swipeHint);

    // Setze den Text, ohne das Fragezeichen zu überschreiben

    const speciesTraitsLabelElement = document.getElementById('speciesTraitsLabel');
    if (speciesTraitsLabelElement && speciesTraitsLabelElement.childNodes.length > 0 && speciesTraitsLabelElement.childNodes[0].nodeType === Node.TEXT_NODE) {
        // Stelle sicher, dass elements.speciesTraitsLabel existiert, bevor darauf zugegriffen wird.
        const labelText = elements.speciesTraitsLabel || "Volksmerkmale"; // Fallback
        speciesTraitsLabelElement.childNodes[0].nodeValue = labelText + " ";
    }

    const classFeaturesTitleElement = document.getElementById('classFeaturesTitle');
    if (classFeaturesTitleElement && classFeaturesTitleElement.childNodes.length > 0 && classFeaturesTitleElement.childNodes[0].nodeType === Node.TEXT_NODE) {
         // Stelle sicher, dass elements.classFeaturesTitle existiert, bevor darauf zugegriffen wird.
        const labelText = elements.classFeaturesTitle || "Klassenmerkmale"; // Fallback
        classFeaturesTitleElement.childNodes[0].nodeValue = labelText + " ";
    }

    const step7DescriptionElement = document.getElementById('step7Description');
    if (step7DescriptionElement && step7DescriptionElement.childNodes.length > 0 && step7DescriptionElement.childNodes[0].nodeType === Node.TEXT_NODE) {
        const labelText = elements.step7Description || "Wähle die Zauber für deinen Charakter:";
        step7DescriptionElement.childNodes[0].nodeValue = labelText;
    }

    const additionalEquipmentTitleElement = document.getElementById('additionalEquipmentTitle');
    if (additionalEquipmentTitleElement && additionalEquipmentTitleElement.childNodes.length > 0 && additionalEquipmentTitleElement.childNodes[0].nodeType === Node.TEXT_NODE) {
        const labelText = elements.additionalEquipmentTitle || "Weitere Ausrüstung wählen:";
        additionalEquipmentTitleElement.childNodes[0].nodeValue = labelText;
    }

    // Aktualisiert die Fortschrittsanzeige
    updateProgress();

    // Aktualisiere den Inhalt der Infobox, falls eine Klasse gewählt ist
    if (selectedClassName) {
        updateInfoBoxContent(selectedClassName);
    }

    // Falls eine Klasse und ein Level ausgewählt sind, aktualisieren wir die Klassenmerkmale
    if (character.class && character.level) {
        displayClassFeatures(character.level);
    }

    updateProgress();
    
}