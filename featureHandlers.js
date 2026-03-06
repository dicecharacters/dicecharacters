/* * featureHandlers.js
 * Verwaltet die Logik für Klassenmerkmale, die Charakterwerte verändern.
 */

// Hilfsfunktion: Berechnet den Modifikator als ZAHL (nicht als String wie "+3")
// Wird benötigt, damit wir mathematisch korrekt rechnen können (10 + 3 + 2 = 15).
function getAbilityMod(score) {
    return Math.floor((score - 10) / 2);
}

// Interne Hilfsfunktion für Expertise-Logik (wird von mehreren Handlern genutzt)
function applyExpertiseToStats(charData, stats) {
    if (charData.classForm && Array.isArray(charData.classForm.expertise)) {
        // Wir stellen sicher, dass die Liste im stats-Objekt existiert
        if (!stats.expertiseSkillIDs) stats.expertiseSkillIDs = [];
        
        charData.classForm.expertise.forEach(id => {
            const skillID = parseInt(id);
            // ID nur hinzufügen, wenn sie noch nicht in der Liste ist
            if (!isNaN(skillID) && !stats.expertiseSkillIDs.includes(skillID)) {
                stats.expertiseSkillIDs.push(skillID);
            }
        });
    }
}

const featureHandlers = {

    // --- BARBAR: Unarmored Defense ---
    // "Solange du keine Rüstung trägst, ist deine Rüstungsklasse 10 + GE-Mod + KO-Mod. Ein Schild kannst du benutzen."
    "unarmoredDefense": (charData, stats) => {
        
        // 1. Prüfen: Trägt der Charakter Rüstung?
        let hasArmor = false;

        if (charData.equipment && Array.isArray(charData.equipment.armor)) {
            hasArmor = charData.equipment.armor.some(item => {
                // Bedingung A: Das Item muss als "equipped" markiert sein
                if (!item.equipped) return false;

                // Bedingung B: Es darf kein Schild sein (Schilde sind beim Barbaren erlaubt)
                if (item.label === 'shieldLabel') return false;

                // Wenn equipped UND kein Schild -> Es ist Rüstung -> Merkmal deaktivieren
                return true; 
            });
        }

        // Wenn Rüstung getragen wird, bricht die Funktion hier ab.
        if (hasArmor) return; 

        // 2. Werte holen und berechnen
        const dexScore = parseInt(stats.dexterity) || 10;
        const conScore = parseInt(stats.constitution) || 10;

        const dexMod = getAbilityMod(dexScore);
        const conMod = getAbilityMod(conScore);

        const newAC = 10 + dexMod + conMod;

        // 3. Ergebnis anwenden
        if (!stats.computedAC || newAC > stats.computedAC) {
            stats.computedAC = newAC;
            stats.acSource = "Unarmored Defense (Barbar)";
        }
    },

    // --- BARBAR: Fast Movement (Schnelle Bewegung) ---
    "fastMovement": (charData, computedStats) => {
        let isWearingHeavy = false;

        // A. Zugriff auf die Rüstungs-Tabelle im HTML (Live-Status)
        const headerEl = document.getElementById('th_amount_2');
        
        if (headerEl) {
            const rows = headerEl.closest('table').querySelector('tbody').querySelectorAll('tr');
            
            // B. Wir müssen die Daten exakt so aufbereiten wie beim Rendern der Tabelle,
            // damit Zeile 0 im HTML auch Index 0 in unseren Daten entspricht.
            let processedArmor = charData.equipment.armor || [];
            
            // Hilfsfunktionen nutzen (falls vorhanden)
            if (typeof expandInventoryPacks === 'function' && typeof mergeDuplicateItems === 'function') {
                processedArmor = expandInventoryPacks(processedArmor);
                processedArmor = mergeDuplicateItems(processedArmor);
            }

            // C. Zeilen durchgehen und LIVE-Checkboxen prüfen
            rows.forEach((row, index) => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                
                // Ist die Checkbox JETZT GERADE angehakt?
                if (checkbox && checkbox.checked) {
                    
                    // Welches Item gehört zu dieser Zeile?
                    const item = processedArmor[index];
                    
                    if (item && typeof armorList !== 'undefined') {
                        const armorData = armorList.find(a => a.translationLabel === item.label);
                        
                        // Check: Ist es Schwere Rüstung (Kategorie 3)?
                        if (armorData && armorData.armorCategoryNumber === 3) {
                            isWearingHeavy = true;
                        }
                    }
                }
            });
        }

        // D. Bonus anwenden
        if (!isWearingHeavy) {
            computedStats.bonusSpeedFT += 10;
            // console.log("Fast Movement (Barbar): Aktiv (+10 ft)");
        } else {
            // console.log("Fast Movement (Barbar): Inaktiv (Schwere Rüstung)");
        }
    },

    // --- BARDE (College of Dance): Dazzling Footwork ---
    // "Deine Basis-RK ist 10 + GES-Mod + CHA-Mod."
    "dazzlingFootworkLabel": (charData, stats) => {
        // Werte holen
        const dexScore = parseInt(stats.dexterity) || 10;
        const chaScore = parseInt(stats.charisma) || 10;

        const dexMod = getAbilityMod(dexScore);
        const chaMod = getAbilityMod(chaScore);

        const newAC = 10 + dexMod + chaMod;

        // Ergebnis anwenden (nur wenn besser als bisherige Berechnung)
        if (!stats.computedAC || newAC > stats.computedAC) {
            stats.computedAC = newAC;
            stats.acSource = "Dazzling Footwork (Barde)";
        }
    },

    // --- MÖNCH: Unarmored Defense ---
    // "Solange du keine Rüstung trägst UND keinen Schild nutzt, ist deine RK 10 + GES-Mod + WEI-Mod."
    "unarmoredDefenseLabel": (charData, stats) => {
        
        // 1. Prüfen: Trägt der Charakter Rüstung ODER einen Schild?
        let hasArmorOrShield = false;

        if (charData.equipment && Array.isArray(charData.equipment.armor)) {
            hasArmorOrShield = charData.equipment.armor.some(item => {
                // Beim Mönch deaktiviert JEDES Teil (Rüstung oder Schild) das Merkmal,
                // solange es als "equipped" markiert ist.
                return item.equipped === true;
            });
        }

        // Wenn Rüstung oder Schild getragen wird -> Abbruch
        if (hasArmorOrShield) return; 

        // 2. Werte holen (GES und WEI)
        const dexScore = parseInt(stats.dexterity) || 10;
        const wisScore = parseInt(stats.wisdom) || 10;

        const dexMod = getAbilityMod(dexScore);
        const wisMod = getAbilityMod(wisScore);

        // 3. Neue RK berechnen
        const newAC = 10 + dexMod + wisMod;

        // 4. Ergebnis anwenden
        if (!stats.computedAC || newAC > stats.computedAC) {
            stats.computedAC = newAC;
            stats.acSource = "Unarmored Defense (Mönch)";
        }
    },

    // --- MÖNCH: Unarmored Movement (Speed) ---
    "unarmoredMovementLabel": (charData, stats) => {
        let hasArmorOrShield = false;

        // A. Live-Prüfung der Inventar-Tabelle (Rüstung)
        const headerEl = document.getElementById('th_amount_2');
        if (headerEl) {
            const rows = headerEl.closest('table').querySelector('tbody').querySelectorAll('tr');
            
            // Daten aufbereiten für Index-Abgleich
            let processedArmor = charData.equipment.armor || [];
            if (typeof expandInventoryPacks === 'function' && typeof mergeDuplicateItems === 'function') {
                processedArmor = expandInventoryPacks(processedArmor);
                processedArmor = mergeDuplicateItems(processedArmor);
            }

            rows.forEach((row, index) => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                
                // Ist die Checkbox JETZT GERADE angehakt?
                if (checkbox && checkbox.checked) {
                    // Wir prüfen sicherheitshalber, ob es wirklich Rüstung/Schild ist
                    // (Falls jemand nur normale Kleidung in die Rüstungstabelle packt)
                    const item = processedArmor[index];
                    if (item && typeof armorList !== 'undefined') {
                        const armorData = armorList.find(a => a.translationLabel === item.label);
                        // Jede Kategorie (1,2,3,4) zählt als Rüstung/Schild
                        if (armorData && armorData.armorCategoryNumber >= 1 && armorData.armorCategoryNumber <= 4) {
                            hasArmorOrShield = true;
                        }
                    }
                }
            });
        }

        // B. Zusätzliche Live-Prüfung: Schild-Checkbox auf Seite 1
        const shieldCheckboxPage1 = document.getElementById('shieldActive');
        if (shieldCheckboxPage1 && shieldCheckboxPage1.checked) {
            hasArmorOrShield = true;
        }

        // C. Abbruch wenn Rüstung getragen
        if (hasArmorOrShield) return;

        // D. Bonus berechnen (Daten aus monkClassData)
        const levelInput = document.getElementById('level');
        const currentLevel = levelInput ? parseInt(levelInput.value, 10) : (parseInt(charData.basic.level) || 1);
        
        if (typeof monkClassData !== 'undefined') {
            const levelData = monkClassData.find(d => d.level === currentLevel);
            if (levelData && levelData.unarmoredMovement_ft) {
                stats.bonusSpeedFT += parseInt(levelData.unarmoredMovement_ft);
                // console.log(`Monk Speed: +${levelData.unarmoredMovement_ft} ft`);
            }
        }
    },

    // --- MÖNCH: Kampfkünste (Martial Arts) ---
    "martialArtsLabel": (charData, stats) => {
        window.hasMartialArts = true;
    },

    // --- PALADIN: Aura of Alacrity ---
    // "Deine Bewegungsrate erhöht sich um 10 Fuß."
    "auraOfAlacrityLabel": (charData, stats) => {
        // Einfacher additiver Bonus
        stats.bonusSpeedFT += 10;
    },

    // --- EXPERTISE (Barde/Waldläufer/Schurke) ---
    "expertiseLabel": (charData, stats) => {
        applyExpertiseToStats(charData, stats);
    },

    // --- SCHOLAR (Magier) ---
    "scholarLabel": (charData, stats) => {
        applyExpertiseToStats(charData, stats);
    },

    // --- KLERIKER: Divine Order ---
    "divineOrderLabel": (charData, stats) => {
        if (charData.classForm && charData.classForm.divineOrders && typeof divineOrderCategoryList !== 'undefined') {
            const orderId = parseInt(charData.classForm.divineOrders, 10);
            const orderData = divineOrderCategoryList.find(o => o.divineOrderCategoryNumber === orderId);
            
            if (orderData) {
                if (!stats.additionalProficiencies) stats.additionalProficiencies = { armor: [], weapon: [] };
                
                if (orderData.Get_weaponCategoryNumber) {
                    const weapons = Array.isArray(orderData.Get_weaponCategoryNumber) ? orderData.Get_weaponCategoryNumber : [orderData.Get_weaponCategoryNumber];
                    stats.additionalProficiencies.weapon.push(...weapons);
                }
                if (orderData.Get_armorCategoryNumber) {
                    const armor = Array.isArray(orderData.Get_armorCategoryNumber) ? orderData.Get_armorCategoryNumber : [orderData.Get_armorCategoryNumber];
                    stats.additionalProficiencies.armor.push(...armor);
                }
            }
        }
    },

    // --- DRUIDE: Primal Order ---
    "primalOrderLabel": (charData, stats) => {
        if (charData.classForm && charData.classForm.primalOrders && typeof primalOrderCategoryList !== 'undefined') {
            const orderId = parseInt(charData.classForm.primalOrders, 10);
            const orderData = primalOrderCategoryList.find(o => o.primalOrderCategoryNumber === orderId);
            
            if (orderData) {
                if (!stats.additionalProficiencies) stats.additionalProficiencies = { armor: [], weapon: [] };
                
                if (orderData.Get_weaponCategoryNumber) {
                    const weapons = Array.isArray(orderData.Get_weaponCategoryNumber) ? orderData.Get_weaponCategoryNumber : [orderData.Get_weaponCategoryNumber];
                    stats.additionalProficiencies.weapon.push(...weapons);
                }
                if (orderData.Get_armorCategoryNumber) {
                    const armor = Array.isArray(orderData.Get_armorCategoryNumber) ? orderData.Get_armorCategoryNumber : [orderData.Get_armorCategoryNumber];
                    stats.additionalProficiencies.armor.push(...armor);
                }
            }
        }
    },

    // --- DRUIDE: Druidic (Geheimsprache) ---
    "druidicLabel": (charData, stats) => {
        if (!stats.additionalLanguages) stats.additionalLanguages = [];
        // ID 14 entspricht "druidicLangLabel" in der languageList
        if (!stats.additionalLanguages.includes(14)) {
            stats.additionalLanguages.push(14);
        }
    }

};


const talentHandlers = {


    // --- ALERT (WACHSAM) ---
    // "Initiative Proficiency: Add your Proficiency Bonus to the roll."
    "alertLabel": (charData, computedStats) => {
        // 1. Aktuellen Proficiency Bonus aus dem DOM holen
        const pbInput = document.getElementById('proficiencyBonus');
        let pb = 0;
        if (pbInput) {
            // Entfernt das "+" Zeichen und wandelt in Zahl um
            pb = parseInt(pbInput.value.replace('+', ''), 10) || 0;
        }

        // 2. Aktuellen Geschicklichkeits-Modifikator holen
        const dexInput = document.getElementById('dexterityModifier');
        let dexMod = 0;
        if (dexInput) {
            dexMod = parseInt(dexInput.value.replace('+', ''), 10) || 0;
        }

        // 3. Berechnung: Dex + PB
        const newInit = dexMod + pb;

        // 4. In das Initiative-Feld schreiben
        const initInput = document.getElementById('initiative');
        if (initInput) {
            // Formatierung mit Vorzeichen
            initInput.value = (newInit >= 0 ? "+" : "") + newInit;
        }

        console.log(`Talent 'Alert' angewendet: Initiative = Dex (${dexMod}) + PB (${pb}) = ${newInit}`);
    },
    
    // --- TAVERN BRAWLER (SCHLÄGER) ---
    "tavernBrawlerLabel": (charData, computedStats) => {
        const propField = document.getElementById('weaponProperties');
        if (propField) {
            const t = translations[currentLanguage];
            const impLabel = (t && t['improvisedLabel']) ? t['improvisedLabel'] : 'Improvised';
            let currentText = propField.value.trim();

            if (!currentText.includes(impLabel)) {
                if (currentText.length > 0) {
                    propField.value = currentText + ", " + impLabel;
                } else {
                    propField.value = impLabel;
                }
            }
        }
    },

    // --- TOUGH (ZÄH) ---
    "toughLabel": (charData, computedStats) => {
        const hpInput = document.getElementById('maxHP'); // ID korrigiert
        
        if (!hpInput) return;

        // Sicherheits-Check: Wurde Tough schon angewendet?
        if (hpInput.dataset.toughApplied === "true") return;

        const level = parseInt(charData.basic.level, 10) || 1;
        const bonusHP = level * 2;

        let currentMaxHP = parseInt(hpInput.value, 10);
        if (isNaN(currentMaxHP)) currentMaxHP = 0;

        // 1. Max HP setzen
        const newMax = currentMaxHP + bonusHP;
        hpInput.value = newMax;
        
        // 2. Aktuelle HP nachziehen (NEU)
        const currentHpInput = document.getElementById('currentHP');
        if (currentHpInput) {
            // Wir setzen die aktuellen HP ebenfalls auf das neue Maximum
            currentHpInput.value = newMax;
        }

        // Markierung setzen
        hpInput.dataset.toughApplied = "true";

        console.log(`Tough applied: +${bonusHP} MaxHP. CurrentHP auf ${newMax} gesetzt.`);
    },

    // --- RESILIENT (WIDERSTANDSFÄHIG) ---
    "resilientLabel": (charData, computedStats) => {
        // 1. Auswahl holen (kann Array oder Einzelwert sein)
        let selection = charData.classForm.attributes;
        
        if (!selection) return;

        // Sicherstellen, dass wir ein Array iterieren
        const values = Array.isArray(selection) ? selection : [selection];

        values.forEach(val => {
            let attrKey = "";

            // A. Fall: Es ist eine ID (Zahl/String-Zahl)
            if (!isNaN(val)) {
                if (typeof attributeList !== 'undefined') {
                    // Suche nach ID (groß oder klein)
                    const attrData = attributeList.find(a => a.ID == val || a.id == val);
                    if (attrData) {
                        // z.B. "strengthLabel"
                        attrKey = attrData.translationLabel; 
                    }
                }
            } 
            // B. Fall: Es ist bereits ein String (z.B. "strengthLabel")
            else {
                attrKey = val;
            }

            // 2. DOM-Element finden und aktivieren
            if (attrKey) {
                // "strengthLabel" -> "strength"
                const cleanName = attrKey.replace("Label", ""); 
                
                // ID bauen: "strengthSavingTrained"
                const checkboxId = `${cleanName}SavingTrained`;
                const checkbox = document.getElementById(checkboxId);

                if (checkbox) {
                    // Nur aktivieren, falls nicht schon an (verhindert nichts, ist aber sauberer)
                    if (!checkbox.checked) {
                        checkbox.checked = true;
                        console.log(`'Resilient' angewendet: Rettungswurf für ${cleanName} aktiviert.`);
                    }
                }
            }
        });
    },

    // --- SPEEDY (FLINK / SCHNELL) ---
    "speedyLabel": (charData, computedStats) => {
        // Einfach 10 Fuß zum Bonus addieren
        computedStats.bonusSpeedFT += 10;
        console.log("Talent 'Speedy' angewendet: +10 ft. Bewegungsrate.");
    },

    // --- BOON OF FORTITUDE (SEGEN DER ZÄHIGKEIT) ---
    "boonOfFortitudeLabel": (charData, computedStats) => {
        const hpInput = document.getElementById('maxHP');
        
        if (!hpInput) return;

        // Sicherheits-Check: Wurde dieser Segen schon angewendet?
        // WICHTIG: Eigenes Flag nutzen, damit es nicht mit "Tough" kollidiert!
        if (hpInput.dataset.boonFortitudeApplied === "true") return;

        let currentMaxHP = parseInt(hpInput.value, 10);
        if (isNaN(currentMaxHP)) currentMaxHP = 0;

        const bonusHP = 40;
        const newMax = currentMaxHP + bonusHP;

        // 1. Max HP setzen
        hpInput.value = newMax;
        
        // 2. Aktuelle HP nachziehen
        const currentHpInput = document.getElementById('currentHP');
        if (currentHpInput) {
            currentHpInput.value = newMax;
        }

        // Markierung setzen
        hpInput.dataset.boonFortitudeApplied = "true";

        console.log(`Talent 'Boon of Fortitude' angewendet: +40 HP.`);
    },

    // --- BOON OF SPEED (SEGEN DER SCHNELLIGKEIT) ---
    "boonOfSpeedLabel": (charData, computedStats) => {
        // Einfach 30 Fuß zum Bonus addieren
        computedStats.bonusSpeedFT += 30;
        console.log("Talent 'Boon of Speed' angewendet: +30 ft. Bewegungsrate.");
    }
    
    // Hier folgen weitere Talente...
};


const speciesHandlers = {

    // --- ZWERG: Zwergische Zähigkeit (Dwarven Toughness) ---
    "dwarvenToughnessLabel": (charData) => {
        const hpInput = document.getElementById('maxHP');
        const levelInput = document.getElementById('level');
        const currentHpInput = document.getElementById('currentHP'); 
        
        if (!hpInput || !levelInput) return;

        if (!hpInput.dataset.dwarvenToughnessApplied) {
            const currentLevel = parseInt(levelInput.value, 10) || 1;
            let currentMaxHP = parseInt(hpInput.value, 10) || 0;
            
            const newMax = currentMaxHP + currentLevel;
            hpInput.value = newMax;
            
            if (currentHpInput) {
                currentHpInput.value = newMax;
            }

            hpInput.dataset.dwarvenToughnessApplied = "true";
        }
    },

    // --- WALDELF: Erhöhte Bewegungsrate (Wood Elf Lineage) ---
    // Der Schlüssel MUSS "woodElfLabel" sein, da lineageList per 0:LIN diesen als handlerKey setzt!
    "woodElfLabel": (charData) => {
        // Da die Bewegungsrate AUF 35 steigt (und nicht um +5 addiert wird),
        // setzen wir hier eine globale Überschreibung. 
        window.baseSpeedOverride = 35; 
    }

};