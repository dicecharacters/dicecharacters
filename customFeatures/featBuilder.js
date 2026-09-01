//=======================================================================
// Custom Feat Builder (customFeatures/featBuilder.js)
//=======================================================================
// Talentbibliothek (Schritt 6): Chooser, Editor (Tab 1 Übersicht / Tab 2
// Details), Compile nach featList + magicFeatsList, Pack-Export.
// Bibliothek = Blatt in der Hierarchie (keine Consumer-Rückverweise).
//
// Flags / Visibility: customFeatures/shared.js (zuerst laden).
// Shared Utilities:   tCC, renderLangAvailabilityRowHtml (classBuilder.js)
// Bogen-Runtime:      customFeatures/customFeaturesSheet.js
// Pakete / Graph:     dcPackage.js (Projektroot)
//=======================================================================

//=======================================================================
// CUSTOM_FEAT_CONFIG – zentrale Schnell-Einstellungen
//=======================================================================
const CUSTOM_FEAT_CONFIG = Object.freeze({
    /** Erste freie Custom-Feat-ID (PHB liegt darunter) */
    idMin: 1000,
    /** Max. Talente pro Bibliothek / Session */
    maxFeatsPerPack: 30,
    /** Max. Zeichen Name (pro Sprache) */
    nameMax: 30,
    /** Max. Zeichen Beschreibung (pro Sprache); Beschreibung optional */
    descMax: 500,
    /** Merkmalszeilen in Tab 2 (wie Klassen-Tab-2, fest 2 Vorteile) */
    featureRowCount: 2,
    /** Zulässige Kategorien (1 Herkunft, 2 Allgemein, 3 Kampfstil, 4 Epische Gabe) */
    allowedCategories: Object.freeze([1, 2, 3, 4]),
    /** LocalStorage-Schlüssel Runtime (Ersteller → Bogen) */
    lsKey: "customFeatPackRuntime",
    /** Dateiname-Präfix: custom_feats_<Datum> */
    filenamePrefix: "custom_feats"
});

const CFF_CONFIG = CUSTOM_FEAT_CONFIG;
const CUSTOM_FEAT_ID_MIN = CUSTOM_FEAT_CONFIG.idMin;
const CUSTOM_FEAT_PACK_LS_KEY = CUSTOM_FEAT_CONFIG.lsKey;

const CFF_ABILITY_LABELS = Object.freeze([
    "strengthLabel", "dexterityLabel", "constitutionLabel",
    "intelligenceLabel", "wisdomLabel", "charismaLabel"
]);

const CFF_ABILITY_ABBR = Object.freeze({
    strengthLabel: "strengthAbbrLabel",
    dexterityLabel: "dexterityAbbrLabel",
    constitutionLabel: "constitutionAbbrLabel",
    intelligenceLabel: "intelligenceAbbrLabel",
    wisdomLabel: "wisdomAbbrLabel",
    charismaLabel: "charismaAbbrLabel"
});

const CFF_CATEGORY_LABEL_KEYS = Object.freeze({
    1: "ccLfFeatCatOriginLabel",
    2: "ccLfFeatCatGeneralLabel",
    3: "ccLfFeatCatFightingStyleLabel",
    4: "ccLfFeatCatEpicBoonLabel"
});

const CFF_SPELL_LEVEL_LABELS = Object.freeze([
    "cantripLabel", "1stLevelLabel", "2ndLevelLabel", "3rdLevelLabel", "4thLevelLabel",
    "5thLevelLabel", "6thLevelLabel", "7thLevelLabel", "8thLevelLabel", "9thLevelLabel"
]);

const CFF_FEATURE_TYPES = Object.freeze(["simple", "options", "spellcraft"]);

const CFF_CATEGORIES_BY_TYPE = Object.freeze({
    simple: Object.freeze(["skills", "savingThrows", "tools", "weaponTraining", "armorTraining"]),
    options: Object.freeze(["free", "skills", "savingThrows", "expertise", "tools", "weaponMasteries"]),
    spellcraft: Object.freeze(["getCantrip", "chooseCantrip", "getPreparedSpell", "choosePreparedSpell"])
});

const CFF_CATEGORY_ALIASES = Object.freeze({
    weapons: "weaponTraining",
    armor: "armorTraining",
    getPrepared: "getPreparedSpell",
    choosePrepared: "choosePreparedSpell"
});

//=======================================================================
// State / Session
//=======================================================================

let customFeatEditorOpen = false;
let customFeatActiveTab = 1;
let customFeatEditorState = null;
let customFeatImportSnapshot = null;
let customFeatEditingId = null;
let customFeatDraft = null;
let cffLfFloatContext = null;
let cffOverviewFilters = { category: "", search: "" };

/**
 * Ein aktives Feat-Pack pro Session (Runtime).
 * @type {{
 *   packageId: string|null,
 *   verificationCode: string|null,
 *   feats: object[],
 *   magicFeats: object[],
 *   translations: { de: object, en: object },
 *   availableLanguages: string[],
 *   nextId: number,
 *   nextMagicId: number,
 *   rawPayload: object|null,
 *   envelope: object|null
 * }}
 */
let registeredCustomFeatPack = {
    packageId: null,
    verificationCode: null,
    feats: [],
    magicFeats: [],
    translations: { de: {}, en: {} },
    availableLanguages: [],
    nextId: CUSTOM_FEAT_ID_MIN,
    nextMagicId: CUSTOM_FEAT_ID_MIN,
    rawPayload: null,
    envelope: null
};

function createEmptyCustomFeatPackState() {
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    return {
        packageId: null,
        packageCreatedAt: null,
        availableLanguages: [active],
        feats: [],
        magicFeats: [],
        nextId: CUSTOM_FEAT_ID_MIN,
        nextMagicId: CUSTOM_FEAT_ID_MIN,
        translations: { de: {}, en: {} }
    };
}

function cloneCustomFeatPackState(src) {
    if (!src) return createEmptyCustomFeatPackState();
    return {
        packageId: src.packageId || null,
        packageCreatedAt: src.packageCreatedAt || null,
        availableLanguages: Array.isArray(src.availableLanguages)
            ? src.availableLanguages.slice()
            : [(typeof currentLang !== "undefined" ? currentLang : "de")],
        feats: Array.isArray(src.feats)
            ? src.feats.map(f => (f && typeof f === "object" ? JSON.parse(JSON.stringify(f)) : f))
            : [],
        magicFeats: Array.isArray(src.magicFeats)
            ? src.magicFeats.map(m => (m && typeof m === "object" ? Object.assign({}, m) : m))
            : [],
        nextId: Number.isFinite(Number(src.nextId))
            ? Math.max(CUSTOM_FEAT_ID_MIN, parseInt(src.nextId, 10))
            : CUSTOM_FEAT_ID_MIN,
        nextMagicId: Number.isFinite(Number(src.nextMagicId))
            ? Math.max(CUSTOM_FEAT_ID_MIN, parseInt(src.nextMagicId, 10))
            : CUSTOM_FEAT_ID_MIN,
        translations: {
            de: Object.assign({}, src.translations?.de || {}),
            en: Object.assign({}, src.translations?.en || {})
        }
    };
}

function peekNextCustomFeatId(state) {
    const base = Math.max(CUSTOM_FEAT_ID_MIN, parseInt(state?.nextId, 10) || CUSTOM_FEAT_ID_MIN);
    let maxId = base - 1;
    (state?.feats || []).forEach(f => {
        const id = parseInt(f?.ID, 10);
        if (Number.isFinite(id) && id > maxId) maxId = id;
    });
    return Math.max(CUSTOM_FEAT_ID_MIN, maxId + 1);
}

function peekNextCustomFeatMagicId(state) {
    const base = Math.max(CUSTOM_FEAT_ID_MIN, parseInt(state?.nextMagicId, 10) || CUSTOM_FEAT_ID_MIN);
    let maxId = base - 1;
    (state?.magicFeats || []).forEach(m => {
        const id = parseInt(m?.ID, 10);
        if (Number.isFinite(id) && id > maxId) maxId = id;
    });
    return Math.max(CUSTOM_FEAT_ID_MIN, maxId + 1);
}

function cffDefaultPrereqLevel(cat) {
    const n = parseInt(cat, 10);
    if (n === 2) return 4;
    if (n === 4) return 19;
    return 1;
}

function createEmptyCustomFeatDraft() {
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    const rows = [];
    const n = CFF_CONFIG.featureRowCount || 2;
    for (let i = 0; i < n; i++) {
        rows.push(createEmptyCffFeatureRow());
    }
    return {
        ID: null,
        translationLabel: null,
        names: { de: "", en: "" },
        descriptions: { de: "", en: "" },
        availableLanguages: [active],
        featCategoryNumber: 0,
        prerequisiteLevel: 1,
        prereqAttributes: [],
        prereqAttributeValue: 13,
        prereqNoThreshold: 1,
        prereqFeatureMode: "none",
        multipleSelection: 0,
        attrImprovement: [],
        featureRows: rows
    };
}

function createEmptyCffFeatureRow() {
    return {
        kind: "",
        category: "",
        pool: [],
        amount: 1,
        spellLevels: [],
        optionsConfig: {}
    };
}

function cffSkillNumberToLabel(num) {
    const n = parseInt(num, 10);
    const sk = cffGetSkillList().find(s => Number(s.skillCategoryNumber) === n);
    return sk ? sk.translationLabel : null;
}

function cffSkillLabelToNumber(label) {
    const sk = cffGetSkillList().find(s => s.translationLabel === label);
    return sk ? sk.skillCategoryNumber : NaN;
}

function cffSpellIdToLabel(id) {
    const s = cffGetSpellList().find(x => Number(x.ID) === Number(id));
    return s ? s.translationLabel : null;
}

function cffMigrateLegacyRowToOptionsConfig(row) {
    const cfg = (row.optionsConfig && typeof row.optionsConfig === "object")
        ? Object.assign({}, row.optionsConfig)
        : {};
    const pool = Array.isArray(row.pool) ? row.pool : [];
    const kind = row.kind;
    const cat = row.category;
    const hasCfg = Object.keys(cfg).length > 0;
    if (hasCfg) return cfg;

    if (kind === "simple" && cat === "skills" && pool.length) {
        cfg.selectedSkills = pool.map(cffSkillNumberToLabel).filter(Boolean);
    } else if (kind === "simple" && cat === "savingThrows" && pool.length) {
        cfg.mode = "selection";
        cfg.selectedLabels = pool.slice();
    } else if (kind === "simple" && cat === "tools" && pool.length) {
        cfg.selectedLabels = pool.map(v => {
            const t = cffGetToolList().find(x => Number(x.ID) === Number(v) || x.translationLabel === v);
            return t ? t.translationLabel : String(v);
        }).filter(Boolean);
    } else if (kind === "simple" && cat === "weaponTraining" && pool.length) {
        cfg.weaponCategoryMode = "selection";
        cfg.weaponPropertyMode = "selection";
        cfg.selectedWeaponCategoryNumbers = pool.map(n => parseInt(n, 10)).filter(Number.isFinite);
    } else if (kind === "simple" && cat === "armorTraining" && pool.length) {
        cfg.mode = "selection";
        cfg.selectedArmorCategoryNumbers = pool.map(n => parseInt(n, 10)).filter(Number.isFinite);
    } else if (kind === "options" && (cat === "skills" || cat === "expertise") && pool.length) {
        cfg.skillFilter = "selection";
        cfg.selectedSkills = pool.map(v => (typeof v === "string" && v.endsWith("Label")) ? v : cffSkillNumberToLabel(v)).filter(Boolean);
    } else if (kind === "options" && cat === "savingThrows" && pool.length) {
        cfg.mode = "selection";
        cfg.selectedLabels = pool.slice();
    } else if (kind === "options" && cat === "tools" && pool.length) {
        cfg.mode = "selection";
        cfg.allowedLabels = pool.map(v => {
            const t = cffGetToolList().find(x => Number(x.ID) === Number(v) || x.translationLabel === v);
            return t ? t.translationLabel : String(v);
        }).filter(Boolean);
    } else if (kind === "spellcraft" && cat === "getCantrip" && pool.length) {
        cfg.listMode = "all";
        cfg.selectedSpells = pool.map(v => cffSpellIdToLabel(v) || String(v)).filter(Boolean);
        while (cfg.selectedSpells.length < 3) cfg.selectedSpells.push("");
    } else if (kind === "spellcraft" && cat === "chooseCantrip") {
        cfg.listMode = "all";
        cfg.schoolMode = "all";
        cfg.pickCount = Math.max(1, parseInt(row.amount, 10) || 1);
    } else if (kind === "spellcraft" && cat === "getPreparedSpell" && pool.length) {
        cfg.listMode = "all";
        cfg.levelMode = "all";
        const byLevel = {};
        pool.forEach(v => {
            const spell = cffGetSpellList().find(s => Number(s.ID) === Number(v) || s.translationLabel === v);
            if (!spell || !spell.spellLevel) return;
            if (!byLevel[spell.spellLevel]) byLevel[spell.spellLevel] = [];
            byLevel[spell.spellLevel].push(spell.translationLabel);
        });
        cfg.selectedByLevel = byLevel;
        cfg.levelLabels = Object.keys(byLevel);
        cfg.levelMode = "selection";
    } else if (kind === "spellcraft" && cat === "choosePreparedSpell") {
        cfg.listMode = "all";
        cfg.schoolMode = "all";
        cfg.levelMode = Array.isArray(row.spellLevels) && row.spellLevels.length ? "selection" : "all";
        cfg.levelLabels = Array.isArray(row.spellLevels) ? row.spellLevels.slice() : [];
        cfg.pickCount = Math.max(1, parseInt(row.amount, 10) || 1);
    }
    return cfg;
}

function cffNormalizeFeatureCategory(category) {
    const raw = String(category || "");
    return CFF_CATEGORY_ALIASES[raw] || raw;
}

function cffNormalizeFeatureRow(row) {
    const base = createEmptyCffFeatureRow();
    if (!row || typeof row !== "object") return base;
    const kind = CFF_FEATURE_TYPES.includes(row.kind) ? row.kind : "";
    let category = cffNormalizeFeatureCategory(row.category);
    const allowed = kind ? (CFF_CATEGORIES_BY_TYPE[kind] || []) : [];
    if (!allowed.includes(category)) category = "";
    return {
        kind,
        category,
        pool: Array.isArray(row.pool) ? row.pool.slice() : [],
        amount: Math.max(1, parseInt(row.amount, 10) || 1),
        spellLevels: Array.isArray(row.spellLevels) ? row.spellLevels.slice() : [],
        optionsConfig: cffMigrateLegacyRowToOptionsConfig(Object.assign({}, row, { kind, category }))
    };
}

function cffNormalizeFeatureRows(rows) {
    const n = CFF_CONFIG.featureRowCount || 2;
    const src = Array.isArray(rows) ? rows.map(cffNormalizeFeatureRow) : [];
    const out = src.slice(0, n);
    while (out.length < n) out.push(createEmptyCffFeatureRow());
    return out;
}

//=======================================================================
// Modal / Chooser
//=======================================================================

function openCustomFeatChooser() {
    if (typeof isCustomFeatureEnabled === "function"
        && !isCustomFeatureEnabled("customFeatsBuilder")) {
        return;
    }
    const overlay = document.getElementById("customFeatOverlay");
    if (!overlay) return;
    const chooser = document.getElementById("customFeatChooserView");
    const editor = document.getElementById("customFeatEditorView");
    if (chooser) chooser.style.display = "";
    if (editor) editor.style.display = "none";
    customFeatEditorOpen = false;
    customFeatEditingId = null;
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode(overlay, true);
    }
    overlay.style.setProperty("display", "flex", "important");
    if (typeof applyLevelUpCustomBibRestrictions === "function") {
        applyLevelUpCustomBibRestrictions();
    }
    applyCffTranslations();
}

function cffHasUserLoadedFeatPackThisSession() {
    if (typeof wasDcPackageUserLoadedThisSession === "function"
        && typeof DC_PACKAGE_TYPE !== "undefined") {
        return wasDcPackageUserLoadedThisSession(DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK);
    }
    return false;
}

function closeCustomFeatModal() {
    const overlay = document.getElementById("customFeatOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    customFeatEditorOpen = false;
}

function discardCustomFeatEditor() {
    closeCffLfFloat({ rerender: false });
    customFeatEditorState = null;
    customFeatImportSnapshot = null;
    customFeatEditorOpen = false;
    customFeatEditingId = null;
    customFeatDraft = null;
    customFeatActiveTab = 1;
    const t1 = document.getElementById("customFeatTab1Content");
    const t2 = document.getElementById("customFeatTab2Content");
    if (t1) t1.innerHTML = "";
    if (t2) t2.innerHTML = "";
    closeCustomFeatModal();
}

function requestCloseCustomFeatModal() {
    if (customFeatEditorOpen && customFeatEditorState) {
        if (cffEditorHasUnsavedChanges()) {
            const msg = (typeof tCC === "function" && tCC("cffCloseConfirmLabel"))
                || "Ungespeicherte Änderungen an der Talentbibliothek verwerfen?";
            if (!confirm(msg)) return;
        }
        discardCustomFeatEditor();
        return;
    }
    closeCustomFeatModal();
}

function cffEditorHasUnsavedChanges() {
    if (!customFeatEditorState) return false;
    const payload = buildCustomFeatPackExportPayload(customFeatEditorState);
    const snap = getCustomFeatPackExportSnapshotString(payload);
    if (customFeatImportSnapshot == null) {
        return (customFeatEditorState.feats || []).length > 0;
    }
    return snap !== customFeatImportSnapshot;
}

function showCustomFeatEditorView() {
    const overlay = document.getElementById("customFeatOverlay");
    const chooser = document.getElementById("customFeatChooserView");
    const editor = document.getElementById("customFeatEditorView");
    if (chooser) chooser.style.display = "none";
    if (editor) editor.style.display = "";
    customFeatEditorOpen = true;
    if (typeof setCustomFeatureModalChooserMode === "function" && overlay) {
        setCustomFeatureModalChooserMode(overlay, false);
    }
    applyCffTranslations();
    switchCustomFeatTab(1);
}

function startCustomFeatCreate() {
    // Neue Bibliothek: bisherige Custom-Talent-Auswahl in Schritt 6 verwerfen
    clearCreatorCustomFeatSelections();
    customFeatEditorState = createEmptyCustomFeatPackState();
    customFeatImportSnapshot = null;
    customFeatEditingId = null;
    customFeatDraft = null;
    resetCffOverviewFilters();
    showCustomFeatEditorView();
}

function triggerCustomFeatUpload() {
    const input = document.getElementById("customFeatFileInput");
    if (input) {
        input.value = "";
        input.click();
    }
}

async function handleCustomFeatFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    let result;
    if (typeof readAndValidateDcPackageFile === "function") {
        result = await readAndValidateDcPackageFile(file, {
            expectedType: (typeof DC_PACKAGE_TYPE !== "undefined")
                ? DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK
                : "customFeatPack"
        });
    } else {
        result = { ok: false, errorCode: "unknownFormat" };
    }

    if (!result?.ok) {
        alert(result?.message
            || (typeof tCC === "function" && tCC("cffImportInvalidAlertLabel"))
            || "Ungültige Talentbibliothek-Datei.");
        if (event?.target) event.target.value = "";
        return;
    }

    const applyFeatPackImport = (payload, envelope) => {
        clearCreatorCustomFeatSelections();
        const loaded = loadCustomFeatPackPayloadIntoEditor(payload, envelope);
        if (!loaded) {
            alert((typeof tCC === "function" && tCC("cffImportInvalidAlertLabel"))
                || "Ungültige Talentbibliothek-Datei.");
            if (event?.target) event.target.value = "";
            return;
        }
        registerCustomFeatPackFromPayload(payload, envelope);
        if (typeof markDcPackageUserLoaded === "function") {
            markDcPackageUserLoaded(
                (typeof DC_PACKAGE_TYPE !== "undefined")
                    ? DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK
                    : "customFeatPack"
            );
        }
        const exportPayload = buildCustomFeatPackExportPayload(customFeatEditorState);
        customFeatImportSnapshot = getCustomFeatPackExportSnapshotString(exportPayload);
        resetCffOverviewFilters();
        showCustomFeatEditorView();
        if (event?.target) event.target.value = "";
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
            alert(match.message
                || (typeof tCC === "function" && tCC("cffImportInvalidAlertLabel"))
                || "Ungültige Talentbibliothek-Datei.");
            if (event?.target) event.target.value = "";
            if (typeof promptNextDcPackageDependencyUpload === "function") {
                promptNextDcPackageDependencyUpload();
            }
            return;
        }
        const registered = registerCustomFeatPackFromPayload(
            result.payload,
            result.envelope
        );
        if (!registered) {
            alert((typeof tCC === "function" && tCC("cffImportInvalidAlertLabel"))
                || "Ungültige Talentbibliothek-Datei.");
            if (event?.target) event.target.value = "";
            if (typeof promptNextDcPackageDependencyUpload === "function") {
                promptNextDcPackageDependencyUpload();
            }
            return;
        }
        if (typeof markDcPackageUserLoaded === "function") {
            markDcPackageUserLoaded(
                (typeof DC_PACKAGE_TYPE !== "undefined")
                    ? DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK
                    : "customFeatPack"
            );
        }
        if (event?.target) event.target.value = "";
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
            onApply: applyFeatPackImport,
            onCancel: () => {
                if (event?.target) event.target.value = "";
            }
        });
        return;
    }

    applyFeatPackImport(result.payload, result.envelope);
}

function loadCustomFeatPackPayloadIntoEditor(payload, envelope) {
    if (!payload || typeof payload !== "object") return false;
    if (payload.type !== "customFeatPack" && payload.type !== "customFeatPackRuntime") {
        return false;
    }
    if (!Array.isArray(payload.feats)) return false;

    const state = createEmptyCustomFeatPackState();
    state.packageId = envelope?.packageId || payload.packageId || null;
    state.packageCreatedAt = envelope?.createdAt || null;
    state.availableLanguages = Array.isArray(payload.availableLanguages)
        ? payload.availableLanguages.slice()
        : state.availableLanguages;
    state.feats = payload.feats.map(f => (f && typeof f === "object" ? JSON.parse(JSON.stringify(f)) : f));
    state.magicFeats = Array.isArray(payload.magicFeats)
        ? payload.magicFeats.map(m => Object.assign({}, m))
        : [];
    state.nextId = Number.isFinite(Number(payload.nextId))
        ? Math.max(CUSTOM_FEAT_ID_MIN, parseInt(payload.nextId, 10))
        : peekNextCustomFeatId(state);
    state.nextMagicId = Number.isFinite(Number(payload.nextMagicId))
        ? Math.max(CUSTOM_FEAT_ID_MIN, parseInt(payload.nextMagicId, 10))
        : peekNextCustomFeatMagicId(state);
    state.translations = {
        de: Object.assign({}, payload.translations?.de || {}),
        en: Object.assign({}, payload.translations?.en || {})
    };
    customFeatEditorState = state;
    customFeatEditingId = null;
    return true;
}

function switchCustomFeatTab(tabNum) {
    closeCffLfFloat({ rerender: false });
    const n = parseInt(tabNum, 10) || 1;
    if (n === 2 && !customFeatDraft) {
        startCustomFeatCreateNew();
        return;
    }
    customFeatActiveTab = n;
    document.querySelectorAll("#customFeatEditorView .custom-class-tab").forEach(btn => {
        const t = parseInt(btn.getAttribute("data-tab"), 10);
        btn.classList.toggle("active", t === n);
    });
    document.querySelectorAll("#customFeatEditorView .custom-class-tab-panel").forEach(panel => {
        const id = panel.id || "";
        const match = id.match(/customFeatTab(\d+)/);
        const t = match ? parseInt(match[1], 10) : 0;
        panel.classList.toggle("active", t === n);
    });
    const editorView = document.getElementById("customFeatEditorView");
    if (editorView) editorView.classList.toggle("cff-tab2-active", n === 2);
    const finishBtn = document.getElementById("customFeatFinishBtn");
    if (finishBtn) finishBtn.style.display = n === 1 ? "" : "none";
    if (n === 1) renderCustomFeatTab1();
    else renderCustomFeatTab2();
}

//=======================================================================
// Helper
//=======================================================================

function cffT(key, fallback) {
    if (typeof tCC === "function") {
        const v = tCC(key);
        if (v && v !== key) return v;
    }
    const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
    if (typeof translations !== "undefined" && translations[lang] && translations[lang][key] != null) {
        return translations[lang][key];
    }
    return fallback || key;
}

/** Übersetzung für feste Zielsprache (Compile der Sheet-Texte). */
function cffTForLang(lang, key, fallback) {
    const L = lang === "en" ? "en" : "de";
    if (typeof translations !== "undefined" && translations[L] && translations[L][key] != null) {
        return translations[L][key];
    }
    return fallback || key;
}

/**
 * Generische Charakterbogen-Blöcke (Kontext + Tags) je Feature-Art.
 * @returns {string[]}
 */
function cffBuildFeatSheetAutoBlocks(lang, translationLabel, flags) {
    const blocks = [];
    if (Array.isArray(flags?.simpleSkillLabels) && flags.simpleSkillLabels.length
        && typeof formatLfAdditionalSkillsShortDesc === "function") {
        blocks.push(formatLfAdditionalSkillsShortDesc(flags.simpleSkillLabels, lang));
    }
    if (flags?.hasSavesChoose) {
        blocks.push(cffTForLang(lang, "cffSheetSavesChooseBlockLabel",
            "Du erhältst Übung in Rettungswürfen für: [CHOICE]classForm.attributes[/CHOICE]"));
    }
    if (flags?.hasMastery) {
        blocks.push(cffTForLang(lang, "cffSheetMasteryBlockLabel",
            "Du kannst die Meisterschaftseigenschaften von Waffen nutzen: [MASTERY_LIST]classForm.weaponMastery[/MASTERY_LIST]"));
    }
    if (flags?.hasSpellChoice) {
        const tpl = cffTForLang(lang, "cffSheetSpellChoiceBlockLabel",
            "Du beherrscht folgende Zauber: [CHOICE_LIST]preparedSpells.source.name.{label}[/CHOICE_LIST] (Einmal täglich kostenlos wirkbar oder mit Zauberplätzen).");
        blocks.push(String(tpl).split("{label}").join(translationLabel));
    }
    if (Array.isArray(flags?.getCantripLabels) && flags.getCantripLabels.length
        && typeof formatLfGetCantripShortDesc === "function") {
        blocks.push(formatLfGetCantripShortDesc(flags.getCantripLabels, lang));
    }
    if (Array.isArray(flags?.getPreparedSpellLabels) && flags.getPreparedSpellLabels.length
        && typeof formatLfGetPreparedSpellShortDesc === "function") {
        blocks.push(formatLfGetPreparedSpellShortDesc(flags.getPreparedSpellLabels, lang));
    }
    if (flags?.hasFreeChoose) {
        const familyId = String(flags.freeFamilyId || "").trim();
        const tag = (typeof buildLfFreeChoicesChoiceListTag === "function")
            ? buildLfFreeChoicesChoiceListTag(familyId)
            : (familyId
                ? `[CHOICE_LIST]classForm.freeChoices:${familyId}[/CHOICE_LIST]`
                : "[CHOICE_LIST]classForm.freeChoices[/CHOICE_LIST]");
        blocks.push(tag);
    }
    return blocks;
}

function cffChoiceHasNameText(choice) {
    const names = choice?.names || choice;
    if (!names || typeof names !== "object") return false;
    return !!(String(names.de || "").trim() || String(names.en || "").trim());
}

function cffPickLocaleText(bag, lang) {
    if (!bag || typeof bag !== "object") return "";
    const primary = String(bag[lang] || "").trim();
    if (primary) return primary;
    return String(bag[lang === "de" ? "en" : "de"] || "").trim();
}

function escapeCffHtml(str) {
    if (typeof escapeLfHtml === "function") return escapeLfHtml(str);
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function cffFlag(on) {
    return on ? "✔" : "✘";
}

function cffCategoryLabel(cat) {
    const key = CFF_CATEGORY_LABEL_KEYS[parseInt(cat, 10)];
    return key ? cffT(key, String(cat)) : "";
}

function cffFeatDisplayName(feat, state) {
    if (!feat) return "";
    const lang = typeof currentLang !== "undefined" ? currentLang : "de";
    const other = lang === "de" ? "en" : "de";
    const label = feat.translationLabel;
    const fromState = state?.translations?.[lang]?.[label]
        || state?.translations?.[other]?.[label];
    if (fromState) return fromState;
    if (feat.editor?.names?.[lang] || feat.editor?.names?.[other]) {
        return feat.editor.names[lang] || feat.editor.names[other];
    }
    if (typeof translations !== "undefined" && translations[lang]?.[label]) {
        return translations[lang][label];
    }
    return label || "";
}

function cffFeatHasTools(feat) {
    if (!feat) return false;
    if (feat.Get_toolID && feat.Get_toolID !== 0) return true;
    const g = feat.customGrants || {};
    return (Array.isArray(g.toolsGet) && g.toolsGet.length)
        || (g.toolsChoose && Array.isArray(g.toolsChoose.pool) && g.toolsChoose.pool.length);
}

function cffFeatHasMagic(feat) {
    if (!feat) return false;
    if (feat.takeChoice === 4) return true;
    const label = feat.translationLabel;
    const mag = (customFeatEditorState?.magicFeats || []).concat(
        Array.isArray(registeredCustomFeatPack?.magicFeats) ? registeredCustomFeatPack.magicFeats : []
    );
    return mag.some(m => m && m.translationLabel === label);
}

function cffFeatHasSkill(feat) {
    if (!feat) return false;
    if (feat.Get_skillCategoryNumber && feat.Get_skillCategoryNumber !== 0) return true;
    const g = feat.customGrants || {};
    return (Array.isArray(g.skillsGet) && g.skillsGet.length)
        || (g.skillsChoose && Array.isArray(g.skillsChoose.pool) && g.skillsChoose.pool.length)
        || (g.expertiseChoose && Array.isArray(g.expertiseChoose.pool) && g.expertiseChoose.pool.length);
}

function cffFeatHasAttr(feat) {
    return !!(feat && Array.isArray(feat.Get_attrImprovement) && feat.Get_attrImprovement.length);
}

function cffFeatHasWeapons(feat) {
    return !!(feat && feat.Get_weaponCategoryNumber && feat.Get_weaponCategoryNumber !== 0);
}

function cffFeatHasArmor(feat) {
    return !!(feat && feat.Get_armorCategoryNumber && feat.Get_armorCategoryNumber !== 0);
}

function cffGetSkillList() {
    return (typeof skillList !== "undefined" && Array.isArray(skillList)) ? skillList : [];
}

function cffGetToolList() {
    return (typeof toolList !== "undefined" && Array.isArray(toolList)) ? toolList : [];
}

function cffGetSpellList() {
    if (typeof getEffectiveSpellList === "function") return getEffectiveSpellList() || [];
    return (typeof spellList !== "undefined" && Array.isArray(spellList)) ? spellList : [];
}

function cffSpellName(spell) {
    if (!spell) return "";
    const lang = typeof currentLang !== "undefined" ? currentLang : "de";
    const label = spell.translationLabel;
    let name = label || String(spell.ID);
    if (typeof translations !== "undefined" && translations[lang]?.[label]) {
        name = translations[lang][label];
    }
    const isCustom = (typeof isCustomContentSpell === "function") && isCustomContentSpell(spell);
    return (typeof withCustomContentSelectMarker === "function")
        ? withCustomContentSelectMarker(name, isCustom)
        : name;
}

//=======================================================================
// Tab 1 – Übersicht
//=======================================================================

function startCustomFeatCreateNew() {
    if (!customFeatEditorState) customFeatEditorState = createEmptyCustomFeatPackState();
    if ((customFeatEditorState.feats || []).length >= CFF_CONFIG.maxFeatsPerPack) {
        alert(cffT("cffMaxFeatsAlertLabel", "Maximal 30 Talente pro Bibliothek."));
        return;
    }
    customFeatEditingId = null;
    customFeatDraft = createEmptyCustomFeatDraft();
    customFeatActiveTab = 2;
    switchCustomFeatTab(2);
}

function startCustomFeatEdit(featId) {
    if (typeof isLevelUpLockedFeat === "function" && isLevelUpLockedFeat(featId)) return;
    if (!customFeatEditorState) return;
    const feat = (customFeatEditorState.feats || []).find(f => Number(f.ID) === Number(featId));
    if (!feat) return;
    customFeatEditingId = feat.ID;
    customFeatDraft = draftFromCompiledFeat(feat);
    switchCustomFeatTab(2);
}

function removeCustomFeatFromPack(featId) {
    if (typeof isLevelUpLockedFeat === "function" && isLevelUpLockedFeat(featId)) return;
    if (!customFeatEditorState) return;
    const feat = (customFeatEditorState.feats || []).find(f => Number(f.ID) === Number(featId));
    const name = cffFeatDisplayName(feat, customFeatEditorState);
    const tmpl = cffT("cffDeleteFeatConfirmLabel",
        "Soll der Eintrag von \"{name}\" wirklich gelöscht werden? Die Daten können nicht wiederhergestellt werden. Trotzdem fortfahren?");
    const msg = String(tmpl).split("{name}").join(name || "");
    if (!confirm(msg)) return;
    const label = feat?.translationLabel;
    customFeatEditorState.feats = (customFeatEditorState.feats || []).filter(f => Number(f.ID) !== Number(featId));
    if (label) {
        customFeatEditorState.magicFeats = (customFeatEditorState.magicFeats || [])
            .filter(m => m.translationLabel !== label);
        ["de", "en"].forEach(lang => {
            const bag = customFeatEditorState.translations[lang];
            if (!bag) return;
            delete bag[label];
            if (feat?.featDLabel) delete bag[feat.featDLabel];
            if (feat?.featD_sheet) delete bag[feat.featD_sheet];
        });
    }
    if (customFeatEditingId != null && Number(customFeatEditingId) === Number(featId)) {
        customFeatEditingId = null;
        customFeatDraft = null;
    }
    renderCustomFeatTab1();
}

function resetCffOverviewFilters() {
    cffOverviewFilters = { category: "", search: "" };
}

function cffReadOverviewFiltersFromDom() {
    const catEl = document.getElementById("cffOverviewFilterCategory");
    const searchEl = document.getElementById("cffOverviewFilterSearch");
    cffOverviewFilters = {
        category: catEl ? String(catEl.value || "") : (cffOverviewFilters.category || ""),
        search: searchEl ? String(searchEl.value || "") : (cffOverviewFilters.search || "")
    };
}

function onCffOverviewFilterChange() {
    cffReadOverviewFiltersFromDom();
    renderCustomFeatTab1TableBody();
}

function cffGetFeatSearchNames(feat) {
    const names = [];
    const display = cffFeatDisplayName(feat, customFeatEditorState);
    if (display) names.push(String(display));
    const key = feat?.translationLabel;
    if (key && customFeatEditorState?.translations) {
        ["de", "en"].forEach(lang => {
            const n = customFeatEditorState.translations[lang]?.[key];
            if (n) names.push(String(n));
        });
    }
    return names;
}

function cffFeatPassesOverviewFilters(feat) {
    const f = cffOverviewFilters || {};
    if (f.category) {
        const cat = parseInt(f.category, 10);
        if (Number(feat.featCategoryNumber) !== cat) return false;
    }
    const q = String(f.search || "").trim().toLowerCase();
    if (q) {
        const hit = cffGetFeatSearchNames(feat).some(n => n.toLowerCase().includes(q));
        if (!hit) return false;
    }
    return true;
}

function getCffOverviewFilteredFeats() {
    return (customFeatEditorState?.feats || []).filter(cffFeatPassesOverviewFilters);
}

function cffOverviewFilterIconHtml() {
    if (typeof getLfFilterIconHtml === "function") return getLfFilterIconHtml();
    return `<span class="cc-lf-filter-icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M3 5h18l-7 8v5l-4 2v-7L3 5z"/></svg></span>`;
}

function buildCffOverviewFilterHtml() {
    const count = (customFeatEditorState?.feats || []).length;
    const max = CFF_CONFIG.maxFeatsPerPack;
    const atMax = count >= max;
    const addTitle = cffT("cffAddFeatTitleLabel", "Talent hinzufügen");
    const f = cffOverviewFilters || {};
    const allOpt = `<option value="">${escapeCffHtml(cffT("allLabel", "Alle"))}</option>`;
    const catOpts = (CFF_CONFIG.allowedCategories || [1, 2, 3, 4]).map(n =>
        `<option value="${n}" ${String(f.category) === String(n) ? "selected" : ""}>${escapeCffHtml(cffCategoryLabel(n))}</option>`
    ).join("");
    const searchPh = cffT("cfNamePlaceholderLabel", "Bezeichnung…");
    const searchAria = cffT("cffOverviewSearchAriaLabel", "Talentbezeichnung suchen");
    const searchLabel = cffT("cspOverviewSearchLabel", "Suchen");
    return `
        <div class="csp-overview-filters">
            <div class="csp-overview-counter">
                <span class="csp-pack-counter">${escapeCffHtml(String(count))} / ${escapeCffHtml(String(max))}</span>
            </div>
            <label class="csp-overview-filter">
                <span class="csp-overview-filter-label">${escapeCffHtml(cffT("categoryLabel", "Kategorie"))}${cffOverviewFilterIconHtml()}</span>
                <select id="cffOverviewFilterCategory" class="dropdown" onchange="onCffOverviewFilterChange()">
                    ${allOpt}${catOpts}
                </select>
            </label>
            <label class="csp-overview-filter csp-overview-filter--search">
                <span class="csp-overview-filter-label">${escapeCffHtml(searchLabel)}</span>
                <span class="csp-overview-search-wrap">
                    <span class="csp-overview-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                            <circle cx="10.5" cy="10.5" r="6.25" fill="none" stroke="currentColor" stroke-width="2"/>
                            <path d="M15.2 15.2 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </span>
                    <input type="text" id="cffOverviewFilterSearch" class="csp-overview-search-input"
                        value="${escapeCffHtml(f.search || "")}"
                        placeholder="${escapeCffHtml(searchPh)}"
                        aria-label="${escapeCffHtml(searchAria)}"
                        autocomplete="off"
                        oninput="onCffOverviewFilterChange()">
                </span>
            </label>
            <div class="csp-overview-add">
                <button type="button" class="add-custom-feat-btn csp-add-spell-btn" title="${escapeCffHtml(addTitle)}"
                    aria-label="${escapeCffHtml(addTitle)}" ${atMax ? "disabled" : ""}
                    onclick="startCustomFeatCreateNew()">+</button>
            </div>
        </div>
    `;
}

function renderCustomFeatTab1() {
    const host = document.getElementById("customFeatTab1Content");
    if (!host || !customFeatEditorState) return;
    host.innerHTML = `
        ${buildCffOverviewFilterHtml()}
        <div class="csp-overview-scroll">
            <table class="csp-overview-table">
                <thead>
                    <tr>
                        <th></th>
                        <th class="csp-col-num">${escapeCffHtml(cffT("cspOverviewNumLabel", "#"))}</th>
                        <th>${escapeCffHtml(cffT("cfNameLabel", "Name"))}</th>
                        <th>${escapeCffHtml(cffT("categoryLabel", "Kategorie"))}</th>
                        <th class="csp-col-flag">${escapeCffHtml(cffT("cffOverviewToolsColLabel", "Werkzeuge"))}</th>
                        <th class="csp-col-flag">${escapeCffHtml(cffT("cffOverviewMagicColLabel", "Magie"))}</th>
                        <th class="csp-col-flag">${escapeCffHtml(cffT("skillsLabel", "Fertigkeiten"))}</th>
                        <th class="csp-col-flag">${escapeCffHtml(cffT("cffOverviewAttributesColLabel", "Attribute"))}</th>
                        <th class="csp-col-flag">${escapeCffHtml(cffT("cffOverviewWeaponsColLabel", "Waffen"))}</th>
                        <th class="csp-col-flag">${escapeCffHtml(cffT("cffOverviewArmorColLabel", "Rüstungen"))}</th>
                    </tr>
                </thead>
                <tbody>
                    ${buildCffOverviewTableRowsHtml()}
                </tbody>
            </table>
        </div>
    `;
}

function renderCustomFeatTab1TableBody() {
    const tbody = document.querySelector("#customFeatTab1Content .csp-overview-table tbody");
    if (!tbody) return;
    tbody.innerHTML = buildCffOverviewTableRowsHtml();
}

function buildCffOverviewTableRowsHtml() {
    const total = (customFeatEditorState?.feats || []).length;
    const feats = getCffOverviewFilteredFeats();
    if (!total) {
        return `<tr><td colspan="10" class="csp-overview-empty">${escapeCffHtml(cffT("cffOverviewEmptyLabel", "Keine Talente gelistet"))}</td></tr>`;
    }
    if (!feats.length) {
        return `<tr><td colspan="10" class="csp-overview-empty">${escapeCffHtml(cffT("cspOverviewNoMatchesLabel", "Keine Treffer"))}</td></tr>`;
    }
    return feats.map((feat, index) => {
        const name = cffFeatDisplayName(feat, customFeatEditorState);
        const locked = (typeof isLevelUpLockedFeat === "function" && isLevelUpLockedFeat(feat.ID));
        const lockClass = locked ? " csp-action-btn--locked" : "";
        const lockDisabled = locked ? " disabled" : "";
        return `<tr>
            <td class="csp-col-actions">
                <div class="csp-action-btns">
                    <button type="button" class="csp-edit-btn${lockClass}" title="${escapeCffHtml(cffT("cspEditSpellTitleLabel", "Bearbeiten"))}"
                        aria-label="${escapeCffHtml(cffT("cspEditSpellTitleLabel", "Bearbeiten"))}"
                        onclick="startCustomFeatEdit(${feat.ID})"${lockDisabled}>✎</button>
                    <button type="button" class="csp-delete-btn${lockClass}" title="${escapeCffHtml(cffT("cspDeleteSpellTitleLabel", "Entfernen"))}"
                        aria-label="${escapeCffHtml(cffT("cspDeleteSpellTitleLabel", "Entfernen"))}"
                        onclick="removeCustomFeatFromPack(${feat.ID})"${lockDisabled}>X</button>
                </div>
            </td>
            <td class="csp-col-num">${index + 1}</td>
            <td>${escapeCffHtml(name)}</td>
            <td>${escapeCffHtml(cffCategoryLabel(feat.featCategoryNumber))}</td>
            <td class="csp-col-flag">${cffFeatHasTools(feat) ? "✔" : "✘"}</td>
            <td class="csp-col-flag">${cffFeatHasMagic(feat) ? "✔" : "✘"}</td>
            <td class="csp-col-flag">${cffFeatHasSkill(feat) ? "✔" : "✘"}</td>
            <td class="csp-col-flag">${cffFeatHasAttr(feat) ? "✔" : "✘"}</td>
            <td class="csp-col-flag">${cffFeatHasWeapons(feat) ? "✔" : "✘"}</td>
            <td class="csp-col-flag">${cffFeatHasArmor(feat) ? "✔" : "✘"}</td>
        </tr>`;
    }).join("");
}

//=======================================================================
// Tab 2 – Details
//=======================================================================

function draftFromCompiledFeat(feat) {
    const draft = createEmptyCustomFeatDraft();
    if (!feat) return draft;
    draft.ID = feat.ID;
    draft.translationLabel = feat.translationLabel || null;
    const ed = feat.editor || {};
    const langBag = customFeatEditorState?.translations || {};
    ["de", "en"].forEach(lang => {
        draft.names[lang] = ed.names?.[lang]
            || langBag[lang]?.[feat.translationLabel]
            || "";
        draft.descriptions[lang] = ed.descriptions?.[lang]
            || langBag[lang]?.[feat.featDLabel]
            || "";
    });
    draft.availableLanguages = Array.isArray(ed.availableLanguages) && ed.availableLanguages.length
        ? ed.availableLanguages.slice()
        : (Array.isArray(customFeatEditorState?.availableLanguages)
            ? customFeatEditorState.availableLanguages.slice()
            : [typeof currentLang !== "undefined" ? currentLang : "de"]);
    draft.featCategoryNumber = parseInt(feat.featCategoryNumber, 10) || 0;
    draft.prerequisiteLevel = parseInt(feat.prerequisite_Level, 10) || 1;
    draft.prereqAttributes = Array.isArray(feat.prerequisite_Attribute)
        ? feat.prerequisite_Attribute.slice()
        : [];
    draft.prereqAttributeValue = parseInt(feat.prerequisite_AttributeValue, 10) || 13;
    const noThr = feat.editor?.prereqNoThreshold;
    draft.prereqNoThreshold = (noThr === 0 || noThr === 1)
        ? noThr
        : ((Array.isArray(feat.prerequisite_Attribute) && feat.prerequisite_Attribute.length) ? 0 : 1);
    if (draft.featCategoryNumber === 1) {
        draft.prerequisiteLevel = 1;
        draft.prereqAttributes = [];
        draft.prereqAttributeValue = 13;
        draft.prereqNoThreshold = 1;
        draft.prereqFeatureMode = "none";
    } else if (draft.featCategoryNumber === 4) {
        draft.prerequisiteLevel = 19;
    }
    const pf = feat.prerequisite_Feature;
    if (draft.featCategoryNumber !== 1) {
        if (Array.isArray(pf) && pf.includes("spellcastingLabel")) draft.prereqFeatureMode = "spellOrPact";
        else if (pf === "fightingStyleLabel") draft.prereqFeatureMode = "fightingStyle";
        else draft.prereqFeatureMode = "none";
    }
    if (draft.featCategoryNumber === 3) draft.prereqFeatureMode = "fightingStyle";
    draft.multipleSelection = feat.multipleSelection === 1 ? 1 : 0;
    draft.attrImprovement = Array.isArray(feat.Get_attrImprovement)
        ? feat.Get_attrImprovement.slice()
        : [];
    if (Array.isArray(ed.featureRows) && ed.featureRows.length) {
        draft.featureRows = cffNormalizeFeatureRows(ed.featureRows);
    }
    return draft;
}

function cffRenderLangAvailabilityRow() {
    if (!customFeatDraft) return "";
    if (typeof renderLangAvailabilityRowHtml === "function") {
        return renderLangAvailabilityRowHtml(customFeatDraft, {
            inputName: "cffLangAvail",
            onChange: "onCffLangAvailabilityChange()"
        });
    }
    return "";
}

function cffRenderLangBlocks() {
    if (!customFeatDraft) return "";
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    const available = Array.isArray(customFeatDraft.availableLanguages)
        ? customFeatDraft.availableLanguages.slice()
        : [active];
    if (!available.includes(active)) available.unshift(active);
    const nameMax = CFF_CONFIG.nameMax;
    const descMax = CFF_CONFIG.descMax;
    const descLocked = cffIsFeatDescriptionLocked();
    const descDisabled = descLocked ? "disabled" : "";
    return available.map(lang => {
        const title = (typeof getCustomClassLangTitle === "function")
            ? getCustomClassLangTitle(lang)
            : lang.toUpperCase();
        const collapsed = lang !== active ? "collapsed" : "";
        const arrowCollapsed = lang !== active ? " is-collapsed" : "";
        const req = lang === active ? '<span class="custom-class-required">*</span>' : "";
        const nameVal = escapeCffHtml(customFeatDraft.names[lang] || "");
        const descVal = descLocked ? "" : escapeCffHtml(customFeatDraft.descriptions[lang] || "");
        const descHint = (descLocked && lang === active)
            ? `<p class="custom-class-hint">${escapeCffHtml(cffT("cffDescBlockedByExclusiveFeatureHintLabel", "Bei Expertise oder Waffenmeisterschaft wird die Bogenbeschreibung automatisch gesetzt."))}</p>`
            : "";
        return `
        <div class="custom-class-lang-block" data-lang="${lang}">
            <div class="custom-class-lang-header" onclick="cffToggleLangBlock('${lang}')">
                <span>${title}</span>
                <span id="cffLangToggle_${lang}" class="cc-collapse-arrow${arrowCollapsed}" aria-hidden="true">&#x25BC;</span>
            </div>
            <div id="cffLangBody_${lang}" class="custom-class-lang-body ${collapsed}">
                <label for="cffName_${lang}">${escapeCffHtml(cffT("cfNameLabel", "Name"))} ${req}</label>
                <input type="text" id="cffName_${lang}" class="custom-class-name-input app-small-input"
                    maxlength="${nameMax}" value="${nameVal}"
                    oninput="updateCustomClassCharCounter('cffName_${lang}', 'cffNameCount_${lang}', ${nameMax})">
                <div class="char-counter"><span id="cffNameCount_${lang}">0</span> / ${nameMax}</div>
                <label for="cffDesc_${lang}" style="margin-top:8px;display:block;" class="${descLocked ? "cc-check-disabled" : ""}">${escapeCffHtml(cffT("cfDescLabel", "Beschreibung"))}</label>
                ${descHint}
                <textarea id="cffDesc_${lang}" maxlength="${descMax}" ${descDisabled}
                    oninput="updateCustomClassCharCounter('cffDesc_${lang}', 'cffDescCount_${lang}', ${descMax})">${descVal}</textarea>
                <div class="char-counter"><span id="cffDescCount_${lang}">0</span> / ${descMax}</div>
            </div>
        </div>`;
    }).join("");
}

function cffToggleLangBlock(lang) {
    const body = document.getElementById(`cffLangBody_${lang}`);
    const indicator = document.getElementById(`cffLangToggle_${lang}`);
    if (!body) return;
    body.classList.toggle("collapsed");
    const collapsed = body.classList.contains("collapsed");
    if (indicator) indicator.classList.toggle("is-collapsed", collapsed);
}

//=======================================================================
// Merkmals-Exklusivität (Expertise / Waffenmeisterschaft / Zauberwissen / Frei / RW)
//=======================================================================

function cffRowHasExpertise(row) {
    return !!(row && row.kind === "options" && row.category === "expertise");
}

function cffRowHasWeaponMastery(row) {
    return !!(row && row.kind === "options" && row.category === "weaponMasteries");
}

function cffRowHasSpellcraft(row) {
    return !!(row && row.kind === "spellcraft");
}

function cffRowHasFree(row) {
    return !!(row && row.kind === "options" && row.category === "free");
}

function cffRowHasSavingThrows(row) {
    return !!(row && row.category === "savingThrows");
}

function cffResetFeatureRowContent(row) {
    if (!row) return;
    row.kind = "";
    row.category = "";
    row.pool = [];
    row.spellLevels = [];
    row.amount = 1;
    row.optionsConfig = {};
}

function cffClearFeatDescriptions() {
    if (!customFeatDraft) return;
    customFeatDraft.descriptions = { de: "", en: "" };
}

/** Ob die Nutzer-Beschreibung wegen Expertise/Meisterschaft gesperrt ist. */
function cffIsFeatDescriptionLocked() {
    const rows = customFeatDraft?.featureRows || [];
    return rows.some(r => cffRowHasExpertise(r) || cffRowHasWeaponMastery(r));
}

/**
 * Sperren für eine andere Zeile (index), abgeleitet aus den übrigen Zeilen.
 * TAG-Merkmale (Expertise / Meisterschaft / Zauberwissen / Frei) schließen sich gegenseitig aus
 * und sperren Rettungswürfe; Frei ↔ Rettungswürfe zusätzlich wechselseitig.
 * @returns {{
 *   blockSpellcraftKind: boolean,
 *   blockExpertise: boolean,
 *   blockMastery: boolean,
 *   blockFree: boolean,
 *   blockSavingThrows: boolean
 * }}
 */
function cffGetFeatureLocksForRow(index) {
    const rows = customFeatDraft?.featureRows || [];
    const locks = {
        blockSpellcraftKind: false,
        blockExpertise: false,
        blockMastery: false,
        blockFree: false,
        blockSavingThrows: false
    };
    rows.forEach((row, i) => {
        if (i === index || !row) return;
        if (cffRowHasExpertise(row)) {
            locks.blockSpellcraftKind = true;
            locks.blockMastery = true;
            locks.blockFree = true;
            locks.blockSavingThrows = true;
        }
        if (cffRowHasWeaponMastery(row)) {
            locks.blockSpellcraftKind = true;
            locks.blockExpertise = true;
            locks.blockFree = true;
            locks.blockSavingThrows = true;
        }
        if (cffRowHasSpellcraft(row)) {
            locks.blockExpertise = true;
            locks.blockMastery = true;
            locks.blockFree = true;
            locks.blockSavingThrows = true;
        }
        if (cffRowHasFree(row)) {
            locks.blockSpellcraftKind = true;
            locks.blockExpertise = true;
            locks.blockMastery = true;
            locks.blockSavingThrows = true;
        }
        if (cffRowHasSavingThrows(row)) {
            locks.blockFree = true;
        }
    });
    return locks;
}

function cffIsFeatureKindBlocked(kind, index) {
    if (!kind) return false;
    const locks = cffGetFeatureLocksForRow(index);
    return kind === "spellcraft" && locks.blockSpellcraftKind;
}

function cffIsFeatureCategoryBlocked(category, index) {
    if (!category) return false;
    const locks = cffGetFeatureLocksForRow(index);
    if (category === "savingThrows") return locks.blockSavingThrows;
    if (category === "expertise") return locks.blockExpertise;
    if (category === "weaponMasteries") return locks.blockMastery;
    if (category === "free") return locks.blockFree;
    return false;
}

/** Konfliktierende andere Zeilen leeren, wenn sourceIndex gerade gesetzt wurde. */
function cffClearConflictingOtherFeatureRows(sourceIndex) {
    const rows = customFeatDraft?.featureRows || [];
    const src = rows[sourceIndex];
    if (!src) return;
    rows.forEach((row, i) => {
        if (i === sourceIndex || !row) return;
        let clear = false;
        if (cffRowHasExpertise(src)) {
            clear = cffRowHasSpellcraft(row) || cffRowHasWeaponMastery(row)
                || cffRowHasFree(row) || cffRowHasSavingThrows(row);
        } else if (cffRowHasWeaponMastery(src)) {
            clear = cffRowHasSpellcraft(row) || cffRowHasExpertise(row)
                || cffRowHasFree(row) || cffRowHasSavingThrows(row);
        } else if (cffRowHasSpellcraft(src)) {
            clear = cffRowHasWeaponMastery(row) || cffRowHasExpertise(row)
                || cffRowHasFree(row) || cffRowHasSavingThrows(row);
        } else if (cffRowHasFree(src)) {
            clear = cffRowHasSpellcraft(row) || cffRowHasExpertise(row)
                || cffRowHasWeaponMastery(row) || cffRowHasSavingThrows(row);
        } else if (cffRowHasSavingThrows(src)) {
            clear = cffRowHasFree(row);
        }
        if (clear) cffResetFeatureRowContent(row);
    });
}

/** Beim Rendern/Laden: widersprüchliche Zeilen bereinigen. */
function cffEnforceAllFeatureExclusivity() {
    const rows = customFeatDraft?.featureRows || [];
    if (!rows.length) return;
    const expIdx = rows.findIndex(cffRowHasExpertise);
    const masIdx = rows.findIndex(cffRowHasWeaponMastery);
    if (expIdx >= 0 && masIdx >= 0) {
        if (expIdx <= masIdx) cffResetFeatureRowContent(rows[masIdx]);
        else cffResetFeatureRowContent(rows[expIdx]);
    }
    const exp2 = rows.findIndex(cffRowHasExpertise);
    const mas2 = rows.findIndex(cffRowHasWeaponMastery);
    const sp2 = rows.findIndex(cffRowHasSpellcraft);
    const free2 = rows.findIndex(cffRowHasFree);
    const save2 = rows.findIndex(cffRowHasSavingThrows);
    if (exp2 >= 0) cffClearConflictingOtherFeatureRows(exp2);
    else if (mas2 >= 0) cffClearConflictingOtherFeatureRows(mas2);
    else if (sp2 >= 0) cffClearConflictingOtherFeatureRows(sp2);
    else if (free2 >= 0) cffClearConflictingOtherFeatureRows(free2);
    else if (save2 >= 0) cffClearConflictingOtherFeatureRows(save2);
    if (cffIsFeatDescriptionLocked()) cffClearFeatDescriptions();
}

function onCffLangAvailabilityChange() {
    if (!customFeatDraft) return;
    closeCffLfFloat({ rerender: false });
    syncCffDraftFromDom();
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    const selected = Array.from(document.querySelectorAll('input[name="cffLangAvail"]:checked'))
        .map(el => el.value);
    if (!selected.includes(active)) selected.unshift(active);
    customFeatDraft.availableLanguages = selected;
    renderCustomFeatTab2();
}

function onCffCategoryChange() {
    if (!customFeatDraft) return;
    closeCffLfFloat({ rerender: false });
    syncCffDraftFromDom();
    const cat = parseInt(customFeatDraft.featCategoryNumber, 10) || 0;
    customFeatDraft.prerequisiteLevel = cffDefaultPrereqLevel(cat);
    if (cat === 1) {
        customFeatDraft.attrImprovement = [];
        customFeatDraft.prereqAttributes = [];
        customFeatDraft.prereqAttributeValue = 13;
        customFeatDraft.prereqNoThreshold = 1;
        customFeatDraft.prerequisiteLevel = 1;
        // Herkunftstalente: Merkmalsvoraussetzung fest „Keine“
        customFeatDraft.prereqFeatureMode = "none";
    } else if (cat === 3) {
        // Kampfstile: Merkmalsvoraussetzung fest „Kampfstil“
        customFeatDraft.prereqFeatureMode = "fightingStyle";
    } else if (cat === 4) {
        customFeatDraft.prerequisiteLevel = 19;
    }
    renderCustomFeatTab2();
}

function onCffPrereqNoThresholdChange() {
    if (!customFeatDraft) return;
    syncCffDraftFromDom();
    renderCustomFeatTab2();
}

function onCffMultipleSelectionChange() {
    if (!customFeatDraft) return;
    closeCffLfFloat({ rerender: false });
    syncCffDraftFromDom();
    if (customFeatDraft.multipleSelection === 1) {
        (customFeatDraft.featureRows || []).forEach(row => {
            if (row && row.kind === "simple") cffResetFeatureRowContent(row);
        });
    }
    renderCustomFeatTab2();
}

function onCffFeatureRowChange(index) {
    if (!customFeatDraft) return;
    closeCffLfFloat({ rerender: false });
    const prev = customFeatDraft.featureRows[index] || {};
    const prevKind = prev.kind;
    const prevCat = prev.category;
    syncCffDraftFromDom();
    const row = customFeatDraft.featureRows[index];
    if (!row) return;
    if (row.kind !== prevKind) {
        row.category = "";
        row.pool = [];
        row.spellLevels = [];
        row.amount = 1;
        row.optionsConfig = {};
    } else if (row.category !== prevCat) {
        row.pool = [];
        row.spellLevels = [];
        row.amount = 1;
        row.optionsConfig = {};
        if (row.kind === "options" && row.category === "expertise") {
            row.optionsConfig = { infoLabel: "skillProfTitle" };
        } else if (row.kind === "options" && row.category === "weaponMasteries") {
            row.optionsConfig = { infoLabels: ["ccLfWeaponMasteryOptionsShortLabel"] };
        } else if (row.kind === "options" && row.category === "free") {
            row.optionsConfig = {
                choices: [
                    { names: { de: "", en: "" }, descriptions: { de: "", en: "" } },
                    { names: { de: "", en: "" }, descriptions: { de: "", en: "" } }
                ],
                featureFamilyId: ""
            };
        }
    }
    if (!row.kind) {
        row.category = "";
        row.pool = [];
        row.spellLevels = [];
    }
    // Mehrfachauswahl: Merkmaltyp Einfach nicht erlaubt
    if (customFeatDraft.multipleSelection === 1 && row.kind === "simple") {
        cffResetFeatureRowContent(row);
    }
    // Ungültige Wahl (gesperrt) zurücksetzen
    if (cffIsFeatureKindBlocked(row.kind, index)) {
        cffResetFeatureRowContent(row);
    } else if (cffIsFeatureCategoryBlocked(row.category, index)) {
        row.category = "";
        row.pool = [];
        row.spellLevels = [];
        row.amount = 1;
        row.optionsConfig = {};
    }
    cffClearConflictingOtherFeatureRows(index);
    if (cffRowHasExpertise(row) || cffRowHasWeaponMastery(row) || cffIsFeatDescriptionLocked()) {
        cffClearFeatDescriptions();
    }
    renderCustomFeatTab2();
}

function syncCffDraftFromDom() {
    if (!customFeatDraft) return;
    ["de", "en"].forEach(lang => {
        const nameEl = document.getElementById(`cffName_${lang}`);
        const descEl = document.getElementById(`cffDesc_${lang}`);
        if (nameEl) customFeatDraft.names[lang] = nameEl.value;
        if (descEl && !descEl.disabled) customFeatDraft.descriptions[lang] = descEl.value;
    });
    if (cffIsFeatDescriptionLocked()) {
        cffClearFeatDescriptions();
    }
    const catEl = document.getElementById("cffCategory");
    if (catEl) customFeatDraft.featCategoryNumber = parseInt(catEl.value, 10) || 0;
    const catNum = parseInt(customFeatDraft.featCategoryNumber, 10) || 0;
    const isOrigin = catNum === 1;
    const isEpic = catNum === 4;
    const noThrEl = document.getElementById("cffPrereqNoThreshold");
    if (noThrEl) customFeatDraft.prereqNoThreshold = noThrEl.checked ? 1 : 0;
    const lvlEl = document.getElementById("cffPrereqLevel");
    if (isOrigin) {
        customFeatDraft.prerequisiteLevel = 1;
        customFeatDraft.prereqAttributes = [];
        customFeatDraft.prereqAttributeValue = 13;
        customFeatDraft.prereqNoThreshold = 1;
    } else if (isEpic) {
        customFeatDraft.prerequisiteLevel = 19;
    } else if (lvlEl) {
        let n = parseInt(lvlEl.value, 10);
        if (!Number.isFinite(n)) n = 1;
        customFeatDraft.prerequisiteLevel = Math.min(20, Math.max(1, n));
    }
    if (!isOrigin) {
        if (customFeatDraft.prereqNoThreshold === 1) {
            customFeatDraft.prereqAttributes = [];
            customFeatDraft.prereqAttributeValue = 13;
        } else {
            customFeatDraft.prereqAttributes = Array.from(document.querySelectorAll('input[name="cffPrereqAttr"]:checked'))
                .map(el => el.value);
            const valEl = document.getElementById("cffPrereqAttrValue");
            if (valEl) {
                let n = parseInt(valEl.value, 10);
                if (!Number.isFinite(n)) n = 13;
                customFeatDraft.prereqAttributeValue = Math.min(20, Math.max(1, n));
            }
        }
    }
    const featMode = document.querySelector('input[name="cffPrereqFeature"]:checked');
    customFeatDraft.prereqFeatureMode = featMode ? featMode.value : "none";
    if (isOrigin) {
        customFeatDraft.prereqFeatureMode = "none";
    } else if (catNum === 3) {
        customFeatDraft.prereqFeatureMode = "fightingStyle";
    }
    const multiEl = document.getElementById("cffMultipleSelection");
    customFeatDraft.multipleSelection = multiEl && multiEl.checked ? 1 : 0;
    customFeatDraft.attrImprovement = Array.from(document.querySelectorAll('input[name="cffAttrBonus"]:checked'))
        .map(el => el.value);
    if (isOrigin) {
        customFeatDraft.attrImprovement = [];
    }
    (customFeatDraft.featureRows || []).forEach((row, i) => {
        const kindEl = document.getElementById(`cffRowKind_${i}`);
        const catEl2 = document.getElementById(`cffRowCat_${i}`);
        if (kindEl) row.kind = kindEl.value || "";
        if (catEl2) row.category = cffNormalizeFeatureCategory(catEl2.value || "");
        if (!row.kind) row.category = "";
    });
}

function captureCffTab2ScrollState() {
    const wrap = document.querySelector("#customFeatTab2Content .cc-lf-table-wrap");
    const modal = document.querySelector("#customFeatOverlay .custom-class-modal");
    const overlay = document.getElementById("customFeatOverlay");
    return {
        tableTop: wrap ? wrap.scrollTop : 0,
        tableLeft: wrap ? wrap.scrollLeft : 0,
        modalTop: modal ? modal.scrollTop : 0,
        overlayTop: overlay ? overlay.scrollTop : 0
    };
}

function restoreCffTab2ScrollState(state) {
    if (!state) return;
    const apply = () => {
        const wrap = document.querySelector("#customFeatTab2Content .cc-lf-table-wrap");
        const modal = document.querySelector("#customFeatOverlay .custom-class-modal");
        const overlay = document.getElementById("customFeatOverlay");
        if (wrap) {
            wrap.scrollTop = state.tableTop;
            wrap.scrollLeft = state.tableLeft;
        }
        if (modal) modal.scrollTop = state.modalTop;
        if (overlay) overlay.scrollTop = state.overlayTop;
    };
    apply();
    requestAnimationFrame(apply);
}

function renderCustomFeatTab2() {
    const host = document.getElementById("customFeatTab2Content");
    if (!host || !customFeatEditorState) return;
    if (!customFeatDraft) customFeatDraft = createEmptyCustomFeatDraft();
    cffEnforceAllFeatureExclusivity();
    const scrollState = captureCffTab2ScrollState();

    const req = `<span class="custom-class-required">*</span>`;
    const cat = parseInt(customFeatDraft.featCategoryNumber, 10) || 0;
    const originLocked = cat === 1;
    const epicLocked = cat === 4;
    const levelLocked = originLocked || epicLocked;
    const levelValue = originLocked ? 1 : (epicLocked ? 19 : (customFeatDraft.prerequisiteLevel || 1));
    const noThreshold = originLocked || customFeatDraft.prereqNoThreshold === 1;
    const attrInputsDisabled = originLocked || noThreshold;
    const please = escapeCffHtml(cffT("pleaseSelectLabel", "Bitte wählen"));

    const catOpts = [`<option value="0">${please}</option>`]
        .concat((CFF_CONFIG.allowedCategories || [1, 2, 3, 4]).map(n =>
            `<option value="${n}" ${cat === n ? "selected" : ""}>${escapeCffHtml(cffCategoryLabel(n))}</option>`
        )).join("");

    const noThrChecked = noThreshold ? "checked" : "";
    const noThrDisabled = originLocked ? "disabled" : "";
    const attrChecks = CFF_ABILITY_LABELS.map(label => {
        const abbrKey = CFF_ABILITY_ABBR[label];
        const abbr = cffT(abbrKey, label);
        const checked = (!attrInputsDisabled && (customFeatDraft.prereqAttributes || []).includes(label)) ? "checked" : "";
        const disabled = attrInputsDisabled ? "disabled" : "";
        return `<label class="${attrInputsDisabled ? "cc-check-disabled" : ""}"><input type="checkbox" name="cffPrereqAttr" value="${label}" ${checked} ${disabled}> ${escapeCffHtml(abbr)}</label>`;
    }).join("");

    const bonusChecks = CFF_ABILITY_LABELS.map(label => {
        const abbrKey = CFF_ABILITY_ABBR[label];
        const abbr = cffT(abbrKey, label);
        const checked = (customFeatDraft.attrImprovement || []).includes(label) ? "checked" : "";
        const disabled = originLocked ? "disabled" : "";
        return `<label class="${originLocked ? "cc-check-disabled" : ""}"><input type="checkbox" name="cffAttrBonus" value="${label}" ${checked} ${disabled}> ${escapeCffHtml(abbr)}</label>`;
    }).join("");

    const prereqMode = (cat === 3)
        ? "fightingStyle"
        : (originLocked ? "none" : (customFeatDraft.prereqFeatureMode || "none"));
    const featurePrereqLocked = originLocked || cat === 3;
    const spellPactLabel = cffT("spellcastingLabel", "Zauberwirken");
    const prereqNoneDisabled = featurePrereqLocked ? "disabled" : "";
    const prereqSpellDisabled = featurePrereqLocked ? "disabled" : "";
    const prereqFsDisabled = featurePrereqLocked ? "disabled" : "";
    const colHeaders = [
        cffT("ccLfColTypeLabel", "Merkmaltyp"),
        cffT("categoryLabel", "Kategorie"),
        cffT("optionsLabel", "Optionen"),
        cffT("amountLabel", "Anzahl")
    ];

    host.innerHTML = `
        ${cffRenderLangAvailabilityRow()}
        <div class="custom-class-field">
            <div class="custom-class-section-title">${escapeCffHtml(cffT("cfNameLabel", "Name"))} / ${escapeCffHtml(cffT("cfDescLabel", "Beschreibung"))} ${req}</div>
            ${cffRenderLangBlocks()}
        </div>

        <div class="custom-class-field">
            <label for="cffCategory" class="custom-class-section-title">${escapeCffHtml(cffT("categoryLabel", "Kategorie"))} ${req}</label>
            <select id="cffCategory" class="dropdown cff-category-select" onchange="onCffCategoryChange()">
                ${catOpts}
            </select>
        </div>

        <div class="custom-class-field">
            <label class="custom-class-section-title cff-inline-check-label" for="cffMultipleSelection">
                <input type="checkbox" id="cffMultipleSelection" ${customFeatDraft.multipleSelection === 1 ? "checked" : ""}
                    onchange="onCffMultipleSelectionChange()">
                <span>${escapeCffHtml(cffT("cffMultipleSelectionLabel", "Mehrfachauswahl erlaubt"))}</span>
            </label>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title cff-section-title--prereq">${escapeCffHtml(cffT("cffPrerequisitesSectionLabel", "Voraussetzungen"))}</div>
            <div class="custom-class-lang-block">
            <div class="custom-class-field">
                <label for="cffPrereqLevel" class="custom-class-section-title">${escapeCffHtml(cffT("cffPrereqLevelLabel", "Stufe"))}</label>
                <input type="number" id="cffPrereqLevel" min="1" max="20"
                    value="${escapeCffHtml(String(levelValue))}"
                    ${levelLocked ? "disabled" : ""}>
            </div>
            <div class="custom-class-field">
                <div class="custom-class-section-title">${escapeCffHtml(cffT("cffPrereqAttrLabel", "Attribut"))}</div>
                ${originLocked ? `<p class="custom-class-hint">${escapeCffHtml(cffT("cffAttrBonusOriginDisabledHintLabel", "Bei Herkunftstalenten nicht verfügbar."))}</p>` : ""}
                <div class="cff-prereq-grid custom-class-check-grid">
                    <label class="${originLocked ? "cc-check-disabled" : ""}"><input type="checkbox" id="cffPrereqNoThreshold" ${noThrChecked} ${noThrDisabled} onchange="onCffPrereqNoThresholdChange()"> ${escapeCffHtml(cffT("cffPrereqNoThresholdLabel", "Kein Grenzwert"))}</label>
                    ${attrChecks}
                </div>
                <label for="cffPrereqAttrValue" class="${attrInputsDisabled ? "cc-check-disabled" : ""}">${escapeCffHtml(cffT("cffPrereqAttrValueLabel", "Grenzwert"))}</label>
                ${attrInputsDisabled
                    ? `<input type="text" id="cffPrereqAttrValue" class="cff-prereq-attr-value" value="-" disabled readonly>`
                    : `<input type="number" id="cffPrereqAttrValue" class="cff-prereq-attr-value" min="1" max="20"
                        value="${escapeCffHtml(String(customFeatDraft.prereqAttributeValue || 13))}">`}
            </div>
            <div class="custom-class-field">
                <div class="custom-class-section-title">${escapeCffHtml(cffT("cffPrereqFeatureLabel", "Merkmal"))}</div>
                <div class="cff-prereq-grid custom-class-check-grid">
                    <label class="${featurePrereqLocked ? "cc-check-disabled" : ""}"><input type="radio" name="cffPrereqFeature" value="none" ${prereqMode === "none" ? "checked" : ""} ${prereqNoneDisabled}>
                        ${escapeCffHtml(cffT("cffPrereqFeatureNoneLabel", "Keine"))}</label>
                    <label class="${featurePrereqLocked ? "cc-check-disabled" : ""}"><input type="radio" name="cffPrereqFeature" value="spellOrPact" ${prereqMode === "spellOrPact" ? "checked" : ""} ${prereqSpellDisabled}>
                        ${escapeCffHtml(spellPactLabel)}</label>
                    <label class="${featurePrereqLocked ? "cc-check-disabled" : ""}"><input type="radio" name="cffPrereqFeature" value="fightingStyle" ${prereqMode === "fightingStyle" ? "checked" : ""} ${prereqFsDisabled}>
                        ${escapeCffHtml(cffT("fightingStyleLabel", "Kampfstil"))}</label>
                </div>
            </div>
            </div>
        </div>

        <div class="custom-class-field cff-benefit-oversection">
            <div class="custom-class-section-title cff-section-title--benefit">${escapeCffHtml(cffT("cffBenefitSectionLabel", "Vorteile"))}</div>
            <div class="custom-class-lang-block">
            <div class="custom-class-field">
                <div class="custom-class-section-title">${escapeCffHtml(cffT("ccLfAbilityImprovementNameLabel", "Attributverbesserung"))} (+1)</div>
                ${originLocked
                    ? `<p class="custom-class-hint">${escapeCffHtml(cffT("cffAttrBonusOriginDisabledHintLabel", "Bei Herkunftstalenten nicht verfügbar."))}</p>`
                    : `<p class="custom-class-hint">${escapeCffHtml(cffT("cffAttrBonusMultiHintLabel", "Bei Wahl mehrerer Attribute kann der Nutzer eines der definierten Attribute für die Punktvergabe auswählen."))}</p>`}
                <div class="cff-attr-grid custom-class-check-grid">${bonusChecks}</div>
            </div>
            <div class="custom-class-field">
                <div class="custom-class-section-title">${escapeCffHtml(cffT("cffFeatureTableLabel", "Merkmale"))}</div>
                <div class="cc-lf-table-wrap">
                    <div class="cc-lf-table cff-lf-table">
                        <div class="cc-lf-header cff-lf-header" role="row">
                            ${colHeaders.map(h =>
                                `<div class="cc-lf-cell cc-lf-cell--head" role="columnheader">${escapeCffHtml(h)}</div>`
                            ).join("")}
                        </div>
                        ${buildCffFeatureRowsHtml()}
                    </div>
                </div>
            </div>
            </div>
        </div>

        <div class="csp-tab2-footer cff-tab2-footer">
            <button type="button" class="custom-class-action-btn" onclick="clearCustomFeatDraft()">${escapeCffHtml(cffT("clearBtnLabel", "Leeren"))}</button>
            <button type="button" class="custom-class-action-btn" onclick="saveCustomFeatDraft()">${escapeCffHtml(cffT("cspAddSpellBtnLabel", "Bestätigen"))}</button>
        </div>
    `;

    ["de", "en"].forEach(lang => {
        if (typeof updateCustomClassCharCounter === "function") {
            updateCustomClassCharCounter(`cffName_${lang}`, `cffNameCount_${lang}`, CFF_CONFIG.nameMax);
            updateCustomClassCharCounter(`cffDesc_${lang}`, `cffDescCount_${lang}`, CFF_CONFIG.descMax);
        }
    });
    restoreCffTab2ScrollState(scrollState);
}

function cffLfFeatureTypeLabel(kind) {
    if (!kind) return "—";
    if (typeof formatLfFeatureType === "function") {
        const lab = formatLfFeatureType(kind);
        if (lab && lab !== kind) return lab;
    }
    const keys = {
        simple: "ccLfTypeSimpleLabel",
        options: "optionsLabel",
        spellcraft: "ccLfTypeSpellcraftLabel"
    };
    return cffT(keys[kind] || kind, kind);
}

function cffLfCategoryLabel(category) {
    if (!category) return "—";
    if (typeof formatLfCategory === "function") {
        const lab = formatLfCategory(category);
        if (lab && lab !== category) return lab;
    }
    return cffT(category, category);
}

function cffLfGearIconHtml() {
    return (typeof getLfGearIconHtml === "function") ? getLfGearIconHtml() : "";
}

function cffLfFilterIconHtml() {
    return (typeof getLfFilterIconHtml === "function") ? getLfFilterIconHtml() : "";
}

function cffLfOptionsHeadingHtml(kind, labelKey) {
    if (kind === "options" && typeof buildLfOptionsFilterHeadingHtml === "function") {
        return buildLfOptionsFilterHeadingHtml(labelKey);
    }
    if (typeof buildLfOptionsGearHeadingHtml === "function") {
        return buildLfOptionsGearHeadingHtml(labelKey);
    }
    return `<label class="cc-lf-float-label">${escapeCffHtml(cffT(labelKey, labelKey))}</label>`;
}

function cffRowCategoryOptions(kind, selected, index) {
    const please = `<option value="">${escapeCffHtml(cffT("pleaseSelectLabel", "Bitte wählen"))}</option>`;
    const cats = kind ? (CFF_CATEGORIES_BY_TYPE[kind] || []) : [];
    const rowIndex = Number.isFinite(index) ? index : -1;
    return please + cats.map(v => {
        const blocked = rowIndex >= 0 && cffIsFeatureCategoryBlocked(v, rowIndex);
        const sel = selected === v && !blocked ? "selected" : "";
        const dis = blocked ? "disabled" : "";
        return `<option value="${v}" ${sel} ${dis}>${escapeCffHtml(cffLfCategoryLabel(v))}</option>`;
    }).join("");
}

function cffCanOpenOptionsMask(row) {
    if (!row || !row.kind || !row.category) return false;
    const slot = cffRowToLfSlot(row, 0);
    if (typeof getLfFixedOptionsDisplayKeys === "function" && getLfFixedOptionsDisplayKeys(slot)) {
        return false;
    }
    if (row.kind === "options" && (row.category === "expertise" || row.category === "weaponMasteries")) {
        return false;
    }
    return true;
}

function cffCanOpenAmountMask(row) {
    if (!row || row.kind !== "options" || !row.category) return false;
    return cffAmountMaxForRow(row) > 0;
}

function cffAmountMaxForRow(row) {
    if (!row || row.kind !== "options") return 0;
    const limits = (typeof CUSTOM_CLASS_LF_CONFIG !== "undefined"
        && CUSTOM_CLASS_LF_CONFIG.optionsDropdownLimits)
        ? CUSTOM_CLASS_LF_CONFIG.optionsDropdownLimits
        : { free: 6, skills: 4, savingThrows: 2, expertise: 4, tools: 3, weaponMasteries: 6 };
    if (row.category === "weaponMasteries" && !limits.weaponMasteries) return 6;
    if (row.category === "free" && !limits.free) return 6;
    return parseInt(limits[row.category], 10) || 0;
}

function cffSimplePickLimits(category) {
    const spec = (typeof getLfSimpleCategorySpec === "function")
        ? getLfSimpleCategorySpec(category)
        : null;
    return {
        min: spec?.pickMin || 1,
        max: spec?.pickMax || 0
    };
}

function cffIsOptionsConfigured(row) {
    if (!row || !row.kind || !row.category) return false;
    const slot = cffRowToLfSlot(row, 0);
    if (typeof isLfOptionsConfigured === "function" && slot) {
        if (row.kind === "simple" && row.category === "tools") {
            return Array.isArray(row.optionsConfig?.selectedLabels) && row.optionsConfig.selectedLabels.length > 0;
        }
        if (row.kind === "options" && row.category === "expertise") {
            const cfg = row.optionsConfig || {};
            if (cfg.skillFilter === "all" || cfg.infoLabel === "skillProfTitle") return true;
            return Array.isArray(cfg.selectedSkills) && cfg.selectedSkills.length > 0;
        }
        if (row.kind === "options" && row.category === "free") {
            const choices = Array.isArray(row.optionsConfig?.choices) ? row.optionsConfig.choices : [];
            const n = choices.filter(c => {
                const names = c?.names || c;
                return !!(names && (String(names.de || "").trim() || String(names.en || "").trim()));
            }).length;
            return n >= cffOptionsMinChoices();
        }
        if (row.kind === "options" && row.category === "weaponMasteries") return true;
        if (row.kind === "options" && row.category === "tools") {
            const cfg = row.optionsConfig || {};
            if (cfg.mode === "all") return true;
            return Array.isArray(cfg.allowedLabels) && cfg.allowedLabels.length > 0;
        }
        return isLfOptionsConfigured(slot);
    }
    return Object.keys(row.optionsConfig || {}).length > 0;
}

function cffOptionsChipCount(row) {
    if (!row) return 0;
    const slot = cffRowToLfSlot(row, 0);
    if (typeof countLfOptionsEntries === "function" && slot) {
        const n = countLfOptionsEntries(slot);
        if (n > 0) return n;
    }
    const cfg = row.optionsConfig || {};
    if (cfg.pickCount) return parseInt(cfg.pickCount, 10) || 0;
    if (Array.isArray(cfg.selectedSpells)) return cfg.selectedSpells.filter(Boolean).length;
    if (Array.isArray(cfg.selectedSkills)) return cfg.selectedSkills.length;
    if (Array.isArray(cfg.selectedLabels)) return cfg.selectedLabels.length;
    if (Array.isArray(cfg.allowedLabels)) return cfg.allowedLabels.length;
    if (cfg.skillFilter === "all" || cfg.mode === "all") return 1;
    return Array.isArray(row.pool) ? row.pool.length : 0;
}

function buildCffLfTypeSelectHtml(row, index) {
    const kind = row.kind || "";
    const multiBlocksSimple = customFeatDraft?.multipleSelection === 1;
    const kindOpts = [
        ["", cffT("pleaseSelectLabel", "Bitte wählen")],
        ["simple", cffLfFeatureTypeLabel("simple")],
        ["options", cffLfFeatureTypeLabel("options")],
        ["spellcraft", cffLfFeatureTypeLabel("spellcraft")]
    ].map(([v, lab]) => {
        const blocked = (v && cffIsFeatureKindBlocked(v, index))
            || (v === "simple" && multiBlocksSimple);
        const sel = kind === v && !blocked ? "selected" : "";
        const dis = blocked ? "disabled" : "";
        return `<option value="${v}" ${sel} ${dis}>${escapeCffHtml(lab)}</option>`;
    }).join("");
    return `<select id="cffRowKind_${index}" class="dropdown cc-lf-select"
        aria-label="${escapeCffHtml(cffT("ccLfColTypeLabel", "Merkmaltyp"))}"
        onchange="onCffFeatureRowChange(${index})"
        onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">${kindOpts}</select>`;
}

function buildCffLfCategorySelectHtml(row, index) {
    const kind = row.kind || "";
    if (!kind) return `<span class="cc-lf-cell--muted">—</span>`;
    let selected = row.category || "";
    if (selected && cffIsFeatureCategoryBlocked(selected, index)) selected = "";
    return `<select id="cffRowCat_${index}" class="dropdown cc-lf-select"
        aria-label="${escapeCffHtml(cffT("categoryLabel", "Kategorie"))}"
        onchange="onCffFeatureRowChange(${index})"
        onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">
        ${cffRowCategoryOptions(kind, selected, index)}
    </select>`;
}

function buildCffLfOptionsChipHtml(row, index) {
    if (!row || !row.kind || !row.category) {
        return `<span class="cc-lf-chip-muted">—</span>`;
    }
    const slot = cffRowToLfSlot(row, index);
    if (typeof getLfFixedOptionsDisplayKeys === "function") {
        const fixedKeys = getLfFixedOptionsDisplayKeys(slot);
        if (fixedKeys && fixedKeys.length) {
            return `<span>${fixedKeys.map(k => escapeCffHtml(cffT(k, k))).join(" & ")}</span>`;
        }
    }
    if (row.kind === "options" && row.category === "expertise") {
        return `<span>${escapeCffHtml(cffT("skillProfTitle", "Gemeisterte Fertigkeiten"))}</span>`;
    }
    if (row.kind === "options" && row.category === "weaponMasteries") {
        return `<span>${escapeCffHtml(cffT("ccLfWeaponMasteryOptionsShortLabel", "Waffenkategorien & -eigenschaften"))}</span>`;
    }
    if (!cffCanOpenOptionsMask(row)) {
        return `<span class="cc-lf-chip-muted">—</span>`;
    }
    const on = cffIsOptionsConfigured(row);
    const useFilter = row.kind === "options" || row.category === "choosePreparedSpell";
    const icon = useFilter ? cffLfFilterIconHtml() : cffLfGearIconHtml();
    const n = cffOptionsChipCount(row);
    const label = on ? `${icon} ${n}` : `${icon} —`;
    return `<button type="button" class="cc-lf-chip-btn${on ? " cc-lf-chip-btn--on" : ""}"
        onclick="openCffLfFloat(${index}, 'options', event)"
        onmousedown="event.stopPropagation()"
        title="${escapeCffHtml(cffT("ccLfEditOptionsTitleLabel", "Optionen konfigurieren"))}">${label}</button>`;
}

function buildCffLfAmountChipHtml(row, index) {
    if (!cffCanOpenAmountMask(row)) {
        return `<span class="cc-lf-chip-muted">—</span>`;
    }
    const n = parseInt(row.amount, 10) || 0;
    const on = n > 0;
    return `<button type="button" class="cc-lf-chip-btn${on ? " cc-lf-chip-btn--on" : ""}"
        onclick="openCffLfFloat(${index}, 'amount', event)"
        onmousedown="event.stopPropagation()"
        title="${escapeCffHtml(cffT("ccLfEditAmountTitleLabel", "Anzahl festlegen"))}">${on ? `×${n}` : "×—"}</button>`;
}

function buildCffFeatureRowsHtml() {
    const rows = customFeatDraft.featureRows || [];
    return rows.map((row, i) => {
        const empty = !row.kind;
        const cls = `cc-lf-row cc-lf-row--free${empty ? " cc-lf-row--empty" : ""}`;
        return `<div class="${cls}" role="row" data-row-index="${i}">
            <div class="cc-lf-cell" role="cell">${buildCffLfTypeSelectHtml(row, i)}</div>
            <div class="cc-lf-cell" role="cell">${buildCffLfCategorySelectHtml(row, i)}</div>
            <div class="cc-lf-cell cc-lf-cell--center" role="cell">${buildCffLfOptionsChipHtml(row, i)}</div>
            <div class="cc-lf-cell cc-lf-cell--center" role="cell">${buildCffLfAmountChipHtml(row, i)}</div>
        </div>`;
    }).join("");
}

function limitCffLfCheckboxGrid(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const max = parseInt(grid.getAttribute("data-max"), 10);
    if (!Number.isFinite(max) || max <= 0) return;
    const boxes = Array.from(grid.querySelectorAll('input[type="checkbox"]'));
    const n = boxes.filter(b => b.checked).length;
    boxes.forEach(box => {
        const disable = n >= max && !box.checked;
        box.disabled = disable;
        const lab = box.closest("label");
        if (lab) lab.classList.toggle("cc-lf-check-disabled", disable);
    });
}

function buildCffLfCheckboxGridHtml(gridId, name, items, selectedSet, max) {
    const hasMax = Number.isFinite(max) && max > 0;
    const selectedCount = items.filter(it => selectedSet.has(String(it.value))).length;
    const atMax = hasMax && selectedCount >= max;
    const dataMax = hasMax ? ` data-max="${max}"` : "";
    const onchange = hasMax ? ` onchange="limitCffLfCheckboxGrid('${gridId}')"` : "";
    return `<div class="cc-lf-check-grid" id="${gridId}"${dataMax}>
        ${items.map(it => {
            const val = String(it.value);
            const isChecked = selectedSet.has(val);
            const checked = isChecked ? "checked" : "";
            const disabled = atMax && !isChecked ? "disabled" : "";
            const labCls = (atMax && !isChecked) ? " class=\"cc-lf-check-disabled\"" : "";
            return `<label${labCls}><input type="checkbox" name="${name}" value="${escapeCffHtml(val)}" ${checked} ${disabled}${onchange}> ${escapeCffHtml(it.label)}</label>`;
        }).join("")}
    </div>`;
}

function cffLfPoolItemsForRow(row) {
    const cat = row.category;
    const kind = row.kind;
    if (cat === "skills" || cat === "expertise") {
        return cffGetSkillList().map(s => ({
            value: String(s.skillCategoryNumber),
            label: cffT(s.translationLabel, s.translationLabel)
        }));
    }
    if (cat === "savingThrows") {
        return CFF_ABILITY_LABELS.map(label => ({
            value: label,
            label: cffT(CFF_ABILITY_ABBR[label], label)
        }));
    }
    if (cat === "tools") {
        return cffGetToolList().map(t => ({
            value: String(t.ID),
            label: cffT(t.translationLabel, t.translationLabel)
        }));
    }
    if (cat === "weaponTraining") {
        const list = (typeof weaponCategory !== "undefined" && Array.isArray(weaponCategory)) ? weaponCategory : [];
        return list.map(w => ({
            value: String(w.weaponCategoryNumber),
            label: cffT(w.translationLabel, w.translationLabel)
        }));
    }
    if (cat === "armorTraining") {
        const list = (typeof armorCategory !== "undefined" && Array.isArray(armorCategory)) ? armorCategory : [];
        return list.map(a => ({
            value: String(a.armorCategoryNumber),
            label: cffT(a.translationLabel, a.translationLabel)
        }));
    }
    if (kind === "spellcraft" && (cat === "getCantrip" || cat === "getPreparedSpell")) {
        const wantCantrip = cat === "getCantrip";
        return cffGetSpellList().filter(s => {
            const lvl = s.spellLevel;
            return wantCantrip ? lvl === "cantripLabel" : lvl && lvl !== "cantripLabel";
        }).map(s => ({
            value: String(s.ID),
            label: cffSpellName(s)
        }));
    }
    return [];
}

function cffLfOptionsLabelKey(row) {
    if (row.category === "skills" || row.category === "expertise") return "skillsLabel";
    if (row.category === "free") return "ccLfCatFreeLabel";
    if (row.category === "savingThrows") return "savingThrowsLabel";
    if (row.category === "tools") return "toolLabel";
    if (row.category === "weaponTraining") return "weaponTrainingLabel";
    if (row.category === "armorTraining") return "armorTrainingLabel";
    if (row.category === "weaponMasteries") return "weaponMasteryLabel";
    if (row.category === "getCantrip" || row.category === "chooseCantrip") return "cantripLabel";
    if (row.category === "getPreparedSpell" || row.category === "choosePreparedSpell") return "spellsLabel";
    return "optionsLabel";
}

function cffExpandedToolListForMask() {
    const tools = (typeof toolList !== "undefined" && Array.isArray(toolList) ? toolList : [])
        .filter(t => t.translationLabel !== "gamingSetLabel" && t.translationLabel !== "musicalInstrumentLabel");
    const inst = (typeof instrumentList !== "undefined" && Array.isArray(instrumentList)) ? instrumentList : [];
    const games = (typeof gameList !== "undefined" && Array.isArray(gameList)) ? gameList : [];
    return tools.concat(inst, games);
}

function cffOptionsMinChoices() {
    return (typeof CUSTOM_CLASS_LF_CONFIG !== "undefined"
        && CUSTOM_CLASS_LF_CONFIG.limits
        && CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices)
        ? CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices
        : 1;
}

function cffRowToLfSlot(row, index) {
    if (!row.optionsConfig || typeof row.optionsConfig !== "object") row.optionsConfig = {};
    return {
        slotId: `cff-row-${index}`,
        kind: "free",
        level: 1,
        payload: {
            featureType: row.kind,
            category: row.category,
            optionsConfig: row.optionsConfig,
            amount: row.amount || 0,
            names: { de: "", en: "" },
            shortDescriptions: { de: "", en: "" }
        }
    };
}

function cffGetShimSlots() {
    return (customFeatDraft?.featureRows || []).map((row, i) => cffRowToLfSlot(row, i));
}

function cffInstallLfFloatBridges() {
    if (window._cffLfBridgesInstalled) return;
    window._cffLfBridgesInstalled = true;
    const origOverlay = typeof getActiveLfFloatOverlayEl === "function" ? getActiveLfFloatOverlayEl : null;
    getActiveLfFloatOverlayEl = function () {
        const featEl = document.getElementById("cffLfFloatOverlay");
        if (featEl && featEl.style.getPropertyValue("display") === "flex") return featEl;
        if (origOverlay) return origOverlay();
        return document.getElementById("ccLfFloatOverlay");
    };
    const origResolve = typeof resolveLfSlotContext === "function" ? resolveLfSlotContext : null;
    resolveLfSlotContext = function (slotId) {
        if (String(slotId || "").startsWith("cff-row-")) {
            const idx = parseInt(String(slotId).slice(8), 10);
            const row = customFeatDraft?.featureRows?.[idx];
            if (!row) return null;
            const slot = cffRowToLfSlot(row, idx);
            return { slot, slots: cffGetShimSlots(), subclass: null, isSubclass: false };
        }
        return origResolve ? origResolve(slotId) : null;
    };
    const origSlots = typeof getLfSlotsForSlot === "function" ? getLfSlotsForSlot : null;
    getLfSlotsForSlot = function (slot) {
        if (slot && String(slot.slotId || "").startsWith("cff-row-")) return cffGetShimSlots();
        return origSlots ? origSlots(slot) : [];
    };
    // Freie Optionen / Sprachfelder: Feat-Draft statt Class-Editor-State
    const origLangState = typeof getActiveLfEditorLangState === "function" ? getActiveLfEditorLangState : null;
    getActiveLfEditorLangState = function () {
        if (customFeatEditorOpen && customFeatDraft) return customFeatDraft;
        return origLangState ? origLangState() : null;
    };
}

function cffBuildOptionsFilterMaskHtml(headingKey, modeId, wrapId, listId, mode, items, selectedSet, onchangeExtra) {
    const min = cffOptionsMinChoices();
    const extra = onchangeExtra ? onchangeExtra.replace(/;?\s*$/, "") : "";
    const onchange = `document.getElementById('${wrapId}').style.display=this.value==='selection'?'block':'none'${extra ? `;${extra}` : ""}`;
    const hint = (typeof formatLfMinOptionsHint === "function") ? formatLfMinOptionsHint(min) : "";
    const heading = (typeof buildLfOptionsFilterHeadingHtml === "function")
        ? buildLfOptionsFilterHeadingHtml(headingKey)
        : `<label class="cc-lf-float-label">${escapeCffHtml(cffT(headingKey, headingKey))}</label>`;
    const control = (typeof buildLfControlRowHtml === "function")
        ? buildLfControlRowHtml(
            heading,
            `<select id="${modeId}" class="dropdown cc-lf-float-input cc-lf-options-filter" onchange="${onchange}">
                <option value="all" ${mode === "all" ? "selected" : ""}>${cffT("allLabel", "Alle")}</option>
                <option value="selection" ${mode === "selection" ? "selected" : ""}>${cffT("selectionLabel", "Auswahl")}</option>
            </select>`
        )
        : `${heading}<select id="${modeId}" class="dropdown" onchange="${onchange}"></select>`;
    const grid = (typeof buildLfCheckboxGridHtml === "function")
        ? buildLfCheckboxGridHtml(listId, items, selectedSet)
        : "";
    return `
        ${control}
        <div id="${wrapId}" style="display:${mode === "selection" ? "block" : "none"};">
            ${hint ? `<p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${hint}</p>` : ""}
            ${grid}
        </div>
    `;
}

function buildCffLfFloatOptionsBody(row) {
    const kind = row.kind;
    const cat = row.category;
    const cfg = row.optionsConfig || {};
    const slot = cffRowToLfSlot(row, cffLfFloatContext?.index || 0);

    if (kind === "spellcraft" && typeof buildLfSpellcraftOptionsBody === "function") {
        return buildLfSpellcraftOptionsBody(slot, cfg);
    }

    // Optionen → Frei: Klassenbauer-Maske, ohne „Optionen übernehmen von“
    if (kind === "options" && cat === "free" && typeof buildLfFloatOptionsBody === "function") {
        const html = buildLfFloatOptionsBody(slot);
        const wrap = document.createElement("div");
        wrap.innerHTML = html;
        wrap.querySelectorAll(".cc-lf-free-options-copy").forEach(el => el.remove());
        return wrap.innerHTML || html;
    }

    if (kind === "options" && (cat === "skills" || cat === "expertise")) {
        const filter = cfg.skillFilter === "base" ? "all" : (cfg.skillFilter || "all");
        const skills = (typeof skillList !== "undefined" ? skillList : []).map(s => s.translationLabel || s);
        return cffBuildOptionsFilterMaskHtml(
            cat === "expertise" ? "expertiseLabel" : "skillsLabel",
            "ccLfSkillFilter",
            "ccLfSkillSelectWrap",
            "ccLfSkillAllowList",
            filter,
            skills,
            new Set(cfg.selectedSkills || [])
        );
    }

    if (kind === "options" && cat === "tools") {
        const mode = cfg.mode || "selection";
        return cffBuildOptionsFilterMaskHtml(
            "toolsLabel",
            "ccLfToolMode",
            "ccLfToolAllowWrap",
            "ccLfToolAllowList",
            mode,
            cffExpandedToolListForMask(),
            new Set(cfg.allowedLabels || [])
        );
    }

    if (kind === "simple" && cat === "tools") {
        const selected = new Set(cfg.selectedLabels || []);
        const heading = (typeof buildLfOptionsGearHeadingHtml === "function")
            ? buildLfOptionsGearHeadingHtml("toolsLabel")
            : `<label class="cc-lf-float-label">${escapeCffHtml(cffT("toolsLabel", "Werkzeuge"))}</label>`;
        const hint = (typeof formatLfPickMinHint === "function")
            ? formatLfPickMinHint(1)
            : "";
        const grid = (typeof buildLfCheckboxGridHtml === "function")
            ? buildLfCheckboxGridHtml("ccLfSimpleToolList", cffExpandedToolListForMask(), selected)
            : "";
        return `${heading}${hint ? `<p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${hint}</p>` : ""}${grid}`;
    }

    if (typeof buildLfFloatOptionsBody === "function") {
        return buildLfFloatOptionsBody(slot);
    }
    return `<p>—</p>`;
}

function buildCffLfFloatAmountBody(row) {
    const max = cffAmountMaxForRow(row);
    if (!max) return `<p>${escapeCffHtml(cffT("ccLfNoAmountForRowLabel", "Für diese Kombination ist keine Anzahl nötig."))}</p>`;
    const min = 1;
    const current = parseInt(row.amount, 10) || 0;
    const value = current > 0 ? Math.min(current, max) : min;
    const context = `${cffT("cffAmountDropdownsContextLabel", "Anzahl der Aufklapplisten (Dropdown-Inputs)")} (max. ${max}):`;
    return `
        <p class="cc-lf-float-context">${escapeCffHtml(context)}</p>
        <input type="number" id="cffLfAmountInput" class="cc-lf-float-input cc-lf-amount-input"
            min="${min}" max="${max}" step="1" value="${value}"
            oninput="clampCustomClassNumberInput(this, ${min}, ${max})">
    `;
}

function cffApplySkillsLikeFromDom(row) {
    const min = cffOptionsMinChoices();
    let skillFilter = document.getElementById("ccLfSkillFilter")?.value || "all";
    if (skillFilter === "base") skillFilter = "all";
    const selectedSkills = Array.from(document.querySelectorAll("#ccLfSkillAllowList input:checked")).map(el => el.value);
    row.optionsConfig = {
        skillFilter,
        selectedSkills: skillFilter === "selection" ? selectedSkills : []
    };
    return !(skillFilter === "selection" && selectedSkills.length < min);
}

function cffApplyToolsOptionsFromDom(row) {
    const min = cffOptionsMinChoices();
    const mode = document.getElementById("ccLfToolMode")?.value || "selection";
    const allowedLabels = Array.from(document.querySelectorAll("#ccLfToolAllowList input:checked")).map(el => el.value);
    row.optionsConfig = {
        mode,
        allowedLabels: mode === "selection" ? allowedLabels : []
    };
    return !(mode === "selection" && allowedLabels.length < min);
}

function cffApplySimpleToolsFromDom(row) {
    const selectedLabels = Array.from(document.querySelectorAll("#ccLfSimpleToolList input:checked")).map(el => el.value);
    row.optionsConfig = { selectedLabels };
    return selectedLabels.length >= 1;
}

function commitCffLfFloat() {
    if (!cffLfFloatContext || !customFeatDraft) return;
    const { index, mode } = cffLfFloatContext;
    const row = customFeatDraft.featureRows[index];
    if (!row) return;
    if (mode === "amount") {
        const amtEl = document.getElementById("cffLfAmountInput")
            || (typeof queryActiveLfFloat === "function" ? queryActiveLfFloat("#ccLfAmountInput") : null);
        if (amtEl) {
            let n = parseInt(amtEl.value, 10);
            if (!Number.isFinite(n) || n < 1) n = 1;
            const max = cffAmountMaxForRow(row);
            if (max) n = Math.min(n, max);
            row.amount = n;
        }
        return;
    }
    const slot = cffRowToLfSlot(row, index);
    const cat = row.category;
    const kind = row.kind;
    if (kind === "spellcraft") {
        const apply = cat === "getCantrip" ? applyLfSpellcraftGetCantripFromDom
            : cat === "chooseCantrip" ? applyLfSpellcraftChooseCantripFromDom
            : cat === "getPreparedSpell" ? applyLfSpellcraftGetPreparedFromDom
            : cat === "choosePreparedSpell" ? applyLfSpellcraftChoosePreparedFromDom
            : null;
        if (typeof apply === "function") apply(slot, { soft: true });
        row.optionsConfig = slot.payload.optionsConfig || {};
        if (row.optionsConfig.pickCount) row.amount = parseInt(row.optionsConfig.pickCount, 10) || row.amount;
        return;
    }
    if (kind === "options" && (cat === "skills" || cat === "expertise")) {
        cffApplySkillsLikeFromDom(row);
        return;
    }
    if (kind === "options" && cat === "tools") {
        cffApplyToolsOptionsFromDom(row);
        return;
    }
    if (kind === "simple" && cat === "tools") {
        cffApplySimpleToolsFromDom(row);
        return;
    }
    if (typeof applyLfFloatOptions === "function") {
        applyLfFloatOptions(slot, { soft: true });
        row.optionsConfig = slot.payload.optionsConfig || {};
    }
}

function openCffLfFloat(index, mode, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (customFeatDraft && customFeatActiveTab === 2) {
        syncCffDraftFromDom();
    }
    if (cffLfFloatContext) closeCffLfFloat({ rerender: false });
    if (!customFeatDraft) return;
    const row = customFeatDraft.featureRows[index];
    if (!row) return;
    if (mode === "options" && !cffCanOpenOptionsMask(row)) return;
    if (mode === "amount" && !cffCanOpenAmountMask(row)) return;

    cffInstallLfFloatBridges();
    const overlay = document.getElementById("cffLfFloatOverlay");
    const titleEl = document.getElementById("cffLfFloatTitle");
    const hintEl = document.getElementById("cffLfFloatHint");
    const bodyEl = document.getElementById("cffLfFloatBody");
    if (!overlay || !titleEl || !bodyEl) return;

    cffLfFloatContext = { index, mode };
    const slot = cffRowToLfSlot(row, index);
    if (typeof ccLfFloatContext !== "undefined") {
        ccLfFloatContext = { slotId: slot.slotId, mode, readonly: false, isSubclass: false };
    }

    titleEl.textContent = mode === "amount"
        ? cffT("ccLfEditAmountTitleLabel", "Anzahl festlegen")
        : cffT("ccLfEditOptionsTitleLabel", "Optionen konfigurieren");
    if (hintEl) {
        hintEl.textContent = "";
        hintEl.style.display = "none";
    }
    bodyEl.innerHTML = mode === "amount"
        ? buildCffLfFloatAmountBody(row)
        : buildCffLfFloatOptionsBody(row);

    const floatPanel = overlay.querySelector(".cc-lf-float");
    if (floatPanel) {
        floatPanel.classList.toggle("cc-lf-float--wide", mode === "options");
    }
    overlay.style.setProperty("display", "flex", "important");
    if (typeof initLfCheckboxGridLimits === "function") initLfCheckboxGridLimits(bodyEl);
    if (mode === "options" && row.kind === "spellcraft" && typeof bindLfSpellcraftMaskHandlers === "function") {
        bindLfSpellcraftMaskHandlers(slot);
    }
}

function closeCffLfFloat(opts) {
    const rerender = !opts || opts.rerender !== false;
    // Bezeichnung/Beschreibung vor Commit+Rerender aus dem DOM sichern
    if (customFeatDraft && customFeatActiveTab === 2) {
        syncCffDraftFromDom();
    }
    if (cffLfFloatContext) commitCffLfFloat();
    const overlay = document.getElementById("cffLfFloatOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    cffLfFloatContext = null;
    if (typeof ccLfFloatContext !== "undefined") ccLfFloatContext = null;
    if (rerender && customFeatDraft && customFeatActiveTab === 2) {
        renderCustomFeatTab2();
    }
}

function clearCustomFeatDraft() {
    const msg = cffT("cffClearDraftConfirmLabel", "Einträge dieses Talents verwerfen und Maske leeren?");
    if (!confirm(msg)) return;
    closeCffLfFloat({ rerender: false });
    const keepId = customFeatDraft?.ID || null;
    const keepLabel = customFeatDraft?.translationLabel || null;
    customFeatDraft = createEmptyCustomFeatDraft();
    customFeatDraft.ID = keepId;
    customFeatDraft.translationLabel = keepLabel;
    renderCustomFeatTab2();
}

//=======================================================================
// Compile
//=======================================================================

function cffAllSkillNumbers() {
    return cffGetSkillList().map(s => s.skillCategoryNumber).filter(Number.isFinite);
}

function cffAllAbilityLabels() {
    return CFF_ABILITY_LABELS.slice();
}

function cffAllExpandedToolLabels() {
    return cffExpandedToolListForMask().map(t => t.translationLabel).filter(Boolean);
}

function cffAllWeaponCategoryNumbers() {
    const list = (typeof weaponCategory !== "undefined" && Array.isArray(weaponCategory)) ? weaponCategory : [];
    return list.map(w => w.weaponCategoryNumber).filter(Number.isFinite);
}

function cffAllArmorCategoryNumbers() {
    const list = (typeof armorCategory !== "undefined" && Array.isArray(armorCategory)) ? armorCategory : [];
    return list.map(a => a.armorCategoryNumber).filter(Number.isFinite);
}

function cffUniqueSlug(baseSlug, exceptId) {
    let slug = baseSlug || "undefined";
    const used = new Set();
    (customFeatEditorState?.feats || []).forEach(f => {
        if (exceptId != null && Number(f.ID) === Number(exceptId)) return;
        if (f.translationLabel) used.add(f.translationLabel);
    });
    let label = `custom_feat_${slug}Label`;
    if (!used.has(label)) return slug;
    let n = 2;
    while (used.has(`custom_feat_${slug}_${n}Label`)) n += 1;
    return `${slug}_${n}`;
}

function cffSpellLabelById(id) {
    const s = cffGetSpellList().find(x => Number(x.ID) === Number(id));
    return s ? s.translationLabel : null;
}

function compileFeatFromDraft(draft) {
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    const name = String(draft.names[active] || "").trim();
    const slugSrc = (typeof slugifyClassName === "function")
        ? slugifyClassName(name)
        : "undefined";
    const isNew = !draft.translationLabel;
    const slug = isNew
        ? cffUniqueSlug(slugSrc, draft.ID)
        : String(draft.translationLabel).replace(/^custom_feat_/, "").replace(/Label$/, "");
    const translationLabel = draft.translationLabel || `custom_feat_${slug}Label`;
    const featDLabel = `custom_feat_${slug}DLabel`;
    const featD_sheet = `custom_feat_${slug}Dsheet`;

    const id = draft.ID || peekNextCustomFeatId(customFeatEditorState);
    const cat = parseInt(draft.featCategoryNumber, 10);

    let prereqFeature = 0;
    if (cat === 1) {
        prereqFeature = 0;
    } else if (cat === 3 || draft.prereqFeatureMode === "fightingStyle") {
        prereqFeature = "fightingStyleLabel";
    } else if (draft.prereqFeatureMode === "spellOrPact") {
        prereqFeature = ["spellcastingLabel", "pactMagicLabel"];
    }

    const prereqAttrs = (cat === 1 || draft.prereqNoThreshold === 1)
        ? []
        : (Array.isArray(draft.prereqAttributes) ? draft.prereqAttributes.filter(Boolean) : []);
    const attrBonus = cat === 1
        ? 0
        : ((draft.attrImprovement || []).length ? draft.attrImprovement.slice() : 0);
    const prereqLevel = cat === 1
        ? 1
        : (cat === 4
            ? 19
            : Math.min(20, Math.max(1, parseInt(draft.prerequisiteLevel, 10) || 1)));

    const customGrants = {
        skillsGet: [],
        skillsChoose: { pool: [], amount: 0 },
        savesGet: [],
        savesChoose: { pool: [], amount: 0 },
        toolsGet: [],
        toolsChoose: { pool: [], amount: 0 },
        expertiseChoose: { pool: [], amount: 0 },
        weaponMasteryChoose: { amount: 0 },
        freeChoose: { amount: 0, familyId: "", options: [] }
    };
    let weapons = [];
    let armor = [];
    const magicEntries = [];
    let nextMagic = peekNextCustomFeatMagicId(customFeatEditorState);
    let hasExpertise = false;
    let hasMastery = false;
    let hasSavesChoose = false;
    let hasSpellChoice = false;
    let hasFreeChoose = false;
    let freeFamilyId = "";
    let freeChoiceOptionsCompiled = [];
    const simpleSkillLabels = [];
    const getCantripLabels = [];
    const getPreparedSpellLabels = [];

    (draft.featureRows || []).forEach(row => {
        if (!row || !row.kind || !row.category) return;
        const category = cffNormalizeFeatureCategory(row.category);
        const cfg = row.optionsConfig || {};
        const amount = Math.max(1, parseInt(row.amount, 10) || 1);
        if (row.kind === "simple") {
            if (category === "skills") {
                (cfg.selectedSkills || []).forEach(lab => {
                    const n = cffSkillLabelToNumber(lab);
                    if (Number.isFinite(n) && !customGrants.skillsGet.includes(n)) customGrants.skillsGet.push(n);
                    if (lab && !simpleSkillLabels.includes(lab)) simpleSkillLabels.push(lab);
                });
            } else if (category === "savingThrows") {
                const labels = cfg.mode === "all" ? cffAllAbilityLabels() : (cfg.selectedLabels || []);
                labels.forEach(v => {
                    if (v && !customGrants.savesGet.includes(v)) customGrants.savesGet.push(v);
                });
            } else if (category === "tools") {
                (cfg.selectedLabels || []).forEach(lab => {
                    if (lab && !customGrants.toolsGet.includes(lab)) customGrants.toolsGet.push(lab);
                });
            } else if (category === "weaponTraining") {
                const nums = cfg.weaponCategoryMode === "all"
                    ? cffAllWeaponCategoryNumbers()
                    : (cfg.selectedWeaponCategoryNumbers || []);
                nums.forEach(n => {
                    const v = parseInt(n, 10);
                    if (Number.isFinite(v) && !weapons.includes(v)) weapons.push(v);
                });
            } else if (category === "armorTraining") {
                const nums = cfg.mode === "all"
                    ? cffAllArmorCategoryNumbers()
                    : (cfg.selectedArmorCategoryNumbers || []);
                nums.forEach(n => {
                    const v = parseInt(n, 10);
                    if (Number.isFinite(v) && !armor.includes(v)) armor.push(v);
                });
            }
        } else if (row.kind === "options") {
            if (category === "free") {
                const choices = Array.isArray(cfg.choices)
                    ? cfg.choices.filter(cffChoiceHasNameText)
                    : [];
                if (choices.length >= 2) {
                    const familyId = String(cfg.featureFamilyId || "").trim() || `cff_${slug}`;
                    cfg.featureFamilyId = familyId;
                    freeFamilyId = familyId;
                    hasFreeChoose = true;
                    customGrants.freeChoose = {
                        amount,
                        familyId,
                        options: choices.map((c, i) => ({
                            value: `${familyId}__${i + 1}`,
                            names: {
                                de: cffPickLocaleText(c.names, "de"),
                                en: cffPickLocaleText(c.names, "en")
                            },
                            descriptions: {
                                de: cffPickLocaleText(c.descriptions, "de"),
                                en: cffPickLocaleText(c.descriptions, "en")
                            }
                        }))
                    };
                    freeChoiceOptionsCompiled = customGrants.freeChoose.options.map((opt, i) => {
                        const optKey = `custom_feat_${slug}_fc${i + 1}Label`;
                        const optDescKey = `custom_feat_${slug}_fc${i + 1}D`;
                        const hasDesc = !!(opt.descriptions.de || opt.descriptions.en);
                        return {
                            value: opt.value,
                            translationLabel: optKey,
                            descriptionLabel: hasDesc ? optDescKey : 0,
                            _names: opt.names,
                            _descriptions: opt.descriptions
                        };
                    });
                }
            } else if (category === "skills") {
                const labels = cfg.skillFilter === "all"
                    ? cffGetSkillList().map(s => s.translationLabel)
                    : (cfg.selectedSkills || []);
                customGrants.skillsChoose.pool = labels.map(cffSkillLabelToNumber).filter(Number.isFinite);
                customGrants.skillsChoose.amount = amount;
            } else if (category === "savingThrows") {
                customGrants.savesChoose.pool = cfg.mode === "all" ? cffAllAbilityLabels() : (cfg.selectedLabels || []).slice();
                customGrants.savesChoose.amount = amount;
                hasSavesChoose = amount > 0;
            } else if (category === "expertise") {
                const labels = (cfg.skillFilter === "selection" && Array.isArray(cfg.selectedSkills) && cfg.selectedSkills.length)
                    ? cfg.selectedSkills
                    : cffGetSkillList().map(s => s.translationLabel);
                customGrants.expertiseChoose.pool = labels.map(cffSkillLabelToNumber).filter(Number.isFinite);
                customGrants.expertiseChoose.amount = amount;
                hasExpertise = amount > 0;
            } else if (category === "tools") {
                customGrants.toolsChoose.pool = cfg.mode === "all"
                    ? cffAllExpandedToolLabels()
                    : (cfg.allowedLabels || []).slice();
                customGrants.toolsChoose.amount = amount;
            } else if (category === "weaponMasteries") {
                customGrants.weaponMasteryChoose.amount = amount;
                hasMastery = amount > 0;
            }
        } else if (row.kind === "spellcraft") {
            const emptyMagic = {
                ID: nextMagic++,
                translationLabel,
                getSpellList_c: 0,
                getSpellList_sl: 0,
                chooseNonSpecificSpell_c: 0,
                chooseNonSpecificSpell_ss: 0,
                chooseNonSpecificSpell_sf: 0,
                chooseNonSpecific_sl: 0,
                chooseNonSpecificSpell_a: 0,
                getSpecificSpell: 0,
                chooseType: 1,
                isCustom: true
            };
            if (category === "getCantrip") {
                const labels = (cfg.selectedSpells || []).filter(Boolean);
                if (labels.length) {
                    labels.forEach(lab => {
                        if (!getCantripLabels.includes(lab)) getCantripLabels.push(lab);
                    });
                    magicEntries.push(Object.assign({}, emptyMagic, {
                        getSpecificSpell: labels,
                        chooseType: 1
                    }));
                    hasSpellChoice = true;
                }
            } else if (category === "chooseCantrip") {
                const pick = Math.max(1, parseInt(cfg.pickCount, 10) || amount);
                magicEntries.push(Object.assign({}, emptyMagic, {
                    chooseNonSpecific_sl: ["cantripLabel"],
                    chooseNonSpecificSpell_a: pick,
                    chooseNonSpecificSpell_c: (cfg.listMode === "selection" && (cfg.spellListLabels || []).length)
                        ? cfg.spellListLabels.slice()
                        : 0,
                    chooseNonSpecificSpell_ss: (cfg.schoolMode === "selection" && (cfg.schoolLabels || []).length)
                        ? cfg.schoolLabels.slice()
                        : 0,
                    chooseType: 1
                }));
                hasSpellChoice = true;
            } else if (category === "getPreparedSpell") {
                const byLevel = cfg.selectedByLevel || {};
                const labels = [];
                Object.keys(byLevel).forEach(lvl => {
                    (byLevel[lvl] || []).filter(Boolean).forEach(lab => labels.push(lab));
                });
                if (labels.length) {
                    labels.forEach(lab => {
                        if (!getPreparedSpellLabels.includes(lab)) getPreparedSpellLabels.push(lab);
                    });
                    magicEntries.push(Object.assign({}, emptyMagic, {
                        getSpecificSpell: labels,
                        chooseType: 3
                    }));
                    hasSpellChoice = true;
                }
            } else if (category === "choosePreparedSpell") {
                const pick = Math.max(1, parseInt(cfg.pickCount, 10) || amount);
                const lvls = (cfg.levelMode === "selection" && (cfg.levelLabels || []).length)
                    ? cfg.levelLabels.slice()
                    : (typeof getLfPreparedSpellLevelLabels === "function"
                        ? getLfPreparedSpellLevelLabels().slice()
                        : ["1stLevelLabel"]);
                magicEntries.push(Object.assign({}, emptyMagic, {
                    chooseNonSpecific_sl: lvls,
                    chooseNonSpecificSpell_a: pick,
                    chooseNonSpecificSpell_c: (cfg.listMode === "selection" && (cfg.spellListLabels || []).length)
                        ? cfg.spellListLabels.slice()
                        : 0,
                    chooseNonSpecificSpell_ss: (cfg.schoolMode === "selection" && (cfg.schoolLabels || []).length)
                        ? cfg.schoolLabels.slice()
                        : 0,
                    chooseType: 3
                }));
                hasSpellChoice = true;
            }
        }
    });

    const skillPool = customGrants.skillsGet.slice();
    (customGrants.skillsChoose.pool || []).forEach(n => {
        if (!skillPool.includes(n)) skillPool.push(n);
    });
    (customGrants.expertiseChoose.pool || []).forEach(n => {
        if (!skillPool.includes(n)) skillPool.push(n);
    });

    const sheetFlags = {
        hasSavesChoose,
        hasMastery,
        hasSpellChoice,
        hasFreeChoose,
        freeFamilyId,
        simpleSkillLabels: simpleSkillLabels.slice(),
        getCantripLabels: getCantripLabels.slice(),
        getPreparedSpellLabels: getPreparedSpellLabels.slice()
    };
    const hasAutoSheetBlocks = hasSavesChoose || hasMastery || hasSpellChoice || hasFreeChoose;

    const hasUserDesc = ["de", "en"].some(lang => String(draft.descriptions?.[lang] || "").trim());
    const hasSheetTags = hasAutoSheetBlocks;
    let baseSheetStatus = (hasUserDesc || hasSheetTags) ? 1 : 2;
    let characterSheet = baseSheetStatus;
    if (hasExpertise) characterSheet = `${baseSheetStatus}:EXPERT_CHECK`;
    else if (hasMastery) characterSheet = `${baseSheetStatus}:MASTERY_CHECK`;

    const hasAnyChoice = hasSavesChoose || hasMastery || hasExpertise || hasFreeChoose
        || (customGrants.skillsChoose.amount > 0)
        || (customGrants.toolsChoose.amount > 0)
        || magicEntries.length > 0;
    const takeChoice = magicEntries.length ? 4 : (hasAnyChoice ? 1 : 0);

    const feat = {
        ID: id,
        translationLabel,
        featDLabel,
        featD_sheet,
        characterSheet,
        featCategoryNumber: cat,
        multipleSelection: draft.multipleSelection === 1 ? 1 : 0,
        takeChoice,
        prerequisite_Level: prereqLevel,
        prerequisite_Attribute: prereqAttrs.length ? prereqAttrs : 0,
        prerequisite_AttributeValue: prereqAttrs.length
            ? Math.min(20, Math.max(1, parseInt(draft.prereqAttributeValue, 10) || 13))
            : 0,
        prerequisite_Feature: prereqFeature,
        prerequisite_armorCategoryNumber: 0,
        Get_toolID: customGrants.toolsGet.length
            ? customGrants.toolsGet.slice()
            : (customGrants.toolsChoose.pool.length ? customGrants.toolsChoose.pool.slice() : 0),
        Get_spellID: 0,
        Get_skillCategoryNumber: skillPool.length ? skillPool : 0,
        Get_attrImprovement: attrBonus,
        Get_weaponCategoryNumber: weapons.length ? weapons : 0,
        Get_armorCategoryNumber: armor.length ? armor : 0,
        freeChoiceOptions: freeChoiceOptionsCompiled.length
            ? freeChoiceOptionsCompiled.map(o => ({
                value: o.value,
                translationLabel: o.translationLabel,
                descriptionLabel: o.descriptionLabel
            }))
            : 0,
        freeChoiceFamilyId: freeFamilyId || 0,
        isCustom: true,
        customGrants,
        editor: {
            names: Object.assign({}, draft.names),
            descriptions: Object.assign({}, draft.descriptions),
            availableLanguages: (draft.availableLanguages || []).slice(),
            featureRows: (draft.featureRows || []).map(r => Object.assign({}, r, {
                pool: Array.isArray(r.pool) ? r.pool.slice() : [],
                spellLevels: Array.isArray(r.spellLevels) ? r.spellLevels.slice() : [],
                optionsConfig: JSON.parse(JSON.stringify(r.optionsConfig || {}))
            })),
            prereqFeatureMode: draft.prereqFeatureMode || "none",
            prereqNoThreshold: draft.prereqNoThreshold === 1 ? 1 : 0
        }
    };
    if (typeof applyCustomContentSource === "function") applyCustomContentSource(feat);
    else if (typeof CUSTOM_CONTENT_SOURCE !== "undefined") {
        feat.source = CUSTOM_CONTENT_SOURCE.slice();
    }

    const translationsBag = {
        de: Object.assign({}, customFeatEditorState.translations.de),
        en: Object.assign({}, customFeatEditorState.translations.en)
    };
    ["de", "en"].forEach(lang => {
        if (!translationsBag[lang]) translationsBag[lang] = {};
        freeChoiceOptionsCompiled.forEach(opt => {
            translationsBag[lang][opt.translationLabel] = cffPickLocaleText(opt._names, lang);
            if (opt.descriptionLabel) {
                translationsBag[lang][opt.descriptionLabel] = cffPickLocaleText(opt._descriptions, lang);
            }
        });
    });
    (draft.availableLanguages || [active]).forEach(lang => {
        if (!translationsBag[lang]) translationsBag[lang] = {};
        translationsBag[lang][translationLabel] = String(draft.names[lang] || "").trim();
        const desc = String(draft.descriptions[lang] || "").trim();
        translationsBag[lang][featDLabel] = desc;
        const autoBlocks = cffBuildFeatSheetAutoBlocks(lang, translationLabel, sheetFlags);
        const sheetParts = [];
        if (desc) sheetParts.push(desc);
        if (desc && autoBlocks.length) sheetParts.push(""); // Leerzeile zwischen Nutzertext und generischem Block
        autoBlocks.forEach(block => sheetParts.push(block));
        translationsBag[lang][featD_sheet] = sheetParts.join("\n");
    });

    return { feat, magicEntries, translations: translationsBag, translationLabel };
}

function validateCustomFeatDraft() {
    if (!customFeatDraft) return { ok: false, errorKey: "cffNameRequiredAlertLabel" };
    closeCffLfFloat({ rerender: false });
    syncCffDraftFromDom();
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    if (!String(customFeatDraft.names[active] || "").trim()) {
        return { ok: false, errorKey: "cffNameRequiredAlertLabel" };
    }
    const cat = parseInt(customFeatDraft.featCategoryNumber, 10);
    if (!(CFF_CONFIG.allowedCategories || []).includes(cat)) {
        return { ok: false, errorKey: "cffCategoryRequiredAlertLabel" };
    }
    return { ok: true };
}

function saveCustomFeatDraft() {
    if (!customFeatEditorState || !customFeatDraft) return;
    const result = validateCustomFeatDraft();
    if (!result.ok) {
        alert(cffT(result.errorKey, result.errorKey));
        return;
    }
    const isNew = !customFeatDraft.ID && !customFeatEditingId;
    if (isNew && (customFeatEditorState.feats || []).length >= CFF_CONFIG.maxFeatsPerPack) {
        alert(cffT("cffMaxFeatsAlertLabel", "Maximal 30 Talente pro Bibliothek."));
        return;
    }
    const compiled = compileFeatFromDraft(customFeatDraft);
    const idx = (customFeatEditorState.feats || []).findIndex(f => Number(f.ID) === Number(compiled.feat.ID));
    if (idx >= 0) customFeatEditorState.feats[idx] = compiled.feat;
    else customFeatEditorState.feats.push(compiled.feat);

    const label = compiled.translationLabel;
    customFeatEditorState.magicFeats = (customFeatEditorState.magicFeats || [])
        .filter(m => m.translationLabel !== label)
        .concat(compiled.magicEntries);
    customFeatEditorState.translations = compiled.translations;
    customFeatEditorState.nextId = peekNextCustomFeatId(customFeatEditorState);
    customFeatEditorState.nextMagicId = peekNextCustomFeatMagicId(customFeatEditorState);

    if (typeof translations !== "undefined") {
        Object.assign(translations.de, compiled.translations.de || {});
        Object.assign(translations.en, compiled.translations.en || {});
    }

    customFeatEditingId = null;
    customFeatDraft = null;
    switchCustomFeatTab(1);
}

//=======================================================================
// Export / Wrap / Snapshot
//=======================================================================

function buildCustomFeatPackProvides(state) {
    return (state?.feats || []).map(f => ({
        kind: "feat",
        id: f.ID,
        slug: f.translationLabel || undefined
    }));
}

function buildCustomFeatPackDependencies(state) {
    const scan = {
        spellIds: [],
        featIds: [],
        spellLabels: [],
        featLabels: []
    };
    (state?.feats || []).forEach(feat => {
        (feat?.editor?.featureRows || []).forEach(row => {
            if (row.kind !== "spellcraft") return;
            const labels = (typeof collectDcSpellLabelsFromLfOptionsConfig === "function")
                ? collectDcSpellLabelsFromLfOptionsConfig(row.optionsConfig || {}, row.category)
                : [];
            labels.forEach(l => scan.spellLabels.push(l));
        });
    });
    (state?.magicFeats || []).forEach(m => {
        const spec = m?.getSpecificSpell;
        if (Array.isArray(spec)) {
            spec.forEach(l => { if (typeof l === "string") scan.spellLabels.push(l); });
        } else if (typeof spec === "string") {
            scan.spellLabels.push(spec);
        }
    });
    return (typeof buildDcPackageDepsFromCustomRefs === "function")
        ? buildDcPackageDepsFromCustomRefs(scan, {
            spellPackId: (typeof resolveDcSessionSpellPackId === "function")
                ? resolveDcSessionSpellPackId()
                : null
        })
        : [];
}

function buildCustomFeatPackExportPayload(state) {
    if (!state) return null;
    const feats = (state.feats || []).map(f => JSON.parse(JSON.stringify(f)));
    const magicFeats = (state.magicFeats || []).map(m => Object.assign({}, m));
    const flatPayload = {
        version: 1,
        type: "customFeatPack",
        packageId: state.packageId || null,
        availableLanguages: (state.availableLanguages || []).slice(),
        translations: {
            de: Object.assign({}, state.translations?.de || {}),
            en: Object.assign({}, state.translations?.en || {})
        },
        feats,
        magicFeats,
        nextId: peekNextCustomFeatId(state),
        nextMagicId: peekNextCustomFeatMagicId(state)
    };
    const stateForWrap = Object.assign({}, state, { feats, magicFeats });
    if (typeof wrapCustomFeatPackExport === "function") {
        return wrapCustomFeatPackExport(stateForWrap, flatPayload);
    }
    if (typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined") {
        return wrapDcPackage({
            packageType: DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK,
            packageId: state.packageId || undefined,
            createdAt: state.packageCreatedAt || undefined,
            provides: buildCustomFeatPackProvides(stateForWrap),
            dependencies: buildCustomFeatPackDependencies(stateForWrap),
            payload: flatPayload
        });
    }
    return flatPayload;
}

function getCustomFeatPackExportSnapshotString(exportData) {
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

function downloadCffJson(filename, data) {
    if (typeof downloadJson === "function") {
        downloadJson(filename, data);
        return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function buildCustomFeatPackFilename(state) {
    const prefix = CFF_CONFIG.filenamePrefix || "custom_feats";
    const stamp = (typeof formatCustomClassDate === "function")
        ? formatCustomClassDate(new Date())
        : (() => {
            const d = new Date();
            const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            return `${String(d.getDate()).padStart(2, "0")}${months[d.getMonth()]}${d.getFullYear()}`;
        })();
    return `${prefix}_${stamp}.json`;
}

function finishCustomFeatPack() {
    if (!customFeatEditorState) {
        closeCustomFeatModal();
        return;
    }
    const payload = buildCustomFeatPackExportPayload(customFeatEditorState);
    if (payload?.dc?.packageId) {
        customFeatEditorState.packageId = payload.dc.packageId;
        customFeatEditorState.packageCreatedAt =
            payload.dc.createdAt || customFeatEditorState.packageCreatedAt;
    }

    const currentSnapshot = getCustomFeatPackExportSnapshotString(payload);
    const changed = customFeatImportSnapshot == null
        || currentSnapshot !== customFeatImportSnapshot;

    if (changed) {
        downloadCffJson(buildCustomFeatPackFilename(customFeatEditorState), payload);
        customFeatImportSnapshot = currentSnapshot;
    }

    if (typeof markDcPackageUserLoaded === "function") {
        markDcPackageUserLoaded(
            (typeof DC_PACKAGE_TYPE !== "undefined")
                ? DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK
                : "customFeatPack"
        );
    }

    registerCustomFeatPackFromPayload(
        payload?.payload || payload,
        payload?.dc || null
    );

    discardCustomFeatEditor();
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
}

//=======================================================================
// Runtime-Registrierung
//=======================================================================

function clearRegisteredCustomFeatPack() {
    clearCreatorCustomFeatSelections();
    spliceCustomFeatsFromGlobals();
    registeredCustomFeatPack = {
        packageId: null,
        verificationCode: null,
        feats: [],
        magicFeats: [],
        translations: { de: {}, en: {} },
        availableLanguages: [],
        nextId: CUSTOM_FEAT_ID_MIN,
        nextMagicId: CUSTOM_FEAT_ID_MIN,
        rawPayload: null,
        envelope: null
    };
}

function spliceCustomFeatsFromGlobals() {
    if (typeof featList !== "undefined" && Array.isArray(featList)) {
        for (let i = featList.length - 1; i >= 0; i--) {
            if (featList[i] && featList[i].isCustom) featList.splice(i, 1);
        }
    }
    if (typeof magicFeatsList !== "undefined" && Array.isArray(magicFeatsList)) {
        for (let i = magicFeatsList.length - 1; i >= 0; i--) {
            if (magicFeatsList[i] && magicFeatsList[i].isCustom) magicFeatsList.splice(i, 1);
        }
    }
}

function injectRegisteredCustomFeatsIntoGlobals() {
    spliceCustomFeatsFromGlobals();
    const feats = Array.isArray(registeredCustomFeatPack?.feats) ? registeredCustomFeatPack.feats : [];
    const mag = Array.isArray(registeredCustomFeatPack?.magicFeats) ? registeredCustomFeatPack.magicFeats : [];
    if (typeof featList !== "undefined" && Array.isArray(featList)) {
        feats.forEach(f => featList.push(f));
    }
    if (typeof magicFeatsList !== "undefined" && Array.isArray(magicFeatsList)) {
        mag.forEach(m => magicFeatsList.push(m));
    }
}

function registerCustomFeatPackFromPayload(payload, envelope) {
    if (!payload || !Array.isArray(payload.feats)) return false;

    // Vor dem Ersetzen: Step-6-Auswahl custom Talente verwerfen
    clearCreatorCustomFeatSelections();

    if (payload.translations?.de && typeof translations !== "undefined") {
        Object.assign(translations.de, payload.translations.de);
    }
    if (payload.translations?.en && typeof translations !== "undefined") {
        Object.assign(translations.en, payload.translations.en);
    }

    const feats = payload.feats.map(f => {
        const copy = JSON.parse(JSON.stringify(f));
        copy.isCustom = true;
        if (typeof applyCustomContentSource === "function") applyCustomContentSource(copy);
        else if (typeof CUSTOM_CONTENT_SOURCE !== "undefined") {
            copy.source = CUSTOM_CONTENT_SOURCE.slice();
        }
        return copy;
    });
    const magicFeats = (Array.isArray(payload.magicFeats) ? payload.magicFeats : []).map(m =>
        Object.assign({}, m, { isCustom: true })
    );

    registeredCustomFeatPack = {
        packageId: envelope?.packageId || payload.packageId || null,
        verificationCode: envelope?.verificationCode
            || (envelope?.packageId && typeof buildDcVerificationCode === "function"
                && typeof DC_PACKAGE_TYPE !== "undefined"
                ? buildDcVerificationCode(DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK, envelope.packageId)
                : null),
        feats,
        magicFeats,
        translations: {
            de: Object.assign({}, payload.translations?.de || {}),
            en: Object.assign({}, payload.translations?.en || {})
        },
        availableLanguages: Array.isArray(payload.availableLanguages)
            ? payload.availableLanguages.slice()
            : [],
        nextId: Number.isFinite(Number(payload.nextId))
            ? Math.max(CUSTOM_FEAT_ID_MIN, parseInt(payload.nextId, 10))
            : peekNextCustomFeatId({ feats }),
        nextMagicId: Number.isFinite(Number(payload.nextMagicId))
            ? Math.max(CUSTOM_FEAT_ID_MIN, parseInt(payload.nextMagicId, 10))
            : peekNextCustomFeatMagicId({ magicFeats }),
        rawPayload: payload,
        envelope: envelope || null
    };

    injectRegisteredCustomFeatsIntoGlobals();
    persistCustomFeatPackRuntimeToLocalStorage();
    refreshCreatorFeatDropdowns();
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
    return true;
}

function persistCustomFeatPackRuntimeToLocalStorage() {
    const pack = (typeof registeredCustomFeatPack !== "undefined")
        ? registeredCustomFeatPack
        : null;
    if (!pack || !Array.isArray(pack.feats) || !pack.feats.length) return false;

    const base = pack.rawPayload || {};
    const flat = {
        version: 1,
        type: "customFeatPackRuntime",
        packageId: pack.packageId || base.packageId || null,
        availableLanguages: Array.isArray(pack.availableLanguages) && pack.availableLanguages.length
            ? pack.availableLanguages.slice()
            : (Array.isArray(base.availableLanguages) ? base.availableLanguages.slice() : []),
        translations: {
            de: Object.assign({}, base.translations?.de || {}, pack.translations?.de || {}),
            en: Object.assign({}, base.translations?.en || {}, pack.translations?.en || {})
        },
        feats: pack.feats,
        magicFeats: pack.magicFeats,
        nextId: pack.nextId,
        nextMagicId: pack.nextMagicId
    };
    try {
        const wrapped = (typeof wrapCustomFeatPackExport === "function")
            ? wrapCustomFeatPackExport({
                packageId: pack.packageId || flat.packageId,
                packageCreatedAt: pack.envelope?.createdAt || base.packageCreatedAt,
                feats: flat.feats,
                magicFeats: flat.magicFeats
            }, flat)
            : ((typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined")
                ? wrapDcPackage({
                    packageType: DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK,
                    packageId: pack.packageId || flat.packageId || undefined,
                    provides: buildCustomFeatPackProvides({ feats: flat.feats }),
                    dependencies: pack.envelope?.dependencies || base.dependencies || [],
                    payload: flat
                })
                : flat);
        localStorage.setItem(CUSTOM_FEAT_PACK_LS_KEY, JSON.stringify(wrapped));
        return true;
    } catch (e) {
        console.warn("customFeatPackRuntime speichern fehlgeschlagen:", e);
        return false;
    }
}

/**
 * feat_species als Array (Fallback wenn speciesBuilder nicht geladen).
 */
function cffNormalizeFeatSpeciesIds(value) {
    if (typeof normalizeFeatSpeciesIds === "function") return normalizeFeatSpeciesIds(value);
    if (value == null) return [];
    if (Array.isArray(value)) {
        return [...new Set(value.map(v => parseInt(v, 10)).filter(n => Number.isFinite(n) && n > 0))];
    }
    const n = parseInt(value, 10);
    return (Number.isFinite(n) && n > 0) ? [n] : [];
}

/**
 * true = Charakter hat mindestens ein Talent aus dem geladenen Custom-Pack gewählt.
 */
function characterUsesRegisteredCustomFeatPack(character) {
    const packFeats = (typeof registeredCustomFeatPack !== "undefined"
        && Array.isArray(registeredCustomFeatPack?.feats))
        ? registeredCustomFeatPack.feats
        : [];
    if (!packFeats.length) return false;

    const packIds = new Set();
    packFeats.forEach(f => {
        if (f == null || f.ID == null) return;
        packIds.add(f.ID);
        packIds.add(Number(f.ID));
    });
    if (!packIds.size) return false;

    const ids = [];
    (character?.classForm?.feats || []).forEach(entry => {
        const id = (entry && typeof entry === "object") ? entry.feat : entry;
        if (id != null) ids.push(id);
    });
    if (character?.feat_background != null) ids.push(character.feat_background);
    cffNormalizeFeatSpeciesIds(character?.feat_species).forEach(id => ids.push(id));

    return ids.some(id => packIds.has(id) || packIds.has(Number(id)));
}

function getRegisteredCustomFeatPackFeats() {
    const feats = Array.isArray(registeredCustomFeatPack?.feats)
        ? registeredCustomFeatPack.feats
        : [];
    if (!feats.length) return [];
    if (!cffHasUserLoadedFeatPackThisSession()) return [];
    return feats;
}

function refreshCreatorFeatDropdowns() {
    if (typeof document === "undefined") return;
    const please = (typeof translations !== "undefined" && translations[currentLang]?.pleaseSelectLabel)
        || cffT("pleaseSelectLabel", "Bitte wählen");
    const selects = document.querySelectorAll('select[name="feat"], select[name^="feats"]');
    selects.forEach(sel => {
        const prev = sel.value;
        const cats = new Set();
        Array.from(sel.options).forEach(opt => {
            if (!opt.value) return;
            const feat = (typeof featList !== "undefined" ? featList : []).find(f =>
                String(f.ID) === String(opt.value)
            );
            if (feat) cats.add(feat.featCategoryNumber);
        });
        const allowed = Array.from(cats);
        const selectedFeat = (typeof featList !== "undefined" ? featList : []).find(f =>
            String(f.ID) === String(prev)
        );
        // Custom-Talente nach Pack-Wechsel nie wiederherstellen
        const keepPrev = !!(prev && selectedFeat && !selectedFeat.isCustom);
        const selectedLabel = keepPrev ? selectedFeat.translationLabel : null;
        const levelArg = (sel.name && String(sel.name).indexOf("feats") === 0)
            ? 20
            : ((typeof character !== "undefined" && character.level) ? character.level : 1);
        if (typeof createFeatOptions !== "function") return;
        sel.innerHTML = `<option value="">${please}</option>`
            + createFeatOptions(levelArg, allowed.length ? allowed : [1, 2, 3, 4], selectedLabel);
        if (keepPrev && Array.from(sel.options).some(o => String(o.value) === String(prev))) {
            sel.value = prev;
        } else {
            sel.value = "";
        }
    });
    if (typeof setupFeatSelection === "function") {
        try { setupFeatSelection(); } catch (e) { /* ignore */ }
    }
}

/**
 * Stufe aus Feat-Dropdown (name/id featsN / featN).
 */
function cffFeatLevelFromSelect(sel) {
    if (!sel) return null;
    const name = String(sel.name || "");
    const mName = name.match(/^feats?(\d+)/i);
    if (mName) return parseInt(mName[1], 10);
    const id = String(sel.id || "");
    const mId = id.match(/(\d+)\s*$/);
    return mId ? parseInt(mId[1], 10) : null;
}

/**
 * Schritt-6-Auswahl von Custom-Talenten zurücksetzen (nach Pack-Upload/Edit/Neu).
 */
function clearCreatorCustomFeatSelections() {
    if (typeof document === "undefined") return;
    const selects = document.querySelectorAll('select[name="feat"], select[name^="feats"]');
    let cleared = false;
    selects.forEach(sel => {
        if (!sel || !sel.value) return;
        const feat = (typeof featList !== "undefined" ? featList : []).find(f =>
            String(f.ID) === String(sel.value)
        );
        if (!(feat && feat.isCustom)) return;
        const featLevel = cffFeatLevelFromSelect(sel);
        sel.value = "";
        if (sel.parentNode) {
            sel.parentNode.querySelectorAll(".feat-content").forEach(el => el.remove());
        }
        if (typeof character !== "undefined" && character?.featSelections && featLevel != null) {
            delete character.featSelections[featLevel];
        }
        cleared = true;
    });
    if (!cleared) return;
    if (typeof updateLiveAttributes === "function") {
        try { updateLiveAttributes(); } catch (e) { /* ignore */ }
    }
    if (typeof updateSkills === "function") {
        try { updateSkills(); } catch (e) { /* ignore */ }
    }
}

//=======================================================================
// Gewährte Fertigkeiten / RW / Tools (ohne Dropdown)
//=======================================================================

function cffCollectSelectedCustomFeats() {
    const out = [];
    if (typeof document !== "undefined") {
        document.querySelectorAll('select[name="feat"], select[name^="feats"]').forEach(sel => {
            if (!sel.value) return;
            const feat = (typeof featList !== "undefined" ? featList : []).find(f =>
                String(f.ID) === String(sel.value)
            );
            if (feat && feat.isCustom) out.push(feat);
        });
    }
    if (typeof character !== "undefined" && character) {
        const extraIds = [character.feat_background, ...cffNormalizeFeatSpeciesIds(character.feat_species)];
        extraIds.forEach(id => {
            if (id == null) return;
            const feat = (typeof featList !== "undefined" ? featList : []).find(f =>
                String(f.ID) === String(id)
            );
            if (feat && feat.isCustom && !out.some(x => Number(x.ID) === Number(feat.ID))) {
                out.push(feat);
            }
        });
    }
    return out;
}

function appendGrantedCustomFeatSkillIds(skillIds) {
    if (!Array.isArray(skillIds)) return skillIds;
    cffCollectSelectedCustomFeats().forEach(feat => {
        const get = feat.customGrants?.skillsGet;
        if (!Array.isArray(get)) return;
        get.forEach(n => {
            const idStr = String(n);
            if (!skillIds.includes(idStr)) skillIds.push(idStr);
        });
    });
    return skillIds;
}

function appendGrantedCustomFeatSavingThrowIds(attributeIds) {
    if (!Array.isArray(attributeIds)) return attributeIds;
    cffCollectSelectedCustomFeats().forEach(feat => {
        const get = feat.customGrants?.savesGet;
        if (!Array.isArray(get)) return;
        get.forEach(label => {
            const attr = (typeof attributeList !== "undefined" ? attributeList : [])
                .find(a => a.translationLabel === label);
            const idStr = attr ? String(attr.ID) : label;
            if (!attributeIds.includes(idStr)) attributeIds.push(idStr);
        });
    });
    return attributeIds;
}

function appendGrantedCustomFeatToolIds(toolIds) {
    // Legacy-Signatur: nur Tools; Instrumente/Spiele über appendCustomFeatToolProficiencies
    if (!Array.isArray(toolIds)) return toolIds;
    appendCustomFeatToolProficiencies(toolIds, [], []);
    return toolIds;
}

/**
 * Custom-Talent-Werkzeuge (gewährt + gewählt) → classForm.tools / .instruments / .games.
 * Labels aus dem Builder werden auf numerische IDs aufgelöst.
 */
function appendCustomFeatToolProficiencies(selectedTools, selectedInstruments, selectedGames) {
    const tools = Array.isArray(selectedTools) ? selectedTools : [];
    const instruments = Array.isArray(selectedInstruments) ? selectedInstruments : [];
    const games = Array.isArray(selectedGames) ? selectedGames : [];

    const pushResolved = (entry) => {
        if (!entry) return;
        const idStr = String(entry.id);
        if (entry.prefix === "instrument") {
            if (!instruments.includes(idStr)) instruments.push(idStr);
        } else if (entry.prefix === "game") {
            if (!games.includes(idStr)) games.push(idStr);
        } else if (!tools.includes(idStr)) {
            tools.push(idStr);
        }
    };

    cffCollectSelectedCustomFeats().forEach(feat => {
        const get = feat.customGrants?.toolsGet;
        if (!Array.isArray(get)) return;
        get.forEach(lab => pushResolved(cffResolveToolProficiencyEntry(lab)));
    });

    // Gewählte Werkzeuge aus Custom-Talent-Dropdowns (value = tool:ID | instrument:ID | game:ID)
    document.querySelectorAll('select[data-cff-tool-prof="1"]').forEach(select => {
        if (!select || !select.value) return;
        pushResolved(cffResolveToolProficiencyEntry(select.value));
    });

    return { tools, instruments, games };
}

/**
 * Label oder encoded value → { prefix, id } für Speicherung/Anzeige.
 * @param {string|number} value
 * @returns {{ prefix: string, id: number, translationLabel: string }|null}
 */
function cffResolveToolProficiencyEntry(value) {
    if (value == null || value === "") return null;
    const raw = String(value).trim();
    let prefixHint = "";
    let key = raw;
    const enc = raw.match(/^(tool|instrument|game):(.+)$/i);
    if (enc) {
        prefixHint = enc[1].toLowerCase();
        key = enc[2].trim();
    }

    if (/^\d+$/.test(key)) {
        const num = parseInt(key, 10);
        if (prefixHint === "instrument") {
            const inst = (typeof instrumentList !== "undefined" ? instrumentList : [])
                .find(x => Number(x.instrumentCategoryNumber) === num);
            if (inst) {
                return {
                    prefix: "instrument",
                    id: num,
                    translationLabel: inst.translationLabel
                };
            }
        }
        if (prefixHint === "game") {
            const game = (typeof gameList !== "undefined" ? gameList : [])
                .find(x => Number(x.gameCategoryNumber) === num);
            if (game) {
                return {
                    prefix: "game",
                    id: num,
                    translationLabel: game.translationLabel
                };
            }
        }
        const tool = cffGetToolList().find(x => Number(x.ID) === num);
        if (tool) {
            return { prefix: "tool", id: num, translationLabel: tool.translationLabel };
        }
        if (!prefixHint) {
            const inst = (typeof instrumentList !== "undefined" ? instrumentList : [])
                .find(x => Number(x.instrumentCategoryNumber) === num);
            if (inst) {
                return {
                    prefix: "instrument",
                    id: num,
                    translationLabel: inst.translationLabel
                };
            }
            const game = (typeof gameList !== "undefined" ? gameList : [])
                .find(x => Number(x.gameCategoryNumber) === num);
            if (game) {
                return {
                    prefix: "game",
                    id: num,
                    translationLabel: game.translationLabel
                };
            }
        }
        return null;
    }

    const tool = cffGetToolList().find(x => x.translationLabel === key);
    if (tool) {
        return { prefix: "tool", id: Number(tool.ID), translationLabel: tool.translationLabel };
    }
    const inst = (typeof instrumentList !== "undefined" ? instrumentList : [])
        .find(x => x.translationLabel === key);
    if (inst) {
        return {
            prefix: "instrument",
            id: Number(inst.instrumentCategoryNumber),
            translationLabel: inst.translationLabel
        };
    }
    const game = (typeof gameList !== "undefined" ? gameList : [])
        .find(x => x.translationLabel === key);
    if (game) {
        return {
            prefix: "game",
            id: Number(game.gameCategoryNumber),
            translationLabel: game.translationLabel
        };
    }
    return null;
}

/**
 * Dynamische Inhalte für Custom-Talente (Auswahl-Dropdowns / gewährte Listen).
 */
function applyCustomFeatDynamicContent(feat, featLevel, featContentDiv, elements) {
    if (!feat || !feat.isCustom || !featContentDiv) return;
    const g = feat.customGrants || {};
    const els = elements || {};

    const renderGranted = (header, items) => {
        if (!items.length) return;
        featContentDiv.innerHTML += `<p class="granted-proficiency-header">${header}:</p>`;
        featContentDiv.innerHTML += `<ul class="granted-proficiency-list">${items.map(t => `<li>+ ${t}</li>`).join("")}</ul>`;
    };

    if (Array.isArray(g.skillsGet) && g.skillsGet.length) {
        const items = g.skillsGet.map(n => {
            const sk = cffGetSkillList().find(s => Number(s.skillCategoryNumber) === Number(n));
            return sk ? (els[sk.translationLabel] || sk.translationLabel) : String(n);
        });
        renderGranted(els.skillsLabel || cffT("skillsLabel", "Fertigkeiten"), items);
    }
    if (Array.isArray(g.savesGet) && g.savesGet.length) {
        const items = g.savesGet.map(label => els[label] || cffT(label, label));
        renderGranted(els.savingThrowsLabel || cffT("savingThrowsLabel", "Rettungswürfe"), items);
    }
    if (Array.isArray(g.toolsGet) && g.toolsGet.length) {
        const items = g.toolsGet.map(v => cffToolDisplayName(v, els));
        renderGranted(els.toolLabel || cffT("toolLabel", "Werkzeug"), items);
    }

    const base = 200 + (parseInt(featLevel, 10) || 0) * 20;
    if (typeof createSelectionDropdowns === "function") {
        if (g.skillsChoose && g.skillsChoose.amount > 0 && Array.isArray(g.skillsChoose.pool) && g.skillsChoose.pool.length) {
            createSelectionDropdowns(featContentDiv, g.skillsChoose.pool, els.skillsLabel || cffT("skillsLabel"), g.skillsChoose.amount, base, "skill");
        }
        if (g.savesChoose && g.savesChoose.amount > 0 && Array.isArray(g.savesChoose.pool) && g.savesChoose.pool.length) {
            const ids = g.savesChoose.pool.map(label => {
                const attr = (typeof attributeList !== "undefined" ? attributeList : [])
                    .find(a => a.translationLabel === label);
                return attr ? attr.ID : null;
            }).filter(Boolean);
            if (ids.length) {
                createSelectionDropdowns(featContentDiv, ids, els.savingThrowsLabel || cffT("savingThrowsLabel"), g.savesChoose.amount, base + 5, "attribute");
            }
        }
        if (g.toolsChoose && g.toolsChoose.amount > 0 && Array.isArray(g.toolsChoose.pool) && g.toolsChoose.pool.length) {
            cffRenderToolChoiceDropdowns(featContentDiv, g.toolsChoose.pool, g.toolsChoose.amount, els, base + 10);
        }
        if (g.expertiseChoose && g.expertiseChoose.amount > 0) {
            cffRenderExpertiseChoiceDropdowns(
                featContentDiv,
                Array.isArray(g.expertiseChoose.pool) ? g.expertiseChoose.pool : [],
                g.expertiseChoose.amount,
                els,
                featLevel
            );
        }
    }

    if (g.freeChoose && g.freeChoose.amount > 0) {
        cffRenderFreeChoiceDropdowns(featContentDiv, feat, g.freeChoose, els, featLevel);
    }

    const masteryAmount = parseInt(g.weaponMasteryChoose?.amount, 10) || 0;
    if (masteryAmount > 0
        && typeof getCurrentWeaponProficiencies === "function"
        && typeof createWeaponOptions === "function") {
        const combinedLabel = `${els.weaponMasteryLabel || cffT("weaponMasteryLabel", "Waffenmeisterschaft")} - ${els.chooseOptionLabel || cffT("chooseOptionLabel", "wählen")}:`;
        const please = els.pleaseSelectLabel || cffT("pleaseSelectLabel", "Bitte wählen");
        for (let i = 0; i < masteryAmount; i++) {
            const dropdownId = `weaponMastery-feat-${featLevel}-${i}`;
            const wrap = document.createElement("div");
            wrap.className = "feat-dynamic-selection";
            wrap.id = `wrapper-${dropdownId}`;
            wrap.innerHTML = `
                    <label for="${dropdownId}">${combinedLabel}</label>
                    <select id="${dropdownId}" name="${dropdownId}" class="dropdown" data-is-weapon-master="true">
                        <option value="">${please}</option>
                    </select>`;
            featContentDiv.appendChild(wrap);
        }
        const refreshWeaponOptions = () => {
            const currentProf = getCurrentWeaponProficiencies();
            const weaponOptions = createWeaponOptions(currentProf.categories, currentProf.properties);
            for (let i = 0; i < masteryAmount; i++) {
                const selectEl = document.getElementById(`weaponMastery-feat-${featLevel}-${i}`);
                if (!selectEl) continue;
                const previousValue = selectEl.value;
                selectEl.innerHTML = `<option value="">${please}</option>` + weaponOptions;
                if (previousValue && selectEl.querySelector(`option[value="${previousValue}"]`)) {
                    selectEl.value = previousValue;
                }
            }
        };
        setTimeout(refreshWeaponOptions, 0);
        featContentDiv.dataset.refreshFunction = "weaponMaster";
    }
}

/**
 * Expertise-Dropdowns für Custom-Talente (id/name expertiseN → Speicherung in classForm.expertise).
 * Optionen werden über populateExpertiseOptions aus den bereits geübten Fertigkeiten gefüllt.
 */
function cffRenderExpertiseChoiceDropdowns(container, pool, amount, els, featLevel) {
    if (!container || !(amount > 0)) return;
    const e = els || {};
    const please = e.pleaseSelectLabel || cffT("pleaseSelectLabel", "Bitte wählen");
    const header = e.expertiseLabel || cffT("expertiseLabel", "Expertise");
    const choose = e.chooseOptionLabel || cffT("chooseOptionLabel", "wählen");
    const start = 100 + (parseInt(featLevel, 10) || 0) * 10;
    const poolStr = (Array.isArray(pool) ? pool : []).map(String).join(",");
    for (let i = 0; i < amount; i++) {
        const id = `expertise${start + i}`;
        const labelEl = document.createElement("label");
        labelEl.setAttribute("for", id);
        labelEl.textContent = `${header} - ${choose}:`;
        const select = document.createElement("select");
        select.id = id;
        select.name = id;
        select.className = "dropdown";
        if (poolStr) select.setAttribute("data-cff-expertise-pool", poolStr);
        select.innerHTML = `<option value="">${escapeCffHtml(please)}</option>`;
        select.addEventListener("change", () => {
            if (typeof updateExpertiseSelections === "function") updateExpertiseSelections();
            if (typeof updateSkills === "function") updateSkills();
        });
        container.appendChild(labelEl);
        container.appendChild(select);
    }
    if (typeof populateExpertiseOptions === "function") {
        setTimeout(() => populateExpertiseOptions(), 0);
    }
}

/**
 * Freie Optionen-Dropdowns für Custom-Talente (id freeChoiceN → classForm.freeChoices).
 */
function cffRenderFreeChoiceDropdowns(container, feat, freeChoose, els, featLevel) {
    if (!container || !(freeChoose?.amount > 0)) return;
    const e = els || {};
    const options = (Array.isArray(feat?.freeChoiceOptions) && feat.freeChoiceOptions.length)
        ? feat.freeChoiceOptions
        : (Array.isArray(freeChoose.options) ? freeChoose.options : []);
    if (!options.length) return;

    const please = e.pleaseSelectLabel || cffT("pleaseSelectLabel", "Bitte wählen");
    const featName = (feat?.translationLabel && e[feat.translationLabel])
        ? e[feat.translationLabel]
        : (e.ccLfCatFreeLabel || cffT("ccLfCatFreeLabel", "Frei"));
    const choose = e.chooseOptionLabel || cffT("chooseOptionLabel", "wählen");
    const labelText = `${featName} - ${choose}:`;
    // Hoher Index-Bereich, damit Klassen-freeChoiceN und andere Talente nicht kollidieren
    const start = 5000 + (parseInt(featLevel, 10) || 0) * 40 + ((parseInt(feat?.ID, 10) || 0) % 900);

    const optionsHtml = options.map(opt => {
        const value = String(opt.value != null ? opt.value : "");
        const labelKey = opt.translationLabel || "";
        let label = (labelKey && e[labelKey]) ? e[labelKey] : "";
        if (!label && opt.names && typeof opt.names === "object") {
            const lang = (typeof currentLang !== "undefined" ? currentLang : "de");
            label = opt.names[lang] || opt.names.de || opt.names.en || "";
        }
        if (!label) label = labelKey || value;
        return `<option value="${escapeCffHtml(value)}">${escapeCffHtml(label)}</option>`;
    }).join("");

    for (let i = 0; i < freeChoose.amount; i++) {
        const id = `freeChoice${start + i}`;
        if (document.getElementById(id)) continue;
        const wrap = document.createElement("div");
        wrap.className = "feat-dynamic-selection";
        wrap.innerHTML = `
            <label for="${id}">${escapeCffHtml(labelText)}</label>
            <select id="${id}" name="${id}" class="dropdown">
                <option value="">${escapeCffHtml(please)}</option>
                ${optionsHtml}
            </select>`;
        container.appendChild(wrap);
    }
}

function cffToolDisplayName(value, els) {
    const e = els || {};
    if (value == null) return "";
    if (typeof value === "number" || /^\d+$/.test(String(value))) {
        const t = cffGetToolList().find(x => Number(x.ID) === Number(value));
        if (t) return e[t.translationLabel] || cffT(t.translationLabel, t.translationLabel);
    }
    const lab = String(value);
    return e[lab] || cffT(lab, lab);
}

function cffRenderToolChoiceDropdowns(container, labels, amount, els, startIndex) {
    if (!container || !(amount > 0)) return;
    const e = els || {};
    const please = e.pleaseSelectLabel || cffT("pleaseSelectLabel", "Bitte wählen");
    const header = e.toolLabel || cffT("toolLabel", "Werkzeug");
    const choose = e.chooseOptionLabel || cffT("chooseOptionLabel", "wählen");
    const opts = (labels || []).map(lab => {
        const resolved = cffResolveToolProficiencyEntry(lab);
        if (!resolved) return "";
        const val = `${resolved.prefix}:${resolved.id}`;
        return `<option value="${escapeCffHtml(val)}">${escapeCffHtml(cffToolDisplayName(lab, e))}</option>`;
    }).filter(Boolean).join("");
    if (!opts) return;

    for (let i = 0; i < amount; i++) {
        const id = `cffToolProf_${startIndex}_${i}`;
        const labelEl = document.createElement("label");
        labelEl.setAttribute("for", id);
        labelEl.textContent = `${header} - ${choose}:`;
        const select = document.createElement("select");
        select.id = id;
        select.name = id;
        select.className = "dropdown";
        select.setAttribute("data-cff-tool-prof", "1");
        select.innerHTML = `<option value="">${escapeCffHtml(please)}</option>${opts}`;
        container.appendChild(labelEl);
        container.appendChild(select);
    }
}

//=======================================================================
// Translations (UI-Labels)
//=======================================================================

function applyCffTranslations() {
    const t = (key, fallback) =>
        (typeof tCC === "function" && tCC(key)) || fallback || key;
    const set = (id, key, fallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = t(key, fallback);
    };
    set("customFeatModalTitleLabel", "cffModalTitleLabel", "Talentbibliothek");
    set("customFeatCreateNewBtn", "cffCreateNewLabel", "Talente erstellen");
    set("customFeatUploadBtn", "cffUploadLabel", "Talente hochladen (.json)");
    set("customFeatEditorTitleLabel", "cffEditorTitleLabel", "Talentbibliothek");
    set("customFeatTabOverviewBtn", "cspTabOverviewLabel", "Übersicht");
    set("customFeatTabDetailsBtn", "cspTabDetailsLabel", "Details");
    set("customFeatFinishBtn", "cspSavePackLabel", "Speichern");

    const addBtn = document.getElementById("addCustomFeatBtn");
    if (addBtn) {
        const label = t("addCustomFeatLabel", "Eigene Talente erstellen");
        addBtn.title = label;
        addBtn.setAttribute("aria-label", label);
    }
    if (customFeatEditorOpen && customFeatActiveTab === 1
        && document.getElementById("customFeatTab1Content")) {
        renderCustomFeatTab1();
    }
}

function clearCustomFeatPackRuntimeCompletely() {
    clearRegisteredCustomFeatPack();
    customFeatEditorState = null;
    customFeatImportSnapshot = null;
    customFeatEditorOpen = false;
    customFeatEditingId = null;
    customFeatDraft = null;
    customFeatActiveTab = 1;
    try {
        localStorage.removeItem(CUSTOM_FEAT_PACK_LS_KEY);
    } catch (e) {
        console.warn("customFeatPackRuntime löschen fehlgeschlagen:", e);
    }
    const overlay = document.getElementById("customFeatOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
    return true;
}

function resetCustomFeatPackRuntimeOnCreatorLoad() {
    // --- LEVEL-UP: Runtime aus Snapshot behalten ---
    if (typeof shouldSkipCreatorRuntimeResetForLevelUp === "function"
        && shouldSkipCreatorRuntimeResetForLevelUp()) {
        return;
    }
    clearCustomFeatPackRuntimeCompletely();
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        try {
            resetCustomFeatPackRuntimeOnCreatorLoad();
        } catch (e) {
            console.warn(e);
        }
        if (typeof applyCffTranslations === "function") applyCffTranslations();
    });
}
