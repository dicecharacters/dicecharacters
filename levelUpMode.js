//=======================================================================
// Stufenaufstiegs-Modus (Level-Up) — zentral, unabhängig vom Normal-Ersteller
//=======================================================================

const DC_LEVEL_UP_SESSION_KEY = "dcLevelUpSnapshot";
const DC_CREATOR_MODE_KEY = "dcCreatorMode";
const DC_CREATOR_MODE_LEVEL_UP = "levelUp";
/** Persistente Bogen-Overrides (manuell + Import; Refresh-sicher). */
const SHEET_OVERRIDES_STORAGE_KEY = "sheet_overrides";

/** Alle LocalStorage-Keys wie finishCharacter() + Export-Erweiterungen */
const LEVEL_UP_BASE_STORAGE_KEYS = [
    "characterName", "playerName", "class", "background", "species", "lineage", "ancestry", "level", "ruleLevel", "xp",
    "strengthScore", "dexterityScore", "constitutionScore", "intelligenceScore", "wisdomScore", "charismaScore",
    "classForm", "equipment", "purse", "languages", "cantrips", "spellbookSpells", "preparedSpells", "favoredSpells",
    "feat_background", "feat_species", "tool_background", "instrument_background", "game_background",
    "backgroundAttributeBonuses",
    "levelUpReconstruction",
    "speciesFreeChoices", "spellcastingAbility_species", "spellcastingAbility_talent",
    "story", "deityId", "deityName", "communityName", "communityDesc",
    "alignment", "personalityTraits",
    "gender", "age", "eyeColor", "hairColor", "skinTone", "size", "appearanceDescription",
    "portraitImage", "symbolImage", "currentLanguage",
    "customClassRuntime", "customSubclassRuntime", "customBackgroundRuntime",
    "customSpellPackRuntime", "customFeatPackRuntime", "customSpeciesRuntime",
    "dcCharacterPackageId", "dcCharacterPackageCreatedAt"
];

let dcLevelUpSnapshotCache = null;
let dcLevelUpTargetLevel = null;

/**
 * Schritt-7-Ausnahme: Talent-/Merkmals-translationLabels, die im Level-Up
 * NICHT dauerhaft gesperrt werden (Zauberwahl bleibt editierbar).
 *
 * Grundregel: bereits gewählte Talente (Stufe ≤ entry) sind in Schritt 7 gesperrt.
 * Diese Labels sind davon befreit — analog zu Klassenmerkmalen mit offenem Kontingent.
 * Bewusst einfach: keine Teil-Sperren; Nutzer kann theoretisch auch unregelkonform tauschen.
 *
 * Erweitern: Label hier eintragen (Feat-Label oder zweites Label bei Kampfstil-Arrays).
 */
const LEVEL_UP_STEP7_UNLOCKED_SPELL_FEATURE_LABELS = Object.freeze([
    // PB-Skalierung: Anzahl Ritualzauber Grad 1 = Übungsbonus (chooseNonSpecificSpell_a === 555)
    "ritualCasterLabel",
    // Kampfstil: bei Klassenstufe Zaubertrick tauschbar (Paladin / Ranger)
    "blessedWarriorLabel",
    "druidicWarriorLabel"
]);

/** true, wenn das Zauber-Merkmal über die Ausnahme-Liste entsperrt bleibt. */
function isLevelUpStep7UnlockedSpellFeature(feature) {
    if (!feature) return false;
    const labels = LEVEL_UP_STEP7_UNLOCKED_SPELL_FEATURE_LABELS;
    if (feature.sourceFeatLabel && labels.includes(feature.sourceFeatLabel)) {
        return true;
    }
    const raw = feature.translationLabel;
    const parts = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    return parts.some(label => labels.includes(label));
}

/**
 * Schritt 6: Merkmale, deren frühere Auswahlen beim Stufenaufstieg tauschbar bleiben
 * (PHB: z. B. Metamagie, Schauerliche Anrufungen).
 * Erweitern: translationLabel hier + passendes Präfix in LEVEL_UP_STEP6_SWAPPABLE_SELECT_PREFIXES.
 */
const LEVEL_UP_STEP6_SWAPPABLE_FEATURE_LABELS = Object.freeze([
    "metamagicLabel",
    "eldritchInvocationsLabel",
    "combatSuperiorityLabel",
    "combatSuperiority2Label",
    "combatSuperiority3Label",
    "combatSuperiority4Label"
]);

/** Battle Master: alle Stufen teilen classForm-/Select-Präfix maneuver. */
const LEVEL_UP_STEP6_COMBAT_SUPERIORITY_LABELS = Object.freeze([
    "combatSuperiorityLabel",
    "combatSuperiority2Label",
    "combatSuperiority3Label",
    "combatSuperiority4Label"
]);

/** Select-ID/Name-Präfix → translationLabel (muss in SWAPPABLE_FEATURE_LABELS stehen). */
const LEVEL_UP_STEP6_SWAPPABLE_SELECT_PREFIXES = Object.freeze({
    metamagic: "metamagicLabel",
    invocation: "eldritchInvocationsLabel",
    maneuver: "combatSuperiorityLabel"
});

/** translationLabel des tauschbaren Merkmals für ein Step-6-Control — sonst null. */
function levelUpGetStep6SwappableLabelForControl(el) {
    if (!el) return null;
    const key = el.id || el.name || "";
    if (!key) return null;

    // Battle Master: maneuver1…n — mindestens ein combatSuperiority*-Label freigegeben
    if (/^maneuver\d+$/.test(key)) {
        const hit = LEVEL_UP_STEP6_COMBAT_SUPERIORITY_LABELS.find(
            label => LEVEL_UP_STEP6_SWAPPABLE_FEATURE_LABELS.includes(label)
        );
        return hit || null;
    }

    for (const [prefix, label] of Object.entries(LEVEL_UP_STEP6_SWAPPABLE_SELECT_PREFIXES)) {
        if (prefix === "maneuver") continue;
        if (!LEVEL_UP_STEP6_SWAPPABLE_FEATURE_LABELS.includes(label)) continue;
        if (new RegExp(`^${prefix}\\d+$`).test(key)) return label;
    }
    return null;
}

/** true = frühere Auswahl in Schritt 6 bleibt beim Stufenaufstieg editierbar. */
function isLevelUpStep6SwappableControl(el) {
    return levelUpGetStep6SwappableLabelForControl(el) != null;
}

function tLevelUp(key, fallback) {
    const lang = (typeof currentLang !== "undefined" && currentLang)
        ? currentLang
        : ((typeof currentLanguage !== "undefined" && currentLanguage) ? currentLanguage : "de");
    if (typeof translations !== "undefined" && translations[lang]?.[key] != null) {
        return translations[lang][key];
    }
    return fallback || key;
}

//=======================================================================
// LEVEL-UP RECONSTRUCTION ONLY
// Stumme Creator→Bogen-Daten: werden im Charakterbogen NICHT angezeigt.
// Nur für deterministische Hydration im Stufenaufstiegs-Modus.
// Darf die normale Ersteller-Logik nicht verändern — nur mitschreiben/lesen.
//=======================================================================

/**
 * Baut den stummen Rekonstruktions-Blob aus dem aktuellen Creator-Zustand.
 * @returns {{ version: number, backgroundAttributeBonuses: object, attributeBases: object, featSelections: object, spellbookChoicesByFeature: object }}
 */
function buildLevelUpReconstructionPayload() {
    const attributeBases = {};
    if (typeof attributeList !== "undefined" && Array.isArray(attributeList)) {
        attributeList.forEach(attr => {
            const stringId = attr.translationLabel.replace("Label", "");
            const el = document.getElementById(`${stringId}Score`);
            if (el && el.value !== "" && el.value != null) {
                const n = parseInt(el.value, 10);
                if (Number.isFinite(n)) attributeBases[stringId] = n;
            }
        });
    }

    // featSelections flach klonen (inkl. asiChoices)
    let featSelections = {};
    try {
        featSelections = JSON.parse(JSON.stringify(
            (typeof character !== "undefined" && character.featSelections) ? character.featSelections : {}
        ));
    } catch (e) {
        featSelections = {};
    }

    let backgroundAttributeBonuses = {};
    try {
        backgroundAttributeBonuses = JSON.parse(JSON.stringify(
            (typeof character !== "undefined" && character.backgroundAttributeBonuses)
                ? character.backgroundAttributeBonuses
                : {}
        ));
    } catch (e) {
        backgroundAttributeBonuses = {};
    }

    const existing = getLevelUpReconstructionData() || {};
    const freshBook = buildSpellbookChoicesByFeaturePayload();
    const spellbookChoicesByFeature = Object.keys(freshBook).length > 0
        ? freshBook
        : (existing.spellbookChoicesByFeature || {});

    return {
        version: 1,
        backgroundAttributeBonuses,
        attributeBases,
        featSelections,
        spellbookChoicesByFeature
    };
}

/** Liest stummen Blob aus Snapshot/character (falls vorhanden). */
function getLevelUpReconstructionData() {
    if (typeof character !== "undefined" && character.levelUpReconstruction
        && typeof character.levelUpReconstruction === "object") {
        return character.levelUpReconstruction;
    }
    const snap = getLevelUpSnapshot();
    const fromSnap = safeParseJson(snap?.base?.levelUpReconstruction, null);
    if (fromSnap && typeof fromSnap === "object") return fromSnap;
    return null;
}

/** Stabilen Merkmalsschlüssel für spellbookChoicesByFeature im Rekonstruktions-Blob. */
function resolveSpellFeatureRestoreKey(feature) {
    if (!feature) return "";
    const id = String(feature.ID || "");
    if (id === "classCantrips") return "classCantripsLabel";
    if (id === "classPreparedSpells") return "classPreparedSpellsLabel";
    if (id.startsWith("savant-additional-spells-")) return id;
    const label = levelUpResolveMagicFeatureLabel(feature);
    return label || id;
}

/** Zauberbuch-Zuordnung pro Merkmal (chooseType 0) für den stummen Blob. */
function buildSpellbookChoicesByFeaturePayload() {
    const out = {};
    if (typeof spellChoicesByFeature === "undefined" || !spellChoicesByFeature) return out;

    const features = (typeof applicableMagicFeatures !== "undefined" && Array.isArray(applicableMagicFeatures))
        ? applicableMagicFeatures
        : [];

    Object.keys(spellChoicesByFeature).forEach(featureId => {
        const set = spellChoicesByFeature[featureId];
        if (!set || !set.size) return;
        const feature = features.find(f => String(f.ID) === String(featureId));
        if (!feature || feature.chooseType !== 0) return;

        const key = resolveSpellFeatureRestoreKey(feature);
        if (!key) return;

        const ids = Array.from(set)
            .map(id => parseInt(id, 10))
            .filter(id => !isNaN(id));
        if (ids.length) out[key] = ids;
    });
    return out;
}

/** character.levelUpReconstruction nach Schritt 7 / Stufenaufstieg aktualisieren. */
function syncCharacterLevelUpReconstructionBlob() {
    if (typeof character === "undefined") return;
    if (typeof buildLevelUpReconstructionPayload !== "function") return;
    character.levelUpReconstruction = buildLevelUpReconstructionPayload();
}

/**
 * Wendet stumme Rekonstruktionsdaten an (BG-Boni, featSelections/ASI, Basen).
 * Fallback: classForm.feats / Totals wie bisher — kein Raten.
 */
function applyLevelUpReconstructionData() {
    const recon = getLevelUpReconstructionData();
    if (!recon || typeof recon !== "object") return false;

    if (recon.backgroundAttributeBonuses
        && typeof recon.backgroundAttributeBonuses === "object") {
        character.backgroundAttributeBonuses = Object.assign(
            {},
            recon.backgroundAttributeBonuses
        );
    }

    if (recon.featSelections && typeof recon.featSelections === "object") {
        character.featSelections = JSON.parse(JSON.stringify(recon.featSelections));
    }

    return true;
}

/** Bogen-Override-Attribute → character.*TotalScore (manuell geänderte Werte). */
const LEVEL_UP_ATTRIBUTE_SCORE_INPUT_IDS = [
    "strengthScore", "dexterityScore", "constitutionScore",
    "intelligenceScore", "wisdomScore", "charismaScore"
];

function levelUpScoreInputIdToCharacterKey(inputId) {
    return inputId.replace("Score", "TotalScore");
}

/**
 * Live-Bogenwerte aus overrides.inputs in Snapshot-Basis und character übernehmen.
 * (base.localStorage hat oft ältere Werte; overrides = aktuelle Anzeige auf dem Bogen.)
 */
function applySnapshotOverrideScoresToBaseAndCharacter(snapshot) {
    const inputs = snapshot?.overrides?.inputs;
    if (!inputs || typeof inputs !== "object") return;

    if (!snapshot.base) snapshot.base = {};

    LEVEL_UP_ATTRIBUTE_SCORE_INPUT_IDS.forEach(inputId => {
        const raw = inputs[inputId];
        if (raw == null || String(raw).trim() === "") return;
        const n = parseInt(raw, 10);
        if (!Number.isFinite(n)) return;

        snapshot.base[inputId] = String(n);
        if (typeof character !== "undefined") {
            character[levelUpScoreInputIdToCharacterKey(inputId)] = n;
        }
    });
}

/**
 * Begabt (Skilled): Radios auslösen → Dropdowns erzeugen, dann Select-Werte setzen.
 */
function levelUpRestoreSkilledFeatFromChoices(featLevel, dynamicChoices) {
    if (!Array.isArray(dynamicChoices) || !dynamicChoices.length) return;

    const usedSelectIds = new Set();

    for (let i = 0; i < 3; i++) {
        const skillRadioId = `skillRadio${featLevel}_${i}`;
        const toolRadioId = `toolRadio${featLevel}_${i}`;
        const pickedSkill = dynamicChoices.some(
            c => c.id === skillRadioId && String(c.value) === "skill"
        );
        const pickedTool = dynamicChoices.some(
            c => c.id === toolRadioId && String(c.value) === "tool"
        );
        const radioId = pickedSkill ? skillRadioId : (pickedTool ? toolRadioId : null);
        if (!radioId) continue;

        const radio = document.getElementById(radioId);
        if (!radio) continue;

        const prefix = pickedSkill ? "skill" : "tool";
        const choice = dynamicChoices.find(c =>
            c?.id
            && c.id.startsWith(prefix)
            && !c.id.includes("Radio")
            && !usedSelectIds.has(c.id)
        );
        if (choice) usedSelectIds.add(choice.id);

        let selectEl = choice?.id ? document.getElementById(choice.id) : null;

        if (!selectEl) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change", { bubbles: true }));
            selectEl = choice?.id ? document.getElementById(choice.id) : null;
        } else {
            radio.checked = true;
        }

        if (selectEl && choice) {
            levelUpSetSelectValue(selectEl, choice.value);
            if (prefix === "tool" && typeof updateToolDynamicContent === "function") {
                const toolID = parseInt(choice.value, 10);
                if (Number.isFinite(toolID)) updateToolDynamicContent(toolID, selectEl);
            }
        }
    }
}

/** Talente mit Fertigkeit/Expertise-Radio (Scharfsinnig, Aufmerksam, Fertigkeitsexperte). */
const FEAT_LABELS_EXPERT_BRANCH = new Set([
    "keenMindLabel",
    "observantLabel",
    "skillExpertLabel"
]);

/** Alle Talente, deren dynamische UI per Radio → Dropdown aufgebaut wird. */
const FEAT_LABELS_RADIO_DYNAMIC = new Set([
    "skilledLabel",
    ...FEAT_LABELS_EXPERT_BRANCH
]);

/**
 * Scharfsinnig / Aufmerksam / Fertigkeitsexperte:
 * skillRadio{lvl}_expert | expertiseRadio{lvl}_expert → Dropdown erzeugen, Wert setzen.
 */
function levelUpRestoreExpertBranchFeatFromChoices(featLevel, dynamicChoices) {
    if (!Array.isArray(dynamicChoices) || !dynamicChoices.length) return;

    const skillRadioId = `skillRadio${featLevel}_expert`;
    const expertiseRadioId = `expertiseRadio${featLevel}_expert`;
    const pickedSkill = dynamicChoices.some(
        c => c.id === skillRadioId && String(c.value) === "skill"
    );
    const pickedExpertise = dynamicChoices.some(
        c => c.id === expertiseRadioId && String(c.value) === "expertise"
    );
    const radioId = pickedSkill ? skillRadioId : (pickedExpertise ? expertiseRadioId : null);
    if (!radioId) return;

    const radio = document.getElementById(radioId);
    if (!radio) return;

    const selectChoice = dynamicChoices.find(c => {
        if (!c?.id || c.id.includes("Radio") || c.id.startsWith("feat-")) return false;
        return pickedSkill ? c.id.startsWith("skill") : c.id.startsWith("expertise");
    });

    let selectEl = selectChoice?.id ? document.getElementById(selectChoice.id) : null;
    if (!selectEl) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        if (pickedExpertise && typeof populateExpertiseOptions === "function") {
            populateExpertiseOptions();
        }
        selectEl = selectChoice?.id ? document.getElementById(selectChoice.id) : null;
    } else {
        radio.checked = true;
    }

    if (selectEl && selectChoice) {
        levelUpSetSelectValue(selectEl, selectChoice.value);
    }
}

/** Expertise-Dropdowns aus feat-dynamicChoices (z. B. Gabe des Geschicks, Expertise-Zweig). */
function reapplyFeatExpertiseSelectsFromDynamicChoices() {
    if (typeof character === "undefined") return;
    const cf = character.classForm;
    if (!Array.isArray(cf?.feats)) return;

    const recon = (typeof isLevelUpMode === "function" && isLevelUpMode()
        && typeof getLevelUpReconstructionData === "function")
        ? getLevelUpReconstructionData()
        : null;

    cf.feats.forEach(entry => {
        const lvl = parseInt(entry.level, 10);
        if (!lvl) return;

        const fromRecon = recon?.featSelections?.[lvl]
            || recon?.featSelections?.[String(lvl)]
            || {};
        const dynamicChoices = Array.isArray(fromRecon.dynamicChoices) && fromRecon.dynamicChoices.length
            ? fromRecon.dynamicChoices
            : (Array.isArray(entry.dynamicChoices) ? entry.dynamicChoices : []);

        dynamicChoices.forEach(choice => {
            if (!choice?.id || !String(choice.id).startsWith("expertise")) return;
            if (String(choice.id).includes("Radio")) return;
            const el = document.getElementById(choice.id);
            if (el) levelUpSetSelectValue(el, choice.value);
        });
    });
}

function getFeatDynamicChoicesForLevel(entry, recon) {
    const lvl = parseInt(entry?.level, 10);
    if (!lvl) return [];
    const fromRecon = recon?.featSelections?.[lvl]
        || recon?.featSelections?.[String(lvl)]
        || {};
    return Array.isArray(fromRecon.dynamicChoices) && fromRecon.dynamicChoices.length
        ? fromRecon.dynamicChoices
        : (Array.isArray(entry.dynamicChoices) ? entry.dynamicChoices : []);
}

/** ID von „Lektionen der Ältesten“ in eldritchInvocationOptionsList. */
function getLessonsOfTheFirstOnesInvocationId() {
    if (typeof eldritchInvocationOptionsList === "undefined") return null;
    const row = eldritchInvocationOptionsList.find(
        inv => inv.translationLabel === "lessonsOfTheFirstOnesLabel"
    );
    return row ? row.eldritchInvocationOption : null;
}

/** Herkunftstalent aus Anrufungs-Unterauswahl (invFeat_*) — nicht über feats{N} hydrieren. */
function isInvocationGrantedOriginFeatEntry(entry) {
    if (!entry || String(character?.class || "").toLowerCase() !== "warlock") return false;
    const lessonsId = getLessonsOfTheFirstOnesInvocationId();
    if (lessonsId == null) return false;
    const invocations = character.classForm?.eldritchInvocations || [];
    if (!invocations.some(id => String(id) === String(lessonsId))) return false;
    const featId = parseInt(entry.feat, 10);
    if (!featId || typeof featList === "undefined") return false;
    const featData = featList.find(f => f.ID === featId);
    return featData?.featCategoryNumber === 1;
}

/** Ein gespeichertes Anrufungs-Herkunftstalent in invFeat_* setzen (inkl. dynamischer Unterauswahl). */
function levelUpApplyInvocationFeatEntry(entry, invFeatSelect) {
    const featId = parseInt(entry.feat, 10);
    const lvl = parseInt(entry.level, 10);
    if (!invFeatSelect || !featId || !lvl) return;

    levelUpSetSelectValue(invFeatSelect, featId);
    if (typeof updateFeatDynamicContent === "function") {
        updateFeatDynamicContent(featId, lvl, invFeatSelect);
    }

    const recon = (typeof isLevelUpMode === "function" && isLevelUpMode()
        && typeof getLevelUpReconstructionData === "function")
        ? getLevelUpReconstructionData()
        : null;
    const dynamicChoices = getFeatDynamicChoicesForLevel(entry, recon);
    const attributeChoice = recon?.featSelections?.[lvl]?.attributeChoice
        || recon?.featSelections?.[String(lvl)]?.attributeChoice
        || entry.attributeChoice
        || null;

    const featData = (typeof featList !== "undefined")
        ? featList.find(f => f.ID === featId)
        : null;

    if (attributeChoice) {
        const abilityDrop = invFeatSelect.parentNode?.querySelector(".feat-ability-dropdown");
        if (abilityDrop) levelUpSetSelectValue(abilityDrop, attributeChoice);
    }

    if (featData && !FEAT_LABELS_RADIO_DYNAMIC.has(featData.translationLabel)) {
        const scope = invFeatSelect.parentNode || document;
        dynamicChoices.forEach(choice => {
            if (!choice?.id) return;
            if (String(choice.id).startsWith("weaponMastery-feat-")) return;
            const el = document.getElementById(choice.id)
                || scope.querySelector(`[id="${choice.id}"]`);
            if (!el) return;
            if (el.type === "radio") {
                if (String(el.value) === String(choice.value)) el.checked = true;
            } else {
                levelUpSetSelectValue(el, choice.value);
                if (typeof updateToolDynamicContent === "function" && el.id.startsWith("tool")) {
                    const toolID = parseInt(choice.value, 10);
                    if (Number.isFinite(toolID)) updateToolDynamicContent(toolID, el);
                }
            }
        });
    }
}

/**
 * Hexenmeister: Nach Anrufungs-Restore Unter-Dropdowns für „Lektionen der Ältesten“ erzeugen
 * und gespeicherte Herkunftstalent-Auswahl (inkl. Begabt → Werkzeug → Instrument) setzen.
 */
function reapplyInvocationFeatDropdowns() {
    if (typeof character === "undefined") return;
    if (String(character.class || "").toLowerCase() !== "warlock") return;
    if (typeof updateInvocationDropdowns !== "function") return;

    const lessonsId = getLessonsOfTheFirstOnesInvocationId();
    if (lessonsId == null) return;

    const cf = character.classForm;
    if (!cf) return;

    updateInvocationDropdowns();

    const root = document.getElementById("step6");
    if (!root) return;

    const originFeatEntries = (Array.isArray(cf.feats) ? cf.feats : [])
        .filter(isInvocationGrantedOriginFeatEntry);

    let originIdx = 0;
    Array.from(root.querySelectorAll('select[id^="invocation"]'))
        .sort((a, b) => {
            const na = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
            const nb = parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
            return na - nb;
        })
        .forEach(invSelect => {
            if (String(invSelect.value) !== String(lessonsId)) return;
            const suffix = invSelect.id.replace(/^invocation/i, "");
            const invFeatSelect = document.getElementById(`invFeat_${suffix}`);
            if (!invFeatSelect) return;

            const entry = originFeatEntries[originIdx++];
            if (!entry) return;

            levelUpApplyInvocationFeatEntry(entry, invFeatSelect);

            const container = invFeatSelect.closest(".invocation-feat-selection");
            if (container && typeof isLevelUpMode === "function" && isLevelUpMode()) {
                container.dataset.levelUpInvocationFeatLocked = "1";
            }
        });
}

/**
 * Nach Begabt-Kaskade unter invFeat_*: Werkzeug → Instrument/Spielset-Unterdropdowns
 * erzeugen und Werte aus classForm setzen (beim ersten Hydrationslauf existieren sie noch nicht).
 */
function reapplyInvocationFeatNestedProficiencies() {
    const cf = character.classForm;
    if (!cf) return;

    document.querySelectorAll(".invocation-feat-selection").forEach(container => {
        container.querySelectorAll('select[id^="tool"]').forEach(toolSel => {
            const toolID = parseInt(toolSel.value, 10);
            if (!Number.isFinite(toolID) || typeof updateToolDynamicContent !== "function") return;
            updateToolDynamicContent(toolID, toolSel);
        });
    });

    const pendingInstruments = Array.isArray(cf.instruments) ? cf.instruments.slice() : [];
    const pendingGames = Array.isArray(cf.games) ? cf.games.slice() : [];

    document.querySelectorAll('.invocation-feat-selection select[id^="instrument"]').forEach(sel => {
        if (sel.value || !pendingInstruments.length) return;
        levelUpSetSelectValue(sel, pendingInstruments.shift());
    });
    document.querySelectorAll('.invocation-feat-selection select[id^="game"]').forEach(sel => {
        if (sel.value || !pendingGames.length) return;
        levelUpSetSelectValue(sel, pendingGames.shift());
    });
}

/**
 * Radio-Talente (Begabt, Scharfsinnig, Aufmerksam, Fertigkeitsexperte) nach UI-Rebuild hydratisieren.
 * Ersteller + Level-Up.
 */
function reapplyFeatRadioDropdowns() {
    if (typeof character === "undefined") return;
    const cf = character.classForm;
    if (!Array.isArray(cf?.feats)) return;

    const recon = (typeof isLevelUpMode === "function" && isLevelUpMode()
        && typeof getLevelUpReconstructionData === "function")
        ? getLevelUpReconstructionData()
        : null;

    cf.feats.forEach(entry => {
        const lvl = parseInt(entry.level, 10);
        const featId = parseInt(entry.feat, 10);
        if (!lvl || !featId) return;

        const featData = (typeof featList !== "undefined")
            ? featList.find(f => f.ID === featId)
            : null;
        if (!featData) return;

        const dynamicChoices = getFeatDynamicChoicesForLevel(entry, recon);

        if (featData.translationLabel === "skilledLabel") {
            levelUpRestoreSkilledFeatFromChoices(lvl, dynamicChoices);
        } else if (FEAT_LABELS_EXPERT_BRANCH.has(featData.translationLabel)) {
            levelUpRestoreExpertBranchFeatFromChoices(lvl, dynamicChoices);
        } else if (featData.translationLabel === "boonOfSkillLabel") {
            // Gabe des Geschicks: versteckte Skill-Dropdowns + sichtbares expertise8
            dynamicChoices.forEach(choice => {
                if (!choice?.id || !choice.id.startsWith("expertise")) return;
                const el = document.getElementById(choice.id);
                if (el) levelUpSetSelectValue(el, choice.value);
            });
        }
    });

    if (typeof updateSkills === "function") updateSkills();
    if (typeof populateExpertiseOptions === "function") populateExpertiseOptions();
    reapplyFeatExpertiseSelectsFromDynamicChoices();
}

/** @deprecated Alias — nutze reapplyFeatRadioDropdowns */
function reapplyLevelUpSkilledFeatDropdowns() {
    reapplyFeatRadioDropdowns();
}

/**
 * Talent-Waffenmeisterschaft nach asynchronem Options-Rebuild setzen
 * (weaponMastery-feat-* — analog reapplyLevelUpSkilledFeatDropdowns).
 */
function reapplyLevelUpFeatWeaponMasteryDropdowns() {
    if (typeof character === "undefined") return;
    const cf = character.classForm;
    if (!Array.isArray(cf?.feats)) return;

    const recon = (typeof isLevelUpMode === "function" && isLevelUpMode()
        && typeof getLevelUpReconstructionData === "function")
        ? getLevelUpReconstructionData()
        : null;

    cf.feats.forEach(entry => {
        const lvl = parseInt(entry.level, 10);
        if (!lvl) return;

        const fromRecon = recon?.featSelections?.[lvl]
            || recon?.featSelections?.[String(lvl)]
            || {};
        const dynamicChoices = Array.isArray(fromRecon.dynamicChoices) && fromRecon.dynamicChoices.length
            ? fromRecon.dynamicChoices
            : (Array.isArray(entry.dynamicChoices) ? entry.dynamicChoices : []);

        dynamicChoices.forEach(choice => {
            if (!choice?.id || !String(choice.id).startsWith("weaponMastery-feat-")) return;
            const el = document.getElementById(choice.id);
            if (el) levelUpSetSelectValue(el, choice.value);
        });
    });
}

/**
 * Gemeisterte-Werkzeuge-Namen aus Regeldaten (Hintergrund + classForm),
 * analog zu processTools auf dem Bogen.
 * @returns {Set<string>}
 */
function collectMasteredToolNamesFromRuleData(snapshotBase, classForm) {
    const collected = new Set();
    const lang = (typeof currentLang !== "undefined" && currentLang)
        ? currentLang
        : ((typeof currentLanguage !== "undefined" && currentLanguage) ? currentLanguage : "de");
    const t = (typeof translations !== "undefined" && translations[lang]) ? translations[lang] : {};

    const safeParse = (val, fallback) => {
        if (val == null || val === "" || val === "null") return fallback;
        if (typeof val === "object") return val;
        try { return JSON.parse(val); } catch (e) { return fallback; }
    };

    const addById = (ids, listType) => {
        if (ids == null) return;
        const idArray = Array.isArray(ids) ? ids : [ids];
        idArray.forEach(rawId => {
            const id = parseInt(rawId, 10);
            if (!Number.isFinite(id) || id === 0) return;

            let item = null;
            if (listType === 1 && typeof toolList !== "undefined") {
                item = toolList.find(tool => tool.ID === id);
            } else if (listType === 2 && typeof instrumentList !== "undefined") {
                item = instrumentList.find(inst => inst.instrumentCategoryNumber === id);
            } else if (listType === 3 && typeof gameList !== "undefined") {
                item = gameList.find(game => game.gameCategoryNumber === id);
            }

            if (item?.translationLabel) {
                collected.add(t[item.translationLabel] || item.translationLabel);
            }
        });
    };

    const base = snapshotBase || {};
    addById(safeParse(base.tool_background, null), 1);
    addById(safeParse(base.instrument_background, null), 2);
    addById(safeParse(base.game_background, null), 3);

    if (classForm && typeof classForm === "object") {
        addById(classForm.tools, 1);
        addById(classForm.instruments, 2);
        addById(classForm.games, 3);
    }

    return collected;
}

/** Gemeisterte Werkzeuge-Text aus Regeldaten (wie processTools auf dem Bogen). */
function buildMasteredToolsTextFromRuleData(snapshotBase, classForm) {
    return Array.from(collectMasteredToolNamesFromRuleData(snapshotBase, classForm))
        .sort()
        .join(", ");
}

/**
 * Manuelle masteredTools-Overrides behalten; nur seit Einstiegsstufe
 * neu gewährte Werkzeuge ergänzen (analog Fertigkeits-/Rüstungs-Checkboxen).
 */
function mergeMasteredToolsTextPreservingManual(previousText, entryNames, newNames) {
    const entrySet = entryNames instanceof Set ? entryNames : new Set(entryNames || []);
    const newSet = newNames instanceof Set ? newNames : new Set(newNames || []);
    const newlyGranted = [];
    newSet.forEach(name => {
        if (!entrySet.has(name)) newlyGranted.push(name);
    });

    if (previousText === undefined || previousText === null) {
        return Array.from(newSet).sort().join(", ");
    }

    const merged = new Set(
        String(previousText)
            .split(",")
            .map(part => part.trim())
            .filter(Boolean)
    );
    newlyGranted.forEach(name => merged.add(name));
    return Array.from(merged).sort().join(", ");
}

/** Waffenmeisterschaften-Text für Bogen-Overrides (wie processClassBasics). */
function buildWeaponMasteriesTextFromClassForm(classForm) {
    if (!classForm || !Array.isArray(classForm.weaponMastery) || !classForm.weaponMastery.length) {
        return "";
    }
    if (typeof weaponList === "undefined" || typeof weaponMastery === "undefined") return "";

    const lang = (typeof currentLang !== "undefined" && currentLang)
        ? currentLang
        : ((typeof currentLanguage !== "undefined" && currentLanguage) ? currentLanguage : "de");
    const t = (typeof translations !== "undefined" && translations[lang]) ? translations[lang] : {};
    const entries = [];

    classForm.weaponMastery.forEach(idRaw => {
        const weaponId = parseInt(idRaw, 10);
        if (!Number.isFinite(weaponId)) return;
        const weaponObj = weaponList.find(w => w.ID === weaponId);
        if (!weaponObj?.weaponMasteryCategoryNumber) return;
        const masteryDef = weaponMastery.find(
            m => m.weaponMasteryCategoryNumber === weaponObj.weaponMasteryCategoryNumber
        );
        if (!masteryDef) return;
        const weaponName = t[weaponObj.translationLabel] || weaponObj.translationLabel;
        const masteryName = t[masteryDef.translationLabel] || masteryDef.translationLabel;
        entries.push(`${weaponName} (${masteryName})`);
    });

    return entries.join(", ");
}

/**
 * Sprach-IDs aus Schritt-9 (languages) + classForm.languages kombinieren (dedupliziert).
 * @param {object} snapshotBase
 * @param {object} classForm
 * @returns {Array<string|number>}
 */
function collectLanguageIdsFromRuleData(snapshotBase, classForm) {
    const safeParse = (val, fallback) => {
        if (val == null || val === "" || val === "null") return fallback;
        if (typeof val === "object") return val;
        try { return JSON.parse(val); } catch (e) { return fallback; }
    };

    let ids = safeParse(snapshotBase?.languages, [1]);
    if (!Array.isArray(ids)) ids = [ids];

    if (classForm && classForm.languages) {
        const classLangs = Array.isArray(classForm.languages) ? classForm.languages : [classForm.languages];
        ids = ids.concat(classLangs);
    }

    const seen = new Set();
    const out = [];
    ids.forEach(id => {
        const key = String(id);
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(id);
    });
    return out;
}

/** Sprachenliste für Bogen-Overrides (wie processStoryAndAlignment auf dem Bogen). */
function buildLanguagesListTextFromRuleData(snapshotBase, classForm) {
    if (typeof languageList === "undefined") return "";

    const lang = (typeof currentLang !== "undefined" && currentLang)
        ? currentLang
        : ((typeof currentLanguage !== "undefined" && currentLanguage) ? currentLanguage : "de");
    const t = (typeof translations !== "undefined" && translations[lang]) ? translations[lang] : {};

    const translated = collectLanguageIdsFromRuleData(snapshotBase, classForm).map(id => {
        const langData = languageList.find(l => l.languageCategoryNumber == id || l.translationLabel == id);
        if (langData) return t[langData.translationLabel] || langData.translationLabel;
        return t[id] || id;
    }).filter(Boolean);

    return translated.length > 0 ? translated.join(", ") : "";
}

/**
 * Skill-Checkboxen in overrides an classForm.skills angleichen.
 * Manuell auf dem Bogen aktivierte Fertigkeiten (nicht in classForm) bleiben erhalten.
 * @param {object} overrides
 * @param {object} classForm
 * @param {object} [previousCheckboxes] – Snapshot vor dem Sync (für manuelle Bogen-Toggles)
 */
function syncLevelUpSkillCheckboxesInOverrides(overrides, classForm, previousCheckboxes) {
    if (!overrides.checkboxes) overrides.checkboxes = {};
    if (typeof skillList === "undefined" || !Array.isArray(skillList)) return;

    const trained = new Set((classForm?.skills || []).map(id => String(id)));
    // Barbar Urwissen: eigener Slot, nicht Teil des skills-Arrays
    if (classForm?.primalKnowledgeSkill) {
        trained.add(String(classForm.primalKnowledgeSkill));
    }
    const prev = previousCheckboxes && typeof previousCheckboxes === "object"
        ? previousCheckboxes
        : {};

    skillList.forEach(skill => {
        const checkboxId = `${skill.translationLabel}Trained`;
        const skillId = String(skill.skillCategoryNumber);
        const fromRules = trained.has(skillId);
        if (fromRules) {
            overrides.checkboxes[checkboxId] = true;
        } else if (prev[checkboxId] === true) {
            // Manuell auf dem Bogen aktiviert (z. B. Täuschen per Checkbox)
            overrides.checkboxes[checkboxId] = true;
        } else {
            overrides.checkboxes[checkboxId] = false;
        }
    });
}

const LEVEL_UP_SAVING_THROW_CHECKBOX_IDS = [
    "strengthSavingTrained",
    "dexteritySavingTrained",
    "constitutionSavingTrained",
    "intelligenceSavingTrained",
    "wisdomSavingTrained",
    "charismaSavingTrained"
];

/** Kontext für Custom-Class-Grants (Rettungswürfe) wie auf dem Bogen. */
function buildLevelUpCharDataForCustomGrants(character, snapshotBase) {
    const classForm = character?.classForm || safeParseJson(snapshotBase?.classForm, {});
    const className = character?.class || snapshotBase?.class || "";
    const level = character?.level || snapshotBase?.level || 1;
    return {
        basic: { class: className, level },
        class: className,
        level,
        classForm
    };
}

/** Proficiente Rettungswurf-Checkbox-IDs (Spiegel von activateSavingThrows). */
function collectLevelUpProficientSavingThrowCheckboxIds(className, classForm, charData) {
    const ids = new Set();
    const addFromLabel = (attrLabel) => {
        if (!attrLabel) return;
        ids.add(`${String(attrLabel).replace("Label", "")}SavingTrained`);
    };

    if (className && typeof classCoreTraitsList !== "undefined") {
        const classData = classCoreTraitsList.find(c =>
            c.translationLabel.toLowerCase() === String(className).toLowerCase()
        );
        if (classData?.savingThrowProficiencies) {
            classData.savingThrowProficiencies.forEach(addFromLabel);
        }
    }

    const extra = classForm?.attributes;
    const values = Array.isArray(extra) ? extra : (extra ? [extra] : []);
    values.forEach(val => {
        let attrKey = "";
        if (!isNaN(val) && typeof attributeList !== "undefined") {
            const attrData = attributeList.find(a => a.ID == val || a.id == val);
            if (attrData) attrKey = attrData.translationLabel;
        } else if (val) {
            attrKey = String(val);
        }
        addFromLabel(attrKey);
    });

    if (typeof getGrantedCustomClassSavingThrowLabels === "function") {
        getGrantedCustomClassSavingThrowLabels(charData).forEach(addFromLabel);
    }

    // Mönch L14+: Disciplined Survivor — Übung in allen Rettungswürfen
    const level = parseInt(charData?.basic?.level ?? charData?.level, 10) || 1;
    if (String(className || "").toLowerCase() === "monk" && level >= 14) {
        if (typeof attributeList !== "undefined") {
            attributeList.forEach(attr => addFromLabel(attr.translationLabel));
        }
    }

    return ids;
}

/** Rettungswurf-Checkboxen in overrides an Klassen-/Form-Regeln angleichen. */
function syncLevelUpSavingThrowCheckboxesInOverrides(overrides, character, snapshotBase) {
    if (!overrides.checkboxes) overrides.checkboxes = {};
    const className = character?.class || snapshotBase?.class;
    const classForm = character?.classForm || safeParseJson(snapshotBase?.classForm, {});
    const charData = buildLevelUpCharDataForCustomGrants(character, snapshotBase);
    const proficient = collectLevelUpProficientSavingThrowCheckboxIds(className, classForm, charData);

    LEVEL_UP_SAVING_THROW_CHECKBOX_IDS.forEach(checkboxId => {
        overrides.checkboxes[checkboxId] = proficient.has(checkboxId);
    });
}

/**
 * Level-Up: Fertigkeiten/Werkzeuge aus dem Einstiegs-Snapshot behalten, die in Schritt 2
 * (Hintergrund-Fertigkeiten, Begabt u. a.) gewählt wurden und in Schritt 6 nicht im DOM stehen.
 * saveClassForm sammelt sonst nur Schritt-6-Selects und löscht die Hintergrund-Anteile.
 */
function mergeLevelUpPreservedClassFormProficiencies(
    selectedSkills,
    selectedTools,
    selectedInstruments,
    selectedGames
) {
    if (!isLevelUpMode()) return;

    const snap = getLevelUpSnapshot();
    let prev = null;
    try {
        const raw = snap?.base?.classForm;
        if (raw == null || raw === "" || raw === "null") return;
        prev = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
        return;
    }
    if (!prev || typeof prev !== "object") return;

    const mergeIds = (target, source) => {
        if (!Array.isArray(target) || !Array.isArray(source)) return;
        source.forEach(rawId => {
            const v = String(rawId ?? "").trim();
            if (!v || v === "0" || v === "null") return;
            if (!target.includes(v)) target.push(v);
        });
    };

    mergeIds(selectedSkills, prev.skills);
    mergeIds(selectedTools, prev.tools);
    mergeIds(selectedInstruments, prev.instruments);
    mergeIds(selectedGames, prev.games);
}

/**
 * Snapshot-classForm für Level-Up-Preservation (spellLists etc.).
 */
function getLevelUpSnapshotClassForm() {
    if (!isLevelUpMode()) return null;
    const snap = getLevelUpSnapshot();
    try {
        const raw = snap?.base?.classForm;
        if (raw == null || raw === "" || raw === "null") {
            return (typeof character !== "undefined" && character.classForm) ? character.classForm : null;
        }
        return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
        return (typeof character !== "undefined" && character.classForm) ? character.classForm : null;
    }
}

/**
 * Anzahl Magic-Initiate aus Hintergrund + Volk (vor Klassen-Talenten in Schritt 6).
 * Entspricht dem Prefix von spellListIndex / classForm.spellLists.
 */
function countLevelUpPreClassMagicInitiateSlots(charRef) {
    const ch = charRef || (typeof character !== "undefined" ? character : null);
    if (!ch) return 0;
    let n = 0;
    const bgFeatId = parseInt(ch.feat_background, 10);
    const bgFeat = (!isNaN(bgFeatId) && typeof featList !== "undefined")
        ? featList.find(f => f.ID === bgFeatId)
        : null;
    if (bgFeat?.translationLabel === "magicInitiateLabel") n++;

    const speciesFeatIds = (typeof normalizeFeatSpeciesIds === "function")
        ? normalizeFeatSpeciesIds(ch.feat_species)
        : [];
    speciesFeatIds.forEach(id => {
        const f = (typeof featList !== "undefined") ? featList.find(x => x.ID === id) : null;
        if (f?.translationLabel === "magicInitiateLabel") n++;
    });
    return n;
}

/**
 * Level-Up: Magic-Initiate-Zauberlisten rekonstruieren.
 * Hintergrund/Volk fehlen oft im DOM → Snapshot-Prefix behalten;
 * Schritt-6-Dropdowns (falls vorhanden) als Suffix übernehmen.
 */
function mergeLevelUpPreservedSpellListFields(selectedSpellLists, selectedSpellcastingAbilities) {
    if (!isLevelUpMode()) return;
    const prev = getLevelUpSnapshotClassForm();
    if (!prev || typeof prev !== "object") return;

    const preClassSlots = countLevelUpPreClassMagicInitiateSlots(
        typeof character !== "undefined" ? character : null
    );
    const prevLists = Array.isArray(prev.spellLists) ? prev.spellLists.map(String) : [];
    const domLists = Array.isArray(selectedSpellLists) ? selectedSpellLists.slice() : [];

    if (prevLists.length || domLists.length) {
        const fromPreClass = prevLists.slice(0, preClassSlots);
        // DOM im Level-Up: typischerweise nur Schritt-6-Selects; sonst voller Snapshot
        let fromClass = domLists;
        if (!domLists.length && prevLists.length > preClassSlots) {
            fromClass = prevLists.slice(preClassSlots);
        } else if (domLists.length && preClassSlots > 0 && prevLists.length >= preClassSlots) {
            // DOM hat Werte, aber BG/Volk-Prefix muss davor
            fromClass = domLists;
        } else if (!domLists.length) {
            fromClass = prevLists.slice(preClassSlots);
        }

        selectedSpellLists.length = 0;
        fromPreClass.forEach(v => {
            if (v != null && String(v).trim() !== "" && String(v) !== "0") {
                selectedSpellLists.push(String(v));
            }
        });
        fromClass.forEach(v => {
            if (v != null && String(v).trim() !== "" && String(v) !== "0") {
                selectedSpellLists.push(String(v));
            }
        });
        // Fallback: nichts rekonstruiert → kompletter Snapshot
        if (!selectedSpellLists.length && prevLists.length) {
            prevLists.forEach(v => {
                if (v != null && String(v).trim() !== "" && String(v) !== "0") {
                    selectedSpellLists.push(String(v));
                }
            });
        }
    }

    if (Array.isArray(prev.spellcastingAbilities) && prev.spellcastingAbilities.length
        && Array.isArray(selectedSpellcastingAbilities)) {
        const prevAbilities = prev.spellcastingAbilities.map(String);
        const domAbilities = selectedSpellcastingAbilities.slice();
        const fromPreClass = prevAbilities.slice(0, preClassSlots);
        let fromClass = domAbilities.length ? domAbilities : prevAbilities.slice(preClassSlots);
        selectedSpellcastingAbilities.length = 0;
        fromPreClass.forEach(v => {
            if (v != null && String(v).trim() !== "" && String(v) !== "0") {
                selectedSpellcastingAbilities.push(String(v));
            }
        });
        fromClass.forEach(v => {
            if (v != null && String(v).trim() !== "" && String(v) !== "0") {
                selectedSpellcastingAbilities.push(String(v));
            }
        });
        if (!selectedSpellcastingAbilities.length && prevAbilities.length) {
            prevAbilities.forEach(v => {
                if (v != null && String(v).trim() !== "" && String(v) !== "0") {
                    selectedSpellcastingAbilities.push(String(v));
                }
            });
        }
    }
}

/**
 * Level-Up: spellcastingAbility_talent aus Hintergrund/Volk behalten
 * (tempBackgroundSpellcasting ist im Level-Up oft leer).
 * Klassen-Talente aus Schritt-6-Dropdowns werden danach neu erfasst.
 */
function mergeLevelUpPreservedTalentSpellcasting(priorTalentEntries) {
    if (!isLevelUpMode() || typeof character === "undefined") return;
    if (!Array.isArray(priorTalentEntries) || !priorTalentEntries.length) return;

    const bgFeatId = parseInt(character.feat_background, 10);
    const bgFeat = (!isNaN(bgFeatId) && typeof featList !== "undefined")
        ? featList.find(f => f.ID === bgFeatId)
        : null;
    const speciesFeatIds = (typeof normalizeFeatSpeciesIds === "function")
        ? normalizeFeatSpeciesIds(character.feat_species)
        : [];

    const miQueue = priorTalentEntries.filter(e => e && e.talent === "magicInitiateLabel");
    const pushNextMi = () => {
        if (!miQueue.length) return;
        character.spellcastingAbility_talent.push(miQueue.shift());
    };

    if (bgFeat?.translationLabel === "magicInitiateLabel") {
        pushNextMi();
    }
    speciesFeatIds.forEach(id => {
        const f = (typeof featList !== "undefined") ? featList.find(x => x.ID === id) : null;
        if (f?.translationLabel === "magicInitiateLabel") pushNextMi();
    });

    // Andere Talent-Zauberattribute (Touched etc.) aus BG/Volk — nicht aus Klassen-Dropdowns
    priorTalentEntries.forEach(entry => {
        if (!entry || entry.talent === "magicInitiateLabel") return;
        if (bgFeat?.translationLabel === entry.talent) {
            character.spellcastingAbility_talent.push(entry);
            return;
        }
        const fromSpecies = speciesFeatIds.some(id => {
            const f = (typeof featList !== "undefined") ? featList.find(x => x.ID === id) : null;
            return f?.translationLabel === entry.talent;
        });
        if (fromSpecies) character.spellcastingAbility_talent.push(entry);
    });
}

/**
 * Level-Up: classForm.spellLists aus Talent/Hintergrund nachziehen, falls leer.
 * Damit Magic-Initiate in Schritt 7 die Druiden-/Kleriker-/Magier-Liste wieder hat.
 */
function ensureLevelUpMagicInitiateSpellLists(charRef) {
    if (!isLevelUpMode() || !charRef) return;
    if (!charRef.classForm || typeof charRef.classForm !== "object") {
        charRef.classForm = {};
    }
    if (!Array.isArray(charRef.classForm.spellLists)) {
        charRef.classForm.spellLists = [];
    }
    if (charRef.classForm.spellLists.length > 0) return;

    const slugToId = (slug) => {
        if (!slug) return null;
        const key = String(slug).replace(/Label$/i, "").toLowerCase();
        const core = (typeof classCoreTraitsList !== "undefined" ? classCoreTraitsList : [])
            .find(c => String(c.translationLabel || "").toLowerCase() === key);
        return core ? String(core.ID) : null;
    };

    const miEntries = (Array.isArray(charRef.spellcastingAbility_talent)
        ? charRef.spellcastingAbility_talent
        : []
    ).filter(e => e && e.talent === "magicInitiateLabel");

    miEntries.forEach(entry => {
        const id = slugToId(entry.spellList);
        if (id) charRef.classForm.spellLists.push(id);
    });
    if (charRef.classForm.spellLists.length > 0) return;

    const bgFeatId = parseInt(charRef.feat_background, 10);
    const bgFeat = (!isNaN(bgFeatId) && typeof featList !== "undefined")
        ? featList.find(f => f.ID === bgFeatId)
        : null;
    if (bgFeat?.translationLabel !== "magicInitiateLabel") return;
    if (typeof resolveBackgroundMagicInitiateSpellListId !== "function") return;

    const bgData = (typeof backgroundList !== "undefined")
        ? backgroundList.find(bg =>
            String(bg.translationLabel || "").toLowerCase() === String(charRef.background || "").toLowerCase()
        )
        : null;
    const listId = resolveBackgroundMagicInitiateSpellListId(charRef.background, bgData);
    if (listId != null) charRef.classForm.spellLists.push(String(listId));
}

/** Checkbox-IDs für Rüstungsvertrautheit (Kategorie → DOM-ID). */
const LEVEL_UP_ARMOR_PROF_CHECKBOX_BY_CAT = {
    1: "lightArmor",
    2: "mediumArmor",
    3: "heavyArmor",
    4: "shieldProf"
};

/** Checkbox-IDs für Waffenvertrautheit (Kategorie → DOM-ID). */
const LEVEL_UP_WEAPON_PROF_CHECKBOX_BY_CAT = {
    1: "simpleMeleeWeapons",
    2: "simpleRangedWeapons",
    3: "martialMeleeWeapons",
    4: "martialRangedWeapons"
};

/** Kategorie-Nummern in ein Set schreiben (Skalar oder Array). */
function levelUpPushProficiencyCategories(targetSet, raw) {
    if (!targetSet || raw == null || raw === 0 || raw === "0") return;
    const list = Array.isArray(raw) ? raw : [raw];
    list.forEach(n => {
        const id = parseInt(n, 10);
        if (Number.isFinite(id) && id > 0) targetSet.add(id);
    });
}

/**
 * Rüstungs-/Waffenkategorien aus Klasse, UC-Merkmalen, Ordnungen und Talenten
 * (Spiegel von processClassBasics + applyClassFeatureLogic + applyTalentFeatureLogic).
 */
function collectLevelUpArmorWeaponCategorySets(character, snapshotBase) {
    const armor = new Set();
    const weapon = new Set();
    if (!character && !snapshotBase) return { armor, weapon };

    const className = character?.class || snapshotBase?.class || "";
    const level = parseInt(character?.level ?? snapshotBase?.level, 10) || 1;
    const classForm = character?.classForm || safeParseJson(snapshotBase?.classForm, {}) || {};
    const classKey = String(className).toLowerCase().trim();

    // 1) Klassen-Kernmerkmale (Tab 1)
    let classData = null;
    if (typeof classCoreTraitsList !== "undefined" && Array.isArray(classCoreTraitsList)) {
        classData = classCoreTraitsList.find(c =>
            String(c.translationLabel || "").toLowerCase() === classKey
        );
    }
    if (!classData && typeof getRegisteredCustomClassBundle === "function") {
        const bundle = getRegisteredCustomClassBundle(className);
        if (bundle?.coreTraits) classData = bundle.coreTraits;
    }
    if (classData) {
        levelUpPushProficiencyCategories(armor, classData.armorCategoryNumber);
        levelUpPushProficiencyCategories(weapon, classData.weaponCategoryNumber);
    }

    // 2) Custom Class/UC: Einfach→Rüstungs-/Waffenvertrautheit
    const grantCharData = {
        basic: { class: className, level },
        classForm,
        level,
        class: className
    };
    if (typeof getGrantedCustomClassArmorCategoryNumbers === "function") {
        levelUpPushProficiencyCategories(
            armor,
            getGrantedCustomClassArmorCategoryNumbers(grantCharData)
        );
    }
    if (typeof getGrantedCustomClassWeaponCategoryNumbers === "function") {
        levelUpPushProficiencyCategories(
            weapon,
            getGrantedCustomClassWeaponCategoryNumbers(grantCharData)
        );
    }

    // 3) Göttliche / Primäre Ordnung (Kleriker / Druide)
    if (classForm.divineOrders != null && classForm.divineOrders !== ""
        && typeof divineOrderCategoryList !== "undefined") {
        const orderId = parseInt(
            Array.isArray(classForm.divineOrders) ? classForm.divineOrders[0] : classForm.divineOrders,
            10
        );
        const orderData = divineOrderCategoryList.find(o => o.divineOrderCategoryNumber === orderId);
        if (orderData) {
            levelUpPushProficiencyCategories(armor, orderData.Get_armorCategoryNumber);
            levelUpPushProficiencyCategories(weapon, orderData.Get_weaponCategoryNumber);
        }
    }
    if (classForm.primalOrders != null && classForm.primalOrders !== ""
        && typeof primalOrderCategoryList !== "undefined") {
        const orderId = parseInt(
            Array.isArray(classForm.primalOrders) ? classForm.primalOrders[0] : classForm.primalOrders,
            10
        );
        const orderData = primalOrderCategoryList.find(o => o.primalOrderCategoryNumber === orderId);
        if (orderData) {
            levelUpPushProficiencyCategories(armor, orderData.Get_armorCategoryNumber);
            levelUpPushProficiencyCategories(weapon, orderData.Get_weaponCategoryNumber);
        }
    }

    // 4) Talente (Hintergrund, Spezies, Klasse)
    const featIds = new Set();
    const bgFeat = character?.feat_background ?? snapshotBase?.feat_background;
    if (bgFeat != null && bgFeat !== "" && bgFeat !== "null") {
        const n = parseInt(bgFeat, 10);
        if (Number.isFinite(n) && n > 0) featIds.add(n);
    }
    const speciesRaw = character?.feat_species ?? snapshotBase?.feat_species;
    const speciesParsed = typeof speciesRaw === "string"
        ? safeParseJson(speciesRaw, speciesRaw)
        : speciesRaw;
    const speciesListIds = Array.isArray(speciesParsed)
        ? speciesParsed
        : (speciesParsed != null && speciesParsed !== "" ? [speciesParsed] : []);
    speciesListIds.forEach(id => {
        const n = parseInt(id, 10);
        if (Number.isFinite(n) && n > 0) featIds.add(n);
    });
    if (Array.isArray(classForm.feats)) {
        classForm.feats.forEach(entry => {
            const n = parseInt(entry?.feat, 10);
            if (Number.isFinite(n) && n > 0) featIds.add(n);
        });
    }
    if (typeof featList !== "undefined" && Array.isArray(featList)) {
        featIds.forEach(featId => {
            const featData = featList.find(f => f.ID === featId);
            if (!featData) return;
            levelUpPushProficiencyCategories(armor, featData.Get_armorCategoryNumber);
            levelUpPushProficiencyCategories(weapon, featData.Get_weaponCategoryNumber);
        });
    }

    return { armor, weapon };
}

/** Regel-Vertrautheiten zu einer bestimmten Stufe (Snapshot-Basis, ohne Level-Up-Zielstufe). */
function collectLevelUpArmorWeaponCategorySetsAtLevel(snapshotBase, level) {
    const lvl = parseInt(level, 10);
    const classForm = safeParseJson(snapshotBase?.classForm, {});
    const ref = {
        class: snapshotBase?.class || "",
        level: Number.isFinite(lvl) && lvl >= 1 ? lvl : 1,
        classForm,
        feat_background: snapshotBase?.feat_background,
        feat_species: snapshotBase?.feat_species
    };
    return collectLevelUpArmorWeaponCategorySets(ref, snapshotBase);
}

/**
 * Rüstungs-/Waffen-Checkboxen: Bogenzustand behalten, nur neu gewährte Regel-Vertrautheit aktivieren.
 * @param {number} entryLevel – Stufe vor dem Stufenaufstieg
 */
function syncLevelUpArmorWeaponProficiencyCheckboxesInOverrides(
    overrides,
    character,
    snapshotBase,
    previousCheckboxes,
    entryLevel
) {
    if (!overrides.checkboxes) overrides.checkboxes = {};
    const prev = previousCheckboxes && typeof previousCheckboxes === "object"
        ? previousCheckboxes
        : {};

    const entryLvl = parseInt(entryLevel, 10)
        || parseInt(snapshotBase?.ruleLevel || snapshotBase?.level, 10)
        || 1;
    const newRules = collectLevelUpArmorWeaponCategorySets(character, snapshotBase);
    const entryRules = collectLevelUpArmorWeaponCategorySetsAtLevel(snapshotBase, entryLvl);

    const mergeCategory = (catMap, newSet, entrySet) => {
        Object.keys(catMap).forEach(catKey => {
            const cat = parseInt(catKey, 10);
            const id = catMap[cat];
            const newlyGranted = newSet.has(cat) && !entrySet.has(cat);
            if (newlyGranted) {
                overrides.checkboxes[id] = true;
            } else if (Object.prototype.hasOwnProperty.call(prev, id)) {
                overrides.checkboxes[id] = !!prev[id];
            } else {
                overrides.checkboxes[id] = newSet.has(cat);
            }
        });
    };

    mergeCategory(LEVEL_UP_ARMOR_PROF_CHECKBOX_BY_CAT, newRules.armor, entryRules.armor);
    mergeCategory(LEVEL_UP_WEAPON_PROF_CHECKBOX_BY_CAT, newRules.weapon, entryRules.weapon);
}

/**
 * Nach Level-Up: Overrides für regelbasierte Bogenfelder aus classForm/Character syncen
 * (verhindert, dass alte Snapshot-Overrides neue Fertigkeiten/Werkzeuge überschreiben).
 */
function syncLevelUpOverridesFromRuleData(overrides, character, snapshotBase, entryLevel) {
    const o = overrides && typeof overrides === "object" ? overrides : {};
    if (!character) return o;

    o.inputs = Object.assign({}, o.inputs || {});
    o.checkboxes = Object.assign({}, o.checkboxes || {});

    const classForm = character.classForm || safeParseJson(snapshotBase?.classForm, {});
    const originalCheckboxes = Object.assign({}, o.checkboxes);
    const entryLvl = parseInt(entryLevel, 10)
        || parseInt(snapshotBase?.ruleLevel || snapshotBase?.level, 10)
        || 1;

    const prevSkillCheckboxes = Object.assign({}, o.checkboxes || {});
    syncLevelUpSkillCheckboxesInOverrides(o, classForm, prevSkillCheckboxes);
    syncLevelUpSubclassDisplayInOverrides(o, character, classForm);
    syncLevelUpSavingThrowCheckboxesInOverrides(o, character, snapshotBase);
    syncLevelUpArmorWeaponProficiencyCheckboxesInOverrides(
        o, character, snapshotBase, originalCheckboxes, entryLvl
    );

    // Gemeisterte Werkzeuge: manuelle Entfernungen behalten; nur neu gewährte ergänzen
    const entryClassForm = safeParseJson(snapshotBase?.classForm, {}) || {};
    const entryToolNames = collectMasteredToolNamesFromRuleData(snapshotBase, entryClassForm);
    const newToolNames = collectMasteredToolNamesFromRuleData(snapshotBase, classForm);
    const hadManualToolsOverride = Object.prototype.hasOwnProperty.call(o.inputs, "masteredTools");
    const previousToolsText = hadManualToolsOverride ? o.inputs.masteredTools : undefined;
    const masteredToolsText = mergeMasteredToolsTextPreservingManual(
        previousToolsText,
        entryToolNames,
        newToolNames
    );
    if (hadManualToolsOverride || masteredToolsText) {
        o.inputs.masteredTools = masteredToolsText;
    }

    const weaponMasteriesText = buildWeaponMasteriesTextFromClassForm(classForm);
    if (weaponMasteriesText) {
        o.inputs.weaponMasteries = weaponMasteriesText;
    }

    // Sprachen: classForm.languages (z. B. Waldläufer Geschickte Erkundung) in Override übernehmen
    const languagesText = buildLanguagesListTextFromRuleData(snapshotBase, classForm);
    if (languagesText) {
        o.inputs.languagesList = languagesText;
    }

    return o;
}

function isLevelUpMode() {
    try {
        return sessionStorage.getItem(DC_CREATOR_MODE_KEY) === DC_CREATOR_MODE_LEVEL_UP;
    } catch (e) {
        return false;
    }
}

/** Creator-Start: Custom-Runtime-Reset überspringen (Hydration aus Snapshot). */
function shouldSkipCreatorRuntimeResetForLevelUp() {
    return isLevelUpMode();
}

function getLevelUpSnapshot() {
    if (dcLevelUpSnapshotCache) return dcLevelUpSnapshotCache;
    try {
        const raw = sessionStorage.getItem(DC_LEVEL_UP_SESSION_KEY);
        if (!raw) return null;
        dcLevelUpSnapshotCache = JSON.parse(raw);
        return dcLevelUpSnapshotCache;
    } catch (e) {
        console.warn("Level-Up-Snapshot lesen fehlgeschlagen:", e);
        return null;
    }
}

function getLevelUpEntryLevel() {
    const snap = getLevelUpSnapshot();
    const n = parseInt(snap?.entryLevel, 10);
    return Number.isFinite(n) && n >= 1 ? n : 1;
}

function getLevelUpTargetLevel() {
    if (dcLevelUpTargetLevel != null) return dcLevelUpTargetLevel;
    const snap = getLevelUpSnapshot();
    const fromSnap = parseInt(snap?.targetLevel, 10);
    if (Number.isFinite(fromSnap) && fromSnap >= getLevelUpEntryLevel()) {
        dcLevelUpTargetLevel = fromSnap;
        return dcLevelUpTargetLevel;
    }
    dcLevelUpTargetLevel = getLevelUpEntryLevel();
    return dcLevelUpTargetLevel;
}

function setLevelUpTargetLevel(level) {
    const entry = getLevelUpEntryLevel();
    const n = parseInt(level, 10);
    dcLevelUpTargetLevel = Number.isFinite(n) ? Math.max(entry, Math.min(20, n)) : entry;
    const snap = getLevelUpSnapshot();
    if (snap) {
        snap.targetLevel = dcLevelUpTargetLevel;
        try {
            sessionStorage.setItem(DC_LEVEL_UP_SESSION_KEY, JSON.stringify(snap));
        } catch (e) { /* ignore */ }
    }
}

function safeParseJson(val, fallback) {
    if (val == null || val === "") return fallback;
    try { return JSON.parse(val); } catch (e) { return fallback; }
}

function parseFeatSpeciesIds(raw) {
    if (raw == null || raw === "") return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map(id => parseInt(id, 10)).filter(n => !isNaN(n) && n > 0);
        }
        const n = parseInt(parsed, 10);
        return (!isNaN(n) && n > 0) ? [n] : [];
    } catch (e) {
        const n = parseInt(raw, 10);
        return (!isNaN(n) && n > 0) ? [n] : [];
    }
}

/**
 * Gesperrte Custom-/PHB-IDs für Bib-Schutz (Option B: nur bereits gewählte Einträge).
 */
function computeLevelUpLockedContent(base) {
    const lockedSpellIds = new Set();
    const lockedFeatIds = new Set();

    const addSpellId = (id) => {
        const n = parseInt(id, 10);
        if (!isNaN(n) && n > 0) lockedSpellIds.add(n);
    };

    safeParseJson(base.cantrips, []).forEach(entry => {
        if (entry && entry.spellId != null) addSpellId(entry.spellId);
    });
    safeParseJson(base.preparedSpells, []).forEach(entry => {
        if (entry && entry.spellId != null) addSpellId(entry.spellId);
    });
    safeParseJson(base.favoredSpells, []).forEach(entry => {
        if (entry && entry.spellId != null) addSpellId(entry.spellId);
    });
    safeParseJson(base.spellbookSpells, []).forEach(id => addSpellId(id));

    const classForm = safeParseJson(base.classForm, {});
    (classForm.feats || []).forEach(entry => {
        if (entry && entry.feat != null) {
            const n = parseInt(entry.feat, 10);
            if (!isNaN(n) && n > 0) lockedFeatIds.add(n);
        }
    });

    const bgFeat = parseInt(base.feat_background, 10);
    if (!isNaN(bgFeat) && bgFeat > 0) lockedFeatIds.add(bgFeat);

    parseFeatSpeciesIds(base.feat_species).forEach(id => lockedFeatIds.add(id));

    return {
        spellIds: Array.from(lockedSpellIds),
        featIds: Array.from(lockedFeatIds),
        subclassSlug: classForm.subclass != null ? String(classForm.subclass) : null
    };
}

/**
 * Regel-Stufe aus Export-/Snapshot-Basis (stumm, autoritativ für Stufenaufstieg).
 * Legacy-Bögen ohne ruleLevel: fallback auf base.level.
 */
function resolveRuleLevelFromBase(base) {
    const rule = parseInt(base?.ruleLevel, 10);
    if (Number.isFinite(rule) && rule >= 1 && rule <= 20) return rule;
    const legacy = parseInt(base?.level, 10);
    if (Number.isFinite(legacy) && legacy >= 1 && legacy <= 20) return legacy;
    return 1;
}

/** Regel-Stufe aus LocalStorage (nur Ersteller/Stufenaufstieg ändert sie). */
function getSheetRuleLevel() {
    if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem("ruleLevel");
        if (raw != null && String(raw).trim() !== "") {
            const n = parseInt(raw, 10);
            if (Number.isFinite(n) && n >= 1) return Math.min(20, n);
        }
        const legacy = parseInt(localStorage.getItem("level"), 10);
        if (Number.isFinite(legacy) && legacy >= 1) return Math.min(20, legacy);
    }
    return 1;
}

function buildLevelUpSnapshotFromSheet() {
    let exportRaw = null;
    if (typeof buildCharacterSheetExportPayload === "function") {
        exportRaw = buildCharacterSheetExportPayload();
    } else {
        const base = {};
        LEVEL_UP_BASE_STORAGE_KEYS.forEach(key => {
            base[key] = localStorage.getItem(key);
        });
        exportRaw = {
            meta: { app: "DiceCharacters", date: new Date().toISOString(), version: "1.5" },
            base,
            overrides: {}
        };
    }

    const flatPayload = (exportRaw?.payload?.base)
        ? exportRaw.payload
        : exportRaw;
    const dcEnvelope = exportRaw?.dc || exportRaw?.envelope || null;

    const entryLevel = resolveRuleLevelFromBase(flatPayload.base || {});
    const lockedContent = computeLevelUpLockedContent(flatPayload.base || {});

    // Manuelle Bogen-Attribute (overrides) in Snapshot-Basis spiegeln
    applySnapshotOverrideScoresToBaseAndCharacter({
        base: flatPayload.base || {},
        overrides: flatPayload.overrides || {}
    });

    return {
        meta: Object.assign({}, flatPayload.meta || {}, {
            app: "DiceCharacters",
            mode: DC_CREATOR_MODE_LEVEL_UP,
            date: new Date().toISOString()
        }),
        entryLevel,
        targetLevel: entryLevel,
        base: flatPayload.base || {},
        overrides: flatPayload.overrides || {},
        lockedContent,
        dcEnvelope
    };
}

function formatLevelUpBackupDate() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const monthArr = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const month = monthArr[d.getMonth()];
    const year = d.getFullYear();
    return `${day}${month}${year}`;
}

function downloadJsonFile(filename, dataObj) {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadLevelUpBackup(snapshot) {
    // Identischer Export wie der Download-Button
    if (typeof exportCharacterJSON === "function") {
        exportCharacterJSON();
        return;
    }
    // Fallback (falls Export-API fehlt)
    const exportBody = {
        meta: snapshot.meta,
        base: snapshot.base,
        overrides: snapshot.overrides
    };
    if (snapshot.dcEnvelope) {
        exportBody.dc = snapshot.dcEnvelope;
    }
    const nameRaw = snapshot?.base?.characterName || "Unnamed";
    let safeName = String(nameRaw).trim().replace(/[\\/:*?"<>|;,]/g, "_");
    if (!safeName) safeName = "Unnamed";
    const level = snapshot?.entryLevel ?? 1;
    const filename = `${safeName}_L${level}_Character_Data_${formatLevelUpBackupDate()}.json`;
    downloadJsonFile(filename, exportBody);
}

/**
 * Werkbank: Stufenaufstieg starten (normaler JSON-Export + Session + Redirect).
 */
function startLevelUpFromSheet() {
    if (typeof isCharacterSheetLevelUpAllowed === "function" && !isCharacterSheetLevelUpAllowed()) {
        return;
    }

    let level = getSheetRuleLevel();
    if (!Number.isFinite(level) || level < 1) level = 1;
    if (level >= 20) return;

    const msg = tLevelUp(
        "levelUpStartConfirmLabel",
        "Durch einen Stufenaufstieg werden manuelle Eingaben auf Seite 3 \"KLASSENMERKMALE & TALENTE\" überschrieben. Manuell angepasste Stufen werden zurückgesetzt. Vor dem Stufenaufstieg wird automatisch eine JSON-Datei als Backup erstellt. Fortfahren?"
    );
    if (!confirm(msg)) return;

    // 1) Identischer Export wie „Herunterladen“
    if (typeof exportCharacterJSON === "function") {
        exportCharacterJSON();
    }

    // 2) Snapshot für Level-Up-Session (gleiche Datenbasis wie Export)
    const snapshot = buildLevelUpSnapshotFromSheet();

    dcLevelUpSnapshotCache = snapshot;
    dcLevelUpTargetLevel = snapshot.entryLevel;

    try {
        sessionStorage.setItem(DC_LEVEL_UP_SESSION_KEY, JSON.stringify(snapshot));
        sessionStorage.setItem(DC_CREATOR_MODE_KEY, DC_CREATOR_MODE_LEVEL_UP);
    } catch (e) {
        alert("Snapshot konnte nicht gespeichert werden.");
        console.error(e);
        return;
    }

    window.location.href = "charaktererstellung.html";
}

function writeLevelUpSnapshotBaseToLocalStorage(snapshot) {
    if (!snapshot?.base) return;
    Object.keys(snapshot.base).forEach(key => {
        const val = snapshot.base[key];
        if (val !== null && val !== undefined) {
            localStorage.setItem(key, val);
        }
    });
    if (snapshot.dcEnvelope?.packageId) {
        localStorage.setItem("dcCharacterPackageId", snapshot.dcEnvelope.packageId);
        if (snapshot.dcEnvelope.createdAt) {
            localStorage.setItem("dcCharacterPackageCreatedAt", snapshot.dcEnvelope.createdAt);
        }
    }
}

/** character-Objekt aus Snapshot-Basis befüllen (Schritte 1–4 read-only im Hintergrund). */
function hydrateCharacterFromLevelUpSnapshot(snapshot) {
    if (typeof character === "undefined" || !snapshot?.base) return;

    const b = snapshot.base;
    const classForm = safeParseJson(b.classForm, {});

    character.class = b.class || null;
    character.background = b.background || null;
    character.feat_background = b.feat_background ? parseInt(b.feat_background, 10) : null;
    character.tool_background = safeParseJson(b.tool_background, b.tool_background);
    character.instrument_background = safeParseJson(b.instrument_background, b.instrument_background);
    character.game_background = safeParseJson(b.game_background, b.game_background);
    character.backgroundAttributeBonuses = safeParseJson(b.backgroundAttributeBonuses, {}) || {};
    // Stumme Rekonstruktionsdaten (nur Level-Up; Bogen zeigt sie nicht)
    character.levelUpReconstruction = safeParseJson(b.levelUpReconstruction, null);
    character.species = b.species || null;
    character.lineage = b.lineage || null;
    character.ancestry = b.ancestry || null;
    character.spellcastingAbility_species = b.spellcastingAbility_species || null;
    character.feat_species = parseFeatSpeciesIds(b.feat_species);
    character.speciesFreeChoices = safeParseJson(b.speciesFreeChoices, []);
    character.strengthTotalScore = parseInt(b.strengthScore, 10) || 10;
    character.dexterityTotalScore = parseInt(b.dexterityScore, 10) || 10;
    character.constitutionTotalScore = parseInt(b.constitutionScore, 10) || 10;
    character.intelligenceTotalScore = parseInt(b.intelligenceScore, 10) || 10;
    character.wisdomTotalScore = parseInt(b.wisdomScore, 10) || 10;
    character.charismaTotalScore = parseInt(b.charismaScore, 10) || 10;
    character.level = snapshot.entryLevel;
    character.classForm = classForm;
    character.spellcastingAbility_talent = safeParseJson(b.spellcastingAbility_talent, []);
    character.spellbookSpells = safeParseJson(b.spellbookSpells, []);
    character.cantrips = safeParseJson(b.cantrips, []);
    character.spells = safeParseJson(b.preparedSpells, []);
    character.favoredSpells = safeParseJson(b.favoredSpells, []);
    character.equipment = safeParseJson(b.equipment, character.equipment);
    character.purse = safeParseJson(b.purse, character.purse);
    character.story = b.story || "";
    character.languages = safeParseJson(b.languages, [1]);
    character.deityId = b.deityId ? parseInt(b.deityId, 10) : null;
    character.deityName = b.deityName || "";
    character.communityName = b.communityName || "";
    character.communityDesc = b.communityDesc || "";
    character.alignment = b.alignment ? parseInt(b.alignment, 10) : null;
    character.personalityTraits = b.personalityTraits || "";
    character.gender = b.gender || "";
    character.ageLabel = b.age || "";
    character.eyeColor = b.eyeColor || "";
    character.hairColorLabel = b.hairColor || "";
    character.skinToneLabel = b.skinTone || "";
    character.sizeLabel = b.size || "";
    character.appearance = b.appearanceDescription || "";
    character.name = b.characterName || "";

    applySnapshotOverrideScoresToBaseAndCharacter(snapshot);

    if (typeof selectedClassName !== "undefined" && character.class) {
        selectedClassName = character.class;
    }
}

function applyLevelUpModeChrome() {
    document.body.classList.add("level-up-mode");
    ensureLevelUpNewChoiceListeners();

    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) {
        pageTitle.textContent = tLevelUp("levelUpPageTitleLabel", pageTitle.textContent);
    }

    const badge = document.getElementById("levelUpModeBadge");
    if (badge) {
        badge.hidden = false;
        badge.removeAttribute("hidden");
        badge.setAttribute("aria-hidden", "false");
        const labelEl = document.getElementById("levelUpModeBadgeLabel");
        if (labelEl) {
            labelEl.textContent = tLevelUp("levelUpModeBadgeLabel", "Stufenaufstieg");
        }
    }

    // Stepbar: nur 5/6/7, als Schritt 1/2/3 beschriftet (Subtext bleibt Kategorie + Wert)
    const stepChrome = {
        5: {
            btn: tLevelUp("levelUpStepBtn1Label", "Schritt 1"),
            title: tLevelUp("levelUpStep1TitleLabel", "Schritt 1: Stufe")
        },
        6: {
            btn: tLevelUp("levelUpStepBtn2Label", "Schritt 2"),
            title: tLevelUp("levelUpStep2TitleLabel", "Schritt 2: Spezialisierung")
        },
        7: {
            btn: tLevelUp("levelUpStepBtn3Label", "Schritt 3"),
            title: tLevelUp("levelUpStep3TitleLabel", "Schritt 3: Zauber")
        }
    };

    for (let i = 1; i <= 12; i++) {
        const btn = document.getElementById(`step${i}Btn`);
        if (!btn) continue;
        if (stepChrome[i]) {
            btn.hidden = false;
            btn.removeAttribute("hidden");
            btn.classList.remove("level-up-step-hidden");
            btn.style.removeProperty("display");
            const mainSpan = btn.querySelector(":scope > span");
            if (mainSpan) mainSpan.textContent = stepChrome[i].btn;
            const titleEl = document.getElementById(`step${i}Title`);
            if (titleEl) titleEl.textContent = stepChrome[i].title;
        } else {
            btn.hidden = true;
            btn.setAttribute("hidden", "");
            btn.classList.add("level-up-step-hidden");
            btn.style.setProperty("display", "none", "important");
        }
    }
}

function applyLevelUpStep5Navigation() {
    const backBtn = document.getElementById("back");
    const abortBtn = document.getElementById("levelUpAbort");
    if (backBtn) backBtn.style.display = "none";
    if (abortBtn) abortBtn.style.display = "flex";
}

function applyLevelUpDefaultNavigation() {
    const backBtn = document.getElementById("back");
    const abortBtn = document.getElementById("levelUpAbort");
    if (abortBtn) abortBtn.style.display = "none";
    if (backBtn) backBtn.style.display = "flex";
}

function configureLevelUpLevelInput() {
    const levelInput = document.getElementById("level");
    if (!levelInput) return;
    const entry = getLevelUpEntryLevel();
    levelInput.min = String(entry);
    levelInput.max = "20";
    if (!levelInput.value || parseInt(levelInput.value, 10) < entry) {
        levelInput.value = String(entry);
    }
    if (!levelInput.dataset.levelUpBound) {
        levelInput.dataset.levelUpBound = "1";
        levelInput.addEventListener("input", () => {
            let v = parseInt(levelInput.value, 10);
            if (!Number.isFinite(v) || v < entry) {
                levelInput.value = String(entry);
                v = entry;
            }
            if (v > 20) {
                levelInput.value = "20";
                v = 20;
            }
            setLevelUpTargetLevel(v);
            if (typeof character !== "undefined") character.level = v;
        });
    }
}

function guardLevelUpGoToStep(step) {
    return step === 5 || step === 6 || step === 7;
}

function restoreCharacterSheetFromLevelUpSnapshot() {
    const snapshot = getLevelUpSnapshot();
    if (!snapshot) {
        navigateToCharacterSheetAfterLevelUp();
        return;
    }

    const payload = {
        meta: snapshot.meta || { app: "DiceCharacters" },
        base: snapshot.base || {},
        overrides: snapshot.overrides || {}
    };

    if (typeof applyCharacterSheetImport === "function") {
        try {
            sessionStorage.removeItem(DC_LEVEL_UP_SESSION_KEY);
            sessionStorage.removeItem(DC_CREATOR_MODE_KEY);
        } catch (e) { /* ignore */ }
        applyCharacterSheetImport(payload, snapshot.dcEnvelope || null);
        return;
    }

    localStorage.clear();
    writeLevelUpSnapshotBaseToLocalStorage(snapshot);
    localStorage.setItem(SHEET_OVERRIDES_STORAGE_KEY, JSON.stringify(snapshot.overrides || {}));
    localStorage.removeItem("import_overrides");
    navigateToCharacterSheetAfterLevelUp();
}

/** Abbruch (Schritt 5): optional Warnung bei Stufe > entryLevel. */
function cancelLevelUpMode() {
    const entry = getLevelUpEntryLevel();
    const target = getLevelUpTargetLevel();
    if (target > entry) {
        const msg = tLevelUp(
            "levelUpAbortLevelChangedConfirmLabel",
            "Du hast die Stufe bereits angehoben. Beim Abbrechen gehen diese Änderungen verloren. Fortfahren?"
        );
        if (!confirm(msg)) return;
    }
    restoreCharacterSheetFromLevelUpSnapshot();
}

/**
 * Creator-Einstieg: Snapshot laden, UI, character hydratieren, Schritt 5.
 * @returns {boolean}
 */
function parseRuntimeBlobFromLocalStorage(lsKey) {
    const raw = localStorage.getItem(lsKey);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (typeof normalizeDcPackageInput === "function") {
            const norm = normalizeDcPackageInput(parsed);
            if (norm.ok) {
                return { payload: norm.payload, envelope: norm.envelope || null };
            }
        }
        if (parsed && parsed.payload) {
            return { payload: parsed.payload, envelope: parsed.dc || parsed.envelope || null };
        }
        return { payload: parsed, envelope: null };
    } catch (e) {
        console.warn("Level-Up Runtime parse:", lsKey, e);
        return null;
    }
}

/**
 * Custom-Runtimes aus Snapshot-LocalStorage in Creator-Register laden.
 * Kein markDcPackageUserLoaded — Import-Modal erzwingt expliziten Upload (forImport).
 */
function hydrateLevelUpCustomRuntimesFromLocalStorage() {
    if (!isLevelUpMode()) return;

    const wrapRuntime = (parsed) => {
        if (!parsed) return null;
        if (parsed.envelope) {
            return { dc: parsed.envelope, payload: parsed.payload };
        }
        return parsed.payload || parsed;
    };

    const classRt = parseRuntimeBlobFromLocalStorage("customClassRuntime");
    if (classRt && typeof registerCustomClassInRuntime === "function") {
        registerCustomClassInRuntime(wrapRuntime(classRt));
    }

    const subclass = parseRuntimeBlobFromLocalStorage("customSubclassRuntime");
    if (subclass && typeof registerCustomSubclassInRuntime === "function") {
        registerCustomSubclassInRuntime(wrapRuntime(subclass));
    }

    const background = parseRuntimeBlobFromLocalStorage("customBackgroundRuntime");
    if (background && typeof registerCustomBackgroundInRuntime === "function") {
        registerCustomBackgroundInRuntime(wrapRuntime(background));
    }

    const spell = parseRuntimeBlobFromLocalStorage("customSpellPackRuntime");
    if (spell && typeof registerCustomSpellPackFromPayload === "function") {
        registerCustomSpellPackFromPayload(spell.payload, spell.envelope);
    }

    const feat = parseRuntimeBlobFromLocalStorage("customFeatPackRuntime");
    if (feat && typeof registerCustomFeatPackFromPayload === "function") {
        registerCustomFeatPackFromPayload(feat.payload, feat.envelope);
    }

    const species = parseRuntimeBlobFromLocalStorage("customSpeciesRuntime");
    if (species && typeof registerCustomSpeciesInRuntime === "function") {
        registerCustomSpeciesInRuntime(wrapRuntime(species));
    }

    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
}

/**
 * Runtime-Keys aus Dependency-Upload in den Level-Up-Snapshot übernehmen.
 */
function syncLevelUpSnapshotFromDependencyPayload(payload) {
    if (!payload?.base) return;
    const snap = getLevelUpSnapshot();
    if (!snap) return;

    const runtimeKeys = [
        "customClassRuntime",
        "customSubclassRuntime",
        "customBackgroundRuntime",
        "customSpellPackRuntime",
        "customFeatPackRuntime",
        "customSpeciesRuntime"
    ];
    runtimeKeys.forEach(key => {
        if (payload.base[key] != null) {
            snap.base[key] = payload.base[key];
        }
    });

    try {
        sessionStorage.setItem(DC_LEVEL_UP_SESSION_KEY, JSON.stringify(snap));
    } catch (e) { /* ignore */ }
    dcLevelUpSnapshotCache = snap;
}

/**
 * Nach Snapshot/Dependency-Check: LS, Custom-Runtimes und character-Objekt synchronisieren.
 */
function finalizeLevelUpCreatorSessionEntry() {
    const snapshot = getLevelUpSnapshot();
    if (!snapshot?.base) return;

    writeLevelUpSnapshotBaseToLocalStorage(snapshot);
    hydrateLevelUpCustomRuntimesFromLocalStorage();
    hydrateCharacterFromLevelUpSnapshot(snapshot);

    if (typeof lastSavedLevel !== "undefined") {
        lastSavedLevel = snapshot.entryLevel;
    }

    if (character?.class) {
        if (typeof selectedClassName !== "undefined") {
            selectedClassName = character.class;
        }
        if (typeof populateClassFormOptions === "function") {
            populateClassFormOptions(character.class);
        }
        if (typeof refreshCreatorSubclassOptionsRadios === "function") {
            refreshCreatorSubclassOptionsRadios();
        }
    }
}

/**
 * M2: Custom-Dependencies beim Level-Up-Einstieg.
 * Eingebettete Runtimes im Snapshot zählen (kein erzwungener Neu-Upload).
 * Modal nur wenn Runtime im Export fehlt (z. B. alter Import ohne eingebettete Pakete).
 * @param {function} onReady Callback wenn alle Deps erfüllt oder keine nötig
 */
function beginLevelUpDependencyResolution(onReady) {
    const snapshot = getLevelUpSnapshot();
    if (!snapshot?.base) {
        if (typeof onReady === "function") onReady();
        return;
    }

    writeLevelUpSnapshotBaseToLocalStorage(snapshot);
    hydrateLevelUpCustomRuntimesFromLocalStorage();

    const requiredDeps = (typeof buildCharacterSheetDependencies === "function")
        ? buildCharacterSheetDependencies(snapshot.base)
        : [];

    const finishReady = () => {
        finalizeLevelUpCreatorSessionEntry();
        if (typeof onReady === "function") onReady();
    };

    if (!requiredDeps.length
        || typeof beginDcPackageImportWithDependencies !== "function"
        || typeof DC_PACKAGE_TYPE === "undefined") {
        finishReady();
        return;
    }

    // Snapshot-Hydrate zählt — kein requireFreshUpload (nur fehlende Pakete nachfordern)
    const missing = (typeof getUnsatisfiedDcPackageDependencies === "function")
        ? getUnsatisfiedDcPackageDependencies(requiredDeps, { forImport: false })
        : requiredDeps;

    if (!missing.length) {
        finishReady();
        return;
    }

    beginDcPackageImportWithDependencies({
        envelope: snapshot.dcEnvelope || null,
        payload: {
            meta: snapshot.meta || { app: "DiceCharacters" },
            base: snapshot.base,
            overrides: snapshot.overrides || {}
        },
        detectedType: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        requiredDeps,
        onApply: (payload) => {
            syncLevelUpSnapshotFromDependencyPayload(payload);
            writeLevelUpSnapshotBaseToLocalStorage(getLevelUpSnapshot());
            hydrateLevelUpCustomRuntimesFromLocalStorage();
            finishReady();
        },
        onCancel: () => {
            cancelLevelUpMode();
        }
    });
}

function initLevelUpMode() {
    if (!isLevelUpMode()) return false;

    const snapshot = getLevelUpSnapshot();
    if (!snapshot?.base) {
        try {
            sessionStorage.removeItem(DC_CREATOR_MODE_KEY);
        } catch (e) { /* ignore */ }
        return false;
    }

    applyLevelUpModeChrome();
    configureLevelUpLevelInput();
    applyLevelUpCustomBibRestrictions();

    if (typeof updateProgress === "function") updateProgress();

    return true;
}

function isLevelUpLockedSpell(spellId) {
    const snap = getLevelUpSnapshot();
    const ids = snap?.lockedContent?.spellIds;
    if (!Array.isArray(ids)) return false;
    const n = parseInt(spellId, 10);
    return ids.some(id => parseInt(id, 10) === n);
}

function isLevelUpLockedFeat(featId) {
    const snap = getLevelUpSnapshot();
    const ids = snap?.lockedContent?.featIds;
    if (!Array.isArray(ids)) return false;
    const n = parseInt(featId, 10);
    return ids.some(id => parseInt(id, 10) === n);
}

/** Schritt-6-Select sicher befüllen (nur wenn Option existiert). */
function levelUpSetSelectValue(el, val) {
    if (!el || val == null || val === "") return;
    const str = String(val);
    if (el.tagName === "SELECT") {
        const opt = Array.from(el.options).find(o => o.value === str);
        if (opt) {
            opt.disabled = false;
            el.value = str;
        }
    } else if (el.type === "checkbox") {
        el.checked = !!val;
    } else {
        el.value = str;
    }
}

/** Unterklassen-Anzeigename für Bogen-Override (Kopfzeile). */
function resolveLevelUpSubclassDisplayName(className, subclassCategoryNumber) {
    const n = parseInt(subclassCategoryNumber, 10);
    if (!className || !n) return "";
    const key = String(className).toLowerCase().trim();
    const lists = {
        barbarian: (typeof subclassListBarbarian !== "undefined") ? subclassListBarbarian : [],
        bard: (typeof subclassListBard !== "undefined") ? subclassListBard : [],
        cleric: (typeof subclassListCleric !== "undefined") ? subclassListCleric : [],
        druid: (typeof subclassListDruid !== "undefined") ? subclassListDruid : [],
        fighter: (typeof subclassListFighter !== "undefined") ? subclassListFighter : [],
        monk: (typeof subclassListMonk !== "undefined") ? subclassListMonk : [],
        paladin: (typeof subclassListPaladin !== "undefined") ? subclassListPaladin : [],
        ranger: (typeof subclassListRanger !== "undefined") ? subclassListRanger : [],
        rogue: (typeof subclassListRogue !== "undefined") ? subclassListRogue : [],
        sorcerer: (typeof subclassListSorcerer !== "undefined") ? subclassListSorcerer : [],
        warlock: (typeof subclassListWarlock !== "undefined") ? subclassListWarlock : [],
        wizard: (typeof subclassListWizard !== "undefined") ? subclassListWizard : []
    };
    const list = lists[key];
    if (!Array.isArray(list)) return "";
    const entry = list.find(s => s.subclassCategoryNumber === n);
    if (!entry) return "";
    const lang = (typeof currentLang !== "undefined") ? currentLang
        : (typeof currentLanguage !== "undefined") ? currentLanguage : "de";
    const t = (typeof translations !== "undefined" && translations[lang]) ? translations[lang] : {};
    return t[entry.translationLabel] || entry.translationLabel;
}

/** Unterklassen-Textfeld in overrides setzen (verhindert Leer-Override nach Stufenaufstieg). */
function syncLevelUpSubclassDisplayInOverrides(overrides, character, classForm) {
    if (!overrides.inputs) overrides.inputs = {};
    const className = character?.class;
    const subclassNum = classForm?.subclass;
    if (!subclassNum) return;
    const label = resolveLevelUpSubclassDisplayName(className, subclassNum);
    if (label) overrides.inputs.subclass = label;
}

/** classForm-Array auf sortierte Selects mit ID-Präfix anwenden. */
function levelUpApplyClassFormArray(prefix, values, root) {
    if (!Array.isArray(values) || !values.length) return;
    const selects = Array.from(root.querySelectorAll(`select[id^="${prefix}"]`))
        .filter(sel => {
            // Urwissen (skill0) ist kein Index in classForm.skills
            if (prefix === "skill" && sel.id === "skill0") return false;
            // Klassen-Waffenmeisterschaft ≠ Talent (weaponMastery-feat-*)
            if (prefix === "weaponMastery") {
                return /^weaponMastery\d+$/.test(sel.id);
            }
            return true;
        })
        .sort((a, b) => {
            const na = parseInt(a.id.slice(prefix.length), 10);
            const nb = parseInt(b.id.slice(prefix.length), 10);
            return (na || 0) - (nb || 0);
        });
    values.forEach((val, i) => {
        if (selects[i]) levelUpSetSelectValue(selects[i], val);
    });
}

/**
 * Schritt-6-Auswahlen aus character.classForm wiederherstellen
 * (Ersteller + Level-Up — z. B. nach UI-Rebuild in goToStep(6)).
 */
function reapplyStep6ClassFormSelections() {
    if (typeof character === "undefined") return;
    const cf = character.classForm;
    if (!cf || typeof cf !== "object") return;

    const root = document.getElementById("step6");
    if (!root) return;

    const arrayKeys = [
        "skills", "maneuvers", "expertise", "weaponMastery", "languages", "tools",
        "instruments", "games", "freeChoices", "energyMasteries", "divineOrders",
        "blessedStrikes", "primalOrders", "elementalFuries", "lands", "starMaps",
        "feywildGifts", "metamagics", "manifestationsOfOrder", "eldritchInvocations",
        "attributes", "spellLists", "spellcastingAbilities", "damageType_Dragon",
        "damageType_fiendRes", "damageType_Boon"
    ];

    const prefixMap = {
        skills: "skill",
        maneuvers: "maneuver",
        expertise: "expertise",
        weaponMastery: "weaponMastery",
        languages: "language",
        tools: "tool",
        instruments: "instrument",
        games: "game",
        freeChoices: "freeChoice",
        energyMasteries: "energyMastery",
        divineOrders: "divineOrder",
        blessedStrikes: "blessedStrikes",
        primalOrders: "primalOrder",
        elementalFuries: "elementalFury",
        lands: "land",
        starMaps: "starMap",
        feywildGifts: "feywildGift",
        metamagics: "metamagic",
        manifestationsOfOrder: "manifestation",
        eldritchInvocations: "invocation",
        attributes: "attribute",
        spellLists: "spellList",
        spellcastingAbilities: "spellAbility",
        damageType_Dragon: "damageType_D",
        damageType_fiendRes: "damageType_fR",
        damageType_Boon: "damageType_B"
    };

    // Unterklasse ZUERST: #dynamicSubclassContent (land1, starMap1, …) aufbauen,
    // bevor classForm-Arrays gesetzt werden (sonst gehen Werte verloren).
    if (cf.subclass != null && cf.subclass !== "") {
        const radio = root.querySelector(`input[name="subclass"][value="${cf.subclass}"]`);
        if (radio) {
            radio.checked = true;
            const scNum = parseInt(cf.subclass, 10) || 0;
            if (scNum && typeof updateSubclassDynamicContent === "function") {
                updateSubclassDynamicContent(scNum, character.level);
            }
            if (scNum && typeof showSubclassDetails === "function") {
                showSubclassDetails(scNum);
            }
        }
    }

    arrayKeys.forEach(key => {
        const prefix = prefixMap[key];
        if (prefix && Array.isArray(cf[key])) {
            levelUpApplyClassFormArray(prefix, cf[key], root);
        }
    });

    // Hexenmeister: invFeat_* + Kaskade (Begabt → Werkzeug → Instrument) nach Anrufungs-Restore
    reapplyInvocationFeatDropdowns();

    // Beschreibungs-Listener (Star Map / Feywild Gift) nach Wert-Restore auslösen
    ["starMap1", "feywildGift1"].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value) {
            el.dispatchEvent(new Event("change", { bubbles: true }));
        }
    });

    // Barbar Urwissen: eigener classForm-Schlüssel, nicht im skills-Array
    if (cf.primalKnowledgeSkill) {
        levelUpSetSelectValue(document.getElementById("skill0"), cf.primalKnowledgeSkill);
    }

    const eq = cf.classEquipmentChoices;
    if (eq && typeof eq === "object") {
        if (character.class && character.class.toLowerCase() === "monk") {
            const toolRadio = document.getElementById("monkToolRadio");
            const instrumentRadio = document.getElementById("monkInstrumentRadio");
            if (Array.isArray(eq.tools) && eq.tools.length && toolRadio) {
                toolRadio.checked = true;
                if (typeof updateMonkDropdown === "function") updateMonkDropdown();
                levelUpSetSelectValue(document.getElementById("tool1"), eq.tools[0]);
            } else if (Array.isArray(eq.instruments) && eq.instruments.length && instrumentRadio) {
                instrumentRadio.checked = true;
                if (typeof updateMonkDropdown === "function") updateMonkDropdown();
                levelUpSetSelectValue(document.getElementById("instrument1"), eq.instruments[0]);
            }
        }
    }

    if (Array.isArray(cf.feats)) {
        cf.feats.forEach(entry => {
            const lvl = parseInt(entry.level, 10);
            const featId = parseInt(entry.feat, 10);
            if (!lvl || !featId) return;
            if (isInvocationGrantedOriginFeatEntry(entry)) return;

            const sel = document.getElementById(`feats${lvl}`)
                || root.querySelector(`select[name="feats${lvl}"]`);
            if (sel) {
                if (sel.value !== String(featId)) {
                    levelUpSetSelectValue(sel, featId);
                }
                if (typeof updateFeatDynamicContent === "function") {
                    updateFeatDynamicContent(featId, lvl, sel);
                }
            }

            const fromRecon = (typeof isLevelUpMode === "function" && isLevelUpMode()
                && typeof getLevelUpReconstructionData === "function")
                ? (getLevelUpReconstructionData()?.featSelections?.[lvl]
                    || getLevelUpReconstructionData()?.featSelections?.[String(lvl)]
                    || {})
                : {};
            const dynamicChoices = Array.isArray(fromRecon.dynamicChoices) && fromRecon.dynamicChoices.length
                ? fromRecon.dynamicChoices
                : (Array.isArray(entry.dynamicChoices) ? entry.dynamicChoices : []);
            const attributeChoice = fromRecon.attributeChoice || entry.attributeChoice || null;

            const featData = (typeof featList !== "undefined")
                ? featList.find(f => f.ID === featId)
                : null;

            if (attributeChoice && sel) {
                const abilityDrop = sel.parentNode?.querySelector(".feat-ability-dropdown");
                if (abilityDrop) levelUpSetSelectValue(abilityDrop, attributeChoice);
            }

            if (!FEAT_LABELS_RADIO_DYNAMIC.has(featData?.translationLabel)) {
                dynamicChoices.forEach(choice => {
                    if (!choice || !choice.id) return;
                    if (String(choice.id).startsWith("weaponMastery-feat-")) return;
                    const el = document.getElementById(choice.id)
                        || (sel && sel.parentNode
                            ? sel.parentNode.querySelector(`[id="${choice.id}"]`)
                            : null);
                    if (!el) return;
                    if (el.type === "radio") {
                        if (String(el.value) === String(choice.value)) el.checked = true;
                    } else {
                        levelUpSetSelectValue(el, choice.value);
                    }
                });
            }
        });
    }

    if (Array.isArray(cf.spellLists)) {
        // Schritt-6-MI: Suffix nach BG/Volk; BG/Volk-Selects außerhalb von step6
        const preClassSlots = (typeof countLevelUpPreClassMagicInitiateSlots === "function")
            ? countLevelUpPreClassMagicInitiateSlots(character)
            : 0;
        const sortByIdNum = (a, b) => {
            const na = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
            const nb = parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
            return na - nb;
        };
        const step6Selects = Array.from(root.querySelectorAll('select[id^="spellList"]')).sort(sortByIdNum);
        const outsideSelects = Array.from(document.querySelectorAll('select[id^="spellList"]'))
            .filter(el => !root.contains(el))
            .sort((a, b) => {
                // Dokumentreihenfolge: Schritt 2 vor Schritt 3 (BG vor Volk)
                const pos = a.compareDocumentPosition(b);
                if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
                if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
                return sortByIdNum(a, b);
            });
        cf.spellLists.slice(0, preClassSlots).forEach((val, i) => {
            if (outsideSelects[i]) levelUpSetSelectValue(outsideSelects[i], val);
        });
        cf.spellLists.slice(preClassSlots).forEach((val, i) => {
            if (step6Selects[i]) levelUpSetSelectValue(step6Selects[i], val);
        });
    }
    if (Array.isArray(cf.spellcastingAbilities)) {
        const preClassSlots = (typeof countLevelUpPreClassMagicInitiateSlots === "function")
            ? countLevelUpPreClassMagicInitiateSlots(character)
            : 0;
        const sortByIdNum = (a, b) => {
            const na = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
            const nb = parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
            return na - nb;
        };
        const step6Selects = Array.from(root.querySelectorAll('select[id^="spellAbility"]')).sort(sortByIdNum);
        const outsideSelects = Array.from(document.querySelectorAll('select[id^="spellAbility"]'))
            .filter(el => !root.contains(el))
            .sort((a, b) => {
                const pos = a.compareDocumentPosition(b);
                if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
                if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
                return sortByIdNum(a, b);
            });
        cf.spellcastingAbilities.slice(0, preClassSlots).forEach((val, i) => {
            if (outsideSelects[i]) levelUpSetSelectValue(outsideSelects[i], val);
        });
        cf.spellcastingAbilities.slice(preClassSlots).forEach((val, i) => {
            if (step6Selects[i]) levelUpSetSelectValue(step6Selects[i], val);
        });
    }

    if (typeof updateSkills === "function") updateSkills();
    if (typeof populateExpertiseOptions === "function") populateExpertiseOptions();
    if (typeof reapplyFeatRadioDropdowns === "function") {
        reapplyFeatRadioDropdowns();
    } else if (typeof reapplyLevelUpSkilledFeatDropdowns === "function") {
        reapplyLevelUpSkilledFeatDropdowns();
    }
    reapplyInvocationFeatNestedProficiencies();
    if (typeof reapplyClassFormDependentStep6Selects === "function") {
        reapplyClassFormDependentStep6Selects();
    }
    if (typeof reapplyLevelUpFeatWeaponMasteryDropdowns === "function") {
        reapplyLevelUpFeatWeaponMasteryDropdowns();
    }
    if (typeof refreshAllMagicInitiateSpellListDropdowns === "function") {
        refreshAllMagicInitiateSpellListDropdowns();
    }

    // Göttliche Ordnung / Urwissen-Ordnung: Info unter dem Select (kein change-Event beim Hydrieren)
    reapplyOrderSelectionInfoFromDom();
}

/**
 * Info-Box unter divineOrder1 / primalOrder1 sowie Manifestationen der Ordnung
 * nach Hydration (change-Listener laufen sonst nur bei manueller Auswahl).
 */
function reapplyOrderSelectionInfoFromDom() {
    if (typeof handleOrderSelection === "function") {
        ["divineOrder1", "primalOrder1"].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value) handleOrderSelection(el);
        });
    }
    const manifestationEl = document.getElementById("manifestation1");
    if (manifestationEl && manifestationEl.value) {
        manifestationEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

/**
 * M3: Schritt 6 aus character.classForm rekonstruieren (inverse saveClassForm).
 */
function hydrateStep6FromClassForm() {
    if (!isLevelUpMode() || typeof character === "undefined") return;

    character.featSelections = character.featSelections || {};

    // LEVEL-UP RECONSTRUCTION ONLY: stumme featSelections/ASI bevorzugen
    const recon = getLevelUpReconstructionData();
    if (recon?.featSelections && typeof recon.featSelections === "object") {
        try {
            character.featSelections = JSON.parse(JSON.stringify(recon.featSelections));
        } catch (e) { /* ignore */ }
    }

    reapplyStep6ClassFormSelections();

    const cf = character.classForm;
    if (!cf || typeof cf !== "object") return;

    if (Array.isArray(cf.feats)) {
        cf.feats.forEach(entry => {
            const lvl = parseInt(entry.level, 10);
            const featId = parseInt(entry.feat, 10);
            if (!lvl || !featId) return;

            const fromRecon = character.featSelections?.[lvl]
                || character.featSelections?.[String(lvl)]
                || {};
            const asiChoices = (fromRecon.asiChoices && Object.keys(fromRecon.asiChoices).length)
                ? fromRecon.asiChoices
                : ((entry.asiChoices && typeof entry.asiChoices === "object")
                    ? entry.asiChoices
                    : {});
            const dynamicChoices = Array.isArray(fromRecon.dynamicChoices) && fromRecon.dynamicChoices.length
                ? fromRecon.dynamicChoices
                : (Array.isArray(entry.dynamicChoices) ? entry.dynamicChoices : []);
            const attributeChoice = fromRecon.attributeChoice || entry.attributeChoice || null;

            character.featSelections[lvl] = {
                featId,
                dynamicChoices: dynamicChoices.slice ? dynamicChoices.slice() : [],
                asiChoices: Object.assign({}, asiChoices),
                attributeChoice
            };

            levelUpRestoreAsiChoices(lvl, character.featSelections[lvl].asiChoices);
        });
    }

    if (typeof setupFeatSelection === "function") setupFeatSelection();
    if (typeof buildFeatInfoUI === "function") buildFeatInfoUI();
}

/** ASI-Punktverteilung in die Inputs und Restanzeige schreiben. */
function levelUpRestoreAsiChoices(featLevel, asiChoices) {
    if (!asiChoices || typeof asiChoices !== "object") return;
    const container = document.querySelector(`.asi-container[data-feat-level="${featLevel}"]`);
    if (!container) return;

    let total = 0;
    container.querySelectorAll(".asi-point-input").forEach(input => {
        const attr = input.dataset.attribute;
        const value = parseInt(asiChoices[attr], 10) || 0;
        input.value = String(value);
        total += value;
    });
    const remainingEl = container.querySelector(".asi-points-remaining");
    if (remainingEl) remainingEl.textContent = String(Math.max(0, 2 - total));

    if (!character.featSelections[featLevel]) character.featSelections[featLevel] = {};
    character.featSelections[featLevel].asiChoices = Object.assign({}, asiChoices);
}

/**
 * Schritt-4-Basiswerte setzen.
 * LEVEL-UP RECONSTRUCTION ONLY: bevorzugt stumme attributeBases;
 * sonst Fallback Basis = Gesamt − Talent − Hintergrund − Klasse.
 */
function seedLevelUpAttributeBasesFromTotals() {
    if (typeof character === "undefined" || typeof attributeList === "undefined") return;

    let host = document.getElementById("levelUpHiddenAttributeScores");
    if (!host) {
        host = document.createElement("div");
        host.id = "levelUpHiddenAttributeScores";
        host.hidden = true;
        host.setAttribute("aria-hidden", "true");
        document.body.appendChild(host);
    }

    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace("Label", "");
        if (!document.getElementById(`${stringId}Score`)) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.id = `${stringId}Score`;
            input.value = "0";
            host.appendChild(input);
        }
    });

    const featBonuses = (typeof calculateFeatBonuses === "function")
        ? calculateFeatBonuses()
        : {};
    const distBonuses = (typeof calculateCustomAttributeDistributionBonuses === "function")
        ? calculateCustomAttributeDistributionBonuses()
        : {};
    const recon = getLevelUpReconstructionData();

    attributeList.forEach(attr => {
        const stringId = attr.translationLabel.replace("Label", "");
        const totalKey = `${stringId}TotalScore`;

        const backgroundBonus = character.backgroundAttributeBonuses?.[attr.translationLabel] || 0;
        const featBonus = featBonuses[stringId] || 0;
        const classBonus = ((typeof classAttributeBonuses !== "undefined" && classAttributeBonuses[stringId]) || 0)
            + (distBonuses[stringId] || 0);

        const el = document.getElementById(`${stringId}Score`);
        if (!el) return;

        const bases = recon?.attributeBases;

        // Autoritative Basen aus Rekonstruktionsdaten (kein Rückwärtsrechnen bei Klassenboni)
        if (bases && bases[stringId] != null) {
            el.value = String(parseInt(bases[stringId], 10) || 0);
            return;
        }

        const total = parseInt(character[totalKey], 10);
        if (Number.isFinite(total)) {
            el.value = String(Math.max(0, total - backgroundBonus - featBonus - classBonus));
        }
    });
}

/** Extrahiert Stufennummer aus Step-6-Label, z. B. „(Stufe 3)“ / „(Stufe: 3)“. */
function levelUpParseControlLevelFromLabel(labelEl) {
    if (!labelEl || !labelEl.textContent) return null;
    const m = labelEl.textContent.match(/\(\s*(?:Stufe|Level)\s*:?\s*(\d+)\s*\)/i);
    return m ? parseInt(m[1], 10) : null;
}

/** Schloss-Banner hinter Radio-Label-Text (z. B. gewählte Unterklasse). */
function levelUpAttachLockBadgeToRadioLabel(radio) {
    if (!radio) return;
    const label = radio.closest("label")
        || (radio.id ? document.querySelector(`label[for="${radio.id}"]`) : null);
    if (!label) return;
    if (label.querySelector(":scope > .level-up-lock-badge")) return;
    const badge = document.createElement("span");
    badge.className = "level-up-lock-badge";
    badge.textContent = " 🔒";
    badge.setAttribute("aria-hidden", "true");
    label.appendChild(badge);
}

//=======================================================================
// LEVEL-UP ONLY: New-Choice-Icons (goldenes ↑)
//=======================================================================

/** Entfernt alle New-Choice-Icons unter root (oder document). */
function clearLevelUpNewChoiceIcons(root) {
    const scope = root || document;
    scope.querySelectorAll(".level-up-new-choice-icon").forEach(el => el.remove());
    // Select-Klasse + ggf. altes Placeholder-Suffix zurücksetzen
    scope.querySelectorAll("select").forEach(sel => {
        if (sel.classList.contains("level-up-new-choice-select")
            || Array.from(sel.options).some(o => o.value === "" && (/\u2191|↑/.test(o.textContent) || o.dataset.luPlaceholder))) {
            levelUpSetSelectNewChoiceMarker(sel, false);
        }
    });
}

/**
 * Markiert/entfernt New-Choice am Select: nur CSS-Klasse (↑ rechts wie Schloss).
 * Kein Suffix im Placeholder-Text, keine Schriftfarbe.
 * @param {HTMLSelectElement} selectEl
 * @param {boolean} on
 */
function levelUpSetSelectNewChoiceMarker(selectEl, on) {
    if (!selectEl) return;
    selectEl.classList.toggle("level-up-new-choice-select", !!on);

    // Alte Placeholder-Suffixe aus früherer Version bereinigen
    const emptyOpt = Array.from(selectEl.options).find(o => o.value === "");
    if (!emptyOpt) return;

    const stripMark = (text) => String(text || "")
        .replace(/\s*↑\s*$/u, "")
        .replace(/^\s*↑\s*/u, "")
        .trim();

    const cleaned = emptyOpt.dataset.luPlaceholder
        ? emptyOpt.dataset.luPlaceholder
        : stripMark(emptyOpt.textContent);

    if (emptyOpt.dataset.luPlaceholder || /\u2191|↑/.test(emptyOpt.textContent)) {
        emptyOpt.textContent = cleaned
            || (typeof translations !== "undefined"
                && translations[currentLang]?.pleaseSelectLabel)
            || "-Bitte wählen-";
        delete emptyOpt.dataset.luPlaceholder;
    }
}

/**
 * Hängt goldenes ↑ an Host-Element (Label — Radios/Checkboxen).
 * @param {HTMLElement} hostEl
 * @returns {HTMLElement|null}
 */
function levelUpAttachNewChoiceIcon(hostEl, insertAfterEl) {
    if (!hostEl || !isLevelUpMode()) return null;
    if (hostEl.querySelector(":scope > .level-up-new-choice-icon")) {
        return hostEl.querySelector(":scope > .level-up-new-choice-icon");
    }
    // Schloss und New-Choice nie gleichzeitig
    if (hostEl.querySelector(".level-up-lock-badge")) return null;

    const icon = document.createElement("span");
    icon.className = "level-up-new-choice-icon";
    icon.textContent = "↑";
    icon.setAttribute("aria-hidden", "true");
    const title = (typeof tLevelUp === "function")
        ? tLevelUp("levelUpNewChoiceIconTitleLabel", "Neue Auswahl")
        : "Neue Auswahl";
    icon.title = title;
    if (insertAfterEl && insertAfterEl.parentNode === hostEl) {
        insertAfterEl.insertAdjacentElement("afterend", icon);
    } else {
        hostEl.appendChild(icon);
    }
    return icon;
}

/** Label-Host für Radio/Checkbox. */
function levelUpFindInputIconHost(inputEl) {
    if (!inputEl) return null;
    const wrap = inputEl.closest("label");
    if (wrap) return wrap;
    if (inputEl.id) {
        const byFor = document.querySelector(`label[for="${inputEl.id}"]`);
        if (byFor) return byFor;
    }
    return inputEl.parentElement || inputEl;
}

/** true = Control ist gesperrt / nicht wählbar für New-Choice. */
function levelUpIsControlLockedForNewChoice(el) {
    if (!el) return true;
    if (el.disabled) return true;
    if (el.classList.contains("level-up-field-locked")) return true;
    if (el.closest(".level-up-field-locked")) return true;
    return false;
}

/** true = Element sichtbar genug für Indikator. */
function levelUpIsElementVisible(el) {
    if (!el) return false;
    if (el.hidden) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
}

/**
 * Schritt 6: leere Selects + unvollständige Radio-/Checkbox-Gruppen markieren.
 */
function syncLevelUpStep6NewChoiceIcons() {
    if (!isLevelUpMode()) return;
    const root = document.getElementById("step6");
    if (!root) return;

    clearLevelUpNewChoiceIcons(root);

    // 1) Leere Selects — nur goldenes ↑ rechts (wie Schloss), Schrift unverändert
    root.querySelectorAll("select").forEach(sel => {
        if (!levelUpIsElementVisible(sel)) return;
        if (levelUpIsControlLockedForNewChoice(sel)) {
            levelUpSetSelectNewChoiceMarker(sel, false);
            return;
        }
        levelUpSetSelectNewChoiceMarker(sel, sel.value === "");
    });

    // 2) Radio-/Checkbox-Gruppen ohne erfüllte Auswahl
    const groupNames = new Set();
    root.querySelectorAll('input[type="radio"][name], input[type="checkbox"][name]').forEach(inp => {
        if (inp.name) groupNames.add(inp.name);
    });

    groupNames.forEach(name => {
        const safeName = (typeof CSS !== "undefined" && typeof CSS.escape === "function")
            ? CSS.escape(name)
            : String(name).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const inputs = Array.from(root.querySelectorAll(
            `input[type="radio"][name="${safeName}"], input[type="checkbox"][name="${safeName}"]`
        )).filter(el => levelUpIsElementVisible(el));
        if (!inputs.length) return;

        // Alle gesperrt → nichts markieren
        if (inputs.every(el => levelUpIsControlLockedForNewChoice(el))) return;

        const unlocked = inputs.filter(el => !levelUpIsControlLockedForNewChoice(el));
        if (!unlocked.length) return;

        const isRadio = unlocked[0].type === "radio";
        if (isRadio) {
            if (unlocked.some(el => el.checked)) return;
            unlocked.forEach(el => {
                const host = levelUpFindInputIconHost(el);
                if (host) levelUpAttachNewChoiceIcon(host);
            });
            return;
        }

        // Checkbox-Gruppe: Icon solange keine Option gewählt
        if (!unlocked.some(el => el.checked)) {
            unlocked.forEach(el => {
                const host = levelUpFindInputIconHost(el);
                if (host) levelUpAttachNewChoiceIcon(host);
            });
        }
    });
}

/**
 * Ermittelt das Auswahl-Kontingent eines Zauber-Merkmals (Schritt 7).
 * Sentinel 555 = Übungsbonus (PB): floor((Stufe−1)/4)+2 — u. a. Ritualwirker.
 * @param {object} feature
 * @returns {number|null}
 */
function levelUpGetSpellFeatureChoiceQuota(feature) {
    if (!feature) return null;
    let choiceCount = feature.chooseNonSpecificSpell_a;
    if (choiceCount == null || choiceCount === 0 || choiceCount === "") return null;
    choiceCount = parseInt(choiceCount, 10);
    if (!Number.isFinite(choiceCount) || choiceCount <= 0) return null;
    if (choiceCount === 555) {
        const lvl = (typeof character !== "undefined" && character.level)
            ? parseInt(character.level, 10)
            : 1;
        return Math.floor(((Number.isFinite(lvl) ? lvl : 1) - 1) / 4) + 2;
    }
    return choiceCount;
}

/**
 * Schritt 7: Icon wenn Zähler < Nenner (offenes Zauber-Kontingent).
 */
function syncLevelUpStep7NewChoiceIcons() {
    if (!isLevelUpMode()) return;
    const root = document.getElementById("step7");
    if (!root) return;

    clearLevelUpNewChoiceIcons(root);

    const features = (typeof applicableMagicFeatures !== "undefined" && Array.isArray(applicableMagicFeatures))
        ? applicableMagicFeatures
        : [];

    root.querySelectorAll('input[name="spellChoice"]').forEach(radio => {
        if (!levelUpIsElementVisible(radio)) return;
        if (levelUpIsControlLockedForNewChoice(radio)) return;

        const featureId = radio.value;
        const feature = features.find(f => String(f.ID) === String(featureId));
        if (!feature) return;
        if (typeof isLevelUpLockedSpellFeature === "function" && isLevelUpLockedSpellFeature(feature)) {
            return;
        }

        const quota = levelUpGetSpellFeatureChoiceQuota(feature);
        if (quota == null) return;

        const selected = (typeof spellChoicesByFeature !== "undefined"
            && spellChoicesByFeature[featureId])
            ? spellChoicesByFeature[featureId].size
            : 0;

        if (selected >= quota) return;

        const host = levelUpFindInputIconHost(radio);
        if (host) levelUpAttachNewChoiceIcon(host);
    });
}

/** Orchestriert Step-6- und Step-7-Indikatoren. */
function syncLevelUpNewChoiceIndicators() {
    if (!isLevelUpMode()) return;
    syncLevelUpStep6NewChoiceIcons();
    syncLevelUpStep7NewChoiceIcons();
}

/** Einmalige Event-Delegation für Live-Updates. */
function ensureLevelUpNewChoiceListeners() {
    if (!isLevelUpMode()) return;
    if (window.__levelUpNewChoiceListenersBound) return;
    window.__levelUpNewChoiceListenersBound = true;

    const onChange = (event) => {
        if (!isLevelUpMode()) return;
        const t = event.target;
        if (!t) return;
        if (t.closest("#step6")) {
            setTimeout(() => syncLevelUpStep6NewChoiceIcons(), 0);
            return;
        }
        if (t.closest("#step7")) {
            setTimeout(() => syncLevelUpStep7NewChoiceIcons(), 0);
        }
    };

    document.addEventListener("change", onChange, true);
    document.addEventListener("input", onChange, true);
}

/** true = Unterklasse bereits festgelegt (PHB-Nummer oder Custom-Slug). */
function isLevelUpSubclassFixed() {
    const snap = getLevelUpSnapshot();
    if (snap?.lockedContent?.subclassSlug != null && snap.lockedContent.subclassSlug !== "") {
        return true;
    }
    const sc = character?.classForm?.subclass;
    return sc != null && sc !== "";
}

/** M3: Controls für Stufen ≤ entryLevel sperren. */
function applyLevelUpStep6Locks() {
    if (!isLevelUpMode()) return;
    const entry = getLevelUpEntryLevel();
    const root = document.getElementById("step6");
    if (!root) return;

    root.querySelectorAll(".level-up-lock-badge").forEach(el => el.remove());
    root.querySelectorAll(".level-up-lock-control-wrap").forEach(wrap => {
        // Alt-Wraps aus früherer Badge-Logik auflösen
        while (wrap.firstChild) wrap.parentNode.insertBefore(wrap.firstChild, wrap);
        wrap.remove();
    });
    root.querySelectorAll(".level-up-field-locked").forEach(el => {
        el.classList.remove("level-up-field-locked");
        if (el.tagName !== "INPUT" || el.type !== "radio" || !isLevelUpSubclassFixed()) {
            el.disabled = false;
        }
    });

    // Unterklasse bereits gewählt (PHB oder Custom) → fest + Schloss am gewählten Label + kein +
    if (isLevelUpSubclassFixed()) {
        root.querySelectorAll('input[name="subclass"]').forEach(radio => {
            radio.disabled = true;
            radio.classList.add("level-up-field-locked");
            if (radio.checked) levelUpAttachLockBadgeToRadioLabel(radio);
        });
        const addScWrap = document.getElementById("addCustomSubclassWrap");
        if (addScWrap) {
            addScWrap.classList.add("level-up-subclass-add-hidden");
            addScWrap.setAttribute("aria-hidden", "true");
        }
    } else {
        const addScWrap = document.getElementById("addCustomSubclassWrap");
        if (addScWrap) addScWrap.classList.remove("level-up-subclass-add-hidden");
    }

    // Selects nur disablen — Schloss kommt aus globalem select:disabled-CSS (kein Extra-Badge)
    // Radios/Checkboxen: Klasse + ggf. Schloss am gewählten Label
    const lockControl = (el) => {
        if (!el) return;
        el.disabled = true;
        el.classList.add("level-up-field-locked");
        if (el.tagName === "INPUT" && el.type === "radio" && el.checked) {
            levelUpAttachLockBadgeToRadioLabel(el);
        }
    };

    // Tauschbare Merkmale (Metamagie, Anrufungen, …) nicht sperren
    const maybeLockControl = (el) => {
        if (isLevelUpStep6SwappableControl(el)) return;
        lockControl(el);
    };

    for (const improvementDiv of root.querySelectorAll('[id^="improvement-option-"]')) {
        const m = improvementDiv.id.match(/improvement-option-(\d+)/);
        if (!m) continue;
        const featLvl = parseInt(m[1], 10);
        if (!Number.isFinite(featLvl) || featLvl > entry) continue;
        improvementDiv.querySelectorAll("select, input, textarea, button").forEach(maybeLockControl);
    }

    root.querySelectorAll("select, textarea").forEach(el => {
        if (el.closest('[id^="improvement-option-"]')) return;
        const featMatch = el.name && /^feats(\d+)$/.exec(el.name);
        if (featMatch) {
            const featLvl = parseInt(featMatch[1], 10);
            if (featLvl <= entry) {
                // Anrufungs-Herkunftstalent: nur sperren wenn aus Snapshot hydriert (nicht nach Tausch neu)
                const invFeatWrap = el.closest(".invocation-feat-selection");
                if (invFeatWrap) {
                    if (invFeatWrap.dataset.levelUpInvocationFeatLocked === "1") {
                        lockControl(el);
                    }
                } else {
                    maybeLockControl(el);
                }
            }
            return;
        }

        let labelEl = null;
        if (el.id) {
            labelEl = root.querySelector(`label[for="${el.id}"]`);
            if (!labelEl && el.id === "skill1") labelEl = document.getElementById("chooseSkillLabelA");
            if (!labelEl && el.id === "skill2") labelEl = document.getElementById("chooseSkillLabelB");
        }
        if (!labelEl) {
            const prev = el.previousElementSibling;
            if (prev && prev.tagName === "LABEL") labelEl = prev;
        }
        const controlLevel = levelUpParseControlLevelFromLabel(labelEl);
        if (controlLevel != null && controlLevel <= entry) {
            maybeLockControl(el);
        }
    });

    // Barbar Urwissen (skill0): Label nutzt „(Stufe: 3)“ — zusätzlich per ID sperren
    const skill0 = document.getElementById("skill0");
    if (skill0 && entry >= 3) {
        lockControl(skill0);
    }

    // Mönch Instrument/Werkzeug: Radios haben kein Stufen-Label — Dropdown allein war gesperrt
    if (entry >= 1) {
        ["monkInstrumentRadio", "monkToolRadio"].forEach(id => {
            const radio = document.getElementById(id);
            if (radio && root.contains(radio)) lockControl(radio);
        });
    }

    // UC-Folgeauswahlen (Land, Star Map, Manöver, …): data-feature-level aus Merkmalsstufe
    root.querySelectorAll("#dynamicSubclassContent select[data-feature-level], #dynamicSubclassContent textarea[data-feature-level]").forEach(el => {
        if (isLevelUpStep6SwappableControl(el)) return;
        const featLvl = parseInt(el.dataset.featureLevel, 10);
        if (Number.isFinite(featLvl) && featLvl <= entry) {
            maybeLockControl(el);
        }
    });

    // Lektionen der Ältesten: Unterauswahl (Herkunftstalent + Kaskade) sperren — Anrufung bleibt tauschbar
    root.querySelectorAll(
        '.invocation-feat-selection[data-level-up-invocation-feat-locked="1"] select, '
        + '.invocation-feat-selection[data-level-up-invocation-feat-locked="1"] input, '
        + '.invocation-feat-selection[data-level-up-invocation-feat-locked="1"] textarea'
    ).forEach(lockControl);
}

/** Hook nach goToStep(6) / refreshStep6ForLevelUp im Level-Up-Modus. */
function onLevelUpStep6Ready() {
    if (!isLevelUpMode()) return;
    // LEVEL-UP RECONSTRUCTION ONLY — stumme Daten vor UI-Hydration
    applyLevelUpReconstructionData();
    hydrateStep6FromClassForm();
    // Skills zuerst gesetzt → Expertise-Optionen neu, dann Expertise-Werte erneut setzen
    if (typeof updateSkills === "function") updateSkills();
    if (typeof populateExpertiseOptions === "function") populateExpertiseOptions();
    if (typeof reapplyFeatRadioDropdowns === "function") {
        reapplyFeatRadioDropdowns();
    } else if (typeof reapplyLevelUpSkilledFeatDropdowns === "function") {
        reapplyLevelUpSkilledFeatDropdowns();
    }
    reapplyInvocationFeatNestedProficiencies();
    reapplyClassFormDependentStep6Selects();
    setTimeout(() => {
        reapplyLevelUpFeatWeaponMasteryDropdowns();
        syncLevelUpStep6NewChoiceIcons();
    }, 0);
    if (typeof applyPassiveClassFeatures === "function") applyPassiveClassFeatures();
    seedLevelUpAttributeBasesFromTotals();
    if (typeof updateLiveAttributes === "function") updateLiveAttributes();
    applyLevelUpStep6Locks();
    applyLevelUpCustomBibRestrictions();
    if (typeof refreshAllMagicInitiateSpellListDropdowns === "function") {
        refreshAllMagicInitiateSpellListDropdowns();
    }
    // Nach Locks erneut: Info-Box unter Ordnung-Selects (Hydration setzt nur den Wert)
    reapplyOrderSelectionInfoFromDom();
    ensureLevelUpNewChoiceListeners();
    syncLevelUpNewChoiceIndicators();
}

/**
 * Select-Werte, die von Skill-Übungen abhängen (Expertise, Klassen-Waffenmeisterschaft, Freiwahlen),
 * nach Options-Rebuild erneut aus classForm setzen.
 */
function reapplyClassFormDependentStep6Selects() {
    if (typeof character === "undefined") return;
    const cf = character.classForm;
    if (!cf || typeof cf !== "object") return;
    const root = document.getElementById("step6");
    if (!root) return;

    if (Array.isArray(cf.expertise)) {
        levelUpApplyClassFormArray("expertise", cf.expertise, root);
    }
    if (Array.isArray(cf.weaponMastery)) {
        levelUpApplyClassFormArray("weaponMastery", cf.weaponMastery, root);
    }
    if (Array.isArray(cf.freeChoices)) {
        levelUpApplyClassFormArray("freeChoice", cf.freeChoices, root);
    }
}

/** @deprecated Alias — Level-Up nutzt reapplyClassFormDependentStep6Selects */
function reapplyLevelUpDependentStep6Selects() {
    if (!isLevelUpMode()) return;
    reapplyClassFormDependentStep6Selects();
}

/** Stufe, auf der ein Klassen-Merkmal laut classData freigeschaltet wird (z. B. Mystisches Arkanum Stufe 11). */
function getClassMagicFeatureGrantLevel(feature) {
    if (!feature || !character?.class) return null;

    let classData = null;
    if (typeof getClassData === "function") {
        classData = getClassData(String(character.class).toLowerCase());
    } else if (typeof getClassDataArray === "function") {
        classData = getClassDataArray(character.class);
    }
    if (!Array.isArray(classData)) return null;

    const primaryLabel = Array.isArray(feature.translationLabel)
        ? feature.translationLabel[0]
        : feature.translationLabel;
    if (!primaryLabel) return null;

    const subclassId = parseInt(character.classForm?.subclass, 10) || 0;
    const row = classData.find(cf =>
        cf.translationLabel === primaryLabel
        && (cf.subclassCategoryNumber === 0 || cf.subclassCategoryNumber === subclassId)
    );
    const lvl = row ? parseInt(row.level, 10) : NaN;
    return Number.isFinite(lvl) ? lvl : null;
}

function levelUpResolveMagicFeatureLabel(feature) {
    if (typeof resolveMagicFeatureTranslationLabel === "function") {
        return resolveMagicFeatureTranslationLabel(feature);
    }
    const tl = feature?.translationLabel;
    return Array.isArray(tl) ? tl[0] : tl;
}

/** Merkmal-Slot muss zum Spell-Typ passen (Trick vs. Grad-Zauber). */
function levelUpFeatureAcceptsSpellKind(feature, isCantrip) {
    const levels = feature?.chooseNonSpecific_sl;
    if (!levels || levels === 0) return true;
    const levelList = Array.isArray(levels) ? levels : [levels];
    if (!levelList.length) return true;
    const acceptsCantrip = levelList.includes("cantripLabel");
    const onlyCantrips = levelList.length === 1 && acceptsCantrip;
    if (isCantrip) return acceptsCantrip;
    if (onlyCantrips) return false;
    return true;
}

/** Zuordnung gespeicherter Zauber-Quelle → Schritt-7-Merkmal (Restore + Save-Fallback). */
function levelUpFeatureMatchesSpellSource(feature, source, isCantrip, favoredOnly) {
    if (!feature || !source || !feature.chooseNonSpecificSpell_a) return false;
    if (!levelUpFeatureAcceptsSpellKind(feature, isCantrip)) return false;
    if (favoredOnly && feature.chooseType !== 2 && feature.chooseType !== 3) return false;
    if (!favoredOnly && feature.chooseType === 2) return false;

    if (source.type === "Volk") {
        if (!(typeof isSpeciesSpellFeature === "function" && isSpeciesSpellFeature(feature))
            && !feature.isCustomSpecies
            && !String(feature.ID || "").startsWith("speciesTrait-")) {
            return false;
        }
        const label = levelUpResolveMagicFeatureLabel(feature);
        if (source.name === label) return true;
        if (source.name === "speciesSpellsLabel") return true;
        if (String(feature.ID || "").startsWith("speciesTrait-")) {
            const traitId = String(feature.ID).slice("speciesTrait-".length);
            return source.name === traitId || source.name === label;
        }
        return false;
    }

    if (source.type === "Talent") {
        if (feature.sourceFeatLabel !== source.name) return false;
        if (source.name === "magicInitiateLabel" && source.spellList) {
            const resolved = (typeof resolveMagicInitiateSpellListClassKey === "function")
                ? resolveMagicInitiateSpellListClassKey(feature, character)
                : null;
            if (!resolved) return true;
            return String(resolved).toLowerCase() === String(source.spellList).replace(/Label$/i, "").toLowerCase();
        }
        return true;
    }

    if (source.type === "Klasse") {
        if (feature.sourceFeatLabel
            || (typeof isSpeciesSpellFeature === "function" && isSpeciesSpellFeature(feature))
            || feature.isCustomSpecies) {
            return false;
        }
        if (feature.ID === "classCantrips") {
            return isCantrip && source.name === "classCantripsLabel";
        }
        if (feature.ID === "classPreparedSpells") {
            return !isCantrip && source.name === "classPreparedSpellsLabel";
        }
        const label = levelUpResolveMagicFeatureLabel(feature);
        const primaryLabel = Array.isArray(feature.translationLabel)
            ? feature.translationLabel[0]
            : feature.translationLabel;
        return source.name === label || source.name === primaryLabel;
    }
    return false;
}

function findMagicFeatureForRestoredSpell(entry, applicableFeatures) {
    if (!entry?.source || !Array.isArray(applicableFeatures)) return null;

    let best = null;
    for (const feature of applicableFeatures) {
        if (!levelUpFeatureMatchesSpellSource(
            feature,
            entry.source,
            !!entry.isCantrip,
            !!entry.favoredOnly
        )) {
            continue;
        }
        const label = levelUpResolveMagicFeatureLabel(feature);
        if (entry.source.name === label) return feature;
        if (!best) best = feature;
    }
    return best;
}

/** Priorität bei Zauberbuch-Restore: spezifische Merkmale vor dem Haupt-Zauberwirken. */
function levelUpSpellbookFeatureRestorePriority(feature) {
    const id = String(feature.ID || "");
    const tl = Array.isArray(feature.translationLabel)
        ? feature.translationLabel.join("|")
        : String(feature.translationLabel || "");
    if (tl.includes("spellcastingLabel")) return 1000;
    if (id.startsWith("savant-additional-spells-")) return 100;
    if (feature.chooseNonSpecificSpell_ss && feature.chooseNonSpecificSpell_ss !== 0) return 10;
    return 500;
}

function levelUpCountWizardSpellTiersAtLevel(classData, level) {
    const row = (classData || []).find(e =>
        e.level === level && (e.subclassCategoryNumber === 0 || e.subclassCategoryNumber == null)
    );
    if (!row) return 0;
    let count = 0;
    for (let i = 1; i <= 9; i++) {
        if (row[`SSpSL${i}`] > 0) count++;
    }
    return count;
}

/** Erste Stufe, an der Savant-Zusatz-Zauber (dynamisches Merkmal) freigeschaltet werden. */
function getWizardSavantAdditionalGrantLevel(subclassNumber) {
    if (!character?.class || String(character.class).toLowerCase() !== "wizard") return null;
    const classData = (typeof getClassData === "function")
        ? getClassData("wizard")
        : null;
    if (!Array.isArray(classData)) return null;

    const savantLabels = {
        1: "abjurationSavantLabel",
        2: "divinationSavantLabel",
        3: "evocationSavantLabel",
        4: "illusionSavantLabel"
    };
    const label = savantLabels[parseInt(subclassNumber, 10)];
    if (!label) return null;

    const savantRow = classData.find(cf =>
        cf.translationLabel === label
        && cf.subclassCategoryNumber === parseInt(subclassNumber, 10)
    );
    if (!savantRow) return null;

    const obtainedAt = parseInt(savantRow.level, 10);
    if (!Number.isFinite(obtainedAt)) return null;

    const tiersAtObtained = levelUpCountWizardSpellTiersAtLevel(classData, obtainedAt);
    for (let lvl = obtainedAt + 1; lvl <= 20; lvl++) {
        if (levelUpCountWizardSpellTiersAtLevel(classData, lvl) > tiersAtObtained) {
            return lvl;
        }
    }
    return null;
}

function levelUpSpellMatchesBookFeature(spell, feature) {
    if (!spell || spell.spellLevel === "cantripLabel") return false;
    if (!feature?.chooseNonSpecificSpell_a) return false;
    return (typeof spellPassesStep7FreeChoiceFilters === "function")
        ? spellPassesStep7FreeChoiceFilters(spell, {
            classSource: feature.chooseNonSpecificSpell_c,
            levelSource: feature.chooseNonSpecific_sl,
            schoolSource: feature.chooseNonSpecificSpell_ss,
            ritualSource: feature.chooseNonSpecificSpell_sf
        })
        : false;
}

/**
 * Zauberbuch-IDs auf mehrere chooseType-0-Merkmale verteilen (Savant + Zauberwirken).
 * Bevorzugt stumme Blob-Daten; Heuristik nur für fehlende / alte Bögen.
 */
function distributeSpellbookPoolHeuristic(pool, list, features) {
    if (!pool.length) return;

    features.forEach(feature => {
        const quota = levelUpGetSpellFeatureChoiceQuota(feature);
        if (quota == null) return;

        const assigned = [];
        for (let i = 0; i < pool.length && assigned.length < quota; i++) {
            const spellId = pool[i];
            const spell = list.find(s => s.ID === spellId);
            if (!spell || !levelUpSpellMatchesBookFeature(spell, feature)) continue;
            assigned.push(spellId);
        }

        if (!assigned.length) return;
        if (!spellChoicesByFeature[feature.ID]) {
            spellChoicesByFeature[feature.ID] = new Set();
        }
        assigned.forEach(spellId => {
            if (spellChoicesByFeature[feature.ID].size >= quota) return;
            if (spellChoicesByFeature[feature.ID].has(spellId)) return;
            spellChoicesByFeature[feature.ID].add(spellId);
            const idx = pool.indexOf(spellId);
            if (idx >= 0) pool.splice(idx, 1);
        });
    });
}

/** Blob-first: gespeicherte Merkmals-Zuordnung aus levelUpReconstruction. */
function restoreLevelUpSpellbookChoicesFromBlob(bookIds, pool, list, features) {
    const recon = getLevelUpReconstructionData();
    const blobBook = recon?.spellbookChoicesByFeature;
    if (!blobBook || typeof blobBook !== "object") return false;

    const bookIdSet = new Set(bookIds);
    let restoredAny = false;

    features.forEach(feature => {
        const key = resolveSpellFeatureRestoreKey(feature);
        const saved = blobBook[key];
        if (!Array.isArray(saved) || !saved.length) return;

        const quota = levelUpGetSpellFeatureChoiceQuota(feature);
        if (quota == null) return;

        saved.forEach(rawId => {
            const spellId = parseInt(rawId, 10);
            if (isNaN(spellId) || !bookIdSet.has(spellId)) return;

            const spell = list.find(s => s.ID === spellId);
            if (spell && !levelUpSpellMatchesBookFeature(spell, feature)) return;

            if (!spellChoicesByFeature[feature.ID]) {
                spellChoicesByFeature[feature.ID] = new Set();
            }
            if (spellChoicesByFeature[feature.ID].size >= quota) return;
            if (spellChoicesByFeature[feature.ID].has(spellId)) return;

            spellChoicesByFeature[feature.ID].add(spellId);
            restoredAny = true;
            const idx = pool.indexOf(spellId);
            if (idx >= 0) pool.splice(idx, 1);
        });
    });

    return restoredAny;
}

function restoreLevelUpSpellbookChoices(runtimeSpellList) {
    if (typeof characterUsesSpellbook !== "function" || !characterUsesSpellbook(character)) return;

    const bookIds = (character.spellbookSpells || [])
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id));
    if (!bookIds.length) return;

    const list = runtimeSpellList
        || ((typeof getEffectiveSpellList === "function") ? getEffectiveSpellList() : []);

    const features = (Array.isArray(applicableMagicFeatures) ? applicableMagicFeatures : [])
        .filter(f => {
            const quota = parseInt(f.chooseNonSpecificSpell_a, 10);
            return f.chooseType === 0 && Number.isFinite(quota) && quota > 0;
        })
        .slice()
        .sort((a, b) => levelUpSpellbookFeatureRestorePriority(a) - levelUpSpellbookFeatureRestorePriority(b));

    const pool = bookIds.slice();

    restoreLevelUpSpellbookChoicesFromBlob(bookIds, pool, list, features);
    distributeSpellbookPoolHeuristic(pool, list, features);
}

/** Nach Restore nur ↑-Icons synchronisieren — Zähler bleiben beim Radio-Klick wie zuvor. */
function refreshLevelUpSpellChoiceUiAfterRestore() {
    if (!isLevelUpMode()) return;
    if (typeof syncLevelUpStep7NewChoiceIcons === "function") {
        syncLevelUpStep7NewChoiceIcons();
    }
}

/**
 * Gesperrte Begünstigte aus Snapshot nachziehen, falls UI-Restore sie nicht in spellChoicesByFeature hatte.
 */
function mergeLevelUpPreservedFavoredSpellEntries(finalFavoredMap, priorFavoredEntries) {
    if (!finalFavoredMap || !Array.isArray(priorFavoredEntries)) return;
    const features = (typeof applicableMagicFeatures !== "undefined" && Array.isArray(applicableMagicFeatures))
        ? applicableMagicFeatures
        : [];

    priorFavoredEntries.forEach(entry => {
        const spellId = parseInt(entry?.spellId, 10);
        if (!spellId || finalFavoredMap.has(spellId)) return;
        if (!entry?.source || entry.source.type !== "Klasse") return;

        const feature = findMagicFeatureForRestoredSpell(
            { source: entry.source, isCantrip: false, favoredOnly: true },
            features
        );
        if (!feature || typeof isLevelUpLockedSpellFeature !== "function") return;
        if (!isLevelUpLockedSpellFeature(feature)) return;
        finalFavoredMap.set(spellId, entry.source);
    });
}

/** Zauber-Merkmal gesperrt (Volk / vorbestehende Talente)? */
function isLevelUpLockedSpellFeature(feature) {
    if (!isLevelUpMode() || !feature) return false;
    // Ausnahme-Liste: z. B. Ritualwirker (PB), Blessed/Druidic Warrior (Tausch)
    if (isLevelUpStep7UnlockedSpellFeature(feature)) return false;
    if (typeof isSpeciesSpellFeature === "function" && isSpeciesSpellFeature(feature)) return true;
    if (feature.isCustomSpecies) return true;
    if (String(feature.ID || "").startsWith("speciesTrait-")) return true;

    if (feature.sourceFeatLabel) {
        const origin = feature.featOrigin;
        if (origin === "background" || origin === "species") return true;
        if (origin === "class") {
            const lvl = parseInt(feature.featLevel, 10);
            const entry = getLevelUpEntryLevel();
            return Number.isFinite(lvl) && lvl <= entry;
        }
        // Ohne Origin-Metadaten: nicht pauschal sperren (neue Klassen-MI freigeben)
        // Fallback: Feature-ID Index gegen Snapshot-Feats prüfen
        const m = String(feature.ID || "").match(/^feat-(\d+)-\d+-(\d+)$/);
        if (m) {
            const featId = parseInt(m[1], 10);
            const orderIndex = parseInt(m[2], 10);
            const bgId = parseInt(character?.feat_background, 10);
            const speciesIds = (typeof normalizeFeatSpeciesIds === "function")
                ? normalizeFeatSpeciesIds(character?.feat_species)
                : [];
            let idx = 0;
            if (!isNaN(bgId) && bgId > 0) {
                if (orderIndex === idx && featId === bgId) return true;
                idx++;
            }
            for (let s = 0; s < speciesIds.length; s++) {
                if (orderIndex === idx && featId === speciesIds[s]) return true;
                idx++;
            }
            const classFeats = character?.classForm?.feats || [];
            const classPos = orderIndex - idx;
            if (classPos >= 0 && classPos < classFeats.length) {
                const fe = classFeats[classPos];
                const featLvl = parseInt(fe?.level, 10);
                return Number.isFinite(featLvl) && featLvl <= getLevelUpEntryLevel();
            }
        }
        return false;
    }

    // Klassen-Begünstigte (Mystisches Arkanum, Anrufungs-Zauber, …): sperren wenn bereits gewählt
    // und Merkmalsstufe ≤ Ausgangsstufe (neue Stufe 10→11 bleibt wählbar).
    if ((feature.chooseType === 2 || feature.chooseType === 3)
        && !feature.sourceFeatLabel
        && !(typeof isSpeciesSpellFeature === "function" && isSpeciesSpellFeature(feature))
        && !feature.isCustomSpecies) {
        const grantLvl = getClassMagicFeatureGrantLevel(feature);
        const entry = getLevelUpEntryLevel();
        if (!Number.isFinite(grantLvl) || grantLvl > entry) return false;

        const label = levelUpResolveMagicFeatureLabel(feature);
        const primaryLabel = Array.isArray(feature.translationLabel)
            ? feature.translationLabel[0]
            : feature.translationLabel;
        const inFavored = (character.favoredSpells || []).some(e =>
            e?.source?.type === "Klasse"
            && (e.source.name === label || e.source.name === primaryLabel)
        );
        if (inFavored) return true;

        const quota = levelUpGetSpellFeatureChoiceQuota(feature);
        const restored = (typeof spellChoicesByFeature !== "undefined"
            && spellChoicesByFeature[feature.ID])
            ? spellChoicesByFeature[feature.ID].size
            : 0;
        return quota != null && restored >= quota;
    }

    // Zauberbuch-Unterauswahl (Savant aller UC): Haupt-Zauberwirken bleibt editierbar.
    if (feature.chooseType === 0
        && !feature.sourceFeatLabel
        && !(typeof isSpeciesSpellFeature === "function" && isSpeciesSpellFeature(feature))
        && !feature.isCustomSpecies) {
        const primaryLabel = Array.isArray(feature.translationLabel)
            ? feature.translationLabel[0]
            : feature.translationLabel;
        if (primaryLabel && String(primaryLabel).includes("spellcastingLabel")) {
            return false;
        }

        let grantLvl = getClassMagicFeatureGrantLevel(feature);
        const additionalMatch = String(feature.ID || "").match(/^savant-additional-spells-(\d+)$/);
        if (additionalMatch) {
            grantLvl = getWizardSavantAdditionalGrantLevel(parseInt(additionalMatch[1], 10));
        }
        const entry = getLevelUpEntryLevel();
        if (!Number.isFinite(grantLvl) || grantLvl > entry) return false;

        const quota = levelUpGetSpellFeatureChoiceQuota(feature);
        const restored = (typeof spellChoicesByFeature !== "undefined"
            && spellChoicesByFeature[feature.ID])
            ? spellChoicesByFeature[feature.ID].size
            : 0;
        return quota != null && restored >= quota;
    }

    return false;
}

/**
 * M4: spellChoicesByFeature aus character.cantrips/spells/favored/spellbook rekonstruieren.
 * Muss nach applicableMagicFeatures in populateSpells() laufen.
 */
function restoreLevelUpSpellChoices() {
    if (!isLevelUpMode() || typeof character === "undefined") return;
    if (typeof applicableMagicFeatures === "undefined") return;

    spellChoicesByFeature = {};

    const runtimeSpellList = (typeof getEffectiveSpellList === "function")
        ? getEffectiveSpellList()
        : (typeof spellList !== "undefined" ? spellList : []);

    const entries = [];
    (character.cantrips || []).forEach(entry => {
        if (entry && entry.spellId != null) {
            entries.push({ spellId: parseInt(entry.spellId, 10), source: entry.source, isCantrip: true });
        }
    });
    (character.spells || []).forEach(entry => {
        if (entry && entry.spellId != null) {
            entries.push({ spellId: parseInt(entry.spellId, 10), source: entry.source, isCantrip: false });
        }
    });
    (character.favoredSpells || []).forEach(entry => {
        if (entry && entry.spellId != null) {
            entries.push({ spellId: parseInt(entry.spellId, 10), source: entry.source, isCantrip: false, favoredOnly: true });
        }
    });

    // Begünstigte zuerst — gleicher spellId darf mehreren Merkmalen gehören (z. B. Vorbereitet + Arkanum).
    entries.sort((a, b) => (b.favoredOnly ? 1 : 0) - (a.favoredOnly ? 1 : 0));

    entries.forEach(entry => {
        if (!entry.spellId) return;
        const matched = findMagicFeatureForRestoredSpell(entry, applicableMagicFeatures);
        if (!matched) return;
        if (!spellChoicesByFeature[matched.ID]) {
            spellChoicesByFeature[matched.ID] = new Set();
        }
        if (spellChoicesByFeature[matched.ID].has(entry.spellId)) return;
        spellChoicesByFeature[matched.ID].add(entry.spellId);
    });

    if (typeof characterUsesSpellbook === "function" && characterUsesSpellbook(character)) {
        restoreLevelUpSpellbookChoices(runtimeSpellList);
    }

    if (typeof refreshLevelUpSpellChoiceUiAfterRestore === "function") {
        refreshLevelUpSpellChoiceUiAfterRestore();
    }
}

/** M4: Schritt-7-UI — Volk/Talent-Merkmale nicht editierbar + Schloss. */
function applyLevelUpStep7Locks() {
    if (!isLevelUpMode()) return;
    document.querySelectorAll("#step7 .level-up-lock-badge").forEach(el => el.remove());

    document.querySelectorAll('#step7 input[name="spellChoice"]').forEach(radio => {
        const featureId = radio.value;
        const feature = (typeof applicableMagicFeatures !== "undefined" ? applicableMagicFeatures : [])
            .find(f => String(f.ID) === String(featureId));
        if (!(feature && isLevelUpLockedSpellFeature(feature))) return;

        radio.disabled = true;
        radio.classList.add("level-up-field-locked");
        levelUpAttachLockBadgeToRadioLabel(radio);

        const item = radio.closest(".spell-feature-item");
        if (item) {
            item.classList.add("level-up-field-locked");
            item.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(inp => {
                inp.disabled = true;
                inp.classList.add("level-up-field-locked");
            });
        }
    });

    ensureLevelUpNewChoiceListeners();
    syncLevelUpStep7NewChoiceIcons();
}

/** M5: Custom-Bib — „Erstellen“ nur ausblenden, wenn der Bogen bereits eine Bib mitbringt. */
function levelUpSnapshotHasCustomBibRuntime(lsKey) {
    const snap = getLevelUpSnapshot();
    const raw = snap?.base?.[lsKey];
    if (raw == null || raw === "" || raw === "null") return false;
    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!parsed || typeof parsed !== "object") return false;
        const payload = parsed.payload && typeof parsed.payload === "object"
            ? parsed.payload
            : parsed;
        if (lsKey === "customSpellPackRuntime") {
            return Array.isArray(payload.spells) && payload.spells.length > 0;
        }
        if (lsKey === "customFeatPackRuntime") {
            return Array.isArray(payload.feats) && payload.feats.length > 0;
        }
        return Object.keys(payload).length > 0;
    } catch (e) {
        return false;
    }
}

/** M5: Custom-Bib — kein „Erstellen“, wenn Bogen die jeweilige Bib schon nutzt. */
function applyLevelUpCustomBibRestrictions() {
    if (!isLevelUpMode()) return;

    const spellBtn = document.getElementById("customSpellCreateNewBtn");
    if (spellBtn) {
        const hide = levelUpSnapshotHasCustomBibRuntime("customSpellPackRuntime");
        spellBtn.style.display = hide ? "none" : "";
    }

    const featBtn = document.getElementById("customFeatCreateNewBtn");
    if (featBtn) {
        const hide = levelUpSnapshotHasCustomBibRuntime("customFeatPackRuntime");
        featBtn.style.display = hide ? "none" : "";
    }
}

/** Schritt 7: Weiter-Button → Abschluss-Icon. */
function applyLevelUpStep7Navigation() {
    if (!isLevelUpMode()) return;
    const saveSpellsBtn = document.getElementById("saveSpells");
    if (!saveSpellsBtn) return;
    const icon = saveSpellsBtn.querySelector("img");
    if (icon) {
        icon.src = "images/finish.png";
        icon.alt = tLevelUp("levelUpFinishAriaLabel", "Stufenaufstieg abschließen");
    }
}

function stripLevelUpPage3FeatureOverrides(overrides) {
    const o = Object.assign({}, overrides || {});
    if (o.containers && typeof o.containers === "object") {
        o.containers = Object.assign({}, o.containers);
        delete o.containers.classFeatures;
        delete o.containers.subclassFeatures;
        delete o.containers.feats;
        // Volksmerkmale stufenabhängig neu berechnen (Zauberprogression, :LEVEL:-Gates)
        delete o.containers.speciesTraits;
    }
    return o;
}

/**
 * Override-Inputs an Level-Up-Ergebnis anpassen (sonst überschreibt alter overrides.level die neue Stufe).
 * Nur Regelwerte aus dem Merge — manuelle Overrides bleiben sonst erhalten.
 */
function syncLevelUpOverridesWithCharacter(overrides, character) {
    const o = overrides && typeof overrides === "object" ? overrides : {};
    o.inputs = Object.assign({}, o.inputs || {});
    if (!character) return o;

    o.inputs.level = String(character.level ?? o.inputs.level ?? 1);

    const scoreMap = {
        strengthScore: character.strengthTotalScore,
        dexterityScore: character.dexterityTotalScore,
        constitutionScore: character.constitutionTotalScore,
        intelligenceScore: character.intelligenceTotalScore,
        wisdomScore: character.wisdomTotalScore,
        charismaScore: character.charismaTotalScore
    };
    Object.keys(scoreMap).forEach(id => {
        if (scoreMap[id] != null && scoreMap[id] !== undefined && scoreMap[id] !== "") {
            o.inputs[id] = String(scoreMap[id]);
        }
    });

    return o;
}

/** Baut merged base aus character für Rückkehr zum Bogen. */
function buildLevelUpMergedBase(snapshotBase) {
    const b = Object.assign({}, snapshotBase || {});
    if (typeof character === "undefined") return b;

    b.level = String(character.level);
    b.ruleLevel = String(character.level);
    b.classForm = JSON.stringify(character.classForm || {});
    b.spellcastingAbility_talent = JSON.stringify(character.spellcastingAbility_talent || []);
    b.spellbookSpells = JSON.stringify(character.spellbookSpells || []);
    b.cantrips = JSON.stringify(character.cantrips || []);
    b.preparedSpells = JSON.stringify(character.spells || []);
    b.favoredSpells = JSON.stringify(character.favoredSpells || []);
    b.strengthScore = character.strengthTotalScore;
    b.dexterityScore = character.dexterityTotalScore;
    b.constitutionScore = character.constitutionTotalScore;
    b.intelligenceScore = character.intelligenceTotalScore;
    b.wisdomScore = character.wisdomTotalScore;
    b.charismaScore = character.charismaTotalScore;
    b.backgroundAttributeBonuses = JSON.stringify(character.backgroundAttributeBonuses || {});

    // LEVEL-UP RECONSTRUCTION ONLY — stummen Blob aktualisieren (ASI/Basen nach Stufenaufstieg)
    if (typeof buildLevelUpReconstructionPayload === "function") {
        b.levelUpReconstruction = JSON.stringify(buildLevelUpReconstructionPayload());
    }

    return b;
}

/**
 * Nach Level-Up immer frisch laden (kein bfcache / veralteter Bogen).
 */
function navigateToCharacterSheetAfterLevelUp() {
    try {
        sessionStorage.removeItem(DC_LEVEL_UP_SESSION_KEY);
        sessionStorage.removeItem(DC_CREATOR_MODE_KEY);
    } catch (e) { /* ignore */ }
    const stamp = Date.now();
    window.location.replace(`charakterbogen.html?fromLevelUp=${stamp}`);
}

/**
 * M6: Level-Up abschließen — Snapshot-Base + Level-Up-Patches → LocalStorage (wie Import).
 * Overrides: alles behalten außer Page-3 Klassen-/UC-/Talent-HTML.
 */
function finishLevelUp() {
    const snapshot = getLevelUpSnapshot();
    if (!snapshot) {
        navigateToCharacterSheetAfterLevelUp();
        return;
    }

    // Aktuelle Attribut-Gesamtwerte aus Schritt 6 (Live-Container) übernehmen
    if (typeof character !== "undefined" && typeof attributeList !== "undefined") {
        attributeList.forEach(attr => {
            const stringId = attr.translationLabel.replace("Label", "");
            const liveInput = document.getElementById(`live-${stringId}TotalScore`);
            if (!liveInput || liveInput.value === "") return;
            const total = parseInt(liveInput.value, 10);
            if (Number.isFinite(total)) {
                character[`${stringId}TotalScore`] = total;
            }
        });
    }

    const entry = getLevelUpEntryLevel();
    const target = character?.level ?? getLevelUpTargetLevel();

    if (target <= entry) {
        restoreCharacterSheetFromLevelUpSnapshot();
        return;
    }

    if (typeof syncClassFormFreeChoicesFromDom === "function") {
        syncClassFormFreeChoicesFromDom();
    }

    // Basis = Export/Snapshot, dann Level-Up-Felder (Stufe, classForm, Zauber, Attribute, …)
    const mergedBase = buildLevelUpMergedBase(snapshot.base);
    let mergedOverrides = stripLevelUpPage3FeatureOverrides(snapshot.overrides);
    mergedOverrides = syncLevelUpOverridesWithCharacter(mergedOverrides, character);
    mergedOverrides = syncLevelUpOverridesFromRuleData(mergedOverrides, character, snapshot.base, entry);

    const savedLang = localStorage.getItem("currentLanguage");
    localStorage.clear();
    if (savedLang) localStorage.setItem("currentLanguage", savedLang);

    Object.keys(mergedBase).forEach(key => {
        if (mergedBase[key] !== null && mergedBase[key] !== undefined) {
            localStorage.setItem(key, mergedBase[key]);
        }
    });

    if (snapshot.dcEnvelope?.packageId) {
        localStorage.setItem("dcCharacterPackageId", snapshot.dcEnvelope.packageId);
        if (snapshot.dcEnvelope.createdAt) {
            localStorage.setItem("dcCharacterPackageCreatedAt", snapshot.dcEnvelope.createdAt);
        }
    }

    localStorage.setItem(SHEET_OVERRIDES_STORAGE_KEY, JSON.stringify(mergedOverrides));
    localStorage.removeItem("import_overrides");

    if (typeof isRegisteredCustomClassSlug === "function"
        && isRegisteredCustomClassSlug(character.class)
        && typeof persistCustomClassRuntimeToLocalStorage === "function") {
        persistCustomClassRuntimeToLocalStorage();
    }
    if (typeof characterUsesRegisteredCustomSubclass === "function"
        && characterUsesRegisteredCustomSubclass(character)
        && typeof persistCustomSubclassRuntimeToLocalStorage === "function") {
        persistCustomSubclassRuntimeToLocalStorage();
    }
    if (typeof isRegisteredCustomBackgroundSlug === "function"
        && isRegisteredCustomBackgroundSlug(character.background)
        && typeof persistCustomBackgroundRuntimeToLocalStorage === "function") {
        persistCustomBackgroundRuntimeToLocalStorage();
    }
    if (typeof characterUsesRegisteredCustomSpellPack === "function"
        && characterUsesRegisteredCustomSpellPack(character)
        && typeof persistCustomSpellPackRuntimeToLocalStorage === "function") {
        persistCustomSpellPackRuntimeToLocalStorage();
    }
    if (typeof characterUsesRegisteredCustomFeatPack === "function"
        && characterUsesRegisteredCustomFeatPack(character)
        && typeof persistCustomFeatPackRuntimeToLocalStorage === "function") {
        persistCustomFeatPackRuntimeToLocalStorage();
    }
    if (typeof isRegisteredCustomSpeciesSlug === "function"
        && isRegisteredCustomSpeciesSlug(character.species)
        && typeof persistCustomSpeciesRuntimeToLocalStorage === "function") {
        persistCustomSpeciesRuntimeToLocalStorage();
    }

    navigateToCharacterSheetAfterLevelUp();
}
