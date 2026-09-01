//=======================================================================
// Custom Subclass Builder (customFeatures/subclassBuilder.js)
//=======================================================================
// Eigenständige Unterklasse außerhalb des Klassen-Builders (Schritt 6).
// Nutzt Shared LF-Masken/Compile aus classBuilder.js (nach shared.js laden).
//
// Siehe auch: customFeatures/shared.js (Ordnerübersicht).
//=======================================================================

//=======================================================================
// CUSTOM_SUBCLASS_CONFIG – zentrale Schnell-Einstellungen
//=======================================================================
// Hier categoryNumber / Slot / LS-Key anpassen.
// Name-/Desc-Max für den CSC-Editor: siehe CUSTOM_CLASS_SC_CONFIG in
// classBuilder.js (Shared Tab-3-Limits; CSC liest nameMax/descMax dort).
// Flache Aliase darunter halten bestehenden Code stabil (nur Umschichtung).
//=======================================================================
const CUSTOM_SUBCLASS_CONFIG = Object.freeze({
    /**
     * Feste subclassCategoryNumber der einen aktiven Custom-UC.
     * PHB-UCs nutzen typischerweise 1…4; Custom belegt diesen Slot (Default: 100).
     */
    categoryNumber: 100,

    /** DOM-/State-Slot-ID der CSC-Haupt-UC (eine pro Session) */
    slotId: "csc-main",

    /** LocalStorage-Schlüssel für Runtime-Persistenz (Ersteller → Bogen) */
    lsKey: "customSubclassRuntime"
});

/** Alias → CUSTOM_SUBCLASS_CONFIG (Bestandscode) */
const CUSTOM_SUBCLASS_CATEGORY_NUMBER = CUSTOM_SUBCLASS_CONFIG.categoryNumber;
const CUSTOM_SUBCLASS_SLOT_ID = CUSTOM_SUBCLASS_CONFIG.slotId;
const CUSTOM_SUBCLASS_LS_KEY = CUSTOM_SUBCLASS_CONFIG.lsKey;

/** Editor-State (eine UC) */
let customSubclassEditorState = null;
/** Registrierte UC für Schritt 6 / Runtime */
let registeredCustomSubclass = null;
let customSubclassImportSnapshot = null;
let customSubclassEditorOpen = false;

function isCustomSubclassEditorActive() {
    return !!customSubclassEditorOpen;
}

function getActiveLfFloatOverlayEl() {
    if (customSubclassEditorOpen) {
        const el = document.getElementById("cscLfFloatOverlay");
        if (el) return el;
    }
    return document.getElementById("ccLfFloatOverlay");
}

/** Bridge für LF-Masken (resolveLfSlotContext / getLfSlotsForSlot) */
function getCustomSubclassLfBridge() {
    if (!customSubclassEditorOpen || !customSubclassEditorState) return null;
    const shim = getCscSubclassShim();
    return {
        active: true,
        slots: customSubclassEditorState.levelFeatures || [],
        subclassShim: shim
    };
}

function createEmptyCustomSubclassState(targetClassSlug) {
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    return {
        targetClassSlug: String(targetClassSlug || "").toLowerCase(),
        targetClassPackageId: null,
        packageId: null,
        packageCreatedAt: null,
        availableLanguages: [active],
        names: { de: "", en: "" },
        descriptions: { de: "", en: "" },
        levelFeatures: [],
        /** parentReadonly | standard | preset | user */
        spellConfigMode: "standard",
        spellPresetSubclassNumber: null,
        spellcastingProgression: {
            unlocked: false,
            startLevel: null,
            mode: "standard",
            baseSpellListLabels: [],
            userRows: {}
        }
    };
}

function getCscParentClassSlug() {
    if (typeof character !== "undefined" && character?.class) {
        return String(character.class).toLowerCase();
    }
    return customSubclassEditorState?.targetClassSlug || "";
}

function getCscParentClassData() {
    const slug = getCscParentClassSlug();
    if (!slug || typeof getClassData !== "function") return [];
    const data = getClassData(slug, "class");
    return Array.isArray(data) ? data : [];
}

function getCscParentSubclassList() {
    const slug = getCscParentClassSlug();
    if (!slug || typeof getClassData !== "function") return [];
    const list = getClassData(slug, "subclass");
    return Array.isArray(list) ? list : [];
}

function getCscParentCoreTraits() {
    const slug = getCscParentClassSlug();
    if (!slug || typeof classCoreTraitsList === "undefined") return null;
    return classCoreTraitsList.find(c =>
        String(c.translationLabel || "").toLowerCase() === slug
    ) || null;
}

/** Elternklasse beherrscht Basisklassen-Zauberwirken / Paktmagie */
function cscParentHasBaseSpellcasting() {
    const core = getCscParentCoreTraits();
    if (core && Number(core.spellcastingLabel) === 1) return true;
    const data = getCscParentClassData();
    return data.some(r =>
        r
        && (!r.subclassCategoryNumber || r.subclassCategoryNumber === 0)
        && (r.translationLabel === "spellcastingLabel" || r.translationLabel === "pactMagicLabel")
    );
}

/** Eingangsstufe Zauberwirken/Paktmagie der Elternklasse (PHB/Custom) */
function getCscParentSpellcastingLevel() {
    const data = getCscParentClassData();
    const row = data.find(r =>
        r
        && (!r.subclassCategoryNumber || r.subclassCategoryNumber === 0)
        && (r.translationLabel === "spellcastingLabel" || r.translationLabel === "pactMagicLabel")
    );
    if (row) return Number(row.level) || 1;
    if (cscParentHasBaseSpellcasting()) return 1;
    return null;
}

/** @deprecated Alias – Full-Caster / Half-Caster / Paktmagie der Elternklasse */
function cscParentIsFullCaster() {
    return cscParentHasBaseSpellcasting();
}

/** Diese Standalone-UC hat Einfach→Zauberwirken gesetzt */
function cscThisSubclassHasSpellcastingFeature() {
    return (customSubclassEditorState?.levelFeatures || []).some(s =>
        s?.payload?.featureType === "simple" && s.payload?.category === "spellcasting"
    );
}

function getCscSpellcastingFeatureSlot() {
    return (customSubclassEditorState?.levelFeatures || []).find(s =>
        s?.payload?.featureType === "simple" && s.payload?.category === "spellcasting"
    ) || null;
}

/** Tab Zauberwirken: Eltern-Zauberwirken ODER Zauberwirken-Merkmal in dieser UC */
function isCscSpellTabUnlocked() {
    return cscParentHasBaseSpellcasting() || cscThisSubclassHasSpellcastingFeature();
}

function updateCustomSubclassTab2Ui() {
    const btn = document.getElementById("customSubclassTabSpellBtn");
    if (!btn) return;
    const unlocked = isCscSpellTabUnlocked();
    btn.disabled = !unlocked;
    btn.classList.toggle("custom-class-tab--locked", !unlocked);
    btn.title = unlocked
        ? (tCC("cscTabSpellLabel") || tCC("cfTabSpellcastingLabel"))
        : (tCC("cscTabSpellLockedHintLabel") || tCC("cfSpellTabLockedHintLabel"));
    if (!unlocked && btn.classList.contains("active")) {
        switchCustomSubclassTab(1);
    }
}

/**
 * Progression an Elternklasse bzw. UC-Zauberwirken-Merkmal anbinden.
 * Geschwister-UCs (AT/EK) entsperren den Tab nicht.
 */
/** Listen aus Einfach→Zauberwirken-Optionsmaske (wie Class-Builder Tab 4) */
function getCscSpellcastingFeatureSpellListLabels() {
    const spellSlot = getCscSpellcastingFeatureSlot();
    const lists = spellSlot?.payload?.optionsConfig?.spellListLabels;
    return Array.isArray(lists) ? lists.filter(Boolean) : [];
}

function syncCscSpellcastingFromFeatures() {
    const st = customSubclassEditorState;
    if (!st) return;

    if (cscParentHasBaseSpellcasting()) {
        st.spellConfigMode = "parentReadonly";
        st.spellPresetSubclassNumber = null;
        st.spellcastingProgression = buildCscProgFromParentFullCaster();
        updateCustomSubclassTab2Ui();
        return;
    }

    const spellSlot = getCscSpellcastingFeatureSlot();
    if (!spellSlot) {
        const prev = st.spellcastingProgression || {};
        st.spellcastingProgression = {
            unlocked: false,
            startLevel: null,
            mode: prev.mode || "standard",
            baseSpellListLabels: [],
            userRows: prev.userRows || {}
        };
        updateCustomSubclassTab2Ui();
        return;
    }

    const newStart = Number(spellSlot.level) || (getCscParentSubclassLevels()[0] || 3);
    const newLists = getCscSpellcastingFeatureSpellListLabels();
    const prev = st.spellcastingProgression || {};
    const wasUnlocked = !!prev.unlocked;

    if (!wasUnlocked || st.spellConfigMode === "parentReadonly" || !st.spellConfigMode) {
        applyCscSpellConfigMode("standard");
    }

    let prog = st.spellcastingProgression;
    if (!prog) return;

    if (wasUnlocked && prev.startLevel != null && prev.startLevel !== newStart
        && typeof shiftSpellProgUserRows === "function") {
        prog.userRows = shiftSpellProgUserRows(prog.userRows, newStart - prev.startLevel, newStart);
    }

    prog.unlocked = true;
    prog.startLevel = newStart;
    // Immer aus der Zauberwirken-Maske – kein Magier-Default (wie Class-Builder)
    prog.baseSpellListLabels = newLists.slice();
    if (typeof ensureSpellProgUserRowsInitialized === "function") {
        ensureSpellProgUserRowsInitialized(prog);
    }
    Object.keys(prog.userRows || {}).forEach(k => {
        const lvl = parseInt(k, 10);
        if (lvl < newStart) return;
        const row = prog.userRows[k];
        if (!row) return;
        const extras = (row.spellListLabels || []).filter(l => !newLists.includes(l));
        row.spellListLabels = [...newLists, ...extras];
    });

    updateCustomSubclassTab2Ui();
}

/**
 * UC-Stufen der Elternklasse – gleiche Quelle wie Tab 3 im Klassenbuilder (getTab2SubclassLevels).
 * Custom Class: Stufe(n) mit Merkmaltyp „Unterklasse“ in Tab 2 (kompiliert: translationLabel „subclass“).
 * PHB: subclassCategoryNumber > 0 in classData.
 * Fallback: [3, 6, 10, 14]
 */
function getCscParentSubclassLevels() {
    const slug = getCscParentClassSlug();
    const fromEditor = [];
    const fromSubclassPick = [];
    const fromScFeatures = [];

    // 1) Parent-Editor in derselben Session (exakt wie Class-Builder Tab 3)
    if (slug
        && typeof customClassEditorState !== "undefined"
        && customClassEditorState
        && typeof getTab2SubclassLevels === "function"
        && String(customClassEditorState.slug || "").toLowerCase() === String(slug).toLowerCase()) {
        fromEditor.push(...getTab2SubclassLevels(customClassEditorState.levelFeatures));
    }

    const data = getCscParentClassData();
    (Array.isArray(data) ? data : []).forEach(row => {
        if (!row) return;
        if (row.translationLabel === "subclass") {
            const lvl = Number(row.level) || 0;
            if (lvl >= 1) fromSubclassPick.push(lvl);
        }
        const sc = row.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== CUSTOM_SUBCLASS_CATEGORY_NUMBER) {
            const lvl = Number(row.level) || 0;
            if (lvl >= 3) fromScFeatures.push(lvl);
        }
    });

    const isCustomParent = !!(getCscParentCoreTraits()?.isCustom
        || (typeof isRegisteredCustomClassSlug === "function" && slug && isRegisteredCustomClassSlug(slug)));

    let levels;
    if (isCustomParent) {
        // Keine PHB-Template-UC-Zeilen (sc 1…4) – nur Tab-2-Unterklassen-Stufe(n)
        levels = [...new Set([...fromEditor, ...fromSubclassPick])];
    } else if (fromEditor.length) {
        levels = [...new Set(fromEditor)];
    } else if (fromSubclassPick.length) {
        levels = [...new Set(fromSubclassPick)];
    } else {
        levels = [...new Set(fromScFeatures)];
    }

    if (!levels.length) return [3, 6, 10, 14];
    return levels.sort((a, b) => a - b);
}

function ensureCscLevelFeatureSlots(state) {
    const levels = getCscParentSubclassLevels();
    const byLevel = {};
    (state.levelFeatures || []).forEach(s => {
        const lvl = Number(s.level) || 1;
        if (!byLevel[lvl]) byLevel[lvl] = [];
        byLevel[lvl].push(s);
    });
    const next = [];
    levels.forEach(level => {
        const rowsPer = (typeof getScRowsPerLevel === "function") ? getScRowsPerLevel(level) : 2;
        const existing = byLevel[level] || [];
        for (let i = 0; i < rowsPer; i++) {
            if (existing[i]) {
                existing[i].subclassId = CUSTOM_SUBCLASS_SLOT_ID;
                existing[i].level = level;
                existing[i].index = i;
                next.push(existing[i]);
            } else if (typeof createScFeatureSlot === "function") {
                next.push(createScFeatureSlot(CUSTOM_SUBCLASS_SLOT_ID, level, i));
            }
        }
    });
    state.levelFeatures = next;
    return next;
}

//=======================================================================
// Spell presets
//=======================================================================

/** PHB-UCs der Elternklasse mit eigener Slot-Progression (SSpSL > 0) */
function getCscSpellcastingSubclassPresets() {
    const data = getCscParentClassData();
    const bySc = new Map();
    data.forEach(row => {
        const sc = row?.subclassCategoryNumber || 0;
        if (sc <= 0 || sc === CUSTOM_SUBCLASS_CATEGORY_NUMBER) return;
        const hasSlots = (parseInt(row.SSpSL1, 10) || 0) > 0
            || row.translationLabel === "spellcastingLabel"
            || row.translationLabel === "pactMagicLabel";
        if (!hasSlots) return;
        if (!bySc.has(sc)) bySc.set(sc, { subclassCategoryNumber: sc, startLevel: row.level, rows: [] });
        const entry = bySc.get(sc);
        entry.rows.push(row);
        if (row.level < entry.startLevel) entry.startLevel = row.level;
    });
    const scList = getCscParentSubclassList();
    return Array.from(bySc.values()).map(p => {
        const meta = scList.find(s => s.subclassCategoryNumber === p.subclassCategoryNumber);
        return {
            ...p,
            translationLabel: meta?.translationLabel || `subclass_${p.subclassCategoryNumber}`,
            label: (typeof tCC === "function" ? tCC(meta?.translationLabel) : null)
                || meta?.translationLabel
                || `UC ${p.subclassCategoryNumber}`
        };
    }).sort((a, b) => a.subclassCategoryNumber - b.subclassCategoryNumber);
}

/** Halbzauberer-Standard (EK/AT) – gemeinsame Vorlage aus classBuilder / shared */
function buildCscHalfCasterProgFromTemplate(startLevel, baseLists) {
    if (typeof buildHalfCasterSpellProgFromTemplate === "function") {
        return buildHalfCasterSpellProgFromTemplate(startLevel, baseLists);
    }
    return {
        unlocked: true,
        startLevel,
        mode: "user",
        baseSpellListLabels: (baseLists || []).slice(),
        userRows: {}
    };
}

/** Zeile mit Zauberplätzen / vorbereiteten Zaubern / Tricks */
function cscRowHasSpellResources(row) {
    if (!row) return false;
    if ((parseInt(row.cantripsAmount, 10) || 0) > 0) return true;
    if ((parseInt(row.preparedSpellsAmount, 10) || 0) > 0) return true;
    for (let i = 1; i <= 9; i++) {
        if ((parseInt(row[`SSpSL${i}`], 10) || 0) > 0) return true;
    }
    return false;
}

/** Max-Merge zweier Slot-/Trick-Zeilen (PHB: Grad-4 oft nur auf Basisstufe 19/20) */
function mergeCscSpellResourceRows(primary, secondary) {
    if (!primary) return secondary || null;
    if (!secondary) return primary;
    const out = Object.assign({}, primary);
    out.cantripsAmount = Math.max(
        parseInt(primary.cantripsAmount, 10) || 0,
        parseInt(secondary.cantripsAmount, 10) || 0
    );
    out.preparedSpellsAmount = Math.max(
        parseInt(primary.preparedSpellsAmount, 10) || 0,
        parseInt(secondary.preparedSpellsAmount, 10) || 0
    );
    for (let i = 1; i <= 9; i++) {
        const key = `SSpSL${i}`;
        out[key] = Math.max(parseInt(primary[key], 10) || 0, parseInt(secondary[key], 10) || 0);
    }
    const lists = [];
    [primary.spellListLabels, secondary.spellListLabels].forEach(arr => {
        (arr || []).forEach(l => { if (l && !lists.includes(l)) lists.push(l); });
    });
    if (lists.length) out.spellListLabels = lists;
    return out;
}

/**
 * Progressionszeile einer Stufe: UC + Basis mergen
 * (PHB Fighter/Rogue legen Grad-4-Slots ab 19 oft nur auf subclassCategoryNumber 0).
 */
function pickCscSpellResourceRowForLevel(presetRows, parentData, subclassNum, level, startLevel) {
    const parent = parentData || [];
    const findSc = (lvl) => (presetRows || []).find(r =>
        Number(r.level) === lvl && cscRowHasSpellResources(r)
    );
    const findBase = (lvl) => parent.find(r =>
        Number(r.level) === lvl
        && (!r.subclassCategoryNumber || r.subclassCategoryNumber === 0)
        && cscRowHasSpellResources(r)
    );

    let scHit = findSc(level);
    let baseHit = findBase(level);
    if (scHit || baseHit) return mergeCscSpellResourceRows(scHit, baseHit);

    for (let back = level - 1; back >= startLevel; back--) {
        scHit = findSc(back);
        baseHit = findBase(back);
        if (scHit || baseHit) return mergeCscSpellResourceRows(scHit, baseHit);
    }
    return null;
}

/** Progression aus ClassData-Zeilen einer UC extrahieren */
function buildCscProgFromSubclassRows(preset) {
    const start = Number(preset.startLevel) || 3;
    const lists = [];
    const prog = {
        unlocked: true,
        startLevel: start,
        mode: "user",
        baseSpellListLabels: lists,
        userRows: {}
    };
    const parentData = (typeof getCscParentClassData === "function") ? getCscParentClassData() : [];
    const scNum = preset.subclassCategoryNumber;

    for (let lvl = start; lvl <= 20; lvl++) {
        const src = pickCscSpellResourceRowForLevel(
            preset.rows, parentData, scNum, lvl, start
        );
        const row = (typeof createEmptySpellProgRow === "function")
            ? createEmptySpellProgRow(lists)
            : {};
        if (src) {
            row.cantripsAmount = src.cantripsAmount || 0;
            row.preparedSpellsAmount = src.preparedSpellsAmount || 0;
            for (let i = 1; i <= 9; i++) row[`SSpSL${i}`] = src[`SSpSL${i}`] || 0;
            if (Array.isArray(src.spellListLabels)) {
                row.spellListLabels = src.spellListLabels.slice();
                src.spellListLabels.forEach(l => { if (!lists.includes(l)) lists.push(l); });
            }
        }
        prog.userRows[String(lvl)] = row;
    }
    prog.baseSpellListLabels = lists.slice();
    return prog;
}

function getCscParentClassDisplayName() {
    const slug = getCscParentClassSlug();
    if (!slug) return "—";
    const lang = (typeof currentLang !== "undefined" && currentLang)
        || (typeof getActiveUiLang === "function" ? getActiveUiLang() : "de");
    const bag = (typeof translations !== "undefined" && translations[lang]) ? translations[lang] : {};
    return bag[`${slug}Label`] || bag[slug] || slug;
}

/**
 * Zauberlisten der Elternklasse (PHB magicSkills / Custom Class / Fallback Klassen-Slug).
 */
function getCscParentSpellListLabels() {
    const slug = getCscParentClassSlug();
    if (!slug) return [];

    // 1) PHB magicSkillsList: Basisklassen-Zauberwirken
    const magicList = (typeof magicSkillsList !== "undefined" && Array.isArray(magicSkillsList))
        ? magicSkillsList
        : [];
    const casting = magicList.find(m =>
        m
        && String(m.class || "").toLowerCase() === slug
        && (m.subclass === 0 || m.subclass == null)
        && Array.isArray(m.translationLabel)
        && (m.translationLabel[0] === "spellcastingLabel" || m.translationLabel[0] === "pactMagicLabel")
        && Array.isArray(m.getSpellList_c)
        && m.getSpellList_c.length
    );
    if (casting) return casting.getSpellList_c.filter(Boolean);

    // 2) Custom-Class-Bundle
    if (typeof getRegisteredCustomClassBundle === "function") {
        const bundle = getRegisteredCustomClassBundle(slug);
        if (bundle) {
            const magicCustom = (bundle.magicSkillsList || []).find(m =>
                Array.isArray(m?.translationLabel)
                && m.translationLabel[0] === "spellcastingLabel"
                && Array.isArray(m.getSpellList_c)
                && m.getSpellList_c.length
            );
            if (magicCustom) return magicCustom.getSpellList_c.filter(Boolean);

            const rows = Array.isArray(bundle.classData) ? bundle.classData : [];
            if (typeof resolveCustomClassSpellListSources === "function") {
                const fromCustom = resolveCustomClassSpellListSources(rows, 20, null);
                if (fromCustom.length) return fromCustom;
            }
        }
    }

    // 3) PHB-Default: Klassen-Slug als Listenname (wie populateSpells)
    return [slug];
}

function buildCscProgFromParentFullCaster() {
    const data = getCscParentClassData();
    const lists = getCscParentSpellListLabels();
    const start = getCscParentSpellcastingLevel() || 1;
    const prog = {
        unlocked: true,
        startLevel: start,
        mode: "user",
        baseSpellListLabels: lists.slice(),
        userRows: {}
    };
    for (let lvl = start; lvl <= 20; lvl++) {
        const src = data.find(r =>
            r.level === lvl
            && (!r.subclassCategoryNumber || r.subclassCategoryNumber === 0)
        ) || data.find(r => r.level === lvl);
        const row = (typeof createEmptySpellProgRow === "function")
            ? createEmptySpellProgRow(lists)
            : { spellListLabels: lists.slice() };
        if (src) {
            row.cantripsAmount = src.cantripsAmount || 0;
            row.preparedSpellsAmount = src.preparedSpellsAmount || 0;
            for (let i = 1; i <= 9; i++) row[`SSpSL${i}`] = src[`SSpSL${i}`] || 0;
        }
        // Immer Eltern-Zauberlisten setzen (PHB-Zeilen haben oft kein spellListLabels)
        row.spellListLabels = lists.slice();
        prog.userRows[String(lvl)] = row;
    }
    return prog;
}

function applyCscSpellConfigMode(mode, presetNumber) {
    const state = customSubclassEditorState;
    if (!state) return;
    const levels = getCscParentSubclassLevels();
    const spellSlot = getCscSpellcastingFeatureSlot();
    const start = Number(spellSlot?.level) || levels[0] || 3;
    const listsFromFeature = getCscSpellcastingFeatureSpellListLabels();

    if (cscParentHasBaseSpellcasting()) {
        state.spellConfigMode = "parentReadonly";
        state.spellPresetSubclassNumber = null;
        state.spellcastingProgression = buildCscProgFromParentFullCaster();
        return;
    }

    state.spellConfigMode = mode;
    state.spellPresetSubclassNumber = presetNumber != null ? Number(presetNumber) : null;

    if (mode === "standard") {
        state.spellcastingProgression = buildCscHalfCasterProgFromTemplate(start, listsFromFeature);
    } else if (mode === "preset") {
        const presets = getCscSpellcastingSubclassPresets();
        const p = presets.find(x => x.subclassCategoryNumber === state.spellPresetSubclassNumber) || presets[0];
        if (p) {
            state.spellPresetSubclassNumber = p.subclassCategoryNumber;
            state.spellcastingProgression = buildCscProgFromSubclassRows(p);
            // Startstufe an UC-Zauberwirken-Merkmal anbinden
            if (state.spellcastingProgression) {
                state.spellcastingProgression.startLevel = start;
                // Listen aus Zauberwirken-Maske bevorzugen, sonst Preset-Listen
                if (listsFromFeature.length) {
                    state.spellcastingProgression.baseSpellListLabels = listsFromFeature.slice();
                }
            }
        } else {
            state.spellConfigMode = "standard";
            state.spellcastingProgression = buildCscHalfCasterProgFromTemplate(start, listsFromFeature);
        }
    } else if (mode === "user") {
        const prev = state.spellcastingProgression;
        const baseLists = listsFromFeature.length
            ? listsFromFeature.slice()
            : (prev?.baseSpellListLabels || []).slice();
        state.spellcastingProgression = {
            unlocked: true,
            startLevel: start,
            mode: "user",
            baseSpellListLabels: baseLists,
            userRows: prev?.userRows && Object.keys(prev.userRows).length
                ? prev.userRows
                : buildCscHalfCasterProgFromTemplate(start, baseLists).userRows
        };
        if (typeof ensureSpellProgUserRowsInitialized === "function") {
            ensureSpellProgUserRowsInitialized(state.spellcastingProgression);
        }
    }
}

//=======================================================================
// UI – Modal
//=======================================================================

function openCustomSubclassChooser() {
    if (!isCustomFeatureEnabled("customSubclassBuilder")) return;
    const slug = (typeof character !== "undefined" && character?.class)
        ? String(character.class).toLowerCase()
        : "";
    if (!slug) {
        alert(tCC("cscNeedClassAlertLabel") || "Bitte zuerst eine Klasse wählen.");
        return;
    }
    const overlay = document.getElementById("customSubclassOverlay");
    if (!overlay) return;
    document.getElementById("customSubclassChooserView").style.display = "";
    document.getElementById("customSubclassEditorView").style.display = "none";
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode(overlay, true);
    }
    overlay.style.setProperty("display", "flex", "important");
    applyCscTranslations();
}

function closeCustomSubclassModal() {
    const overlay = document.getElementById("customSubclassOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    customSubclassEditorOpen = false;
    const float = document.getElementById("cscLfFloatOverlay");
    if (float) float.style.setProperty("display", "none", "important");
}

/** Editor verwerfen (X / Abbruch) – keine Registrierung, Felder leeren */
function discardCustomSubclassEditor() {
    customSubclassEditorState = null;
    customSubclassImportSnapshot = null;
    customSubclassEditorOpen = false;
    closeCustomSubclassModal();
}

function requestCloseCustomSubclassModal() {
    if (customSubclassEditorOpen && customSubclassEditorState) {
        const msg = tCC("cscCloseConfirmLabel")
            || tCC("customClassCloseConfirmLabel")
            || "Ungespeicherte Änderungen verwerfen?";
        if (!confirm(msg)) return;
        discardCustomSubclassEditor();
        return;
    }
    closeCustomSubclassModal();
}

function startCustomSubclassCreate() {
    const slug = getCscParentClassSlug();
    if (!slug) return;
    // Alte Input-Felder entfernen, sonst schreibt syncCscLangFieldsFromDom alte Namen in den neuen State
    clearCustomSubclassEditorDom();
    customSubclassEditorState = createEmptyCustomSubclassState(slug);
    const core = getCscParentCoreTraits();
    if (core?.isCustom && typeof registeredCustomClass !== "undefined") {
        customSubclassEditorState.targetClassPackageId = registeredCustomClass.packageId || null;
    }
    ensureCscLevelFeatureSlots(customSubclassEditorState);
    syncCscSpellcastingFromFeatures();
    customSubclassEditorOpen = true;
    customSubclassImportSnapshot = null;
    document.getElementById("customSubclassChooserView").style.display = "none";
    document.getElementById("customSubclassEditorView").style.display = "";
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode("customSubclassOverlay", false);
    }
    switchCustomSubclassTab(1);
    renderCustomSubclassEditor();
}

/** Tab-Inhalte leeren (verhindert DOM→State-Übernahme alter Bezeichnungen) */
function clearCustomSubclassEditorDom() {
    const t1 = document.getElementById("customSubclassTab1Content");
    if (t1) t1.innerHTML = "";
    const t2 = document.getElementById("customSubclassTab2Content");
    if (t2) t2.innerHTML = "";
}

function triggerCustomSubclassUpload() {
    document.getElementById("customSubclassFileInput")?.click();
}

function handleCustomSubclassFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const finish = () => {
        if (event.target) event.target.value = "";
    };

    if (typeof readAndValidateDcPackageFile !== "function") {
        alert(tCC("cscImportInvalidAlertLabel") || "Ungültige JSON-Datei.");
        finish();
        return;
    }

    readAndValidateDcPackageFile(file, {
        expectedType: (typeof DC_PACKAGE_TYPE !== "undefined")
            ? DC_PACKAGE_TYPE.CUSTOM_SUBCLASS
            : "customSubclass"
    }).then(result => {
        try {
            if (!result.ok) {
                alert(result.message || tCC("cscImportInvalidAlertLabel") || "Import fehlgeschlagen.");
                return;
            }

            const applySubclassImport = (payload, envelope) => {
                importCustomSubclassPayload({ payload, envelope });
                if (typeof markDcPackageUserLoaded === "function") {
                    markDcPackageUserLoaded(
                        (typeof DC_PACKAGE_TYPE !== "undefined")
                            ? DC_PACKAGE_TYPE.CUSTOM_SUBCLASS
                            : "customSubclass"
                    );
                }
                if (typeof notifyDcPackageDependencyPossiblyResolved === "function") {
                    notifyDcPackageDependencyPossiblyResolved();
                }
            };

            if (typeof isDcPackageDependencyResolutionUpload === "function"
                && isDcPackageDependencyResolutionUpload(result.detectedType)) {
                const match = (typeof validateUploadedDcPackageAgainstPendingDependency === "function")
                    ? validateUploadedDcPackageAgainstPendingDependency(
                        result.detectedType,
                        result.envelope,
                        result.payload
                    )
                    : { ok: true };
                if (!match.ok) {
                    alert(match.message || tCC("cscImportInvalidAlertLabel") || "Import fehlgeschlagen.");
                    if (typeof promptNextDcPackageDependencyUpload === "function") {
                        promptNextDcPackageDependencyUpload();
                    }
                    return;
                }
                const wrapped = (result.envelope && result.payload)
                    ? { dc: result.envelope, payload: result.payload }
                    : result.payload;
                if (typeof registerCustomSubclassInRuntime === "function") {
                    registerCustomSubclassInRuntime(wrapped);
                }
                if (typeof markDcPackageUserLoaded === "function") {
                    markDcPackageUserLoaded(
                        (typeof DC_PACKAGE_TYPE !== "undefined")
                            ? DC_PACKAGE_TYPE.CUSTOM_SUBCLASS
                            : "customSubclass"
                    );
                }
                if (typeof notifyDcPackageDependencyPossiblyResolved === "function") {
                    notifyDcPackageDependencyPossiblyResolved({
                        envelope: result.envelope,
                        payload: result.payload,
                        packageType: result.detectedType
                    });
                }
                return;
            }

            if (typeof beginDcPackageImportWithDependencies === "function") {
                beginDcPackageImportWithDependencies({
                    envelope: result.envelope,
                    payload: result.payload,
                    detectedType: result.detectedType,
                    onApply: (payload, envelope) => applySubclassImport(payload, envelope),
                    onCancel: () => {}
                });
                return;
            }

            applySubclassImport(result.payload, result.envelope);
        } catch (e) {
            console.error(e);
            alert(tCC("cscImportInvalidAlertLabel") || "Ungültige JSON-Datei.");
        } finally {
            finish();
        }
    });
}

function importCustomSubclassPayload(raw) {
    const expected = (typeof DC_PACKAGE_TYPE !== "undefined")
        ? DC_PACKAGE_TYPE.CUSTOM_SUBCLASS
        : "customSubclass";
    let payload = raw;
    let envelope = null;
    if (raw && typeof raw === "object" && raw.payload && (raw.envelope || raw.dc)) {
        envelope = raw.envelope || raw.dc || null;
        payload = raw.payload;
    } else if (typeof validateDcPackage === "function") {
        const v = validateDcPackage(raw, { expectedType: expected });
        if (!v.ok) {
            alert(v.message || tCC("cscImportInvalidAlertLabel") || "Import fehlgeschlagen.");
            return;
        }
        payload = v.payload;
        envelope = v.envelope;
    }
    if (!payload || payload.type !== "customSubclass") {
        alert(tCC("cscImportInvalidAlertLabel") || "Kein Custom-Unterklassen-Paket.");
        return;
    }
    const current = getCscParentClassSlug();
    const target = String(payload.targetClassSlug || "").toLowerCase();
    if (!current || target !== current) {
        alert((tCC("cscImportClassMismatchAlertLabel") || "Unterklasse passt nicht zur gewählten Klasse ({class}).")
            .replace("{class}", current || "—"));
        return;
    }
    clearCustomSubclassEditorDom();
    customSubclassEditorState = createEmptyCustomSubclassState(target);
    customSubclassEditorState.targetClassPackageId = payload.targetClassPackageId || null;
    customSubclassEditorState.packageId = envelope?.packageId || payload.packageId || null;
    customSubclassEditorState.packageCreatedAt = envelope?.createdAt || payload.packageCreatedAt || null;
    customSubclassEditorState.names = payload.names || { de: "", en: "" };
    customSubclassEditorState.descriptions = payload.descriptions || { de: "", en: "" };
    if (Array.isArray(payload.availableLanguages) && payload.availableLanguages.length) {
        customSubclassEditorState.availableLanguages = payload.availableLanguages.slice();
    }
    customSubclassEditorState.levelFeatures = Array.isArray(payload.levelFeatures)
        ? JSON.parse(JSON.stringify(payload.levelFeatures))
        : [];
    customSubclassEditorState.spellConfigMode = payload.spellConfigMode || "standard";
    customSubclassEditorState.spellPresetSubclassNumber = payload.spellPresetSubclassNumber ?? null;
    customSubclassEditorState.spellcastingProgression = payload.spellcastingProgression
        ? JSON.parse(JSON.stringify(payload.spellcastingProgression))
        : createEmptyCustomSubclassState(target).spellcastingProgression;
    ensureCscLevelFeatureSlots(customSubclassEditorState);
    syncCscSpellcastingFromFeatures();
    customSubclassEditorOpen = true;
    // Upload nur in den Editor laden – Registrierung/Radio erst beim Speichern
    // Snapshot wie nach Speichern (ohne updatedAt), damit unverändertes Speichern nicht neu lädt
    customSubclassImportSnapshot = buildCustomSubclassSnapshotFromEditorState(customSubclassEditorState);
    document.getElementById("customSubclassChooserView").style.display = "none";
    document.getElementById("customSubclassEditorView").style.display = "";
    const overlay = document.getElementById("customSubclassOverlay");
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode(overlay, false);
    }
    if (overlay) overlay.style.setProperty("display", "flex", "important");
    switchCustomSubclassTab(1);
    renderCustomSubclassEditor();
}

function switchCustomSubclassTab(n) {
    if (n === 2 && !isCscSpellTabUnlocked()) {
        updateCustomSubclassTab2Ui();
        return;
    }
    document.querySelectorAll("#customSubclassOverlay .custom-class-tab").forEach(btn => {
        btn.classList.toggle("active", Number(btn.dataset.tab) === n);
    });
    document.querySelectorAll("#customSubclassOverlay .custom-class-tab-panel").forEach((panel, i) => {
        panel.classList.toggle("active", i + 1 === n);
    });
    if (n === 1) renderCustomSubclassTab1();
    if (n === 2) renderCustomSubclassTab2();
}

function renderCustomSubclassEditor() {
    applyCscTranslations();
    syncCscSpellcastingFromFeatures();
    updateCustomSubclassTab2Ui();
    renderCustomSubclassTab1();
    if (isCscSpellTabUnlocked()) renderCustomSubclassTab2();
}

function syncCscHeaderFromDom() {
    syncCscLangFieldsFromDom();
}

/** Name/Beschreibung wie Tab-3-UC-Box (gleiche Input-IDs: ccScName_… / ccScDesc_…) */
function syncCscLangFieldsFromDom() {
    const st = customSubclassEditorState;
    if (!st) return;
    const available = (typeof ensureAvailableLanguages === "function")
        ? ensureAvailableLanguages(st)
        : (st.availableLanguages || ["de"]);
    const scId = CUSTOM_SUBCLASS_SLOT_ID;
    available.forEach(lang => {
        const nameEl = document.getElementById(`ccScName_${scId}_${lang}`);
        const descEl = document.getElementById(`ccScDesc_${scId}_${lang}`);
        if (nameEl) {
            st.names = st.names || { de: "", en: "" };
            const max = (typeof CUSTOM_CLASS_SC_CONFIG !== "undefined")
                ? CUSTOM_CLASS_SC_CONFIG.nameMax
                : 30;
            st.names[lang] = nameEl.value.trim().slice(0, max);
        }
        if (descEl) {
            st.descriptions = st.descriptions || { de: "", en: "" };
            const max = (typeof CUSTOM_CLASS_SC_CONFIG !== "undefined")
                ? CUSTOM_CLASS_SC_CONFIG.descMax
                : 300;
            st.descriptions[lang] = descEl.value.trim().slice(0, max);
        }
    });
}

function onCscLangAvailabilityChange() {
    const st = customSubclassEditorState;
    if (!st) return;
    syncCscLangFieldsFromDom();
    const activeLang = (typeof getActiveUiLang === "function") ? getActiveUiLang() : "de";
    const selected = Array.from(document.querySelectorAll('input[name="cscLangAvail"]:checked'))
        .map(el => el.value)
        .filter(lang => (typeof getCustomClassSupportedLangs === "function"
            ? getCustomClassSupportedLangs()
            : ["de", "en"]).includes(lang));
    if (!selected.includes(activeLang)) selected.unshift(activeLang);
    st.availableLanguages = selected;
    renderCustomSubclassTab1();
}

function getCscSubclassShim() {
    const st = customSubclassEditorState;
    if (!st) return null;
    return {
        id: CUSTOM_SUBCLASS_SLOT_ID,
        subclassCategoryNumber: CUSTOM_SUBCLASS_CATEGORY_NUMBER,
        names: st.names,
        descriptions: st.descriptions,
        collapsed: false,
        levelFeatures: st.levelFeatures
    };
}

function renderCustomSubclassTab1() {
    runWithPreservedEditorScroll(() => {
        const container = document.getElementById("customSubclassTab1Content");
        if (!container || !customSubclassEditorState) return;
        syncCscLangFieldsFromDom();
        ensureCscLevelFeatureSlots(customSubclassEditorState);
        syncCscSpellcastingFromFeatures();
        const st = customSubclassEditorState;
        const levels = getCscParentSubclassLevels();
        const shim = getCscSubclassShim();
        const activeLang = (typeof getActiveUiLang === "function") ? getActiveUiLang() : "de";
        const available = (typeof ensureAvailableLanguages === "function")
            ? ensureAvailableLanguages(st)
            : (st.availableLanguages || [activeLang]);
        const ordered = [activeLang, ...available.filter(l => l !== activeLang)];
        const title = (typeof getSubclassDisplayName === "function")
            ? getSubclassDisplayName(shim)
            : (tCC("subclass") || "Unterklasse");

        const langAvail = (typeof renderLangAvailabilityRowHtml === "function")
            ? renderLangAvailabilityRowHtml(st, {
                inputName: "cscLangAvail",
                onChange: "onCscLangAvailabilityChange()"
            })
            : "";

        const langBlocks = ordered.map(lang =>
            (typeof buildScLangBlockHtml === "function")
                ? buildScLangBlockHtml(shim, lang, lang !== activeLang)
                : ""
        ).join("");

        const tableHtml = (typeof buildScFeatureTableHtml === "function")
            ? buildScFeatureTableHtml(shim, levels)
            : "";

        container.innerHTML = `
            ${langAvail}
            <div class="cc-sc-list">
                <div class="cc-sc-box" data-subclass-id="${CUSTOM_SUBCLASS_SLOT_ID}">
                    <div class="cc-sc-box-header">
                        <span class="cc-sc-box-title">${escapeLfHtml(title)}</span>
                    </div>
                    <div id="ccScBody_${CUSTOM_SUBCLASS_SLOT_ID}" class="cc-sc-box-body">
                        <div class="custom-class-field">
                            <div class="custom-class-section-title">${tCC("cfNameLabel")} / ${tCC("cfDescLabel")}</div>
                            ${langBlocks}
                        </div>
                        <div class="custom-class-field">
                            <div class="custom-class-section-title">${tCC("subclassFeaturesLabel")}</div>
                            ${tableHtml}
                        </div>
                    </div>
                </div>
            </div>`;
        updateCustomSubclassTab2Ui();
    });
}

function renderCustomSubclassTab2() {
    const container = document.getElementById("customSubclassTab2Content");
    if (!container || !customSubclassEditorState) return;
    updateCustomSubclassTab2Ui();

    if (!isCscSpellTabUnlocked()) {
        container.innerHTML = `<p class="custom-class-hint">${tCC("cscTabSpellLockedHintLabel")
            || tCC("cfSpellTabLockedHintLabel")}</p>`;
        return;
    }

    syncCscSpellcastingFromFeatures();
    const st = customSubclassEditorState;
    const parentCaster = cscParentHasBaseSpellcasting();

    if (parentCaster) {
        const hint = (tCC("cscSpellParentReadonlyHintLabel") || "")
            .replace(/\{class\}/g, getCscParentClassDisplayName());
        container.innerHTML = `
            <div class="cc-spell-prog-toolbar">
                <p class="custom-class-hint cc-lf-intro">${escapeLfHtml(hint)}</p>
            </div>
            ${typeof buildCcSpellProgTableMarkup === "function"
                ? buildCcSpellProgTableMarkup(st.spellcastingProgression, { editable: false })
                : ""}`;
        return;
    }

    const prog = st.spellcastingProgression || {};
    if (!prog.unlocked || !prog.startLevel) {
        container.innerHTML = `<p class="custom-class-hint">${tCC("cscTabSpellLockedHintLabel")
            || tCC("cfSpellTabLockedHintLabel")}</p>`;
        return;
    }

    const mode = st.spellConfigMode || "standard";
    const editable = mode === "user";
    if (editable && st.spellcastingProgression) {
        st.spellcastingProgression.mode = "user";
        if (typeof ensureSpellProgUserRowsInitialized === "function") {
            ensureSpellProgUserRowsInitialized(st.spellcastingProgression);
        }
    }

    const presets = getCscSpellcastingSubclassPresets();
    let modeOptions = `
        <option value="standard" ${mode === "standard" ? "selected" : ""}>${tCC("cfSpellProgModeStandardLabel")}</option>`;
    presets.forEach(p => {
        const sel = mode === "preset" && st.spellPresetSubclassNumber === p.subclassCategoryNumber ? "selected" : "";
        modeOptions += `<option value="preset:${p.subclassCategoryNumber}" ${sel}>${escapeLfHtml(p.label)}</option>`;
    });
    modeOptions += `<option value="user" ${mode === "user" ? "selected" : ""}>${tCC("cfSpellProgModeUserLabel")}</option>`;

    container.innerHTML = `
        <div class="cc-spell-prog-toolbar">
            <p class="custom-class-hint cc-lf-intro">${tCC("cscSpellTabHintLabel")}</p>
            <label class="cc-spell-prog-mode">
                <span>${tCC("cfSpellProgModeLabel")}</span>
                <select class="dropdown" id="cscSpellModeSelect" onchange="onCscSpellModeChange(this.value)">
                    ${modeOptions}
                </select>
                ${editable
                    ? `<button type="button" class="cc-spell-prog-zero-btn" title="${tCC("cfSpellProgZeroTitleLabel")}"
                        onclick="zeroCcSpellProgValues()">0</button>`
                    : ""}
            </label>
        </div>
        ${typeof buildCcSpellProgTableMarkup === "function"
            ? buildCcSpellProgTableMarkup(st.spellcastingProgression, { editable })
            : ""}`;
}

function onCscSpellModeChange(value) {
    if (!customSubclassEditorState) return;
    if (String(value).startsWith("preset:")) {
        const n = parseInt(String(value).split(":")[1], 10);
        applyCscSpellConfigMode("preset", n);
    } else {
        applyCscSpellConfigMode(value);
    }
    renderCustomSubclassTab2();
}

//=======================================================================
// Compile / Save / Register
//=======================================================================

function buildCscStableSlug(state) {
    const base = (state.names?.en || state.names?.de || "customsubclass")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 28) || "customsubclass";
    return `csc_${base}`;
}

function compileCustomSubclassRuntime(state) {
    const slug = buildCscStableSlug(state);
    const scNum = CUSTOM_SUBCLASS_CATEGORY_NUMBER;
    const parentSlug = state.targetClassSlug;
    const translationsBag = { de: {}, en: {} };
    const labelKey = `${slug}_sc${scNum}Label`;
    const descKey = `${slug}_sc${scNum}DLabel`;
    translationsBag.de[labelKey] = state.names.de || state.names.en || slug;
    translationsBag.en[labelKey] = state.names.en || state.names.de || slug;
    // Leere UC-Beschreibung als "-" (sonst fällt die Infobox auf den Roh-Key zurück)
    translationsBag.de[descKey] = String(state.descriptions?.de || "").trim()
        || String(state.descriptions?.en || "").trim()
        || "-";
    translationsBag.en[descKey] = String(state.descriptions?.en || "").trim()
        || String(state.descriptions?.de || "").trim()
        || "-";

    const compiledRows = [];
    const counters = (typeof seedCompiledChoiceCountersFromParentClass === "function")
        ? seedCompiledChoiceCountersFromParentClass(parentSlug)
        : ((typeof createCompiledChoiceCounters === "function")
            ? createCompiledChoiceCounters()
            : { skill: 0 });
    let idSeq = 5000;
    const nextId = () => ++idSeq;
    const parentCore = (typeof buildLfCoreTraitsStateFromParent === "function")
        ? buildLfCoreTraitsStateFromParent(parentSlug)
        : {};
    const fakeState = {
        levelFeatures: [],
        subclasses: [{
            id: CUSTOM_SUBCLASS_SLOT_ID,
            subclassCategoryNumber: scNum,
            names: state.names,
            descriptions: state.descriptions,
            levelFeatures: state.levelFeatures
        }],
        spellcastingProgression: state.spellcastingProgression,
        parameterRegistry: [],
        // Für Zauberbuch-Logik in Spellcraft-Compile (wie Class-Builder-Fokus)
        targetClassSlug: parentSlug,
        spellcastingFocus: (typeof customClassStateUsesSpellbook === "function"
            && customClassStateUsesSpellbook({ targetClassSlug: parentSlug }))
            ? ["spellbookLabel"]
            : [],
        savingThrowProficiencies: parentCore.savingThrowProficiencies || [],
        weaponCategoryNumber: parentCore.weaponCategoryNumber || [],
        weaponPropertyCategoryNumber: parentCore.weaponPropertyCategoryNumber || [],
        armorCategoryNumber: parentCore.armorCategoryNumber || [],
        skillCategoryNumber: parentCore.skillCategoryNumber || [],
        toolLabel: parentCore.toolLabel || 0
    };
    const compileMeta = (typeof createCompiledSlotLinkMeta === "function")
        ? createCompiledSlotLinkMeta(fakeState)
        : { labelBySlotId: new Map(), freeFamilyRoot: new Map(), state: fakeState };

    (state.levelFeatures || []).forEach(slot => {
        if (!slot?.payload?.featureType) return;
        if (typeof compileSlotToClassDataRow !== "function") return;
        const row = compileSlotToClassDataRow(slot, {
            nextId,
            slug,
            subclassCategoryNumber: scNum,
            state: fakeState,
            counters,
            translationsBag,
            compileMeta
        });
        if (row) compiledRows.push(row);
    });

    // Spellcasting-Progression auf Carrier-Zeilen denormalisieren
    // (translationLabel = 0 – wie Class-Builder; sonst erscheint „Zauberwirken“ auf jeder Stufe)
    const prog = state.spellcastingProgression;
    if (prog?.unlocked && prog.startLevel && state.spellConfigMode !== "parentReadonly") {
        for (let lvl = prog.startLevel; lvl <= 20; lvl++) {
            const prow = (typeof getSpellProgRowFromProgression === "function")
                ? getSpellProgRowFromProgression(prog, lvl)
                : prog.userRows?.[String(lvl)];
            if (!prow) continue;
            let row = compiledRows.find(r =>
                r.level === lvl && r.subclassCategoryNumber === scNum
            );
            if (!row) {
                row = {
                    ID: nextId(),
                    level: lvl,
                    subclassCategoryNumber: scNum,
                    translationLabel: 0,
                    classFeatureShortDescription: 0,
                    classFeatureDescription: 0,
                    choiceInStep3: 0,
                    classFeaturesStep2: 0,
                    infoBox: 0,
                    classFeaturesCharacterSheet: 0
                };
                compiledRows.push(row);
            }
            row.cantripsAmount = prow.cantripsAmount || 0;
            row.preparedSpellsAmount = prow.preparedSpellsAmount || 0;
            for (let i = 1; i <= 9; i++) row[`SSpSL${i}`] = prow[`SSpSL${i}`] || 0;
            if (Array.isArray(prow.spellListLabels) && prow.spellListLabels.length) {
                row.spellListLabels = prow.spellListLabels.slice();
            }
        }
    }

    // MagicSkills / UC-Zauber / Spell-Ability (wie Custom-Class-Compile)
    let magicSkillsList = [];
    let subclassSpellsList = [];
    let abilityList = [];
    if (typeof compileCustomMagicSkillsData === "function") {
        const magicPack = compileCustomMagicSkillsData(fakeState, parentSlug, compileMeta);
        magicSkillsList = magicPack.magicSkillsList || [];
        subclassSpellsList = magicPack.subclassSpellsList || [];
        abilityList = magicPack.subclassSpellAbilityList || [];
    }
    if (prog?.unlocked && state.spellConfigMode !== "parentReadonly") {
        const hasSpellEntry = magicSkillsList.some(e =>
            e.subclass === scNum
            && Array.isArray(e.translationLabel)
            && e.translationLabel[0] === "spellcastingLabel"
        );
        if (!hasSpellEntry && typeof createEmptyCompiledMagicSkillEntry === "function") {
            const maxRow = (typeof getSpellProgRowFromProgression === "function")
                ? getSpellProgRowFromProgression(prog, 20)
                : prog.userRows?.["20"];
            const lists = (Array.isArray(prog.baseSpellListLabels) && prog.baseSpellListLabels.length)
                ? prog.baseSpellListLabels.slice()
                : ((state.levelFeatures || []).find(s =>
                    s?.payload?.featureType === "simple" && s.payload?.category === "spellcasting"
                )?.payload?.optionsConfig?.spellListLabels || []).filter(Boolean);
            const entry = createEmptyCompiledMagicSkillEntry(9000 + scNum, parentSlug, scNum);
            entry.translationLabel = ["spellcastingLabel"];
            entry.getSpellList_c = lists;
            entry.getSpellList_sl = (typeof buildCompiledSpellGradeLabelsFromProgRow === "function")
                ? buildCompiledSpellGradeLabelsFromProgRow(maxRow)
                : ["cantripLabel", "1stLevelLabel", "2ndLevelLabel", "3rdLevelLabel", "4thLevelLabel"];
            entry.chooseType = 1;
            magicSkillsList.push(entry);
        }
        if (!abilityList.some(a => a.subclassCategoryNumber === scNum)) {
            let ability = "intelligenceLabel";
            const spellSlot = (state.levelFeatures || []).find(s =>
                s.payload?.featureType === "simple" && s.payload?.category === "spellcasting"
            );
            if (spellSlot?.payload?.optionsConfig?.spellcastingAbility) {
                ability = spellSlot.payload.optionsConfig.spellcastingAbility;
            }
            abilityList.push({
                classLabel: parentSlug,
                subclassLabel: labelKey,
                subclassCategoryNumber: scNum,
                spellAbillityLabel: ability
            });
        }
    }

    return {
        slug,
        labelKey,
        descKey,
        compiledClassDataRows: compiledRows,
        compiledSubclassListEntry: {
            subclassCategoryNumber: scNum,
            translationLabel: labelKey,
            subclassD: descKey,
            isCustom: true,
            // Standalone-Custom-UC: Quelle DiceCharacters
            source: (typeof CUSTOM_CONTENT_SOURCE !== "undefined"
                ? CUSTOM_CONTENT_SOURCE.slice()
                : ["dicecharacters"])
        },
        compiledSubclassSpellAbilityList: abilityList,
        compiledMagicSkillsList: magicSkillsList,
        compiledSubclassSpellsList: subclassSpellsList,
        translations: translationsBag
    };
}

function buildCustomSubclassPackageDependencies(state) {
    const scan = {
        spellIds: [],
        featIds: [],
        spellLabels: [],
        featLabels: []
    };
    if (typeof walkDcLfSlotsForCustomRefs === "function") {
        walkDcLfSlotsForCustomRefs(state?.levelFeatures || [], scan);
    }
    return (typeof buildDcPackageDepsFromCustomRefs === "function")
        ? buildDcPackageDepsFromCustomRefs(scan, {
            spellPackId: (typeof resolveDcSessionSpellPackId === "function")
                ? resolveDcSessionSpellPackId()
                : null,
            featPackId: (typeof resolveDcSessionFeatPackId === "function")
                ? resolveDcSessionFeatPackId()
                : null
        })
        : [];
}

function buildCustomSubclassExportPayload(state) {
    const compiled = compileCustomSubclassRuntime(state);
    const flat = {
        version: 1,
        type: "customSubclass",
        targetClassSlug: state.targetClassSlug,
        targetClassPackageId: state.targetClassPackageId || null,
        subclassCategoryNumber: CUSTOM_SUBCLASS_CATEGORY_NUMBER,
        names: JSON.parse(JSON.stringify(state.names)),
        descriptions: JSON.parse(JSON.stringify(state.descriptions)),
        availableLanguages: Array.isArray(state.availableLanguages)
            ? state.availableLanguages.slice()
            : [],
        levelFeatures: JSON.parse(JSON.stringify(state.levelFeatures)),
        spellConfigMode: state.spellConfigMode,
        spellPresetSubclassNumber: state.spellPresetSubclassNumber,
        spellcastingProgression: JSON.parse(JSON.stringify(state.spellcastingProgression)),
        compiledClassDataRows: compiled.compiledClassDataRows,
        compiledSubclassListEntry: compiled.compiledSubclassListEntry,
        compiledSubclassSpellAbilityList: compiled.compiledSubclassSpellAbilityList,
        compiledMagicSkillsList: compiled.compiledMagicSkillsList,
        compiledSubclassSpellsList: compiled.compiledSubclassSpellsList,
        translations: compiled.translations,
        slug: compiled.slug
    };
    if (typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined") {
        const deps = [];
        if (state.targetClassPackageId) {
            deps.push({
                packageType: DC_PACKAGE_TYPE.CUSTOM_CLASS,
                packageId: state.targetClassPackageId,
                slug: state.targetClassSlug,
                required: true
            });
        } else {
            deps.push({
                packageType: "phbClass",
                packageId: null,
                slug: state.targetClassSlug,
                required: true
            });
        }
        const customDeps = (typeof buildCustomSubclassPackageDependencies === "function")
            ? buildCustomSubclassPackageDependencies(state)
            : [];
        const merged = (typeof mergeDcPackageDependencies === "function")
            ? mergeDcPackageDependencies(deps.concat(customDeps))
            : deps.concat(customDeps);
        return wrapDcPackage({
            packageType: DC_PACKAGE_TYPE.CUSTOM_SUBCLASS,
            packageId: state.packageId || undefined,
            createdAt: state.packageCreatedAt || undefined,
            provides: [{ kind: "subclass", slug: compiled.slug, parentSlug: state.targetClassSlug, index: CUSTOM_SUBCLASS_CATEGORY_NUMBER }],
            dependencies: merged,
            payload: flat
        });
    }
    return flat;
}

/**
 * Snapshot ohne updatedAt/createdAt – sonst würde jeder Speichern-Klick als Änderung gelten
 * (analog getCustomClassExportSnapshotString).
 */
function getCustomSubclassExportSnapshotString(exportData) {
    if (exportData && exportData.dc && exportData.payload) {
        return JSON.stringify({
            packageId: exportData.dc.packageId,
            verificationCode: exportData.dc.verificationCode,
            provides: exportData.dc.provides || [],
            dependencies: exportData.dc.dependencies || [],
            payload: exportData.payload
        });
    }
    return JSON.stringify(exportData);
}

function buildCustomSubclassSnapshotFromEditorState(state) {
    if (!state) return "";
    return getCustomSubclassExportSnapshotString(buildCustomSubclassExportPayload(state));
}

function saveCustomSubclass() {
    const st = customSubclassEditorState;
    if (!st) return;
    syncCscHeaderFromDom();
    if (!String(st.names.de || "").trim() && !String(st.names.en || "").trim()) {
        alert(tCC("cscNameRequiredAlertLabel") || "Bitte eine Bezeichnung angeben.");
        return;
    }
    ensureCscLevelFeatureSlots(st);
    const payload = buildCustomSubclassExportPayload(st);
    if (payload?.dc?.packageId) {
        st.packageId = payload.dc.packageId;
        st.packageCreatedAt = payload.dc.createdAt || st.packageCreatedAt;
    }
    const currentSnapshot = getCustomSubclassExportSnapshotString(payload);
    const hasChanges = customSubclassImportSnapshot === null
        || currentSnapshot !== customSubclassImportSnapshot;

    // JSON-Download nur bei neuen oder geänderten Daten
    if (hasChanges) {
        const name = buildCustomSubclassFilename(st);
        if (typeof downloadJson === "function") downloadJson(name, payload);
        else {
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
        }
    }
    customSubclassImportSnapshot = currentSnapshot;
    registerCustomSubclassInRuntime(payload);
    closeCustomSubclassModal();
}

function getCscDateStamp() {
    const d = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${String(d.getDate()).padStart(2, "0")}${months[d.getMonth()]}${d.getFullYear()}`;
}

/** Anzeigename der Elternklasse für den Export-Dateinamen */
function resolveCscParentDisplayNameForFilename(state) {
    const slug = String(state?.targetClassSlug || "").toLowerCase();
    if (!slug) return "parent";
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    const other = active === "de" ? "en" : "de";
    if (typeof translations !== "undefined") {
        const fromActive = translations[active]?.[slug];
        const fromOther = translations[other]?.[slug];
        if (fromActive || fromOther) return String(fromActive || fromOther);
    }
    // Fallback Custom-Klasse: Namen aus dem Klassen-Editor, falls dieselbe Klasse aktiv ist
    if (typeof registeredCustomClass !== "undefined"
        && registeredCustomClass?.translationLabel
        && String(registeredCustomClass.translationLabel).toLowerCase() === slug
        && typeof customClassEditorState !== "undefined"
        && customClassEditorState?.names) {
        return customClassEditorState.names[active]
            || customClassEditorState.names[other]
            || slug;
    }
    return slug;
}

/**
 * Export-Dateiname: custom_subclass_<Elternklasse>_<Unterklasse>_<TTMMMJJJJ>.json
 * Analog Klassen-Export (slugify + aktive UI-Sprache).
 */
function buildCustomSubclassFilename(state) {
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    const other = active === "de" ? "en" : "de";
    const parentRaw = resolveCscParentDisplayNameForFilename(state);
    const subRaw = state?.names?.[active] || state?.names?.[other] || "uc";
    const slugify = typeof slugifyClassName === "function"
        ? slugifyClassName
        : (s => String(s || "x").replace(/\s+/g, "_"));
    return `custom_subclass_${slugify(parentRaw)}_${slugify(subRaw)}_${getCscDateStamp()}.json`;
}

function unregisterPreviousCustomSubclass() {
    registeredCustomSubclass = null;
}

/** Runtime + LocalStorage + Radios der Standalone-Custom-UC vollständig entfernen */
function clearCustomSubclassRuntimeCompletely() {
    unregisterPreviousCustomSubclass();
    customSubclassEditorState = null;
    customSubclassImportSnapshot = null;
    customSubclassEditorOpen = false;
    try {
        localStorage.removeItem(CUSTOM_SUBCLASS_LS_KEY);
    } catch (e) {
        console.warn("customSubclassRuntime löschen fehlgeschlagen:", e);
    }
    if (typeof character !== "undefined" && character?.class
        && typeof refreshCreatorSubclassOptionsRadios === "function") {
        refreshCreatorSubclassOptionsRadios({});
    }
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
    return true;
}

function registerCustomSubclassInRuntime(rawOrEnvelope) {
    let payload = rawOrEnvelope;
    let envelope = rawOrEnvelope?.dc || null;
    if (typeof normalizeDcPackageInput === "function") {
        const norm = normalizeDcPackageInput(rawOrEnvelope);
        if (norm?.ok && norm.payload) {
            payload = norm.payload;
            envelope = norm.envelope || envelope;
        }
    } else if (rawOrEnvelope?.dc && rawOrEnvelope?.payload) {
        payload = rawOrEnvelope.payload;
    }
    if (!payload) return false;
    // Export: customSubclass; LocalStorage: customSubclassRuntime
    if (payload.type !== "customSubclass" && payload.type !== "customSubclassRuntime") return false;
    if (!payload.compiledSubclassListEntry) return false;

    unregisterPreviousCustomSubclass();

    if (payload.translations?.de && typeof translations !== "undefined") {
        Object.assign(translations.de, payload.translations.de);
    }
    if (payload.translations?.en && typeof translations !== "undefined") {
        Object.assign(translations.en, payload.translations.en);
    }

    if (payload.compiledSubclassListEntry
        && typeof applyCustomContentSource === "function") {
        applyCustomContentSource(payload.compiledSubclassListEntry);
    }

    registeredCustomSubclass = {
        targetClassSlug: String(payload.targetClassSlug || "").toLowerCase(),
        targetClassPackageId: payload.targetClassPackageId || null,
        subclassCategoryNumber: CUSTOM_SUBCLASS_CATEGORY_NUMBER,
        slug: payload.slug,
        translationLabel: payload.compiledSubclassListEntry?.translationLabel,
        compiledClassDataRows: payload.compiledClassDataRows || [],
        compiledSubclassListEntry: payload.compiledSubclassListEntry,
        compiledSubclassSpellAbilityList: payload.compiledSubclassSpellAbilityList || [],
        compiledMagicSkillsList: payload.compiledMagicSkillsList || [],
        compiledSubclassSpellsList: payload.compiledSubclassSpellsList || [],
        translations: payload.translations || { de: {}, en: {} },
        packageId: envelope?.packageId || payload.packageId || null,
        rawPayload: payload,
        envelope: envelope
    };

    refreshCreatorSubclassOptionsRadios({ preferNotSelectCustom: true });
    persistCustomSubclassRuntimeToLocalStorage();
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
    return true;
}

/**
 * Schritt-6-Radios neu aufbauen (PHB + ggf. Custom-UC).
 * Nur #subclassOptions – keine Skill-Dropdowns zurücksetzen.
 * @param {{ preferNotSelectCustom?: boolean, selectedValue?: number|string|null }} opts
 */
function refreshCreatorSubclassOptionsRadios(opts) {
    const options = opts || {};
    if (typeof character === "undefined" || !character?.class) return false;
    const className = String(character.class).toLowerCase();
    if (registeredCustomSubclass
        && registeredCustomSubclass.targetClassSlug !== className) {
        return false;
    }

    const el = document.getElementById("subclassOptions");
    if (!el) return false;

    // Translations der Custom-UC sicher einspielen
    if (registeredCustomSubclass?.translations) {
        if (registeredCustomSubclass.translations.de && typeof translations !== "undefined") {
            Object.assign(translations.de, registeredCustomSubclass.translations.de);
        }
        if (registeredCustomSubclass.translations.en && typeof translations !== "undefined") {
            Object.assign(translations.en, registeredCustomSubclass.translations.en);
        }
    }

    const subclassList = getEffectiveSubclassListForClass(className);
    if (!Array.isArray(subclassList) || !subclassList.length) return false;

    const prevChecked = document.querySelector('input[name="subclass"]:checked')?.value;
    const prevStored = character.classForm?.subclass != null
        ? String(character.classForm.subclass)
        : null;
    let restoreValue = options.selectedValue != null
        ? String(options.selectedValue)
        : (prevChecked || prevStored);

    // Nach Speichern/Import Custom-UC nicht automatisch vorauswählen
    if (options.preferNotSelectCustom
        && restoreValue
        && Number(restoreValue) === CUSTOM_SUBCLASS_CATEGORY_NUMBER) {
        restoreValue = null;
    }

    const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
    el.innerHTML = subclassList.map(subclass => {
        const label = (typeof translations !== "undefined" && translations[lang]
            && translations[lang][subclass.translationLabel])
            || subclass.translationLabel;
        const isCustom = (typeof isCustomContentSubclass === "function")
            ? isCustomContentSubclass(subclass, className)
            : (subclass.isCustom
                || Number(subclass.subclassCategoryNumber) === CUSTOM_SUBCLASS_CATEGORY_NUMBER);
        const markerHtml = isCustom && typeof getCustomContentMarkerHtml === "function"
            ? getCustomContentMarkerHtml()
            : "";
        return `<label${isCustom ? ' class="cc-custom-subclass-option"' : ""}>
            <input type="radio" name="subclass" value="${subclass.subclassCategoryNumber}"${isCustom ? ' data-custom-subclass="1"' : ""}> ${label}${markerHtml}
        </label>`;
    }).join("");

    document.querySelectorAll('input[name="subclass"]').forEach(input => {
        input.addEventListener("change", () => {
            const selectedSubclassNumber = parseInt(input.value, 10);
            if (typeof populateAbilityImprovementOptions === "function") {
                populateAbilityImprovementOptions(
                    typeof getClassData === "function" ? getClassData(className, "class") : null,
                    character.level
                );
            }
            if (typeof applyPassiveClassFeatures === "function") applyPassiveClassFeatures();
            if (typeof updateSubclassDynamicContent === "function") {
                updateSubclassDynamicContent(selectedSubclassNumber, character.level);
            }
            if (typeof showSubclassDetails === "function") {
                showSubclassDetails(selectedSubclassNumber);
            }
            if (typeof updateSkills === "function") updateSkills();
            if (typeof setupFeatSelection === "function") setupFeatSelection();
        });
    });

    if (restoreValue != null && restoreValue !== "") {
        const radio = document.querySelector(`input[name="subclass"][value="${restoreValue}"]`);
        if (radio) radio.checked = true;
    }

    if (typeof displayClassSectionsBasedOnLevel === "function") {
        displayClassSectionsBasedOnLevel(character.level);
    }
    if (typeof applyCustomFeatureVisibility === "function") applyCustomFeatureVisibility();
    if (typeof applyCscTranslations === "function") applyCscTranslations();
    return true;
}

/** Basis-Unterklassenliste ohne Standalone-Custom-UC (kein getClassData, vermeidet Rekursion) */
function getBaseSubclassListForClass(className) {
    const slug = String(className || "").toLowerCase();
    if (typeof getRegisteredCustomClassBundle === "function") {
        const customBundle = getRegisteredCustomClassBundle(slug);
        if (customBundle?.subclassList) return customBundle.subclassList.slice();
    }
    const map = {
        barbarian: typeof subclassListBarbarian !== "undefined" ? subclassListBarbarian : null,
        bard: typeof subclassListBard !== "undefined" ? subclassListBard : null,
        cleric: typeof subclassListCleric !== "undefined" ? subclassListCleric : null,
        druid: typeof subclassListDruid !== "undefined" ? subclassListDruid : null,
        fighter: typeof subclassListFighter !== "undefined" ? subclassListFighter : null,
        monk: typeof subclassListMonk !== "undefined" ? subclassListMonk : null,
        paladin: typeof subclassListPaladin !== "undefined" ? subclassListPaladin : null,
        ranger: typeof subclassListRanger !== "undefined" ? subclassListRanger : null,
        rogue: typeof subclassListRogue !== "undefined" ? subclassListRogue : null,
        sorcerer: typeof subclassListSorcerer !== "undefined" ? subclassListSorcerer : null,
        warlock: typeof subclassListWarlock !== "undefined" ? subclassListWarlock : null,
        wizard: typeof subclassListWizard !== "undefined" ? subclassListWizard : null
    };
    return Array.isArray(map[slug]) ? map[slug].slice() : [];
}

function getEffectiveSubclassListForClass(className) {
    const slug = String(className || "").toLowerCase();
    let list = getBaseSubclassListForClass(slug);
    if (registeredCustomSubclass
        && registeredCustomSubclass.targetClassSlug === slug
        && registeredCustomSubclass.compiledSubclassListEntry) {
        list = list.filter(s => s.subclassCategoryNumber !== CUSTOM_SUBCLASS_CATEGORY_NUMBER);
        list.push(registeredCustomSubclass.compiledSubclassListEntry);
    }
    return list;
}

function getRegisteredCustomSubclassBundle(className) {
    if (!registeredCustomSubclass) return null;
    if (className && registeredCustomSubclass.targetClassSlug !== String(className).toLowerCase()) {
        return null;
    }
    return registeredCustomSubclass;
}

/**
 * true = Charakter hat die geladene Standalone-Custom-UC tatsächlich gewählt
 * (nicht nur in der Session geladen). finishCharacter → Runtime für den Bogen.
 */
function characterUsesRegisteredCustomSubclass(character) {
    if (!character?.class) return false;
    const bundle = getRegisteredCustomSubclassBundle(character.class);
    if (!bundle) return false;
    const selected = parseInt(character.classForm?.subclass, 10);
    if (!Number.isFinite(selected) || selected <= 0) return false;
    const fromEntry = bundle.compiledSubclassListEntry?.subclassCategoryNumber;
    const customNum = (fromEntry != null && Number.isFinite(Number(fromEntry)))
        ? Number(fromEntry)
        : (Number.isFinite(Number(bundle.subclassCategoryNumber))
            ? Number(bundle.subclassCategoryNumber)
            : CUSTOM_SUBCLASS_CATEGORY_NUMBER);
    return selected === customNum;
}

function mergeRegisteredCustomSubclassIntoClassData(className, classData) {
    const bundle = getRegisteredCustomSubclassBundle(className);
    if (!bundle || !Array.isArray(classData)) return classData;
    const without = classData.filter(r =>
        (r.subclassCategoryNumber || 0) !== CUSTOM_SUBCLASS_CATEGORY_NUMBER
    );
    return without.concat(bundle.compiledClassDataRows || []);
}

function persistCustomSubclassRuntimeToLocalStorage() {
    if (!registeredCustomSubclass?.rawPayload) return false;
    const flat = {
        version: 1,
        type: "customSubclassRuntime",
        ...registeredCustomSubclass.rawPayload,
        targetClassSlug: registeredCustomSubclass.targetClassSlug
    };
    try {
        const wrapped = (typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined")
            ? wrapDcPackage({
                packageType: DC_PACKAGE_TYPE.CUSTOM_SUBCLASS,
                packageId: registeredCustomSubclass.packageId || undefined,
                provides: [{ kind: "subclassRuntime", slug: registeredCustomSubclass.slug }],
                dependencies: registeredCustomSubclass.targetClassPackageId
                    ? [{ packageType: DC_PACKAGE_TYPE.CUSTOM_CLASS, packageId: registeredCustomSubclass.targetClassPackageId, slug: registeredCustomSubclass.targetClassSlug, required: true }]
                    : [{ packageType: "phbClass", slug: registeredCustomSubclass.targetClassSlug, required: true }],
                payload: flat
            })
            : flat;
        localStorage.setItem(CUSTOM_SUBCLASS_LS_KEY, JSON.stringify(wrapped));
        return true;
    } catch (e) {
        console.warn("customSubclassRuntime speichern fehlgeschlagen:", e);
        return false;
    }
}

function applyCscTranslations() {
    const set = (id, key, fallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = tCC(key) || fallback || key;
    };
    set("customSubclassModalTitleLabel", "cscModalTitleLabel", "Eigene Unterklasse");
    set("customSubclassCreateNewBtn", "cscCreateNewLabel", "Neu erstellen");
    set("customSubclassUploadBtn", "cscUploadLabel", "JSON hochladen");
    set("customSubclassEditorTitleLabel", "cscModalTitleLabel", "Eigene Unterklasse");
    set("customSubclassTabFeaturesBtn", "subclass", "Unterklasse");
    set("customSubclassTabSpellBtn", "cscTabSpellLabel", "Zauberwirken");
    set("customSubclassSaveBtn", "cfSaveLabel", "Speichern");
    const addBtn = document.getElementById("addCustomSubclassBtn");
    if (addBtn) {
        const label = tCC("cscAddSubclassLabel") || "Eigene Unterklasse erstellen";
        addBtn.title = label;
        addBtn.setAttribute("aria-label", label);
    }
}

/** Creator-Start / Seiten-Reset: keine Hydration – Custom-UC muss neu gespeichert werden */
function resetCustomSubclassRuntimeOnCreatorLoad() {
    // --- LEVEL-UP: Runtime aus Snapshot behalten ---
    if (typeof shouldSkipCreatorRuntimeResetForLevelUp === "function"
        && shouldSkipCreatorRuntimeResetForLevelUp()) {
        return;
    }
    clearCustomSubclassRuntimeCompletely();
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        resetCustomSubclassRuntimeOnCreatorLoad();
    });
}
