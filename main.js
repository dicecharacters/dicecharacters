//=======================================================================
// Globale Variablen für Charakterbogen
//=======================================================================

let character = {
    class: null,                      // Schritt 1: Klasse
    background: null,                 // Schritt 2: Hintergrund
    feat_background: null,            // Schritt 2: Hintergrund
    tool_background: null,            // Schritt 2: Hintergrund
    instrument_background: null,      // Schritt 2: Hintergrund
    game_background: null,            // Schritt 2: Hintergrund
    backgroundAttributeBonuses: {},   // Schritt 2: Hintergrund
    species: null,                    // Schritt 3: Volk
    lineage: null,                    // Schritt 3: Volk
    ancestry: null,                   // Schritt 3: Volk
    spellcastingAbility_species: null, // Schritt 3: Volk
    feat_species: null,               // Schritt 3: Volk
    strengthTotalScore: null,         // Schritt 4: Attribute
    dexterityTotalScore: null,        // Schritt 4: Attribute
    constitutionTotalScore: null,     // Schritt 4: Attribute
    intelligenceTotalScore: null,     // Schritt 4: Attribute
    wisdomTotalScore: null,           // Schritt 4: Attribute
    charismaTotalScore: null,         // Schritt 4: Attribute
    level: 1,                         // Schritt 5: Stufe
    classForm: null,                  // Schritt 6: Klasse spezialisieren
    featSelections: {},               // Schritt 6: Klasse spezialisieren
    spellcastingAbility_talent: [],   // Schritt 6: Klasse spezialisieren
    spellbookSpells: [],              // Schritt 7: Zauber
    cantrips: [],                     // Schritt 7: Zauber
    spells: [],                       // Schritt 7: Zauber
    favoredSpells: [],                // Schritt 7: Zauber
    purse: { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 },  // Schritt 8: Equipment
    equipment: {                      // Schritt 8: Equipment                                 
        weapons: [],
        armor: [],
        tools: [],
        gear: [],
        vehicles: []
    },
    story: "",     		     // Schritt 9: Charaktergeschichte
    languages: [1],		     // Schritt 9: Charaktergeschichte
    deityId: null,		     // Schritt 9: Charaktergeschichte
    deityName: "",		     // Schritt 9: Charaktergeschichte
    communityName: "",		     // Schritt 9: Charaktergeschichte
    communityDesc: "",		     // Schritt 9: Charaktergeschichte
    alignment: null,                 // Schritt 10: Gesinnung
    personalityTraits: "",           // Schritt 10: Gesinnung
    personalityTraitsHTML: "",       // Schritt 10: Gesinnung (Bunte Anzeige)
    gender: "",                      // Schritt 11: Aussehen                      
    ageLabel: "",                    // Schritt 11: Aussehen                      
    eyeColor: "",                    // Schritt 11: Aussehen                   
    hairColorLabel: "",              // Schritt 11: Aussehen               
    skinToneLabel: "",               // Schritt 11: Aussehen               
    sizeLabel: "",                   // Schritt 11: Aussehen                  
    appearance: "",                  // Schritt 11: Aussehen   
    name: ""			     // Schritt 12: Name
};

//=======================================================================
// Interne Globale Variablen
//=======================================================================
let currentStep = 1;

let strengthScore = null; // Schritt 4
let dexterityScore = null; // Schritt 4
let constitutionScore = null; // Schritt 4
let intelligenceScore = null; // Schritt 4
let wisdomScore = null; // Schritt 4
let charismaScore = null; // Schritt 4

let selectedSkills = [];
let selectedClassName = null; // Globale Variable zum Speichern der gewählten Klasse
let currentExpertises = [];
let lastSavedLevel = null;

// Globale Variablen zur Verfolgung der aktuellen Indizes
let currentSkillIndex; //für skilled
let currentToolIndex; //für skilled
let currentEnergyIndex; //für Elemental Adapt
let currentSpellListIndex; //für Magic Initiate
let currentSpellAbilityIndex; //für Magic Initiate
let currentInstrumentIndex; // für skilled (nur bei Tool-Asuwahl)
let currentGameIndex; // für skilled (nur bei Tool-Asuwahl) 

let tempFeatBackground = null;
let tempToolBackground = null;
let tempInstrumentBackground = null;
let tempGameBackground = null;
let tempBackgroundSpellcasting = null;

let tempFeatSpecies = null;
let tempAncestry = null;
let tempLineage = null;
let tempSpellAbilitySpecies = null; // Generell für Zauberattribut bei Elf, Tiefling, Gnom etc.
let tempSpeciesTalentSpellcasting = null;  // Spezfisch wenn Zauberattribut über talent gewährt wird, wie bei Mensch

// Globale Variablen für Schritt 4
let draggedItem = null;
const standardArray = [15, 14, 13, 12, 10, 8];
let characterAttributes = {};

// Globale Variablen für Schritt 5, passive Klassenmerkmale
let classAttributeBonuses = {};
let classSavingThrowProficiencies = [];

//=======================================================================
// SCHRITT 1: KLASSE
//=======================================================================

// Speichert die gewählte Klasse und wechselt zu Schritt 2
// Speichert die gewählte Klasse und wechselt zu Schritt 2
function saveClass() {
    const selectedClass = document.querySelector('input[name="class"]:checked');
    if (!selectedClass) {
        alert(translations[currentLang].selectClassAlert);
        return;
    }

    const newClassName = selectedClass.value;

    // --- RESET-CHECK ---
    // Wenn schon eine Klasse gewählt war UND sie sich von der neuen unterscheidet:
    if (character.class && character.class !== newClassName) {
        resetEquipmentData();
        
        // Optional: Auch Subklasse leeren, da diese nicht mehr zur Klasse passt
        character.classForm = {}; 
        resetDynamicSubclassContent(); // UI für Subklasse zurücksetzen
    }

    character.class = newClassName;
    console.log(`Class saved: ${character.class}`); 
    
    updateInfoBoxContent(character.class);
    updateProgress();
    resetSubclassUI();
    goToStep(2);
}

// Zeigt den Text der gewählten Klasse an
function showClassText(className) {
    document.querySelectorAll(".classText").forEach(text => {
        text.style.display = "none";  // Alle Texte unsichtbar machen
    });
    const selectedText = document.getElementById(className + "Text");
    const classTextContainer = document.getElementById("classTextContainer");
    if (selectedText) {
        selectedText.style.display = "block";  // Den Text anzeigen
        classTextContainer.style.display = "block"; // Den Textcontainer sichtbar machen
    } else {
        classTextContainer.style.display = "none"; // Wenn kein Text vorhanden, Textcontainer verstecken
    }
}

// Funktion zur Anzeige des Klassensymbols
function showClassSymbol(className) {
   const symbolPath = "images/" + className.toLowerCase() + "Symbol.png";
    const classSymbolElement = document.getElementById("classSymbolImage");
    const classSymbolContainer = document.getElementById("classSymbolContainer");

    classSymbolElement.src = symbolPath;
    classSymbolElement.onerror = function() {
        classSymbolElement.src = "images/defaultSymbol.png"; 
    };
    classSymbolContainer.style.display = "block"; // Sicherstellen, dass der Container sichtbar ist
}

function toggleClassDetails() {
    const classDetailsContainer = document.getElementById("classDetailsContainer");
    const toggleText = document.getElementById("toggleText");

    if (classDetailsContainer.style.display === "none") {
        classDetailsContainer.style.display = "block";
        toggleText.style.display = "none";
    } else {
        classDetailsContainer.style.display = "none";
        toggleText.style.display = "block";
    }
}

// Funktion zur Anzeige der Klassen-Details
function showClassDetails(className) {
    const classDetailsContainer = document.getElementById("classDetailsContainer");
    const classDetailsContent = document.getElementById("classDetailsContent");

    const elements = translations[currentLang]; // Zugriff auf Übersetzungen für die aktuelle Sprache
    const classData = classCoreTraitsList.find(cls => cls.translationLabel.toLowerCase() === className.toLowerCase());

    if (!classData) {
        classDetailsContainer.style.display = "none";
        return;
    }

    let detailsClassHTML = "";

    // Allgemeine Methode für alle Spalten
    const processValue = (value, list, translationKey = "translationLabel") => {
        if (Array.isArray(value)) {
            return value.map(v => {
                const item = list.find(item => item[`${Object.keys(list[0])[0]}`] === v);
                return item ? elements[item[translationKey]] || item[translationKey] : elements[v] || v;
            }).join(", ");
        } else {
            const item = list.find(item => item[`${Object.keys(list[0])[0]}`] === value);
            return item ? elements[item[translationKey]] || item[translationKey] : elements[value] || value;
        }
    };

    // Primary Ability
    detailsClassHTML += `<p><strong>${elements.primaryAbilityLabel}:</strong> ${processValue(classData.primaryAbility, [])}</p>`;
    detailsClassHTML += `<p><strong>${elements.hitPointDieLabel}:</strong> ${classData.hitPointDie}</p>`;
    detailsClassHTML += `<p><strong>${elements.savingThrowAttrLabel}:</strong> ${processValue(classData.savingThrowProficiencies, [])}</p>`;

    if (classData.spellcastingLabel === 1) {
        detailsClassHTML += `<p><strong>${elements.spellcasterLabel}</strong></p>`;
        detailsClassHTML += `<p><strong>${elements.spellcastingAbilityLabel}:</strong> ${processValue(classData.spellcastingAbility, [])}</p>`;
        detailsClassHTML += `<p><strong>${elements.spellcastingFocusLabel}:</strong> ${processValue(classData.spellcastingFocus, [])}</p>`;
    }

    // Weapon Categories
    const weaponCategoriesList = classData.weaponCategoryNumber.map(wcNum => {
        const category = weaponCategory.find(cat => cat.weaponCategoryNumber === wcNum);
        return category ? `<li>${elements[category.translationLabel] || category.translationLabel}</li>` : `<li>${wcNum} (nicht gefunden)</li>`;
    }).join("");
    detailsClassHTML += `<p><strong>${elements.weaponCategoryLabel}:</strong></p><ul>${weaponCategoriesList}</ul>`;

    // Weapon Properties
    const weaponProperties = Array.isArray(classData.weaponPropertyCategoryNumber)
        ? classData.weaponPropertyCategoryNumber
        : [classData.weaponPropertyCategoryNumber];
    const weaponPropertiesList = weaponProperties.map(wpNum => {
        const property = weaponProperty.find(prop => prop.weaponPropertyCategoryNumber === wpNum);
        return property ? `<li>${elements[property.translationLabel] || property.translationLabel}</li>` : `<li>${wpNum} (nicht gefunden)</li>`;
    }).join("");
    detailsClassHTML += `<p><strong>${elements.weaponPropertyLabel}:</strong></p><ul>${weaponPropertiesList}</ul>`;

    // Armor Categories
    const armorCategoriesList = classData.armorCategoryNumber === 0
        ? `<li>${elements.noneLabel}</li>`
        : Array.isArray(classData.armorCategoryNumber)
            ? classData.armorCategoryNumber.map(acNum => {
                const category = armorCategory.find(cat => cat.armorCategoryNumber === acNum);
                return category ? `<li>${elements[category.translationLabel] || category.translationLabel}</li>` : `<li>${acNum} (nicht gefunden)</li>`;
            }).join("")
            : (() => {
                const category = armorCategory.find(cat => cat.armorCategoryNumber === classData.armorCategoryNumber);
                return category ? `<li>${elements[category.translationLabel] || category.translationLabel}</li>` : `<li>${classData.armorCategoryNumber} (nicht gefunden)</li>`;
            })();
    detailsClassHTML += `<p><strong>${elements.armorCategoryLabel}:</strong></p><ul>${armorCategoriesList}</ul>`;

    if (classData.toolLabel !== 0) {
        const toolList = Array.isArray(classData.toolLabel)
            ? classData.toolLabel.map(tool => `<li>${elements[tool] || tool}</li>`).join("")
            : `<li>${elements[classData.toolLabel] || classData.toolLabel}</li>`;
        detailsClassHTML += `<p><strong>${elements.toolLabel}:</strong></p><ul>${toolList}</ul>`;
    }

    classDetailsContent.innerHTML = detailsClassHTML;
    classDetailsContainer.style.display = "block";
}

// Zeigt das Bild der gewählten Klasse an
function showClassImage(className) {
    const imagePath = "images/" + className + ".png"; 
    const classImageElement = document.getElementById("classImage");
    classImageContainer.style.display = "block";
    classImageElement.style.display = "block";
    classImageElement.src = imagePath;
    classImageElement.onerror = function() {
        classImageElement.src = "images/default.png"; 
    };
}

// Hilfsfunktion, um die Klassendaten basierend auf dem Klassennamen zu erhalten
function getClassData(className, type = "class") {
    let classData, subclassData;

    switch (className) {
        case "barbarian":
            classData = barbarianClassData;
            subclassData = subclassListBarbarian;
            break;
        case "bard":
            classData = bardClassData;
            subclassData = subclassListBard;
            break;
        case "cleric":
            classData = clericClassData;
            subclassData = subclassListCleric;
            break;
        case "druid":
            classData = druidClassData;
            subclassData = subclassListDruid;
            break;
        case "fighter":
            classData = fighterClassData;
            subclassData = subclassListFighter;
            break;
        case "monk":
            classData = monkClassData;
            subclassData = subclassListMonk;
            break;
        case "paladin":
            classData = paladinClassData;
            subclassData = subclassListPaladin;
            break;
        case "ranger":
            classData = rangerClassData;
            subclassData = subclassListRanger;
            break;
        case "rogue":
            classData = rogueClassData;
            subclassData = subclassListRogue;
            break;
        case "sorcerer":
            classData = sorcererClassData;
            subclassData = subclassListSorcerer;
            break;
        case "warlock":
            classData = warlockClassData;
            subclassData = subclassListWarlock;
            break;
        case "wizard":
            classData = wizardClassData;
            subclassData = subclassListWizard;
            break;
        // Weitere Klassen hinzufügen
        default:
            console.error("Data not found for class", className);
            return null;
    }

    if (type === "class") {
        return classData;
    } else if (type === "subclass") {
        return subclassData;
    } else {
        console.error("Invalid type specified for getClassData");
        return null;
    }
}

//=======================================================================
// SCHRITT 2: HINTERGRUND
//=======================================================================

// Speichert den gewählten Hintergrund und wechselt zum nächsten Schritt
function saveBackground() {
    const selectedBackground = document.querySelector('input[name="background"]:checked');
    if (!selectedBackground) {
        alert(translations[currentLang].selectBackgroundAlert);
        return;
    }
    
    const newBackgroundName = selectedBackground.value;

    // --- RESET-CHECK ---
    if (character.background && character.background !== newBackgroundName) {
        resetEquipmentData();
    }
    // ------------------------

    // 1. Hintergrund-Namen speichern
    character.background = newBackgroundName;
    console.log(`Background saved: ${character.background}`); 

    // --- Festes Werkzeug automatisch ermitteln ---
    
    // Wir suchen den Hintergrund in der Liste (unabhängig von Groß-/Kleinschreibung)
    const searchString = character.background.trim().toLowerCase();
    const bgData = backgroundList.find(bg => 
        bg.translationLabel.trim().toLowerCase() === searchString
    );

    // Wenn Hintergrund gefunden wurde UND keine Auswahl nötig ist (createOptions == 0) UND ein Tool definiert ist
    if (bgData && bgData.createOptions == 0 && bgData.bgToolProf) {
        // Das passende Tool in der toolList suchen
        const fixedTool = toolList.find(t => t.translationLabel.trim() === bgData.bgToolProf.trim());
        
        if (fixedTool) {
            // Wir setzen tempToolBackground auf die ID des festen Tools
            tempToolBackground = fixedTool.ID;
        }
    }
    // ---------------------------------------------

    // 2. Attribute Boni speichern
    character.backgroundAttributeBonuses = {};
    const pointInputs = document.querySelectorAll('.background-attribute-points');
    pointInputs.forEach(input => {
        const attributeId = input.id.replace('bg-attr-', '');
        const value = parseInt(input.value, 10);
        if (value > 0) {
            character.backgroundAttributeBonuses[attributeId + 'Label'] = value;
        }
    });

    // 3. Feats und Tools final in das character-Objekt speichern
    character.feat_background = tempFeatBackground;

    tempBackgroundSpellcasting = null; // Erstmal nullen

    const bgFeatSelect = document.getElementById('backgroundFeatDropdown');
    if (bgFeatSelect) {
        const featID = parseInt(bgFeatSelect.value, 10);
        const featData = featList.find(f => f.ID === featID);

        // Prüfen, ob es Magic Initiate ist (nur dieses hat im Hintergrund Spell-Optionen)
        if (featData && featData.translationLabel === "magicInitiateLabel") {
            const parent = bgFeatSelect.parentNode;
            const abilityDropdown = parent.querySelector('select[id^="spellAbility"]');
            const listDropdown = parent.querySelector('select[id^="spellList"]');

            if (abilityDropdown?.value && listDropdown?.value) {
                const attr = attributeList.find(a => a.ID == abilityDropdown.value);
                const classObj = classCoreTraitsList.find(c => c.ID == listDropdown.value);

                if (attr && classObj) {
                    tempBackgroundSpellcasting = {
                        talent: "magicInitiateLabel",
                        ability: attr.translationLabel,
                        spellList: classObj.translationLabel
                    };
                }
            }
        }
    }
    
    // Hier wird nun entweder die User-Auswahl (aus Dropdown) ODER das oben ermittelte feste Tool gespeichert
    character.tool_background = tempToolBackground; 
    
    character.instrument_background = tempInstrumentBackground;
    character.game_background = tempGameBackground;

    console.log(`Gespeicherte Werte - Feat: ${character.feat_background}, Tool: ${character.tool_background}, Instrument: ${character.instrument_background}, Game: ${character.game_background}`);

    updateProgress();
    goToStep(3);
}

// Zeigt den Text des gewählten Hintergrunds an
function showBackgroundText(backgroundName) {
    document.querySelectorAll(".backgroundText").forEach(text => {
        text.style.display = "none";  // Alle Texte unsichtbar machen
    });
    const selectedText = document.getElementById(backgroundName + "Text");
    const backgroundTextContainer = document.getElementById("backgroundTextContainer");
    if (selectedText) {
        selectedText.style.display = "block";  // Den Text anzeigen
        backgroundTextContainer.style.display = "block"; // Den Textcontainer sichtbar machen
    } else {
        backgroundTextContainer.style.display = "none"; // Wenn kein Text vorhanden, Textcontainer verstecken
    }
}

// Validiert die Punkteverteilung für Hintergrundattribute
function updateAttributePoints(event) {
    const inputs = Array.from(document.querySelectorAll('.background-attribute-points'));
    const remainingPointsEl = document.getElementById('attributePointsRemaining');
    const changedInput = event.target;
    
    let totalPoints = 0;

    // Gesamtsumme berechnen
    inputs.forEach(input => {
        let value = parseInt(input.value, 10);
        if (isNaN(value) || value < 0) {
            value = 0;
            input.value = 0;
        }
        if (value > 2) {
            value = 2;
            input.value = 2;
        }
        totalPoints += value;
    });

    // Verhindern, dass die Gesamtsumme 3 übersteigt
    if (totalPoints > 3) {
        const overage = totalPoints - 3;
        const currentValue = parseInt(changedInput.value, 10);
        changedInput.value = currentValue - overage;
        totalPoints = 3; // Total neu setzen
    }
    
    // Anzeige der verbleibenden Punkte aktualisieren
    if(remainingPointsEl) {
        const remaining = 3 - totalPoints;
        remainingPointsEl.textContent = remaining;
        // Visuelles Feedback, wenn nicht alle Punkte verteilt wurden
        remainingPointsEl.style.color = (remaining === 0) ? '#e8d8b5' : 'orange';
    }
    updateBackgroundBonuses();
    updateLiveAttributes();
}

function updateBackgroundBonuses() {
    character.backgroundAttributeBonuses = {};
    const pointInputs = document.querySelectorAll('.background-attribute-points');
    pointInputs.forEach(input => {
        const attributeId = input.id.replace('bg-attr-', '');
        const value = parseInt(input.value, 10);
        if (value > 0) {
            character.backgroundAttributeBonuses[attributeId + 'Label'] = value;
        }
    });
}

function updateAttributeBonusesInStep4() {
    // Überprüfen, ob der Container für Schritt 4 bereits initialisiert wurde
    if (!document.getElementById('attributeScoresContainer').hasChildNodes()) {
        return; 
    }
    
    console.log("Aktualisiere Attribut-Boni in Schritt 4...");

    // Setze zuerst alle Boni auf 0, falls der Benutzer sie in Schritt 2 entfernt hat
    attributeList.forEach(attr => {
         const stringId = attr.translationLabel.replace('Label', '');
         document.getElementById(`${stringId}Bonus`).value = 0;
    });

    // Wende die aktuell im Character-Objekt gespeicherten Boni an
    for (const attrLabel in character.backgroundAttributeBonuses) {
        const bonusValue = character.backgroundAttributeBonuses[attrLabel];
        const stringId = attrLabel.replace('Label', '');
        const bonusInput = document.getElementById(`${stringId}Bonus`);
        if (bonusInput) {
            bonusInput.value = bonusValue;
        }
    }

    // Aktualisiere die Gesamtwerte für alle Attribute
    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace('Label', '');
        updateTotalScore(stringId);
    });
}

function updateBackgroundDetails(backgroundName) {

    // Setze das Hintergrundbild für die Seite
    setPageBackground(backgroundName);
    
    // Boni zurücksetzen, wenn ein neuer Hintergrund gewählt wird
    character.backgroundAttributeBonuses = {};
    updateLiveAttributes();

    const backgroundDetailsContainer = document.getElementById("backgroundDetailsContainer");
    const backgroundDetailsContent = document.getElementById("backgroundDetailsContent");

    const elements = translations[currentLang]; // Zugriff auf Übersetzungen für die aktuelle Sprache
    const backgroundData = backgroundList.find(bg => bg.translationLabel.toLowerCase() === backgroundName.toLowerCase());

    if (!backgroundData) {
        backgroundDetailsContainer.style.display = "none";
        return;
    }

    let detailsBgHTML = "";

    // --- Attributs-Punktevergabe ---
    const abilities = backgroundData.bgAbilityScores;
    detailsBgHTML += `
        <div class="attribute-point-allocation">
            <div class="attribute-point-header">
                <span class="dropdownLabel">${elements.abilitiesLabel}:</span>
                <span class="points-tracker">
                    ${elements.attributePointsLabel || 'Verbleibende Punkte'}: <span id="attributePointsRemaining">3</span>
                </span>
            </div>
    `;
    abilities.forEach(abilityLabel => {
        const attributeName = elements[abilityLabel] || abilityLabel.replace('Label', '');
        const attributeId = abilityLabel.replace('Label', '');
        detailsBgHTML += `
            <div class="attribute-point-row">
                <label for="bg-attr-${attributeId}">${attributeName}</label>
                <input type="number" id="bg-attr-${attributeId}" class="background-attribute-points" min="0" max="2" value="0" oninput="updateAttributePoints(event)">
            </div>
        `;
    });
    detailsBgHTML += `</div>`;


    // Dropdowns für Skills: Immer für skill65 und skill66
    const skills = Array.isArray(backgroundData.bgSkillProf) ? backgroundData.bgSkillProf : [backgroundData.bgSkillProf];
    const skillDropdowns = `
    <label for="skill65">
        <span class="dropdownLabel">${elements.skillProfAbbr}:</span>
    </label>
    <select id="skill65" name="skill65" class="dropdown" disabled>
        ${createSkillOptions([skills[0]])}
    </select>
    <select id="skill66" name="skill66" class="dropdown" disabled>
        ${createSkillOptions([skills[1]])}
    </select>
`;

    console.log(`Skill65 ausgewählt: ${skills[0]}`);
    console.log(`Skill66 ausgewählt: ${skills[1]}`);

    detailsBgHTML += skillDropdowns;

    // --- Dropdown für Feat ---
    const backgroundFeatLabel = backgroundData.bgFeat; // z.B. "magicInitiateLabel"
    const featForBackground = featList.find(feat => feat.translationLabel === backgroundFeatLabel);

    let featDropdownHTML = "";
    if (featForBackground) {
        const featCategoryForBackground = [featForBackground.featCategoryNumber]; // Kategorie des spezifischen Talents
        const characterLevelForBackgroundFeat = 1; // Oder character.level, falls schon gesetzt

        featDropdownHTML = `
        <label>
            <span class="dropdownLabel">${elements.featLabel}:</span>
            <select id="backgroundFeatDropdown" name="feat" class="dropdown" disabled>
                ${createFeatOptions(characterLevelForBackgroundFeat, featCategoryForBackground, backgroundFeatLabel)}
            </select>
        </label>
        `;
    } else {
        featDropdownHTML = `<p><span class="dropdownLabel">${elements.featLabel}:</span> ${elements[backgroundFeatLabel] || backgroundFeatLabel} (Feat nicht in Liste gefunden oder Konfigurationsfehler)</p>`;
        console.warn(`Feat "${backgroundFeatLabel}" für Hintergrund "${backgroundName}" nicht in featList gefunden.`);
    }
    detailsBgHTML += featDropdownHTML;

    // Füge den allgemeinen Absatz einmal hinzu
    const tools = Array.isArray(backgroundData.bgToolProf) ? backgroundData.bgToolProf.map(tool => elements[tool] || tool).join(", ") : elements[backgroundData.bgToolProf] || backgroundData.bgToolProf;
    detailsBgHTML += `<p style="margin-bottom: 2px;"><span class="dropdownLabel">${elements.toolLabel}:</span> ${tools}</p>`;

    // Dynamische Dropdowns basierend auf Tools
    if (backgroundData.bgToolProf === "artisansToolsLabel") {
        detailsBgHTML += `
        <label for="toolBackground">${elements.chooseOptionLabel}:</label>
        <select id="toolBackground" name="toolBackground" class="dropdown" style="margin-top: 2px;" onchange="tempToolBackground = this.value;">
            <option value="">${elements.pleaseSelectLabel}</option>
            ${createToolOptions([1, 3])}
        </select>`;
    }

    if (backgroundData.bgToolProf === "musicalInstrumentLabel") {
        detailsBgHTML += `
        <label for="instrumentBackground">${elements.chooseOptionLabel}:</label>
        <select id="instrumentBackground" name="instrumentBackground" class="dropdown" style="margin-top: 2px;" onchange="tempInstrumentBackground = this.value;">
            <option value="">${elements.pleaseSelectLabel}</option>
            ${createInstrumentOptions()}
        </select>`;
    }

    if (backgroundData.bgToolProf === "gamingSetLabel") {
        detailsBgHTML += `
        <label for="gameBackground">${elements.chooseOptionLabel}:</label>
        <select id="gameBackground" name="gameBackground" class="dropdown" style="margin-top: 2px;" onchange="tempGameBackground = this.value;">
            <option value="">${elements.pleaseSelectLabel}</option>
            ${createGameOptions()}
        </select>`;
    }

    backgroundDetailsContent.innerHTML = detailsBgHTML;
    backgroundDetailsContainer.style.display = "block";
    
    // ---- SUB-OPTIONEN FÜR HINTERGRUND-TALENT ERSTELLEN ----
    if (featForBackground) {
        const selectedFeatID = parseInt(featForBackground.ID, 10);

        // Speichere das Feat immer, unabhängig davon, ob es Optionen bietet
        tempFeatBackground = selectedFeatID;
        console.log(`Hintergrund-Talent "${featForBackground.translationLabel}" (ID: ${selectedFeatID}) wurde ausgewählt.`);

        // Wenn das Talent Optionen bietet, rufe die entsprechende Funktion auf
        if (featForBackground.takeChoice && featForBackground.takeChoice > 0) {
            const backgroundFeatDropdownElement = document.getElementById('backgroundFeatDropdown');
            if (backgroundFeatDropdownElement) {
                const featLevel = 1;
                updateFeatDynamicContent(selectedFeatID, featLevel, backgroundFeatDropdownElement);
                // console.log(`Hintergrund-Talent "${featForBackground.translationLabel}" (ID: ${selectedFeatID}) hat takeChoice. Rufe updateFeatDynamicContent.`);

                // --- NEU: FIXIERUNG DER ZAUBERLISTE FÜR SPEZIFISCHE HINTERGRÜNDE ---
                const bgLower = backgroundName.toLowerCase();
                const fixedLists = {
                    "acolyte": 3,  // Cleric
                    "guide": 4,    // Druid
                    "sage": 12     // Wizard
                };

                if (featForBackground.translationLabel === "magicInitiateLabel" && fixedLists[bgLower]) {
                    // Wir warten kurz, bis updateFeatDynamicContent die Dropdowns erzeugt hat
                    setTimeout(() => {
                        const listDropdown = backgroundFeatDropdownElement.parentNode.querySelector('select[id^="spellList"]');
                        if (listDropdown) {
                            listDropdown.value = fixedLists[bgLower];
                            listDropdown.disabled = true; // Auswahl sperren
                            // Event triggern, falls andere Logiken darauf lauschen
                            listDropdown.dispatchEvent(new Event('change'));
                        }
                    }, 10);
                }
            }
        } else {
            // Keine Optionen: Logge dies für Debugging-Zwecke
            // console.log(`Hintergrund-Talent "${featForBackground.translationLabel}" hat keine Optionen. Es wird direkt gespeichert.`);
        }
    } else {
        console.warn(`Feat "${backgroundFeatLabel}" für Hintergrund "${backgroundName}" nicht in featList gefunden.`);
    }
}

function setPageBackground(backgroundName) {
    const root = document.documentElement; 

    if (backgroundName) {
        const imageUrl = `url('../images/${backgroundName.toLowerCase()}.png')`;
        root.style.setProperty('--page-background-image', imageUrl);
    } else {
        root.style.setProperty('--page-background-image', 'none');
    }
}

function fadePageBackground(isFaded) {
    const root = document.documentElement;
    if (isFaded) {
        root.style.setProperty('--page-background-opacity', '0.1'); // Sehr transparent
    } else {
        root.style.setProperty('--page-background-opacity', '1'); // Voll sichtbar
    }
}

// Event Listener für die Radio-Buttons hinzufügen
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[name="background"]').forEach(input => {
        input.addEventListener('change', () => {
        tempToolBackground = null;
        tempInstrumentBackground = null;
        tempGameBackground = null;
        });
    });
});

//=======================================================================
// SCHRITT 3: VOLK
//=======================================================================

// Speichert die gewählte Species und wechselt zum nächsten Schritt
function saveSpecies() {
    const selectedSpecies = document.querySelector('input[name="species"]:checked');
    if (!selectedSpecies) {
        alert(translations[currentLang].selectSpeciesAlert);
        return;
    }

    character.species = selectedSpecies.value;

    character.lineage = tempLineage;
    console.log(`lineage gespeichert: ${character.lineage}`); // Konsolenausgabe

    character.spellcastingAbility_species = tempSpellAbilitySpecies;
    console.log(`spellcasting ability (lineage) gespeichert: ${character.spellcastingAbility_species}`); // Konsolenausgabe

    character.ancestry = tempAncestry;
    console.log(`ancestry gespeichert: ${character.ancestry}`); // Konsolenausgabe

    character.feat_species = tempFeatSpecies;
    console.log(`feat_species gespeichert: ${character.feat_species}`); // Konsolenausgabe

    // --- Talent-Wahl (z.B. Magic Initiate) auslesen ---
    tempSpeciesTalentSpellcasting = null; // Reset

    const versatileSelect = document.getElementById('versatileDropdown');
    if (versatileSelect) {
        const featID = parseInt(versatileSelect.value, 10);
        const featData = featList.find(f => f.ID === featID);

        // Prüfen, ob das gewählte Talent "Magiebegabt" ist
        if (featData && featData.translationLabel === "magicInitiateLabel") {
            const parent = versatileSelect.parentNode;
            const abilityDropdown = parent.querySelector('select[id^="spellAbility"]');
            const listDropdown = parent.querySelector('select[id^="spellList"]');

            if (abilityDropdown?.value && listDropdown?.value) {
                const attr = attributeList.find(a => a.ID == abilityDropdown.value);
                const classObj = classCoreTraitsList.find(c => c.ID == listDropdown.value);

                if (attr && classObj) {
                    tempSpeciesTalentSpellcasting = {
                        talent: "magicInitiateLabel",
                        ability: attr.translationLabel,
                        spellList: classObj.translationLabel
                    };
                }
            }
        }
    }

    console.log(`Species saved: ${character.species}`); // Debugging-Log
    updateProgress();
    goToStep(4);
}

// Zeigt den Text des gewählten Volkes an
function showSpeciesDLabel(speciesName) {
    document.querySelectorAll(".speciesDLabel").forEach(text => {
        text.style.display = "none";  // Alle Texte unsichtbar machen
    });
    const selectedText = document.getElementById(speciesName + "D");
    const speciesTextContainer = document.getElementById("speciesTextContainer");
    if (selectedText) {
        selectedText.style.display = "block";  // Den Text anzeigen
        speciesTextContainer.style.display = "block"; // Den Textcontainer sichtbar machen
    } else {
        speciesTextContainer.style.display = "none"; // Wenn kein Text vorhanden, Textcontainer verstecken
    }
}

function updateSpeciesInfoBoxContent() {
    const selectedSpeciesInput = document.querySelector('input[name="species"]:checked');
    const elements = translations[currentLang];
    const infoBoxContent = document.getElementById("infoBoxContentStep3");

    if (!infoBoxContent) {
        console.error("InfoBoxStep3 elements not found");
        return;
    }
    infoBoxContent.innerHTML = ""; // Alten Inhalt leeren

    if (!selectedSpeciesInput) {
        infoBoxContent.innerHTML = `<p>${elements.selectSpeciesFirst || 'Bitte wähle zuerst ein Volk aus.'}</p>`;
        return;
    }

    const speciesValue = selectedSpeciesInput.value; // z.B. "Aasimar"
    const speciesData = speciesList.find(s => s.translationLabel.toLowerCase().startsWith(speciesValue.toLowerCase()));

    if (!speciesData) {
        console.error("Species data not found for:", speciesValue);
        infoBoxContent.innerHTML = `<p>${elements.speciesDataNotFound || 'Daten für dieses Volk nicht gefunden.'}</p>`;
        return;
    }

    const speciesDisplayName = elements[speciesData.translationLabel] || speciesValue;

    let traitsFound = false;
    if (speciesData.speciesTraitLabel && speciesData.speciesTraitLabel.length > 0) {
        speciesData.speciesTraitLabel.forEach(traitLabelKey => {
            const trait = speciesTraitList.find(t => t.speciesTraitLabel === traitLabelKey);
            if (trait) {
                const traitName = elements[trait.speciesTraitLabel] || trait.speciesTraitLabel.replace(/Label$/, '');
                const traitDescription = trait.speciesTraitShortDLabel ? (elements[trait.speciesTraitShortDLabel] || trait.speciesTraitShortDLabel.replace(/D$/, '')) : (elements.noDescriptionAvailable || "Keine Beschreibung verfügbar.");

                if (traitName) {
                    infoBoxContent.innerHTML += `
                        <p><strong>${traitName}:</strong> <span>${traitDescription}</span></p>
                    `;
                    traitsFound = true;
                }
            } else {
                console.warn("Trait data not found for label:", traitLabelKey);
            }
        });
    }

    if (!traitsFound) {
        infoBoxContent.innerHTML = `<p>${elements.noSpeciesTraits || 'Für dieses Volk sind keine spezifischen Merkmale für die Infobox hinterlegt.'}</p>`;
    }
}

function showSpeciesTraits(speciesValue) {
    const traitsContainer = document.getElementById("speciesTraitsContainer");
    const traitsContent = document.getElementById("speciesTraitsContent");

    if (!traitsContainer || !traitsContent) {
        console.error("Traits Container or Traits Content not found.");
        return;
    }

    const speciesTranslationLabel = speciesValue.charAt(0).toLowerCase() + speciesValue.slice(1) + "Label";

    const species = speciesList.find(species => species.translationLabel === speciesTranslationLabel);
    if (!species) {
        console.error("Species not found for Value:", speciesValue);
        return;
    }

    const elements = translations[currentLang];

    const sizeTranslation = (Array.isArray(species.size) ? species.size.map(size => elements[size] || size).join(", ") : elements[species.size] || species.size);
    const speed = currentLang === 'de' ? `${Math.round(species.speedFT * 0.3048)} m` : `${species.speedFT} ft`;

    let traitsHTML = `
        <p><strong>${elements.sizeCategoryLabel}:</strong> ${sizeTranslation}</p>
        <p><strong>${elements.speedLabel}:</strong> ${speed}</p>
        <ul>
    `;

    const specialTraits = ["keenSensesLabel", "skillfulLabel", "versatileLabel"];

    species.speciesTraitLabel.forEach(traitLabel => {
        const trait = speciesTraitList.find(trait => trait.speciesTraitLabel === traitLabel);
        if (trait) {
            if (!specialTraits.includes(traitLabel)) {
                const traitName = elements[trait.speciesTraitLabel] || trait.speciesTraitLabel;
                traitsHTML += `<li>${traitName}</li>`;
            }

            const ancestries = ancestryList.filter(ancestry => ancestry.species === speciesTranslationLabel && ancestry.speciesTraitLabel === traitLabel);
            if (ancestries.length > 0) {
                traitsHTML += `<div class="radio-container" style="display: flex; flex-wrap: wrap; justify-content: center;">`;
                ancestries.forEach(ancestry => {
                    const ancestryName = elements[ancestry.ancestryLabel] || ancestry.ancestryLabel;
                    const ancestryID = ancestry.ancestryLabel.toLowerCase().replace(/\s/g, '-');
                    traitsHTML += `
                        <div style="flex: 1 1 45%; margin-bottom: 5px; margin-top: 5px;">
                            <input type="radio" id="${ancestryID}" name="${traitLabel}" value="${ancestry.ancestryLabel}" onclick="
                                tempAncestry = '${ancestry.ancestryLabel}'; 
                                const ancestryInfoElement = document.getElementById('${traitLabel}-info');
                                ancestryInfoElement.innerHTML = '${traitLabel === 'draconicAncestryLabel' ? `${elements.damageTypeLabel}: ${elements[ancestry.damageType] || ancestry.damageType}` : elements[ancestry.ancestryDLabel] || ancestry.ancestryDLabel}';
                            ">
                            <label for="${ancestryID}">${ancestryName}</label>
                        </div>
                    `;
                });
                traitsHTML += `</div>`;
                traitsHTML += `<div id="${traitLabel}-info" class="ancestry-info" style="text-align: center; margin-top: 10px; margin-bottom: 15px; transform: translateX(-22%); width: 120%;"></div>`;
            }

            const lineages = lineageList.filter(lineage => lineage.species === speciesTranslationLabel && lineage.speciesTraitLabel === traitLabel && lineage.level === 1);
            if (lineages.length > 0) {
                traitsHTML += `<div class="lineage-container" style="margin-top: 10px;">`;
                lineages.forEach(lineage => {
                    const lineageName = elements[lineage.lineageLabel] || lineage.lineageLabel;
                    const lineageID = lineage.lineageLabel.toLowerCase().replace(/\s/g, '-');
                    traitsHTML += `
                        <div style="margin-bottom: 10px;">
                            <input type="radio" id="${lineageID}" name="${traitLabel}-lineage" value="${lineage.lineageLabel}" onclick="
                                tempLineage = '${lineage.lineageLabel}';
                                showLineageDetails('${lineage.lineageLabel}');
                            ">
                            <label for="${lineageID}">${lineageName}</label>
                        </div>
                    `;
                });
                traitsHTML += `</div>`;
            }
        }

        if (traitLabel === "keenSensesLabel") {
            const skillOptions = createSkillOptions([7, 12, 18]); // insight, perception, survival
            traitsHTML += `
                <li>${elements.keenSensesLabel} - ${elements.chooseSkillLabel}: 
                    <select id="skill60" class="dropdown">
                        <option value="">${elements.pleaseSelectLabel}</option>
                        ${skillOptions}
                    </select>
                </li>
            `;
        }

        if (traitLabel === "skillfulLabel") {
            const skillOptions = createSkillOptions(skillList.map(skill => skill.skillCategoryNumber));
            traitsHTML += `
                <li>${elements.skillfulLabel} - ${elements.chooseSkillLabel}: 
                    <select id="skill59" class="dropdown">
                        <option value="">${elements.pleaseSelectLabel}</option>
                        ${skillOptions}
                    </select>
                </li>
            `;
        }

        if (traitLabel === "versatileLabel") {
            const originFeatCategory = [1];
            const featOptions = createFeatOptions(1, originFeatCategory);
            traitsHTML += `
                <li>${elements.versatileLabel} - ${elements.chooseFeatLabel}: 
                    <select id="versatileDropdown" class="dropdown" name="feat">
                        <option value="">${elements.pleaseSelectLabel}</option>
                        ${featOptions}
                    </select>
                </li>
            `;
        }
    });

    traitsHTML += `</ul>`;
    traitsContent.innerHTML = traitsHTML;

    const keenSensesDropdown = document.getElementById("skill60");
    if (keenSensesDropdown) {
        keenSensesDropdown.addEventListener('change', function() {
            console.log(`Skill60 ausgewählt: ${keenSensesDropdown.value}`);
            updateSkills();
        });
    }

    const skillfulDropdown = document.getElementById("skill59");
    if (skillfulDropdown) {
        skillfulDropdown.addEventListener('change', function() {
            console.log(`Skill59 ausgewählt: ${skillfulDropdown.value}`);
            updateSkills();
        });
    }

    const versatileDropdown = document.getElementById("versatileDropdown");
    if (versatileDropdown) {
        versatileDropdown.addEventListener('change', function() {
            const selectedFeatID = parseInt(this.value, 10);
            console.log(`Versatile Dropdown geändert: ${selectedFeatID}`);

            if (!isNaN(selectedFeatID)) {
                updateFeatDynamicContent(selectedFeatID, 1, this);
                tempFeatSpecies = selectedFeatID;
            } else {
                tempFeatSpecies = null;
                const existingFeatContent = this.parentNode.querySelector('.feat-content');
                if (existingFeatContent) {
                    existingFeatContent.remove();
                }
            }

            setupFeatSelection();
        });
    }

    traitsContainer.style.display = "block";

    const infoBox1 = document.getElementById('infoBoxStep3');
    if (infoBox1 && infoBox1.style.display === 'block') {
        updateSpeciesInfoBoxContent();
    }
}

function showSpeciesImage(speciesName) {
    const imagePath = `images/${speciesName.toLowerCase()}.png`; // Nutze den korrekten Dateinamen
    const speciesImageBox = document.getElementById("speciesImageBox");

    speciesImageBox.innerHTML = `<img src="${imagePath}" alt="${speciesName} Bild">`;
    speciesImageBox.style.display = "block";
}

function showLineageDetails(lineageLabel) {
    const lineageDetailBox = document.getElementById("lineageDetailBox");
    const lineageImageBox = document.getElementById("lineageImageBox");
    
    if (!lineageDetailBox) return;

    const lineageEntries = lineageList.filter(lineage => lineage.lineageLabel === lineageLabel);
    const lineageLevel1 = lineageEntries.find(lineage => lineage.level === 1);
    
    if (!lineageLevel1) {
        lineageDetailBox.style.display = "none";
        if(lineageImageBox) lineageImageBox.style.display = "none";
        updateLineageUI();
        return;
    }

    const elements = translations[currentLang];
    const title = elements[lineageLevel1.lineageLabel] || lineageLevel1.lineageLabel;
    const description = elements[lineageLevel1.lineageDLabel] || lineageLevel1.lineageDLabel;
    const subspeciesDescription = elements[lineageLevel1.lineageTraitDLabel] || lineageLevel1.lineageTraitDLabel;

    // Tabelle (deine Original-Struktur)
    let tableHTML = `<table style="width: 100%; margin-top: 10px;">
        <thead>
            <tr>
                <th>${elements.levelLabel}</th>
                <th>${elements.progressSpellsLabel}</th>
            </tr>
        </thead>
        <tbody>`;

    lineageEntries.forEach(entry => {
        const spell = Array.isArray(entry.spellLabel) ? 
                      entry.spellLabel.map(spell => elements[spell] || spell).join(', ') : 
                      elements[entry.spellLabel] || entry.spellLabel;
        tableHTML += `<tr><td>${entry.level}</td><td>${spell}</td></tr>`;
    });
    tableHTML += `</tbody></table>`;

    const imagePath = `images/${lineageLabel.toLowerCase()}.png`;

    // 1. TEXT-INHALT (Ohne Bild, mit Klassen für Breakpoints)
    lineageDetailBox.innerHTML = `
        <div style="position: relative;">
            <h3>${title}</h3>
            <div class="lineage-desc"><p>${description}</p></div>
            <h4 class="lineage-traits-header">${elements.subspeciesTraitsLabel}</h4>
            <div class="lineage-sub-desc"><p>${subspeciesDescription}</p></div>
            <div class="lineage-table-container">${tableHTML}</div>
            <div style="text-align: left;">
                <label for="spellAbility" style="margin-top: 20px; display: block;">${elements.spellcastingAbilityLabel} - ${elements.chooseOptionLabel}:</label>
                <select id="spellAbility" class="dropdown" style="width: 150px;">
                    <option value="">${elements.pleaseSelectLabel}</option>
                    ${createSpellAbilityOptions()}
                </select>
            </div>
        </div>
    `;

    // 2. BILD-INHALT (Externer Container)
    if (lineageImageBox) {
        lineageImageBox.innerHTML = `<img src="${imagePath}" alt="${title} Bild">`;
    }

    lineageDetailBox.style.display = "block";
    updateLineageUI(); // Regelt die Exklusivität

    // Eventlistener
    const spellAbilitySelect = document.getElementById("spellAbility");
    if (spellAbilitySelect) {
        spellAbilitySelect.addEventListener('change', function() {
            tempSpellAbilitySpecies = spellAbilitySelect.value;
        });
    }
}

/**
 * Steuert die Exklusivität der UI-Elemente in Schritt 3.
 * Stellt sicher, dass Lineage-Box, Spezies-Bild und Live-Attribute
 * sich nicht gegenseitig überlagern.
 */
function updateLineageUI() {
    const lineageBox = document.getElementById('lineageDetailBox');
    const lineageImg = document.getElementById('lineageImageBox');
    const speciesImg = document.getElementById('speciesImageBox');
    const liveAttrs = document.getElementById('liveAttributesContainer');

    // Aktuelle Schrittnummer ermitteln
    const currentStepEl = document.querySelector(".step[style*='display: block']");
    const stepNumber = currentStepEl ? parseInt(currentStepEl.id.replace('step', ''), 10) : 0;

    const isLineageActive = lineageBox && lineageBox.style.display === 'block';

    if (isLineageActive) {
        if (lineageImg) lineageImg.style.display = 'block';
        if (speciesImg) speciesImg.style.display = 'none';
        if (liveAttrs) liveAttrs.style.display = 'none';
    } else {
        if (lineageImg) lineageImg.style.display = 'none';
        
        // Jetzt funktioniert character.species, weil wir es im Listener sofort setzen
        if (stepNumber === 3 && character.species) {
            if (speciesImg) speciesImg.style.display = 'block';
        } else {
            if (speciesImg) speciesImg.style.display = 'none';
        }
        
        // Live-Attribute nur ab Schritt 5 zeigen
        if (stepNumber >= 5 && liveAttrs) {
            liveAttrs.style.display = 'block';
        }
    }
}

// Event Listener für die Radio-Buttons hinzufügen
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[name="species"]').forEach(input => {
        input.addEventListener('change', () => {
            // 1. WICHTIG: Das Volk SOFORT im character-Objekt speichern
            character.species = input.value; 

            // 2. Basis-Informationen anzeigen
            showSpeciesTraits(input.value);
            updateSkills();
            setupFeatSelection();
            
            // 3. Spezies-Hintergrundbild aktualisieren
            const speciesValue = input.value.toLowerCase();
            showSpeciesImage(speciesValue);
            
            // 4. Lineage-Resets
            tempLineage = null;
            tempAncestry = null;
            tempFeatSpecies = null;
            tempSpellAbilitySpecies = null;
            
            const lineageDetailBox = document.getElementById("lineageDetailBox");
            if (lineageDetailBox) {
                lineageDetailBox.style.display = "none";
            }
            
            const lineageImageBox = document.getElementById("lineageImageBox");
            if (lineageImageBox) {
                lineageImageBox.style.display = "none";
            }

            // 5. Die Regie aufrufen - jetzt weiß sie, welches Volk aktiv ist!
            updateLineageUI();
        });
    });
});

//=======================================================================
// SCHRITT 4: ATTRIBUTE
//=======================================================================

function saveAttributes() {
    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace('Label', '');
        
        // WICHTIG: Wir lesen den Basiswert aus dem entsprechenden Input-Feld
        const baseValue = document.getElementById(`${stringId}Score`).value;
        const score = parseInt(baseValue, 10) || 0;

        // Weise den Wert der korrekten globalen Variable zu
        switch(stringId) {
            case 'strength': strengthScore = score; break;
            case 'dexterity': dexterityScore = score; break;
            case 'constitution': constitutionScore = score; break;
            case 'intelligence': intelligenceScore = score; break;
            case 'wisdom': wisdomScore = score; break;
            case 'charisma': charismaScore = score; break;
        }
        console.log(`Basis-Attribut '${stringId}' gespeichert mit Wert: ${score}`);
    });

    updateProgress(); // Fortschrittsanzeige aktualisieren
    goToStep(5);      // Zum nächsten Schritt gehen
}

function initializeAttributeSetup() {
    const attributeContainer = document.getElementById('attributeScoresContainer');

    if (attributeContainer.firstElementChild) {
        // Wenn der Container bereits ein echtes Element-Kind hat (z.B. eine .attribute-row),
        // wurde die UI bereits gebaut. Beende die Funktion und lasse alles unberührt.
        return;
    }

    attributeContainer.innerHTML = '';

    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace('Label', '');
        const translatedName = translations[currentLang][attr.translationLabel] || attr.translationLabel;

        characterAttributes[stringId] = { score: 8, bonus: 0 };
        
        const row = document.createElement('div');
        row.className = 'attribute-row';
        row.id = `row-${stringId}`;

        // --- GEÄNDERTE HTML-STRUKTUR ---
        // Wir fassen alle interaktiven Teile in einem neuen Wrapper zusammen.
        row.innerHTML = `
            <div class="attribute-label">${translatedName}</div>
            <div class="interactive-elements">
        	<div class="attribute-component">
           	<div class="modifier-circle" id="${stringId}Mod">0</div>
           	<label>${translations[currentLang].modificatorLabel}</label>
       		</div>

                <div class="attribute-component">
                    <input type="number" class="attribute-score-total-input" id="${stringId}TotalScore" readonly>
                    <label>${translations[currentLang].totalScoreLabel || 'Gesamt'}</label>
                </div>
                
                <span class="formula-symbol equals-sign">=</span>

        	<div class="attribute-component">
            	<input type="number" class="attribute-score-input" id="${stringId}Score" readonly>
            	<label>${translations[currentLang].attributeScoreLabel}</label>
        	</div>

        	<div class="attribute-component">
            	<div class="attribute-bonus-input-wrapper">
                	<span>+</span>
                	<input type="number" class="attribute-bonus-input" id="${stringId}Bonus" value="0" readonly>
            	</div>
            		<label>${translations[currentLang].backgroundAttributeBonusLabel}</label>
        	</div>
            </div>
        `;
        attributeContainer.appendChild(row);

        const backgroundBonus = character.backgroundAttributeBonuses[attr.translationLabel] || 0;
        const bonusInput = document.getElementById(`${stringId}Bonus`);
        if (bonusInput) {
            bonusInput.value = backgroundBonus;
        }
    });

    document.querySelectorAll('input[name="attributeMethod"]').forEach(radio => {
        radio.addEventListener('change', handleMethodChange);
    });
    
    document.getElementById('rollAttributesBtn').addEventListener('click', generateRandomScores);
    document.getElementById('standardArray').checked = true;
    handleMethodChange();
}

function handleMethodChange() {
    const selectedMethod = document.querySelector('input[name="attributeMethod"]:checked').value;
    document.getElementById('standardArrayValues').style.display = 'none';
    document.getElementById('randomlyGeneratedValues').style.display = 'none';
    document.getElementById('pointBuyTracker').style.display = 'none';
    resetAttributeScores();
    if (selectedMethod === 'standard') {
        document.getElementById('standardArrayValues').style.display = 'flex';
        setupStandardArray();
    } else if (selectedMethod === 'random') {
        document.getElementById('randomlyGeneratedValues').style.display = 'flex';
        setupRandomGeneration();
    } else if (selectedMethod === 'pointbuy') {
        document.getElementById('pointBuyTracker').style.display = 'block';
        setupPointBuy();
    }
}

function resetAttributeScores() {
    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace('Label', '');
        const scoreInput = document.getElementById(`${stringId}Score`);

        const newScoreInput = scoreInput.cloneNode(true);
        scoreInput.parentNode.replaceChild(newScoreInput, scoreInput);

        newScoreInput.value = '';
        newScoreInput.readOnly = true;

        // KORREKTUR 1: Wir verwenden ".base" für Konsistenz und setzen es auf 0
        characterAttributes[stringId].base = 0;
        
        // KORREKTUR 2: Wir rufen die korrekte Update-Funktion auf
        updateTotalScore(stringId); 
    });

    document.getElementById('standardArrayValues').innerHTML = '';
    const randomValuesContainer = document.getElementById('randomlyGeneratedValues');
    const button = randomValuesContainer.querySelector('button');
    randomValuesContainer.innerHTML = '';
    if (button) {
        randomValuesContainer.appendChild(button);
    }
    updateLiveAttributes();
}

function updateTotalScore(stringId) {
    const baseScoreInput = document.getElementById(`${stringId}Score`);
    const bonusInput = document.getElementById(`${stringId}Bonus`);
    const totalScoreInput = document.getElementById(`${stringId}TotalScore`);

    const baseValue = parseInt(baseScoreInput.value, 10) || 0;
    const bonusValue = parseInt(bonusInput.value, 10) || 0;

    const totalScore = baseValue + bonusValue;
    totalScoreInput.value = totalScore;

    // Jetzt den Modifikator basierend auf dem neuen Gesamtwert aktualisieren
    updateModifier(stringId, totalScore);
}

// --- Drag and Drop Funktionen ---

function dragStart(e) {
    draggedItem = e.target;
    setTimeout(() => e.target.style.display = 'none', 0);
}

function dragEnd(e) {
    setTimeout(() => {
        if (draggedItem) {
           draggedItem.style.display = 'block';
           draggedItem = null;
        }
    }, 0);
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
    if(e.target.classList.contains('attribute-score-input')) {
        e.target.classList.add('drop-target-hover');
    }
}

function dragLeave(e) {
     if(e.target.classList.contains('attribute-score-input')) {
        e.target.classList.remove('drop-target-hover');
    }
}

function drop(e) {
    e.preventDefault();
    if (e.target.classList.contains('attribute-score-input')) {
        e.target.classList.remove('drop-target-hover');
        const sourcePool = draggedItem.parentElement;
        const previousValue = e.target.value;
        e.target.value = draggedItem.textContent;
        const stringId = e.target.id.replace('Score', '');
        
        characterAttributes[stringId].base = parseInt(e.target.value, 10);
        updateTotalScore(stringId);
        
        draggedItem.remove();
        draggedItem = null;
        if (previousValue) {
            createDraggableValue(previousValue, sourcePool.id);
        }
        updateLiveAttributes();
    }
}

/**
 * Erstellt ein ziehbares Werte-Element.
 * @param {number|string} value - Der Wert, der angezeigt wird.
 * @param {string} containerId - Die ID des Containers, dem das Element hinzugefügt wird.
 */
function createDraggableValue(value, containerId) {
    const container = document.getElementById(containerId);
    const valEl = document.createElement('div');
    valEl.className = 'draggable-value';
    valEl.textContent = value;
    valEl.draggable = true;
    valEl.addEventListener('dragstart', dragStart);
    valEl.addEventListener('dragend', dragEnd);
    container.appendChild(valEl);
}

// --- Logik für die einzelnen Methoden ---

function setupStandardArray() {
    const container = document.getElementById('standardArrayValues');
    container.innerHTML = '';
    standardArray.forEach(val => createDraggableValue(val, 'standardArrayValues'));

    attributeList.forEach(attr => {
        // GEÄNDERT: stringId ableiten, um das korrekte Element zu finden
        const stringId = attr.translationLabel.replace('Label', '');
        const scoreInput = document.getElementById(`${stringId}Score`);
        scoreInput.readOnly = true;
        scoreInput.addEventListener('dragover', dragOver);
        scoreInput.addEventListener('dragenter', dragEnter);
        scoreInput.addEventListener('dragleave', dragLeave);
        scoreInput.addEventListener('drop', drop);

    scoreInput.classList.add('highlight-target');
    });
}

function generateRandomScores() {
    const container = document.getElementById('randomlyGeneratedValues');
    container.querySelectorAll('.draggable-value').forEach(el => el.remove());

    for (let i = 0; i < 6; i++) {
        let rolls = [];
        for (let j = 0; j < 4; j++) {
            rolls.push(Math.floor(Math.random() * 6) + 1);
        }
        rolls.sort((a, b) => b - a);
        const sum = rolls[0] + rolls[1] + rolls[2];
        createDraggableValue(sum, 'randomlyGeneratedValues');
    }
}

function setupRandomGeneration() {
    const container = document.getElementById('randomlyGeneratedValues');
    container.querySelectorAll('.draggable-value').forEach(el => el.remove());

    attributeList.forEach(attr => {
        // GEÄNDERT: stringId ableiten, um das korrekte Element zu finden
        const stringId = attr.translationLabel.replace('Label', '');
        const scoreInput = document.getElementById(`${stringId}Score`);
        scoreInput.value = '';
        scoreInput.readOnly = true;
        scoreInput.addEventListener('dragover', dragOver);
        scoreInput.addEventListener('dragenter', dragEnter);
        scoreInput.addEventListener('dragleave', dragLeave);
        scoreInput.addEventListener('drop', drop);

    scoreInput.classList.add('highlight-target');
    });
}

function setupPointBuy() {
    attributeList.forEach(attr => {
        // GEÄNDERT: stringId ableiten, um das korrekte Element zu finden
        const stringId = attr.translationLabel.replace('Label', '');
        const scoreInput = document.getElementById(`${stringId}Score`);
        scoreInput.readOnly = false;
        scoreInput.min = 8;
        scoreInput.max = 15;
        scoreInput.value = 8;
        scoreInput.addEventListener('input', updatePointBuy);

    scoreInput.classList.add('highlight-target');
    });
    updatePointBuy();
}

function updatePointBuy() {
    let totalCost = 0;
    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace('Label', '');
        const scoreInput = document.getElementById(`${stringId}Score`);
        let score = parseInt(scoreInput.value, 10);
        
        if (isNaN(score)) score = 8;
        if (score < 8) score = 8;
        if (score > 15) score = 15;
        scoreInput.value = score;
        
        const costObject = attributeScorePointCosts.find(c => c.score === score);
        if (costObject) {
            totalCost += costObject.cost;
        }
        
        characterAttributes[stringId].base = score;
        updateTotalScore(stringId);
    });
    
    const pointsRemaining = 27 - totalCost;
    const pointsSpan = document.getElementById('pointsRemaining');
    pointsSpan.textContent = pointsRemaining;
    
    if (pointsRemaining < 0) {
        pointsSpan.style.color = 'red';
    } else {
        pointsSpan.style.color = '#e8d8b5';
    }
    updateLiveAttributes();
}

/**
 * Aktualisiert den Modifikator-Kreis basierend auf dem Gesamtwert eines Attributs.
 * @param {string} stringId - Die ID des Attributs (z.B. 'strength').
 * @param {number} totalScore - Der berechnete Gesamtwert (Basis + Bonus).
 */
function updateModifier(stringId, totalScore) {
    // Berechnet den Modifikator mit der Standard-D&D-Formel.
    // Math.floor() rundet das Ergebnis immer ab.
    const modifier = Math.floor((totalScore - 10) / 2);

    // Holt das Anzeige-Element aus dem DOM.
    const modDisplay = document.getElementById(`${stringId}Mod`);

    if (modDisplay) {
        // Prüfen, ob der Modifikator unter dem erlaubten Minimum von -4 liegt.
        // Dies trifft auch auf den Default-Fall (totalScore=0 -> modifier=-5) zu.
        if (modifier < -4) {
            modDisplay.textContent = '?';
        } else {
            // Ihre bestehende Logik für die korrekte Anzeige
            modDisplay.textContent = (modifier >= 0) ? `+${modifier}` : modifier;
        }
    }
}

function initializeLiveAttributes() {
    const container = document.getElementById('liveAttributesContainer');
    if (!container) return;

    const elements = translations[currentLang];
    
    // Header mit Titel und Pfeil
    let contentHTML = `
        <div class="live-attributes-main-header">
            <div id="toggleLiveAttributes" title="Details ein/ausblenden">&#x25C0;</div>
            <h3>${elements.abilityOverviewLabel || 'Attributübersicht'}</h3>
        </div>
    `;

    // Die Kopfzeile für unsere "Tabelle"
    contentHTML += `
        <div class="live-attr-header-row">
            <span class="col-attr">${elements.abilityLabel || 'Attribut'}</span>
            <span class="col-mod">${elements.modifierLabel || 'Mod'}</span>
            <span class="col-total">${elements.totalScoreLabel || 'Gesamt'}</span>
            <span class="col-calc-part col-symbol">=</span>
            <span class="col-calc-part col-base">${elements.basicLabel || 'Grundwert'}</span>
            <span class="col-calc-part col-symbol">+</span>
            <span class="col-calc-part col-feat">${elements.featLabel || 'Talent'}</span>
            <span class="col-calc-part col-symbol">+</span>
            <span class="col-calc-part col-bg">${elements.backgroundLabel || 'Hintergrund'}</span>
            <span class="col-calc-part col-symbol">+</span>
            <span class="col-calc-part col-class">${elements.classLabel || 'Klasse'}</span>
        </div>
    `;

    // Die Datenzeilen für jedes Attribut
    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace('Label', '');
        const translatedName = elements[attr.translationLabel] || attr.translationLabel;

        contentHTML += `
            <div class="live-attr-data-row">
                <div class="col-attr attribute-label-live">${translatedName}</div>
                <div class="col-mod modifier-circle" id="live-${stringId}Mod">?</div>
                <div class="col-total"><input type="number" id="live-${stringId}TotalScore" readonly></div>
                <span class="col-calc-part col-symbol formula-symbol">=</span>
                <div class="col-calc-part col-base"><input type="number" id="live-${stringId}Score" readonly></div>
                <span class="col-calc-part col-symbol formula-symbol">+</span>
                <div class="col-calc-part col-feat"><input type="number" id="live-${stringId}FeatBonus" readonly></div>
                <span class="col-calc-part col-symbol formula-symbol">+</span>
                <div class="col-calc-part col-bg"><input type="number" id="live-${stringId}Bonus" readonly></div>
                <span class="col-calc-part col-symbol formula-symbol">+</span>
                <div class="col-calc-part col-class"><input type="number" id="live-${stringId}ClassBonus" readonly></div>
            </div>
        `;
    });

    container.innerHTML = contentHTML;

    // Event Listener für den Aufklapp-Pfeil
    document.getElementById('toggleLiveAttributes').addEventListener('click', () => {
        container.classList.toggle('expanded');
    });
}

function updateLiveAttributes() {
    const liveContainer = document.getElementById('liveAttributesContainer');
    if (!liveContainer || liveContainer.style.display === 'none') {
        return; 
    }

    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace('Label', '');

    const step4AttributesExist = document.getElementById('strengthScore') !== null;
    const featBonuses = calculateFeatBonuses(); // Hole die aktuellen Talent-Boni
    const classBonus = classAttributeBonuses[stringId] || 0;
        
        let baseScore = 0;
        if (step4AttributesExist) {
            baseScore = parseInt(document.getElementById(`${stringId}Score`).value, 10) || 0;
        }
        
        const backgroundBonus = character.backgroundAttributeBonuses[attr.translationLabel] || 0;
        const featBonus = featBonuses[stringId] || 0; // Verwende den berechneten Bonus
        
        const totalScore = baseScore + backgroundBonus + featBonus + classBonus;

        // Fülle die Felder im Live-Container
        document.getElementById(`live-${stringId}Score`).value = baseScore;
        document.getElementById(`live-${stringId}Bonus`).value = backgroundBonus;
        document.getElementById(`live-${stringId}FeatBonus`).value = featBonus;
        document.getElementById(`live-${stringId}ClassBonus`).value = classBonus;
        document.getElementById(`live-${stringId}TotalScore`).value = totalScore;
        
        const modifier = Math.floor((totalScore - 10) / 2);
        const modDisplay = document.getElementById(`live-${stringId}Mod`);
        if (baseScore === 0 && backgroundBonus === 0 && featBonus === 0) {
             modDisplay.textContent = "?";
        } else {
            modDisplay.textContent = (modifier >= 0) ? `+${modifier}` : modifier;
        }

	// Nach der Berechnung aller Werte rufen wir die Validierung der Talente auf
    	const featDropdowns = document.querySelectorAll('select[name^="feats"], select[id^="feat"]');
    	if (featDropdowns.length > 0) {
            validateFeatSelection(featDropdowns);
    	}
    });
}

function calculateFeatBonuses() {
    const bonuses = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 };
    
    // Gehe durch alle auf der Seite ausgewählten Haupt-Talent-Dropdowns
    document.querySelectorAll('select[name^="feats"]').forEach(featSelect => {
        const featID = parseInt(featSelect.value, 10);
        if (!featID) return;

        const featData = featList.find(f => f.ID === featID);
        if (!featData) return;

        const featContentContainer = featSelect.parentNode.querySelector('.feat-content');
        if (!featContentContainer) return;

        // --- HIER WIRD DIE LOGIK FÜR ALLE TALENT-TYPEN GEBÜNDELT ---

        // 1. Logik für allgemeine "+1"-Talente (mit Dropdown-Auswahl)
        const abilityDropdown = featContentContainer.querySelector('.feat-ability-dropdown');
        if (abilityDropdown && abilityDropdown.value) {
            const attrLabel = abilityDropdown.value;
            const stringId = attrLabel.replace('Label', '');
            if (bonuses.hasOwnProperty(stringId)) bonuses[stringId] += 1;
        } 
        // 2. Logik für automatische "+1"-Talente (feste Anzeige)
        else if (featData.Get_attrImprovement && featData.Get_attrImprovement.length === 1 && !["resilientLabel", "abilityScoreImprovementLabel"].includes(featData.translationLabel)) {
            const attrLabel = featData.Get_attrImprovement[0];
            const stringId = attrLabel.replace('Label', '');
            if (bonuses.hasOwnProperty(stringId)) bonuses[stringId] += 1;
        }

        // 3. Speziallogik für "Resilient" (+1 und Rettungswurf-Übung)
        if (featData.translationLabel === "resilientLabel") {
            const resilientDropdown = featContentContainer.querySelector('select[id^="attribute"]');
            if (resilientDropdown && resilientDropdown.value) {
                const attrID = parseInt(resilientDropdown.value, 10);
                const attribute = attributeList.find(a => a.ID === attrID);
                if (attribute) {
                   const stringId = attribute.translationLabel.replace('Label', '');
                   if (bonuses.hasOwnProperty(stringId)) bonuses[stringId] += 1;
                }
            }
        }
        
        // 4. Logik für Attributswerterhöhung (ASI)
        const asiContainer = featContentContainer.querySelector('.asi-container');
        if (asiContainer) {
            asiContainer.querySelectorAll('.asi-point-input').forEach(input => {
                const value = parseInt(input.value, 10) || 0;
                if (value > 0) {
                    const attributeId = input.dataset.attribute;
                    bonuses[attributeId] += value;
                }
            });
        }
    });

    return bonuses;
}

//=======================================================================
// SCHRITT 5: STUFE
//=======================================================================

// Speichert das gewählte Level und wechselt zum nächsten Schritt
function saveLevel() {
    let levelInputString = document.getElementById("level").value;
    let levelInput;

    // Prüfen, ob das Eingabefeld leer ist oder der Inhalt keine Zahl ist
    if (levelInputString.trim() === "" || isNaN(parseInt(levelInputString, 10))) {
        levelInput = 1; // Standardwert auf 1 setzen
        console.log("Kein gültiges Level eingegeben oder Feld leer, Level wird auf 1 gesetzt.");
        // Optional: Das Eingabefeld auch auf "1" setzen für den Benutzer
        document.getElementById("level").value = "1";
    } else {
        levelInput = parseInt(levelInputString, 10);
    }

    // Die ursprüngliche Validierung für den Bereich 1-20 beibehalten
    if (levelInput < 1 || levelInput > 20) { // isNaN(levelInput) ist hier nicht mehr nötig, da wir oben schon parsen oder defaulten
        alert(translations[currentLang].levelRangeAlert);
        return;
    }

    // Überprüfen, ob das Level geändert wurde
    if (lastSavedLevel === levelInput) {
        console.log("Level hat sich nicht geändert. Schritt 6 wird nicht zurückgesetzt.");
        goToStep(6); // Springe direkt zu Schritt 6, ohne etwas zurückzusetzen
        return;
    }

    // Level speichern und Schritt 5 zurücksetzen
    lastSavedLevel = levelInput;
    character.level = levelInput; // Hier wird jetzt entweder die Eingabe oder 1 gespeichert
    subclassDetailBox.style.display = "none";

    console.log(`Level gespeichert: ${character.level}`); // Debugging-Log
    displayClassFeatures(character.level); // Verwende character.level, da es jetzt den korrekten Wert hat
    updateProgress();
    populateClassFormOptions(character.class); // Optionen basierend auf neuem Level neu laden

    // Schritt 5 zurücksetzen, wenn das Level geändert wurde
    console.log("Level wurde geändert. Schritt 5 wird zurückgesetzt.");
    resetDynamicSubclassContent(); // Subklasseninhalte zurücksetzen
    currentExpertises = []; // Expertise zurücksetzen
    
    // character.feats = []; // Diese Zeile ist nicht standardmäßig in deinem Code, aber wenn du Feats so speicherst, dann auch zurücksetzen
    character.featSelections = {}; // Gespeicherte Feats löschen (deine vorhandene Logik)

    // Aktualisiere Feat-Dropdowns in Schritt 5 (die mit name^="feats")
    document.querySelectorAll('select[name^="feats"]').forEach(select => {
        select.selectedIndex = 0; // Auswahl zurücksetzen
    });

    resetSubclassUI();
    goToStep(6); // Zu Schritt 6 wechseln
}

// Aktualisiert die Levelinformationen dynamisch
function updateLevelInfo() {
    const level = parseInt(document.getElementById("level").value);
    if (character.class) {
        character.level = level; // Speichere das Level im Charakterobjekt
        displayClassFeatures(level);
        updateInfoBoxContent(character.class); // Aktualisiere die Info-Box bei Leveländerung
    }
}

function applyPassiveClassFeatures() {
    // Setze zuerst die alten Boni zurück
    classAttributeBonuses = {};
    classSavingThrowProficiencies = [];

    if (!character.class || !character.level) return;

    const classData = getClassData(character.class.toLowerCase());
    if (!classData) return;

    // Finde alle Merkmale bis zum aktuellen Level
    const features = classData.filter(f => f.level <= character.level);

    features.forEach(feature => {
        switch (feature.translationLabel) {
            case "primalChampion": // Barbar Lvl 20
                classAttributeBonuses.strength = (classAttributeBonuses.strength || 0) + 4;
                classAttributeBonuses.constitution = (classAttributeBonuses.constitution || 0) + 4;
                break;
            case "bodyAndMindLabel": // Mönch Lvl 20
                classAttributeBonuses.dexterity = (classAttributeBonuses.dexterity || 0) + 4;
                classAttributeBonuses.wisdom = (classAttributeBonuses.wisdom || 0) + 4;
                break;
            case "slipperyMindLabel": // Schurke Lvl 15
                classSavingThrowProficiencies.push("wisdomLabel", "charismaLabel");
                break;
            // Hier können zukünftig weitere passive Merkmale hinzugefügt werden
        }
    });

    console.log("Passive Klassen-Boni:", {
        attributes: classAttributeBonuses,
        savingThrows: classSavingThrowProficiencies
    });
}

function displayClassFeatures(level) {
    const className = character.class;
    let proficiencyBonus = 2;
    let classFeatures = [];
    const elements = translations[currentLang];
    let rages = 0; // barbarian
    let rageDamage = 0; // barbarian
    let weaponMastery = 0; // barbarian, fighter
    let bardicDie = ''; //bard
    let secondWind = 0; //fighter
    let channelDivinity = 0; // cleric, paladin
    let martialArts = 0; // monk
    let focusPoints = 0; // monk
    let unarmoredMovement = 0; // monk
    let favoredEnemy = 0; // ranger
    let sneakAttackDice = ''; // rogue
    let sorceryPoints = 0; // sorcerer
    let eldritchInvocations = 0; // warlock

    if (className === "Barbarian" && barbarianClassData.length > 0) {
        barbarianClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    rages = feature.rages;
                    rageDamage = feature.rageDamage;
                    weaponMastery = feature.weaponMastery;
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.ragesLabel}:</strong> ${rages}</p>
                    <p><strong>${elements.rageDamageLabel}:</strong> ${rageDamage}</p>
                    <p><strong>${elements.weaponMasteryLabel}:</strong> ${weaponMastery}</p>
                </div>`;
        }

    } else if (className === "Bard" && bardClassData.length > 0) {
        bardClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    bardicDie = feature.bardicDie;
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.bardicInspirationDiceLabel}:</strong> ${bardicDie}</p>
                </div>`;
        }

    } else if (className === "Cleric" && clericClassData.length > 0) {
        clericClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    channelDivinity = feature.channelDivinity;
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.channelDivinityLabel}:</strong> ${channelDivinity}</p>
                </div>`;
        }

    } else if (className === "Druid" && druidClassData.length > 0) {
        druidClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    wildShape = feature.wildShape;
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.wildShapeLabel}:</strong> ${wildShape}</p>
                </div>`;
        }

    } else if (className === "Fighter" && fighterClassData.length > 0) {
        fighterClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    secondWind = feature.secondWind;
                    weaponMastery = feature.weaponMastery;
                }
            }

        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.secondWindLabel}:</strong> +${secondWind}</p>
                    <p><strong>${elements.weaponMasteryLabel}:</strong> ${weaponMastery}</p>
                </div>`;
        }

    } else if (className === "Monk" && monkClassData.length > 0) {
        monkClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    martialArts = feature.martialArts;
                    focusPoints = feature.focusPoints;
                    unarmoredMovement = feature.unarmoredMovement_ft;
                }
            }
        });

        // Anpassung der Darstellung von unarmoredMovement
        let unarmoredMovementDisplay;
        if (currentLang === 'en') {
            unarmoredMovementDisplay = `+${unarmoredMovement} ft`;
        } else if (currentLang === 'de') {
            const unarmoredMovementMeters = Math.round(unarmoredMovement * 0.3048); // Umrechnung von Fuß in Meter
            unarmoredMovementDisplay = `+${unarmoredMovementMeters} m`;
        }

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.martialArtsLabel}:</strong> ${martialArts}</p>
                    <p><strong>${elements.focusPointsLabel}:</strong> ${focusPoints}</p>
                    <p><strong>${elements.unarmoredMovementLabel}:</strong> ${unarmoredMovementDisplay}</p>
                </div>`;
        }

    } else if (className === "Paladin" && paladinClassData.length > 0) { 
        paladinClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    channelDivinity = feature.channelDivinity;
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.channelDivinityLabel}:</strong> ${channelDivinity}</p>
                </div>`;
        }

    } else if (className === "Ranger" && rangerClassData.length > 0) { 
        rangerClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    favoredEnemy = feature.favoredEnemy;
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.favoredEnemyLabel}:</strong> ${favoredEnemy}</p>
                </div>`;
        }

    } else if (className === "Rogue" && rogueClassData.length > 0) {
        rogueClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    sneakAttackDice = feature.sneakAttackDice;
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.sneakAttackDiceLabel}:</strong> ${sneakAttackDice}</p>
                </div>`;
        }

    } else if (className === "Sorcerer" && sorcererClassData.length > 0) {
        sorcererClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    sorceryPoints = feature.sorceryPoints;
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.sorceryPointsLabel}:</strong> ${sorceryPoints}</p>
                </div>`;
        }

    } else if (className === "Warlock" && warlockClassData.length > 0) {
        warlockClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                    eldritchInvocations = feature.eldritchInvocations;
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                    <p><strong>${elements.eldritchInvocationsLabel}:</strong> ${eldritchInvocations}</p>
                </div>`;
        }

    } else if (className === "Wizard" && wizardClassData.length > 0) {
        wizardClassData.forEach(feature => {
            if (level >= feature.level) {
                if (feature.classFeaturesStep2) {
                    classFeatures.push(elements[feature.translationLabel]);
                }
                if (feature.level === 1 || feature.level === level) {
                }
            }
        });

        proficiencyBonus = Math.floor((level - 1) / 4) + 2;
        const levelInfoContainer = document.getElementById("levelInfoContainer");
        if (levelInfoContainer) {
            levelInfoContainer.innerHTML = 
                `<p class="bonus"><strong>${elements.proficiencyBonusLabel}:</strong> +${proficiencyBonus}</p>
                <p><strong>${elements.classFeaturesLabel}:</strong></p>
                <ul>${classFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>
                <div class="dynamic-values">
                </div>`;
        }
    }  
}

//=======================================================================
// SCHRITT 6: SPEZIALISIERUNG
//=======================================================================

// Existing logic for displaying sections based on level
function displayClassSectionsBasedOnLevel(level) {

    const classData = getClassData(character.class.toLowerCase());

    if (classData) {
        populateAbilityImprovementOptions(classData, level);
    }

    const skillSection = document.getElementById("skillSection");
    const dynamicClassSection1 = document.getElementById("dynamicClassSection1");
    const dynamicClassSection2 = document.getElementById("dynamicClassSection2");
    const dynamicClassSection3 = document.getElementById("dynamicClassSection3");
    const dynamicClassSection4 = document.getElementById("dynamicClassSection4");
    const subclassSection = document.getElementById("subclassSection");
    const additionalWeaponMasterySection1 = document.getElementById("additionalWeaponMasterySection1");
    const additionalWeaponMasterySection2 = document.getElementById("additionalWeaponMasterySection2");
    const additionalWeaponMasterySection3 = document.getElementById("additionalWeaponMasterySection3");
    const additionalExpertiseSection1 = document.getElementById("additionalExpertiseSection1");
    const additionalExpertiseSection2 = document.getElementById("additionalExpertiseSection2");
    const additionalExpertiseSection3 = document.getElementById("additionalExpertiseSection3");
    const additionalExpertiseSection4 = document.getElementById("additionalExpertiseSection4");
    const additionalMetamagicSection1 = document.getElementById("additionalMetamagicSection1");
    const additionalMetamagicSection2 = document.getElementById("additionalMetamagicSection2");
    const additionalMetamagicSection3 = document.getElementById("additionalMetamagicSection3");
    const additionalMetamagicSection4 = document.getElementById("additionalMetamagicSection4");
    const invSection1 = document.getElementById("additionalEldritchInvocationSection1");
    const invSection2 = document.getElementById("additionalEldritchInvocationSection2");
    const invSection3 = document.getElementById("additionalEldritchInvocationSection3");
    const invSection4 = document.getElementById("additionalEldritchInvocationSection4");
    const invSection5 = document.getElementById("additionalEldritchInvocationSection5");
    const invSection6 = document.getElementById("additionalEldritchInvocationSection6");
    const invSection7 = document.getElementById("additionalEldritchInvocationSection7");
    const invSection8 = document.getElementById("additionalEldritchInvocationSection8");
    const invSection9 = document.getElementById("additionalEldritchInvocationSection9");
    const invSection10 = document.getElementById("additionalEldritchInvocationSection10");

    if (skillSection) skillSection.style.display = level >= 1 ? "block" : "none";

    switch (character.class.toLowerCase()) {
        case "barbarian":
            if (dynamicClassSection1) dynamicClassSection1.style.display = "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        case "bard":
            if (dynamicClassSection1) dynamicClassSection1.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        case "cleric":
            if (dynamicClassSection1) dynamicClassSection1.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 7 ? "block" : "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        case "druid":
            if (dynamicClassSection1) dynamicClassSection1.style.display = level >= 1 ? "block" : "none"; // Primal Order (Lvl 1)
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 7 ? "block" : "none"; // Elemental Fury (Lvl 7)
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        case "fighter":
            if (dynamicClassSection1) dynamicClassSection1.style.display = "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        case "monk":
            if (dynamicClassSection1) dynamicClassSection1.style.display = "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        case "paladin":
            if (dynamicClassSection1) dynamicClassSection1.style.display = "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = level >= 2 ? "block" : "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        case "ranger":
            if (dynamicClassSection1) dynamicClassSection1.style.display = level >= 2 ? "block" : "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = level >= 2 ? "block" : "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = level >= 2 ? "block" : "none";
            break;
        case "rogue":
            if (dynamicClassSection1) dynamicClassSection1.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = level >= 1 ? "block" : "none";
            break;
        case "sorcerer":
            if (dynamicClassSection1) dynamicClassSection1.style.display = level >= 2 ? "block" : "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        case "warlock":
            if (dynamicClassSection1) dynamicClassSection1.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        case "wizard":
            if (dynamicClassSection1) dynamicClassSection1.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
        default:
            if (dynamicClassSection1) dynamicClassSection1.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection2) dynamicClassSection2.style.display = level >= 1 ? "block" : "none";
            if (dynamicClassSection3) dynamicClassSection3.style.display = "none";
            if (dynamicClassSection4) dynamicClassSection4.style.display = "none";
            break;
    }

    if (subclassSection) subclassSection.style.display = level >= 3 ? "block" : "none";

    if (additionalWeaponMasterySection1) {
        additionalWeaponMasterySection1.style.display = level >= 4 ? "block" : "none";
    }

    if (additionalWeaponMasterySection2) {
        additionalWeaponMasterySection2.style.display = level >= 10 ? "block" : "none";
    }

    if (additionalWeaponMasterySection3) {
        additionalWeaponMasterySection3.style.display = level >= 16 ? "block" : "none";
    }

    if (additionalExpertiseSection1) {
        additionalExpertiseSection1.style.display = level >= 9 ? "block" : "none";
    }

    if (additionalExpertiseSection2) {
        additionalExpertiseSection2.style.display = level >= 9 ? "block" : "none";
    }

    if (additionalExpertiseSection3) {
        additionalExpertiseSection3.style.display = level >= 6 ? "block" : "none";
    }

    if (additionalExpertiseSection4) {
        additionalExpertiseSection4.style.display = level >= 6 ? "block" : "none";
    }

    if (additionalMetamagicSection1) {
        additionalMetamagicSection1.style.display = level >= 10 ? "block" : "none";
    }

    if (additionalMetamagicSection2) {
        additionalMetamagicSection2.style.display = level >= 10 ? "block" : "none";
    }

    if (additionalMetamagicSection3) {
        additionalMetamagicSection3.style.display = level >= 17 ? "block" : "none";
    }

    if (additionalMetamagicSection4) {
        additionalMetamagicSection4.style.display = level >= 17 ? "block" : "none";
    }

    if (invSection1) invSection1.style.display = level >= 1 ? "block" : "none";
    if (invSection2) invSection2.style.display = level >= 2 ? "block" : "none";
    if (invSection3) invSection3.style.display = level >= 2 ? "block" : "none";
    if (invSection4) invSection4.style.display = level >= 5 ? "block" : "none";
    if (invSection5) invSection5.style.display = level >= 5 ? "block" : "none";
    if (invSection6) invSection6.style.display = level >= 9 ? "block" : "none";
    if (invSection7) invSection7.style.display = level >= 9 ? "block" : "none";
    if (invSection8) invSection8.style.display = level >= 12 ? "block" : "none";
    if (invSection9) invSection9.style.display = level >= 15 ? "block" : "none";
    if (invSection10) invSection10.style.display = level >= 18 ? "block" : "none";
}

function populateExpertiseOptions() {
    const expertise1Select = document.getElementById("expertise1");
    const expertise2Select = document.getElementById("expertise2");
    const expertise3Select = document.getElementById("expertise3");
    const expertise4Select = document.getElementById("expertise4");

    const expertise5Select = document.getElementById("expertise5"); // "keenMindLabel"
    const expertise6Select = document.getElementById("expertise6"); // "observantLabel"
    const expertise7Select = document.getElementById("expertise7"); // skillExpertLabel
    const expertise8Select = document.getElementById("expertise8"); // boonOfSkillLabel

    // Überprüfen Sie die aktuellen ausgewählten Skills
    //console.log("Aktuelle ausgewählte Skills für Expertise-Optionen:", selectedSkills);

    const skillOptions = selectedSkills.map(skillId => {
        const skill = skillList.find(s => s.skillCategoryNumber == skillId);
        return skill ? `<option value="${skill.skillCategoryNumber}">${translations[currentLang][skill.translationLabel] || skill.translationLabel}</option>` : '';
    }).join('');

    // Spezifische Optionen für "keenMindLabel", aber nur wenn sie ausgewählt wurden
    const keenMindOptions = [3, 6, 9, 11, 15].filter(skillId => selectedSkills.includes(String(skillId)))
        .map(skillId => {
            const skill = skillList.find(s => s.skillCategoryNumber == skillId);
            return skill ? `<option value="${skill.skillCategoryNumber}">${translations[currentLang][skill.translationLabel] || skill.translationLabel}</option>` : '';
        }).join('');

    // Spezifische Optionen für "observantLabel", aber nur wenn sie ausgewählt wurden
    const observantOptions = [7, 9, 12].filter(skillId => selectedSkills.includes(String(skillId)))
        .map(skillId => {
            const skill = skillList.find(s => s.skillCategoryNumber == skillId);
            return skill ? `<option value="${skill.skillCategoryNumber}">${translations[currentLang][skill.translationLabel] || skill.translationLabel}</option>` : '';
        }).join('');

    if (expertise1Select) {
        expertise1Select.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + skillOptions;
    }
    if (expertise2Select) {
        expertise2Select.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + skillOptions;
    }
    if (expertise3Select) {
        expertise3Select.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + skillOptions;
    }
    if (expertise4Select) {
        expertise4Select.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + skillOptions;
    }
    if (expertise5Select) {
        expertise5Select.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + keenMindOptions; // Nur erlaubte für keenMind
    }
    if (expertise6Select) {
        expertise6Select.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + observantOptions; // Nur erlaubte für keenMind
    }
    if (expertise7Select) {
        expertise7Select.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + skillOptions;
    }
    if (expertise8Select) {
        expertise8Select.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + skillOptions;
    }

    restoreExpertiseSelections(); // Wiederherstellen der temporären Auswahlen

    document.querySelectorAll('select[name^="expertise"]').forEach(select => {
        select.addEventListener('change', updateExpertiseSelections); // Speichern bei Änderung
    });
}

function updateExpertiseSelections() {
    currentExpertises = [];
    document.querySelectorAll('select[name^="expertise"]').forEach(select => {
        const expertiseIndex = parseInt(select.name.replace('expertise', ''), 10) - 1;
        currentExpertises[expertiseIndex] = select.value;
	    restoreExpertiseSelections();
    });
}

function restoreExpertiseSelections() {
    document.querySelectorAll('select[name^="expertise"]').forEach(select => {
        const expertiseIndex = parseInt(select.name.replace('expertise', ''), 10) - 1;
        if (currentExpertises[expertiseIndex]) {
            select.value = currentExpertises[expertiseIndex];
        }
    });
}

function createSkillOptions(skillCategoryNumbers) {
    const elements = translations[currentLang];
    return skillList
        .filter(skill => skillCategoryNumbers.includes(skill.skillCategoryNumber))
        .map(skill => {
            const skillName = elements[skill.translationLabel] || skill.translationLabel;
            return `<option value="${skill.skillCategoryNumber}">${skillName}</option>`;
        })
        .join('');
}

function populateAbilityImprovementOptions(classData, currentLevel) {
    const section = document.getElementById("abilityImprovementSection");
    if (!section) return;

    let hasContentToShow = false;

    // Gehe durch alle möglichen ASI/Feat-Level (z.B. 4, 8, 12...)
    classData.forEach(feature => {
        if (feature.translationLabel === "asiAndFeat" || feature.translationLabel === "epicBoon") {
            const featLevel = feature.level;
            const improvementDiv = document.getElementById(`improvement-option-${featLevel}`);
            
            if (improvementDiv) {
                // Prüfe, ob dieser Container für das aktuelle Level angezeigt werden soll
                if (featLevel <= currentLevel) {
                    improvementDiv.style.display = 'block';
                    hasContentToShow = true;
                } else {
                    improvementDiv.style.display = 'none';
                }
            }
        }
    });

    // Zeige den gesamten Abschnitt nur an, wenn es für das Level etwas anzuzeigen gibt
    section.style.display = hasContentToShow ? 'block' : 'none';
}

function createFeatOptions(currentLevel, allowedCategories = [], selectedFeatLabel = null) { // Neuer optionaler Parameter
    const elements = translations[currentLang];

    return featList.map(feat => {
        const isCategoryAllowed = allowedCategories.length === 0 || allowedCategories.includes(feat.featCategoryNumber);
        if (!isCategoryAllowed && selectedFeatLabel !== feat.translationLabel) { // Wenn ein bestimmtes Talent ausgewählt werden soll, ignoriere die Kategorieprüfung dafür
             if (selectedFeatLabel && feat.translationLabel === selectedFeatLabel) {
                // Wenn es das ausgewählte Talent ist, dann ist die Kategorie erstmal egal,
                // da wir dieses spezifische Talent anzeigen wollen.
                // Die allowedCategories werden relevant, wenn kein specificFeatLabel übergeben wird.
             } else {
                 return '';
             }
        }


        const featName = elements[feat.translationLabel] || feat.translationLabel;
        const isLevelSufficient = currentLevel >= feat.prerequisite_Level;

        let hasRequiredFeature = true;
        if (feat.prerequisite_Feature && feat.prerequisite_Feature !== 0) {
            const requiredFeatures = Array.isArray(feat.prerequisite_Feature) ? feat.prerequisite_Feature : [feat.prerequisite_Feature];
            const classData = getClassData(character.class.toLowerCase(), "class") || []; // character muss hier verfügbar sein
            const selectedSubclassNumber = parseInt(document.querySelector('input[name="subclass"]:checked')?.value, 10);

            hasRequiredFeature = requiredFeatures.some(requiredFeature => {
                const isClassFeature = classData.some(feature =>
                    feature.translationLabel === requiredFeature &&
                    feature.level <= currentLevel &&
                    (feature.subclassCategoryNumber === 0 || feature.subclassCategoryNumber === undefined)
                );
                const isSubclassFeature = classData.some(subFeature =>
                    subFeature.translationLabel === requiredFeature &&
                    subFeature.level <= currentLevel &&
                    subFeature.subclassCategoryNumber === selectedSubclassNumber
                );
                return isClassFeature || isSubclassFeature;
            });
        }

        setupFeatSelection();

        const isSelected = selectedFeatLabel === feat.translationLabel; // Prüfen, ob dieses Talent vorausgewählt werden soll
        const isDisabled = !(isLevelSufficient && hasRequiredFeature);

        return `<option value="${feat.ID}"${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}>${featName}</option>`;

    }).join('');
}

function setupFeatSelection() {
    const featSelectElements = document.querySelectorAll('select[name^="feat"]');

    featSelectElements.forEach(selectElement => {
        selectElement.addEventListener('change', () => {
            validateFeatSelection(featSelectElements);
        });
    });

    // Initiale Validierung bei der Erst-Anzeige
    validateFeatSelection(featSelectElements);
}

function validateFeatSelection(featSelectElements) {
    const selectedFeats = Array.from(featSelectElements).map(el => el.value).filter(Boolean);
    const selectedCategory4Feat = selectedFeats.find(featID => {
        const feat = featList.find(f => f.ID == featID);
        return feat && feat.featCategoryNumber === 4;
    });

    featSelectElements.forEach(el => {
        const options = el.querySelectorAll('option');
        options.forEach(option => {
            const feat = featList.find(f => f.ID == option.value);
            if (!feat) return;

            const isMultipleAllowed = feat.multipleSelection === 1;
            const isAlreadySelected = selectedFeats.includes(option.value);
            const isCategory4 = feat.featCategoryNumber === 4;
            const isAnotherCategory4Selected = selectedCategory4Feat && selectedCategory4Feat !== option.value;
            const isLevelSufficient = character.level >= feat.prerequisite_Level;

            // NEU: Merkmale & Attribute prüfen
            const hasRequiredFeature = checkRequiredFeature(feat);
            const hasRequiredAttributes = checkAttributePrerequisite(feat);

            const shouldDisable = 
                (!isMultipleAllowed && isAlreadySelected) || 
                (isCategory4 && isAnotherCategory4Selected) || 
                !hasRequiredFeature || 
                !isLevelSufficient ||
                !hasRequiredAttributes; // <-- HIER wird gesperrt

            option.disabled = shouldDisable;
        });
    });
}

function checkRequiredFeature(feat) {
    if (!feat.prerequisite_Feature || feat.prerequisite_Feature === 0) return true;

    const requiredFeatures = Array.isArray(feat.prerequisite_Feature) ? feat.prerequisite_Feature : [feat.prerequisite_Feature];
    const classData = getClassData(character.class.toLowerCase(), "class") || [];
    const selectedSubclassNumber = parseInt(document.querySelector('input[name="subclass"]:checked')?.value, 10);

    return requiredFeatures.some(requiredFeature => {
        const isClassFeature = classData.some(feature =>
            feature.translationLabel === requiredFeature &&
            feature.level <= character.level &&
            (feature.subclassCategoryNumber === 0 || feature.subclassCategoryNumber === undefined)
        );
        const isSubclassFeature = classData.some(subFeature =>
            subFeature.translationLabel === requiredFeature &&
            subFeature.level <= character.level &&
            subFeature.subclassCategoryNumber === selectedSubclassNumber
        );

        return isClassFeature || isSubclassFeature;
    });
}

/**
* Prüft, ob der Charakter die Attributs-Voraussetzungen für ein Talent erfüllt.
 */
function checkAttributePrerequisite(feat) {
    // Falls keine Voraussetzungen definiert sind (0 oder leeres Array)
    if (!feat.prerequisite_Attribute || feat.prerequisite_Attribute === 0 || feat.prerequisite_Attribute.length === 0) {
        return true;
    }

    const requiredValue = feat.prerequisite_AttributeValue;
    const attributesToCheck = Array.isArray(feat.prerequisite_Attribute) ? feat.prerequisite_Attribute : [feat.prerequisite_Attribute];

    // .some() gibt true zurück, sobald EINES der Attribute den Wert erreicht (OR-Bedingung)
    return attributesToCheck.some(attrLabel => {
        // Mapping: "strengthLabel" -> "strength"
        const stringId = attrLabel.replace('Label', '');
        const liveInput = document.getElementById(`live-${stringId}TotalScore`);
        
        // Den aktuellen Wert direkt aus dem Live-Container ziehen
        const currentScore = liveInput ? parseInt(liveInput.value, 10) : 0;
        
        return currentScore >= requiredValue;
    });
}

function populateClassFormOptions(className) {
    const skill1Select = document.getElementById("skill1");
    const skill2Select = document.getElementById("skill2");
    const dynamicClassSection1 = document.getElementById("dynamicClassSection1");
    const dynamicClassSection2 = document.getElementById("dynamicClassSection2");
    const dynamicClassSection3 = document.getElementById("dynamicClassSection3");
    const dynamicClassSection4 = document.getElementById("dynamicClassSection4");
    const subclassOptionsDiv = document.getElementById("subclassOptions");

    // Initialisierung von `elements` am Anfang der Funktion
    const elements = translations[currentLang]; // Zugriff auf Übersetzungen für die aktuelle Sprache

    const classOptions = {
        "barbarian": {
            data: barbarianClassData,
            subclasses: subclassListBarbarian,
            dynamicContent2: `
                <h3>${translations[currentLang].weaponMasteryLabel}</h3>
                <label for="weaponMastery1">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery1" name="weaponMastery1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9])} <!-- Simple Melee Weapons and Martial Melee Weapons -->
                </select>
                <label for="weaponMastery2">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery2" name="weaponMastery2" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                </select>
                <div id="additionalWeaponMasterySection1" style="display: none;">
                    <label for="weaponMastery3">${elements.chooseWTLabel} (${elements.levelLabel2} 4):</label>
                    <select id="weaponMastery3" name="weaponMastery3" class="dropdown">
                    	<option value="">${translations[currentLang].pleaseSelectLabel}</option>
                        ${createWeaponOptions([1, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                    </select>
                </div>
                <div id="additionalWeaponMasterySection2" style="display: none;">
                    <label for="weaponMastery4">${elements.chooseWTLabel} (${elements.levelLabel2} 10):</label>
                    <select id="weaponMastery4" name="weaponMastery4" class="dropdown">
                    	<option value="">${translations[currentLang].pleaseSelectLabel}</option>
                        ${createWeaponOptions([1, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                    </select>
                </div>
            `,
            skillCount: 2
        },
        "bard": {
            data: bardClassData,
            subclasses: subclassListBard,
            dynamicContent1: `
                <h3>Expertise</h3>
                <label for="expertise1">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 1):</label>
                <select id="expertise1" name="expertise1" class="dropdown">
                    <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                </select>
                <label for="expertise2">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 1):</label>
                <select id="expertise2" name="expertise2" class="dropdown">
                    <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                </select>
                <div id="additionalExpertiseSection1" style="display: none;">
                    <label for="expertise3">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 9):</label>
                    <select id="expertise3" name="expertise3" class="dropdown">
                        <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                    </select>
                </div>
                <div id="additionalExpertiseSection2" style="display: none;">
                    <label for="expertise4">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 9):</label>
                    <select id="expertise4" name="expertise4" class="dropdown">
                        <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                    </select>
                </div>
            `,
            dynamicContent2: `
                <h3>${translations[currentLang].musicalInstrumentLabel}</h3>
                <label for="instrument1">${elements.chooseInsrumentLabel} (${elements.levelLabel2} 1):</label>
                <select id="instrument1" name="instrument1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createInstrumentOptions()}
                </select>
                <label for="instrument2">${elements.chooseInsrumentLabel} (${elements.levelLabel2} 1):</label>
                <select id="instrument2" name="instrument2" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createInstrumentOptions()}
                </select>
                <label for="instrument3">${elements.chooseInsrumentLabel} (${elements.levelLabel2} 1):</label>
                <select id="instrument3" name="instrument3" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createInstrumentOptions()}
                </select>
            `,
            skillCount: 3
        },
        "cleric": {
            data: clericClassData,
            subclasses: subclassListCleric,
            dynamicContent1: `
                <h3>${translations[currentLang].divineOrderLabel}</h3>
                <label for="divineOrder1">${elements.chooseOptionLabel} (${elements.levelLabel2} 1):</label>
                <select id="divineOrder1" name="divineOrder1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createDivineOrderOptions()}
                </select>
            `,
            dynamicContent2: `
                <h3>${translations[currentLang].blessedStrikesLabel}</h3>
                <label for="blessedStrikes1">${elements.chooseOptionLabel} (${elements.levelLabel2} 7):</label>
                <select id="blessedStrikes1" name="blessedStrikes1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createBlessedStrikesOptions()}
                </select>
            `,
            skillCount: 2
        },
        "druid": {
            data: druidClassData,
            subclasses: subclassListDruid,
            dynamicContent1: `
                <h3>${translations[currentLang].primalOrderLabel}</h3>
                <label for="primalOrder1">${elements.chooseOptionLabel} (${elements.levelLabel2} 1):</label>
                <select id="primalOrder1" name="primalOrder1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createPrimalOrderOptions()}
                </select>
            `,
            dynamicContent2: `
                <h3>${translations[currentLang].elementalFuryLabel}</h3>
                <label for="elementalFury1">${elements.chooseOptionLabel} (${elements.levelLabel2} 7):</label>
                <select id="elementalFury1" name="elementalFury1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createElementalFuryOptions()}
                </select>
            `,
            skillCount: 2
        },
        "fighter": {
            data: fighterClassData,
            subclasses: subclassListFighter,
            dynamicContent2: `
                <h3>${translations[currentLang].weaponMasteryLabel}</h3>
                <label for="weaponMastery1">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery1" name="weaponMastery1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 2, 3, 4], [1, 2, 3, 4, 5, 6, 7, 8, 9])} <!-- Simple Melee Weapons and Martial Melee Weapons -->
                </select>
                <label for="weaponMastery2">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery2" name="weaponMastery2" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 2, 3, 4], [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                </select>
                <div id="additionalWeaponMasterySection1" style="display: none;">
                    <label for="weaponMastery3">${elements.chooseWTLabel} (${elements.levelLabel2} 4):</label>
                    <select id="weaponMastery3" name="weaponMastery3" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                        ${createWeaponOptions([1, 2, 3, 4], [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                    </select>
                </div>
                <div id="additionalWeaponMasterySection2" style="display: none;">
                    <label for="weaponMastery4">${elements.chooseWTLabel} (${elements.levelLabel2} 10):</label>
                    <select id="weaponMastery4" name="weaponMastery4" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                        ${createWeaponOptions([1, 2, 3, 4], [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                    </select>
                </div>
                <div id="additionalWeaponMasterySection3" style="display: none;">
                     <label for="weaponMastery5">${elements.chooseWTLabel} (${elements.levelLabel2} 16):</label>
                    <select id="weaponMastery5" name="weaponMastery5" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                        ${createWeaponOptions([1, 2, 3, 4], [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                    </select>
                </div>
            `,
            dynamicContent3: `
                <h3>${translations[currentLang].fightingStyleLabel}</h3>
                <label for="feat1">${elements.chooseFightingStyleLabel} (${elements.levelLabel2} 1):</label>
                <select id="feat1" name="feats1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createFeatOptions(character.level, [3])} <!-- Nur Feats der Kategorie 'Fighting Style' -->
                </select>
            `,
            skillCount: 2
        },
	"monk": {
    	   data: monkClassData,
   	   subclasses: subclassListMonk,
   	   dynamicContent2: `
               <h3>${translations[currentLang].instrOrToolLabel}</h3>
               <div class="radio-containerMonk">
               <div class="radio-item">
                  <input type="radio" id="monkInstrumentRadio" name="monkInstrumentOrTool" value="instrument">
                  <label for="monkInstrumentRadio">${translations[currentLang].instrumentLabel}</label>
               </div>
                  <div class="radio-item">
                  <input type="radio" id="monkToolRadio" name="monkInstrumentOrTool" value="tool">
                  <label for="monkToolRadio">${translations[currentLang].toolLabel}</label>
                  </div>
              </div>
              <div id="monkDropdownContainer" class="dropdown-container"></div>
           `,
           skillCount: 2
        },
        "paladin": {
            data: paladinClassData,
            subclasses: subclassListPaladin,
            dynamicContent2: `
                <h3>${translations[currentLang].weaponMasteryLabel}</h3>
                <label for="weaponMastery1">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery1" name="weaponMastery1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 2, 3, 4], [1, 2, 3, 4, 5, 6, 7, 8, 9])} <!-- Simple Melee Weapons and Martial Melee Weapons -->
                </select>
                <label for="weaponMastery2">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery2" name="weaponMastery2" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 2, 3, 4], [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                </select>
            `,
            dynamicContent3: `
                <h3>${translations[currentLang].fightingStyleLabel}</h3>
                <label for="feat1">${elements.chooseFightingStyleLabel} (${elements.levelLabel2} 2):</label>
                <select id="feat1" name="feats2" class="dropdown"> //feats2 = Feat für level 2
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createFeatOptions(character.level, [3, 5])} <!-- Nur Feats der Kategorie 'Fighting Style' + 'Blessed Warrior' -->
                </select>
            `,
            skillCount: 2
        },
        "ranger": {
            data: rangerClassData,
            subclasses: subclassListRanger,
            dynamicContent1: `
                <h3>Expertise</h3>
                <label for="expertise1">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 2):</label>
                <select id="expertise1" name="expertise1" class="dropdown">
                    <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                </select>
                <div id="additionalExpertiseSection1" style="display: none;">
                    <label for="expertise2">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 9):</label>
                    <select id="expertise2" name="expertise2" class="dropdown">
                        <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                    </select>
                </div>
                <div id="additionalExpertiseSection2" style="display: none;">
                    <label for="expertise3">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 9):</label>
                    <select id="expertise3" name="expertise3" class="dropdown">
                        <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                    </select>
                </div>
            `,
            dynamicContent2: `
                <h3>${translations[currentLang].weaponMasteryLabel}</h3>
                <label for="weaponMastery1">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery1" name="weaponMastery1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 2, 3, 4], [1, 2, 3, 4, 5, 6, 7, 8, 9])} <!-- Simple Melee Weapons and Martial Melee Weapons -->
                </select>
                <label for="weaponMastery2">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery2" name="weaponMastery2" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 2, 3, 4], [1, 2, 3, 4, 5, 6, 7, 8, 9])}
                </select>
            `,
            dynamicContent3: `
                <h3>${translations[currentLang].fightingStyleLabel}</h3>
                <label for="feat1">${elements.chooseFightingStyleLabel} (${elements.levelLabel2} 2):</label>
                <select id="feat1" name="feats2" class="dropdown"> //feats2 = Feat für level 2
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createFeatOptions(character.level, [3, 6])} <!-- Nur Feats der Kategorie 'Fighting Style' + 'Druidic Warrior' -->
                </select>
            `,
            dynamicContent4: `
                <h3>${translations[currentLang].deftExplorerLabel}</h3>
                <label for="language1">${elements.chooseLanguageLabel} (${elements.levelLabel2} 2):</label>
                <select id="language1" name="language1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createLangOptions([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19])}
                </select>
                <label for="language2">${elements.chooseLanguageLabel} (${elements.levelLabel2} 2):</label>
                <select id="language2" name="language2" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createLangOptions([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19])}
                </select>
            `,
            skillCount: 3
        },
        "rogue": {
            data: rogueClassData,
            subclasses: subclassListRogue,
            dynamicContent1: `
                <h3>Expertise</h3>
                <label for="expertise1">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 1):</label>
                <select id="expertise1" name="expertise1" class="dropdown">
                    <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                </select>
                <label for="expertise2">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 1):</label>
                <select id="expertise2" name="expertise2" class="dropdown">
                    <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                </select>
                <div id="additionalExpertiseSection3" style="display: none;">
                    <label for="expertise3">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 6):</label>
                    <select id="expertise3" name="expertise3" class="dropdown">
                        <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                    </select>
                </div>
                <div id="additionalExpertiseSection4" style="display: none;">
                    <label for="expertise4">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 6):</label>
                    <select id="expertise4" name="expertise4" class="dropdown">
                        <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                    </select>
                </div>
            `,
            dynamicContent2: `
                <h3>${translations[currentLang].weaponMasteryLabel}</h3>
                <label for="weaponMastery1">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery1" name="weaponMastery1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 2, 3, 4], [1, 2])} <!-- Simple Melee Weapons and Simple Ranged Weapons, with property light&finesse -->
                </select>
                <label for="weaponMastery2">${elements.chooseWTLabel} (${elements.levelLabel2} 1):</label>
                <select id="weaponMastery2" name="weaponMastery2" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createWeaponOptions([1, 2, 3, 4], [1, 2])}
                </select>
            `,
            dynamicContent4: `
                <h3>${translations[currentLang].thievesCantLabel}</h3>
                <label for="language1">${elements.chooseLanguageLabel} (${elements.levelLabel2} 1):</label>
                <select id="language1" name="language1" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    ${createLangOptions([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19])}
                </select>
            `,
            skillCount: 4
        },
        "sorcerer": {
            data: sorcererClassData,
            subclasses: subclassListSorcerer,
    	    dynamicContent1: `
        	<h3>${translations[currentLang].metamagicLabel}</h3>
        	<label for="metamagic1">${elements.chooseMetamagicLabel || 'Wähle eine Metamagie'} (${elements.levelLabel2} 2):</label>
        	<select id="metamagic1" name="metamagic1" class="dropdown">
            	    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
            	    ${createMetamagicOptions()}
            	</select>
        
        	<label for="metamagic2">${elements.chooseMetamagicLabel || 'Wähle eine Metamagie'} (${elements.levelLabel2} 2):</label>
        	<select id="metamagic2" name="metamagic2" class="dropdown">
            	     <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                      ${createMetamagicOptions()}
        	</select>
                <div id="additionalMetamagicSection1" style="display: none;">
                    <label for="metamagic3">${elements.chooseMetamagicLabel} (${elements.levelLabel2} 10):</label>
                    <select id="metamagic3" name="metamagic3" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    	${createMetamagicOptions()}
                    </select>
                </div>
                <div id="additionalMetamagicSection2" style="display: none;">
                    <label for="metamagic4">${elements.chooseMetamagicLabel} (${elements.levelLabel2} 10):</label>
                    <select id="metamagic4" name="metamagic4" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    	${createMetamagicOptions()}
                    </select>
                </div>
                <div id="additionalMetamagicSection3" style="display: none;">
                    <label for="metamagic5">${elements.chooseMetamagicLabel} (${elements.levelLabel2} 17):</label>
                    <select id="metamagic5" name="metamagic5" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    	${createMetamagicOptions()}
                    </select>
                </div>
                <div id="additionalMetamagicSection4" style="display: none;">
                     <label for="metamagic6">${elements.chooseMetamagicLabel} (${elements.levelLabel2} 17):</label>
                    <select id="metamagic6" name="metamagic6" class="dropdown">
                    <option value="">${translations[currentLang].pleaseSelectLabel}</option>
                    	${createMetamagicOptions()}
                    </select>
                </div>
    	    `,
            skillCount: 2
        },
        "warlock": {
            data: warlockClassData,
            subclasses: subclassListWarlock,
    	    dynamicContent1: `
        	<h3>${translations[currentLang].eldritchInvocationsLabel}</h3>
        <div id="additionalEldritchInvocationSection1" style="display: none;">
            <label for="invocation1">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 1):</label>
            <select id="invocation1" name="invocation1" class="dropdown">
                ${createEldritchInvocationOptions()}
            </select>
        </div>
        <div id="additionalEldritchInvocationSection2" style="display: none;">
            <label for="invocation2">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 2):</label>
            <select id="invocation2" name="invocation2" class="dropdown"></select>
        </div>
        <div id="additionalEldritchInvocationSection3" style="display: none;">
            <label for="invocation3">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 2):</label>
            <select id="invocation3" name="invocation3" class="dropdown"></select>
        </div>
        <div id="additionalEldritchInvocationSection4" style="display: none;">
            <label for="invocation4">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 5):</label>
            <select id="invocation4" name="invocation4" class="dropdown"></select>
        </div>
        <div id="additionalEldritchInvocationSection5" style="display: none;">
            <label for="invocation5">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 5):</label>
            <select id="invocation5" name="invocation5" class="dropdown"></select>
        </div>
        <div id="additionalEldritchInvocationSection6" style="display: none;">
            <label for="invocation6">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 9):</label>
            <select id="invocation6" name="invocation6" class="dropdown"></select>
        </div>
        <div id="additionalEldritchInvocationSection7" style="display: none;">
            <label for="invocation7">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 9):</label>
            <select id="invocation7" name="invocation7" class="dropdown"></select>
        </div>
        <div id="additionalEldritchInvocationSection8" style="display: none;">
            <label for="invocation8">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 12):</label>
            <select id="invocation8" name="invocation8" class="dropdown"></select>
        </div>
        <div id="additionalEldritchInvocationSection9" style="display: none;">
            <label for="invocation9">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 15):</label>
            <select id="invocation9" name="invocation9" class="dropdown"></select>
        </div>
        <div id="additionalEldritchInvocationSection10" style="display: none;">
            <label for="invocation10">${elements.chooseInvocationLabel || 'Wähle eine Anrufung'} (${elements.levelLabel2} 18):</label>
            <select id="invocation10" name="invocation10" class="dropdown"></select>
        </div>	 
    	    `,
            skillCount: 2
        },
        "wizard": {
            data: wizardClassData,
            subclasses: subclassListWizard,
            dynamicContent1: `
                <h3>${translations[currentLang].scholarLabel}</h3>
                <label for="expertise1">${elements.chooseExpertiseLabel} (${elements.levelLabel2} 1):</label>
                <select id="expertise1" name="expertise1" class="dropdown">
                    <!-- Optionen werden dynamisch basierend auf den gewählten skills hinzugefügt -->
                </select>
            `,
            skillCount: 2
        }
    };

    const classInfo = classOptions[className.toLowerCase()];

    if (!classInfo) {
        console.error("Class data not found for", className);
        return;
    }

    const { data: classData, subclasses: subclassList, dynamicContent1, dynamicContent2, dynamicContent3, dynamicContent4} = classInfo;

    // Skills generieren
    const level1Data = classData.find(data => data.level === 1 && Array.isArray(data.skillCategoryNumber));
    const skills = level1Data ? createSkillOptions(level1Data.skillCategoryNumber) : '';

    // Setzen der Skill-Optionen
    skill1Select.innerHTML = `<option value="">${elements.pleaseSelectLabel}</option>` + skills;
    skill2Select.innerHTML = `<option value="">${elements.pleaseSelectLabel}</option>` + skills;

    // Entferne vorherige zusätzliche Skill-Dropdowns und Labels, falls vorhanden
    const skill3Label = document.getElementById("skill3Label");
    const skill3Select = document.getElementById("skill3");
    if (skill3Label) skill3Label.remove();
    if (skill3Select) skill3Select.remove();

    const skill4Label = document.getElementById("skill4Label");
    const skill4Select = document.getElementById("skill4");
    if (skill4Label) skill4Label.remove();
    if (skill4Select) skill4Select.remove();

    const skill0Label = document.getElementById("skill0Label");
    const skill0Select = document.getElementById("skill0");
    if (skill0Label) skill0Label.remove();
    if (skill0Select) skill0Select.remove();

    // Passe die Anzahl der Dropdown-Listen für Skills an
    if (classInfo.skillCount >= 3) {
        const skill3Label = document.createElement("label");
        skill3Label.id = "skill3Label";
        skill3Label.setAttribute("for", "skill3");
        skill3Label.innerText = `${elements.chooseSkillLabel} (${elements.levelLabel2} 1):`;
        document.querySelector(".class-section").appendChild(skill3Label);

        const skill3Select = document.createElement("select");
        skill3Select.id = "skill3";
        skill3Select.name = "skill3";
        skill3Select.className = "dropdown";
        skill3Select.innerHTML = `<option value="">${elements.pleaseSelectLabel}</option>` + skills;
        skill3Select.setAttribute("onchange", "updateSkills()");
        document.querySelector(".class-section").appendChild(skill3Select);
    }

    if (classInfo.skillCount === 4) {
        const skill4Label = document.createElement("label");
        skill4Label.id = "skill4Label";
        skill4Label.setAttribute("for", "skill4");
        skill4Label.innerText = `${elements.chooseSkillLabel} (${elements.levelLabel2} 1):`;
        document.querySelector(".class-section").appendChild(skill4Label);

        const skill4Select = document.createElement("select");
        skill4Select.id = "skill4";
        skill4Select.name = "skill4";
        skill4Select.className = "dropdown";
        skill4Select.innerHTML = `<option value="">${elements.pleaseSelectLabel}</option>` + skills;
        skill4Select.setAttribute("onchange", "updateSkills()");
        document.querySelector(".class-section").appendChild(skill4Select);
    }

    // Berücksichtige die Primal Knowledge Auswahl für den Barbaren
    if (className.toLowerCase() === "barbarian" && character.level >= 3) {
        const skill0Label = document.createElement("label");
        skill0Label.id = "skill0Label";
        skill0Label.setAttribute("for", "skill0");
        skill0Label.innerText = `${elements.primalKnowledge} - ${elements.chooseSkillLabel} (${elements.levelLabel} 3):`;
        document.querySelector(".class-section").appendChild(skill0Label);

        const skill0Select = document.createElement("select");
        skill0Select.id = "skill0";
        skill0Select.name = "skill0";
        skill0Select.className = "dropdown";
        skill0Select.innerHTML = `<option value="">${elements.pleaseSelectLabel}</option>` + skills;
        skill0Select.setAttribute("onchange", "updateSkills()");
        document.querySelector(".class-section").appendChild(skill0Select);
    }

    // Dynamische Inhalte anwenden
    if (dynamicClassSection1) {
        dynamicClassSection1.innerHTML = dynamicContent1 || '';
        displayClassSectionsBasedOnLevel(character.level);
        populateExpertiseOptions();
    }
    if (dynamicClassSection2) {
        dynamicClassSection2.innerHTML = dynamicContent2 || '';
        displayClassSectionsBasedOnLevel(character.level);
    }
    if (dynamicClassSection3) {
        dynamicClassSection3.innerHTML = dynamicContent3 || '';
        displayClassSectionsBasedOnLevel(character.level);
    }
    if (dynamicClassSection4) {
        dynamicClassSection4.innerHTML = dynamicContent4 || '';
        displayClassSectionsBasedOnLevel(character.level);
    }

    // Subklassen-Optionen anzeigen
    subclassOptionsDiv.innerHTML = subclassList.map(subclass => {
        const label = translations[currentLang][subclass.translationLabel] || subclass.translationLabel;
        return `
            <label>
                <input type="radio" name="subclass" value="${subclass.subclassCategoryNumber}"> ${label}
            </label>
        `;
    }).join('');

    // Event-Listener für primalOrder (Druide) und devineOrder (Kleriker)
    const dynamicSections = document.getElementById('dynamicClassSection1');
    if (dynamicSections) {
        dynamicSections.addEventListener('change', function(event) {
            // Prüfen, ob eines unserer Dropdowns geändert wurde
            if (event.target.matches('#divineOrder1, #primalOrder1')) {
                handleOrderSelection(event.target);
            }
        });
    }

    // Event-Listener für Monk-Radioinputs
        document.getElementById("monkInstrumentRadio")?.addEventListener('change', updateMonkDropdown);
        document.getElementById("monkToolRadio")?.addEventListener('change', updateMonkDropdown);

    // Event-Listener für das spezielle "Fighting Style"-Dropdown wie Blessed Warrior und Druidic Warrior
    const fightingStyleSelect = document.getElementById('feat1');
    if (fightingStyleSelect) {
        fightingStyleSelect.addEventListener('change', function() {
            const featID = parseInt(this.value, 10);
            // Dies ist ein Merkmal von Stufe 2, daher geben wir die 2 fest vor
            updateFeatDynamicContent(featID, 2, this);
            updateFeatInfoBox();
            toggleInfoBox('feat-info-box-container', true);
        });
    }

    // Event-Listener für Warlock - Eldritch Invocation
    if (character.class.toLowerCase() === 'warlock') {
        updateInvocationDropdowns(); // Initiales Füllen und Synchronisieren
        document.querySelectorAll('select[id^="invocation"]').forEach(select => {
            // Verhindert doppelte Listener
            select.removeEventListener('change', updateInvocationDropdowns); 
            select.addEventListener('change', updateInvocationDropdowns);
        });
    }

    // Event-Listener für die Subklassen
	document.querySelectorAll('input[name="subclass"]').forEach(input => {
    	input.addEventListener('change', () => {
        // Sicherstellen, dass die Variable deklariert und initialisiert ist
        const selectedSubclassNumber = parseInt(input.value, 10);
        console.log("Subclass changed:", selectedSubclassNumber);

        // Rufe die Funktion auf, um die Feat-Optionen zu aktualisieren
        populateAbilityImprovementOptions(getClassData(character.class.toLowerCase(), "class"), character.level);
        
        // Aktualisiere die Subklasseninhalte und Details
        updateSubclassDynamicContent(selectedSubclassNumber, character.level);
        showSubclassDetails(selectedSubclassNumber);

    // Initialisiere Event-Listener für Dropdowns
    updateSkills();
    setupFeatSelection()

        });
    });

    // Erstelle einmalig die Container für alle möglichen Fähigkeitsverbesserungen
    const asiContainer = document.getElementById("abilityImprovementOptionsContainer");
    if (asiContainer) {
        asiContainer.innerHTML = ''; // Leere nur zur Sicherheit beim Klassenwechsel
        const asiFeatures = classInfo.data.filter(feature => 
            feature.translationLabel === "asiAndFeat" || feature.translationLabel === "epicBoon"
        );
        
        asiFeatures.forEach(feature => {
            const featLevel = feature.level;
            const improvementDiv = document.createElement('div');
            // WICHTIG: Gib jedem Container eine einzigartige ID
            improvementDiv.id = `improvement-option-${featLevel}`;
            improvementDiv.className = 'improvement-option';
            improvementDiv.style.display = 'none'; // Standardmäßig unsichtbar

            const allowedFeatCategories = [1, 2, 3, 4]; 

            improvementDiv.innerHTML = `
                <label for="feats${featLevel}">${elements.chooseFeatLabel} (${elements.levelLabel2} ${featLevel}):</label>
                <select id="feats${featLevel}" name="feats${featLevel}" class="dropdown">
                    <option value="">${elements.pleaseSelectLabel}</option>
                    ${createFeatOptions(20, allowedFeatCategories)}
                </select>
            `;
            asiContainer.appendChild(improvementDiv);

            // Füge den Event Listener direkt hier hinzu
            improvementDiv.querySelector('select').addEventListener('change', function() {
                const featID = parseInt(this.value, 10);
                updateFeatDynamicContent(featID, featLevel, this);

            // Weapon Master
    	    if (typeof refreshAllWeaponMasterDropdowns === "function") refreshAllWeaponMasterDropdowns();

	    // Taltentz (feat)-Infobox
            if (isFeatInfoBoxActive) {
            updateFeatInfoBox();
            } else {
            // Optional: Box automatisch öffnen, wenn ein Talent gewählt wird
            toggleInfoBox('feat-info-box-container', true);
	    }
            });
        });
    }

    // Die Funktion displayClassSectionsBasedOnLevel wird weiterhin aufgerufen,
    // aber populateAbilityImprovementOptions darin hat jetzt eine neue, einfachere Aufgabe.
    displayClassSectionsBasedOnLevel(character.level); 
}

// Für Duide und Kleriker
function handleOrderSelection(selectElement) {
    const selectionValue = parseInt(selectElement.value, 10);
    const elements = translations[currentLang];
    
    // Finde den Container, in dem die Info angezeigt werden soll
    let infoContainer = selectElement.parentNode.querySelector('.order-selection-info');
    if (!infoContainer) {
        infoContainer = document.createElement('div');
        infoContainer.className = 'order-selection-info feat-content'; // feat-content für konsistentes Styling
        selectElement.parentNode.appendChild(infoContainer);
    }
    infoContainer.innerHTML = ''; // Alten Inhalt leeren

    if (!selectionValue) return; // Beenden, wenn "Bitte wählen" ausgewählt ist

    // Bestimme, welche Liste wir durchsuchen müssen (Kleriker oder Druide)
    const listToSearch = selectElement.id === 'divineOrder1' ? divineOrderCategoryList : primalOrderCategoryList;
    const selectionData = listToSearch.find(item => item[Object.keys(item)[0]] === selectionValue);

    if (!selectionData) return;

    let bonusHTML = '';

    // Fall 1: Die Auswahl gewährt Zauber
    if (selectionData.takeChoice === 4) {
        const magicNote = elements.magicFeatNotice || "Du erlernst Zauber (Auswahl erfolgt in Schritt 7)";
        const formattedNote = magicNote.replace(/\n/g, '<br>');
        bonusHTML += `<p class="magic-feat-notice">${formattedNote}</p>`;
    }

    // Fall 2: Die Auswahl gewährt Rüstungs-Übung
    if (selectionData.Get_armorCategoryNumber && selectionData.Get_armorCategoryNumber !== 0) {
        const armorCats = Array.isArray(selectionData.Get_armorCategoryNumber) ? selectionData.Get_armorCategoryNumber : [selectionData.Get_armorCategoryNumber];
        bonusHTML += `<p class="granted-proficiency-header">${elements.armorTrainingLabel || 'Rüstungstraining'}:</p>`;
        const grantedList = armorCats.map(catNum => {
            const category = armorCategory.find(ac => ac.armorCategoryNumber === catNum);
            return category ? `<li>+ ${elements[category.translationLabel] || category.translationLabel}</li>` : '';
        }).join('');
        bonusHTML += `<ul class="granted-proficiency-list">${grantedList}</ul>`;
    }

    // Fall 3: Die Auswahl gewährt Waffen-Übung
    if (selectionData.Get_weaponCategoryNumber && selectionData.Get_weaponCategoryNumber !== 0) {
        const weaponCats = Array.isArray(selectionData.Get_weaponCategoryNumber) ? selectionData.Get_weaponCategoryNumber : [selectionData.Get_weaponCategoryNumber];
        bonusHTML += `<p class="granted-proficiency-header">${elements.weaponTrainingLabel || 'Waffentraining'}:</p>`;
        const grantedList = weaponCats.map(catNum => {
            const category = weaponCategory.find(wc => wc.weaponCategoryNumber === catNum);
            return category ? `<li>+ ${elements[category.translationLabel] || category.translationLabel}</li>` : '';
        }).join('');
        bonusHTML += `<ul class="granted-proficiency-list">${grantedList}</ul>`;
    }

    infoContainer.innerHTML = bonusHTML;
}

function updateMonkDropdown() {
    const monkDropdownContainer = document.getElementById("monkDropdownContainer");
    const monkInstrumentRadio = document.getElementById("monkInstrumentRadio");
    const monkToolRadio = document.getElementById("monkToolRadio");

    // Stellen Sie sicher, dass die Übersetzungen verfügbar sind
    const elements = translations[currentLang]; 

    if (!monkDropdownContainer || !monkInstrumentRadio || !monkToolRadio) {
        console.error("Radio buttons or dropdown container not found");
        return;
    }

    monkDropdownContainer.innerHTML = ''; // Vorherigen Inhalt löschen

    if (monkInstrumentRadio.checked || monkToolRadio.checked) {
        const labelElement = document.createElement('label');
        labelElement.innerText = `${elements.chooseOptionLabel} (${elements.levelLabel2} 1):`; // Text mit Stufe

        const selectElement = document.createElement('select');
        selectElement.className = 'dropdown';

        if (monkInstrumentRadio.checked) {
            selectElement.id = 'instrument1';
            selectElement.name = 'instrument1';
            selectElement.innerHTML = `<option value="">${elements.pleaseSelectLabel}</option>` + createInstrumentOptions();
        } else if (monkToolRadio.checked) {
            selectElement.id = 'tool1';
            selectElement.name = 'tool1';
            selectElement.innerHTML = `<option value="">${elements.pleaseSelectLabel}</option>` + createToolOptions([1,3]);
        }

        monkDropdownContainer.appendChild(labelElement); // Fügen Sie das Label hinzu
        monkDropdownContainer.appendChild(selectElement);
    }
}

function createWeaponOptions(allowedCategories, allowedProperties) {
    const elements = translations[currentLang];
    
    return weaponList
        .filter(weapon => {
            // 1. GRUND-PRÜFUNG: Ist die Kategorie erlaubt?
            const categoryMatch = allowedCategories.includes(weapon.weaponCategoryNumber);
            
            // Wenn die Kategorie gar nicht passt, ist die Waffe raus.
            if (!categoryMatch) return false;

            // 2. SONDERREGEL EINFACHE WAFFEN (Kategorie 1 & 2)
            // Wenn die Kategorie passt (wurde oben geprüft) und es eine einfache Waffe ist,
            // ist sie erlaubt - egal welche Properties sie hat.
            if (weapon.weaponCategoryNumber === 1 || weapon.weaponCategoryNumber === 2) {
                return true;
            }

            // 3. FEIN-PRÜFUNG NUR FÜR KRIEGSWAFFEN (Kategorie 3 & 4)
            
            // Fall A: Keine Einschränkungen definiert (allowedProperties ist 0, null oder leer)
            // Das ist z.B. beim Fighter der Fall -> Alle Kriegswaffen erlaubt.
            if (!allowedProperties || allowedProperties === 0 || (Array.isArray(allowedProperties) && allowedProperties.length === 0)) {
                return true;
            }

            // Fall B: Einschränkungen vorhanden (z.B. Rogue -> [Finesse, Light])
            // Wir müssen prüfen, ob die Waffe eine der erlaubten Eigenschaften hat.
            const weaponProps = Array.isArray(weapon.weaponPropertyCategoryNumber) 
                ? weapon.weaponPropertyCategoryNumber 
                : (weapon.weaponPropertyCategoryNumber ? [weapon.weaponPropertyCategoryNumber] : []);
            
            // Da allowedProperties meist ein Array ist, sicherstellen:
            const validProps = Array.isArray(allowedProperties) ? allowedProperties : [allowedProperties];

            // Hat die Waffe eine passende Eigenschaft?
            const propertyMatch = weaponProps.some(p => validProps.includes(p));

            return propertyMatch;
        })
        .map(weapon => {
            const weaponName = elements[weapon.translationLabel] || weapon.translationLabel;
            
            // Meisterschafts-Namen holen
            let masteryName = "Unknown";
            if (typeof weaponMastery !== 'undefined') {
                const mastery = weaponMastery.find(m => m.weaponMasteryCategoryNumber === weapon.weaponMasteryCategoryNumber);
                if (mastery) {
                    masteryName = elements[mastery.translationLabel] || mastery.translationLabel;
                }
            }
            
            return `<option value="${weapon.ID}">${weaponName} (${masteryName})</option>`;
        })
        .join('');
}

function getCurrentWeaponProficiencies() {
    const charClass = character.class ? character.class.toLowerCase() : null;
    const baseTraits = classCoreTraitsList.find(c => c.translationLabel === charClass);
    
    // Startwerte aus der Basis-Klasse (z.B. Schurke: [1, 2, 3, 4] und [1, 2])
    let currentCategories = baseTraits ? [...baseTraits.weaponCategoryNumber] : [1, 2];
    let currentProperties = baseTraits ? [...baseTraits.weaponPropertyCategoryNumber] : [1, 2, 3, 4, 5, 6, 7, 8, 9];

    // 1. Kleriker Prüfung (Divine Order)
    const divineOrderSelect = document.getElementById('divineOrder1');
    if (charClass === 'cleric' && divineOrderSelect && divineOrderSelect.value === "1") {
        currentCategories.push(3, 4);
        // Kleriker haben keine Eigenschafts-Beschränkung, daher hier das Upgrade auf alle erlaubt
        currentProperties = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }

    // 2. Druide Prüfung (Primal Order)
    const primalOrderSelect = document.getElementById('primalOrder1');
    if (charClass === 'druid' && primalOrderSelect && primalOrderSelect.value === "2") {
        currentCategories.push(3, 4);
        currentProperties = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }

    // 3. Talent Prüfung (Martial Weapon Training - ID 31)
    const allFeatSelects = document.querySelectorAll('select[name^="feats"]');
    allFeatSelects.forEach(select => {
        if (select.value === "31") { 
            // KORREKTUR: Wir fügen NUR die Kategorien 3 und 4 (Kriegswaffen) hinzu.
            currentCategories.push(3, 4);
            
            // WICHTIG: Wir fassen currentProperties NICHT an! 
            // Ein Schurke behält so seine [1, 2] (Leicht/Finesse).
            // Ein Kämpfer behält seine [1-9] (Alles).
        }
    });

    return {
        categories: [...new Set(currentCategories)],
        properties: [...new Set(currentProperties)]
    };
}

function createInstrumentOptions() {
    const elements = translations[currentLang];
    return instrumentList.map(instrument => {
        const instrumentName = elements[instrument.translationLabel] || instrument.translationLabel;
        return `<option value="${instrument.instrumentCategoryNumber}">${instrumentName}</option>`;
    }).join('');
}

function createGameOptions() {
    const elements = translations[currentLang];
    return gameList.map(game => {
        const gameName = elements[game.translationLabel] || game.translationLabel;
        return `<option value="${game.gameCategoryNumber}">${gameName}</option>`;
    }).join('');
}

function createLangOptions(allowedCategories) {
    const elements = translations[currentLang];
    return languageList
     .filter(language => allowedCategories.includes(language.languageCategoryNumber))
     .map(language => {
        const languageName = elements[language.translationLabel] || language.name;
        return `<option value="${language.languageCategoryNumber}">${languageName}</option>`;
    }).join('');
}

function createManeuverOptions(maneuverCategoryNumbers) {
    const elements = translations[currentLang];
    return maneuverCategoryList
        .filter(maneuver => maneuverCategoryNumbers.includes(maneuver.maneuverCategoryNumber))
        .map(maneuver => {
            const maneuverName = elements[maneuver.translationLabel] || maneuver.translationLabel;
            return `<option value="${maneuver.maneuverCategoryNumber}">${maneuverName}</option>`;
        })
        .join('');
}

function createToolOptions(categoryNumbers) {
    const elements = translations[currentLang];
    return toolList
        .filter(tool => categoryNumbers.includes(tool.toolCategoryNumber))
        .map(tool => {
            const toolName = elements[tool.translationLabel] || tool.translationLabel;
            return `<option value="${tool.ID}">${toolName}</option>`;
        })
        .join('');
}

function createAbilityOptions(attributeLabels) {
    const elements = translations[currentLang];
    return attributeList
        .filter(attr => attributeLabels.includes(attr.translationLabel))
        .map(attr => {
            const attributeName = elements[attr.translationLabel] || attr.translationLabel;
            // Der Wert ist hier das Label selbst, um es einfacher zu speichern
            return `<option value="${attr.translationLabel}">${attributeName}</option>`;
        })
        .join('');
}

function createSavingThrowOptions(categoryNumbers) {
    const elements = translations[currentLang];

    // Finden Sie die ausgewählte Klasse in der classCoreTraitsList
    const classData = classCoreTraitsList.find(cls => cls.translationLabel.toLowerCase() === character.class.toLowerCase());

    if (!classData) {
        console.error("Klasse nicht gefunden:", character.class);
        return '';
    }

    // Extrahieren Sie die vorhandenen savingThrowProficiencies
    const baseProficiencies = classData.savingThrowProficiencies || [];
    const existingProficiencies = [...baseProficiencies, ...classSavingThrowProficiencies];

    // Filtern Sie die attributeList, um nur die nicht vorhandenen Proficiencies anzuzeigen
    return attributeList
        .filter(attribute => categoryNumbers.includes(attribute.ID) && !existingProficiencies.includes(attribute.translationLabel))
        .map(attribute => {
            const attributeName = elements[attribute.translationLabel] || attribute.translationLabel;
            return `<option value="${attribute.ID}">${attributeName}</option>`;
        })
        .join('');
}

function createEnergyMasteryOptions() {
    const elements = translations[currentLang];
    return energyMasteryCategoryList.map(energyMastery => {
        const energyMasteryName = elements[energyMastery.translationLabel] || energyMastery.translationLabel;
        return `<option value="${energyMastery.energyMasteryCategoryNumber}">${energyMasteryName}</option>`;
    }).join('');
}

function createDivineOrderOptions() {
    const elements = translations[currentLang];
    return divineOrderCategoryList.map(divineOrder => {
        const divineOrderName = elements[divineOrder.translationLabel] || divineOrder.translationLabel;
        return `<option value="${divineOrder.divineOrderCategoryNumber}">${divineOrderName}</option>`;
    }).join('');
}

function createBlessedStrikesOptions() {
    const elements = translations[currentLang];
    return blessedStrikesCategoryList.map(blessedStrikes => {
        const blessedStrikesName = elements[blessedStrikes.translationLabel] || blessedStrikes.translationLabel;
        return `<option value="${blessedStrikes.blessedStrikesCategoryNumber}">${blessedStrikesName}</option>`;
    }).join('');
}

function createPrimalOrderOptions() {
    const elements = translations[currentLang];
    return primalOrderCategoryList.map(primalOrder => {
        const primalOrderName = elements[primalOrder.translationLabel] || primalOrder.translationLabel;
        return `<option value="${primalOrder.primalOrderCategoryNumber}">${primalOrderName}</option>`;
    }).join('');
}

function createElementalFuryOptions() {
    const elements = translations[currentLang];
    return elementalFuryCategoryList.map(elementalFury => {
        const elementalFuryName = elements[elementalFury.translationLabel] || elementalFury.translationLabel;
        return `<option value="${elementalFury.elementalFuryCategoryNumber}">${elementalFuryName}</option>`;
    }).join('');
}

function createLandOptions() {
    const elements = translations[currentLang];
    return landCategoryList.map(land => {
        const landName = elements[land.translationLabel] || land.translationLabel;
        return `<option value="${land.landCategoryNumber}">${landName}</option>`;
    }).join('');
}

function createStarMapsOptions() {
    const elements = translations[currentLang];
    return starMapsList.map(starMap => {
        const starMapName = elements[starMap.translationLabel] || starMap.translationLabel;
        return `<option value="${starMap.starMapNumber}">${starMapName}</option>`;
    }).join('');
}

function createFeywildGiftsOptions() {
    const elements = translations[currentLang];
    return feywildGiftsList.map(gift => {
        const giftName = elements[gift.translationLabel] || gift.translationLabel;
        return `<option value="${gift.feywildGiftNumber}">${giftName}</option>`;
    }).join('');
}

function createMetamagicOptions() {
    const elements = translations[currentLang];
    const sorceryPointsAbbr = elements.sorceryPointsAbbr || 'ZP'; // ZP = Zaubereipunkte

    return metamagicOptionsList.map(option => {
        const optionName = elements[option.translationLabel] || option.translationLabel;
        const cost = option.sorceryPointCost;
        const displayText = `${optionName} (${cost} ${sorceryPointsAbbr})`;

        return `<option value="${option.ID}">${displayText}</option>`;
    }).join('');
}

function createManifestationsOfOrderOptions() {
    const elements = translations[currentLang];
    return manifestationsOfOrderList.map(option => {
        const optionName = elements[option.translationLabel] || option.translationLabel;
        return `<option value="${option.manifestationsOfOrderOption}">${optionName}</option>`;
    }).join('');
}

function createSpellAbilityOptions() {
    const elements = translations[currentLang];
    const allowedAttributeIDs = [4, 5, 6]; // IDs für Intelligence, Wisdom, Charisma

    return attributeList
        .filter(attribute => allowedAttributeIDs.includes(attribute.ID))
        .map(attribute => {
            const attributeName = elements[attribute.translationLabel] || attribute.translationLabel;
            return `<option value="${attribute.ID}">${attributeName}</option>`;
        })
        .join('');
}

function createSpellListOptions() {
    const elements = translations[currentLang];
    const allowedClassIDs = [3, 4, 12]; // IDs für cleric, druid, wizard

    // Sammle alle bereits ausgewählten Optionen
    const dropdowns = document.querySelectorAll('select.dropdown[name^=spellList]');
    const selectedClasses = Array.from(dropdowns).map(dropdown => dropdown.value).filter(Boolean);

    return classCoreTraitsList
        .filter(cls => allowedClassIDs.includes(cls.ID))
        .map(cls => {
            const className = elements[cls.translationLabel] || cls.translationLabel;
            const isDisabled = selectedClasses.includes(cls.ID.toString());
            return `<option value="${cls.ID}" ${isDisabled ? 'disabled' : ''}>${className}</option>`;
        })
        .join('');
}

function createDamageTypeOptions(allowedCategories = [], allowedIds = []) {
    const elements = translations[currentLang];
    
    return damageType_All
        .filter(type => {
            const categoryMatch = allowedCategories.length === 0 || allowedCategories.includes(type.damageCategory);
            const idMatch = allowedIds.length === 0 || allowedIds.includes(type.ID);
            return categoryMatch && idMatch;
        })
        .map(type => {
            const typeName = elements[type.translationLabel] || type.translationLabel;
            return `<option value="${type.ID}">${typeName}</option>`;
        })
        .join('');
}

// Eventlistener für das Dropdown hinzufügen, um die Optionen bei Änderung zu aktualisieren
document.querySelectorAll('select.dropdown[name^=spellList]').forEach(dropdown => {
    dropdown.addEventListener('change', () => {
        // Aktualisiere alle Dropdowns bei einer Änderung
        document.querySelectorAll('select.dropdown[name^=spellList]').forEach(d => {
            d.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + createSpellListOptions();
        });
    });
});

function createEldritchInvocationOptions(characterLevel, alreadySelectedInvocations = []) {
    const elements = translations[currentLang];

    // Schritt 1: Finde die 'translationLabel' ALLER bereits gewählten Invocations.
    // Das macht die Voraussetzungs-Prüfung universell und nicht nur auf "Pacts" beschränkt.
    const selectedInvocationLabels = alreadySelectedInvocations.map(selectedId => {
        const foundInvocation = eldritchInvocationOptionsList.find(inv => inv.eldritchInvocationOption == selectedId);
        return foundInvocation ? foundInvocation.translationLabel : null;
    }).filter(Boolean); // Entfernt eventuelle 'null'-Werte

    return eldritchInvocationOptionsList.map(invocation => {
        // --- Regel 1: Level-Voraussetzung ---
        const levelMet = invocation.level <= characterLevel;

        // --- Regel 2: Universelle Voraussetzungs-Prüfung ---
        let prerequisiteMet = true;
        if (invocation.prerequisite_Invocation && invocation.prerequisite_Invocation !== 0) {
            // Prüft, ob die benötigte 'translationLabel' in der Liste der bereits gewählten Labels ist.
            if (!selectedInvocationLabels.includes(invocation.prerequisite_Invocation)) {
                prerequisiteMet = false;
            }
        }

        // --- Regel 3: Einzigartigkeit (oder Wiederholbarkeit) ---
        const isAlreadySelected = alreadySelectedInvocations.includes(String(invocation.eldritchInvocationOption));
        const isSelectable = invocation.repeatable === 1 || !isAlreadySelected;

        // Gesamtergebnis: Nur wenn alle Bedingungen erfüllt sind, ist die Option wählbar.
        const isAvailable = levelMet && prerequisiteMet && isSelectable;

        // --- Erstellung des Anzeigetextes ---
        const optionName = elements[invocation.translationLabel] || invocation.translationLabel;
        let displayText = `${optionName} (${elements.levelAbbr || 'St'} ${invocation.level})`;

        // Bonus: Wenn eine Voraussetzung nicht erfüllt ist, zeige sie direkt im Text an.
        if (!prerequisiteMet && invocation.prerequisite_Invocation) {
            const prereqObject = eldritchInvocationOptionsList.find(p => p.translationLabel === invocation.prerequisite_Invocation);
            const prereqName = prereqObject ? (elements[prereqObject.translationLabel] || prereqObject.translationLabel) : '';
            if (prereqName) {
                 displayText += ` (${elements.requiredLabel || 'Benötigt'}: ${prereqName})`;
            }
        }

        return `<option value="${invocation.eldritchInvocationOption}" ${!isAvailable ? 'disabled' : ''}>
                    ${displayText}
                </option>`;
    }).join('');
}

function updateInvocationDropdowns() {
    const level = character.level || 1;
    const allInvocationSelects = Array.from(document.querySelectorAll('select[id^="invocation"]:not([id*="Feat"])'));
    if (allInvocationSelects.length === 0) return;

    const currentSelections = allInvocationSelects.map(s => s.value).filter(Boolean);

    allInvocationSelects.forEach(select => {
        const previouslySelectedValue = select.value;

        select.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` +
                           createEldritchInvocationOptions(level, currentSelections);

        select.value = previouslySelectedValue;

        const parentContainer = select.parentNode;
        const lessonsInvocation = eldritchInvocationOptionsList.find(inv => inv.translationLabel === "lessonsOfTheFirstOnesLabel");
        const existingFeatContainer = parentContainer.querySelector('.invocation-feat-selection');
        
        const isLessonsSelected = previouslySelectedValue && parseInt(previouslySelectedValue) === lessonsInvocation.eldritchInvocationOption;

        if (isLessonsSelected) {
            if (!existingFeatContainer) {
                const featContainer = document.createElement('div');
                featContainer.className = 'invocation-feat-selection';

                const label = document.createElement('label');
                label.textContent = `${translations[currentLang].chooseFeatLabel}:`;
                
                const featSelect = document.createElement('select');
                featSelect.id = `invFeat_${select.id.replace('invocation', '')}`;
                featSelect.name = 'feats2';
                featSelect.className = 'dropdown';
                featSelect.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + 
                                       createFeatOptions(level, [1]); 

                featSelect.addEventListener('change', function() {
                    const featID = parseInt(this.value, 10);
                    updateFeatDynamicContent(featID, 2, this);
                    // Der Aufruf hier ist auch nützlich, falls eine Auswahl die Optionen in *anderen* feat-dropdowns beeinflusst
                    setupFeatSelection();
                });

                featContainer.appendChild(label);
                featContainer.appendChild(featSelect);
                parentContainer.appendChild(featContainer);
            }
        } else {
            if (existingFeatContainer) {
                existingFeatContainer.remove();
            }
        }
    });

    // Rufe die Validierung für ALLE Talente auf, nachdem die UI fertig aktualisiert ist.
    setupFeatSelection();
}

function showSubclassDetails(subclassCategoryNumber) {
    const subclassDetailBox = document.getElementById("subclassDetailBox");
    const subclassImgContainer = document.getElementById("subclassImageContainer");
    
    if (!subclassDetailBox) return;

    const subclassData = getClassData(character.class.toLowerCase(), "subclass");
    const classData = getClassData(character.class.toLowerCase(), "class");
    if (!subclassData) return;

    const selectedSubclass = subclassData.find(s => s.subclassCategoryNumber == subclassCategoryNumber);

    if (selectedSubclass) {
        const elements = translations[currentLang];
        const title = elements[selectedSubclass.translationLabel] || selectedSubclass.translationLabel;
        const description = elements[selectedSubclass.subclassD] || selectedSubclass.subclassD;
        const featuresLabel = elements.subclassFeaturesLabel || "Features";

        const level = character.level || 1;
        const features = classData.filter(f => 
            f.subclassCategoryNumber === subclassCategoryNumber && f.level <= level
        ).map(f => `<li>${elements[f.translationLabel] || f.translationLabel}</li>`).join('');

        // 1. Textinhalt der Box
        subclassDetailBox.innerHTML = `
            <h3 style="text-align: center; margin-bottom: 10px; margin-top: 5px;">${title}</h3>
            <p style="font-size: 0.9em; line-height: 1.4;">${description}</p>
            <h4 style="margin-top: 15px; border-bottom: 1px solid #d4a017; padding-bottom: 3px;">${featuresLabel}</h4>
            <ul style="padding-left: 18px; font-size: 0.85em; margin-top: 8px;">${features}</ul>
        `;

        // 2. Bild in den vertikalen Container schieben
        if (subclassImgContainer) {
            subclassImgContainer.innerHTML = `<img src="images/${selectedSubclass.translationLabel}.png" alt="${title}">`;
            subclassImgContainer.style.display = "block";
        }

        // 3. UI-Status aktivieren
        document.body.classList.add('subclass-active');
        subclassDetailBox.style.display = "block";
        
        // Live-Attribute updaten (da sie jetzt unten sitzen)
        updateLiveAttributes();
    } else {
        // Aufräumen
        subclassDetailBox.style.display = "none";
        if (subclassImgContainer) subclassImgContainer.style.display = "none";
        document.body.classList.remove('subclass-active');
    }
}

function resetSubclassUI() {
    const subclassDetailBox = document.getElementById("subclassDetailBox");
    const subclassImgContainer = document.getElementById("subclassImageContainer");
    
    if (subclassDetailBox) subclassDetailBox.style.display = "none";
    if (subclassImgContainer) {
        subclassImgContainer.style.display = "none";
        subclassImgContainer.innerHTML = ""; // Bild physisch entfernen
    }
    document.body.classList.remove('subclass-active');
}

function updateSubclassDynamicContent(subclassCategoryNumber, characterLevel) {
    const classData = getClassData(character.class.toLowerCase(), "class");

    if (!classData) {
        console.error("Klasse nicht unterstützt");
        return;
    }

    const subclassInfo = classData.filter(feature => 
        feature.subclassCategoryNumber === subclassCategoryNumber && 
        feature.choiceInStep3 === 1 &&
        feature.level <= characterLevel
    );

    const dynamicSubclassContentDiv = document.getElementById("dynamicSubclassContent");
    dynamicSubclassContentDiv.innerHTML = '';

    const elements = translations[currentLang];

    subclassInfo.forEach(feature => {

	//bard
        if (feature.translationLabel === "bonusProficienciesLabel") {
            const label = elements.bonusProficienciesLabel || "Bonus-Proficiencies";
            createSelectionDropdowns(dynamicSubclassContentDiv, feature.skillCategoryNumber, label, 2, 5, "skill"); // 2 Dropdowns / "skill5", "skill6"
        }

	//druid
        if (feature.translationLabel === "circleOfTheLandSpellsLabel") {
            const label = elements.circleOfTheLandSpellsLabel || "Circle of the land Spells";
            createSelectionDropdowns(dynamicSubclassContentDiv, feature.landCategoryNumber, label, 1, 1, "land"); // "land1"
        }

        if (feature.translationLabel === "starMapLabel") {
            const label = elements.starMapLabel || "Star Map";
            
            // Schritt 1: Das Dropdown wie gewohnt erstellen lassen.
            // Der startIndex "1" sorgt dafür, dass die ID "starMap1" lautet.
            createSelectionDropdowns(dynamicSubclassContentDiv, null, label, 1, 1, "starMap");

            // Schritt 2: Das gerade erstellte Dropdown über seine ID holen.
            const starMapSelect = document.getElementById('starMap1');

            // Schritt 3: Den Event-Listener direkt hier hinzufügen.
            if (starMapSelect) {
                starMapSelect.addEventListener('change', function() {
                    // Das Elternelement des Dropdowns finden
                    const parentContainer = this.parentNode;
                    
                    // Eine eventuell alte Beschreibung entfernen
                    const oldDescription = parentContainer.querySelector('.feature-description');
                    if (oldDescription) {
                        oldDescription.remove();
                    }

                    const selectedValue = parseInt(this.value, 10);
                    if (!selectedValue) return;

                    // Die Daten und den übersetzten Text finden
                    const starMapData = starMapsList.find(s => s.starMapNumber === selectedValue);
                    if (!starMapData) return;
                    const descriptionText = elements[starMapData.starMapD] || "Beschreibung nicht gefunden.";

                    // Das Beschreibungs-Element erstellen und einfügen
                    const descriptionDiv = document.createElement('div');
                    descriptionDiv.className = 'feature-description';
                    descriptionDiv.textContent = descriptionText;
                    parentContainer.insertBefore(descriptionDiv, this.nextSibling);
                });
            }
        }

	//fighter
        if (feature.translationLabel === "studentOfWarLabel") {
            const label = elements.studentOfWarLabel || "Student of War";
	    const skillPLabel = elements.skillProfAbbr || "skill prof.";
            createSelectionDropdowns(dynamicSubclassContentDiv, feature.skillCategoryNumber, `${label} (${skillPLabel})`, 1, 5, "skill"); // "skill5"
        }

        if (feature.translationLabel === "studentOfWarLabel") {
            const label = elements.studentOfWarLabel || "Student of War";
 	    const toolLabel = elements.toolProfAbbr || "tool prof.";
            createSelectionDropdowns(dynamicSubclassContentDiv, [1], `${label} (${toolLabel})`, 1, 5, "tool"); // "tool5"
        }

        if (feature.translationLabel === "combatSuperiorityLabel") {
            const label = elements.combatSuperiorityLabel || "Combat Superiority";
 	    const maneuverLabel = elements.maneuverLabel || "maneuver";
            createSelectionDropdowns(dynamicSubclassContentDiv, feature.maneuverCategoryNumber, `${label} (${maneuverLabel})`, 3, 1, "maneuver"); // "maneuver1", "maneuver2", "maneuver3"
        }

        if (feature.translationLabel === "combatSuperiority2Label") {
            const label = elements.combatSuperiority2Label || "Combat Superiority (2)";
 	    const maneuverLabel = elements.maneuverLabel || "maneuver";
            createSelectionDropdowns(dynamicSubclassContentDiv, feature.maneuverCategoryNumber, `${label} (${maneuverLabel})`, 2, 4, "maneuver"); // "maneuver4", "maneuver5"
        }

        if (feature.translationLabel === "combatSuperiority3Label") {
            const label = elements.combatSuperiority3Label || "Combat Superiority (3)";
 	    const maneuverLabel = elements.maneuverLabel || "maneuver";
            createSelectionDropdowns(dynamicSubclassContentDiv, feature.maneuverCategoryNumber, `${label} (${maneuverLabel})`, 2, 6, "maneuver"); // "maneuver6", "maneuver7"
        }

        if (feature.translationLabel === "combatSuperiority4Label") {
            const label = elements.combatSuperiority4Label || "Combat Superiority (4)";
 	    const maneuverLabel = elements.maneuverLabel || "maneuver";
            createSelectionDropdowns(dynamicSubclassContentDiv, feature.maneuverCategoryNumber, `${label} (${maneuverLabel})`, 2, 8, "maneuver"); // "maneuver8", "maneuver9"
        }

        if (feature.translationLabel === "additionalFightingStyleLabel") {
            const label = elements.additionalFightingStyleLabel || "Additional Fighting Style";
            createSelectionDropdowns(dynamicSubclassContentDiv, [3], label, 1, 7, "feats");
        }


// monk
if (feature.translationLabel === "implementsOfMercyLabel") {
    const label = elements.implementsOfMercyLabel || "Implements of Mercy";
    const skillPLabel = elements.skillProfAbbr || "skill prof.";

    // 1. Skill: Insight (ID 7) auf skill5 erzeugen, Text korrigieren und locken
    createSelectionDropdowns(dynamicSubclassContentDiv, [7], `${label} (${skillPLabel})`, 1, 5, "skill");
    const s5 = document.getElementById("skill5");
    if (s5) {
        const label5 = document.querySelector(`label[for="skill5"]`);
        if (label5) label5.innerText = `${label} (${skillPLabel}):`;
        s5.value = "7";
        s5.disabled = true;
    }

    // 2. Skill: Medicine (ID 10) auf skill6 erzeugen, Text korrigieren und locken
    createSelectionDropdowns(dynamicSubclassContentDiv, [10], `${label} (${skillPLabel})`, 1, 6, "skill");
    const s6 = document.getElementById("skill6");
    if (s6) {
        const label6 = document.querySelector(`label[for="skill6"]`);
        if (label6) label6.innerText = `${label} (${skillPLabel}):`;
        s6.value = "10";
        s6.disabled = true;
    }

    // 3. Tool: Herbalism Kit (Text-Info, linksbündig, kein Fett, mit Aufzählung)
    const toolP = document.createElement("p");
    toolP.className = "feat-content";
    toolP.style.textAlign = "left"; // Linksbündig ausrichten
    toolP.style.margin = "10px 0";  // Gleicher Abstand wie andere Elemente
    
    const toolLabelText = `${label} (${elements.toolProfAbbr || "tool"}):`;
    const toolNameText = `• ${elements.herbalismKitLabel || "Herbalism Kit"}`;
    
    toolP.innerHTML = `${toolLabelText}<br>${toolNameText}`;
    dynamicSubclassContentDiv.appendChild(toolP);
}


	//ranger
        if (feature.translationLabel === "otherworldlyGlamourLabel") {
            const label = elements.otherworldlyGlamourLabel || "Otherworldly Glamour";
	    const skillPLabel = elements.skillProfAbbr || "skill prof.";
            const allowedCategories = [5, 13, 14];  // Deception, Performance, Persuasion.
            createSelectionDropdowns(dynamicSubclassContentDiv, allowedCategories, `${label} (${skillPLabel})`, 1, 5, "skill"); // "skill5"
        }

        if (feature.translationLabel === "feyWandererSpellsLabel") {
            const label = elements.feywildGiftsLabel || "Feywild Gift";
            
            // 1. Dropdown erstellen (mit eindeutiger ID, z.B. "feywildGift1")
            createSelectionDropdowns(dynamicSubclassContentDiv, null, label, 1, 1, "feywildGift");

            // 2. Referenz auf das erstellte Dropdown holen
            const giftSelect = document.getElementById('feywildGift1');

            // 3. Event-Listener für die Beschreibung hinzufügen
            if (giftSelect) {
                giftSelect.addEventListener('change', function() {
                    const parentContainer = this.parentNode;
                    const oldDescription = parentContainer.querySelector('.feature-description');
                    if (oldDescription) {
                        oldDescription.remove();
                    }

                    const selectedValue = parseInt(this.value, 10);
                    if (!selectedValue) return;

                    const giftData = feywildGiftsList.find(g => g.feywildGiftNumber === selectedValue);
                    if (!giftData) return;
                    
                    const descriptionText = elements[giftData.feywildGiftD] || "Beschreibung nicht gefunden.";

                    const descriptionDiv = document.createElement('div');
                    descriptionDiv.className = 'feature-description';
                    descriptionDiv.textContent = descriptionText;
                    parentContainer.insertBefore(descriptionDiv, this.nextSibling);
                });
            }
        }

        if (feature.translationLabel === "clockworkSpellsLabel") {
        const label = elements.manifestationsOfOrderLabel || "Manifestation of Order";
        
        // 1. Dropdown mit dem neuen Typ "manifestation" erstellen
        createSelectionDropdowns(dynamicSubclassContentDiv, null, label, 1, 1, "manifestation");

        // 2. Referenz auf das erstellte Dropdown holen
        const manifestationSelect = document.getElementById('manifestation1');

        // 3. Event-Listener für die dynamische Beschreibung hinzufügen
        if (manifestationSelect) {
            manifestationSelect.addEventListener('change', function() {
                const parentContainer = this.parentNode;
                const oldDescription = parentContainer.querySelector('.feature-description');
                if (oldDescription) {
                    oldDescription.remove();
                }

                const selectedValue = parseInt(this.value, 10);
                if (!selectedValue) return;

                const manifestationData = manifestationsOfOrderList.find(m => m.manifestationsOfOrderOption === selectedValue);
                if (!manifestationData) return;
                
                const descriptionText = elements[manifestationData.manifestationsOfOrderD] || "Beschreibung nicht gefunden.";

                const descriptionDiv = document.createElement('div');
                descriptionDiv.className = 'feature-description'; // Verwende eine Klasse für konsistentes Styling
                descriptionDiv.textContent = descriptionText;
                // Fügt die Beschreibung direkt nach dem Dropdown ein
                parentContainer.insertBefore(descriptionDiv, this.nextSibling);
            });
        }
    }

    // rogue
    if (feature.translationLabel === "assassinsToolsLabel") {
       const label = elements.assassinsToolsLabel || "Assassin's Tools";
       const toolP = document.createElement("p");
       toolP.className = "feat-content";
       toolP.style.textAlign = "left"; 
       toolP.style.margin = "10px 0";

       const toolLabelText = `${label} (${elements.toolProfAbbr || "tool"}):`;
       const tool1 = `• ${elements.disguiseKitLabel || "Disguise Kit"}`;
       const tool2 = `• ${elements.poisonersKitLabel || "Poisoner's Kit"}`;

       toolP.innerHTML = `${toolLabelText}<br>${tool1}<br>${tool2}`;
       dynamicSubclassContentDiv.appendChild(toolP);
    }

    // sorcerer
    if (feature.translationLabel === "elementalAffinityLabel") {
       const label = elements.elementalAffinityLabel || "Elemental Affinity";
       createSelectionDropdowns(dynamicSubclassContentDiv, [4, 5, 6, 7, 8], label, 1, 1, "damageType_D");
    }

    // warlock
    if (feature.translationLabel === "fiendishResilienceLabel") {
    const label = elements.fiendishResilienceLabel || "Fiendish Resilience";
    // Alle IDs ausser 10 (Force)
    const allowedIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13]; 
    createSelectionDropdowns(dynamicSubclassContentDiv, allowedIds, label, 1, 1, "damageType_fR");
    }
	
        // Weitere Merkmale können hier hinzugefügt werden
    });

    dynamicSubclassContentDiv.style.display = subclassInfo.length > 0 ? 'block' : 'none';
}

function createSelectionDropdowns(container, categoryNumbers, label, numSelections, startIndex = 0, type = "skill") {
    const elements = translations[currentLang];
    let options;

    if (type === "skill") {
        options = createSkillOptions(categoryNumbers);
    } else if (type === "maneuver") {
        options = createManeuverOptions(categoryNumbers);
    } else if (type === "feats") {
        options = createFeatOptions(character.level, categoryNumbers);
    } else if (type === "tool") {
        options = createToolOptions(categoryNumbers);
    } else if (type === "instrument") {
        options = createInstrumentOptions();
    } else if (type === "game") {
        options = createGameOptions();
    } else if (type === "energyMastery") {
        options = createEnergyMasteryOptions();
    } else if (type === "ability") {
        options = createAbilityOptions(categoryNumbers);
    } else if (type === "attribute") {
        options = createSavingThrowOptions(categoryNumbers);
    } else if (type === "land") {
        options = createLandOptions();
    } else if (type === "starMap") {
        options = createStarMapsOptions();
    } else if (type === "feywildGift") {
        options = createFeywildGiftsOptions();
    } else if (type === "spellList") {
        options = createSpellListOptions();
    } else if (type === "manifestation") {
        options = createManifestationsOfOrderOptions();
    } else if (type === "spellAbility") {
        options = createSpellAbilityOptions();
    } else if (type === "damageType_D") { // Drachen-Schadensarten
        options = createDamageTypeOptions([], categoryNumbers); // Wir nutzen categoryNumbers hier als IDs
    } else if (type === "damageType_fR") {
    	options = createDamageTypeOptions([], categoryNumbers);
    } else if (type === "expertise") {
        // Für Expertise rufen wir `populateExpertiseOptions` auf, um das Dropdown direkt zu füllen
        // Hier setzen wir keine `options`, da die Funktion das Dropdown selbst füllt
    } else {
        console.error("Unbekannter Typ:", type);
        return;
    }
    
    for (let i = 0; i < numSelections; i++) {
        const selectLabel = document.createElement("label");
        const selectId = `${type}${startIndex + i}`;
        selectLabel.setAttribute("for", selectId);
        selectLabel.innerText = `${label} - ${elements.chooseOptionLabel}:`;
        container.appendChild(selectLabel);

        const selectElement = document.createElement("select");
        selectElement.id = selectId;
        selectElement.name = selectId;
        selectElement.className = "dropdown";
        selectElement.innerHTML = `<option value="">${elements.pleaseSelectLabel}</option>` + options;

        // console.log(`Dropdown created with ID ${selectId}`); // Debug-Ausgabe

        selectElement.addEventListener('change', () => {
        //    console.log(`${selectId} changed to ${event.target.value}`); // Debug-Ausgabe
            updateSkills();
            setupFeatSelection();
            updateLiveAttributes();
            if (type === "feats" && selectElement.value !== "") {
        	updateFeatInfoBox();
        	toggleInfoBox('feat-info-box-container', true); // Box automatisch öffnen
    	    }
        });

        container.appendChild(selectElement);
    }
}

function createAbilityScoreImprovementUI(container, featLevel) {
    const elements = translations[currentLang];
    let asiHTML = `
        <div class="asi-container" data-feat-level="${featLevel}">
            <div class="asi-header">
                <strong>${elements.distributePointsLabel || 'Punkte verteilen'}:</strong>
                <span class="points-tracker">
                    ${elements.remainingPointsLabel || 'Verbleibend'}: <span class="asi-points-remaining">2</span>
                </span>
            </div>`;

    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace('Label', '');
        const translatedName = elements[attr.translationLabel] || attr.translationLabel;
        asiHTML += `
            <div class="asi-row">
                <label>${translatedName}</label>
                <input type="number" class="asi-point-input" data-attribute="${stringId}" min="0" max="2" value="0" oninput="updateAsiPoints(event)">
            </div>`;
    });

    asiHTML += `</div>`;
    container.innerHTML = asiHTML;
}

function updateAsiPoints(event) {
    const changedInput = event.target;
    const container = changedInput.closest('.asi-container');
    const featLevel = container.dataset.featLevel;
    const inputs = Array.from(container.querySelectorAll('.asi-point-input'));
    const remainingEl = container.querySelector('.asi-points-remaining');

    let totalPoints = 0;
    inputs.forEach(input => {
        let value = parseInt(input.value, 10) || 0;
        if (value < 0) { value = 0; }
        if (value > 2) { value = 2; } // Max +2 auf ein Attribut
        input.value = value;
        totalPoints += value;
    });

    // Verhindern, dass mehr als 2 Punkte vergeben werden
    if (totalPoints > 2) {
        const overage = totalPoints - 2;
        changedInput.value = parseInt(changedInput.value, 10) - overage;
        totalPoints = 2;
    }

    // Anzeige aktualisieren
    remainingEl.textContent = 2 - totalPoints;

    // Temporäre Auswahl für die Echtzeit-Berechnung im character-Objekt speichern
    if (!character.featSelections[featLevel]) {
        character.featSelections[featLevel] = {};
    }
    character.featSelections[featLevel].asiChoices = {}; // Bisherige ASI-Wahl für dieses Level zurücksetzen
    inputs.forEach(input => {
        const value = parseInt(input.value, 10) || 0;
        if (value > 0) {
            const attributeId = input.dataset.attribute;
            character.featSelections[featLevel].asiChoices[attributeId] = value;
        }
    });

    // Live-Anzeige aktualisieren
    updateLiveAttributes();
}

function handleFeatAbilityChange(selectElement) {
    const level = selectElement.dataset.featLevel;
    const selectedAbility = selectElement.value;

    // Stelle sicher, dass das Speicherobjekt existiert
    if (!character.featSelections[level]) {
        character.featSelections[level] = {};
    }
    
    // Speichere die Auswahl
    character.featSelections[level].attributeChoice = selectedAbility;
    
    // Aktualisiere die Live-Anzeige
    updateLiveAttributes();
}

function updateFeatDynamicContent(featID, featLevel, selectElement) {

    const featContentContainer = selectElement.parentNode;

    // Entferne den bestehenden Inhalt für das spezifische Feat-Level
    const existingFeatContent = selectElement.parentNode.querySelector(`.feat-content[data-feat-level="${featLevel}"]`);
    if (existingFeatContent) {
        existingFeatContent.remove();
    }

    if (character.featSelections[featLevel]) {
        delete character.featSelections[featLevel].attributeChoice;
        delete character.featSelections[featLevel].asiChoices;
        // Hier könnten später weitere zu löschende Eigenschaften hinzukommen.
    }

    const feat = featList.find(f => f.ID === featID);
    const elements = translations[currentLang];

    if (!feat) {
    updateLiveAttributes();
        return;
    }

    const label = translations[currentLang][feat.translationLabel] || feat.translationLabel;
    const featContentDiv = document.createElement('div');
    featContentDiv.className = 'feat-content';
    featContentDiv.dataset.featLevel = featLevel;

    const attributeExceptions = ["resilientLabel", "abilityScoreImprovementLabel"];

    if (feat.Get_attrImprovement && Array.isArray(feat.Get_attrImprovement) && !attributeExceptions.includes(feat.translationLabel)) {
        const abilities = feat.Get_attrImprovement;
        
        // Fall 1: Nur ein Attribut kann erhöht werden -> Feste Anzeige
        if (abilities.length === 1) {
            const attrLabel = abilities[0];
            const attribute = attributeList.find(a => a.translationLabel === attrLabel);
            if (attribute) {
                const translatedName = elements[attribute.translationLabel] || attrLabel;
                featContentDiv.innerHTML += `<p><strong>+1 ${translatedName}</strong></p>`;
                if (!character.featSelections[featLevel]) character.featSelections[featLevel] = {};
                character.featSelections[featLevel].attributeChoice = attrLabel;
            }
        }
        // Fall 2: Mehrere Attribute stehen zur Auswahl -> Dropdown erstellen
        else if (abilities.length > 1) {
            const dropdownId = `feat-ability-choice-${featLevel}`;
            const dropdownHTML = `
                <label for="${dropdownId}">${elements.chooseAbilityLabel || 'Wähle ein Attribut'} (+1):</label>
                <select id="${dropdownId}"
                        class="dropdown feat-ability-dropdown" 
                        data-feat-level="${featLevel}" 
                        onchange="handleFeatAbilityChange(this)">
                    <option value="">${elements.pleaseSelectLabel}</option>
                    ${createAbilityOptions(abilities)}
                </select>
            `;
            featContentDiv.innerHTML += dropdownHTML;
        }
    }

    // --- SPEZIALFALL: "RESILIENT" (DEINE BESTEHENDE LOGIK) ---
    // Dieser Block wird nur für das Talent "resilientLabel" ausgeführt.
    if (feat.translationLabel === "resilientLabel") {
        const attributeIDs = [1, 2, 3, 4, 5, 6]; // IDs für alle Attribute
        createSelectionDropdowns(featContentDiv, attributeIDs, elements.savingThrowAttrLabel, 1, 1, "attribute");
    }

    // --- SPEZIALFALL: "ABILITY SCORE IMPROVEMENT" (PLATZHALTER) ---
    if (feat.translationLabel === "abilityScoreImprovementLabel") {
        createAbilityScoreImprovementUI(featContentDiv, featLevel);
    }

    // Füge den neuen Inhalt nur hinzu, wenn er nicht leer ist
    if (featContentDiv.innerHTML.trim() !== "") {
        featContentContainer.appendChild(featContentDiv);
    }

    // Aktualisiere immer die Live-Anzeige, um Änderungen zu reflektieren
    updateLiveAttributes();

    if (feat.Get_armorCategoryNumber && feat.Get_armorCategoryNumber !== 0) {
        const armorCats = Array.isArray(feat.Get_armorCategoryNumber) ? feat.Get_armorCategoryNumber : [feat.Get_armorCategoryNumber];
        
        featContentDiv.innerHTML += `<p class="granted-proficiency-header">${elements.armorTrainingLabel || 'Rüstungstraining'}:</p>`;
        const grantedList = armorCats.map(catNum => {
            const category = armorCategory.find(ac => ac.armorCategoryNumber === catNum);
            return category ? `<li>+ ${elements[category.translationLabel] || category.translationLabel}</li>` : '';
        }).join('');
        featContentDiv.innerHTML += `<ul class="granted-proficiency-list">${grantedList}</ul>`;
    }

    // Fall 2: Das Talent gewährt Übung mit Waffenkategorien
    if (feat.Get_weaponCategoryNumber && feat.Get_weaponCategoryNumber !== 0) {
        const weaponCats = Array.isArray(feat.Get_weaponCategoryNumber) ? feat.Get_weaponCategoryNumber : [feat.Get_weaponCategoryNumber];
        
        featContentDiv.innerHTML += `<p class="granted-proficiency-header">${elements.weaponTrainingLabel || 'Waffentraining'}:</p>`;
        const grantedList = weaponCats.map(catNum => {
            const category = weaponCategory.find(wc => wc.weaponCategoryNumber === catNum);
            return category ? `<li>+ ${elements[category.translationLabel] || category.translationLabel}</li>` : '';
        }).join('');
        featContentDiv.innerHTML += `<ul class="granted-proficiency-list">${grantedList}</ul>`;
    }

    if (feat.translationLabel === "musicianLabel") {
        createSelectionDropdowns(featContentDiv, null, elements.instrumentLabel, 3, 10, "instrument");
        selectElement.parentNode.insertBefore(featContentDiv, selectElement.nextSibling);
    }

    if (feat.translationLabel === "crafterLabel") {
        createSelectionDropdowns(featContentDiv, [3], elements.toolLabel, 3, 10, "tool");
        selectElement.parentNode.insertBefore(featContentDiv, selectElement.nextSibling);
    }

    if (feat.translationLabel === "elementalAdeptLabel") {
        createSelectionDropdowns(featContentDiv, null, elements.energyMasteryLabel, 1, currentEnergyIndex++, "energyMastery");
        selectElement.parentNode.insertBefore(featContentDiv, selectElement.nextSibling);
    }

    if (feat.translationLabel === "magicInitiateLabel") {
        createSelectionDropdowns(featContentDiv, null, elements.spellListLabel, 1, currentSpellListIndex++, "spellList");
        selectElement.parentNode.insertBefore(featContentDiv, selectElement.nextSibling);

        createSelectionDropdowns(featContentDiv, null, elements.spellcastingAbilityLabel, 1, currentSpellAbilityIndex++, "spellAbility");
        selectElement.parentNode.insertBefore(featContentDiv, selectElement.nextSibling);
    }

    if (feat.translationLabel === "skilledLabel") {
        for (let i = 0; i < 3; i++) {
            const radioContainer = document.createElement('div');
            radioContainer.className = 'radio-container';

            const skillRadio = document.createElement('input');
            skillRadio.type = 'radio';
            skillRadio.name = `proficiency${featLevel}_${i}`;
            skillRadio.value = 'skill';
            skillRadio.id = `skillRadio${featLevel}_${i}`;

            const skillLabel = document.createElement('label');
            skillLabel.setAttribute('for', skillRadio.id);
            skillLabel.innerText = elements.skillProfAbbr;

            const toolRadio = document.createElement('input');
            toolRadio.type = 'radio';
            toolRadio.name = `proficiency${featLevel}_${i}`;
            toolRadio.value = 'tool';
            toolRadio.id = `toolRadio${featLevel}_${i}`;

            const toolLabel = document.createElement('label');
            toolLabel.setAttribute('for', toolRadio.id);
            toolLabel.innerText = elements.toolProfAbbr;

            radioContainer.appendChild(skillRadio);
            radioContainer.appendChild(skillLabel);
            radioContainer.appendChild(toolRadio);
            radioContainer.appendChild(toolLabel);

            // Container für das Dropdown-Menü
            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'dropdown-container';

            featContentDiv.appendChild(radioContainer);
            featContentDiv.appendChild(dropdownContainer);

            const createOrReplaceDropdown = (type, categories) => {
                dropdownContainer.innerHTML = '';
                let startIndex;
                if (type === "skill") {
                    startIndex = currentSkillIndex++;
                } else if (type === "tool") {
                    startIndex = currentToolIndex++;
                }
                createSelectionDropdowns(dropdownContainer, categories, label, 1, startIndex, type, i);
                console.log(`Dropdown erstellt mit ID: Index${startIndex}`); // Konsolenausgabe für die Erstellung
            };

            skillRadio.addEventListener('change', () => {
                if (skillRadio.checked) {
                    createOrReplaceDropdown("skill", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
                    updateSkills();
                }
            });

            toolRadio.addEventListener('change', () => {
                if (toolRadio.checked) {
                    createOrReplaceDropdown("tool", [1,2,3]);
                    updateSkills();
                    dropdownContainer.querySelector('select').addEventListener('change', (event) => {
                        const toolID = parseInt(event.target.value, 10);
                        updateToolDynamicContent(toolID, event.target);
                    });
                }
            });
        }
    }

    if (feat.translationLabel === "keenMindLabel") {
        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-container';

        const skillRadio = document.createElement('input');
        skillRadio.type = 'radio';
        skillRadio.name = `proficiency${featLevel}_expert`;
        skillRadio.value = 'skill';
        skillRadio.id = `skillRadio${featLevel}_expert`;

        const skillLabel = document.createElement('label');
        skillLabel.setAttribute('for', skillRadio.id);
        skillLabel.innerText = elements.skillProfAbbr;

        const expertiseRadio = document.createElement('input');
        expertiseRadio.type = 'radio';
        expertiseRadio.name = `proficiency${featLevel}_expert`;
        expertiseRadio.value = 'expertise';
        expertiseRadio.id = `expertiseRadio${featLevel}_expert`;

        const expertiseLabel = document.createElement('label');
        expertiseLabel.setAttribute('for', expertiseRadio.id);
        expertiseLabel.innerText = 'Expertise';

        radioContainer.appendChild(skillRadio);
        radioContainer.appendChild(skillLabel);
        radioContainer.appendChild(expertiseRadio);
        radioContainer.appendChild(expertiseLabel);

        // Container für das Dropdown-Menü
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-container';

        featContentDiv.appendChild(radioContainer);
        featContentDiv.appendChild(dropdownContainer);

        const createOrReplaceDropdown = (type) => {
            dropdownContainer.innerHTML = '';
            if (type === "skill") {
                createSelectionDropdowns(dropdownContainer, [3, 6, 9, 11, 15], label, 1, 30, "skill");
                updateSkills();

            } else if (type === "expertise") {
              // Erstelle ein Label für das Expertise-Dropdown
            const expertiseLabel = document.createElement('label');
            expertiseLabel.setAttribute('for', 'expertise5');
            expertiseLabel.innerText = elements.keenMindLabel + ' - ' + elements.chooseOptionLabel +':';
            dropdownContainer.appendChild(expertiseLabel);

            // Stelle sicher, dass das Dropdown existiert, bevor es gefüllt wird
            const expertiseSelect = document.createElement('select');
            expertiseSelect.id = 'expertise5';
            expertiseSelect.name = 'expertise5';
            expertiseSelect.className = 'dropdown';
            dropdownContainer.appendChild(expertiseSelect);

            // Fülle das Dropdown mit Optionen
            populateExpertiseOptions();
            }

        };

        skillRadio.addEventListener('change', () => {
            if (skillRadio.checked) {
                createOrReplaceDropdown("skill");
            }
        });

        expertiseRadio.addEventListener('change', () => {
            if (expertiseRadio.checked) {
                createOrReplaceDropdown("expertise");
                updateSkills();
                populateExpertiseOptions();
                updateExpertiseSelections();
            }
        });
    }

    if (feat.translationLabel === "observantLabel") {
        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-container';

        const skillRadio = document.createElement('input');
        skillRadio.type = 'radio';
        skillRadio.name = `proficiency${featLevel}_expert`;
        skillRadio.value = 'skill';
        skillRadio.id = `skillRadio${featLevel}_expert`;

        const skillLabel = document.createElement('label');
        skillLabel.setAttribute('for', skillRadio.id);
        skillLabel.innerText = elements.skillProfAbbr;

        const expertiseRadio = document.createElement('input');
        expertiseRadio.type = 'radio';
        expertiseRadio.name = `proficiency${featLevel}_expert`;
        expertiseRadio.value = 'expertise';
        expertiseRadio.id = `expertiseRadio${featLevel}_expert`;

        const expertiseLabel = document.createElement('label');
        expertiseLabel.setAttribute('for', expertiseRadio.id);
        expertiseLabel.innerText = 'Expertise';

        radioContainer.appendChild(skillRadio);
        radioContainer.appendChild(skillLabel);
        radioContainer.appendChild(expertiseRadio);
        radioContainer.appendChild(expertiseLabel);

        // Container für das Dropdown-Menü
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-container';

        featContentDiv.appendChild(radioContainer);
        featContentDiv.appendChild(dropdownContainer);

        const createOrReplaceDropdown = (type) => {
            dropdownContainer.innerHTML = '';
            if (type === "skill") {
                createSelectionDropdowns(dropdownContainer, [7, 9, 12], label, 1, 31, "skill");
                updateSkills();

            } else if (type === "expertise") {
              // Erstelle ein Label für das Expertise-Dropdown
            const expertiseLabel = document.createElement('label');
            expertiseLabel.setAttribute('for', 'expertise6');
            expertiseLabel.innerText = elements.observantLabel + ' - ' + elements.chooseOptionLabel +':';
            dropdownContainer.appendChild(expertiseLabel);

            // Stelle sicher, dass das Dropdown existiert, bevor es gefüllt wird
            const expertiseSelect = document.createElement('select');
            expertiseSelect.id = 'expertise6';
            expertiseSelect.name = 'expertise6';
            expertiseSelect.className = 'dropdown';
            dropdownContainer.appendChild(expertiseSelect);

            // Fülle das Dropdown mit Optionen
            populateExpertiseOptions();
            }

        };

        skillRadio.addEventListener('change', () => {
            if (skillRadio.checked) {
                createOrReplaceDropdown("skill");
            }
        });

        expertiseRadio.addEventListener('change', () => {
            if (expertiseRadio.checked) {
                createOrReplaceDropdown("expertise");
                updateSkills();
                populateExpertiseOptions();
                updateExpertiseSelections();
            }
        });
    }
    
    if (feat.translationLabel === "skillExpertLabel") {
        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-container';

        const skillRadio = document.createElement('input');
        skillRadio.type = 'radio';
        skillRadio.name = `proficiency${featLevel}_expert`;
        skillRadio.value = 'skill';
        skillRadio.id = `skillRadio${featLevel}_expert`;

        const skillLabel = document.createElement('label');
        skillLabel.setAttribute('for', skillRadio.id);
        skillLabel.innerText = elements.skillProfAbbr;

        const expertiseRadio = document.createElement('input');
        expertiseRadio.type = 'radio';
        expertiseRadio.name = `proficiency${featLevel}_expert`;
        expertiseRadio.value = 'expertise';
        expertiseRadio.id = `expertiseRadio${featLevel}_expert`;

        const expertiseLabel = document.createElement('label');
        expertiseLabel.setAttribute('for', expertiseRadio.id);
        expertiseLabel.innerText = 'Expertise';

        radioContainer.appendChild(skillRadio);
        radioContainer.appendChild(skillLabel);
        radioContainer.appendChild(expertiseRadio);
        radioContainer.appendChild(expertiseLabel);

        // Container für das Dropdown-Menü
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'dropdown-container';

        featContentDiv.appendChild(radioContainer);
        featContentDiv.appendChild(dropdownContainer);

        const createOrReplaceDropdown = (type) => {
            dropdownContainer.innerHTML = '';
            if (type === "skill") {
                createSelectionDropdowns(dropdownContainer, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], label, 1, 22, "skill");
                updateSkills();

            } else if (type === "expertise") {
              // Erstelle ein Label für das Expertise-Dropdown
            const expertiseLabel = document.createElement('label');
            expertiseLabel.setAttribute('for', 'expertise7');
            expertiseLabel.innerText = elements.skillExpertLabel + ' - ' + elements.chooseOptionLabel +':';
            dropdownContainer.appendChild(expertiseLabel);

            // Stelle sicher, dass das Dropdown existiert, bevor es gefüllt wird
            const expertiseSelect = document.createElement('select');
            expertiseSelect.id = 'expertise7';
            expertiseSelect.name = 'expertise7';
            expertiseSelect.className = 'dropdown';
            dropdownContainer.appendChild(expertiseSelect);

            // Fülle das Dropdown mit Optionen
            populateExpertiseOptions();
            }

        };

        skillRadio.addEventListener('change', () => {
            if (skillRadio.checked) {
                createOrReplaceDropdown("skill");
            }
        });

        expertiseRadio.addEventListener('change', () => {
            if (expertiseRadio.checked) {
                createOrReplaceDropdown("expertise");
                updateSkills();
                populateExpertiseOptions();
                updateExpertiseSelections();
            }
        });
    }

    if (feat.translationLabel === "chefLabel" || feat.translationLabel === "poisonerLabel") {
        const toolLabelToFind = (feat.translationLabel === "chefLabel") ? "cooksUtensilsLabel" : "poisonersKitLabel";
        const toolData = toolList.find(t => t.translationLabel === toolLabelToFind);

        if (toolData) {
            const toolName = elements[toolData.translationLabel] || toolData.translationLabel;
            // Erzeuge eine einzigartige ID, die mit "tool" beginnt
            const dropdownId = `tool-granted-${toolData.ID}`; 

            // Erstelle ein deaktiviertes Dropdown mit dem vorausgewählten Werkzeug.
            // Weil seine ID mit "tool" beginnt, wird saveClassForm es automatisch finden.
            const dropdownHTML = `
                <div class="granted-tool-container">
                    <label for="${dropdownId}">${elements.grantedToolLabel || 'Gewährtes Werkzeug'}:</label>
                    <select id="${dropdownId}" name="${dropdownId}" class="dropdown" disabled>
                        <option value="${toolData.ID}" selected>${toolName}</option>
                    </select>
                </div>
            `;
            featContentDiv.innerHTML += dropdownHTML;
        }
    }

    // --- Logik für Weapon Master (Reaktive Waffenauswahl) ---
    if (feat.translationLabel === "weaponMasterLabel") {
        const dropdownId = `weaponMastery-feat-${featLevel}`;
        
        // Kombination der Labels
        const combinedLabel = `${elements.weaponMasteryLabel} - ${elements.chooseOptionLabel}:`;

        // WICHTIG: Hier nutzen wir += damit das Attribut-Dropdown (falls vorhanden) erhalten bleibt!
        featContentDiv.innerHTML += `
            <div class="feat-dynamic-selection" id="wrapper-${dropdownId}">
                <label for="${dropdownId}">${combinedLabel}</label>
                <select id="${dropdownId}" name="${dropdownId}" class="dropdown" data-is-weapon-master="true">
                    <option value="">${elements.pleaseSelectLabel || '-Bitte wählen-'}</option>
                </select>
            </div>
        `;

        // Funktion, die nur die OPTIONEN innerhalb des Selects aktualisiert
        const refreshWeaponOptions = () => {
            const selectEl = document.getElementById(dropdownId);
            if (!selectEl) return;

            const previousValue = selectEl.value;
            const currentProf = getCurrentWeaponProficiencies();
            const weaponOptions = createWeaponOptions(currentProf.categories, currentProf.properties);

            // Nur die inneren Optionen austauschen
            selectEl.innerHTML = `<option value="">${elements.pleaseSelectLabel || '-Bitte wählen-'}</option>` + weaponOptions;
            
            // Wert wiederherstellen
            if (previousValue && selectEl.querySelector(`option[value="${previousValue}"]`)) {
                selectEl.value = previousValue;
            }
        };

        // Initiales Füllen der Waffenliste
        setTimeout(refreshWeaponOptions, 0);

        // Markierung für den globalen Refresh-Trigger
        featContentDiv.dataset.refreshFunction = "weaponMaster";
    }

    // --- Logik für Boon of Energy Resistance (Zwei Resistenzen wählen) ---
    if (feat.translationLabel === "boonOfEnergyResistanceLabel") {
        const allowedDamageIds = [4, 5, 6, 7, 8, 9, 11, 12, 13];
        const damageOptions = createDamageTypeOptions([], allowedDamageIds);
        
        // IDs beginnen mit "damageType_B", damit saveClassForm sie erkennt
        const dropdownId1 = `damageType_B1_${featLevel}`;
        const dropdownId2 = `damageType_B2_${featLevel}`;
        
        // Das gewünschte kombinierte Label: "Schadensart - Wähle eine Option:"
        const combinedLabel = `${elements.damageTypeLabel} - ${elements.chooseOptionLabel}:`;

        const dropdownHTML = `
            <div class="feat-dynamic-selection">
                <label for="${dropdownId1}">${combinedLabel}</label>
                <select id="${dropdownId1}" name="${dropdownId1}" class="dropdown">
                    <option value="">${elements.pleaseSelectLabel || '-Bitte wählen-'}</option>
                    ${damageOptions}
                </select>

                <label for="${dropdownId2}" style="margin-top: 10px; display: block;">${combinedLabel}</label>
                <select id="${dropdownId2}" name="${dropdownId2}" class="dropdown">
                    <option value="">${elements.pleaseSelectLabel || '-Bitte wählen-'}</option>
                    ${damageOptions}
                </select>
            </div>
        `;
        featContentDiv.innerHTML += dropdownHTML;
    }

    if (feat.translationLabel === "boonOfSkillLabel") {

    // Container für das Dropdown-Menü der Skills
    const skillDropdownContainer = document.createElement('div');
    skillDropdownContainer.style.display = 'none'; // Verstecke das gesamte Skill-Dropdown-Container
    featContentDiv.appendChild(skillDropdownContainer);

    // Generiere Optionen für alle Skills
    const allSkills = skillList.map(skill => skill.skillCategoryNumber);
    const options = createSkillOptions(allSkills);

    // Simuliere die Auswahl von allen Skills für skill40 bis skill58
    for (let i = 0; i < 18; i++) {
        const skillId = `skill${40 + i}`;
        const skillSelect = document.createElement('select');
        skillSelect.id = skillId;
        skillSelect.name = skillId;
        skillSelect.className = "dropdown";
        skillSelect.innerHTML = `<option value="">${translations[currentLang].pleaseSelectLabel}</option>` + options;
        skillSelect.value = allSkills[i % allSkills.length];
        skillDropdownContainer.appendChild(skillSelect);
    }

    // Aktualisiere die Liste der ausgewählten Skills
    selectedSkills = allSkills.map(String); // Konvertiere zu Strings für Konsistenz

    console.log("Selected Skills:", selectedSkills); // Debugging-Ausgabe

    // Container für das Expertise-Dropdown
    const expertiseDropdownContainer = document.createElement('div');
    featContentDiv.appendChild(expertiseDropdownContainer);

    // Erstelle ein Label für das Expertise-Dropdown
    const expertiseLabel = document.createElement('label');
    expertiseLabel.setAttribute('for', 'expertise8');
    expertiseLabel.innerText = elements.boonOfSkillLabel + ' - ' + elements.chooseOptionLabel +':';
    expertiseDropdownContainer.appendChild(expertiseLabel);

    // Erstelle das Expertise-Dropdown
    const expertiseSelect = document.createElement('select');
    expertiseSelect.id = 'expertise8';
    expertiseSelect.name = 'expertise8';
    expertiseSelect.className = 'dropdown';
    expertiseDropdownContainer.appendChild(expertiseSelect);
}

if (feat.takeChoice === 4) {
    const magicNote = elements.magicFeatNotice || "Du erlernst spezifische Zauber\n(Details in Schritt 7).";
    
    // Wir wenden hier die gleiche Logik wie in deiner setTextContent-Funktion an:
    const formattedNote = magicNote.replace(/\n/g, '<br>');

    featContentDiv.innerHTML += `<p class="magic-feat-notice">${formattedNote}</p>`;
}

    selectElement.parentNode.insertBefore(featContentDiv, selectElement.nextSibling);
    updateSkills();

featContentDiv.querySelectorAll('select').forEach(dynamicSelect => {
    dynamicSelect.addEventListener('change', () => {
    updateSkills();
    });
});
}

function updateToolDynamicContent(toolID, selectElement) {
    // Entferne den bestehenden Inhalt für das spezifische Tool
    const elements = translations[currentLang];
    const existingToolContent = selectElement.parentNode.querySelector('.tool-content');
    if (existingToolContent) {
        existingToolContent.remove();
    }

    const dynTool = toolList.find(f => f.ID === toolID);

    if (!dynTool) {
        return;
    }

    // Überprüfen Sie, ob das Tool "musicalInstrumentLabel" ist
    if (dynTool.translationLabel === "musicalInstrumentLabel") {
        const toolContentDiv = document.createElement('div');
        toolContentDiv.className = 'tool-content';

        // Erstellen Sie Dropdowns für Instrumente
        createSelectionDropdowns(toolContentDiv, null, elements.instrumentLabel, 1, currentInstrumentIndex++, "instrument");
        console.log(`Dropdown erstellt mit ID: Index${currentInstrumentIndex}`); // Konsolenausgabe für die Erstellung
        
        // Fügen Sie das neue Element nach dem ausgewählten Element ein
        selectElement.parentNode.insertBefore(toolContentDiv, selectElement.nextSibling);
    }

    // Überprüfen Sie, ob das Tool "gamingSetLabel" ist
    if (dynTool.translationLabel === "gamingSetLabel") {
        const toolContentDiv = document.createElement('div');
        toolContentDiv.className = 'tool-content';

        // Erstellen Sie Dropdowns für Spiele
        createSelectionDropdowns(toolContentDiv, null, elements.gameLabel, 1, currentGameIndex++, "game");
        console.log(`Dropdown erstellt mit ID: Index${currentGameIndex}`); // Konsolenausgabe für die Erstellung
        
        // Fügen Sie das neue Element nach dem ausgewählten Element ein
        selectElement.parentNode.insertBefore(toolContentDiv, selectElement.nextSibling);
    }
}

// Aktualisiert die Dropdown-Listen für skills, um ausgewählte skills auszublenden
function updateSkills() {
    const skillSelects = [
        document.getElementById("skill0"), //step 5, class = barbarian, level = 3, primal Knowledge
        document.getElementById("skill1"),
        document.getElementById("skill2"),
        document.getElementById("skill3"),
        document.getElementById("skill4"),
        document.getElementById("skill5"), //step 5, subclass
        document.getElementById("skill6"), //step 5, subclass
        document.getElementById("skill7"),
        document.getElementById("skill8"),
        document.getElementById("skill9"),
        document.getElementById("skill10"), //step 5, feat = skilled
        document.getElementById("skill11"), //step 5, feat = skilled
        document.getElementById("skill12"), //step 5, feat = skilled
        document.getElementById("skill13"), //step 5, feat = skilled
        document.getElementById("skill14"), //step 5, feat = skilled
        document.getElementById("skill15"), //step 5, feat = skilled
        document.getElementById("skill16"), //step 5, feat = skilled
        document.getElementById("skill17"), //step 5, feat = skilled
        document.getElementById("skill18"), //step 5, feat = skilled
        document.getElementById("skill19"), //step 5, feat = skilled
        document.getElementById("skill20"), //step 5, feat = skilled
        document.getElementById("skill21"), //step 5, feat = skilled
        document.getElementById("skill22"), //step 5, feat = skilled
        document.getElementById("skill23"), //step 5, feat = skilled
        document.getElementById("skill24"), //step 5, feat = skilled
        document.getElementById("skill25"), //step 5, feat = skilled
        document.getElementById("skill26"), //step 5, feat = skilled
        document.getElementById("skill27"), //step 5, feat = skilled
        document.getElementById("skill28"), 
        document.getElementById("skill29"), 
        document.getElementById("skill30"), //step 5, feat = keenMind
        document.getElementById("skill31"), //step 5, feat = observant
        document.getElementById("skill32"), //step 5, feat = skillExpert
        document.getElementById("skill33"), 
        document.getElementById("skill34"), 
        document.getElementById("skill35"), 
        document.getElementById("skill36"), 
        document.getElementById("skill37"), 
        document.getElementById("skill38"), 
        document.getElementById("skill39"), 
        document.getElementById("skill40"), //step 5, feat = boon of skill
        document.getElementById("skill41"), //step 5, feat = boon of skill
        document.getElementById("skill42"), //step 5, feat = boon of skill
        document.getElementById("skill43"), //step 5, feat = boon of skill
        document.getElementById("skill44"), //step 5, feat = boon of skill
        document.getElementById("skill45"), //step 5, feat = boon of skill
        document.getElementById("skill46"), //step 5, feat = boon of skill
        document.getElementById("skill47"), //step 5, feat = boon of skill
        document.getElementById("skill48"), //step 5, feat = boon of skill
        document.getElementById("skill49"), //step 5, feat = boon of skill
        document.getElementById("skill50"), //step 5, feat = boon of skill
        document.getElementById("skill51"), //step 5, feat = boon of skill
        document.getElementById("skill52"), //step 5, feat = boon of skill
        document.getElementById("skill53"), //step 5, feat = boon of skill
        document.getElementById("skill54"), //step 5, feat = boon of skill
        document.getElementById("skill55"), //step 5, feat = boon of skill
        document.getElementById("skill56"), //step 5, feat = boon of skill
        document.getElementById("skill57"), //step 5, feat = boon of skill
        document.getElementById("skill58"), //step 5, feat = boon of skill
        document.getElementById("skill59"), //step 3, species = human, skillful
        document.getElementById("skill60"), //step 3, species = elf, keenSenses
        document.getElementById("skill61"), //step 3, species = human, versatile, feat = skilled
        document.getElementById("skill62"), //step 3, species = human, versatile, feat = skilled
        document.getElementById("skill63"), //step 3, species = human, versatile, feat = skilled
        document.getElementById("skill64"), 
        document.getElementById("skill65"), //step 2, background
        document.getElementById("skill66"), //step 2, background
        document.getElementById("skill67"), 
        document.getElementById("skill68"), 
        document.getElementById("skill69"), 
        document.getElementById("skill70"), //step 2, backgrund, feat = skilled 
        document.getElementById("skill71"), //step 2, backgrund, feat = skilled 
        document.getElementById("skill72"), //step 2, backgrund, feat = skilled 
        document.getElementById("skill73"),
        document.getElementById("skill74"),
        document.getElementById("skill75")
    ].filter(Boolean);

    // Speichere die gewählten Skills
    selectedSkills = skillSelects.map(select => select.value).filter(Boolean);

    // Deaktiviere die bereits ausgewählten skills in den anderen Dropdown-Listen
    skillSelects.forEach(select => {
        Array.from(select.options).forEach(option => {
            option.disabled = selectedSkills.includes(option.value) && option.value !== "";
        });
    });

    // Aktualisiere die Expertise-Optionen, um sie mit den gewählten Skills synchron zu halten
        populateExpertiseOptions();
        updateExpertiseSelections();
}

// Funktion zum Speichern der dynamischen Feat-Auswahlen
function saveClassForm() {

    // Stellen Sie sicher, dass classForm initialisiert ist
    if (!character.classForm) {
        character.classForm = {};
    }

    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace('Label', '');
        
        // Lese den finalen Wert aus dem LIVE-CONTAINER
        const totalScoreValue = document.getElementById(`live-${stringId}TotalScore`).value;
        
        // Schreibe ihn in die neue Eigenschaft im character-Objekt (z.B. character.strengthTotalScore)
        character[`${stringId}TotalScore`] = parseInt(totalScoreValue, 10) || 0;
        console.log(`Gesamtwert Attribut '${stringId}TotalScore' gespeichert mit Wert: ${character[`${stringId}TotalScore`]}`);
    });

    // ----- TALENT SPELLCASTING ABILITY ---- 
    // 1. Reset des Arrays für Talente
    character.spellcastingAbility_talent = [];

    // 2. Hintergrund-Talent einfügen (Schritt 2)
    if (tempBackgroundSpellcasting) {
        character.spellcastingAbility_talent.push(tempBackgroundSpellcasting);
    }

    // 3. Volks-Talent einfügen (Schritt 3 - jetzt mit neuem Namen)
    if (tempSpeciesTalentSpellcasting) {
        character.spellcastingAbility_talent.push(tempSpeciesTalentSpellcasting);
    }

    // 4. Klassen-Talente aus Schritt 6 erfassen (Schleife durch alle Dropdowns)
    const talentMagicFeats = [
        "magicInitiateLabel", "feyTouchedLabel", "ritualCasterLabel", 
        "shadowTouchedLabel", "telekineticLabel", "telepathicLabel"
    ];

    document.querySelectorAll('select[name^="feats"]').forEach(featSelect => {
        const featID = parseInt(featSelect.value, 10);
        if (!featID) return;

        const featData = featList.find(f => f.ID === featID);
        if (!featData || !talentMagicFeats.includes(featData.translationLabel)) return;

        const parentContainer = featSelect.parentNode;
        let entry = { talent: featData.translationLabel };

        if (featData.translationLabel === "magicInitiateLabel") {
            const abilityDropdown = parentContainer.querySelector('select[id^="spellAbility"]');
            const listDropdown = parentContainer.querySelector('select[id^="spellList"]');
            
            if (abilityDropdown?.value) {
                const attr = attributeList.find(a => a.ID == abilityDropdown.value);
                entry.ability = attr ? attr.translationLabel : null;
            }
            if (listDropdown?.value) {
                const classObj = classCoreTraitsList.find(c => c.ID == listDropdown.value);
                entry.spellList = classObj ? classObj.translationLabel : null;
            }
        } else {
            // Für Touched/Tele-Talente: Das gewählte +1 Attribut nutzen
            const abilityDropdown = parentContainer.querySelector('.feat-ability-dropdown');
            if (abilityDropdown?.value) {
                entry.ability = abilityDropdown.value;
            }
        }

        if (entry.ability) {
            character.spellcastingAbility_talent.push(entry);
        }
    });

    console.log("Talent-Zauber-Konfiguration:", character.spellcastingAbility_talent);


    // ----- AUSWAHL ALLER DROPDOWNS ÜBERGEBEN UND SPEICHERN ----- 

    // Sammle alle relevanten Auswahlen
    const selectedSkills = [], selectedManeuvers = [], selectedExpertises = [], selectedAttributes = [], selectedDivineOrders = [],  selectedBlessedStrikes = [];
    const selectedWeaponMasteries = [], selectedLanguages = [], selectedTools = [], selectedInstruments = [], selectedGames = [], selectedEnergyMasteries = [];
    const selectedPrimalOrders = [], selectedElementalFuries = [], selectedLands = [], selectedStarMaps = [], selectedSpellLists = [], selectedSpellcastingAbilities = [];
    const selectedFeywildGifts = [], selectedMetamagics = [], selectedManifestations = [], selectedInvocations = [], selectedDamageTypes_Dragon = [], selectedDamageTypes_fiendRes = [], selectedDamageTypes_Boon = [];

    document.querySelectorAll('select').forEach(select => {
        const value = select.value;
        if (!value) return;

        if (select.id.startsWith('skill')) {
            selectedSkills.push(value);
        } else if (select.id.startsWith('maneuver')) {
            selectedManeuvers.push(value);
        } else if (select.id.startsWith('expertise')) {
            selectedExpertises.push(value);
        } else if (select.id.startsWith('weaponMastery')) {
            selectedWeaponMasteries.push(value);
        } else if (select.id.startsWith('language')) {
            selectedLanguages.push(value);
        } else if (select.id.startsWith('tool')) {
            selectedTools.push(value);
        } else if (select.id.startsWith('instrument')) {
            selectedInstruments.push(value);
       } else if (select.id.startsWith('game')) {
            selectedGames.push(value);
        } else if (select.id.startsWith('energyMastery')) {
            selectedEnergyMasteries.push(value);
        } else if (select.id.startsWith('divineOrder')) {
            selectedDivineOrders.push(value);
        } else if (select.id.startsWith('blessedStrikes')) {
            selectedBlessedStrikes.push(value);
        } else if (select.id.startsWith('primalOrder')) {
            selectedPrimalOrders.push(value);
        } else if (select.id.startsWith('elementalFury')) {
            selectedElementalFuries.push(value);
        } else if (select.id.startsWith('land')) {
            selectedLands.push(value);
        } else if (select.id.startsWith('starMap')) {
            selectedStarMaps.push(value);
        } else if (select.id.startsWith('feywildGift')) {
            selectedFeywildGifts.push(value);
        } else if (select.id.startsWith('metamagic')) {
            selectedMetamagics.push(value);
        } else if (select.id.startsWith('manifestation')) {
            selectedManifestations.push(value);
        } else if (select.id.startsWith('invocation')) {
            selectedInvocations.push(value);              
        } else if (select.id.startsWith('attribute')) {
            selectedAttributes.push(value);
        } else if (select.id.startsWith('spellList')) {
            selectedSpellLists.push(value);
        } else if (select.id.startsWith('spellAbility')) {
            selectedSpellcastingAbilities.push(value);
        } else if (select.id.startsWith('damageType_D')) {
            selectedDamageTypes_Dragon.push(value);
        } else if (select.id.startsWith('damageType_fR')) {
            selectedDamageTypes_fiendRes.push(value);
        } else if (select.id.startsWith('damageType_B')) {
            selectedDamageTypes_Boon.push(value);
        }
    });

    const selectedSubclass = document.querySelector('input[name="subclass"]:checked')?.value || null;

// --- Automatische Tools für Druide, Schurke und Mönch ---
    // Da hier keine Auswahl getroffen wird, müssen wir die IDs manuell pushen.
    // Wir suchen die ID dynamisch anhand des Labels, um sicher zu sein.
    
    if (character.class.toLowerCase() === 'druid') {
         // Sucht nach Herbalism Kit (ID 21)
         const herbalismKit = toolList.find(t => t.translationLabel === 'herbalismKitLabel');
         if (herbalismKit) {
             selectedTools.push(herbalismKit.ID.toString());
         }
    } 
    else if (character.class.toLowerCase() === 'rogue') {
         // Sucht nach Thieves Tools (ID 25)
         const thievesTools = toolList.find(t => t.translationLabel === 'thievesToolsLabel');
         if (thievesTools) {
             selectedTools.push(thievesTools.ID.toString());
         }

         // Zusätzliche Tools für Assassin (Subklasse 2)
         if (selectedSubclass === "2") {
           const kit1 = toolList.find(t => t.translationLabel === 'disguiseKitLabel'); //Disguise Kit (ID 18)
           const kit2 = toolList.find(t => t.translationLabel === 'poisonersKitLabel'); //Poisoners Kit (ID 24)
         if (kit1) selectedTools.push(kit1.ID.toString());
         if (kit2) selectedTools.push(kit2.ID.toString());
         }
    }
    else if (character.class.toLowerCase() === 'monk' && selectedSubclass === "1") {
         // Sucht nach Herbalism Kit (ID 21)
         const herbalismKit = toolList.find(t => t.translationLabel === 'herbalismKitLabel');
         if (herbalismKit) {
             selectedTools.push(herbalismKit.ID.toString());
         }
    }

// --- Spezifische Ausrüstungswahl (für Schritt 8) ---Barde/Mönch---
    // Wir speichern hier NUR die IDs, die für die Startausrüstung (Schritt 8) relevant sind.
    // Damit trennen wir sie sauber von Tools/Instrumenten, die durch Talente kommen.
    let classEquipmentChoices = {
        instruments: [],
        tools: []
    };

    if (character.class.toLowerCase() === 'bard') {
        // Barde wählt Instrumente über instrument1, instrument2, instrument3
        ['instrument1', 'instrument2', 'instrument3'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value) classEquipmentChoices.instruments.push(el.value);
        });
    } 
    else if (character.class.toLowerCase() === 'monk') {
        // Mönch wählt ENTWEDER tool1 ODER instrument1
        const toolRadio = document.getElementById("monkToolRadio");
        const instrumentRadio = document.getElementById("monkInstrumentRadio");
        
        if (toolRadio && toolRadio.checked) {
             const el = document.getElementById('tool1');
             if (el && el.value) classEquipmentChoices.tools.push(el.value);
        } else if (instrumentRadio && instrumentRadio.checked) {
             const el = document.getElementById('instrument1');
             if (el && el.value) classEquipmentChoices.instruments.push(el.value);
        }
    }

// -----------------------------------------------------------------------

    const feats = [];
    document.querySelectorAll('select[name^="feats"]').forEach(select => {
        const level = select.name.replace('feats', '');
        if (select.value) {
            const featId = parseInt(select.value, 10);
            feats.push({ level: parseInt(level, 10), feat: featId });

            character.featSelections[level] = {
                featId: featId,
                dynamicChoices: []
            };

            // Durchsuche alle dynamischen Inhalte nach Dropdowns
            const dynamicContent = select.parentNode.querySelectorAll('.feat-content select');
            dynamicContent.forEach(dynamicSelect => {
                const selectedValue = dynamicSelect.value;
                if (selectedValue) {
                    character.featSelections[level].dynamicChoices.push({
                        id: dynamicSelect.id,
                        value: selectedValue
                    });
                }
            });

            // Speichern der Radio-Inputs
            const radioInputs = select.parentNode.querySelectorAll(`.radio-container input[type="radio"]:checked`);
            radioInputs.forEach(radio => {
                character.featSelections[level].dynamicChoices.push({
                    id: radio.id,
                    value: radio.value
                });
            });
        }
    });

    character.classForm.feats = feats;
    // console.log("Saving dynamic choices:", JSON.stringify(character.featSelections, null, 2)); // Debug-Ausgabe

        character.classForm = {
        skills: selectedSkills,
        maneuvers: selectedManeuvers,
        expertise: selectedExpertises,
        weaponMastery: selectedWeaponMasteries,
        languages: selectedLanguages,
        tools: selectedTools,
        instruments: selectedInstruments,
        games: selectedGames,
        energyMasteries: selectedEnergyMasteries,
	divineOrders: selectedDivineOrders,
	blessedStrikes: selectedBlessedStrikes,
	primalOrders: selectedPrimalOrders,
	elementalFuries: selectedElementalFuries,
	lands: selectedLands,
        starMaps: selectedStarMaps,
	feywildGifts: selectedFeywildGifts,
        metamagics: selectedMetamagics,
	manifestationsOfOrder: selectedManifestations,
        eldritchInvocations: selectedInvocations,
        attributes: selectedAttributes,
        spellLists: selectedSpellLists,
        spellcastingAbilities: selectedSpellcastingAbilities,
        damageType_Dragon: selectedDamageTypes_Dragon,
	damageType_fiendRes: selectedDamageTypes_fiendRes,
	damageType_Boon: selectedDamageTypes_Boon,
        subclass: selectedSubclass,
        feats,
	classEquipmentChoices
    };

	console.log("Gespeichertes classForm:", character.classForm);
    	updateProgress();
    	goToStep(7);
}

//=======================================================================
// SCHRITT 7: ZAUBER
//=======================================================================

//=======================================================================
// 1. GLOBALE VARIABLEN FÜR SCHRITT 7
//=======================================================================
const showGrantedFeaturesInUI = true;
let spellChoicesByFeature = {};
let activeSpellChoice = { feature: null };
let applicableMagicFeatures = [];
let sections = {};
let grantedSpellSources = new Map(); // Speichert die Quelle für gewährte Zauber

let isSpellInfoBoxActive = false;


//=======================================================================
// 2. ALLE FUNKTIONEN FÜR SCHRITT 7
//=======================================================================

/**
 * Speichert die finale Zauberauswahl und geht zum nächsten Schritt.
 */
function saveSpells() {
    // Zustand VORHER merken
    const oldState = JSON.stringify({
        cantrips: character.cantrips,
        spells: character.spells,
        spellbook: character.spellbookSpells,
        favored: character.favoredSpells
    });

    character.spellbookSpells = [];
    character.cantrips = [];
    character.spells = [];
    character.favoredSpells = [];

    const finalCantrips = new Map(); // NEU: Map für { spellId => sourceInfo }
    const finalSpellbook = new Set();
    const finalPrepared = new Map(); // Speichert { spellId => sourceInfo }
    const finalFavored = new Map();  // Speichert { spellId => sourceInfo }

    // Hilfsfunktion zur Erstellung des Source-Objekts
    const createSourceInfo = (feature) => {
        let sourceInfo = { type: 'Klasse', name: 'unbekannt' };

        if (feature.ID === 'speciesSpells') {
            sourceInfo.type = 'Volk';
            sourceInfo.name = feature.translationLabel[0];
        } else if (feature.sourceFeatLabel) {
            sourceInfo.type = 'Talent';
            sourceInfo.name = feature.sourceFeatLabel;

            // SONDERFALL: Magic Initiate -> spellList hinzufügen
            if (feature.sourceFeatLabel === "magicInitiateLabel") {
                const spellListChoice = character.classForm?.spellLists?.[feature.spellListIndex];
                if (spellListChoice) {
                    const classObj = classCoreTraitsList.find(c => c.ID === parseInt(spellListChoice, 10));
                    sourceInfo.spellList = classObj ? classObj.translationLabel : "unknown";
                }
            }
        } else {
            sourceInfo.type = 'Klasse';
            sourceInfo.name = feature.translationLabel.length > 1 ? feature.translationLabel[1] : feature.translationLabel[0];
        }
        return sourceInfo;
    };

    grantedSpellSources.forEach((feature, spellId) => {
        const spellData = spellList.find(s => s.ID === spellId);
        if (!spellData) return;

        // Quelle generieren via Hilfsfunktion
        const sourceInfo = createSourceInfo(feature);
        
        if (spellData.spellLevel === 'cantripLabel') {
            finalCantrips.set(spellId, sourceInfo); // Als Objekt mit Quelle speichern
        } else {
            if (feature.chooseType === 1 || feature.chooseType === 3) {
                finalPrepared.set(spellId, sourceInfo);
            }
            if (feature.chooseType === 2 || feature.chooseType === 3) {
                finalFavored.set(spellId, sourceInfo);
            }
            if (character.class.toLowerCase() === 'wizard') {
                finalSpellbook.add(spellId);
            }
        }
    });

    for (const featureId in spellChoicesByFeature) {
        const feature = applicableMagicFeatures.find(f => f.ID == featureId);
        if (feature) {
            spellChoicesByFeature[featureId].forEach(spellId => {
                const spellData = spellList.find(s => s.ID === spellId);
                if (!spellData) return;

                // Quelle generieren via Hilfsfunktion
                const sourceInfo = createSourceInfo(feature);

                if (spellData.spellLevel === 'cantripLabel') {
                    finalCantrips.set(spellId, sourceInfo); // Als Objekt mit Quelle speichern
                } else {
                    if (feature.chooseType === 0) finalSpellbook.add(spellId);
                    if (feature.chooseType === 1) finalPrepared.set(spellId, sourceInfo);
                    if (feature.chooseType === 2) finalFavored.set(spellId, sourceInfo);
                    if (feature.chooseType === 3) {
                        finalPrepared.set(spellId, sourceInfo);
                        finalFavored.set(spellId, sourceInfo);
                        if(character.class.toLowerCase() === 'wizard') {
                            finalSpellbook.add(spellId);
                        }
                    }
                }
            });
        }
    }
    
    // 4. Schreibe die gesammelten Daten in das character-Objekt
    // Jetzt werden auch Cantrips als Objekte { spellId, source } gespeichert
    finalCantrips.forEach((source, spellId) => character.cantrips.push({ spellId, source }));
    character.spellbookSpells = Array.from(finalSpellbook);
    finalPrepared.forEach((source, spellId) => character.spells.push({ spellId, source }));
    finalFavored.forEach((source, spellId) => character.favoredSpells.push({ spellId, source }));

    console.log("Gespeicherte Zauber (strukturiert):", {
        cantrips: character.cantrips,
        prepared: character.spells,
        spellbook: character.spellbookSpells,
        favored: character.favoredSpells
    });

    // Zustand NACHHER vergleichen
    const newState = JSON.stringify({
        cantrips: character.cantrips,
        spells: character.spells,
        spellbook: character.spellbookSpells,
        favored: character.favoredSpells
    });

    if (oldState !== newState) {
        console.log("Zauber geändert: Markiere Ausrüstung für Update.");
        character.spellsChanged = true; // <--- Flagge setzen
    }

    updateProgress();
    goToStep(8);
}

//Hilfsfunktion für Magier
function createSavantFeatures(character, wizardClassData) {
    const savantFeatures = [];
    if (character.class.toLowerCase() !== 'wizard' || !character.classForm?.subclass) {
        return savantFeatures;
    }

    const savantMap = {
        1: { label: "abjurationSavantLabel", school: "abjurationLabel" },
        2: { label: "divinationSavantLabel", school: "divinationLabel" },
        3: { label: "evocationSavantLabel", school: "evocationLabel" },
        4: { label: "illusionSavantLabel", school: "illusionLabel" }
    };

    const selectedSubclass = parseInt(character.classForm.subclass, 10);
    const activeSavant = savantMap[selectedSubclass];
    if (!activeSavant) return savantFeatures;

    const savantFeatureEntry = wizardClassData.find(entry => entry.translationLabel === activeSavant.label);
    if (!savantFeatureEntry || character.level < savantFeatureEntry.level) return savantFeatures;
    const obtainedAtLevel = savantFeatureEntry.level;

    const obtainedLevelData = wizardClassData.find(e => e.level === obtainedAtLevel);
    const currentLevelData = wizardClassData.find(e => e.level === character.level);
    if (!obtainedLevelData || !currentLevelData) return savantFeatures;

    let unlockedTiersAtObtained = 0;
    let unlockedTiersAtCurrent = 0;
    for (let i = 1; i <= 9; i++) {
        if (obtainedLevelData[`SSpSL${i}`] > 0) unlockedTiersAtObtained++;
        if (currentLevelData[`SSpSL${i}`] > 0) unlockedTiersAtCurrent++;
    }
    
    // Berechne die Anzahl der *zusätzlichen* Zauber, die seit dem Erhalt des Merkmals freigeschaltet wurden.
    const numberOfAdditionalSpells = unlockedTiersAtCurrent - unlockedTiersAtObtained;

    if (numberOfAdditionalSpells > 0) {
        const allUnlockedSpellLevels = [];
        for (let i = 1; i <= 9; i++) {
            if (currentLevelData[`SSpSL${i}`] > 0) {
                const levelLabel = i === 1 ? "1stLevelLabel" : i === 2 ? "2ndLevelLabel" : i === 3 ? "3rdLevelLabel" : `${i}thLevelLabel`;
                allUnlockedSpellLevels.push(levelLabel);
            }
        }
        
        // Erstelle einen dynamischen Namen für die Übersetzung
        const dynamicLabel = `${activeSavant.label}_additional`;
        translations.de[dynamicLabel] = `${translations.de[activeSavant.label]} (Zusätzliche Zauber)`;
        translations.en[dynamicLabel] = `${translations.en[activeSavant.label]} (Additional Spells)`;

        savantFeatures.push({
            ID: `savant-additional-spells-${selectedSubclass}`,
            class: 'wizard',
            subclass: selectedSubclass,
            translationLabel: [dynamicLabel],
            chooseType: 0, // Gehört ins Zauberbuch
            chooseNonSpecificSpell_a: numberOfAdditionalSpells,
            chooseNonSpecificSpell_c: ["wizard"],
            chooseNonSpecific_sl: allUnlockedSpellLevels, // Erlaube alle freigeschalteten Grade
            chooseNonSpecificSpell_ss: [activeSavant.school]
        });
    }

    return savantFeatures;
}

function populateSpells() {
    const spellListDiv = document.getElementById("spellList");
    spellListDiv.innerHTML = '';
    grantedSpellSources.clear();

    activeSpellChoice.feature = null; // Setze die aktive Auswahl der Radio Inputs zurück

    if (!character.class || !character.level) {
        spellListDiv.innerHTML = `<p>${translations[currentLang].noSpellsForClass || 'Keine Klasse/Level gewählt.'}</p>`;
        return;
    }

    const classData = getClassData(character.class.toLowerCase());
    const selectedSubclassNumber = character.classForm?.subclass ? parseInt(character.classForm.subclass, 10) : null;
    let levelData = classData.find(entry => 
        entry.level === character.level &&
        (entry.subclassCategoryNumber === 0 || entry.subclassCategoryNumber === selectedSubclassNumber) &&
        (entry.cantripsAmount > 0 || entry.preparedSpellsAmount > 0)
    );
    if (!levelData) {
        levelData = classData.find(entry => entry.level === character.level);
    }

    const unlockedSpellLevels = new Set(["cantripLabel"]);
    if (levelData) {
        if (character.class.toLowerCase() === 'warlock') {
            let maxSpellLevel = 0;
            for (let i = 1; i <= 9; i++) { if (levelData[`SSpSL${i}`] > 0) { maxSpellLevel = i; } }
            for (let i = 1; i <= maxSpellLevel; i++) {
                const levelLabel = i === 1 ? "1stLevelLabel" : i === 2 ? "2ndLevelLabel" : i === 3 ? "3rdLevelLabel" : `${i}thLevelLabel`;
                unlockedSpellLevels.add(levelLabel);
            }
        } else {
            for (let i = 1; i <= 9; i++) {
                if (levelData[`SSpSL${i}`] > 0) {
                    const levelLabel = i === 1 ? "1stLevelLabel" : i === 2 ? "2ndLevelLabel" : i === 3 ? "3rdLevelLabel" : `${i}thLevelLabel`;
                    unlockedSpellLevels.add(levelLabel);
                }
            }
        }
    }
    
    const speciesSpells = getSpeciesSpells(character);
    speciesSpells.forEach(spell => unlockedSpellLevels.add(spell.spellLevel));

    let potentialMagicFeatures = magicSkillsList.filter(magicFeature => {
        const classMatch = magicFeature.class.toLowerCase() === character.class.toLowerCase();
        const subclassMatch = magicFeature.subclass === 0 || magicFeature.subclass === selectedSubclassNumber;
        if (!classMatch || !subclassMatch) return false;
        const genericFeatureLabel = magicFeature.translationLabel[0];
        const featureInData = classData.find(cf =>
            cf.translationLabel === genericFeatureLabel && cf.level <= character.level &&
            (cf.subclassCategoryNumber === 0 || cf.subclassCategoryNumber === selectedSubclassNumber)
        );
        return !!featureInData;
    });

    applicableMagicFeatures = potentialMagicFeatures.filter(feature => {
        if (feature.translationLabel.length <= 1) return true;
        const genericFeatureLabel = feature.translationLabel[0];
        const specificFeatureLabel = feature.translationLabel[1];
        let conditionMet = false;
        switch (genericFeatureLabel) {
            case "divineOrderLabel": conditionMet = character.classForm?.divineOrders?.includes("2"); break;
            case "primalOrderLabel": conditionMet = character.classForm?.primalOrders?.includes("1"); break;
            case "fightingStyleLabel":
                const requiredFeatId = (specificFeatureLabel === "blessedWarriorLabel") ? 76 : (specificFeatureLabel === "druidicWarriorLabel") ? 77 : null;
                conditionMet = character.classForm?.feats?.some(f => f.feat === requiredFeatId);
                break;
            case "eldritchInvocationsLabel":
                const requiredInvocation = eldritchInvocationOptionsList.find(inv => inv.translationLabel === specificFeatureLabel);
                if (requiredInvocation) {
                    conditionMet = character.classForm?.eldritchInvocations?.includes(requiredInvocation.eldritchInvocationOption.toString());
                }
                break;
        }
        return conditionMet;
    });

    const featMagicFeatures = getMagicFeaturesFromFeats(character);
    applicableMagicFeatures.push(...featMagicFeatures);

    if (character.class.toLowerCase() === 'wizard') {
        const dynamicSavantFeatures = createSavantFeatures(character, classData);
        applicableMagicFeatures.push(...dynamicSavantFeatures);
    }
    
    featMagicFeatures.forEach(feature => {
        if (feature.chooseNonSpecific_sl) [feature.chooseNonSpecific_sl].flat().forEach(level => unlockedSpellLevels.add(level));
        if (feature.getSpecificSpell) {
            const spellLabels = Array.isArray(feature.getSpecificSpell) ? feature.getSpecificSpell : [feature.getSpecificSpell];
            spellList.forEach(spell => { if (spellLabels.includes(spell.translationLabel)) unlockedSpellLevels.add(spell.spellLevel); });
        }
    });

    if (character.class.toLowerCase() === 'wizard') {
        const wizardSpellcastingFeature = applicableMagicFeatures.find(f => f.translationLabel.includes('spellcastingLabel') && f.subclass === 0);
        if (wizardSpellcastingFeature) {
            wizardSpellcastingFeature.chooseNonSpecificSpell_a = 6 + (Math.max(0, character.level - 1) * 2);
            wizardSpellcastingFeature.chooseNonSpecific_sl = Array.from(unlockedSpellLevels).filter(l => l !== 'cantripLabel');
        }
    }

    const isCaster = isCharacterCaster(classData, selectedSubclassNumber, character.level);
    if (isCaster && levelData) {
        const subClassCastingFeature = potentialMagicFeatures.find(f => f.subclass === selectedSubclassNumber && f.translationLabel.includes('spellcastingLabel'));
        
        // 1. Definiere die Standard-Zauberquelle (für Zaubertricks und als Basis).
        const defaultSpellSource = subClassCastingFeature ? subClassCastingFeature.getSpellList_c : [character.class.toLowerCase()];

        // 2. Erstelle eine separate Variable für vorbereitete Zauber, die standardmässig die gleiche Quelle hat.
        let preparedSpellSource = defaultSpellSource; 
        
        // 3. Suche nach dem aktiven "Magische Geheimnisse"-Merkmal.
        const magicalSecretsFeature = applicableMagicFeatures.find(f => f.translationLabel.includes("magicalSecretsLabel"));
        
        // 4. Wenn das Merkmal aktiv ist, überschreibe NUR die Quelle für die vorbereiteten Zauber.
        if (magicalSecretsFeature) {
            preparedSpellSource = magicalSecretsFeature.getSpellList_c;
        }
        
        // 5. Erstelle die virtuellen Merkmale mit den korrekten Zauberquellen.
        if (levelData.cantripsAmount > 0) {
            // Zaubertricks nutzen weiterhin die ursprüngliche, unveränderte `defaultSpellSource`.
            applicableMagicFeatures.push({ ID: 'classCantrips', class: character.class.toLowerCase(), subclass: 0, translationLabel: ['classCantripsLabel'], chooseType: 1, chooseNonSpecificSpell_a: levelData.cantripsAmount, chooseNonSpecificSpell_c: defaultSpellSource, chooseNonSpecific_sl: ['cantripLabel'] });
        }
        if (levelData.preparedSpellsAmount > 0) {
            // Vorbereitete Zauber nutzen jetzt die neue, potenziell erweiterte `preparedSpellSource`.
            applicableMagicFeatures.push({ ID: 'classPreparedSpells', class: character.class.toLowerCase(), subclass: 0, translationLabel: ['classPreparedSpellsLabel'], chooseType: 1, chooseNonSpecificSpell_a: levelData.preparedSpellsAmount, chooseNonSpecificSpell_c: preparedSpellSource, chooseNonSpecific_sl: Array.from(unlockedSpellLevels).filter(l => l !== 'cantripLabel') });
        }

        if (subClassCastingFeature) {
            applicableMagicFeatures = applicableMagicFeatures.filter(f => f.ID !== subClassCastingFeature.ID);
        }
    }
    
    const allDisplayFeatures = [...applicableMagicFeatures];
    if (speciesSpells.length > 0) {
        allDisplayFeatures.unshift({ ID: 'speciesSpells', translationLabel: ['speciesSpellsLabel'], chooseType: 3, getSpecificSpell: speciesSpells.map(s => s.translationLabel) });
    }


    // Logik für "Verbesserte Illusionen"
    const improvedIllusionsFeature = allDisplayFeatures.find(f => f.translationLabel.includes('improvedIllusionsLabel'));
    if (improvedIllusionsFeature) {
        const minorIllusionSpell = spellList.find(s => s.translationLabel === 'minorIllusionLabel');
        if (minorIllusionSpell) {
            const alreadyKnownFromOtherSource = allDisplayFeatures.some(f => 
                f.ID !== improvedIllusionsFeature.ID &&
                f.getSpecificSpell &&
                [f.getSpecificSpell].flat().includes('minorIllusionLabel')
            );

            if (alreadyKnownFromOtherSource) {
                // Wandle das Merkmal von "gewährt" zu "wähle" um
                improvedIllusionsFeature.getSpecificSpell = 0;
                improvedIllusionsFeature.chooseNonSpecificSpell_a = 1;
                improvedIllusionsFeature.chooseNonSpecificSpell_c = ["wizard"];
                improvedIllusionsFeature.chooseNonSpecific_sl = ["cantripLabel"];
                improvedIllusionsFeature.ID = 'improvedIllusionsChoice'; // Eindeutige ID für die Auswahl
            }
        }
    }
    
    sections = {
        '0': { title: 'spellbookLabel', features: [], spells: new Set() },
        '1': { title: 'preparedSpellsLabel', features: [], spells: new Set() },
        '2': { title: 'favoredSpellsLabel', features: [], spells: new Set() }
    };
    let allPossibleSpells = new Set();
    
    spellList.forEach(spell => {
        const spellClasses = Array.isArray(spell.classLabel) ? spell.classLabel : [spell.classLabel];
        if (spellClasses.includes(character.class.toLowerCase()) && unlockedSpellLevels.has(spell.spellLevel)) { allPossibleSpells.add(spell); }
    });

    allDisplayFeatures.forEach(feature => {
        let featureSpells = [];
        if (feature.getSpecificSpell) {
            const sourceList = Array.isArray(feature.getSpecificSpell) ? feature.getSpecificSpell : [feature.getSpecificSpell];
            if (sourceList.includes("subclassSpellsList")) {
                const selectedLandNumber = character.classForm?.lands?.[0] ? parseInt(character.classForm.lands[0], 10) : null;
                const spellsFromList = subclassSpellsList.filter(entry =>
                    entry.classFeature.includes(feature.translationLabel[0]) && entry.class === character.class.toLowerCase() &&
                    entry.subclassCategoryNumber === selectedSubclassNumber && entry.level <= character.level &&
                    (!entry.landCategoryNumber || entry.landCategoryNumber === selectedLandNumber)
                ).flatMap(entry => entry.preparedSpells);
                featureSpells.push(...spellList.filter(spell => spellsFromList.includes(spell.translationLabel)));
            } else {
                featureSpells.push(...spellList.filter(spell => sourceList.includes(spell.translationLabel)));
            }
        } else if (feature.chooseNonSpecificSpell_a > 0) {
            let spellSource = feature.chooseNonSpecificSpell_c;
            if (feature.sourceFeatLabel === "magicInitiateLabel" && feature.spellListIndex !== undefined) {
                const spellListChoice = character.classForm?.spellLists?.[feature.spellListIndex];
                if (spellListChoice) {
                    const chosenClassId = parseInt(spellListChoice, 10);
                    const chosenClass = classCoreTraitsList.find(c => c.ID === chosenClassId);
                    if (chosenClass) { spellSource = [chosenClass.translationLabel.replace('Label', '')]; }
                }
            }
            const levelSource = feature.chooseNonSpecific_sl;
            if (levelSource !== undefined) {
                featureSpells.push(...spellList.filter(spell => {
                    const classMatch = !spellSource || spellSource === 0 || [spellSource].flat().some(allowed => (Array.isArray(spell.classLabel) ? spell.classLabel : [spell.classLabel]).includes(allowed));
                    const levelMatch = !levelSource || levelSource === 0 || [levelSource].flat().includes(spell.spellLevel);
                    const schoolMatch = !feature.chooseNonSpecificSpell_ss || feature.chooseNonSpecificSpell_ss === 0 || [feature.chooseNonSpecificSpell_ss].flat().includes(spell.spellSchool);
                    const ritualMatch = !feature.chooseNonSpecificSpell_sf || feature.chooseNonSpecificSpell_sf === 0 || (Array.isArray(spell.spellFocus) ? spell.spellFocus.includes("ritualLabel") : spell.spellFocus === "ritualLabel");
                    return classMatch && levelMatch && schoolMatch && ritualMatch;
                }));
            }
        }
        
        featureSpells.forEach(spell => {
            allPossibleSpells.add(spell);
            if (!feature.chooseNonSpecificSpell_a) {
                grantedSpellSources.set(spell.ID, feature);
                const section = sections[feature.chooseType === 3 ? 1 : feature.chooseType];
                if(section) {
                    section.spells.add(spell.ID);
                    if(feature.chooseType === 3) sections['2'].spells.add(spell.ID);
                }
                if (character.class.toLowerCase() === 'wizard' && spell.spellLevel !== 'cantripLabel') { sections['0'].spells.add(spell.ID); }
            }
        });
    });

    Object.keys(sections).forEach(type => {
        const allSectionFeatures = allDisplayFeatures.filter(f => (f.chooseType === 3 ? '1' : f.chooseType.toString()) === type);
        let shouldRenderSection = allSectionFeatures.length > 0 || sections[type].spells.size > 0;
        if (type === '2' && !shouldRenderSection) {
            if (allDisplayFeatures.some(f => f.chooseType === 3)) {
                shouldRenderSection = true;
            }
        }
        if (!shouldRenderSection) return;

        const sectionData = sections[type];
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'spell-section-container';

        // Füge Icons zu den Sektions-Überschriften hinzu
        const sectionIcons = {
            '0': 'spellbook.png',
            '2': 'present.png'
        };
        const headerIcon = sectionIcons[type];
        let headerHTML = `<h3>${translations[currentLang][sectionData.title] || sectionData.title}</h3>`;
        if (headerIcon) {
            headerHTML = `
                <div class="section-header-with-icon">
                    <h3>${translations[currentLang][sectionData.title] || sectionData.title}</h3>
                    <img src="images/${headerIcon}" class="section-header-icon" alt="">
                </div>
            `;
        }
        sectionDiv.innerHTML = headerHTML;
        
        if (type === '1') {
            const featuresBySource = {
                species: allSectionFeatures.filter(f => f.ID === 'speciesSpells'),
                class: allSectionFeatures.filter(f => !f.sourceFeatLabel && f.ID !== 'speciesSpells'),
                feat: allSectionFeatures.filter(f => f.sourceFeatLabel)
            };
            const sourceOrder = ['species', 'class', 'feat'];
            const sourceInfo = {
                species: { label: 'speciesSpellsLabel', icon: 'flag_green.png' },
                class:   { label: 'classSpellsLabel',   icon: 'flag_red.png' },
                feat:    { label: 'talentSpellsLabel',  icon: 'flag_blue.png' }
            };
            let hasAnyContent = false;
            sourceOrder.forEach(sourceKey => {
                const features = featuresBySource[sourceKey];
                if (features.length > 0) {
                    if (hasAnyContent) {
                        const hr = document.createElement('hr');
                        hr.className = 'section-divider';
                        sectionDiv.appendChild(hr);
                    }
                    const subHeaderDiv = document.createElement('div');
                    subHeaderDiv.className = 'spell-sub-header';
                    subHeaderDiv.innerHTML = `<h4>${translations[currentLang][sourceInfo[sourceKey].label]}</h4><img src="images/${sourceInfo[sourceKey].icon}" class="sub-header-icon" alt="">`;
                    sectionDiv.appendChild(subHeaderDiv);
                    const uniqueFeatures = [...new Map(features.map(item => [item['ID'], item])).values()];
                    uniqueFeatures.forEach(feature => {
                        const featureNameLabel = feature.sourceFeatLabel ? feature.sourceFeatLabel : (feature.translationLabel.length > 1 ? feature.translationLabel[1] : feature.translationLabel[0]);

                        let featureName = translations[currentLang][featureNameLabel] || featureNameLabel;

		    // Talent Magiebegabt - Spezialanzeige (START)
                    if (feature.sourceFeatLabel === "magicInitiateLabel") {
                        const isCantrip = [feature.chooseNonSpecific_sl].flat().includes('cantripLabel');
                        const typeLabel = isCantrip ? (translations[currentLang].cantripsLabel || "Cantrips") : (translations[currentLang].spellsLabel || "Spell");
                        const spellListChoice = character.classForm?.spellLists?.[feature.spellListIndex];
                        let className = "???";
                        if (spellListChoice) {
                            const classObj = classCoreTraitsList.find(c => c.ID === parseInt(spellListChoice, 10));
                            if (classObj) className = translations[currentLang][classObj.translationLabel] || classObj.translationLabel;
                        }
                        featureName = `${featureName} (${typeLabel}) - ${className}`;
                    }
		    // Talent Magiebegabt - Spezialanzeige (ENDE)

                        const featureDiv = document.createElement('div');
                        featureDiv.className = 'spell-feature-item';
                        if (feature.chooseNonSpecificSpell_a > 0) {
                            featureDiv.innerHTML = `<label><input type="radio" name="spellChoice" value="${feature.ID}"><span>${featureName}</span></label><div class="spell-choice-details" id="details-for-${feature.ID}"></div>`;
                            featureDiv.querySelector('input').addEventListener('change', () => handleSpellChoiceSelection(feature, sections));
                        } else if (showGrantedFeaturesInUI && feature.ID !== 'speciesSpells') {
                            featureDiv.innerHTML = `<span>${featureName}</span>`;
                        }
                        if (featureDiv.innerHTML) sectionDiv.appendChild(featureDiv);
                    });
                    hasAnyContent = true;
                }
            });
        } else {
            const uniqueFeatures = [...new Map(allSectionFeatures.map(item => [item['ID'], item])).values()];
            uniqueFeatures.forEach(feature => {
                const featureNameLabel = feature.sourceFeatLabel ? feature.sourceFeatLabel : (feature.translationLabel.length > 1 ? feature.translationLabel[1] : feature.translationLabel[0]);

                let featureName = translations[currentLang][featureNameLabel] || featureNameLabel;

            // Talent Magiebegabt - Spezialanzeige (START)
            if (feature.sourceFeatLabel === "magicInitiateLabel") {
                const isCantrip = [feature.chooseNonSpecific_sl].flat().includes('cantripLabel');
                const typeLabel = isCantrip ? (translations[currentLang].cantripsLabel || "Cantrips") : (translations[currentLang].spellsLabel || "Spell");
                const spellListChoice = character.classForm?.spellLists?.[feature.spellListIndex];
                let className = "???";
                if (spellListChoice) {
                    const classObj = classCoreTraitsList.find(c => c.ID === parseInt(spellListChoice, 10));
                    if (classObj) className = translations[currentLang][classObj.translationLabel] || classObj.translationLabel;
                }
                featureName = `${featureName} (${typeLabel}) - ${className}`;
            }
            // Talent Magiebegabt - Spezialanzeige (ENDE)

                const featureDiv = document.createElement('div');
                featureDiv.className = 'spell-feature-item';
                if (feature.chooseNonSpecificSpell_a > 0) {
                    featureDiv.innerHTML = `<label><input type="radio" name="spellChoice" value="${feature.ID}"><span>${featureName}</span></label><div class="spell-choice-details" id="details-for-${feature.ID}"></div>`;
                    featureDiv.querySelector('input').addEventListener('change', () => handleSpellChoiceSelection(feature, sections));
                    sectionDiv.appendChild(featureDiv);
                } else if (showGrantedFeaturesInUI) {
                    featureDiv.innerHTML = `<span>${featureName}</span>`;
                    sectionDiv.appendChild(featureDiv);
                }
            });
        }
        if (sectionDiv.children.length > 1 || (type === '2' && shouldRenderSection)) {
            spellListDiv.appendChild(sectionDiv);
        }
    });

    const descContainer = document.getElementById('step7DescContainer');
    const infoBoxContainer = document.getElementById('spell-info-box-container');

    if (allPossibleSpells.size > 0) {
        // Fall A: Charakter hat Zauber

        // 1. Original-Beschreibung + Fragezeichen wiederherstellen
        const descText = translations[currentLang].step7Description || "Wähle die Zauber für deinen Charakter:";
        if (descContainer) {
             descContainer.innerHTML = `${descText} <span id="toggle-spell-info" class="info-icon" onclick="toggleInfoBox('spell-info-box-container')">?</span>`;
        }
        
        // 2. Infobox initialisieren (anzeigen)
        buildSpellInfoUI(); 

        // 3. Zauberliste rendern
        const masterSpellListContainer = document.createElement('div');
        masterSpellListContainer.id = 'master-spell-list';
        spellListDiv.appendChild(masterSpellListContainer);
        renderFullSpellList(masterSpellListContainer, Array.from(allPossibleSpells), sections);

    } else {
        // Fall B: KEINE Zauber
        
        // 1. Beschreibung im Header ändern (kein Fragezeichen!)
        if (descContainer) {
            descContainer.innerHTML = translations[currentLang].noSpellsForClass || 'Diese Klasse/Spezies kann keine Zauber wirken.';
        }
        
        // 2. Infobox sicher ausblenden
        if (infoBoxContainer) {
            infoBoxContainer.style.display = 'none';
        }
        if (typeof isSpellInfoBoxActive !== 'undefined') {
            isSpellInfoBoxActive = false; 
        }
        
        // 3. SpellList leeren (damit kein doppelter Text erscheint)
        spellListDiv.innerHTML = '';
    }

    function isCharacterCaster(classData, subclassId, level) {
        return classData.some(f => 
            f.level <= level &&
            (f.subclassCategoryNumber === 0 || f.subclassCategoryNumber === selectedSubclassNumber) &&
            (f.translationLabel === 'spellcastingLabel' || f.translationLabel === 'pactMagicLabel')
        );
    }
}

/**
 * Wird aufgerufen, wenn ein Benutzer ein Radio-Button für eine Zauberauswahl anklickt.
 */
function handleSpellChoiceSelection(feature, sections) {
    activeSpellChoice.feature = feature;
    
    if (!spellChoicesByFeature[feature.ID]) {
        spellChoicesByFeature[feature.ID] = new Set();
    }
    
    document.querySelectorAll('.spell-choice-details').forEach(el => el.innerHTML = '');

    const detailsContainer = document.getElementById(`details-for-${feature.ID}`);
    if (detailsContainer) {
        let choiceCount = feature.chooseNonSpecificSpell_a;
        // KORREKTUR: Direkte Berechnung des Übungsbonus
        if (choiceCount === 555) {
            choiceCount = Math.floor((character.level - 1) / 4) + 2;
        }
        
        const currentCount = spellChoicesByFeature[feature.ID].size;
        const isCantripSelection = feature.ID === 'classCantrips' || (feature.chooseNonSpecific_sl && feature.chooseNonSpecific_sl.includes('cantripLabel') && feature.chooseNonSpecific_sl.length === 1);
        const choiceText = isCantripSelection ? (translations[currentLang].cantripsChosen || 'Zaubertricks gewählt') : (translations[currentLang].spellsChosen || 'Zauber gewählt');
        
        detailsContainer.innerHTML = `<p class="spell-counter">${currentCount} / ${choiceCount} ${choiceText}</p>`;
    }
    
    renderFullSpellList(document.getElementById('master-spell-list'), null, sections);

    updateSpellInfoBox();
}

/**
 * Verarbeitet den Klick auf einen auswählbaren Zauber.
 */
function handleSpellClick(spellElement, spellId, feature, sections) {
    const selections = spellChoicesByFeature[feature.ID];
    const isSelected = selections.has(spellId);

    // Diese Prüfung stellt sicher, dass ein Zauber, der in der Sektion der
    // vorbereiteten Zauber ist, nicht aus dem Zauberbuch entfernt werden kann.
    if (isSelected && feature.chooseType === 0) {
        // Prüfen, ob der Zauber durch irgendein Merkmal (automatisch oder gewählt) als vorbereitet gilt.
        const isPrepared = sections['1'].spells.has(spellId) || 
                           applicableMagicFeatures.some(f => (f.chooseType === 1 || f.chooseType === 3) && spellChoicesByFeature[f.ID]?.has(spellId));
        if (isPrepared) {
            return; // Aktion abbrechen, da der Zauber als "vorbereitet" markiert ist.
        }
    }
    
    let choiceCount = feature.chooseNonSpecificSpell_a;
    if (choiceCount === 555) {
        choiceCount = Math.floor((character.level - 1) / 4) + 2;
    }

    if (isSelected) {
        selections.delete(spellId);
    } else {
        if (selections.size < choiceCount) {
            selections.add(spellId);
        }
    }
    
    const detailsContainer = document.getElementById(`details-for-${feature.ID}`);
    if (detailsContainer) {
        const isCantripSelection = feature.ID === 'classCantrips' || (feature.chooseNonSpecific_sl && feature.chooseNonSpecific_sl.includes('cantripLabel') && feature.chooseNonSpecific_sl.length === 1);
        const choiceText = isCantripSelection ? (translations[currentLang].cantripsChosen || 'Zaubertricks gewählt') : (translations[currentLang].spellsChosen || 'Zauber gewählt');
        
        const counterElement = detailsContainer.querySelector('.spell-counter');
        if (counterElement) {
            counterElement.textContent = `${selections.size} / ${choiceCount} ${choiceText}`;
        }
    }
    
    renderFullSpellList(document.getElementById('master-spell-list'), null, sections);
    updateSpellInfoBox();
}


/**
 * Rendert die komplette Liste aller Zauber und wendet Marker und Klick-Logik an.
 */
function renderFullSpellList(container, spellsToRender = null, sections) {
    if (!container) return;

    if (spellsToRender) {
        container.innerHTML = '';
        const spellsByLevel = {};
        spellsToRender.forEach(spell => {
            if (!spellsByLevel[spell.spellLevel]) spellsByLevel[spell.spellLevel] = [];
            spellsByLevel[spell.spellLevel].push(spell);
        });
        const orderedLevels = ["cantripLabel", "1stLevelLabel", "2ndLevelLabel", "3rdLevelLabel", "4thLevelLabel", "5thLevelLabel", "6thLevelLabel", "7thLevelLabel", "8thLevelLabel", "9thLevelLabel"];
        orderedLevels.forEach(level => {
            if (spellsByLevel[level] && spellsByLevel[level].length > 0) {
                const sortedSpells = spellsByLevel[level].sort((a, b) => (translations[currentLang][a.translationLabel] || a.translationLabel).localeCompare(translations[currentLang][b.translationLabel] || b.translationLabel));
                const levelHeader = document.createElement('h4');
                levelHeader.textContent = translations[currentLang][level] || level;
                container.appendChild(levelHeader);
                const ul = document.createElement('ul');
                ul.className = 'master-spell-ul';
                sortedSpells.forEach(spell => {
                    const li = document.createElement('li');
                    li.dataset.spellId = spell.ID;
                    li.innerHTML = `
                        <span class="spell-marker-container">
                            <span class="spell-marker spell-marker-book"></span>
                            <span class="spell-marker spell-marker-flag"></span>
                            <span class="spell-marker spell-marker-present"></span>
                        </span>
                        <span class="spell-name">${translations[currentLang][spell.translationLabel] || spell.translationLabel}</span>`;
                    ul.appendChild(li);
                });
                container.appendChild(ul);
            }
        });
    }

    const activeFeature = activeSpellChoice.feature;
    const spellbookSpells = new Set();
    if (character.class.toLowerCase() === 'wizard') {
        Object.values(sections).forEach(s => s.spells.forEach(id => {
            const spell = spellList.find(sp => sp.ID === id);
            if(spell && spell.spellLevel !== 'cantripLabel') spellbookSpells.add(id);
        }));
        applicableMagicFeatures.forEach(feature => {
            if ((feature.chooseType === 0 || feature.chooseType === 1 || feature.chooseType === 3) && spellChoicesByFeature[feature.ID]) {
                spellChoicesByFeature[feature.ID].forEach(spellId => spellbookSpells.add(spellId));
            }
        });
    }

    container.querySelectorAll('li[data-spell-id]').forEach(li => {
        const spellId = parseInt(li.dataset.spellId, 10);
        const spellData = spellList.find(s => s.ID === spellId);
        if (!spellData) return;

        const bookSpan = li.querySelector('.spell-marker-book');
        const flagSpan = li.querySelector('.spell-marker-flag');
        const presentSpan = li.querySelector('.spell-marker-present');
        
        li.classList.remove('clickable', 'selected-choice');
        li.onclick = null;
        bookSpan.innerHTML = '';
        flagSpan.innerHTML = '';
        presentSpan.innerHTML = '';
        
        const icons = { book: null, flag: null, present: null };
        
        if (sections['0'].spells.has(spellId)) icons.book = 'spellbook.png';
        if (sections['2'].spells.has(spellId) && spellData.spellLevel !== 'cantripLabel') icons.present = 'present.png';
        if (sections['1'].spells.has(spellId)) {
            const sourceFeature = grantedSpellSources.get(spellId);
            if (sourceFeature?.ID === 'speciesSpells') {
                icons.flag = 'flag_green.png';
            } else if (sourceFeature?.sourceFeatLabel) {
                icons.flag = 'flag_blue.png';
            } else {
                icons.flag = 'flag_red.png';
            }
        }

        for (const featureId in spellChoicesByFeature) {
            if (spellChoicesByFeature[featureId].has(spellId)) {
                const feature = applicableMagicFeatures.find(f => f.ID == featureId);
                if (feature) {
                    if (feature.chooseType === 0) icons.book = 'spellbook.png';
                    if ((feature.chooseType === 2 || feature.chooseType === 3) && spellData.spellLevel !== 'cantripLabel') {
                        icons.present = 'present.png';
                    }
                    if (feature.chooseType === 3) {
                        icons.flag = 'flag_blue.png';
                    }
                    if (feature.chooseType === 1 || feature.chooseType === 3) {
                        if (feature.sourceFeatLabel) {
                            icons.flag = 'flag_blue.png';
                        } else if (feature.ID === 'speciesSpells') {
                            icons.flag = 'flag_green.png';
                        } else {
                            icons.flag = 'flag_red.png';
                        }
                    }
                }
            }
        }
        
        if (character.class.toLowerCase() === 'wizard') {
            if (spellData.spellLevel !== 'cantripLabel' && spellbookSpells.has(spellId)) {
                icons.book = 'spellbook.png';
            }
        }
        
        if(icons.book) bookSpan.innerHTML = `<img src="images/spellbook.png" alt="Zauberbuch" title="${translations[currentLang].spellbookLabel || 'Zauberbuch'}">`;
        if(icons.flag) flagSpan.innerHTML = `<img src="images/${icons.flag}" alt="Vorbereitet" title="${translations[currentLang].preparedSpellsLabel || 'Vorbereitet'}">`;
        if(icons.present) presentSpan.innerHTML = `<img src="images/present.png" alt="Begünstigt" title="${translations[currentLang].favoredSpellsLabel || 'Begünstigt'}">`;

        if (activeFeature) {
            const selectionsForActiveFeature = spellChoicesByFeature[activeFeature.ID];
            if (selectionsForActiveFeature) {
                let isAlreadyClaimed = false;
                const activeType = activeFeature.chooseType === 3 ? 1 : activeFeature.chooseType;
                
                if ((activeType === 1 && icons.flag && !selectionsForActiveFeature.has(spellId)) ||
                    (activeType === 0 && icons.book && !selectionsForActiveFeature.has(spellId)) ||
                    (activeType === 2 && icons.present && !selectionsForActiveFeature.has(spellId))) {
                    isAlreadyClaimed = true;
                }

                let isChoosable = false;
                const isCantrip = spellData.spellLevel === 'cantripLabel';

                // =======================================================================
                // Geteilte Logik für die Auswählbarkeit (`isChoosable`)
                // =======================================================================

                if (activeFeature.ID === 'classPreparedSpells') {
                    // Logik für die normale Vorbereitung von Zaubern
                    if (character.class.toLowerCase() === 'wizard') {
                        isChoosable = !isCantrip && spellbookSpells.has(spellId);
                    } else {
                        const allowedClasses = activeFeature.chooseNonSpecificSpell_c;
                        const spellClasses = Array.isArray(spellData.classLabel) ? spellData.classLabel : [spellData.classLabel];
                        const isOnAllowedList = allowedClasses.some(allowed => spellClasses.includes(allowed));
                        const isFavored = sections['2'].spells.has(spellId);
                        isChoosable = !isCantrip && (isOnAllowedList || isFavored);
                    }
                } else if (activeFeature.translationLabel.includes("spellMasteryLabel")) {
                    // Spezial-Logik NUR für Zaubermeisterschaft
                    isChoosable = 
                        spellbookSpells.has(spellId) &&
                        [activeFeature.chooseNonSpecific_sl].flat().includes(spellData.spellLevel) &&
                        spellData.castingTime === "actionLabel" &&
                        spellData.castingTimeValue === 1;
                } else if (activeFeature.translationLabel.includes("signatureSpellsLabel")) {
                    // NEU: Spezial-Logik NUR für Signaturzauber
                    isChoosable = 
                        spellbookSpells.has(spellId) &&
                        [activeFeature.chooseNonSpecific_sl].flat().includes(spellData.spellLevel);
                } else {
                    // Für alle anderen Merkmale (inkl. "spellcastingLabel")
                    let standardChecksPassed = false;
                    let classSource = activeFeature.chooseNonSpecificSpell_c;
                    if (activeFeature.sourceFeatLabel === "magicInitiateLabel" && activeFeature.spellListIndex !== undefined) {
                        const spellListChoice = character.classForm?.spellLists?.[activeFeature.spellListIndex];
                        if (spellListChoice) {
                            const chosenClassId = parseInt(spellListChoice, 10);
                            const chosenClass = classCoreTraitsList.find(c => c.ID === chosenClassId);
                            if (chosenClass) { classSource = [chosenClass.translationLabel.replace('Label', '')]; }
                        }
                    }
                    const classMatch = !classSource || classSource === 0 || [classSource].flat().some(allowed => (Array.isArray(spellData.classLabel) ? spellData.classLabel : [spellData.classLabel]).includes(allowed));
                    const levelMatch = !activeFeature.chooseNonSpecific_sl || [activeFeature.chooseNonSpecific_sl].flat().includes(spellData.spellLevel);
                    const schoolMatch = !activeFeature.chooseNonSpecificSpell_ss || [activeFeature.chooseNonSpecificSpell_ss].flat().includes(spellData.spellSchool);
                    const ritualMatch = !activeFeature.chooseNonSpecificSpell_sf || (Array.isArray(spellData.spellFocus) ? spellData.spellFocus.includes("ritualLabel") : spellData.spellFocus === "ritualLabel");
                    if (classMatch && levelMatch && schoolMatch && ritualMatch) {
                        standardChecksPassed = true;
                    }
                    if (standardChecksPassed) {
                        if (activeFeature.chooseType === 0 && isCantrip) { isChoosable = false; }
                        else if (activeFeature.ID === 'classCantrips' && !isCantrip) { isChoosable = false; }
                        else { isChoosable = true; }
                    }
                }

                if (isChoosable && !isAlreadyClaimed) {
                    let choiceCount = activeFeature.chooseNonSpecificSpell_a;
                    if(choiceCount === 555) { choiceCount = Math.floor((character.level - 1) / 4) + 2; }
                    if (selectionsForActiveFeature.size < choiceCount || selectionsForActiveFeature.has(spellId)) {
                        li.classList.add('clickable');
                        li.onclick = () => handleSpellClick(li, spellId, activeFeature, sections);
                    }
                    if (selectionsForActiveFeature.has(spellId)) {
                        li.classList.add('selected-choice');
                    }
                }
            }
        }
    });
}

/**
 * Sammelt alle Zauber, die ein Charakter durch sein Volk und seine Erblinie erhält.
 */
function getSpeciesSpells(character) {
    if (!character.species) return [];
    const searchLabel = (character.species.toLowerCase() + 'label');
    const speciesData = speciesList.find(s => s.translationLabel.toLowerCase() === searchLabel);
    if (!speciesData) return [];
    const grantedSpellLabels = new Set();
    if (speciesData.speciesTraitLabel) {
        speciesData.speciesTraitLabel.forEach(traitLabel => {
            const trait = speciesTraitList.find(t => t.speciesTraitLabel === traitLabel);
            if (trait && trait.spellLabel && trait.spellLabel !== 0) {
                grantedSpellLabels.add(trait.spellLabel);
            }
        });
    }
    if (character.lineage) {
        const lineageEntries = lineageList.filter(entry => entry.lineageLabel === character.lineage);
        lineageEntries.forEach(lineageEntry => {
            if (character.level >= lineageEntry.level && lineageEntry.spellLabel && lineageEntry.spellLabel !== 0) {
                const spells = Array.isArray(lineageEntry.spellLabel) ? lineageEntry.spellLabel : [lineageEntry.spellLabel];
                spells.forEach(spell => grantedSpellLabels.add(spell));
            }
        });
    }
    return spellList.filter(spell => grantedSpellLabels.has(spell.translationLabel));
}

/**
 * Sammelt alle magischen Merkmale, die durch ausgewählte Talente gewährt werden.
 */
function getMagicFeaturesFromFeats(character) {
    const featMagicFeatures = [];
    const classFeats = character.classForm?.feats || [];
    const backgroundFeatId = character.feat_background || null;
    const speciesFeatId = character.feat_species || null;
    
    const allSelectedFeatsOrdered = [];

    // Baue die Liste in der korrekten Reihenfolge auf
    if (backgroundFeatId) {
        allSelectedFeatsOrdered.push({ feat: backgroundFeatId });
    }
    if (speciesFeatId) {
        allSelectedFeatsOrdered.push({ feat: speciesFeatId });
    }
    allSelectedFeatsOrdered.push(...classFeats);

    let magicInitiateCounter = 0;

    allSelectedFeatsOrdered.forEach((featSelection, index) => {
        const feat = featList.find(f => f.ID === featSelection.feat);
        if (!feat) return;

        const magicFeatEntries = magicFeatsList.filter(mf => mf.translationLabel === feat.translationLabel);
        
        magicFeatEntries.forEach(magicEntry => {
            const newFeature = { ...magicEntry };
            newFeature.sourceFeatLabel = feat.translationLabel;
            newFeature.ID = `feat-${feat.ID}-${magicEntry.ID}-${index}`;

            if (feat.translationLabel === "magicInitiateLabel") {
                newFeature.spellListIndex = magicInitiateCounter;
            }
            featMagicFeatures.push(newFeature);
        });

        if (feat.translationLabel === "magicInitiateLabel") {
            magicInitiateCounter++;
        }
    });

    return featMagicFeatures;
}

/**
 * Erstellt die UI-Elemente für die Zauber-Infobox (wird von populateSpells aufgerufen).
 */
function buildSpellInfoUI() {
    const closeButton = document.getElementById('close-spell-info');
    if (closeButton) {
        closeButton.onclick = () => toggleInfoBox('spell-info-box-container');
    }
    
    // Setze den übersetzten Titel der Infobox
    const infoBoxHeaderSpan = document.querySelector('#spell-info-box-header span:first-child');
    if (infoBoxHeaderSpan) {
        infoBoxHeaderSpan.textContent = translations[currentLang].spellInfoBoxTitle || "Zauber Details";
    }

    // Aktiviere die Info-Box standardmässig
    setTimeout(() => {
        toggleInfoBox('spell-info-box-container', true);
    }, 100);
}

/**
 * Aktualisiert den Inhalt der Zauber-Infobox basierend auf der aktuellen Auswahl.
 */
function updateSpellInfoBox() {
    if (!isSpellInfoBoxActive) return;

    const spellsToShowIds = new Set();
    const finalPrepared = new Map();
    const finalFavored = new Map();
    const finalSpellbook = new Set();
    const finalCantrips = new Set();

    // 1. Sammle Daten (Logik beibehalten)
    grantedSpellSources.forEach((feature, spellId) => {
        const spellData = spellList.find(s => s.ID === spellId);
        if (!spellData) return;
        if (spellData.spellLevel === 'cantripLabel') finalCantrips.add(spellId);
        else {
            if (feature.chooseType === 1 || feature.chooseType === 3) finalPrepared.set(spellId, {});
            if (feature.chooseType === 2 || feature.chooseType === 3) finalFavored.set(spellId, {});
            if (character.class.toLowerCase() === 'wizard') finalSpellbook.add(spellId);
        }
    });

    for (const featureId in spellChoicesByFeature) {
        const feature = applicableMagicFeatures.find(f => f.ID == featureId);
        if (feature) {
            spellChoicesByFeature[featureId].forEach(spellId => {
                const spellData = spellList.find(s => s.ID === spellId);
                if (!spellData) return;
                if (spellData.spellLevel === 'cantripLabel') finalCantrips.add(spellId);
                else {
                    if (feature.chooseType === 0) finalSpellbook.add(spellId);
                    if (feature.chooseType === 1 || feature.chooseType === 3) finalPrepared.set(spellId, {});
                    if (feature.chooseType === 2 || feature.chooseType === 3) finalFavored.set(spellId, {});
                }
            });
        }
    }
    
    if (character.class.toLowerCase() === 'wizard') finalSpellbook.forEach(id => spellsToShowIds.add(id));
    else {
        finalPrepared.forEach((_, id) => spellsToShowIds.add(id));
        finalFavored.forEach((_, id) => spellsToShowIds.add(id));
    }
    finalCantrips.forEach(id => spellsToShowIds.add(id));

    // 2. Mapping für die Render-Funktion
    const mappedSpells = spellList
        .filter(s => spellsToShowIds.has(s.ID))
        .sort((a,b) => (a.spellLevel.localeCompare(b.spellLevel)) || (translations[currentLang][a.translationLabel] || '').localeCompare(translations[currentLang][b.translationLabel] || ''))
        .map(s => ({
            name: translations[currentLang][s.translationLabel] || s.translationLabel,
            description: translations[currentLang][s.spellDLabel] || 'Keine Beschreibung.'
        }));

    renderSpecialInfoBoxContent('spell-info-box-container', mappedSpells);
}

//=======================================================================
// SCHRITT 8: AUSRÜSTUNG
//=======================================================================

//=======================================================================
// 1. GLOBALE VARIABLEN FÜR SCHRITT 8
//=======================================================================
let selectedEquipmentSource = { class: null, background: null };
let tempEquipment = {
    weapons: [],
    armor: [],
    tools: [],
    gear: [],
    vehicles: []
};
let initialPurseValues = { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 }; // Speichert die Startwerte aus Klasse/Hintergrund

let infoBoxSelections = {};

//=======================================================================
// 2. ALLE FUNKTIONEN FÜR SCHRITT 8
//=======================================================================

/**
 * Speichert die finale Ausrüstung (tempEquipment) in das character-Objekt und geht weiter.
 */
function saveEquipment() {
    // Sicherstellen, dass wir eine tiefe Kopie der temporären Daten speichern
    character.equipment = JSON.parse(JSON.stringify(tempEquipment));
    character.selectedEquipmentSource = JSON.parse(JSON.stringify(selectedEquipmentSource));
    
    // character.purse ist bereits aktuell (wird live über Input-Events gepflegt)

    // Logging für Debugging-Zwecke
    console.log("Gespeicherte finale Ausrüstung:", character.equipment);
    console.log("Finaler Geldbeutel:", character.purse); // <--- HIER NEU HINZUGEFÜGT

    updateProgress(); // Fortschrittsanzeige aktualisieren
    goToStep(9);      // Zum nächsten Schritt gehen
}

// KOSTEN & HilFSFUNKTIONEN

/**
 * Wandelt einen Cost-String ("10 GP", "5 SP") in ein Objekt um.
 * @param {string} costString - Der Kosten-String (z.B. "10 GP").
 * @returns {object} { value: 10, unit: "GPLabel" }
 */
function parseCostString(costString) {
    if (typeof costString !== "string") return null;

    // Entferne Leerzeichen und konvertiere in Großbuchstaben, um robust zu sein.
    const cleanString = costString.trim().toUpperCase();

    // Regex zur Extraktion von Zahl und Währungseinheit
    const match = cleanString.match(/^(\d+)\s*([A-Z]+)$/);

    if (!match || match.length < 3) {
        return null;
    }

    const value = parseInt(match[1], 10);
    const unitAbbr = match[2];

    // Währungszuordnung aus coinList
    const unit = coinList.find(c => c.translationLabel.toUpperCase().startsWith(unitAbbr))?.translationLabel;

    if (unit && !isNaN(value)) {
        return { value, unit };
    }

    return null;
}

/**
 * Berechnet den GP-Gesamtwert eines Währungsbetrags.
 * @param {number} value - Der Betrag.
 * @param {string} unitLabel - Das Label der Währung (z.B. "GPLabel").
 * @returns {number} Wert in GP.
 */
function toGoldValue(value, unitLabel) {
    const coin = coinList.find(c => c.translationLabel === unitLabel);
    return coin ? value * coin.valueInGP : 0;
}

/**
 * Formatiert einen GP-Wert zurück in den Währungs-String des Coins mit dem höchsten Wert.
 * @param {number} gpValue - Der Wert in GP.
 * @param {object} elements - Übersetzungsobjekt.
 * @returns {string} Formatierter Währungs-String.
 */
function formatGPValue(gpValue, elements) {
    if (gpValue === 0) return '0 GP';
    
    // Sortiere Währungen absteigend nach Wert
    const sortedCoins = coinList.slice().sort((a, b) => b.valueInGP - a.valueInGP);

    for (const coin of sortedCoins) {
        const value = Math.floor(gpValue / coin.valueInGP);
        if (value >= 1) {
            return `${value} ${elements[coin.translationLabel] || coin.translationLabel.replace('Label', '')}`;
        }
    }
    return `${gpValue.toFixed(2)} GP`;
}

/**
 * Hilfsfunktion zum Finden von Item-Daten aus allen Listen.
 */
function findItemData(label) {
    // Entfernt "List" (z.B. instrumentList) aus der Suche
    if (label.endsWith('List')) label = label.replace('List', 'Label');

const allLists = [
        weaponList, 
        armorList, 
        toolList, 
        adventuringGearList,
        mountList, 
        tackList, 
        shipList, 
        arcaneFocusList, 
        druidicFocusList, 
        holySymbolList,
        gameList,       
        instrumentList  
    ];
    
    for (const list of allLists) {
        // Prüfen des translationLabel
        let item = list.find(item => item.translationLabel === label);
        if (item) return item;

        // Prüfen des 'varies' Feldes für spezielle Items (z.B. 'instrumentList')
        item = list.find(item => item.varies && [item.varies].flat().some(v => v === label));
        if (item) return item;
    }
    return null;
}

/**
 * Hilfsfunktion zur Bestimmung der Item-Kategorie.
 */
function getItemCategory(itemData) {
    if (!itemData) return 'gear'; // Fallback auf 'gear' bei ungültigem Item

    // Hilfsfunktion zur Suche in einer Liste
    const findInList = (list) => list.find(i => i.translationLabel === itemData.translationLabel);

    // 1. Waffen
    if (findInList(weaponList)) return 'weapons';

    // 2. Rüstungen
    if (findInList(armorList)) return 'armor';

    // 3. Fahrzeuge & Reittiere
    if (findInList(mountList) || findInList(tackList) || findInList(shipList)) return 'vehicles';

    // 4. Werkzeuge (Inklusive Games und Instrumente)
    if (findInList(toolList) || findInList(gameList) || findInList(instrumentList)) return 'tools';

    // 5. Sonstiges Gear (Abenteuer-Ausrüstung, Fokusse)
    if (findInList(adventuringGearList)) return 'gear';
    if (findInList(arcaneFocusList)) return 'gear';
    if (findInList(druidicFocusList)) return 'gear';
    if (findInList(holySymbolList)) return 'gear';

    // Fallback (falls keine passende Kategorie gefunden wird)
    console.warn(`Kategorie für Item "${itemData.translationLabel}" konnte nicht ermittelt werden. Standard: 'gear'`);
    return 'gear';
}

/**
 * Hilfsfunktion zum Erstellen eines Cost-Objekts.
 */
function getCostObject(itemData) {
    if (itemData.costValue !== undefined && itemData.costUnit) {
        return { value: itemData.costValue, unit: itemData.costUnit };
    }
    return null;
}

/**
 * Hilfsfunktion, die die Anzahl aus einem String (z.B. "4x handaxeLabel") extrahiert.
 */
function extractAmount(itemString) {
    const match = itemString.match(/(\d+)x\s*/);
    return match ? parseInt(match[1], 10) : 1;
}

/**
 * Hilfsfunktion, die nur das Label aus einem String (z.B. "4x handaxeLabel") extrahiert.
 */
function extractLabel(itemString) {
    if (itemString.toLowerCase() === 'none') return 'noneLabel'; // "None" zu Label konvertieren
    const match = itemString.match(/(\d+x\s*)?(.+)/);
    return match ? match[2].trim() : itemString.trim();
}

/**
 * Baut die HTML-Liste für die Infobox, inkl. Dropdowns für dynamische Items.
 */
function buildItemDetailsList(optionContent, elements, source) {
    let listHtml = '<ul>';
    
    if (optionContent === 0 || optionContent === 'None') {
        listHtml += `<li>${elements.noneLabel}</li>`;
    } else {
        const content = Array.isArray(optionContent) ? optionContent : [optionContent];
        
        content.forEach(itemString => {
            
            // --- Währungs-Check ---
            // Prüft, ob der String Geld ist (z.B. "50 GP")
            const costObj = parseCostString(itemString);
            if (costObj) {
                // costObj.unit ist z.B. "GPLabel". Wir holen die Übersetzung (z.B. "GM").
                const translatedUnit = elements[costObj.unit] || costObj.unit.replace("Label", "");
                listHtml += `<li>${costObj.value} ${translatedUnit}</li>`;
                return; // Wichtig: Hier abbrechen, damit es nicht als Item weiterverarbeitet wird
            }
            // ---------------------------

            const amount = extractAmount(itemString);
            const rawLabel = extractLabel(itemString);
            let displayHtml = "";

            // Prüfen auf dynamisches Item
            const dynamicOptions = getOptionsForDynamicItem(rawLabel, source);

            if (dynamicOptions) {
                if (dynamicOptions.type === 'fixed') {
                    // Fester Wert -> Text anzeigen
                    const label = dynamicOptions.selectedOption;
                    displayHtml = elements[label] || label;
                } else if (dynamicOptions.type === 'select') {
                    // Auswahl möglich -> Dropdown rendern
                    const uniqueKey = `${source}_${rawLabel}`;
                    const currentSelection = infoBoxSelections[uniqueKey] || ""; // Default ist LEER
                    
                    const pleaseSelectText = elements.pleaseSelectLabel || "- Bitte wählen -";
                    let optionsHtml = `<option value="" ${currentSelection === "" ? "selected" : ""}>${pleaseSelectText}</option>`;

                    optionsHtml += dynamicOptions.options.map(opt => {
                        const name = elements[opt] || opt;
                        const isSelected = opt === currentSelection ? 'selected' : '';
                        return `<option value="${opt}" ${isSelected}>${name}</option>`;
                    }).join('');

                    displayHtml = `<select class="varies-dropdown" onchange="handleInfoBoxSelection(this, '${source}', '${rawLabel}')" style="max-width:150px;">${optionsHtml}</select>`;
                }
            } else if (rawLabel.includes("(") || rawLabel.startsWith("list_")) {
                return; // Item ignorieren
            } else {
                // Statisches Item
                const label = rawLabel;
                displayHtml = elements[label] || label;
            }

            if (amount > 1) {
                displayHtml = `${amount}x ${displayHtml}`;
            }
            
            listHtml += `<li>${displayHtml}</li>`;
        });
    }
    listHtml += '</ul>';
    return listHtml;
}

// UI-LOGIK & NUTZERFUNKTIONEN

/**
 * Initialisiert die UI für Schritt 8, füllt die Tabellenstruktur und die Geldbörse.
 */
function initializeEquipmentStep() {
    const elements = translations[currentLang];

    // STATUS-CHECK
    const hasSavedData = character.selectedEquipmentSource && character.selectedEquipmentSource.class;

    if (hasSavedData) {
        console.log("Schritt 8: Stelle gespeicherten Zustand wieder her.");
        
        // Daten aus character wiederherstellen
        tempEquipment = JSON.parse(JSON.stringify(character.equipment));
        selectedEquipmentSource = JSON.parse(JSON.stringify(character.selectedEquipmentSource));
        
        // --- LOGIK: Nur bei Zauberänderung Materialien aktualisieren ---
        if (character.spellsChanged) {
            console.log("Zauberänderung erkannt: Aktualisiere Materialien...");
            
            // 1. Alte Materialien entfernen (nur die, die automatisch gewährt wurden)
            Object.keys(tempEquipment).forEach(cat => {
                tempEquipment[cat] = tempEquipment[cat].filter(item => item.source !== 'granted_spell_material');
            });

            // 2. Neue Materialien basierend auf neuen Zaubern hinzufügen
            processGrantedItems(); 

            // 3. Flagge zurücksetzen
            character.spellsChanged = false;
        }
        // ---------------------------------------------------------------

    } else {
        console.log("Schritt 8: Initialisiere Standardwerte (Reset).");
        tempEquipment = { weapons: [], armor: [], tools: [], gear: [], vehicles: [] };
        selectedEquipmentSource = { class: null, background: null };
        if (!selectedEquipmentSource.class) selectedEquipmentSource.class = `startingEquipmentNone`;
        if (!selectedEquipmentSource.background) selectedEquipmentSource.background = `bgEquipmentNone`;
    }

    // --- Bereich 1: Equipment-Tabelle ---
    const options = ["A", "B", "C", "None"];

    const classData = classCoreTraitsList.find(c => c.translationLabel.toLowerCase() === character.class.toLowerCase());
    const backgroundData = backgroundList.find(b => b.translationLabel.toLowerCase() === character.background.toLowerCase());

    const headerRow = document.getElementById("equipmentHeaderRow");

    headerRow.innerHTML = `
        <th colspan="${options.length + 1}" style="text-align: center; font-size: 1.2em; font-weight: bold; padding: 15px; background-color: rgba(58, 58, 65, 0.85); color: #e8d8b5; border-bottom: 2px solid #d4a017; border-radius: 10px;">
            ${elements.equipmentProvidedLabel || "Equipment gewählt von..."}
        </th>
    `;

    // --- KLASSENREIHE ---
    const classRow = document.getElementById("classEquipmentRow");
    classRow.querySelector('td').id = 'classLabel';
    classRow.querySelector('td').textContent = elements.classLabel || 'Klasse';
    classRow.querySelector('td').style.fontSize = "1.0em";
    classRow.querySelector('td').style.fontWeight = "bold";
    classRow.querySelector('td').style.textAlign = "left";
    classRow.innerHTML = classRow.querySelector('td').outerHTML;

    classRow.innerHTML += options.map(opt => {
        const optionKey = `startingEquipment${opt}`;
        const hasContent = (opt === 'None') || (classData && classData[optionKey] !== 0);
        const displayLabel = (opt === 'None' ? elements.noneLabel : opt);

        return `<td id="classOption${opt}"
            class="${hasContent ? 'clickable-option' : 'empty-option'}"
            data-option-type="class"
            data-option-key="${optionKey}"
            onclick="selectEquipmentOption('class', '${optionKey}', this)">
            <input type="radio" name="classEquipment" value="${optionKey}" id="radioClass${opt}">
            <label for="radioClass${opt}">${displayLabel}</label>
        </td>`;
    }).join('');

    // --- HINTERGRUNDREIHE ---
    const backgroundRow = document.getElementById("backgroundEquipmentRow");
    backgroundRow.querySelector('td').id = 'backgroundLabel';
    backgroundRow.querySelector('td').style.fontSize = "1.0em";
    backgroundRow.querySelector('td').style.fontWeight = "bold";
    backgroundRow.querySelector('td').style.textAlign = "left";

    backgroundRow.querySelector('td').textContent = elements.backgroundLabel || 'Hintergrund';
    backgroundRow.innerHTML = backgroundRow.querySelector('td').outerHTML;
    
    backgroundRow.innerHTML += options.map(opt => {
        const optionKey = `bgEquipment${opt}`;
        const hasContent = (opt === 'None') || (backgroundData && backgroundData[optionKey] !== 0);
        const displayLabel = (opt === 'None' ? elements.noneLabel : opt);
        
        if (opt === 'C') return `<td></td>`; 
        
        return `<td id="bgOption${opt}"
            class="${hasContent ? 'clickable-option' : 'empty-option'}"
            data-option-type="background"
            data-option-key="${optionKey}"
            onclick="selectEquipmentOption('background', '${optionKey}', this)">
            <input type="radio" name="backgroundEquipment" value="${optionKey}" id="radioBG${opt}">
            <label for="radioBG${opt}">${displayLabel}</label>
        </td>`;
    }).join('');

    // 2. Initialisiere die Geldbörse UI
    const purseInputsDiv = document.getElementById('purseInputs');
    
    // Anzeige: PM GM EM SM KM
    const sortedCoinList = coinList.slice().sort((a, b) => b.valueInGP - a.valueInGP);
    const coinTypes = sortedCoinList.map(c => c.translationLabel);

    purseInputsDiv.innerHTML = '';
    coinTypes.forEach(unitLabel => {
        const unitAbbr = unitLabel.replace('Label', '');
        const unitShort = unitAbbr.slice(0, 2);

        const colDiv = document.createElement('div');
        colDiv.className = 'coin-column';
        colDiv.innerHTML = `
            <label for="purseInput${unitShort}">${elements[unitLabel] || unitShort}</label>
            <input type="number" id="purseInput${unitShort}" min="0" value="0" 
                   oninput="updatePurseValue('${unitShort}', this.value)">
        `;
        purseInputsDiv.appendChild(colDiv);
    });

    // WICHTIG: Setze Initialwerte
    if (!selectedEquipmentSource.class) selectedEquipmentSource.class = `startingEquipmentNone`;
    if (!selectedEquipmentSource.background) selectedEquipmentSource.background = `bgEquipmentNone`;

    // Wende die Initialwerte an
    updateEquipmentSelectionUI();
    
    // 3. Items berechnen (Einziger initialer Aufruf)
    if (hasSavedData) {
        updatePurseUI();
        renderEquipmentTables();
    } else {
        processStartingEquipmentAndOptions(true); 
    }
    
    // 4. Aufbau für weitere Ausrüstung (Bereich 3)
    setupAdditionalEquipmentUI();

    showEquipmentOptionDetails(false);
}

/**
 * Zeigt die Details der Ausrüstungsoption in der Infobox an
 * @param {string} optionKey - z.B. 'startingEquipmentA' oder 'bgEquipmentA'.
 * @param {string} source - 'class' oder 'background'.
 * @param {boolean} isSelection - Wenn true, wird die Zelle gehighlightet.
 */
function showEquipmentOptionDetails(isInitialSelection = false) {
    const infoBox = document.getElementById('equipmentOptionsInfoBox'); 
    const contentDiv = document.getElementById('equipmentDetailsContent');
    const elements = translations[currentLang];
    
    // Aktuelle Auswahl aus dem Zwischenspeicher holen
    const classKey = selectedEquipmentSource.class;
    const bgKey = selectedEquipmentSource.background;

    const classData = classCoreTraitsList.find(c => c.translationLabel.toLowerCase() === character.class.toLowerCase()); 
    const backgroundData = backgroundList.find(b => b.translationLabel.toLowerCase() === character.background.toLowerCase());

    let htmlContent = '';
    
    // === KLASSEN-DETAILS ===
    const classOptionContent = classData?.[classKey] || 0;
    
if (classKey === "startingEquipmentNone") {
    htmlContent += `<h4>${elements.classLabel} (${elements.optionLabel} ${elements.noneLabel})</h4>`;
} else {
    htmlContent += `<h4>${elements.classLabel} (${elements.optionLabel} ${classKey.slice(-1)})</h4>`;
}
    htmlContent += buildItemDetailsList(classOptionContent, elements, 'class');
    
    // --- Divider zwischen den Sektionen ---
    htmlContent += '<hr class="section-divider">';

    // === HINTERGRUND-DETAILS ===
    const bgOptionContent = backgroundData?.[bgKey] || 0;
    
if (bgKey === "bgEquipmentNone") {
    htmlContent += `<h4>${elements.backgroundLabel} (${elements.optionLabel} ${elements.noneLabel})</h4>`;
} else {
    htmlContent += `<h4>${elements.backgroundLabel} (${elements.optionLabel} ${bgKey.slice(-1)})</h4>`;
}
    htmlContent += buildItemDetailsList(bgOptionContent, elements, 'background');
    
    // Fülle den Content und zeige die Box
    document.getElementById('equipmentDetailsTitle').textContent = elements.equipmentOptionsLabel || "Ausrüstungsoptionen";
    contentDiv.innerHTML = htmlContent;
    infoBox.style.display = 'block';

    // Highlighting aktualisieren
    if (isInitialSelection) {
        updateHighlighting(classKey, 'class');
        updateHighlighting(bgKey, 'background');
    }
}

/**
 * Behandelt den Klick auf eine Optionszelle
 */
function selectEquipmentOption(source, optionKey, cellElement) {
    const radio = cellElement.querySelector('input[type="radio"]');
    
    if (radio) {
        // Wenn bereits ausgewählt, nichts tun (spart Rechenleistung)
        if (radio.checked) return; 
        
        radio.checked = true;
        
        // Auslöser für die Logikkette
        handleEquipmentSelection(source, optionKey, radio);
    }
}

function updateHighlighting(optionKey, source) {
    const selector = (source === 'class') ? 'tr#classEquipmentRow td' : 'tr#backgroundEquipmentRow td';
    
    document.querySelectorAll(selector).forEach(td => {
        td.classList.remove('selected-option-highlight');
    });

    if (optionKey) {
        const cellId = `${source === 'class' ? 'class' : 'bg'}Option${optionKey.slice(-1)}`;
        const selectedCell = document.getElementById(cellId);
        if (selectedCell) {
            selectedCell.classList.add('selected-option-highlight');
        }
    }
}

/**
 * Behandelt die Auswahl eines Radio-Buttons und aktualisiert die Geldbörse und Ausrüstung.
 */
function handleEquipmentSelection(source, optionKey, radioInput) {
    // 1. Gespeicherte Auswahl aktualisieren
    selectedEquipmentSource[source] = optionKey;

    console.log(`Auswahl geändert. ${source}OptionKey:`, optionKey);

    // 2. Highlighting aktualisieren
    updateHighlighting(optionKey, source);
    
    // 3. Logik verarbeiten (Berechnet Items und Geld)
    processStartingEquipmentAndOptions(); 

    // 4. Infobox aktualisieren (Highlighing true, damit die Box offen bleibt/aktualisiert wird)
    showEquipmentOptionDetails(true); 
}

/**
 * Aktualisiert die UI (Radio Buttons) basierend auf der gespeicherten Auswahl.
 */
function updateEquipmentSelectionUI() {
    const selectedClassOption = selectedEquipmentSource.class;
    const selectedBGOption = selectedEquipmentSource.background;

    if (selectedClassOption) {
        const radio = document.getElementById(`radioClass${selectedClassOption.slice(-1)}`);
        if (radio) {
            radio.checked = true;
        }
    }
    if (selectedBGOption) {
        const radio = document.getElementById(`radioBG${selectedBGOption.slice(-1)}`);
        if (radio) {
            radio.checked = true;
        }
    }
}

/**
 * Verarbeitet die Startausrüstung und fügt die Items aus den Optionen in Bereich 3 hinzu.
 * @param {boolean} isInitial - Gibt an, ob es der erste Aufruf (Initialisierung) ist.
 */
function processStartingEquipmentAndOptions(isInitial = false) {
    // console.log("Verarbeitung der Startausrüstung und Optionen gestartet.");

    // Vorhandene Daten validieren
    const classData = classCoreTraitsList.find(c => c.translationLabel.toLowerCase() === character.class?.toLowerCase());
    const backgroundData = backgroundList.find(b => b.translationLabel.toLowerCase() === character.background?.toLowerCase());

    if (!classData) {
        console.warn(`Keine Klassendaten für "${character.class}" gefunden.`);
    }
    if (!backgroundData) {
        console.warn(`Keine Hintergrunddaten für "${character.background}" gefunden.`);
    }

    const classOptionKey = selectedEquipmentSource.class;
    const bgOptionKey = selectedEquipmentSource.background;

    // Funktion zur Verarbeitung von Klassen- oder Hintergrundoptionen
    const internalProcessOptionContent = (source, optionKey) => {
        const data = source === "class" ? classData : backgroundData;
        if (!data) return;

        const optionContent = data[optionKey];
        // Wenn OptionContent leer ist (z.B. bei 'None'), überspringen wir die Hinzufügung.
        if (!optionContent || optionKey.endsWith('None')) {
             return; 
        }

        // Füge neue Items hinzu
        const content = Array.isArray(optionContent) ? optionContent : [optionContent];
        content.forEach(itemString => {
            // Zuerst prüfen: Ist es Geld?
            const cost = parseCostString(itemString);

            if (cost) {
                // FALL 1: WÄHRUNG gefunden
                // Geld wird in initiatePurse verarbeitet, hier ignorieren wir es für die Item-Liste
                return;
            } 
            
            // FALL 2: ITEM gefunden
            const amount = extractAmount(itemString);
            const itemLabel = extractLabel(itemString);
            
            // --- DYNAMISCHE OPTIONS-AUFLÖSUNG ---
            const dynamicOptions = getOptionsForDynamicItem(itemLabel, source);
            let finalItemLabel = itemLabel; // Standard: Das Label aus dem String
            let selectedVaries = null;      // Speichert die konkrete Variante

            if (dynamicOptions) {
                if (dynamicOptions.type === 'fixed') {
                    // Fall: Automatische Zuweisung
                    finalItemLabel = dynamicOptions.selectedOption;
                    selectedVaries = finalItemLabel; 
                } else if (dynamicOptions.type === 'select') {
                    // Fall: Dropdown notwendig
                    const uniqueKey = `${source}_${itemLabel}`;
                    
                    // Prüfen, ob schon gewählt wurde
                    if (infoBoxSelections[uniqueKey]) {
                        finalItemLabel = infoBoxSelections[uniqueKey];
                        selectedVaries = finalItemLabel;
                    } else {
                        // KORREKTUR: Wenn noch nichts gewählt wurde ("Bitte wählen"), ist finalItemLabel null!
                        // Dadurch wird das Item unten NICHT hinzugefügt.
                        finalItemLabel = null; 
                    }
                }
            } else if (itemLabel.includes("(") || itemLabel.startsWith("list_")) {
               // Fall: Item existiert in Daten, aber ist für diesen Char nicht verfügbar (z.B. Monk Tool vs Instrument)
               return; 
            }
            
            // WICHTIG: Wenn finalItemLabel null ist (wegen "Bitte wählen"), brechen wir hier ab.
            if (!finalItemLabel) return; 

            // --- ENDE DYNAMISCHE LOGIK ---
            
            // --- VARIANTEN-CHECK (auf Basis von finalItemLabel) ---
            const variantInfo = findParentItemOfVariant(finalItemLabel);

            let itemData = null;
            let itemCost = null;

            if (variantInfo) {
                // FALL A: Es ist eine Variante! (z.B. Pfeil -> Munition)
                itemData = variantInfo.parentItem;
                // Wir setzen die Variante fix auf das gewählte Item
                selectedVaries = finalItemLabel; 
                // Kosten der Variante nutzen
                if (variantInfo.variantData) {
                    itemCost = getCostObject(variantInfo.variantData);
                }
            } else {
                // FALL B: Normales Item oder Pack
                itemData = findItemData(finalItemLabel);
                // Wenn wir keine Variante haben, ist selectedVaries null
                if (!selectedVaries && dynamicOptions) {
                     // Falls es ein dynamisches Item war, setzen wir es zur Sicherheit
                     selectedVaries = finalItemLabel; 
                } else if (!dynamicOptions) {
                    selectedVaries = null;
                }

                if (itemData) {
                    itemCost = getCostObject(itemData);
                }
            }

            if (itemData) {
                const category = getItemCategory(itemData);

                // --- TYP BERECHNUNG HIER EINFÜGEN ---
                const elements = translations[currentLang];
                
                // Wir bauen ein temporäres Item-Objekt für die Helper-Funktion
                const tempItemObj = { 
                    source: optionKey, 
                    selectedVaries: selectedVaries 
                };
                
                const calculatedType = determineItemTypeLabel(tempItemObj, itemData, elements);
                // ------------------------------------------

                if (tempEquipment.hasOwnProperty(category)) { 
                    tempEquipment[category].push({
                        id: itemData.ID,
                        label: itemData.translationLabel, 
                        amount: amount,
                        initialAmount: amount, 
                        cost: itemCost, 
                        isOptionItem: true,
                        isStruck: true, 
                        source: optionKey,
                        selectedVaries: selectedVaries,
                        isPackExpanded: true,
                        typeLabel: calculatedType 
                    });
                } else {
                    console.error(`Ungültige Kategorie: ${category} für Item ${finalItemLabel}`);
                }
            }
        });
    };

    // --- 1. ITEMS AUFRÄUMEN VOR DER NEUEN VERARBEITUNG ---

    // A) Aufräumen der Klassen-Items
    const classSourcePrefix = "startingEquipment";
    Object.keys(tempEquipment).forEach(category => {
        tempEquipment[category] = tempEquipment[category].filter(item => {
            // Behalte alle Items, die NICHT von der Klasse stammen
            return !(item.source && item.source.startsWith(classSourcePrefix));
        });
    });

    // B) Aufräumen der Hintergrund-Items
    const bgSourcePrefix = "bgEquipment";
    Object.keys(tempEquipment).forEach(category => {
        tempEquipment[category] = tempEquipment[category].filter(item => {
            // Behalte alle Items, die NICHT vom Hintergrund stammen
            return !(item.source && item.source.startsWith(bgSourcePrefix));
        });
    });

    // --- 2. NEUE ITEMS HINZUFÜGEN ---

    // Verarbeite Klassenoptionen
    if (classOptionKey && classData?.[classOptionKey]) {
        internalProcessOptionContent("class", classOptionKey);
    }

    // Verarbeite Hintergrundoptionen
    if (bgOptionKey && backgroundData?.[bgOptionKey]) {
        internalProcessOptionContent("background", bgOptionKey);
    }

    // Gewähren von Items aus anderen Schritten (z.B. Zaubermaterial)
    processGrantedItems();

    // Geldbörse neu berechnen
    character.purse = initiatePurse();

    // UI: Geldbörse aktualisieren
    updatePurseUI();

    // Aktualisiere die Ausrüstungstabellen
    renderEquipmentTables();
}

/**
 * Analysiert ein Label und gibt die verfügbaren Optionen zurück.
 * Berücksichtigt Entscheidungen aus Schritt 2 (Hintergrund) und Schritt 6 (Klasse).
 * * @param {string} rawLabel - Das Label aus den Daten (z.B. "musicalInstrumentLabel(1)").
 * @param {string} source - 'class' oder 'background'.
 * @returns {object|null} { type: 'fixed'|'select', options: [], selectedOption: string }
 */
function getOptionsForDynamicItem(rawLabel, source) {
    // FALL 1: "list_" -> Freie Auswahl aus einer generischen Liste
    if (rawLabel.startsWith("list_")) {
        const cleanLabel = rawLabel.replace("list_", "");
        let listData = [];

        // MAPPING
        if (cleanLabel === "gameLabel" || cleanLabel === "gamingSetLabel") listData = gameList;
        else if (cleanLabel === "musicalInstrumentLabel") listData = instrumentList;
        // Artisans Tools: Category 1 oder 2 (je nach Datenstruktur)
        else if (cleanLabel === "artisansToolsLabel") listData = toolList.filter(t => t.toolCategoryNumber === 1 || t.toolCategoryNumber === 2); 
        else if (cleanLabel === "toolLabel") listData = toolList; 
        // Fokusse & Symbole
        else if (cleanLabel === "holySymbolLabel") listData = holySymbolList;
        else if (cleanLabel === "arcaneFocusLabel") listData = arcaneFocusList;
        else if (cleanLabel === "druidicFocusLabel") listData = druidicFocusList;
        
        if (listData.length > 0) {
            return { 
                type: 'select', 
                originalLabel: rawLabel, 
                options: listData.map(i => i.translationLabel), 
                isNewChoice: true 
            };
        }
    }

    // FALL 2: "Label(N)" -> Auswahl basiert auf vorherigen Schritten
    const match = rawLabel.match(/^([a-zA-Z]+)\((\d+)\)$/);
    if (match) {
        const baseLabel = match[1]; 
        let previousChoices = [];

        const idToLabel = (ids, list) => {
            if (!ids) return [];
            const idArray = Array.isArray(ids) ? ids : [ids];
            return idArray.map(id => {
                const item = list.find(i => i.ID == id || i.instrumentCategoryNumber == id || i.gameCategoryNumber == id || i.toolCategoryNumber == id);
                return item ? item.translationLabel : null;
            }).filter(Boolean);
        };

        // A) HINTERGRUND
        if (source === 'background') {
            if (baseLabel === 'musicalInstrumentLabel') previousChoices = idToLabel(character.instrument_background, instrumentList);
            else if (baseLabel === 'artisansToolsLabel' || baseLabel === 'toolLabel') previousChoices = idToLabel(character.tool_background, toolList);
            else if (baseLabel === 'gameLabel' || baseLabel === 'gamingSetLabel') previousChoices = idToLabel(character.game_background, gameList);
        }
        
        // B) KLASSE
        else if (source === 'class' && character.classForm && character.classForm.classEquipmentChoices) {
            if (baseLabel === 'musicalInstrumentLabel') {
                previousChoices = idToLabel(character.classForm.classEquipmentChoices.instruments, instrumentList);
            } 
            else if (baseLabel === 'artisansToolsLabel' || baseLabel === 'toolLabel') {
                previousChoices = idToLabel(character.classForm.classEquipmentChoices.tools, toolList);
            } 
        }

        previousChoices = previousChoices.filter(Boolean);

        if (previousChoices.length === 0) {
            return null; 
        } else if (previousChoices.length === 1) {
            return { type: 'fixed', originalLabel: rawLabel, selectedOption: previousChoices[0] };
        } else {
            return { type: 'select', originalLabel: rawLabel, options: previousChoices, isNewChoice: false };
        }
    }

    return null;
}

function handleInfoBoxSelection(selectElement, source, originalLabel) {
    const selectedValue = selectElement.value;
    const uniqueKey = `${source}_${originalLabel}`;
    
    // Speichere die Wahl global
    infoBoxSelections[uniqueKey] = selectedValue;
    
    // Berechne alles neu (aktualisiert Area 3)
    processStartingEquipmentAndOptions();
}

function togglePackContent(categoryKey, index) {
    const item = tempEquipment[categoryKey][index];
    if (!item) return;

    // 1. Stammdaten laden, um zu prüfen, ob es wirklich ein Pack ist
    const itemData = findItemData(item.label);
    
    // Wenn keine Daten gefunden oder kein Pack -> Abbruch
    if (!itemData || itemData.pack !== 1) return;

    // 2. Zustand umschalten (Standard ist true/aufgeklappt, also toggeln wir das Gegenteil)
    // Wenn undefined, nehmen wir an es war offen (true), also setzen wir es auf false.
    if (item.isPackExpanded === undefined) {
        item.isPackExpanded = false;
    } else {
        item.isPackExpanded = !item.isPackExpanded;
    }

    // 3. Tabelle neu rendern
    renderEquipmentTables();
}

/**
 * Initialisiert die Geldbörse basierend auf den aktuellen Optionen und nicht durchgestrichenen Items.
 * @returns {object} Die initialisierte Geldbörse (CP, SP, EP, GP, PP).
 */
function initiatePurse() {
    let newPurse = { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 };

    // 1. Geld aus den Optionen (Bereich 1)
    const classData = classCoreTraitsList.find(c => c.translationLabel.toLowerCase() === character.class?.toLowerCase());
    const backgroundData = backgroundList.find(b => b.translationLabel.toLowerCase() === character.background?.toLowerCase());

    const processOption = (data, optionKey) => {
        const optionContent = data?.[optionKey];
        if (!optionContent) return;

        const content = Array.isArray(optionContent) ? optionContent : [optionContent];
        content.forEach(itemString => {
            const cost = parseCostString(itemString);
            if (cost) {
                const unitAbbr = cost.unit.replace("Label", "");
                newPurse[unitAbbr.toUpperCase()] += cost.value;
            }
        });
    };

    if (selectedEquipmentSource.class && classData) {
        processOption(classData, selectedEquipmentSource.class);
    }

    if (selectedEquipmentSource.background && backgroundData) {
        processOption(backgroundData, selectedEquipmentSource.background);
    }

    // 2. Abzug von Preisen aus Bereich 3 (nicht durchgestrichene Items)
    Object.keys(tempEquipment).forEach(category => {
        tempEquipment[category].forEach(item => {
            if (!item.isStruck && item.cost) {
                const unitAbbr = item.cost.unit.replace("Label", "");
                newPurse[unitAbbr.toUpperCase()] -= item.cost.value * item.amount;
            }
        });
    });

    // 3. Normalisierung der Geldbörse
    return normalizePurseValues(newPurse);
}

/**
 * Passt die Geldbörse an, indem ein Betrag hinzugefügt oder abgezogen wird.
 * Berechnet intern alles in GP und verteilt den verbleibenden Betrag
 * korrekt auf die Währungseinheiten (GP, EP, SP, CP, PP).
 * @param {object} purse - Die aktuelle Geldbörse (CP, SP, EP, GP, PP).
 * @param {object} amount - Der anzupassende Betrag (z. B. { GP: -1, SP: 5 }).
 * @returns {object} Die aktualisierte Geldbörse.
 */
function calculatePurse(purse, amount) {
    // Sortiere die Währungen absteigend nach Wert (PP → CP)
    const denominations = coinList.sort((a, b) => b.valueInGP - a.valueInGP);

    // Schritt 1: Berechne den Gesamtwert der Geldbörse in GP
    let totalGPValue = 0;
    Object.keys(purse).forEach(unitAbbr => {
        const coin = denominations.find(c => c.translationLabel.startsWith(unitAbbr.toUpperCase()));
        if (coin) {
            totalGPValue += purse[unitAbbr.toUpperCase()] * coin.valueInGP;
        }
    });

    // Schritt 2: Berechne den Gesamtwert des anzupassenden Betrags in GP
    let adjustmentGPValue = 0;
    Object.keys(amount).forEach(unitAbbr => {
        const coin = denominations.find(c => c.translationLabel.startsWith(unitAbbr.toUpperCase()));
        if (coin) {
            adjustmentGPValue += amount[unitAbbr.toUpperCase()] * coin.valueInGP;
        }
    });

    // Schritt 3: Berechne den neuen Gesamtwert der Geldbörse
    const remainingGP = totalGPValue + adjustmentGPValue;

    // Schritt 4: Verteile den verbleibenden Betrag auf die Währungseinheiten
    const updatedPurse = { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 };
    let remainingValue = remainingGP;

    for (const coin of denominations) {
        const unitAbbr = coin.translationLabel.replace("Label", ""); // "GPLabel" -> "GP"
        updatedPurse[unitAbbr] = Math.trunc(remainingValue / coin.valueInGP); // Ganze Anzahl (auch negativ)
        remainingValue = parseFloat((remainingValue % coin.valueInGP).toFixed(8)); // Verbleibenden Wert runden
    }

    // Schritt 5: Umrechnung von SP in EP (5 SP = 1 EP), auch bei negativen Werten
    if (Math.abs(updatedPurse.SP) >= 5) {
        const epAdjustment = Math.trunc(updatedPurse.SP / 5); // Konvertiere SP in EP
        updatedPurse.EP += epAdjustment;
        updatedPurse.SP -= epAdjustment * 5; // Aktualisiere SP
    }

    return updatedPurse;
}

/**
 * Aktualisiert die Anzeige der Geldbörse basierend auf Nutzereingabe.
 * Die tatsächlichen Werte werden nicht dauerhaft gespeichert.
 * @param {string} unitAbbr - Die Abkürzung der Währung (z. B. 'GP').
 * @param {string} valueString - Der neue Wert als String.
 */
function updatePurseValue(unitAbbr, valueString) {
    const value = parseInt(valueString, 10) || 0; // Nur ganze Zahlen zulassen

    // Temporär die Geldbörse aktualisieren
    character.purse[unitAbbr.toUpperCase()] = value;

    // console.log(`Manuelle Eingabe: ${unitAbbr} wurde auf ${value} gesetzt.`);
}

/**
 * Aktualisiert die Anzeige der Geldbörse in der UI.
 */
function updatePurseUI() {
    Object.keys(character.purse).forEach(unitAbbr => {
        // Finde das Input-Feld für die entsprechende Währung
        const inputField = document.getElementById(`purseInput${unitAbbr}`);
        
        // Falls das Input-Feld existiert, setze den neuen Wert
        if (inputField) {
            inputField.value = character.purse[unitAbbr];
        }
    });
}

/**
 * Zieht einen Betrag in Währungseinheiten von der Geldbörse ab.
 * Berechnet intern alles in GP und verteilt den verbleibenden Betrag
 * zurück auf die Währungseinheiten (positiv oder negativ).
 * @param {object} purse - Die aktuelle Geldbörse (CP, SP, EP, GP, PP).
 * @param {object} amount - Der abzuziehende Betrag (z. B. { GP: 1, SP: 5 }).
 * @returns {object} Die aktualisierte Geldbörse.
 */
function subtractFromPurse(purse, amount) {
    // Sortiere die Währungen absteigend nach Wert (PP → CP)
    const denominations = coinList.sort((a, b) => b.valueInGP - a.valueInGP);

    // Schritt 1: Berechne den Gesamtwert der Geldbörse in GP
    let totalGPValue = 0;
    Object.keys(purse).forEach(unitAbbr => {
        const coin = denominations.find(c => c.translationLabel.startsWith(unitAbbr.toUpperCase()));
        if (coin) {
            totalGPValue += purse[unitAbbr.toUpperCase()] * coin.valueInGP;
        }
    });

    // Schritt 2: Berechne den Gesamtwert des abzuziehenden Betrags in GP
    let amountGPValue = 0;
    Object.keys(amount).forEach(unitAbbr => {
        const coin = denominations.find(c => c.translationLabel.startsWith(unitAbbr.toUpperCase()));
        if (coin) {
            amountGPValue += amount[unitAbbr.toUpperCase()] * coin.valueInGP;
        }
    });

    // Schritt 3: Subtrahiere den Betrag
    const remainingGP = totalGPValue - amountGPValue;

    // Schritt 4: Verteile den verbleibenden Betrag auf die Währungseinheiten
    const updatedPurse = { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 };
    let remainingValue = remainingGP;

    for (const coin of denominations) {
        const unitAbbr = coin.translationLabel.replace("Label", ""); // "GPLabel" -> "GP"
        updatedPurse[unitAbbr] = Math.floor(remainingValue / coin.valueInGP); // Ganze Anzahl
        remainingValue = parseFloat((remainingValue % coin.valueInGP).toFixed(8)); // Verbleibenden Wert runden
    }

    // Schritt 5: Umrechnung von SP in EP (5 SP = 1 EP)
    if (updatedPurse.SP >= 5) {
        updatedPurse.EP += Math.floor(updatedPurse.SP / 5); // Konvertiere SP in EP
        updatedPurse.SP = updatedPurse.SP % 5; // Rest-SP
    }

    return updatedPurse;
}

/**
 * Normalisiert die Währungswerte in der Geldbörse (keine Dezimalzahlen).
 * @param {object} purse - Die Geldbörse mit den Werten für CP, SP, EP, GP, PP.
 * @returns {object} Die normalisierte Geldbörse.
 */
function normalizePurseValues(purse) {
    const denominations = coinList.sort((a, b) => b.valueInGP - a.valueInGP); // Sortiert von PP zu CP
    let totalGPValue = 0;

    // Schritt 1: Berechne den Gesamtwert in GP
    Object.keys(purse).forEach(unitAbbr => {
        const coin = denominations.find(c => c.translationLabel.startsWith(unitAbbr.toUpperCase()));
        if (coin) {
            totalGPValue += purse[unitAbbr.toUpperCase()] * coin.valueInGP;
        }
    });

    // Schritt 2: Verteile den Gesamtwert auf die Währungseinheiten
    const normalizedPurse = { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 };
    for (const coin of denominations) {
        const unitAbbr = coin.translationLabel.replace("Label", ""); // "GPLabel" -> "GP"
        normalizedPurse[unitAbbr] = Math.trunc(totalGPValue / coin.valueInGP); // Ganze Anzahl
        totalGPValue %= coin.valueInGP; // Restbetrag für kleinere Einheiten
    }

    return normalizedPurse;
}

/**
 * Setzt die Geldbörsenwerte auf die ursprünglich berechneten Startwerte zurück.
 */
function resetPurseValues() {
    // Berechne die Geldbörse neu
    character.purse = initiatePurse();

    // Aktualisiere die Inputfelder der Geldbörse
    updatePurseUI();

    console.log("Geldbörse zurückgesetzt:", character.purse);
}

/**
 * Schaltet den Bereich "Weitere Ausrüstung wählen" um.
 */
function toggleAdditionalEquipment() {
    const toggleHeader = document.getElementById('additionalEquipmentToggle'); // NEU: Header-Element
    const section = document.getElementById('additionalEquipmentSection');
    const arrow = document.getElementById('toggleArrow');
    const isVisible = section.style.display !== 'none';

    if (isVisible) {
        section.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
        
        // Fügt die abgerundeten Ecken und die untere Linie am Header wieder hinzu
        toggleHeader.classList.remove('expanded-border');
    } else {
        section.style.display = 'block';
        arrow.style.transform = 'rotate(-180deg)';
        
        // Entfernt die abgerundeten Ecken und die untere Linie am Header
        toggleHeader.classList.add('expanded-border');
    }
}

/**
 * Rendert das zweite Dropdown (Item-Liste) basierend auf der Kategorie.
 */
function renderItemDropdown() {
    const container = document.getElementById('itemDropdownContainer');
    const addButton = document.getElementById('addItemButton');
    const elements = translations[currentLang];
    
    // Kategorie-Dropdown immer sichtbar
    let categoryDropdownHTML = `
        <label for="categoryDropdown">${elements.categoryLabel}:</label>
        <select id="categoryDropdown" class="dropdown" onchange="updateItemDropdown()">
            <option value="">${elements.pleaseSelectLabel}</option>
            <option value="weapon">${elements.weaponsLabel}</option>
            <option value="armor">${elements.armorLabel}</option>
            <option value="tool">${elements.toolsLabel}</option>
            <option value="gear">${elements.gearLabel}</option>
            <option value="vehicle">${elements.mountAndVehicleLabel}</option>
        </select>
    `;
    
    // Identifier-Dropdown (immer sichtbar, Inhalt wird dynamisch aktualisiert)
    let itemDropdownHTML = `
        <label for="itemDropdown">${elements.identifierLabel}:</label>
        <select id="itemDropdown" class="dropdown">
            <option value="">${elements.pleaseSelectLabel}</option>
        </select>
    `;

    // Button immer sichtbar
    let addButtonHTML = `
        <button id="addItemButton" type="button" onclick="addItemToTable()">
            ${elements.addItemButtonLabel || 'Hinzufügen'}
        </button>
    `;

    // Kombinierter HTML-Code
    container.innerHTML = `
        ${categoryDropdownHTML}
        ${itemDropdownHTML}
        ${addButtonHTML}
    `;
}

function updateItemDropdown() {
    const category = document.getElementById('categoryDropdown').value;
    const itemDropdown = document.getElementById('itemDropdown');
    const elements = translations[currentLang];
    
    if (!category) {
        itemDropdown.innerHTML = `<option value="">${elements.pleaseSelectLabel}</option>`;
        return;
    }

    let itemList = [];
    switch (category) {
        case 'weapon': itemList = weaponList; break;
        case 'armor': itemList = armorList; break;
        case 'tool': itemList = toolList; break;
        case 'gear': itemList = adventuringGearList; break;
        case 'vehicle': 
            // Hier werden die Listen kombiniert, was zu doppelten IDs führt
            itemList = [...mountList, ...tackList, ...shipList];
            break;
    }

    const options = itemList.map(item => {
        const name = elements[item.translationLabel] || item.translationLabel;
        const cost = getCostObject(item);
        const costDisplay = cost ? ` (${cost.value} ${elements[cost.unit] || cost.unit.replace('Label', '')})` : '';

        // Das verhindert Konflikte bei doppelten IDs in kombinierten Listen.
        return `<option value="${item.translationLabel}">${name}${costDisplay}</option>`;
    }).join('');

    itemDropdown.innerHTML = `
        <option value="">${elements.pleaseSelectLabel}</option>
        ${options}
    `;
}

/**
 * Fügt das im Dropdown ausgewählte Item zur tempEquipment-Liste hinzu
 * und passt die Geldbörse an.
 */
function addItemToTable() {
    const categoryDropdown = document.getElementById('categoryDropdown');
    const itemDropdown = document.getElementById('itemDropdown');

    if (!categoryDropdown.value || !itemDropdown.value) {
        alert(translations[currentLang].selectItemAlert || "Bitte wählen Sie eine Kategorie und ein Item.");
        return;
    }

    const categorySingular = categoryDropdown.value; 
    let categoryKey = categorySingular;

    // Spezialfälle für Kategorie-Keys
    if (categorySingular === 'armor' || categorySingular === 'gear') {
        categoryKey = categorySingular; 
    } else {
        categoryKey += 's'; // weapon -> weapons, etc.
    }

    const itemLabel = itemDropdown.value; 
    const itemData = findItemData(itemLabel); 

    if (!itemData) {
        console.error("Item-Daten nicht gefunden für Label:", itemLabel);
        return;
    }

    if (!tempEquipment.hasOwnProperty(categoryKey)) {
        console.error(`Kategorie ${categoryKey} existiert nicht in tempEquipment.`);
        return; 
    }

    // Manuell hinzugefügte Items starten mit Menge 1
    const amount = 1;
    const itemCost = getCostObject(itemData);
    let selectedVaries = null; 

    // --- Typ berechnen ---
    const elements = translations[currentLang];
    // Bei manuellen Items ist source meist leer oder 'manual'
    const calculatedType = determineItemTypeLabel({ source: 'manual', selectedVaries: null }, itemData, elements);

    // Item hinzufügen
    tempEquipment[categoryKey].push({
        id: itemData.ID, 
        label: itemData.translationLabel,
        amount: amount,
        cost: itemCost,
        isOptionItem: false, 
        isStruck: false,
        selectedVaries: selectedVaries, 
        isPackExpanded: true,
        typeLabel: calculatedType 
    });

    // Kosten abziehen (falls vorhanden)
    if (itemCost) {
        const cost = { [itemCost.unit.replace("Label", "")]: itemCost.value * amount };
        character.purse = calculatePurse(character.purse, negateCost(cost)); 
    }

    // UI aktualisieren
    renderEquipmentTables(); 
    updatePurseUI(); 

    // Reset Dropdown
    itemDropdown.value = "";
}

/**
 * Behandelt das Durchstreichen von Item-Preisen in Bereich 3.
 */
function toggleItemStrikethrough(category, index, element) {
    const item = tempEquipment[category][index];
    if (!item || !item.cost) return;

    // Überprüfe, ob das Item aus den Optionen stammt (Bereich 1)
    if (item.isOptionItem) {
        console.warn("Die Streichung von Preisen für Items aus den Optionen kann nicht entfernt werden.");
        return; // Verhindere Änderungen an der Streichung
    }

    // Status umschalten (durchgestrichen oder nicht)
    item.isStruck = !item.isStruck;
    element.classList.toggle('strikethrough-cost', item.isStruck);

    // Berechne den Preis des Items
    const cost = { [item.cost.unit.replace("Label", "")]: item.cost.value * item.amount };

    // Betrag zur Geldbörse hinzufügen oder abziehen
    if (item.isStruck) {
        // Preis durchgestrichen -> Geld dem Nutzer zurückgeben
        character.purse = calculatePurse(character.purse, cost);
    } else {
        // Preis nicht durchgestrichen -> Geld vom Nutzer abziehen
        character.purse = calculatePurse(character.purse, negateCost(cost));
    }

    // Aktualisiere die Inputfelder der Geldbörse
    updatePurseUI();
}

/**
 * Negiert die Kosten eines Items.
 * @param {object} cost - Das Kostenobjekt (z. B. { GP: 1, SP: 5 }).
 * @returns {object} Negiertes Kostenobjekt (z. B. { GP: -1, SP: -5 }).
 */
function negateCost(cost) {
    const negatedCost = {};
    Object.keys(cost).forEach(unit => {
        negatedCost[unit] = -cost[unit];
    });
    return negatedCost;
}

/**
 * Rendert die 5 Ausrüstungstabellen (Waffen, Rüstungen, etc.) in Bereich 3.
 */
/**
 * Rendert die 5 Ausrüstungstabellen (Waffen, Rüstungen, etc.) in Bereich 3.
 */
function renderEquipmentTables() {
    const container = document.getElementById('equipmentTablesContainer');
    const elements = translations[currentLang];
    
    const safeData = (value) => (value !== undefined && value !== 0 && value !== null) ? value : '-';

    const categories = [
        { key: 'weapons', label: elements.weaponsLabel, data: tempEquipment.weapons, headers: [elements.amountLabel, elements.identifierLabel, elements.categoryLabel, elements.propertyLabel, elements.damageLabel, elements.costsLabel] },
        { key: 'armor', label: elements.armorLabel, data: tempEquipment.armor, headers: [elements.amountLabel, elements.identifierLabel, elements.categoryLabel, elements.classLabel, elements.requirementsLabel, elements.costsLabel] },
        { key: 'tools', label: elements.toolsLabel, data: tempEquipment.tools, headers: [elements.amountLabel, elements.identifierLabel, elements.abilityLabel, elements.variesLabel, elements.costsLabel] },
        { key: 'gear', label: elements.gearLabel, data: tempEquipment.gear, headers: [elements.amountLabel, elements.identifierLabel, elements.typeLabel, elements.variesLabel, elements.costsLabel] },
        { key: 'vehicles', label: elements.mountAndVehicleLabel, data: tempEquipment.vehicles, headers: [elements.amountLabel, elements.identifierLabel, elements.capacityLabel, elements.crewLabel, elements.passangersLabel, elements.costsLabel] }
    ];

    container.innerHTML = categories.map(cat => {
        let tableBody = '';

        cat.data.forEach((item, index) => {
            const itemData = findItemData(item.label);
            if (!itemData) return;

            // Zustand des Packs abrufen
            const isPack = itemData.pack === 1;
            const isPackExpanded = item.isPackExpanded !== undefined ? item.isPackExpanded : true;
            const toggleClass = isPackExpanded ? 'pack-expanded' : 'pack-collapsed';

            // --- 1. HAUPT-ITEM-ZEILE RENDERN ---
            
            const itemCategory = itemData.weaponCategoryNumber ? weaponCategory.find(c => c.weaponCategoryNumber === itemData.weaponCategoryNumber)?.translationLabel :
                                 itemData.armorCategoryNumber ? armorCategory.find(c => c.armorCategoryNumber === itemData.armorCategoryNumber)?.translationLabel :
                                 itemData.toolCategoryNumber ? toolCategoryList.find(c => c.toolCategoryNumber === itemData.toolCategoryNumber)?.translationLabel :
                                 elements.gearLabel;

            const itemProperties = itemData.weaponPropertyCategoryNumber ?
                [itemData.weaponPropertyCategoryNumber].flat().map(propNum => weaponProperty.find(p => p.weaponPropertyCategoryNumber === propNum)?.translationLabel).filter(Boolean).map(label => elements[label] || label).join(', ') :
                '-';
                
            const damageTypeData = damageType.find(d => d.damageCategoryNumber === itemData.damageCategoryNumber);
            const damageTypeLabel = damageTypeData ? elements[damageTypeData.translationLabel] || damageTypeData.translationLabel.replace('Label', '') : '';
            const damageValue = safeData(itemData.weaponDamageValue) !== '-' ? `${itemData.weaponDamageValue} ${damageTypeLabel}` : '-';

            const itemCost = item.cost;
            let costDisplay = '-';
            let isStruck = item.isStruck || false;
            
            if (itemCost) {
                costDisplay = `${itemCost.value} ${elements[itemCost.unit] || itemCost.unit.replace('Label', '')}`;
                costDisplay = `<span class="${isStruck ? 'strikethrough-cost' : 'normal-cost'}" onclick="toggleItemStrikethrough('${cat.key}', ${index}, this)">${costDisplay}</span>`;
            }

            const minAmount = 0;
            const maxAmount = item.isOptionItem ? item.initialAmount : 100;
            const amountInput = `
                <input type="number" 
                        value="${item.amount}" 
                        min="${minAmount}" 
                        max="${maxAmount}" 
                        data-category="${cat.key}"
                        data-index="${index}"
                        oninput="updateItemAmount(this, ${item.isOptionItem})">
            `;
            
            const variesDisplay = getVariesDisplay(item, itemData, index, cat.key, elements);
            
            // --- Fahrzeug-Logik ---
            let capacityDisplay = '-';
            if (itemData.carryingCapacity) {
                if (currentLang === 'de') {
                    const kgValue = Math.round(itemData.carryingCapacity * 0.453592);
                    capacityDisplay = `${kgValue} kg`;
                } else {
                    capacityDisplay = `${itemData.carryingCapacity} lb`;
                }
            } else if (itemData.cargo) {
                if (currentLang === 'de') {
                    capacityDisplay = `${itemData.cargo} t`;
                } else {
                    capacityDisplay = `${itemData.cargo} tons`;
                }
            }

            const vehicleData = {
                capacity: capacityDisplay,
                crew: safeData(itemData.crew),
                passengers: safeData(itemData.passengers)
            };
            // ------------------------------------------

            const mainRowClasses = isPack ? 'pack-main-row clickable' : '';
            const onClickHandler = isPack ? `onclick="togglePackContent('${cat.key}', ${index})"` : '';

            // --- NEU: Typ-Label Anzeige Logik ---
            // 1. ID holen (z.B. 'packLabel' oder 'singleItemLabel')
            let typeLabelId = determineItemTypeLabel(item, itemData, elements);
            
            // 2. Übersetzen oder "-" anzeigen
            let typeLabelContent = '-'; // Standard ist Bindestrich
            
            if (typeLabelId && typeLabelId !== 'singleItemLabel') {
                // Wenn es eine spezielle ID ist (nicht singleItemLabel), versuchen wir zu übersetzen
                typeLabelContent = elements[typeLabelId] || typeLabelId;
            }
            
            // 3. Pfeil hinzufügen für Packs
            if (isPack) {
                const arrowClass = isPackExpanded ? 'arrow-down' : 'arrow-up';
                typeLabelContent += ` <span class="pack-arrow ${arrowClass}">&#9660;</span>`;
            }
            // ------------------------------------

            const cellData = {
                'weapons': [amountInput, elements[item.label] || item.label, elements[itemCategory] || itemCategory, itemProperties, damageValue, costDisplay],
                'armor': [amountInput, elements[item.label] || item.label, elements[itemCategory] || itemCategory, itemData.armorClassValue || '-', (itemData.strengthAttr > 0 ? `${elements.strengthLabel}: ${itemData.strengthAttr}` : '-'), costDisplay],
                'tools': [amountInput, elements[item.label] || item.label, elements[itemData.toolAbility] || itemData.toolAbility, variesDisplay, costDisplay],
                'gear': [amountInput, elements[item.label] || item.label, typeLabelContent, variesDisplay, costDisplay],
                'vehicles': [amountInput, elements[item.label] || item.label, vehicleData.capacity, vehicleData.crew, vehicleData.passengers, costDisplay]
            };

            // Hauptzeile hinzufügen
            tableBody += `<tr id="itemRow-${cat.key}-${index}" class="${mainRowClasses}" ${onClickHandler}>${cellData[cat.key].map(cell => `<td>${cell}</td>`).join('')}</tr>`;


            // --- 2. PACK-INHALTE RENDERN (falls pack = 1) ---
            if (isPack && itemData.packConent && Array.isArray(itemData.packConent)) {
                
                itemData.packConent.forEach(contentItemString => {
                    const contentItemAmount = extractAmount(contentItemString);
                    const contentItemLabel = extractLabel(contentItemString);
                    const contentItemData = findItemData(contentItemLabel);

                    if (contentItemData) {
                        const contentItemCost = getCostObject(contentItemData);
                        
                        const contentCostDisplay = contentItemCost 
                            ? `<span class="strikethrough-cost">${contentItemCost.value} ${elements[contentItemCost.unit] || contentItemCost.unit.replace('Label', '')}</span>` 
                            : '-';

                        const translatedLabel = elements[contentItemLabel] || contentItemLabel;
                        
                        const disabledAmountInput = `<input type="number" value="${contentItemAmount}" min="${contentItemAmount}" max="${contentItemAmount}" disabled>`;
                        
                        const componentCellData = [
                            disabledAmountInput, 
                            `+ ${translatedLabel}`, 
                            safeData((contentItemData.pack === 1 ? elements.packLabel : '-')), // Hier auch '-' statt singleItemLabel für Pack-Inhalte
                            '-', // Varies
                            contentCostDisplay
                        ];
                        
                        tableBody += `<tr class="pack-component-row ${toggleClass}"><td>${componentCellData.join('</td><td>')}</td></tr>`;
                    }
                });
            } // Ende Pack-Inhalte
            
        });

        // Rückgabe des gesamten Tabellen-HTML-Strings
        return `
            <h3>${cat.label}</h3>
            <table id="${cat.key}Table" class="item-table">
                <thead>
                    <tr>${cat.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>${tableBody}</tbody>
            </table>
        `;
    }).filter(Boolean).join('<hr>');
    
    if (!container.innerHTML.trim()) {
        container.innerHTML = `<p>${elements.noEquipmentLabel || "Keine Ausrüstung hinzugefügt."}</p>`;
    }
}

function setupAdditionalEquipmentUI() {
    const container = document.getElementById('itemSelectionContainer');
    const elements = translations[currentLang];
    
    // Struktur: Jedes Label + Dropdown/Button in einem eigenen Block (untereinander)
    container.innerHTML = `
        <div class="equipment-form-group">
            <label for="categoryDropdown" class="equipment-label">${elements.categoryLabel}:</label>
            <select id="categoryDropdown" class="dropdown" onchange="updateItemDropdown()">
                <option value="">${elements.pleaseSelectLabel}</option>
                <option value="weapon">${elements.weaponsLabel}</option>
                <option value="armor">${elements.armorLabel}</option>
                <option value="tool">${elements.toolsLabel}</option>
                <option value="gear">${elements.gearLabel}</option>
                <option value="vehicle">${elements.mountAndVehicleLabel}</option>
            </select>
        </div>
        
        <div class="equipment-form-group">
            <label for="itemDropdown" class="equipment-label">${elements.identifierLabel}:</label>
            <select id="itemDropdown" class="dropdown">
                <option value="">${elements.pleaseSelectLabel}</option>
            </select>
        </div>
        
        <div class="equipment-form-group">
            <button id="addItemButton" class="equipment-button" type="button" onclick="addItemToTable()">
                ${elements.addItemButtonLabel || 'Hinzufügen'}
            </button>
        </div>
    `;
    
    // Aktualisiere Dropdown-Liste beim Start
    renderEquipmentTables(); 
}

/**
 * Behandelt die Änderung der Item-Menge
 */
function updateItemAmount(inputElement, isOptionItem) {
    const category = inputElement.dataset.category;
    const index = parseInt(inputElement.dataset.index, 10);
    const item = tempEquipment[category][index];

    const oldAmount = item.amount;
    const newAmount = parseInt(inputElement.value, 10);

    // Eingabebegrenzung: Normale Items vs. Option-Items
    const minAmount = 0; // Items können auf 0 reduziert werden
    const maxAmount = item.isOptionItem ? item.initialAmount : 100; // Option-Items sind bis zur initialen Menge begrenzt

    // Begrenzung auf erlaubte Werte
    if (newAmount > maxAmount) {
        inputElement.value = maxAmount; // Setze den Wert auf die maximale erlaubte Menge zurück
        item.amount = maxAmount;
        console.warn(`Menge auf Maximum (${maxAmount}) korrigiert.`);
        renderEquipmentTables();
        updatePurseUI();
        return;
    }

    if (newAmount < minAmount) {
        inputElement.value = oldAmount; // Setze den alten Wert zurück
        console.warn("Die Menge darf nicht unter 0 liegen.");
        return;
    }

    // Wenn die Menge auf 0 reduziert wird, entferne das Item aus der Tabelle
    if (newAmount === 0) {
        if (!item.isStruck && item.cost) {
            const costChange = { [item.cost.unit.replace("Label", "")]: item.cost.value * oldAmount };
            character.purse = calculatePurse(character.purse, costChange);
        }

        // Entferne das Item aus der Tabelle
        tempEquipment[category].splice(index, 1);

        // Aktualisiere die Tabelle und die Geldbörse
        renderEquipmentTables();
        updatePurseUI();
        // console.log("Item entfernt. Geldbörse aktualisiert:", character.purse); 
        return;
    }

    // --- Kritische Kostenprüfung ---
    if (item.cost) {
        const difference = newAmount - oldAmount; // Differenz zwischen neuer und alter Menge
        const cost = { [item.cost.unit.replace("Label", "")]: item.cost.value * Math.abs(difference) };

        // Geldbörse nur anpassen, wenn:
        // 1. Das Item manuell hinzugefügt wurde (item.isOptionItem === false)
        // 2. Der Preis nicht durchgestrichen ist (item.isStruck === false)
        if (!item.isOptionItem && !item.isStruck) {
            if (difference > 0) {
                // Menge wurde erhöht -> Subtrahiere Kosten der zusätzlichen Items
                character.purse = calculatePurse(character.purse, negateCost(cost));
            } else if (difference < 0) {
                // Menge wurde verringert -> Addiere Kosten der entfernten Items
                character.purse = calculatePurse(character.purse, cost);
            }
        }
    }

    // Aktualisiere die Menge des Items
    item.amount = newAmount;

    // Aktualisiere die Tabelle und die Geldbörse
    renderEquipmentTables();
    updatePurseUI();

    console.log("Geldbörse nach Mengenänderung aktualisiert:", character.purse);
}

/**
 * Bestimmt das Label für die Spalte "Typ" (z.B. Pack, Fokus, Single Item).
 * ENTHÄLT: Sternenkarten, Zaubermaterialien, Packs und klassenspezifische Fokusse.
 */
/**
 * Bestimmt das Label-ID für die Spalte "Typ".
 * Gibt die ID zurück (z.B. 'packLabel'), damit sie gespeichert und später übersetzt werden kann.
 */
function determineItemTypeLabel(item, itemData, elements) {
    if (!itemData) return '';

    // REGEL 0: Spezielle Herkunft
    if (item.source === 'granted_starmap') {
        return 'starMapLabel'; 
    }
    if (item.source === 'granted_spell_material') {
        return 'spellMaterialLabel'; 
    }

    // REGEL 1: Packs
    if (itemData.pack === 1) {
        return 'packLabel';
    }

    // REGEL 2: Zauberfokus
    let isFocus = false;
    const currentClass = character.class ? character.class.toLowerCase() : "";
    const label = itemData.translationLabel;

    const checkFocus = (list, genericLabel) => {
        if (list.some(i => i.translationLabel === label)) return true;
        if (label === genericLabel) return true;
        if (item.selectedVaries && list.some(i => i.translationLabel === item.selectedVaries)) return true;
        return false;
    };

    if (currentClass === 'wizard') {
        if (checkFocus(arcaneFocusList, 'arcaneFocusLabel')) isFocus = true;
        if (label === 'spellbookLabel') isFocus = true;
    } else if (currentClass === 'sorcerer' || currentClass === 'warlock') {
        if (checkFocus(arcaneFocusList, 'arcaneFocusLabel')) isFocus = true;
    } else if (currentClass === 'druid' || currentClass === 'ranger') {
        if (checkFocus(druidicFocusList, 'druidicFocusLabel')) isFocus = true;
    } else if (currentClass === 'cleric' || currentClass === 'paladin') {
        if (checkFocus(holySymbolList, 'holySymbolLabel')) isFocus = true;
    } else if (currentClass === 'bard') {
        if (checkFocus(instrumentList, 'musicalInstrumentLabel')) isFocus = true;
    }

    if (isFocus) {
        return 'spellcastingFocusLabel';
    }

    // REGEL N: Standardfall (ID zurückgeben!)
    // Wir geben hier den String zurück, den du in deiner Translation-Datei als Key hast.
    return 'singleItemLabel'; 
}

/**
 *Sucht und gibt Item-Daten (inkl. Kosten) für eine spezifische Variante (Varies-Label) zurück,
 * indem alle relevanten Sub-Listen durchsucht werden.
 */
function findVariesData(label) {
    const allVariesLists = [
        ammunitionList,
        instrumentList,
        gameList,
        arcaneFocusList,
        druidicFocusList,
        holySymbolList
    ];
    
    if (!label || typeof label !== 'string') return null;

    for (const list of allVariesLists) {
        let item = list.find(item => item.translationLabel === label);
        if (item) {
            return item; 
        }
    }
    return null;
}


/**
 * Gibt das HTML für das Varies-Feld (Dropdown oder statisches Label) zurück,
 * inklusive Preis-Anzeige und Deaktivierung bei Options-Items.
 */
function getVariesDisplay(item, itemData, itemIndex, categoryKey, elements) {
    // Prüfen Sie, ob das Item überhaupt Varianten hat
    if (!itemData.varies || itemData.varies === 0) {
        return '-';
    }
    
    // Sicherstellen, dass varies ein Array ist
    const variesOptions = Array.isArray(itemData.varies) ? itemData.varies : [itemData.varies];
    const isDisabled = item.isOptionItem;
    
    // --- Standard-Wert Logik ---
    let selectedValue = item.selectedVaries;

    // Wenn es ein Options-Item ist, MUSS ein Wert gewählt sein (Standard: der erste)
    if (isDisabled && !selectedValue) {
        selectedValue = variesOptions[0];
    }
    
    // Wenn das Item ein Options-Item ist, zeige nur das statische, übersetzte Label an (kein Dropdown)
    // ODER gib ein deaktiviertes Dropdown zurück, je nach Wunsch. Hier: Statisch für saubere Optik.
    if (isDisabled) {
        return elements[selectedValue] || selectedValue;
    }

    let optionsHtml = '';
    
    // Füge "- Bitte wählen -" hinzu, wenn es ein manuelles Item ist
    if (!isDisabled) {
        const pleaseSelectText = elements.pleaseSelectLabel || "- Bitte wählen -";
        // Wenn noch nichts ausgewählt wurde (selectedValue ist null/undefined), ist diese Option "selected"
        const isDefaultSelected = !selectedValue ? 'selected' : '';
        optionsHtml += `<option value="" ${isDefaultSelected}>${pleaseSelectText}</option>`;
    }

    // Optionen generieren
    optionsHtml += variesOptions.map(variesLabel => {
        const name = elements[variesLabel] || variesLabel;
        const variesItemData = findVariesData(variesLabel);
        
        let costDisplay = '';
        if (variesItemData) {
            const cost = getCostObject(variesItemData);
            if (cost) {
                costDisplay = ` (${cost.value} ${elements[cost.unit] || cost.unit.replace('Label', '')})`;
            }
        }
        
        const isSelected = variesLabel === selectedValue ? 'selected' : '';
        return `<option value="${variesLabel}" ${isSelected}>${name}${costDisplay}</option>`;
    }).join('');

    const onChangeHandler = `onchange="handleVariesSelection(this, '${categoryKey}', ${itemIndex})"`;

    return `
        <select class="varies-dropdown" data-category="${categoryKey}" data-index="${itemIndex}" 
                ${onChangeHandler}>
            ${optionsHtml}
        </select>
    `;
}

/**
 * Prüft, ob ein Label eine Variante eines anderen Items ist (z.B. "arrowLabel" -> "ammunitionLabel").
 * Gibt das Eltern-Item und die Kosten der Variante zurück.
 */
function findParentItemOfVariant(variantLabel) {
    // Listen, die Items mit 'varies' enthalten können
    const parentLists = [
        toolList, 
        adventuringGearList
        // weaponList und armorList haben aktuell keine varies, daher hier nicht nötig
    ];

    for (const list of parentLists) {
        // Suche ein Item, dessen 'varies' Array das gesuchte Label enthält
        const parent = list.find(p => p.varies && Array.isArray(p.varies) && p.varies.includes(variantLabel));
        
        if (parent) {
            // Wir haben den Elternteil gefunden (z.B. Ammunition).
            // Jetzt holen wir uns noch die spezifischen Daten der Variante (für den Preis)
            const variantData = findVariesData(variantLabel);
            
            return {
                parentItem: parent,
                variantData: variantData // Enthält Kosten, Gewicht etc. der Variante
            };
        }
    }
    return null;
}

/**
 * Aktualisiert die Kosten und die Anzeige, wenn eine Variante gewählt wird (nur für manuelle Items).
 * Wird durch das onchange-Event des Dropdowns ausgelöst.
 */
function handleVariesSelection(selectElement, categoryKey, itemIndex) {
    const selectedVariesLabel = selectElement.value;
    const item = tempEquipment[categoryKey][itemIndex];
    
    // Item muss manuell hinzugefügt sein
    if (item.isOptionItem) return;

    // 1. Hole die Daten der neu gewählten Variante und die alten Kosten
    const variesItemData = findVariesData(selectedVariesLabel);
    const newCost = variesItemData ? getCostObject(variesItemData) : null;
    
    const oldCost = item.cost;
    const amount = item.amount;
    
    let diffGP = 0;
    
    // 2. Berechne die Kostendifferenz in GP (nur wenn Item nicht durchgestrichen ist)
    if (!item.isStruck) {
        // Alte Kosten entfernen
        if (oldCost) {
            diffGP -= toGoldValue(oldCost.value, oldCost.unit) * amount;
        }
        // Neue Kosten addieren
        if (newCost) {
            diffGP += toGoldValue(newCost.value, newCost.unit) * amount;
        }
    }

    // 3. Aktualisiere Item-Daten
    item.cost = newCost;
    item.selectedVaries = selectedVariesLabel;
    
    // 4. Aktualisiere die Geldbörse (falls Kostenänderung > 0)
    if (diffGP !== 0) {
        // die Kostenänderung bezahlen muss (Kauf) oder zurückerhält (Verkauf).
        const adjustment = { GP: -diffGP }; // Wenn diffGP positiv (+4 GP) ist, wird -4 GP angewendet.
        
        character.purse = calculatePurse(character.purse, adjustment);
        updatePurseUI();
    }
    
    // 5. UI neu rendern, um den neuen Preis anzuzeigen
    renderEquipmentTables();
}

/**
 * Sammelt Ausrüstung, die durch spezielle Features (Sternenkarte, Zaubermaterialien)
 * aus vorherigen Schritten gewährt wurde.
 */
function processGrantedItems() {
    // 1. Zuerst aufräumen: Alte gewährt Items entfernen, um Duplikate beim Neu-Rendern zu vermeiden
    const grantedSources = ['granted_starmap', 'granted_spell_material'];
    
    Object.keys(tempEquipment).forEach(category => {
        tempEquipment[category] = tempEquipment[category].filter(item => {
            return !grantedSources.includes(item.source);
        });
    });

    // -----------------------------------------------------------
    // A) DRUIDE: STERNENKARTE (Circle of Stars)
    // -----------------------------------------------------------
    if (character.classForm && character.classForm.starMaps && character.classForm.starMaps.length > 0) {
        // Die ID aus classForm holen (z.B. "1" für Schriftrolle)
        const mapId = parseInt(character.classForm.starMaps[0], 10);
        // Den Eintrag in der starMapsList finden, um das translationLabel zu bekommen
        const mapEntry = starMapsList.find(m => m.starMapNumber === mapId);

        if (mapEntry) {
            // Das eigentliche Item in den Hauptlisten suchen (da du sagtest, sie existieren dort)
            const itemData = findItemData(mapEntry.translationLabel);
            
            if (itemData) {
                const itemCost = getCostObject(itemData);
                const category = getItemCategory(itemData); // Automatische Kategorie (meist 'gear')
		const calculatedType = determineItemTypeLabel({ source: 'granted_starmap' }, itemData, translations[currentLang]);

                // Zur Ausrüstung hinzufügen
                if (tempEquipment[category]) {
                    tempEquipment[category].push({
                        id: itemData.ID,
                        label: itemData.translationLabel,
                        amount: 1,
                        initialAmount: 1,
                        cost: itemCost,
                        isOptionItem: false, // Erlaubt Mengenänderung nach oben
                        isStruck: true,     // Standardmäßig kostenlos/durchgestrichen
                        source: 'granted_starmap', // Wichtig für determineItemTypeLabel
                        typeLabel: calculatedType,
                        selectedVaries: null,
                        isPackExpanded: true
                    });
                }
            }
        }
    }

    // -----------------------------------------------------------
    // B) ZAUBERMATERIALIEN
    // -----------------------------------------------------------
    // Sammle alle relevanten Zauber-IDs
    const allSpellIds = new Set();
    
    // 1. Cantrips (Array von IDs)
    if (character.cantrips) {
        character.cantrips.forEach(id => allSpellIds.add(id));
    }
    
    // 2. Prepared Spells (Array von Objekten {spellId, source})
    if (character.spells) {
        character.spells.forEach(obj => allSpellIds.add(obj.spellId));
    }
    
    // 3. Spellbook (falls Wizard) - Materialien braucht man meist nur zum Casten, 
    // aber oft hat man sie dabei. Wir nehmen hier nur prepared/cantrips, 
    // da man für nicht vorbereitete Zauber meist keine Mats griffbereit haben muss. 
    // (Anpassbar, falls auch Spellbook gewünscht ist).

    const addedMaterials = new Set(); // Um Duplikate zu vermeiden

    allSpellIds.forEach(spellId => {
        const spell = spellList.find(s => s.ID === spellId);
        
        // Hat der Zauber Materialien?
        if (spell && spell.spellMaterial) {
            // spellMaterial kann ein String oder ein Array von Strings sein
            const materials = Array.isArray(spell.spellMaterial) ? spell.spellMaterial : [spell.spellMaterial];

            materials.forEach(matLabel => {
                if (addedMaterials.has(matLabel)) return; // Schon hinzugefügt

                // Suche nach den Item-Daten für das Material
                const itemData = findItemData(matLabel);
                
                if (itemData) {
                    const itemCost = getCostObject(itemData);
                    const category = getItemCategory(itemData);
                    const calculatedType = determineItemTypeLabel({ source: 'granted_spell_material' }, itemData, translations[currentLang]);

                    if (tempEquipment[category]) {
                        tempEquipment[category].push({
                            id: itemData.ID,
                            label: itemData.translationLabel,
                            amount: 1,
                            initialAmount: 1,
                            cost: itemCost,
                            isOptionItem: false,
                            isStruck: true, // Kostenlos gewährt
                            source: 'granted_spell_material', // Wichtig für determineItemTypeLabel
                            typeLabel: calculatedType,
                            selectedVaries: null,
                            isPackExpanded: true
                        });
                    }
                    addedMaterials.add(matLabel);
                } 
                // else: Item nicht gefunden (sollte nicht passieren laut deiner Info)
            });
        }
    });

    // -----------------------------------------------------------
    // C) SCHURKE: ASSASSIN KITS (Subklasse 2)
    // -----------------------------------------------------------
    if (character.class.toLowerCase() === 'rogue' && character.classForm?.subclass === "2") {
        const kitsToGrant = ['disguiseKitLabel', 'poisonersKitLabel'];
        
        kitsToGrant.forEach(kitLabel => {
            const itemData = findItemData(kitLabel);
            if (itemData) {
                const itemCost = getCostObject(itemData);
                const category = 'tools'; // Wir wissen, dass es Werkzeuge sind
                
                // Wir nutzen dein determineItemTypeLabel Schema
                // Hier übergeben wir eine temporäre Quelle, damit der Typ korrekt ermittelt wird
                const calculatedType = determineItemTypeLabel({ source: 'granted_subclass_item' }, itemData, translations[currentLang]);

                tempEquipment[category].push({
                    id: itemData.ID,
                    label: itemData.translationLabel,
                    amount: 1,
                    initialAmount: 1,
                    cost: itemCost,
                    isOptionItem: false,
                    isStruck: true,      // Kostenlos gewährt
                    source: 'granted_subclass_item',
                    typeLabel: calculatedType,
                    selectedVaries: null,
                    isPackExpanded: true
                });
            }
        });
    }
}

/**
* Wird aufgerufen, wenn sich Klasse, Hintergrund oder Zauber ändern.
 */
function resetEquipmentData() {
    // 1. Ausrüstungs-Container leeren
    character.equipment = { 
        weapons: [], 
        armor: [], 
        tools: [], 
        gear: [], 
        vehicles: [] 
    };

    // 2. Quellen-Auswahl löschen
    // Das ist das Signal für initializeEquipmentStep, alles neu zu berechnen
    character.selectedEquipmentSource = { class: null, background: null };

    // 3. Geldbörse nullen
    character.purse = { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 };

    console.log("Ausrüstung und Geldbörse wurden aufgrund von Änderungen in vorherigen Schritten zurückgesetzt.");
}

//=======================================================================
// SCHRITT 9: CHARACTER STORY
//=======================================================================

// Globale Zeichenbegrenzungen für Schritt 9
const MAX_STORY_LENGTH = 1000;
const MAX_DEITY_NAME_LENGTH = 50;
const MAX_COMMUNITY_NAME_LENGTH = 50;
const MAX_COMMUNITY_DESC_LENGTH = 500;

function saveStory() {
    // 1. Geschichte
    character.story = document.getElementById('storyInput').value;

    // 2. Sprachen (wir bauen das Array jedes Mal neu auf)
    const lang2 = parseInt(document.getElementById('langSelect2').value);
    const lang3 = parseInt(document.getElementById('langSelect3').value);
    
    character.languages = [1]; // Common ist immer ID 1
    if (!isNaN(lang2) && lang2 !== 0) character.languages.push(lang2);
    if (!isNaN(lang3) && lang3 !== 0) character.languages.push(lang3);

    // 3. Glaube
    if (document.getElementById('faithModeSelection').checked) {
        const dId = parseInt(document.getElementById('deitySelect').value);
        character.deityId = dId || null;
        const sel = document.getElementById('deitySelect');
        // Speichere nur den reinen Namen ohne die Domänen in Klammern
        if (dId) {
            const god = deityList.find(d => d.ID === dId);
            character.deityName = translations[currentLang][god.translationLabel] || god.translationLabel;
        } else {
            character.deityName = "";
        }
    } else {
        character.deityId = 0; // Kennung für Freitext
        character.deityName = document.getElementById('deityFreeName').value;
    }

    // 4. Gemeinschaft
    character.communityName = document.getElementById('communityNameInput').value;
    character.communityDesc = document.getElementById('communityDescInput').value;

    // --- LOGGER BLOCK: Globaler Character Status ---
    console.log("%c--- CHARACTER STORY ---", "color: #d4a017; font-weight: bold;");
    console.log("Story:", character.story);
    console.log("Languages (IDs):", character.languages);
    console.log("Deity ID:", character.deityId);
    console.log("Deity Name:", character.deityName);
    console.log("Community Name:", character.communityName);
    console.log("Community Desc:", character.communityDesc);

    updateProgress();
    goToStep(10);
}

/**
 * Initialisiert die Sektion Charaktergeschichte
 */
function initCharacterStory() {
    const elements = translations[currentLang];

    // 1. Zähler und Limits initialisieren
    bindTextCounter('storyInput', 'storyCounter', 'storyMax', MAX_STORY_LENGTH);
    bindTextCounter('deityFreeName', 'deityFreeCounter', 'deityFreeMax', MAX_DEITY_NAME_LENGTH);
    bindTextCounter('communityNameInput', 'commNameCounter', 'commNameMax', MAX_COMMUNITY_NAME_LENGTH);
    bindTextCounter('communityDescInput', 'commDescCounter', 'commDescMax', MAX_COMMUNITY_DESC_LENGTH);

    // 2. Grundlegende UI-Befüllung (Dropdowns)
    refreshLanguages();
    refreshPantheonOptions();

    // 3. Bestehende Daten aus dem character-Objekt in die Felder laden
    
    // Textfelder
    document.getElementById('storyInput').value = character.story || "";
    document.getElementById('communityNameInput').value = character.communityName || "";
    document.getElementById('communityDescInput').value = character.communityDesc || "";
    
    // Zähler nach dem Laden aktualisieren
    document.getElementById('storyCounter').innerText = (character.story || "").length;
    document.getElementById('commNameCounter').innerText = (character.communityName || "").length;
    document.getElementById('commDescCounter').innerText = (character.communityDesc || "").length;

    // Sprachen laden (Schleife durch gespeicherte Sprachen ab Index 1, da 0 = Common)
    if (character.languages && character.languages.length > 1) {
        document.getElementById('langSelect2').value = character.languages[1] || "";
        if (character.languages.length > 2) {
            document.getElementById('langSelect3').value = character.languages[2] || "";
        }
    }

    // Glaube laden
    if (character.deityId === 0) {
        // Freitext Modus
        document.getElementById('faithModeFree').checked = true;
        document.getElementById('deityFreeName').value = character.deityName || "";
        document.getElementById('deityFreeCounter').innerText = (character.deityName || "").length;
    } else if (character.deityId > 0) {
        // Auswahl Modus
        document.getElementById('faithModeSelection').checked = true;
        
        // Pantheon und Gottheit wiederherstellen
        const god = deityList.find(d => d.ID === character.deityId);
        if (god) {
            document.getElementById('pantheonSelect').value = god.pantheonLabel;
            refreshDeityOptions(); // Füllt das zweite Dropdown basierend auf dem Pantheon
            document.getElementById('deitySelect').value = god.ID;
            displayDeityDetails(); // Zeigt Gesinnung/Symbol an
        }
    }

    updateFaithUI(); // Blendet den richtigen Bereich (Free vs Selection) ein

    // Placeholders (Sprachabhängig)
    document.getElementById('storyInput').placeholder = elements.storyPlaceholderText || "";
    document.getElementById('deityFreeName').placeholder = elements.freeTextLabel || "";
    document.getElementById('communityNameInput').placeholder = elements.freeTextLabel || "";
    document.getElementById('communityDescInput').placeholder = elements.communityPlaceholderText || "";
}

function bindTextCounter(fieldId, countId, maxId, limit) {
    const field = document.getElementById(fieldId);
    const count = document.getElementById(countId);
    document.getElementById(maxId).innerText = limit;
    field.maxLength = limit;
    field.addEventListener('input', () => { count.innerText = field.value.length; });
}

function refreshLanguages() {
    const elements = translations[currentLang];
    const standards = languageList.filter(l => l.langRarity === "standard");
    
    const langC = document.getElementById('langCommon');
    const s2 = document.getElementById('langSelect2');
    const s3 = document.getElementById('langSelect3');

    if (!langC || !s2 || !s3) return;

    langC.innerHTML = `<option value="1">${elements.commonLangLabel}</option>`;

    // Default: "-Bitte wählen-"
    const pleaseSelect = elements.pleaseSelectLabel || "-Bitte wählen-";
    s2.innerHTML = `<option value="">${pleaseSelect}</option>`;
    s3.innerHTML = `<option value="">${pleaseSelect}</option>`;

    standards.forEach(l => {
        if (l.languageCategoryNumber === 1) return;
        const opt = document.createElement('option');
        opt.value = l.languageCategoryNumber;
        opt.textContent = elements[l.translationLabel] || l.translationLabel;
        s2.appendChild(opt.cloneNode(true));
        s3.appendChild(opt);
    });

    if (character.languages && character.languages.length > 1) {
        s2.value = character.languages[1] || "";
        if (character.languages.length > 2) s3.value = character.languages[2] || "";
    }
}

function updateFaithUI() {
    const isSelection = document.getElementById('faithModeSelection').checked;
    document.getElementById('faithSelectionWrapper').style.display = isSelection ? 'block' : 'none';
    document.getElementById('faithFreeWrapper').style.display = isSelection ? 'none' : 'block';
}

function refreshPantheonOptions() {
    const elements = translations[currentLang];
    const realmRadio = document.querySelector('input[name="activeRealm"]:checked');
    const pSelect = document.getElementById('pantheonSelect');
    if (!realmRadio || !pSelect) return;

    const pleaseSelect = elements.pleaseSelectLabel || "-Bitte wählen-";
    pSelect.innerHTML = `<option value="">${pleaseSelect}</option>`;

    pantheonList.filter(p => p.realmLabel === realmRadio.value).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.pantheonLabel;
        opt.textContent = elements[p.pantheonLabel] || p.pantheonLabel;
        pSelect.appendChild(opt);
    });

    if (character.deityId > 0) {
        const currentGod = deityList.find(d => d.ID === character.deityId);
        if (currentGod) pSelect.value = currentGod.pantheonLabel;
    }
    refreshDeityOptions(); 
}

function refreshDeityOptions() {
    const elements = translations[currentLang];
    const pantheonKey = document.getElementById('pantheonSelect').value;
    const dSelect = document.getElementById('deitySelect');
    if (!dSelect) return;

    const pleaseSelect = elements.pleaseSelectLabel || "-Bitte wählen-";
    dSelect.innerHTML = `<option value="">${pleaseSelect}</option>`;
    
    if (!pantheonKey) { displayDeityDetails(); return; }

    deityList.filter(d => d.pantheonLabel === pantheonKey).forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.ID;
        const translatedDomains = d.domainLabel.map(dom => elements[dom] || dom).join(', ');
        opt.textContent = `${elements[d.translationLabel] || d.translationLabel} (${translatedDomains})`;
        dSelect.appendChild(opt);
    });

    if (character.deityId && character.deityId > 0) dSelect.value = character.deityId;
    displayDeityDetails();
}

function displayDeityDetails() {
    const deityId = parseInt(document.getElementById('deitySelect').value);
    const box = document.getElementById('deityDetailBox');
    if(!deityId) { box.style.display = 'none'; return; }

    const god = deityList.find(d => d.ID === deityId);
    if(god) {
        box.style.display = 'block';
        document.getElementById('valDeityAlignment').innerText = translations[currentLang][god.alignmentAbbrLabel] || god.alignmentAbbrLabel;
        document.getElementById('valDeitySymbol').innerText = translations[currentLang][god.godSymbol] || god.godSymbol;
        updateProgress();
    }
}

//=======================================================================
// SCHRITT 10: PERSÖNLICHKEIT & GESINNUNG
//=======================================================================

const MAX_PERSONALITY_LENGTH = 320;

function saveAlignment() {
    const editor = document.getElementById('personalityEditor');
    
    // 1. HTML speichern (inkl. <span>-Tags für Farben), damit beim Zurückspringen alles bunt bleibt
    character.personalityTraitsHTML = editor.innerHTML;
    
    // 2. Nur den Text speichern (ohne HTML-Tags), für den Charakterbogen
    character.personalityTraits = editor.innerText;
    
    // character.alignment (Gesinnung) wurde bereits durch Klick auf die Kreise gesetzt.

    console.log("%c--- ALIGNEMNT ---", "color: #d4a017; font-weight: bold;");
    // console.log("HTML (für Tool):", character.personalityTraitsHTML);
    console.log("Text (für Bogen):", character.personalityTraits);
    console.log("Gesinnung (Alignment):", character.alignment);

    updateProgress();
    goToStep(11);
}

/**
 * Initialisiert die Ansicht für Gesinnung und Persönlichkeit (Schritt 10).
 */
function initializeAlignmentView() {
    const editor = document.getElementById('personalityEditor');
    const charCount = document.getElementById('personalityCharCount');
    const charMax = document.getElementById('personalityCharMax');
    const elements = translations[currentLang];

    // 1. UI-Setup & Placeholder
    editor.setAttribute('data-placeholder', elements.alignmentPlaceholderText || "Beschreibe deinen Charakter...");
    charMax.innerText = MAX_PERSONALITY_LENGTH;

    // 2. UI-Komponenten aufbauen
    renderTraitPool();
    renderAlignmentMatrix();

    // 3. Bestehende Daten laden
    editor.innerHTML = character.personalityTraitsHTML || "";
    
    // Initialer Zähler-Check (Filtert das unsichtbare Zeichen direkt beim Laden)
    const initialText = editor.innerText.replace(/\u200B/g, ''); 
    charCount.innerText = initialText.length;

    // 4. Lücken-Logik für die Tabelle
    if (character.personalityTraitsHTML) {
        personalityTraitList.forEach(trait => {
            const traitText = elements[trait.traitLabel] || trait.traitLabel;
            if (editor.innerHTML.includes(traitText)) {
                const traitEl = document.getElementById(`trait-obj-${trait.ID}`);
                if (traitEl) traitEl.style.visibility = 'hidden';
            }
        });
    }

    // 5. Input-Event: Zähler-Korrektur und Farbbereinigung
    editor.addEventListener('input', () => {
        
        // --- DER TRICK: Simulation eines Leerzeichens bei Leere ---
        if (editor.textContent.trim().length === 0) {
            editor.innerHTML = "&#8203;"; // Setzt das unsichtbare Zeichen

            // Cursor hinter das unsichtbare Zeichen setzen
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editor);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        } else {
            // Geister-Spans ohne Inhalt entfernen
            const emptySpans = editor.querySelectorAll('span');
            emptySpans.forEach(span => {
                if (span.innerText.trim() === "") {
                    span.remove();
                }
            });
        }

        // --- ZÄHLER-KORREKTUR ---
        // Wir nehmen den Text und entfernen alle Zero-Width Spaces (\u200B) für die Zählung
        const cleanText = editor.innerText.replace(/\u200B/g, '');
        const currentLength = cleanText.length;

        // --- ZEICHENBEGRENZUNG ---
        if (currentLength > MAX_PERSONALITY_LENGTH) {
            editor.innerText = cleanText.substring(0, MAX_PERSONALITY_LENGTH);
            // Cursor ans Ende
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editor);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        // Anzeige aktualisieren (jetzt mit der sauberen Länge)
        charCount.innerText = cleanText.length;
    });

    setupTraitDropZone();
}

/**
 * Erstellt die Trait-Tabelle dynamisch.
 */
function renderTraitPool() {
    const grid = document.getElementById('traitPoolGrid');
    const elements = translations[currentLang];
    grid.innerHTML = '';

    const cats = ["goodLabel", "lawfulLabel", "neutralLabel", "chaoticLabel", "evilLabel"];
    
    cats.forEach(cat => {
        const col = document.createElement('div');
        col.className = 'trait-column';
        col.innerHTML = `<div class="trait-header">${elements[cat] || cat}</div>`;
        
        personalityTraitList.filter(t => t.alignmentCatergory === cat).forEach(trait => {
            const item = document.createElement('div');
            const catName = cat.replace('Label', '');
            item.className = `draggable-trait-item trait-bg-${catName}`;
            item.id = `trait-obj-${trait.ID}`;
            item.draggable = true;
            item.innerText = elements[trait.traitLabel] || trait.traitLabel;
            
            // Drag Start Logik
            item.ondragstart = (e) => {
                e.dataTransfer.setData("text", item.innerText);
                const computedStyle = window.getComputedStyle(item);
                e.dataTransfer.setData("color", computedStyle.color);
                e.dataTransfer.setData("bgcolor", computedStyle.backgroundColor);
                e.dataTransfer.setData("id", item.id);
            };

            col.appendChild(item);
        });
        grid.appendChild(col);
    });
}

function setupTraitDropZone() {
    const zone = document.getElementById('personalityEditor');
    
    zone.ondragover = (e) => e.preventDefault();
    
    zone.ondrop = (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("id");

        if (!id || !id.startsWith('trait-obj-')) return;

        const text = e.dataTransfer.getData("text");
        let color = e.dataTransfer.getData("bgcolor"); // Standard: Hintergrundfarbe des Traits

        // --- OPTISCHE ANPASSUNG FÜR "EVIL" ---
        // Wenn das Element aus der bösen Kategorie stammt, nehmen wir sattes Schwarz
        const draggedEl = document.getElementById(id);
        if (draggedEl && draggedEl.classList.contains('trait-bg-evil')) {
            color = "#000000"; 
        }

        // 1. Das farbige Wort als Span-Element erstellen
        const span = document.createElement('span');
        span.style.color = color; 
        span.style.fontWeight = 'bold';
        span.innerText = text;
        zone.appendChild(span);

        // 2. Das Komma und das Leerzeichen (Standardfarbe durch Text-Node)
        const separator = document.createTextNode(", ");
        zone.appendChild(separator);

        // 3. Trait in der Tabelle verstecken
        document.getElementById(id).style.visibility = 'hidden';

        // 4. Zähler aktualisieren (unter Berücksichtigung des unsichtbaren Zeichens)
        const cleanText = zone.innerText.replace(/\u200B/g, '');
        document.getElementById('personalityCharCount').innerText = cleanText.length;

        // 5. Cursor ans absolute Ende setzen
        placeCaretAtEnd(zone);
    };
}

/**
 * Hilfsfunktion: Setzt den Cursor ans Ende des Editors
 * Das zwingt den Browser, die Standard-Textfarbe des Containers zu nutzen.
 */
function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

/**
 * Erstellt die 3x3 Alignment Matrix.
 */
function renderAlignmentMatrix() {
    const matrix = document.getElementById('alignmentCircleMatrix');
    const elements = translations[currentLang];
    const data = [
        { id: "lg", label: "lawfulGoodLabel" }, { id: "ng", label: "neutralGoodLabel" }, { id: "cg", label: "chaoticGoodLabel" },
        { id: "ln", label: "lawfulNeutralLabel" }, { id: "n",  label: "neutralLabel" }, { id: "cn", label: "chaoticNeutralLabel" },
        { id: "le", label: "lawfulEvilLabel" }, { id: "ne", label: "neutralEvilLabel" }, { id: "ce", label: "chaoticEvilLabel" }
    ];

    matrix.innerHTML = data.map(d => `
        <div class="alignment-circle-item" id="align-${d.id}" onclick="applyAlignmentSelection('${d.label}', this)">
            ${elements[d.label] || d.label}
        </div>
    `).join('');

    // Falls bereits eine Gesinnung gespeichert war, markieren
    if (character.alignment) {
        const saved = data.find(d => d.label === character.alignment);
        if (saved) {
            setTimeout(() => {
                const el = document.getElementById(`align-${saved.id}`);
                if (el) el.classList.add('active-selection');
            }, 10);
        }
    }
}

function applyAlignmentSelection(label, element) {
    document.querySelectorAll('.alignment-circle-item').forEach(c => c.classList.remove('active-selection'));
    element.classList.add('active-selection');
    character.alignment = label;
}

/**
 * Setzt nur die Auswahl-Tabelle zurück, ohne den Text im Editor zu löschen.
 */
function restoreTraitTable() {
    // Wir rufen direkt die Render-Funktion auf.
    // Da renderTraitPool() die Elemente neu erstellt, sind alle Buttons wieder auf 'visible'.
    renderTraitPool(); 
}

//=======================================================================
// SCHRITT 11: AUSSEHEN
//=======================================================================

const MAX_APPEARANCE_TEXT = 850; // Globale Variable

/**
 * Speichern-Funktion
 */
function saveAppearance() {
    character.gender = document.getElementById('selectGender').value;
    character.ageLabel = document.getElementById('inputAge').value;
    character.eyeColor = document.getElementById('inputEyeColor').value;
    character.hairColorLabel = document.getElementById('inputHairColor').value;
    character.skinToneLabel = document.getElementById('inputSkinTone').value;
    character.sizeLabel = document.getElementById('inputSize').value;
    character.appearance = document.getElementById('appearanceInput').value;

    // --- Logger hinzufügen ---
    console.log("%c--- APPEARANCE ---", "color: #3498db; font-weight: bold;");
    console.log("Geschlecht:", character.gender);
    console.log("Alter:", character.ageLabel);
    console.log("Augenfarbe:", character.eyeColor);
    console.log("Haarfarbe:", character.hairColorLabel);
    console.log("Hautton:", character.skinToneLabel);
    console.log("Größe:", character.sizeLabel);
    console.log("Beschreibung:", character.appearance);

    updateProgress();
    goToStep(12);
}

/**
 * Hilfsfunktion zur Umrechnung ft -> Anzeige (cm/ft)
 */
function getFormattedSize(ft) {
    if (currentLang === 'de') {
        // Umrechnung: ft * 30.48 = cm
        return Math.round(ft * 30.48) + " cm";
    }
    return ft.toFixed(1) + " ft.";
}

/**
 * Initialisiert Schritt 11: Aussehen
 */
function initializeAppearanceView() {
    const elements = translations[currentLang];
    
    // Hilfsfunktion: Wandelt "Dragonborn" -> "dragonbornLabel" um oder lässt "woodElfLabel"
    const getTranslationKey = (val) => {
        if (!val || val === "-" || val === 0) return null;
        if (typeof val === 'string' && val.toLowerCase().endsWith("label")) return val;
        return val.toLowerCase() + "Label";
    };

    // 1. Zähler & Placeholder
    document.getElementById('appearanceMax').innerText = MAX_APPEARANCE_TEXT;
    const descArea = document.getElementById('appearanceInput');
    descArea.placeholder = elements.appearancePlaceholderText || "";
    
    const smallInputs = ['inputEyeColor', 'inputHairColor', 'inputSkinTone', 'inputSize', 'inputAge'];
    smallInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.placeholder = elements.freeTextLabel || "";
    });

    const unitInd = document.getElementById('unitIndicator');
    if (unitInd) unitInd.innerText = (currentLang === 'de' ? 'cm' : 'ft.');

    // 2. Statische Werte (Volk & Erblinie) übersetzen
    const speciesKey = getTranslationKey(character.species);
    document.getElementById('valAppSpecies').innerText = elements[speciesKey] || character.species || "-";
    document.getElementById('valAppLineage').innerText = elements[getTranslationKey(character.lineage)] || character.lineage || "-";

    // 3. Ahnenreihe Wert-Logik
    const ancestryEntry = ancestryList.find(a => a.ancestryLabel === character.ancestry);
    let physicValue = "-";
    if (ancestryEntry && ancestryEntry.physicAncestryLabel) {
        physicValue = elements[ancestryEntry.physicAncestryLabel] || ancestryEntry.physicAncestryLabel;
    }
    document.getElementById('valAppAncestry').innerText = physicValue;

    // 4. Geschlecht Dropdown befüllen (mit pleaseSelectLabel)
    const genderSelect = document.getElementById('selectGender');
    genderSelect.innerHTML = ""; // Dropdown leeren

    // Platzhalter-Option "Bitte wählen"
    const defaultOpt = document.createElement('option');
    defaultOpt.value = "";
    defaultOpt.innerText = elements.pleaseSelectLabel || "---";
    defaultOpt.disabled = true;
    defaultOpt.selected = !character.gender; // Selektiert, wenn noch kein Wert gespeichert ist
    genderSelect.appendChild(defaultOpt);

    // Optionen aus genderList hinzufügen
    genderList.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.genderLabel;
        opt.innerText = elements[g.genderLabel] || g.genderLabel;
        genderSelect.appendChild(opt);
    });

    // Falls bereits ein Geschlecht im character-Objekt ist, dieses setzen
    if (character.gender) {
        genderSelect.value = character.gender;
    }

    // 5. Durchschnittswerte (⌀) aus speciesList
    const spec = speciesList.find(s => s.translationLabel === speciesKey);
    
    // Alter Info
    const ageInfo = document.getElementById('ageOrientationInfo');
    if (spec && spec.speciesAge_years) {
        ageInfo.innerText = `(⌀ ${spec.speciesAge_years} ${currentLang === 'de' ? 'Jahre' : 'years'})`;
    } else {
        ageInfo.innerText = "";
    }

    // Größe Info
    const rangeSmall = document.getElementById('sizeOrientationRange');
    if (spec && spec.sizeRange_ft) {
        const format = (ft) => getFormattedSize(ft);
        rangeSmall.innerText = `(⌀ ${format(spec.sizeRange_ft[0])} - ${format(spec.sizeRange_ft[1])})`;
    } else {
        rangeSmall.innerText = "";
    }

    // 6. Sonderlogik Drachengeborene (Hautton = Farbe der Ahnenreihe)
    const skinField = document.getElementById('inputSkinTone');
    if (skinField) {
        if (speciesKey === "dragonbornLabel") {
            // Wir nehmen die reine Farbe (z.B. "Schwarz") aus character.ancestry
            skinField.value = elements[character.ancestry] || character.ancestry || "";
            skinField.disabled = true;
        } else {
            skinField.value = character.skinToneLabel || "";
            skinField.disabled = false;
        }
    }

    // 7. Persistence laden
    document.getElementById('inputAge').value = character.ageLabel || "";
    document.getElementById('inputEyeColor').value = character.eyeColor || "";
    document.getElementById('inputHairColor').value = character.hairColorLabel || "";
    const sizeInput = document.getElementById('inputSize');
    if (sizeInput) {
        sizeInput.value = character.sizeLabel || "";
        if (sizeInput.value) updateAutoCategory(sizeInput.value);
    }
    
    descArea.value = character.appearance || "";
    document.getElementById('appearanceCounter').innerText = descArea.value.length;

    // 8. Event Listener
    if (sizeInput) sizeInput.oninput = (e) => updateAutoCategory(e.target.value);
    
    descArea.oninput = () => {
        if (descArea.value.length > MAX_APPEARANCE_TEXT) {
            descArea.value = descArea.value.substring(0, MAX_APPEARANCE_TEXT);
        }
        document.getElementById('appearanceCounter').innerText = descArea.value.length;
    };
}

/**
 * Berechnet die Größenkategorie basierend auf dem User-Input
 */
function updateAutoCategory(val) {
    const display = document.getElementById('valSizeCategory');
    const elements = translations[currentLang];
    
    let num = parseFloat(val.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
        display.innerText = "-";
        return;
    }

    // Umrechnung für den Vergleich mit sizeList (immer ft)
    let ftVal = (currentLang === 'de') ? (num / 30.48) : num;

    const match = sizeList.find(s => ftVal >= s.sizeRange_ft[0] && ftVal <= s.sizeRange_ft[1]);

    if (match) {
        display.innerText = elements[match.sizeCategory] || match.sizeCategory;
        character.sizeCategory = match.sizeCategory; 
    } else {
        display.innerText = "-";
    }
}

//=======================================================================
// SCHRITT 12: ABSCHLUSS
//=======================================================================

const MAX_NAME_LENGTH = 35; // Globale Begrenzung für den Namen

function initializeSummaryView() {
    const elements = translations[currentLang];
    const nameInput = document.getElementById('characterNameInput');
    const summaryGrid = document.getElementById('summaryGrid');
    
    // Hilfsfunktion für Arrays (um "is not iterable" Fehler zu vermeiden)
    const ensureArray = (val) => {
        if (!val) return [];
        return Array.isArray(val) ? val : [val];
    };

    // 1. Name Input Setup
    nameInput.placeholder = elements.namePlaceholderText || "Name deines Charakters";
    nameInput.maxLength = 30; 
    nameInput.value = character.name || ""; 

    // 2. Zusammenfassung generieren
    summaryGrid.innerHTML = ""; 

    // Hilfsfunktion für die Zeilen (Vertikale Ausrichtung auf 'flex-start' für Top-Alignment)
    const addSummaryRow = (labelKey, value) => {
        const row = document.createElement('div');
        row.className = 'appearance-row';
        row.style.alignItems = 'flex-start'; // Zwingt Inhalt nach oben bündig zum Label
        row.innerHTML = `
            <span class="appearance-label">${elements[labelKey] || labelKey}</span>
            <span class="appearance-value">${value || "-"}</span>
        `;
        summaryGrid.appendChild(row);
    };

    // --- WERTE AUFBEREITEN ---

    const classVal = character.class ? (elements[character.class.toLowerCase()] || character.class) : "-";
    const bgVal = character.background ? (elements[character.background.toLowerCase()] || character.background) : "-";
    const specKey = character.species ? (character.species.toLowerCase() + "Label") : "";
    const specVal = character.species ? (elements[specKey] || character.species) : "-";

    let alignAbbr = "-";
    if (character.alignment) {
        const alignmentEntry = alignmentList.find(a => a.translationLabel === character.alignment);
        if (alignmentEntry) {
            const abbrKey = alignmentEntry.alignmentAbbrLabel;
            alignAbbr = elements[abbrKey] || abbrKey;
        } else {
            alignAbbr = elements[character.alignment] || character.alignment;
        }
    }

    const genderVal = character.gender ? (elements[character.gender] || character.gender) : "-";
    
    // Alter mit yearsLabel (Einheit hinten dran)
    const ageVal = character.ageLabel ? `${character.ageLabel} ${elements.yearsLabel || ""}` : "-";

    // --- FERTIGKEITEN (Skills) ---
    // Mapping via skillCategoryNumber laut deiner Liste
    const skillIds = ensureArray(character.classForm?.skills);
    const skillsVal = skillIds
        .map(id => {
            const s = skillList.find(item => item.skillCategoryNumber == id);
            return s ? (elements[s.translationLabel] || s.translationLabel) : null;
        })
        .filter(Boolean)
        .join(", ");

    // --- WERKZEUGE, INSTRUMENTE & SPIELE ---
    let masteredToolsNames = [];

    // 1. Werkzeuge (ID)
    [...ensureArray(character.tool_background), ...ensureArray(character.classForm?.tools)]
        .forEach(id => {
            const tool = toolList.find(t => t.ID == id);
            if (tool) masteredToolsNames.push(elements[tool.translationLabel] || tool.translationLabel);
        });

    // 2. Instrumente (instrumentCategoryNumber)
    [...ensureArray(character.instrument_background), ...ensureArray(character.classForm?.instruments)]
        .forEach(id => {
            const inst = instrumentList.find(i => i.instrumentCategoryNumber == id);
            if (inst) masteredToolsNames.push(elements[inst.translationLabel] || inst.translationLabel);
        });

    // 3. Spiele (gameCategoryNumber)
    [...ensureArray(character.game_background), ...ensureArray(character.classForm?.games)]
        .forEach(id => {
            const game = gameList.find(g => g.gameCategoryNumber == id);
            if (game) masteredToolsNames.push(elements[game.translationLabel] || game.translationLabel);
        });

    // Duplikate entfernen und mit Komma trennen
    const toolsVal = [...new Set(masteredToolsNames)].join(", ");

    // --- RENDERN ---
    addSummaryRow("classLabel", classVal);
    addSummaryRow("backgroundLabel", bgVal);
    addSummaryRow("speciesLabel", specVal);
    addSummaryRow("levelLabel2", character.level);
    addSummaryRow("alignmentLabel", alignAbbr);
    addSummaryRow("genderLabel", genderVal);
    addSummaryRow("ageLabel", ageVal);
    addSummaryRow("skillsLabel", skillsVal);
    addSummaryRow("toolsLabel", toolsVal);
}

// Speichert den gesamten Charakter und leitet zur Charakterbogen-Seite weiter
function finishCharacter() {

    localStorage.setItem("currentLanguage", currentLang);

    // Klasse
    localStorage.setItem("class", character.class);

    // Hintergrund
    localStorage.setItem("background", character.background);
    localStorage.setItem("feat_background", character.feat_background);
    localStorage.setItem("tool_background", character.tool_background);
    localStorage.setItem("instrument_background", character.instrument_background);
    localStorage.setItem("game_background", character.game_background);

    // Volk
    localStorage.setItem("species", character.species);
    localStorage.setItem("lineage", character.lineage);
    localStorage.setItem("ancestry", character.ancestry);
    localStorage.setItem("feat_species", character.feat_species);
    localStorage.setItem("spellcastingAbility_species", character.spellcastingAbility_species);

    // Attribute
    localStorage.setItem("strengthScore", character.strengthTotalScore);
    localStorage.setItem("dexterityScore", character.dexterityTotalScore);
    localStorage.setItem("constitutionScore", character.constitutionTotalScore);
    localStorage.setItem("intelligenceScore", character.intelligenceTotalScore);
    localStorage.setItem("wisdomScore", character.wisdomTotalScore);
    localStorage.setItem("charismaScore", character.charismaTotalScore);

    // Stufe
    localStorage.setItem("level", character.level);

    // Spezilaisierung
    localStorage.setItem("classForm", JSON.stringify(character.classForm));
    localStorage.setItem("spellcastingAbility_talent", JSON.stringify(character.spellcastingAbility_talent));

    // Zauber
    localStorage.setItem("spellbookSpells", JSON.stringify(character.spellbookSpells));
    localStorage.setItem("cantrips", JSON.stringify(character.cantrips));
    localStorage.setItem("preparedSpells", JSON.stringify(character.spells));
    localStorage.setItem("favoredSpells", JSON.stringify(character.favoredSpells));

    // Ausrüstung
    localStorage.setItem("equipment", JSON.stringify(character.equipment));
    localStorage.setItem("purse", JSON.stringify(character.purse));

    // Charaktergeschichte
    localStorage.setItem("story", character.story);
    localStorage.setItem("languages", JSON.stringify(character.languages));
    localStorage.setItem("deityId", character.deityId);
    localStorage.setItem("deityName", character.deityName);
    localStorage.setItem("communityName", character.communityName);
    localStorage.setItem("communityDesc", character.communityDesc);

    // Gesinnung
    localStorage.setItem("alignment", character.alignment);
    localStorage.setItem("personalityTraits", character.personalityTraits);

    // Aussehen
    localStorage.setItem("gender", character.gender);
    localStorage.setItem("age", character.ageLabel);
    localStorage.setItem("eyeColor", character.eyeColor);
    localStorage.setItem("hairColor", character.hairColorLabel);
    localStorage.setItem("skinTone", character.skinToneLabel);
    localStorage.setItem("size", character.sizeLabel);
    localStorage.setItem("appearanceDescription", character.appearance);

    // Name
    character.name = document.getElementById('characterNameInput').value;
    localStorage.setItem("characterName", character.name);

    // Bilder im Bogen löschen
    localStorage.removeItem('portraitImage');
    localStorage.removeItem('symbolImage');

    // Weiterleitung
    window.location.href = "charakterbogen.html";
}

//=======================================================================
// Allgemein Infoboxen
//=======================================================================

// Funktion zum Umschalten der Anzeige der Infobox
function toggleInfoBox(id, forceOpen = false) {
    const infoBox = document.getElementById(id);
    const backdrop = document.getElementById('infoBackdrop');
    if (!infoBox) return;

    const isCurrentlyVisible = window.getComputedStyle(infoBox).display !== "none";
    const shouldOpen = forceOpen || !isCurrentlyVisible;

    // BREAKPOINT SYNC: Definition von Breakpoint 1 (Großer Monitor)
    const isBreakpoint1 = window.innerWidth > 1440 && window.innerHeight > 850;

    if (shouldOpen) {
        // --- 1. UPDATES ---
        if (id === 'infoBoxStep5') updateInfoBoxContent(character.class);
        else if (id === 'infoBoxStep3') updateSpeciesInfoBoxContent(character.species);
        else if (id === 'spell-info-box-container') { isSpellInfoBoxActive = true; updateSpellInfoBox(); }
        else if (id === 'feat-info-box-container') { isFeatInfoBoxActive = true; updateFeatInfoBox(); }

        // --- 2. ANZEIGE DER BOX ---
        infoBox.style.display = (id === 'spell-info-box-container' || id === 'feat-info-box-container') ? "flex" : "block";

        // --- 3. SCHLEIER & BUTTON-LOGIK ---
        const isEquipmentBox = (id === 'equipmentOptionsInfoBox');
        
        // Wir brauchen einen Schleier, wenn es KEINE Equipment-Box ist 
        // UND wir uns NICHT im Breakpoint 1 befinden.
        const isMobile = window.innerWidth <= 1000;
        const needsVeil = !isEquipmentBox && !isBreakpoint1 && !(isEquipmentBox && isMobile);

        if (backdrop) {
            if (needsVeil) {
                backdrop.style.display = "block";
                document.body.style.overflow = "hidden"; // Scrollstopp
                document.body.classList.add('modal-open'); // Buttons verstecken
            } else {
                backdrop.style.display = "none";
                document.body.style.overflow = ""; // Scrollen erlaubt
                document.body.classList.remove('modal-open'); // Buttons zeigen
            }
        }
    } else {
        // --- 4. SCHLIESSEN-LOGIK ---
        infoBox.style.display = "none";
        if (backdrop) backdrop.style.display = "none";
        document.body.style.overflow = "";
        document.body.classList.remove('modal-open'); 

        if (id === 'spell-info-box-container') isSpellInfoBoxActive = false;
        if (id === 'feat-info-box-container') isFeatInfoBoxActive = false;
    }
}

function updateInfoBoxContent(className) {
    const elements = translations[currentLang];
    const infoBoxContent = document.getElementById("infoBoxContentStep5");

    if (!infoBoxContent) {
        console.error("InfoBox element not found");
        return;
    }

    infoBoxContent.innerHTML = "";

    // Verwende die Hilfsfunktion, um die Klassendaten zu erhalten
    const classData = getClassData(className.toLowerCase());
    if (!classData) {
        console.error("Class not supported");
        return;
    }

    if (classData.length > 0) {
        classData.forEach(feature => {
            if (feature.level <= character.level && feature.infoBox) {
                const featureName = elements[feature.translationLabel] || "";
                const featureDescription = elements[feature.classFeatureShortDescription] || elements[feature.classFeatureDescription] || "";

                if (featureName && featureDescription) {
                    infoBoxContent.innerHTML += `
                        <p><strong>${featureName}:</strong> <span>${featureDescription}</span></p>
                    `;
                }
            }
        });
    }
}

// Funktion zum Schließen der Infobox
function closeInfoBox() {
    // Schließt alle temporären Infoboxen
    const temporaryInfoSelectors = ".info-box, #spell-info-box-container, #feat-info-box-container";
    document.querySelectorAll(temporaryInfoSelectors).forEach(box => {
        box.style.display = "none";
    });

    // 1. Backdrop verstecken
    const backdrop = document.getElementById('infoBackdrop');
    if (backdrop) backdrop.style.display = "none";

    // 2. Scroll-Sperre aufheben
    document.body.style.overflow = "";

    // 3. WICHTIG: Die modal-open Klasse entfernen, damit Nav-Buttons wieder erscheinen
    document.body.classList.remove('modal-open');

    // 4. Status-Flags zurücksetzen
    if (typeof isSpellInfoBoxActive !== 'undefined') isSpellInfoBoxActive = false;
    if (typeof isFeatInfoBoxActive !== 'undefined') isFeatInfoBoxActive = false;
    
    console.log("Infobox geschlossen: Buttons sind wieder da, Scrollen aktiviert.");
}


const infoBoxConfig = {
    getSettings: () => {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Mobile / Schmal (< 1000px)
        if (w <= 1000) {
            return { maxElements: 15, maxCols: 1 };
        }
        // Laptop / Mittlerer Monitor (< 1440px oder niedrige Höhe)
        if (w <= 1440 || h <= 850) {
            return { maxElements: 10, maxCols: 3 };
        }
        // Großer Desktop (> 1440px)
        return { maxElements: 15, maxCols: 2 };
    }
};


// Talent Infobox
let isFeatInfoBoxActive = false; // Global definieren

function buildFeatInfoUI() {
    const closeButton = document.getElementById('close-feat-info');
    if (closeButton) {
        closeButton.onclick = () => toggleInfoBox('feat-info-box-container');
    }
    
    const headerSpan = document.querySelector('#feat-info-box-header span:first-child');
    if (headerSpan) {
        headerSpan.textContent = translations[currentLang].featInfoBoxTitle || "Talent Details";
    }
}

function updateFeatInfoBox() {
    const selectedFeatIds = new Set();
    document.querySelectorAll('select[name^="feats"], select[id^="feat"]').forEach(select => {
        const val = parseInt(select.value, 10);
        if (val && !isNaN(val) && featList.some(f => f.ID === val)) selectedFeatIds.add(val);
    });

    const mappedFeats = Array.from(selectedFeatIds).map(featId => {
        const feat = featList.find(f => f.ID === featId);
        const descKey = feat.translationLabel.replace("Label", "DLabel");
        return {
            name: translations[currentLang][feat.translationLabel] || feat.translationLabel,
            description: translations[currentLang][descKey] || 'Keine Beschreibung.'
        };
    });

    renderSpecialInfoBoxContent('feat-info-box-container', mappedFeats);
}

function renderSpecialInfoBoxContent(containerId, items) {
    const container = document.getElementById(containerId);
    const contentDiv = container.querySelector('.spell-info-box-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = '';
    contentDiv.classList.remove('focused-mode');

    if (items.length === 0) {
        contentDiv.innerHTML = `<p style="padding:10px;">${translations[currentLang].noFeatSelected || 'Wähle ein Element aus.'}</p>`;
        return;
    }

    items.forEach(item => {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'info-spell-item';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'info-spell-name';
        nameDiv.textContent = item.name;

        const descDiv = document.createElement('div');
        descDiv.className = 'info-spell-description';
        descDiv.innerHTML = item.description;

        nameDiv.onclick = (e) => {
            e.stopPropagation();
            const isOpening = !descDiv.classList.contains('active');
            
            // Alles zurücksetzen
            contentDiv.querySelectorAll('.info-spell-description').forEach(d => d.classList.remove('active'));
            contentDiv.querySelectorAll('.info-spell-name').forEach(n => n.classList.remove('active'));
            contentDiv.querySelectorAll('.info-spell-item').forEach(i => i.classList.remove('has-active-child'));

            if (isOpening) {
                descDiv.classList.add('active');
                nameDiv.classList.add('active');
                itemWrapper.classList.add('has-active-child');
                contentDiv.classList.add('focused-mode');
            } else {
                contentDiv.classList.remove('focused-mode');
            }
        };

        itemWrapper.appendChild(nameDiv);
        itemWrapper.appendChild(descDiv);
        contentDiv.appendChild(itemWrapper);
    });

    // Grid-Spalten berechnen (füllt erst Spalte 1, dann 2...)
    refreshInfoBoxGrid(containerId);
}

/**
 * Berechnet die Spaltenanzahl basierend auf deinen Regeln.
 */
function refreshInfoBoxGrid(containerId) {
    const container = document.getElementById(containerId);
    const content = container.querySelector('.spell-info-box-content');
    const items = content.querySelectorAll('.info-spell-item');
    const settings = infoBoxConfig.getSettings();
    
    // Logik: Wie viele Spalten brauchen wir, wenn maxElements pro Spalte erlaubt sind?
    let neededCols = Math.ceil(items.length / settings.maxElements);
    
    // Begrenzung auf die maximal erlaubten Spalten pro Breakpoint
    if (neededCols > settings.maxCols) neededCols = settings.maxCols;
    if (neededCols < 1) neededCols = 1;
    
    content.style.setProperty('--info-cols', neededCols);
}

//=======================================================================
// Fortschrittsanzeige
//=======================================================================

function updateProgress() {
    const elements = translations[currentLang];
    const divider = ": ";

    // 1. Klasse
    const v1 = document.getElementById("valStep1");
    if (v1) v1.innerText = character.class ? divider + (elements[character.class.toLowerCase()] || character.class) : "";

    // 2. Hintergrund
    const v2 = document.getElementById("valStep2");
    if (v2) v2.innerText = character.background ? divider + (elements[character.background.toLowerCase()] || character.background) : "";

    // 3. Volk
    const v3 = document.getElementById("valStep3");
    if (v3) {
        let txt = character.species ? (elements[character.species.toLowerCase() + 'Label'] || character.species) : "";
        if (character.lineage) txt += ` (${elements[character.lineage] || character.lineage})`;
        v3.innerText = txt ? divider + txt : "";
    }

    // 5. Stufe
    const v5 = document.getElementById("valStep5");
    if (v5) v5.innerText = character.level ? divider + character.level : "";

    // 10. Gesinnung
    const v10 = document.getElementById("valStep10");
    if (v10 && character.alignment) {
        const entry = alignmentList.find(a => a.translationLabel === character.alignment);
        const abbr = entry ? (elements[entry.alignmentAbbrLabel] || entry.alignmentAbbrLabel) : "";
        v10.innerText = abbr ? divider + abbr : "";
    }

    // 11. Aussehen
    const v11 = document.getElementById("valStep11");
    if (v11) {
        const g = character.gender ? (elements[character.gender] || character.gender) : "";
        const a = character.ageLabel ? `, ${character.ageLabel}` : "";
        v11.innerText = (g || a) ? divider + `${g}${a}` : "";
    }
}

//=======================================================================
// Schrittwechsel
//=======================================================================

function goBack() {
    const currentStep = document.querySelector(".step[style*='display: block']").id;
    if (currentStep === "step2") {
        goToStep(1);
    } else if (currentStep === "step3") {
        goToStep(2);
    } else if (currentStep === "step4") {
        goToStep(3);
    } else if (currentStep === "step5") {
        goToStep(4);
    } else if (currentStep === "step6") {
        goToStep(5);
    } else if (currentStep === "step7") {
        goToStep(6);
    } else if (currentStep === "step8") {
        goToStep(7);
    } else if (currentStep === "step9") {
        goToStep(8);
    } else if (currentStep === "step10") {
        goToStep(9);
    } else if (currentStep === "step11") {
        goToStep(10);
    } else if (currentStep === "step12") {
        goToStep(11);
    }

}

function goToStep(step) {

    document.body.className = `active-step-${step}`;

    currentStep = step; // für mobile version

    // Sprachumschalter-Element definieren
    const languageSwitcher = document.getElementById("languageSwitcher");

    const currentVisibleStep = Array.from(document.querySelectorAll(".step"))
        .find(stepElement => stepElement.style.display === "block");
    
    // Überprüfen, ob ein sichtbarer Schritt gefunden wird
    const currentStepNumber = currentVisibleStep ? parseInt(currentVisibleStep.id.replace('step', ''), 10) : 1;

    // Logik für die Transparenz des Hintergrundbildes
    if (step === 2) {
        fadePageBackground(false); // In Schritt 2: Bild voll sichtbar machen
    } else {
        fadePageBackground(true);  // In allen anderen Schritten: Bild transparent machen
    }

    // Alle Infoboxen schließen beim Schrittwechsel
    closeInfoBox();

    for (let i = 1; i <= 12; i++) { // i = Schrittanzahl
        document.getElementById(`step${i}`).style.display = (i === step) ? "block" : "none";
        document.getElementById(`step${i}Btn`).classList.remove("active");
        document.getElementById(`step${i}Btn`).disabled = (i > step);
    }
    document.getElementById(`step${step}Btn`).classList.add("active");

    document.getElementById("saveClass").style.display = "none";
    document.getElementById("saveBackground").style.display = "none";
    document.getElementById("saveSpecies").style.display = "none";
    document.getElementById('saveAttributes').style.display = 'none';
    document.getElementById("saveLevel").style.display = "none";
    document.getElementById("saveClassForm").style.display = "none";
    document.getElementById("saveSpells").style.display = "none";
    document.getElementById("saveEquipment").style.display = "none";
    document.getElementById("saveStory").style.display = "none";
    document.getElementById("saveAlignment").style.display = "none";
    document.getElementById("saveAppearance").style.display = "none";
    document.getElementById("finish").style.display = "none";
    document.getElementById("back").style.display = "block";


        if (step === 1) { //Class
        languageSwitcher.style.display = "flex"; // Sprachumschalter sichtbar machen
        document.getElementById("back").style.display = "none"; // Kein "Zurück"-Button in Schritt 1

        document.getElementById("saveClass").style.display = "block";
        speciesImageBox.style.display = "none"; // Bild ausblenden
  
    } else if (step === 2) { //Background
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById("saveBackground").style.display = "block";

	currentSkillIndex = 70; //für skilled
	currentToolIndex = 70; //für skilled
	currentInstrumentIndex = 40; // Starten bei instrument40 (nur bei Tool-Asuwahl)
	currentGameIndex = 10; // Starten bei Game10 (nur bei Tool-Asuwahl)
	currentSpellListIndex = 10; //für Magic Initiate
	currentSpellAbilityIndex = 10; //für Magic Initiate

    } else if (step === 3) { //Species
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
	document.getElementById("saveSpecies").style.display = "block";

	updateLineageUI();

	currentSkillIndex = 61; //für skilled
	currentToolIndex = 60; //für skilled
	currentInstrumentIndex = 30; // Starten bei instrument30 (nur bei Tool-Asuwahl)
	currentGameIndex = 5; // Starten bei Game5 (nur bei Tool-Asuwahl)
	currentSpellListIndex = 5; //für Magic Initiate
	currentSpellAbilityIndex = 5; //für Magic Initiate

        updateSkills();
        setupFeatSelection();

    } else if (step === 4) { //Attribute
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById('saveAttributes').style.display = 'block';
        initializeAttributeSetup();
        updateAttributeBonusesInStep4();

    } else if (step === 5) { //Level
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById("saveLevel").style.display = "block";
        if (selectedClassName) {
            updateInfoBoxContent(selectedClassName);
        }
        displayClassFeatures(character.level);

        const liveContainer = document.getElementById('liveAttributesContainer');
        initializeLiveAttributes();
        liveContainer.style.display = 'block';
	updateLiveAttributes();


    } else if (step === 6) { //Class Form
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById("saveClassForm").style.display = "block";
        displayClassSectionsBasedOnLevel(character.level);

	currentSkillIndex = 10; //für skilled
	currentToolIndex = 20; //für skilled
	currentEnergyIndex = 1; //für Elemental Adapt
	currentSpellListIndex = 1; //für Magic Initiate
	currentSpellAbilityIndex = 1; //für Magic Initiate
	currentInstrumentIndex = 20; // Starten bei instrument20 (nur bei Tool-Asuwahl)
	currentGameIndex = 1; // Starten bei Game1 (nur bei Tool-Asuwahl) 

        updateSkills();
        setupFeatSelection();

        applyPassiveClassFeatures();
        updateLiveAttributes();

        buildFeatInfoUI();

    } else if (step === 7) { //Spells
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById("saveSpells").style.display = "block";
        populateSpells(); // Zauber für Schritt 4 laden

    } else if (step === 8) { //Equipment
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById("saveEquipment").style.display = "block";
	initializeEquipmentStep();

    } else if (step === 9) {  //Story
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById("saveStory").style.display = "block";
        initCharacterStory();

    } else if (step === 10) {  //Alignment
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById("saveAlignment").style.display = "block";
        initializeAlignmentView();

    } else if (step === 11) {  //Appearance
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById("saveAppearance").style.display = "block";
	initializeAppearanceView();

    } else if (step === 12) {  //Finish
        languageSwitcher.style.display = "none"; // Sprachumschalter ausblenden
        document.getElementById("finish").style.display = "block";
        initializeSummaryView();
    }

}

//=======================================================================
// Zürcksetzen bei Auswahländerung & Schrittwechseln
//=======================================================================

// Wählt eine Klasse aus und setzt das Level zurück
function selectClass(className) {
    selectedClassName = className;
    resetDynamicSubclassContent(); // Subklasseninhalte zurücksetzen, wenn die Klasse geändert wird
    character.class = className; // Stellen Sie sicher, dass die Klasse hier gesetzt wird
    showClassImage(className);
    showClassSymbol(className);
    showClassDetails(className);
    showClassText(className);
    document.getElementById("level").value = "1";
    character.level = 1;
    document.getElementById("step2Btn").disabled = true;
    document.getElementById("step3Btn").disabled = true;
    document.getElementById("step4Btn").disabled = true;
    document.getElementById("step5Btn").disabled = true;
    document.getElementById("step6Btn").disabled = true;

    populateClassFormOptions(className);
    updateInfoBoxContent(className);

    // Zeige den Text "Drücke das Symbol für"
    document.getElementById("toggleText").style.display = "block";
    // Stelle sicher, dass der Details-Container geschlossen bleibt
    document.getElementById("classDetailsContainer").style.display = "none";

    spellChoicesByFeature = {};
    activeSpellChoice = { feature: null };
}

// Charakterdaten zurücksetzen
function resetCharacter() {

character = {
    class: null,
    background: null,
    feat_background: null,
    tool_background: null,
    instrument_background: null,
    game_background: null,
    backgroundAttributeBonuses: {},
    species: null,
    lineage: null,
    ancestry: null,
    spellcastingAbility_species: null,
    feat_species: null,
    strengthTotalScore: null,
    dexterityTotalScore: null,
    constitutionTotalScore: null,
    intelligenceTotalScore: null,
    wisdomTotalScore: null,
    charismaTotalScore: null,
    level: 1,
    classForm: null,
    featSelections: {},
    spellcastingAbility_talent: [],
    spellbookSpells: [],
    cantrips: [],
    spells: [],
    favoredSpells: [],
    purse: { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 },  
    equipment: {                                       
        weapons: [],
        armor: [],
        tools: [],
        gear: [],
        vehicles: []
    },
    story: "",     		     
    languages: [1],		     
    deityId: null,		     
    deityName: "",		     
    communityName: "",		     
    communityDesc: "",		     
    alignment: null,
    personalityTraits: "",
    personalityTraitsHTML: "",
    gender: "",                    
    ageLabel: "",                    
    eyeColor: "",                 
    hairColorLabel: "",              
    skinToneLabel: "",           
    sizeLabel: "",              
    appearance: "",
    name: ""
};

    strengthScore = null;
    dexterityScore = null;
    constitutionScore = null;
    intelligenceScore = null;
    wisdomScore = null;
    charismaScore = null;

    selectedSkills = [];
    selectedClassName = null;
    currentExpertises = [];
    lastSavedLevel = null;
    tempFeatBackground = null;
    tempToolBackground = null;
    tempInstrumentBackground = null;
    tempGameBackground = null;
    tempBackgroundSpellcasting = null;
    tempFeatSpecies = null;
    tempAncestry = null;
    tempLineage = null;
    tempSpellAbilitySpecies = null;
    tempSpeciesTalentSpellcasting = null;

    // Schritt 8: Equipment
    selectedEquipmentSource = { class: null, background: null };
    initialPurseValues = { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 };
    tempEquipment = { weapons: [], armor: [], tools: [], gear: [], vehicles: [] };

    // Alle Eingabefelder zurücksetzen
    document.querySelectorAll('input, select').forEach(element => {
        if (element.type === 'radio' || element.type === 'checkbox') {
            element.checked = false;
        } else if (element.type === 'number' || element.type === 'text' || element.tagName.toLowerCase() === 'select') {
            element.value = '';
        }
    });

    const attributeContainer = document.getElementById('attributeScoresContainer');
    if (attributeContainer) {
        attributeContainer.innerHTML = '';
    }

    // Setze das Seitenhintergrundbild zurück
    setPageBackground(null);

    // Fortschrittsanzeige zurücksetzen
    updateProgress();
    closeInfoBox();
}

function resetDynamicSubclassContent() {
    const dynamicSubclassContentDiv = document.getElementById("dynamicSubclassContent");
    if (dynamicSubclassContentDiv) {
        dynamicSubclassContentDiv.innerHTML = ''; // Vorherigen Inhalt leeren
        dynamicSubclassContentDiv.style.display = 'none'; // Verstecke das Element
    }
}

//=======================================================================
// Übersetzung
//=======================================================================

function updateDropdownsForLanguage() {
    if (selectedClassName) {
        populateClassFormOptions(selectedClassName);
    }
}

//=======================================================================
// Automatisches Scrollen
//=======================================================================

(function() {
    // --- Konfiguration ---
    const scrollZoneHeight = 80; // Wie nah am Rand der Scroll ausgelöst wird (in Pixel)
    const scrollSpeed = 15;      // Wie schnell gescrollt wird (in Pixel pro Frame)
    // -------------------

    let scrollInterval = null; // Hält die Referenz auf unser Scroll-Intervall

    // Funktion, die das Scrollen stoppt
    function stopScrolling() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    }

    // Haupt-Event-Handler, der bei Mausbewegung während des Drag-Vorgangs feuert
    function handleDragScroll(event) {
        const mouseY = event.clientY; // Y-Position der Maus im sichtbaren Fenster
        const windowHeight = window.innerHeight;

        // Alten Scroll-Vorgang stoppen, falls die Maus nicht mehr in der Zone ist
        stopScrolling();

        // Prüfen, ob die Maus in der oberen Scroll-Zone ist
        if (mouseY < scrollZoneHeight) {
            scrollInterval = setInterval(() => {
                window.scrollBy(0, -scrollSpeed); // Nach oben scrollen
            }, 16); // ca. 60 Frames pro Sekunde
        }
        // Prüfen, ob die Maus in der unteren Scroll-Zone ist
        else if (mouseY > windowHeight - scrollZoneHeight) {
            scrollInterval = setInterval(() => {
                window.scrollBy(0, scrollSpeed); // Nach unten scrollen
            }, 16);
        }
    }

    // Wir binden die Funktionen an die globalen Drag-Events
    document.addEventListener('dragover', handleDragScroll);

    // Wichtig: Wir müssen das Scrollen stoppen, wenn der Drag-Vorgang beendet wird
    document.addEventListener('dragend', stopScrolling);
    document.addEventListener('drop', stopScrolling);

})();


//=======================================================================
// MOBILE SWIPE LOGIK
//=======================================================================

let touchstartX = 0;
let touchendX = 0;
let touchstartY = 0;

function handleGesture() {
    const swipeDistance = touchendX - touchstartX;
    const minDistance = 70; // Mindestdistanz für einen Swipe

    // 1. ZURÜCK (Swipe nach rechts)
    if (swipeDistance > minDistance) {
        if (currentStep > 1) {
            triggerSaveAnimation();
            goToStep(currentStep - 1);
        }
    } 
    // 2. WEITER / SPEICHERN (Swipe nach links)
    else if (swipeDistance < -minDistance) {
        handleMobileForward();
    }
}

function handleMobileForward() {
    if (currentStep === 12) {
        // Wir prüfen, ob die Funktion finishCharacter existiert
        if (typeof finishCharacter === "function") {
            const confirmMsg = translations[currentLang].confirmFinish || "Finish character?";
            
            if (confirm(confirmMsg)) {
                triggerSaveAnimation();
                // Hier rufen wir jetzt DEINE Funktion auf:
                finishCharacter(); 
            }
        } else {
            console.error("Fehler: Die Funktion 'finishCharacter' wurde in main.js nicht gefunden!");
        }
    } else {
        // Normales Speichern für alle anderen Schritte (1 bis 11)
        // Wir suchen den Button, der gerade fürs Speichern zuständig ist
        const saveBtn = document.querySelector('.fixed-button:not(#back):not([style*="display: none"])');
        if (saveBtn) {
            triggerSaveAnimation();
            saveBtn.click(); 
        }
    }
}

function triggerSaveAnimation() {
    const content = document.getElementById('mainContent');
    content.classList.remove('save-glow-active');
    void content.offsetWidth; // Trigger reflow
    content.classList.add('save-glow-active');
}

// Event Listener mit Sicherheits-Check
document.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
    touchstartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    const edgeThreshold = 50; // 50px vom Rand

    // SICHERHEITS-CHECK: Nur am Rand ODER im unteren Drittel
    const isAtEdge = touchstartX < edgeThreshold || touchstartX > (screenWidth - edgeThreshold);
    const isAtBottom = touchstartY > (screenHeight * 0.66);

    if (isAtEdge || isAtBottom) {
        handleGesture();
    }
});

// --- MOBILE TOUCH DRAG & DROP FÜR SCHRITT 4 ---

document.addEventListener('touchstart', function(e) {
    if (e.target.classList.contains('draggable-value')) {
        const touch = e.touches[0];
        e.target.dataset.startX = touch.clientX;
        e.target.dataset.startY = touch.clientY;
        e.target.style.zIndex = "1000";
        e.target.style.position = "relative";
    }
}, { passive: false });

document.addEventListener('touchmove', function(e) {
    if (e.target.classList.contains('draggable-value')) {
        e.preventDefault(); // Verhindert das Scrollen der Seite
        const touch = e.touches[0];
        const deltaX = touch.clientX - e.target.dataset.startX;
        const deltaY = touch.clientY - e.target.dataset.startY;
        
        e.target.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
    }
}, { passive: false });

document.addEventListener('touchend', function(e) {
    if (e.target.classList.contains('draggable-value')) {
        const touch = e.changedTouches[0];
        e.target.style.zIndex = "";
        e.target.style.transform = "";
        e.target.style.position = "";

        // Finden, was unter dem Finger liegt
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Prüfen, ob wir über einer gültigen Drop-Zone (Attribut-Input) sind
        const dropZone = targetElement ? targetElement.closest('.attribute-score-input') : null;

        if (dropZone) {
            // Hier nutzen wir deine bestehende Logik! 
            // Wir simulieren einfach einen Drop-Vorgang
            const value = e.target.innerText;
            const attributeName = dropZone.dataset.attribute; // Sicherstellen, dass data-attribute gesetzt ist

            // RUFE DEINE BESTEHENDE FUNKTION AUF (Anpassen an deinen Funktionsnamen!)
            if (typeof handleDropLogic === "function") {
                handleDropLogic(value, dropZone); 
            } else {
                // Falls du keine zentrale Funktion hast, weisen wir den Wert direkt zu:
                dropZone.value = value;
                dropZone.dispatchEvent(new Event('change')); // Triggert die Berechnung
                e.target.style.display = 'none'; // Versteckt den Wert im Pool
            }
            triggerSaveAnimation(); // Unser schöner goldener Glow!
        }
    }

});
