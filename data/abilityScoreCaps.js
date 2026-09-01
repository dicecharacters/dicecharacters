// =============================================================================
// Attributsgrenzen (Cap-Raise) & Modifikator-Lookup
// Standard-Obergrenze: 20. Ausnahmen nur über ABILITY_SCORE_CAP_RAISE_SOURCES.
// Modifikatoren: modifierList in coreData.js (Werte 1–30).
// =============================================================================

const ABILITY_SCORE_DEFAULT_CAP = 20;
const ABILITY_SCORE_ABSOLUTE_MAX = 30;
const ABILITY_SCORE_MIN = 1;

/** Nur diese Labels dürfen die Standard-Obergrenze anheben. */
const ABILITY_SCORE_CAP_RAISE_SOURCES = [
    { id: "primalChampion", type: "classFeature", maxScore: 25, attributes: ["strength", "constitution"] },
    { id: "bodyAndMindLabel", type: "classFeature", maxScore: 25, attributes: ["dexterity", "wisdom"] },

    { id: "boonOfCombatProwessLabel", type: "epicBoon", maxScore: 30, attributes: "any" },
    { id: "boonOfDimensionalTravelLabel", type: "epicBoon", maxScore: 30, attributes: "any" },
    { id: "boonOfEnergyResistanceLabel", type: "epicBoon", maxScore: 30, attributes: "any" },
    { id: "boonOfFateLabel", type: "epicBoon", maxScore: 30, attributes: "any" },
    { id: "boonOfFortitudeLabel", type: "epicBoon", maxScore: 30, attributes: "any" },
    { id: "boonOfIrresistibleOffenseLabel", type: "epicBoon", maxScore: 30, attributes: ["strength", "dexterity"] },
    { id: "boonOfRecoveryLabel", type: "epicBoon", maxScore: 30, attributes: "any" },
    { id: "boonOfSkillLabel", type: "epicBoon", maxScore: 30, attributes: "any" },
    { id: "boonOfSpeedLabel", type: "epicBoon", maxScore: 30, attributes: "any" },
    { id: "boonOfSpellRecallLabel", type: "epicBoon", maxScore: 30, attributes: ["intelligence", "wisdom", "charisma"] },
    { id: "boonOfTheNightSpiritLabel", type: "epicBoon", maxScore: 30, attributes: "any" },
    { id: "boonOfTruesightLabel", type: "epicBoon", maxScore: 30, attributes: "any" }
];

const ABILITY_SCORE_EPIC_BOON_IDS = new Set(
    ABILITY_SCORE_CAP_RAISE_SOURCES.filter(s => s.type === "epicBoon").map(s => s.id)
);

/**
 * Modifikator für einen Attributswert (1–30) aus modifierList.
 * @param {number|string} score
 * @returns {number|null}
 */
function getModifierForScore(score) {
    const n = parseInt(score, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    const clamped = Math.max(ABILITY_SCORE_MIN, Math.min(ABILITY_SCORE_ABSOLUTE_MAX, n));
    if (typeof modifierList === "undefined" || !Array.isArray(modifierList)) return null;
    const entry = modifierList.find(m => m.score === clamped);
    return entry ? entry.modifier : null;
}

/**
 * Modifikator als Anzeigestring (+N / −N).
 * @param {number|null} modifier
 * @returns {string}
 */
function formatModifierDisplay(modifier) {
    if (modifier === null || modifier === undefined) return "?";
    if (modifier < -4) return "?";
    return modifier >= 0 ? `+${modifier}` : String(modifier);
}

/**
 * Modifikator-Anzeige direkt aus Attributswert.
 * @param {number|string} score
 * @returns {string}
 */
function formatModifierForScore(score) {
    return formatModifierDisplay(getModifierForScore(score));
}

/**
 * Begrenzt einen Attributswert auf [min, cap].
 * @param {number|string} score
 * @param {number} cap
 * @returns {number}
 */
function clampAbilityScore(score, cap) {
    const n = parseInt(score, 10);
    if (!Number.isFinite(n)) return 0;
    const maxCap = Number.isFinite(cap) ? cap : ABILITY_SCORE_DEFAULT_CAP;
    return Math.max(ABILITY_SCORE_MIN, Math.min(maxCap, n));
}

/**
 * @param {string} attributeId
 * @param {string[]|string} attributes
 * @returns {boolean}
 */
function attributeMatchesCapSource(attributeId, attributes) {
    if (attributes === "any") return true;
    if (Array.isArray(attributes)) return attributes.includes(attributeId);
    return false;
}

/**
 * @param {string} attrLabel z. B. strengthLabel
 * @returns {string} strength
 */
function labelToAttributeId(attrLabel) {
    return String(attrLabel || "").replace(/Label$/i, "");
}

/**
 * @param {object} feat
 * @returns {string[]}
 */
function getFeatEligibleAttributeIds(feat) {
    if (!feat || !feat.Get_attrImprovement || !Array.isArray(feat.Get_attrImprovement)) return [];
    return feat.Get_attrImprovement.map(labelToAttributeId);
}

/**
 * Gewähltes Attribut eines Talents (Dropdown / feste Zuweisung).
 * @param {object} feat
 * @param {string|number} featLevel
 * @param {object} character
 * @returns {string|null}
 */
function getFeatChosenAttributeId(feat, featLevel, character) {
    if (!feat) return null;
    const levelKey = String(featLevel);
    const sel = character?.featSelections?.[levelKey] || character?.featSelections?.[featLevel];

    if (sel?.attributeChoice) {
        return labelToAttributeId(sel.attributeChoice);
    }

    if (feat.Get_attrImprovement && feat.Get_attrImprovement.length === 1) {
        return labelToAttributeId(feat.Get_attrImprovement[0]);
    }

    if (typeof document !== "undefined") {
        const dropdown = document.querySelector(
            `.feat-ability-dropdown[data-feat-level="${levelKey}"]`
        );
        if (dropdown?.value) {
            return labelToAttributeId(dropdown.value);
        }
    }

    return null;
}

/**
 * Aktive Klassenmerkmals-Labels bis zum aktuellen Level.
 * @param {object} character
 * @param {object} [options]
 * @returns {string[]}
 */
function getActiveClassFeatureLabels(character, options = {}) {
    const level = options.level ?? character?.level ?? 1;
    const className = character?.class;
    if (!className || typeof getClassData !== "function") return [];

    const classData = options.classData
        || getClassData(String(className).toLowerCase(), "class")
        || [];

    let subclassNumber = options.subclassNumber;
    if (!Number.isFinite(subclassNumber)) {
        const radio = typeof document !== "undefined"
            ? document.querySelector('input[name="subclass"]:checked')
            : null;
        subclassNumber = radio
            ? (parseInt(radio.value, 10) || 0)
            : (parseInt(character?.classForm?.subclass, 10) || 0);
    }

    return classData
        .filter(f => {
            if (!f || f.level > level) return false;
            const sc = f.subclassCategoryNumber || 0;
            if (sc > 0 && sc !== subclassNumber) return false;
            return true;
        })
        .map(f => f.translationLabel)
        .filter(Boolean);
}

/**
 * Ausgewählte Talent-Labels inkl. Level-Zuordnung.
 * @param {object} character
 * @returns {Array<{label: string, level: string|number, feat: object|null}>}
 */
function collectSelectedFeatEntries(character) {
    const entries = [];
    const seen = new Set();

    const pushEntry = (label, level, feat) => {
        const key = `${level}:${label}`;
        if (!label || seen.has(key)) return;
        seen.add(key);
        entries.push({ label, level, feat: feat || null });
    };

    if (typeof document !== "undefined") {
        document.querySelectorAll('select[name^="feats"]').forEach(select => {
            const featId = parseInt(select.value, 10);
            if (!featId || typeof featList === "undefined") return;
            const feat = featList.find(f => f.ID === featId);
            if (feat) {
                const level = select.name.replace("feats", "");
                pushEntry(feat.translationLabel, level, feat);
            }
        });
    }

    const selections = character?.featSelections || {};
    Object.keys(selections).forEach(level => {
        const sel = selections[level];
        const featId = sel?.featId || sel?.feat;
        if (!featId || typeof featList === "undefined") return;
        const feat = featList.find(f => f.ID === parseInt(featId, 10));
        if (feat) pushEntry(feat.translationLabel, level, feat);
    });

    (character?.classForm?.feats || []).forEach(entry => {
        if (!entry?.feat || typeof featList === "undefined") return;
        const feat = featList.find(f => f.ID === parseInt(entry.feat, 10));
        if (feat) pushEntry(feat.translationLabel, entry.level, feat);
    });

    return entries;
}

/**
 * Custom-Klassenmerkmale mit abilityScoreCapRaise aus ClassData.
 * @param {object} character
 * @param {object} [options]
 * @returns {Array<{maxScore: number, attributes: string[]}>}
 */
function getCustomClassCapRaises(character, options = {}) {
    const className = character?.class;
    if (!className || typeof getClassData !== "function") return [];

    const level = options.level ?? character?.level ?? 1;
    const classData = options.classData
        || getClassData(String(className).toLowerCase(), "class")
        || [];

    let subclassNumber = options.subclassNumber;
    if (!Number.isFinite(subclassNumber)) {
        subclassNumber = parseInt(character?.classForm?.subclass, 10) || 0;
    }

    const raises = [];
    classData.forEach(feature => {
        if (!feature || feature.level > level) return;
        const sc = feature.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== subclassNumber) return;
        const capRaise = parseInt(feature.abilityScoreCapRaise, 10);
        if (!capRaise || capRaise <= ABILITY_SCORE_DEFAULT_CAP) return;
        const bonuses = feature.classAttributeBonuses;
        const attrs = bonuses && typeof bonuses === "object"
            ? Object.keys(bonuses)
            : [];
        if (!attrs.length) return;
        raises.push({ maxScore: capRaise, attributes: attrs });
    });
    return raises;
}

/**
 * Kontext für Cap-Berechnungen.
 * @param {object} character
 * @param {object} [options]
 * @returns {object}
 */
function buildAbilityScoreContext(character, options = {}) {
    const level = options.level ?? character?.level ?? 1;
    const classData = options.classData
        || (character?.class && typeof getClassData === "function"
            ? getClassData(String(character.class).toLowerCase(), "class")
            : null)
        || [];

    return {
        level,
        classData,
        activeClassFeatureLabels: getActiveClassFeatureLabels(character, { ...options, classData, level }),
        selectedFeatEntries: collectSelectedFeatEntries(character),
        customCapRaises: getCustomClassCapRaises(character, { ...options, classData, level })
    };
}

/**
 * Prüft, ob eine Cap-Raise-Quelle aktiv ist.
 * @param {object} source
 * @param {object} context
 * @param {string} attributeId
 * @returns {boolean}
 */
function isCapRaiseSourceActiveForAttribute(source, context, attributeId) {
    if (!source || !context) return false;
    const character = context.character || {};

    if (source.type === "classFeature") {
        return (context.activeClassFeatureLabels || []).includes(source.id)
            && attributeMatchesCapSource(attributeId, source.attributes);
    }

    if (source.type === "epicBoon") {
        const entries = (context.selectedFeatEntries || []).filter(e => e.label === source.id);
        if (!entries.length) return false;
        if (!attributeMatchesCapSource(attributeId, source.attributes)) return false;

        return entries.some(entry => {
            const chosen = getFeatChosenAttributeId(entry.feat, entry.level, character);
            return chosen === attributeId;
        });
    }

    return false;
}

/**
 * Effektive Obergrenze für ein Attribut.
 * @param {string} attributeId
 * @param {object} character
 * @param {object} [options]
 * @returns {number}
 */
function getEffectiveAbilityScoreCap(attributeId, character, options = {}) {
    const context = {
        ...buildAbilityScoreContext(character, options),
        character
    };

    let cap = ABILITY_SCORE_DEFAULT_CAP;

    ABILITY_SCORE_CAP_RAISE_SOURCES.forEach(source => {
        if (!isCapRaiseSourceActiveForAttribute(source, context, attributeId)) return;
        cap = Math.max(cap, source.maxScore);
    });

    (context.customCapRaises || []).forEach(raise => {
        if (!attributeMatchesCapSource(attributeId, raise.attributes)) return;
        cap = Math.max(cap, raise.maxScore);
    });

    return Math.min(cap, ABILITY_SCORE_ABSOLUTE_MAX);
}

/**
 * Obergrenze für ASI-/Talent-Erhöhungen (nicht für Klassenpassivboni).
 * @param {object|null} feat
 * @returns {number}
 */
function getFeatAsiScoreCap(feat) {
    if (!feat) return ABILITY_SCORE_DEFAULT_CAP;
    if (feat.translationLabel === "abilityScoreImprovementLabel") return ABILITY_SCORE_DEFAULT_CAP;
    if (feat.featCategoryNumber === 4 || ABILITY_SCORE_EPIC_BOON_IDS.has(feat.translationLabel)) {
        return ABILITY_SCORE_ABSOLUTE_MAX;
    }
    return ABILITY_SCORE_DEFAULT_CAP;
}

/**
 * Vorwärtsberechnung: Basis + Boni → geclampter Gesamtwert.
 * @param {object} components
 * @param {string} attributeId
 * @param {object} character
 * @param {object} [options]
 * @returns {number}
 */
function computeClampedAttributeTotal(components, attributeId, character, options = {}) {
    const base = parseInt(components.base, 10) || 0;
    const background = parseInt(components.background, 10) || 0;
    const feat = parseInt(components.feat, 10) || 0;
    const classBonus = parseInt(components.class, 10) || 0;
    const raw = base + background + feat + classBonus;
    const cap = getEffectiveAbilityScoreCap(attributeId, character, options);
    return clampAbilityScore(raw, cap);
}

/**
 * Verbleibender Spielraum bis zur effektiven Obergrenze.
 * @param {object} components ohne den zu prüfenden Bonus-Typ
 * @param {string} attributeId
 * @param {object} character
 * @param {number} scoreCap
 * @returns {number}
 */
function getRemainingAbilityScoreRoom(components, attributeId, character, scoreCap) {
    const base = parseInt(components.base, 10) || 0;
    const background = parseInt(components.background, 10) || 0;
    const feat = parseInt(components.feat, 10) || 0;
    const classBonus = parseInt(components.class, 10) || 0;
    const current = base + background + feat + classBonus;
    const cap = Number.isFinite(scoreCap)
        ? scoreCap
        : getEffectiveAbilityScoreCap(attributeId, character);
    return Math.max(0, cap - current);
}
