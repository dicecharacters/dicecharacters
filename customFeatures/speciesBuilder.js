//=======================================================================
// Custom Species Builder (customFeatures/speciesBuilder.js)
//=======================================================================
// Eigenständiger Völker-Ersteller (Schritt 3): Chooser, 3 Reiter,
// Compile/Export, Runtime-Registrierung. Ein aktives Custom-Volk
// pro Session (wie Custom-Hintergrund).
//
// Flags / Visibility: customFeatures/shared.js (zuerst laden).
// Shared Utilities:   tCC, renderLangAvailabilityRowHtml (classBuilder.js)
// Bogen-Runtime:      customFeatures/customFeaturesSheet.js
// Pakete:             dcPackage.js (Projektroot)
//=======================================================================

//=======================================================================
// CUSTOM_SPECIES_CONFIG – zentrale Schnell-Einstellungen
//=======================================================================
const CUSTOM_SPECIES_CONFIG = Object.freeze({
    /** Feste ID des einen aktiven Custom-Volks (PHB: 1…10) */
    speciesId: 1000,
    nameMax: 30,
    descMax: 500,
    featureRowCount: 6,
    ancestryMin: 2,
    ancestryMax: 10,
    ancestryStart: 2,
    ancestryNameMax: 20,
    ancestryDescMax: 100,
    lineageMin: 2,
    /** Max. Anzahl Erblinien-Äste (Reiter 3) */
    lineageMax: 4,
    lineageStart: 2,
    lineageNameMax: 30,
    lineageDescMax: 300,
    traitNameMax: 30,
    traitShortMax: 200,
    traitDescMax: 500,
    defaultSpeedFT: 30,
    lineageSpellRowCount: 3,
    lineageSpellLevelDefaults: Object.freeze([1, 3, 5]),
    /** Erblinie: Get-Zaubertrick – Dropdowns pro Grad in der Maske */
    lineageSpellPickMax: 1,
    /** Erblinie: Vorbereitete Zauber – Dropdowns pro Zaubergrad in der Maske */
    lineagePreparedSpellDropdownsPerGrade: 2,
    /** Erblinie: Vorbereitete Zauber – max. Auswahl gesamt über alle Grade */
    lineagePreparedSpellPickMax: 2,
    /**
     * Pro Builder-Session nur einmal wählbare Kategorien (Einfach + Optionen).
     * Zauberwissen: siehe CSPC_SPELLCRAFT_ONCE.
     */
    categoriesOncePerSession: Object.freeze([
        "skills",
        "originFeats"
    ]),
    originFeatCategoryNumber: 1,
    predefinedTraitLabels: Object.freeze([
        "darkvision1Label",
        "darkvision2Label",
        "tranceLabel",
        "powerfulBuildLabel",
        "naturallyStealthyLabel",
        "relentlessEnduranceLabel",
        "stonecunningLabel"
    ]),
    lsKey: "customSpeciesRuntime",
    filenamePrefix: "custom_species"
});

const CSPC_CONFIG = CUSTOM_SPECIES_CONFIG;
const CUSTOM_SPECIES_ID = CUSTOM_SPECIES_CONFIG.speciesId;
const CUSTOM_SPECIES_LS_KEY = CUSTOM_SPECIES_CONFIG.lsKey;

const CSPC_FEATURE_TYPES = Object.freeze(["simple", "options", "spellcraft"]);
const CSPC_CATEGORIES_BY_TYPE = Object.freeze({
    simple: Object.freeze(["free", "skills", "originFeats", "preDefined"]),
    options: Object.freeze(["free", "skills", "originFeats"]),
    spellcraft: Object.freeze(["getCantrip", "chooseCantrip", "getPreparedSpell", "choosePreparedSpell"])
});
const CSPC_SPELLCRAFT_ONCE = Object.freeze([
    "getCantrip", "chooseCantrip", "getPreparedSpell", "choosePreparedSpell"
]);

//=======================================================================
// State
//=======================================================================

let customSpeciesEditorOpen = false;
let customSpeciesActiveTab = 1;
let customSpeciesEditorState = null;
let customSpeciesImportSnapshot = null;
let cspcLfFloatContext = null;

let registeredCustomSpecies = {
    translationLabel: null,
    id: null,
    translationKeys: [],
    compiledSpeciesListEntry: null,
    compiledSpeciesTraitList: [],
    compiledAncestryList: [],
    compiledLineageList: [],
    compiledMagicFeatures: [],
    packageId: null,
    verificationCode: null,
    rawPayload: null,
    envelope: null
};

function tCspc(key, fallback) {
    if (typeof tCC === "function") {
        const v = tCC(key, fallback || "");
        if (v && v !== key) return v;
    }
    const lang = typeof currentLang !== "undefined" ? currentLang : "de";
    const bag = (typeof translations !== "undefined" && translations[lang]) || {};
    return bag[key] || fallback || key;
}

function escapeCspcHtml(str) {
    if (typeof escapeLfHtml === "function") return escapeLfHtml(str);
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function cspcActiveLang() {
    return (typeof getActiveUiLang === "function")
        ? getActiveUiLang()
        : (typeof currentLang !== "undefined" ? currentLang : "de");
}

function cspcIsDeUi() {
    return cspcActiveLang() === "de";
}

function cspcFtToCm(ft) {
    return Math.round(Number(ft) * 30.48);
}

function cspcCmToFt(cm) {
    return Number(cm) / 30.48;
}

function cspcFtToDisplaySpeed(ft) {
    return cspcIsDeUi() ? Math.round(Number(ft) * 0.3048) : Number(ft);
}

function cspcDisplaySpeedToFt(val) {
    return cspcIsDeUi() ? Number(val) / 0.3048 : Number(val);
}

function cspcRoundFt(ft) {
    const n = Number(ft);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 10) / 10;
}

/** Lebensspanne: ganze Jahre, 1–9999. */
function cspcClampAgeYears(raw) {
    if (raw === "" || raw == null) return "";
    const n = parseInt(String(raw).replace(",", "."), 10);
    if (!Number.isFinite(n)) return "";
    return Math.min(9999, Math.max(1, n));
}

/** Bewegungsanzeige (m/ft): 0–999, Dezimal erlaubt. */
function cspcClampDisplaySpeed(raw) {
    if (raw === "" || raw == null) return "";
    const n = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(n)) return "";
    return Math.min(999, Math.max(0, n));
}

function createEmptyCspcFeatureRow() {
    return {
        kind: "",
        category: "",
        level: 1,
        amount: 0,
        optionsConfig: {},
        names: { de: "", en: "" },
        shortDescriptions: { de: "", en: "" },
        descriptions: { de: "", en: "" }
    };
}

function createEmptyCspcAncestryBranch() {
    return {
        names: { de: "", en: "" },
        descriptions: { de: "", en: "" }
    };
}

function createEmptyCspcLineageBranch() {
    const defaults = CSPC_CONFIG.lineageSpellLevelDefaults || [1, 3, 5];
    const spellRows = [];
    for (let i = 0; i < (CSPC_CONFIG.lineageSpellRowCount || 3); i++) {
        spellRows.push({
            level: defaults[i] != null ? defaults[i] : (i === 0 ? 1 : 0),
            category: "",
            spellLabel: "",
            optionsConfig: {}
        });
    }
    return {
        names: { de: "", en: "" },
        descriptions: { de: "", en: "" },
        sheetDescriptions: { de: "", en: "" },
        spellRows
    };
}

function createEmptyCustomSpeciesState() {
    const active = cspcActiveLang();
    const features = [];
    for (let i = 0; i < CSPC_CONFIG.featureRowCount; i++) {
        features.push(createEmptyCspcFeatureRow());
    }
    const ancestries = [];
    for (let i = 0; i < CSPC_CONFIG.ancestryStart; i++) {
        ancestries.push(createEmptyCspcAncestryBranch());
    }
    const lineages = [];
    for (let i = 0; i < CSPC_CONFIG.lineageStart; i++) {
        lineages.push(createEmptyCspcLineageBranch());
    }
    return {
        packageId: null,
        packageCreatedAt: null,
        slug: null,
        availableLanguages: [active],
        names: { de: "", en: "" },
        descriptions: { de: "", en: "" },
        ancestryGroupNames: { de: "", en: "" },
        speciesAge_years: "",
        size: ["mediumLabel"],
        sizeRange_ft: [4.0, 8.0],
        speedFT: CSPC_CONFIG.defaultSpeedFT,
        originBranch: "none",
        features,
        ancestries,
        lineages
    };
}

function cspcNormalizeFeatureRow(row) {
    const base = createEmptyCspcFeatureRow();
    if (!row || typeof row !== "object") return base;
    base.kind = row.kind || "";
    base.category = row.category || "";
    base.level = Math.max(1, Math.min(20, parseInt(row.level, 10) || 1));
    base.amount = parseInt(row.amount, 10) || 0;
    base.optionsConfig = (row.optionsConfig && typeof row.optionsConfig === "object")
        ? Object.assign({}, row.optionsConfig)
        : {};
    if (base.optionsConfig.predefinedLabel && !base.optionsConfig.preDefinedLabel) {
        base.optionsConfig.preDefinedLabel = base.optionsConfig.predefinedLabel;
    }
    base.names = { de: row.names?.de || "", en: row.names?.en || "" };
    base.shortDescriptions = {
        de: row.shortDescriptions?.de || "",
        en: row.shortDescriptions?.en || ""
    };
    base.descriptions = {
        de: row.descriptions?.de || "",
        en: row.descriptions?.en || ""
    };
    return base;
}

function cspcSpellLabelFromConfig(cfg, fallback) {
    if (fallback) return fallback;
    if (!cfg || typeof cfg !== "object") return "";
    if (cfg.spellLabel) return cfg.spellLabel;
    if (Array.isArray(cfg.selectedSpells)) {
        const hit = cfg.selectedSpells.find(Boolean);
        if (hit) return hit;
    }
    if (cfg.selectedByLevel && typeof cfg.selectedByLevel === "object") {
        const keys = Object.keys(cfg.selectedByLevel);
        for (let i = 0; i < keys.length; i++) {
            const arr = cfg.selectedByLevel[keys[i]];
            if (!Array.isArray(arr)) continue;
            const hit = arr.find(Boolean);
            if (hit) return hit;
        }
    }
    return "";
}

function cspcInferSpellCategory(spellLabel) {
    if (!spellLabel) return "";
    const list = (typeof getEffectiveSpellList === "function")
        ? getEffectiveSpellList()
        : ((typeof spellList !== "undefined" && Array.isArray(spellList)) ? spellList : []);
    const sp = list.find(s => s.translationLabel === spellLabel);
    if (!sp) return "getPreparedSpell";
    return sp.spellLevel === "cantripLabel" ? "getCantrip" : "getPreparedSpell";
}

function cspcNormalizeSpellRow(row, index) {
    const defaults = CSPC_CONFIG.lineageSpellLevelDefaults || [1, 3, 5];
    const empty = {
        level: defaults[index] != null ? defaults[index] : (index === 0 ? 1 : 0),
        category: "",
        spellLabel: "",
        optionsConfig: {}
    };
    if (!row || typeof row !== "object") return empty;
    const optionsConfig = (row.optionsConfig && typeof row.optionsConfig === "object")
        ? Object.assign({}, row.optionsConfig)
        : {};
    const category = row.category || "";
    const labels = cspcLineageSpellLabelsFromConfig(optionsConfig, category);
    const spellLabel = labels[0] || row.spellLabel || cspcSpellLabelFromConfig(optionsConfig, "");
    if (labels.length) {
        optionsConfig.selectedSpells = labels.slice();
        optionsConfig.spellLabel = spellLabel;
    } else if (spellLabel) {
        optionsConfig.spellLabel = spellLabel;
        if (!Array.isArray(optionsConfig.selectedSpells) || !optionsConfig.selectedSpells.some(Boolean)) {
            optionsConfig.selectedSpells = [spellLabel];
        }
    }
    let categoryOut = category;
    if (!categoryOut && spellLabel) categoryOut = cspcInferSpellCategory(spellLabel);
    return {
        level: row.level != null ? row.level : empty.level,
        category: categoryOut,
        spellLabel,
        optionsConfig
    };
}

function cspcPredefinedLabel(row) {
    const cfg = row?.optionsConfig || {};
    return cfg.preDefinedLabel || cfg.predefinedLabel || "";
}

function cspcPairFromKey(key) {
    if (!key || typeof translations === "undefined") return { de: "", en: "" };
    return {
        de: (translations.de && translations.de[key]) || "",
        en: (translations.en && translations.en[key]) || ""
    };
}

function cspcIsSpeciesFeatureSlot(slot) {
    return !!(customSpeciesEditorOpen && String(slot?.slotId || "").startsWith("cspc-row-"));
}

function cspcResolveFeatLabelText(featLabel, lang) {
    if (!featLabel) return "…";
    if (typeof resolveLfTranslationLabelText === "function") {
        return resolveLfTranslationLabelText(featLabel, lang) || String(featLabel);
    }
    return cspcPairFromKey(featLabel)[lang] || String(featLabel);
}

function formatCspcOriginFeatSimpleShortDesc(featLabel, lang) {
    const key = "cspcOriginFeatSimpleShortD";
    let tpl = tCspc(key, lang === "en"
        ? "You have acquired the {feat} feat."
        : "Du hast dir das Talent {feat} angeeignet.");
    if (typeof translations !== "undefined") {
        tpl = (translations[lang] && translations[lang][key])
            || (translations.de && translations.de[key])
            || tpl;
    }
    return String(tpl).replace(/\{feat\}/g, cspcResolveFeatLabelText(featLabel, lang));
}

function getCspcOriginFeatSimpleShortDescPair(slot) {
    if (!slot || slot.payload?.category !== "originFeats" || slot.payload?.featureType !== "simple") {
        return null;
    }
    const featLabel = (slot.payload.optionsConfig?.selectedFeats || [])[0] || "";
    if (!featLabel) return null;
    return {
        de: formatCspcOriginFeatSimpleShortDesc(featLabel, "de"),
        en: formatCspcOriginFeatSimpleShortDesc(featLabel, "en")
    };
}

function cspcCompiledNamePair(row, index) {
    if (row.category === "originFeats") {
        return cspcPairFromKey("cbgOriginFeatLabel");
    }
    if ((row.names?.de || row.names?.en || "").trim()) return row.names;
    const slot = cspcRowToLfSlot(row, index);
    const key = (typeof getLfFixedDesignationKey === "function") ? getLfFixedDesignationKey(slot) : null;
    return key ? cspcPairFromKey(key) : (row.names || { de: "", en: "" });
}

function cspcCompiledShortPair(row, index) {
    if (row.category === "originFeats") {
        const slot = cspcRowToLfSlot(row, index);
        if (row.kind === "simple") {
            const dynamic = getCspcOriginFeatSimpleShortDescPair(slot);
            if (dynamic) return dynamic;
            return cspcPairFromKey("cspcOriginFeatSimpleShortD");
        }
        if (row.kind === "options") {
            return cspcPairFromKey("cspcOriginFeatOptionsShortD");
        }
    }
    if ((row.shortDescriptions?.de || row.shortDescriptions?.en || "").trim()) {
        return row.shortDescriptions;
    }
    const slot = cspcRowToLfSlot(row, index);
    // Zauberkunst get*: Kurztext mit konkreten Zaubernamen (wie Klassenbauer)
    if (row.kind === "spellcraft" && row.category === "getCantrip"
        && typeof getLfSpellcraftGetCantripShortDescPair === "function") {
        const dynamic = getLfSpellcraftGetCantripShortDescPair(slot);
        if (dynamic) return dynamic;
    }
    if (row.kind === "spellcraft" && row.category === "getPreparedSpell") {
        if (typeof getLfSpellcraftGetPreparedSpellShortDescPair === "function") {
            const dynamic = getLfSpellcraftGetPreparedSpellShortDescPair(slot);
            if (dynamic) return dynamic;
        }
        const labels = cspcLineageSpellLabelsFromConfig(row.optionsConfig || {}, "getPreparedSpell");
        if (labels.length && typeof formatLfGetPreparedSpellShortDesc === "function") {
            return {
                de: formatLfGetPreparedSpellShortDesc(labels, "de"),
                en: formatLfGetPreparedSpellShortDesc(labels, "en")
            };
        }
    }
    if (row.kind === "simple" && row.category === "skills"
        && typeof getLfSimpleSkillsShortDescPair === "function") {
        const dynamic = getLfSimpleSkillsShortDescPair(slot);
        if (dynamic) return dynamic;
    }
    const keys = (typeof getLfFixedDescKeys === "function") ? getLfFixedDescKeys(slot) : null;
    return keys?.shortKey ? cspcPairFromKey(keys.shortKey) : (row.shortDescriptions || { de: "", en: "" });
}

function cspcBindCharCounter(inputId, countId, max) {
    const el = document.getElementById(inputId);
    if (!el || typeof updateCustomClassCharCounter !== "function") return;
    el.oninput = () => updateCustomClassCharCounter(inputId, countId, max);
    updateCustomClassCharCounter(inputId, countId, max);
}

//=======================================================================
// Modal
//=======================================================================

function openCustomSpeciesChooser() {
    if (typeof isCustomFeatureEnabled === "function"
        && !isCustomFeatureEnabled("customSpeciesBuilder")) {
        return;
    }
    const overlay = document.getElementById("customSpeciesOverlay");
    if (!overlay) return;
    const chooser = document.getElementById("customSpeciesChooserView");
    const editor = document.getElementById("customSpeciesEditorView");
    if (chooser) chooser.style.display = "";
    if (editor) editor.style.display = "none";
    customSpeciesEditorOpen = false;
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode(overlay, true);
    }
    overlay.style.setProperty("display", "flex", "important");
    applyCspcTranslations();
}

function closeCustomSpeciesModal() {
    closeCspcLfFloat({ rerender: false });
    const overlay = document.getElementById("customSpeciesOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    customSpeciesEditorOpen = false;
}

function discardCustomSpeciesEditor() {
    customSpeciesEditorState = null;
    customSpeciesImportSnapshot = null;
    customSpeciesEditorOpen = false;
    customSpeciesActiveTab = 1;
    ["customSpeciesTab1Content", "customSpeciesTab2Content", "customSpeciesTab3Content"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = "";
        });
    closeCustomSpeciesModal();
}

function requestCloseCustomSpeciesModal() {
    if (customSpeciesEditorOpen && customSpeciesEditorState) {
        const msg = tCspc("cspcCloseConfirmLabel", "Ungespeicherte Änderungen am Volk verwerfen?");
        if (!confirm(msg)) return;
        discardCustomSpeciesEditor();
        return;
    }
    closeCustomSpeciesModal();
}

function startCustomSpeciesCreate() {
    customSpeciesEditorState = createEmptyCustomSpeciesState();
    customSpeciesImportSnapshot = null;
    customSpeciesEditorOpen = true;
    customSpeciesActiveTab = 1;
    const chooser = document.getElementById("customSpeciesChooserView");
    const editor = document.getElementById("customSpeciesEditorView");
    if (chooser) chooser.style.display = "none";
    if (editor) editor.style.display = "";
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode("customSpeciesOverlay", false);
    }
    renderCustomSpeciesEditor();
    applyCspcTranslations();
}

function triggerCustomSpeciesUpload() {
    const input = document.getElementById("customSpeciesFileInput");
    if (input) {
        input.value = "";
        input.click();
    }
}

function handleCustomSpeciesFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const finish = () => {
        if (event.target) event.target.value = "";
    };
    if (typeof readAndValidateDcPackageFile !== "function") {
        alert(tCspc("cspcImportInvalidAlertLabel", "Ungültige Datei."));
        finish();
        return;
    }
    readAndValidateDcPackageFile(file, {
        expectedType: (typeof DC_PACKAGE_TYPE !== "undefined")
            ? DC_PACKAGE_TYPE.CUSTOM_SPECIES
            : "customSpecies"
    }).then(result => {
        try {
            if (!result.ok) {
                alert(result.message || tCspc("cspcImportInvalidAlertLabel", "Import fehlgeschlagen."));
                return;
            }

            const applySpeciesImport = (payload, envelope) => {
                importCustomSpeciesPayload(payload, envelope);
                if (typeof markDcPackageUserLoaded === "function") {
                    markDcPackageUserLoaded(
                        (typeof DC_PACKAGE_TYPE !== "undefined")
                            ? DC_PACKAGE_TYPE.CUSTOM_SPECIES
                            : "customSpecies"
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
                    alert(match.message || tCspc("cspcImportInvalidAlertLabel", "Import fehlgeschlagen."));
                    if (typeof promptNextDcPackageDependencyUpload === "function") {
                        promptNextDcPackageDependencyUpload();
                    }
                    return;
                }
                const wrapped = (result.envelope && result.payload)
                    ? { dc: result.envelope, payload: result.payload }
                    : result.payload;
                if (typeof registerCustomSpeciesInRuntime === "function") {
                    registerCustomSpeciesInRuntime(wrapped);
                }
                if (typeof markDcPackageUserLoaded === "function") {
                    markDcPackageUserLoaded(
                        (typeof DC_PACKAGE_TYPE !== "undefined")
                            ? DC_PACKAGE_TYPE.CUSTOM_SPECIES
                            : "customSpecies"
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
                    onApply: applySpeciesImport,
                    onCancel: () => {}
                });
                return;
            }

            applySpeciesImport(result.payload, result.envelope);
        } catch (err) {
            console.error(err);
            alert(tCspc("cspcImportInvalidAlertLabel", "Import fehlgeschlagen."));
        } finally {
            finish();
        }
    });
}

function importCustomSpeciesPayload(payload, envelope) {
    if (!payload
        || (payload.type !== "customSpecies" && payload.type !== "customSpeciesRuntime")
        || !payload.compiledSpeciesListEntry) {
        alert(tCspc("cspcImportInvalidAlertLabel", "Kein gültiges Custom-Volk-Paket."));
        return;
    }
    const snap = payload.editorState;
    const state = createEmptyCustomSpeciesState();
    state.slug = payload.slug || payload.compiledSpeciesListEntry.translationLabel || null;
    state.packageId = envelope?.packageId || payload.packageId || null;
    state.packageCreatedAt = envelope?.createdAt || null;
    if (Array.isArray(payload.availableLanguages) && payload.availableLanguages.length) {
        state.availableLanguages = payload.availableLanguages.slice();
    }
    if (snap) {
        state.names = { de: snap.names?.de || "", en: snap.names?.en || "" };
        state.descriptions = { de: snap.descriptions?.de || "", en: snap.descriptions?.en || "" };
        state.ancestryGroupNames = {
            de: snap.ancestryGroupNames?.de || "",
            en: snap.ancestryGroupNames?.en || ""
        };
        if (!(state.ancestryGroupNames.de || state.ancestryGroupNames.en)
            && Array.isArray(payload.compiledSpeciesTraitList)) {
            const bridge = payload.compiledSpeciesTraitList.find(t => t.characterSheet === "0:ANC");
            const key = bridge?.speciesTraitLabel;
            if (key && payload.translations) {
                state.ancestryGroupNames.de = payload.translations.de?.[key] || "";
                state.ancestryGroupNames.en = payload.translations.en?.[key] || "";
            }
        }
        state.speciesAge_years = snap.speciesAge_years != null ? snap.speciesAge_years : "";
        state.size = ensureCspcContiguousSizeCategories(
            Array.isArray(snap.size) ? snap.size.slice() : ["mediumLabel"]
        );
        state.sizeRange_ft = Array.isArray(snap.sizeRange_ft) ? snap.sizeRange_ft.slice() : [4, 8];
        state.speedFT = Number(snap.speedFT) || CSPC_CONFIG.defaultSpeedFT;
        state.originBranch = snap.originBranch || "none";
        if (Array.isArray(snap.features)) {
            state.features = [];
            for (let i = 0; i < CSPC_CONFIG.featureRowCount; i++) {
                state.features.push(cspcNormalizeFeatureRow(snap.features[i]));
            }
        }
        if (Array.isArray(snap.ancestries) && snap.ancestries.length) {
            state.ancestries = snap.ancestries.map(b => ({
                names: { de: b.names?.de || "", en: b.names?.en || "" },
                descriptions: { de: b.descriptions?.de || "", en: b.descriptions?.en || "" }
            }));
        }
        if (Array.isArray(snap.lineages) && snap.lineages.length) {
            state.lineages = snap.lineages.map(b => {
                const empty = createEmptyCspcLineageBranch();
                empty.names = { de: b.names?.de || "", en: b.names?.en || "" };
                empty.descriptions = { de: b.descriptions?.de || "", en: b.descriptions?.en || "" };
                empty.sheetDescriptions = {
                    de: b.sheetDescriptions?.de || "",
                    en: b.sheetDescriptions?.en || ""
                };
                if (Array.isArray(b.spellRows)) {
                    empty.spellRows = empty.spellRows.map((row, i) =>
                        cspcNormalizeSpellRow(Object.assign({}, row, b.spellRows[i] || {}), i)
                    );
                }
                return empty;
            });
        }
    }
    customSpeciesEditorState = state;
    const previewPayload = buildCustomSpeciesExportPayload(state);
    customSpeciesImportSnapshot = getCustomSpeciesExportSnapshotString(previewPayload);
    customSpeciesEditorOpen = true;
    customSpeciesActiveTab = 1;
    const chooser = document.getElementById("customSpeciesChooserView");
    const editor = document.getElementById("customSpeciesEditorView");
    if (chooser) chooser.style.display = "none";
    if (editor) editor.style.display = "";
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode("customSpeciesOverlay", false);
    }
    const overlay = document.getElementById("customSpeciesOverlay");
    if (overlay) overlay.style.setProperty("display", "flex", "important");
    renderCustomSpeciesEditor();
    applyCspcTranslations();
}

//=======================================================================
// Tabs / Origin-Sperre
//=======================================================================

function cspcOriginUnlocksTab(tab) {
    const origin = customSpeciesEditorState?.originBranch || "none";
    if (tab === 1) return true;
    if (tab === 2) return origin === "ancestry";
    if (tab === 3) return origin === "lineage";
    return false;
}

function updateCustomSpeciesTabLocks() {
    const setLock = (btnId, unlocked) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = !unlocked;
        btn.classList.toggle("custom-class-tab--locked", !unlocked);
    };
    setLock("customSpeciesTabAncestryBtn", cspcOriginUnlocksTab(2));
    setLock("customSpeciesTabLineageBtn", cspcOriginUnlocksTab(3));
    document.querySelectorAll("#customSpeciesEditorView .custom-class-tab").forEach(btn => {
        const tab = parseInt(btn.getAttribute("data-tab"), 10);
        btn.classList.toggle("active", tab === customSpeciesActiveTab);
    });
    document.querySelectorAll("#customSpeciesEditorView .custom-class-tab-panel").forEach((panel, i) => {
        panel.classList.toggle("active", (i + 1) === customSpeciesActiveTab);
    });
}

function switchCustomSpeciesTab(tab) {
    const next = parseInt(tab, 10) || 1;
    if (!cspcOriginUnlocksTab(next)) return;
    syncCspcFieldsFromDom();
    customSpeciesActiveTab = next;
    renderCustomSpeciesEditor();
}

function onCspcOriginBranchChange(value) {
    const state = customSpeciesEditorState;
    if (!state) return;
    const next = value || "none";
    const prev = state.originBranch || "none";
    if (next === prev) return;
    if ((prev === "ancestry" && next !== "ancestry" && cspcHasNamedAncestries(state))
        || (prev === "lineage" && next !== "lineage" && cspcHasNamedLineages(state))) {
        const ok = confirm(tCspc("cspcOriginSwitchConfirmLabel",
            "Der andere Herkunftszweig wird geleert. Fortfahren?"));
        if (!ok) {
            renderCustomSpeciesTab1();
            return;
        }
    }
    syncCspcFieldsFromDom();
    if (next !== "ancestry") {
        state.ancestries = [];
        for (let i = 0; i < CSPC_CONFIG.ancestryStart; i++) {
            state.ancestries.push(createEmptyCspcAncestryBranch());
        }
    }
    if (next !== "lineage") {
        state.lineages = [];
        for (let i = 0; i < CSPC_CONFIG.lineageStart; i++) {
            state.lineages.push(createEmptyCspcLineageBranch());
        }
    }
    state.originBranch = next;
    if ((customSpeciesActiveTab === 2 && next !== "ancestry")
        || (customSpeciesActiveTab === 3 && next !== "lineage")) {
        customSpeciesActiveTab = 1;
    }
    renderCustomSpeciesEditor();
}

function cspcHasNamedAncestries(state) {
    return (state?.ancestries || []).some(b =>
        (b.names?.de || "").trim() || (b.names?.en || "").trim()
    );
}

function cspcHasNamedLineages(state) {
    return (state?.lineages || []).some(b =>
        (b.names?.de || "").trim() || (b.names?.en || "").trim()
    );
}

//=======================================================================
// Render
//=======================================================================

function renderCustomSpeciesEditor() {
    if (!customSpeciesEditorState) return;
    if (typeof ensureAvailableLanguages === "function") {
        ensureAvailableLanguages(customSpeciesEditorState);
    }
    renderCustomSpeciesTab1();
    renderCustomSpeciesTab2();
    renderCustomSpeciesTab3();
    updateCustomSpeciesTabLocks();
}

function onCspcLangAvailabilityChange() {
    const state = customSpeciesEditorState;
    if (!state) return;
    syncCspcFieldsFromDom();
    const boxes = Array.from(document.querySelectorAll('input[name="cspcLangAvail"]:checked'));
    const active = cspcActiveLang();
    const langs = boxes.map(b => b.value);
    if (!langs.includes(active)) langs.unshift(active);
    state.availableLanguages = langs;
    renderCustomSpeciesEditor();
}

function toggleCspcLangBlock(lang, forceCollapse) {
    const body = document.getElementById(`cspcLangBody_${lang}`);
    const indicator = document.getElementById(`cspcLangToggle_${lang}`);
    if (!body) return;
    let collapsed;
    if (typeof forceCollapse === "boolean") collapsed = forceCollapse;
    else collapsed = !body.classList.contains("collapsed");
    body.classList.toggle("collapsed", collapsed);
    if (indicator) indicator.classList.toggle("is-collapsed", collapsed);
}

function renderCspcLangBlock(lang, collapsed) {
    const title = (typeof getCustomClassLangTitle === "function")
        ? getCustomClassLangTitle(lang)
        : lang;
    const activeLang = cspcActiveLang();
    const req = lang === activeLang ? ' <span class="custom-class-required">*</span>' : "";
    const collapsedClass = collapsed ? "collapsed" : "";
    return `
        <div class="custom-class-lang-block" data-lang="${lang}">
            <div class="custom-class-lang-header" onclick="toggleCspcLangBlock('${lang}')">
                <span>${title}</span>
                <span id="cspcLangToggle_${lang}" class="cc-collapse-arrow${collapsed ? " is-collapsed" : ""}" aria-hidden="true">&#x25BC;</span>
            </div>
            <div id="cspcLangBody_${lang}" class="custom-class-lang-body ${collapsedClass}">
                <label for="cspcName_${lang}">${tCspc("cfNameLabel", "Bezeichnung")}${req}</label>
                <input type="text" id="cspcName_${lang}" class="custom-class-name-input app-small-input" maxlength="${CSPC_CONFIG.nameMax}">
                <div class="char-counter"><span id="cspcNameCount_${lang}">0</span> / ${CSPC_CONFIG.nameMax}</div>
                <label for="cspcDesc_${lang}" style="margin-top:8px;display:block;">${tCspc("cfDescLabel", "Beschreibung")}${req}</label>
                <textarea id="cspcDesc_${lang}" maxlength="${CSPC_CONFIG.descMax}"></textarea>
                <div class="char-counter"><span id="cspcDescCount_${lang}">0</span> / ${CSPC_CONFIG.descMax}</div>
            </div>
        </div>
    `;
}

function renderCustomSpeciesTab1() {
    const container = document.getElementById("customSpeciesTab1Content");
    const state = customSpeciesEditorState;
    if (!container || !state) return;
    state.size = ensureCspcContiguousSizeCategories(state.size || []);
    cspcInstallLfFloatBridges();
    const activeLang = cspcActiveLang();
    const available = state.availableLanguages || [activeLang];
    const req = `<span class="custom-class-required">*</span>`;
    const langRow = (typeof renderLangAvailabilityRowHtml === "function")
        ? renderLangAvailabilityRowHtml(state, {
            inputName: "cspcLangAvail",
            onChange: "onCspcLangAvailabilityChange()"
        })
        : "";
    const sizeUnit = cspcIsDeUi()
        ? tCspc("cspcUnitCmLabel", "cm")
        : tCspc("cspcUnitFtLabel", "ft");
    const speedUnit = cspcIsDeUi()
        ? tCspc("cspcUnitMLabel", "m")
        : tCspc("cspcUnitFtLabel", "ft");
    const fromDisp = cspcIsDeUi() ? cspcFtToCm(state.sizeRange_ft[0]) : state.sizeRange_ft[0];
    const toDisp = cspcIsDeUi() ? cspcFtToCm(state.sizeRange_ft[1]) : state.sizeRange_ft[1];
    const speedDisp = cspcFtToDisplaySpeed(state.speedFT);
    const sizeChecks = (typeof sizeList !== "undefined" ? sizeList : []).map(s => {
        const lab = s.sizeCategory;
        const checked = (state.size || []).includes(lab) ? "checked" : "";
        return `<label><input type="checkbox" name="cspcSize" value="${escapeCspcHtml(lab)}" ${checked}
            onchange="onCspcSizeCategoryChange()"> ${escapeCspcHtml(tCspc(lab, lab))}</label>`;
    }).join("");
    const showTallHint = (state.size || []).includes("tallLabel");
    const origin = state.originBranch || "none";
    const originHint = origin === "ancestry"
        ? tCspc("cspcOriginAncestryHintLabel", "")
        : (origin === "lineage" ? tCspc("cspcOriginLineageHintLabel", "") : "");

    container.innerHTML = `
        ${langRow}
        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCspc("cfNameLabel", "Bezeichnung")} / ${tCspc("cfDescLabel", "Beschreibung")} ${req}</div>
            ${available.map(lang => renderCspcLangBlock(lang, lang !== activeLang)).join("")}
        </div>

        <div class="custom-class-field cspc-phys-oversection">
            <div class="custom-class-section-title">${tCspc("cspcPhysSectionLabel", "Körperliche Merkmale")} ${req}</div>
            <div class="custom-class-lang-block">
                <div class="custom-class-field">
                    <label for="cspcAge" class="custom-class-section-title">${tCspc("cspcAgeLabel", "Durchschnittl. Lebensspanne")}</label>
                    <div class="cspc-speed-row">
                        <input type="number" id="cspcAge" class="cspc-age-input app-small-input" min="1" max="9999" step="1"
                            value="${escapeCspcHtml(state.speciesAge_years)}"
                            oninput="onCspcAgeInput()" onchange="onCspcAgeInput()" onblur="onCspcAgeInput()">
                        <span class="cspc-unit">${escapeCspcHtml(tCspc("yearsLabel", "Jahre"))}</span>
                    </div>
                </div>
                <div class="custom-class-field">
                    <div class="custom-class-section-title">${tCspc("sizeCategoryLabel", "Größenkategorie")}</div>
                    <div class="cspc-size-checks">${sizeChecks}</div>
                    ${showTallHint ? `<p class="cspc-origin-hint">${escapeCspcHtml(tCspc("cspcTallHintLabel", ""))}</p>` : ""}
                    <div class="custom-class-section-title cspc-avg-size-title">${tCspc("cspcSizeRangeLabel", "Durchschnittl. Größe")}</div>
                    <div class="cspc-size-range-row">
                        <label class="cspc-inline-label" for="cspcSizeFrom">${tCspc("cspcSizeFromLabel", "Von")}</label>
                        <input type="number" id="cspcSizeFrom" class="app-small-input" min="0" step="1" value="${fromDisp}"
                            oninput="onCspcSizeRangeInput('from')" onchange="onCspcSizeRangeCommit('from')"
                            onblur="onCspcSizeRangeCommit('from')">
                        <label class="cspc-inline-label" for="cspcSizeTo">${tCspc("cspcSizeToLabel", "Bis")}</label>
                        <input type="number" id="cspcSizeTo" class="app-small-input" min="0" step="1" value="${toDisp}"
                            oninput="onCspcSizeRangeInput('to')" onchange="onCspcSizeRangeCommit('to')"
                            onblur="onCspcSizeRangeCommit('to')">
                        <span class="cspc-unit">${escapeCspcHtml(sizeUnit)}</span>
                    </div>
                </div>
                <div class="custom-class-field">
                    <label for="cspcSpeed" class="custom-class-section-title">${tCspc("cspcMovementLabel", "Bewegung")}</label>
                    <div class="cspc-speed-row">
                        <input type="number" id="cspcSpeed" class="app-small-input" min="0" max="999" step="any" value="${speedDisp}"
                            oninput="onCspcSpeedInput()" onchange="onCspcSpeedInput()" onblur="onCspcSpeedInput()">
                        <span class="cspc-unit">${escapeCspcHtml(speedUnit)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCspc("cspcOriginSectionLabel", "Herkunftszweige")}</div>
            <div class="cspc-origin-radios">
                <label><input type="radio" name="cspcOrigin" value="none" ${origin === "none" ? "checked" : ""}
                    onchange="onCspcOriginBranchChange(this.value)"> ${escapeCspcHtml(tCspc("cspcOriginNoneLabel", "Keine"))}</label>
                <label><input type="radio" name="cspcOrigin" value="ancestry" ${origin === "ancestry" ? "checked" : ""}
                    onchange="onCspcOriginBranchChange(this.value)"> ${escapeCspcHtml(tCspc("ancestryLabel", "Abstammung"))}</label>
                <label><input type="radio" name="cspcOrigin" value="lineage" ${origin === "lineage" ? "checked" : ""}
                    onchange="onCspcOriginBranchChange(this.value)"> ${escapeCspcHtml(tCspc("lineageLabel", "Erblinie"))}</label>
            </div>
            ${originHint ? `<p class="cspc-origin-hint">${escapeCspcHtml(originHint)}</p>` : ""}
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCspc("cspcTraitTableLabel", "Fähigkeitsmerkmale")}</div>
            ${buildCspcFeatureRowsHtml()}
        </div>
    `;

    available.forEach(lang => {
        const nameEl = document.getElementById(`cspcName_${lang}`);
        const descEl = document.getElementById(`cspcDesc_${lang}`);
        if (nameEl) {
            nameEl.value = state.names[lang] || "";
            if (typeof updateCustomClassCharCounter === "function") {
                nameEl.oninput = () => updateCustomClassCharCounter(`cspcName_${lang}`, `cspcNameCount_${lang}`, CSPC_CONFIG.nameMax);
                updateCustomClassCharCounter(`cspcName_${lang}`, `cspcNameCount_${lang}`, CSPC_CONFIG.nameMax);
            }
        }
        if (descEl) {
            descEl.value = state.descriptions[lang] || "";
            if (typeof updateCustomClassCharCounter === "function") {
                descEl.oninput = () => updateCustomClassCharCounter(`cspcDesc_${lang}`, `cspcDescCount_${lang}`, CSPC_CONFIG.descMax);
                updateCustomClassCharCounter(`cspcDesc_${lang}`, `cspcDescCount_${lang}`, CSPC_CONFIG.descMax);
            }
        }
        if (lang !== activeLang) toggleCspcLangBlock(lang, true);
    });
    applyCspcSizeRangeInputLimits();
    onCspcSizeRangeCommit();
}

function onCspcSizeCategoryChange() {
    const state = customSpeciesEditorState;
    if (!state) return;
    syncCspcFieldsFromDom();
    state.size = ensureCspcContiguousSizeCategories(state.size || []);
    const union = cspcUnionSizeRangeFt(state.size);
    if (union && !cspcSizeRangeValid(state)) {
        state.sizeRange_ft = [union[0], union[1]];
    }
    renderCustomSpeciesTab1();
}

function onCspcAgeInput() {
    const el = document.getElementById("cspcAge");
    if (!el) return;
    if (el.value === "") return;
    const clamped = cspcClampAgeYears(el.value);
    if (clamped === "") {
        el.value = "";
        return;
    }
    if (String(clamped) !== el.value) el.value = String(clamped);
}

function onCspcSpeedInput() {
    const el = document.getElementById("cspcSpeed");
    if (!el) return;
    // Tippen erlauben (Zwischenzustände); harte Grenzen bei gültiger Zahl
    if (el.value === "" || el.value === "-" || /[.,]$/.test(el.value)) return;
    const clamped = cspcClampDisplaySpeed(el.value);
    if (clamped === "") {
        el.value = "";
        return;
    }
    if (Number(String(el.value).replace(",", ".")) !== clamped) el.value = String(clamped);
}

function ensureCspcContiguousSizeCategories(sizeLabels) {
    const order = ["smallLabel", "mediumLabel", "tallLabel"];
    const selected = new Set(sizeLabels || []);
    if (selected.has("smallLabel") && selected.has("tallLabel")) selected.add("mediumLabel");
    return order.filter(key => selected.has(key));
}

function cspcCategoryLabel(cat) {
    if (!cat) return "—";
    if (cat === "originFeats") return tCspc("cspcCatOriginFeatsLabel", tCspc("ccLfFeatCatOriginLabel", "Herkunftstalente"));
    if (typeof formatLfCategory === "function") {
        const lab = formatLfCategory(cat);
        if (lab && lab !== cat) return lab;
    }
    const keys = {
        free: "ccLfCatFreeLabel",
        skills: "skillsLabel",
        preDefined: "ccLfCatPreDefinedLabel",
        getCantrip: "ccLfCatGetCantripLabel",
        chooseCantrip: "ccLfCatChooseCantripLabel",
        getPreparedSpell: "ccLfCatGetPreparedSpellLabel",
        choosePreparedSpell: "ccLfCatChoosePreparedSpellLabel"
    };
    return tCspc(keys[cat] || cat, cat);
}

function cspcFeatureTypeLabel(kind) {
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
    return tCspc(keys[kind] || kind, kind);
}

function cspcIsSpellcraftBlocked(cat, index) {
    if (!CSPC_SPELLCRAFT_ONCE.includes(cat)) return false;
    const rows = customSpeciesEditorState?.features || [];
    return rows.some((r, i) => i !== index && r.kind === "spellcraft" && r.category === cat);
}

/** Kategorie nur einmal pro Session (Einfach/Optionen, z. B. Fertigkeiten). */
function cspcIsCategoryOnceBlocked(cat, index) {
    const once = CSPC_CONFIG.categoriesOncePerSession || [];
    if (!once.includes(cat)) return false;
    const rows = customSpeciesEditorState?.features || [];
    return rows.some((r, i) => {
        if (i === index) return false;
        if (r.category !== cat) return false;
        return r.kind === "simple" || r.kind === "options";
    });
}

function buildCspcTypeSelectHtml(row, index) {
    const kind = row.kind || "";
    const opts = [
        ["", tCspc("pleaseSelectLabel", "Bitte wählen")],
        ["simple", cspcFeatureTypeLabel("simple")],
        ["options", cspcFeatureTypeLabel("options")],
        ["spellcraft", cspcFeatureTypeLabel("spellcraft")]
    ].map(([v, lab]) => {
        const sel = kind === v ? "selected" : "";
        return `<option value="${v}" ${sel}>${escapeCspcHtml(lab)}</option>`;
    }).join("");
    return `<select id="cspcRowKind_${index}" class="dropdown cc-lf-select"
        onchange="onCspcFeatureRowChange(${index})">${opts}</select>`;
}

function buildCspcCategorySelectHtml(row, index) {
    const kind = row.kind || "";
    if (!kind) return `<span class="cc-lf-cell--muted">—</span>`;
    const cats = CSPC_CATEGORIES_BY_TYPE[kind] || [];
    let html = `<select id="cspcRowCat_${index}" class="dropdown cc-lf-select"
        onchange="onCspcFeatureRowChange(${index})">`;
    html += `<option value="">${escapeCspcHtml(tCspc("pleaseSelectLabel", "Bitte wählen"))}</option>`;
    cats.forEach(cat => {
        const blocked = cspcIsSpellcraftBlocked(cat, index) || cspcIsCategoryOnceBlocked(cat, index);
        const sel = row.category === cat && !blocked ? "selected" : "";
        const dis = blocked ? "disabled" : "";
        html += `<option value="${cat}" ${sel} ${dis}>${escapeCspcHtml(cspcCategoryLabel(cat))}</option>`;
    });
    html += `</select>`;
    return html;
}

function cspcCanOpenOptionsMask(row) {
    if (!row || !row.kind || !row.category) return false;
    if (row.kind === "simple" && row.category === "free") return false;
    if (row.category === "preDefined") return false;
    return true;
}

function cspcIsOptionsConfigured(row) {
    if (!row || !row.kind || !row.category) return false;
    const cfg = row.optionsConfig || {};
    if (row.category === "preDefined") return !!cspcPredefinedLabel(row);
    if (row.kind === "simple" && row.category === "free") return true;
    if (row.kind === "options" && row.category === "free") {
        const min = (typeof CUSTOM_CLASS_LF_CONFIG !== "undefined"
            ? CUSTOM_CLASS_LF_CONFIG.limits?.optionsMinChoices : 2) || 2;
        return Array.isArray(cfg.choices)
            && cfg.choices.filter(c => (c?.names?.de || c?.names?.en || "").trim()).length >= min;
    }
    if (row.category === "skills") {
        if (row.kind === "simple") return Array.isArray(cfg.selectedSkills) && cfg.selectedSkills.length > 0;
        return cfg.skillFilter === "all"
            || (Array.isArray(cfg.selectedSkills) && cfg.selectedSkills.length > 0);
    }
    if (row.category === "originFeats") {
        if (row.kind === "simple") return Array.isArray(cfg.selectedFeats) && cfg.selectedFeats.length > 0;
        return cfg.featFilter === "all" || (Array.isArray(cfg.selectedFeats) && cfg.selectedFeats.length > 0);
    }
    if (row.kind === "spellcraft") {
        if (row.category === "getCantrip" || row.category === "getPreparedSpell") {
            return !!cspcSpellLabelFromConfig(cfg);
        }
        return true;
    }
    return false;
}

function cspcRowNeedsCustomName(row) {
    if (!row?.kind || !row.category || row.category === "preDefined") return false;
    const slot = cspcRowToLfSlot(row, 0);
    if (typeof getLfFixedDesignationKey === "function" && getLfFixedDesignationKey(slot)) return false;
    if (typeof canOpenLfNameMask === "function") return canOpenLfNameMask(slot);
    return row.kind === "simple" && row.category === "free";
}

function cspcRowNeedsCustomShort(row) {
    if (!row?.kind || !row.category || row.category === "preDefined") return false;
    let spec = null;
    if (row.kind === "simple" && typeof getLfSimpleCategorySpec === "function") {
        spec = getLfSimpleCategorySpec(row.category);
    } else if (row.kind === "options" && typeof getLfOptionsCategorySpec === "function") {
        spec = getLfOptionsCategorySpec(row.category);
    } else if (row.kind === "spellcraft" && typeof getLfSpellcraftCategorySpec === "function") {
        spec = getLfSpellcraftCategorySpec(row.category);
    }
    return spec?.descMode === "custom";
}

function buildCspcFeatureRowsHtml() {
    const rows = customSpeciesEditorState?.features || [];
    const colHeaders = [
        tCspc("ccLfColLevelLabel", "Stufe"),
        tCspc("ccLfColTypeLabel", "Merkmaltyp"),
        tCspc("categoryLabel", "Kategorie"),
        tCspc("ccLfColNameLabel", "Bezeichnung"),
        tCspc("ccLfColDescLabel", "Kurz- & Beschreibung"),
        tCspc("optionsLabel", "Optionen"),
        tCspc("amountLabel", "Anzahl")
    ];
    return `<div class="cc-lf-table-wrap">
        <div class="cc-lf-table cspc-lf-table" role="table">
            <div class="cc-lf-header cspc-lf-header" role="row">
                ${colHeaders.map((h, i) => {
                    const extra = (i === 0 || i >= 4) ? " cc-lf-cell--center" : "";
                    return `<div class="cc-lf-cell cc-lf-cell--head${extra}" role="columnheader">${escapeCspcHtml(h)}</div>`;
                }).join("")}
            </div>
            ${rows.map((row, i) => {
                const empty = !row.kind;
                const slot = cspcRowToLfSlot(row, i);
                const nameHtml = empty
                    ? `<span class="cc-lf-chip-muted">—</span>`
                    : ((typeof buildLfNameCellHtml === "function")
                        ? buildLfNameCellHtml(slot)
                        : "—");
                const descHtml = (typeof buildLfDescChipsHtml === "function")
                    ? buildLfDescChipsHtml(slot)
                    : "—";
                const optHtml = (typeof buildLfOptionsChipHtml === "function")
                    ? buildLfOptionsChipHtml(slot)
                    : "—";
                const amtHtml = (typeof buildLfAmountChipHtml === "function")
                    ? buildLfAmountChipHtml(slot, cspcGetFeatureShimSlots())
                    : "—";
                return `<div class="cc-lf-row cspc-lf-row cc-lf-row--free${empty ? " cc-lf-row--empty" : ""}" role="row">
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">
                        <input type="number" id="cspcRowLevel_${i}" class="app-small-input cspc-level-input"
                            min="1" max="20" step="1" value="${row.level || 1}"
                            onchange="onCspcFeatureRowChange(${i})" ${empty ? "disabled" : ""}>
                    </div>
                    <div class="cc-lf-cell" role="cell">${buildCspcTypeSelectHtml(row, i)}</div>
                    <div class="cc-lf-cell" role="cell">${buildCspcCategorySelectHtml(row, i)}</div>
                    <div class="cc-lf-cell" role="cell">${nameHtml}</div>
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">${descHtml}</div>
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">${optHtml}</div>
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">${amtHtml}</div>
                </div>`;
            }).join("")}
        </div>
    </div>`;
}

function onCspcFeatureRowChange(index) {
    const state = customSpeciesEditorState;
    if (!state || !state.features[index]) return;
    syncCspcFieldsFromDom();
    const row = state.features[index];
    const kindEl = document.getElementById(`cspcRowKind_${index}`);
    const catEl = document.getElementById(`cspcRowCat_${index}`);
    const nextKind = kindEl ? kindEl.value : row.kind;
    const nextCat = catEl ? catEl.value : row.category;
    if (nextKind !== row.kind || nextCat !== row.category) {
        row.kind = nextKind;
        row.category = nextCat;
        row.optionsConfig = {};
        row.amount = nextKind === "options" && (nextCat === "skills" || nextCat === "originFeats") ? 1 : 0;
        if (cspcIsSpellcraftBlocked(nextCat, index) || cspcIsCategoryOnceBlocked(nextCat, index)) row.category = "";
    }
    const lvlEl = document.getElementById(`cspcRowLevel_${index}`);
    if (lvlEl) {
        let n = parseInt(lvlEl.value, 10);
        if (!Number.isFinite(n) || n < 1) n = 1;
        if (n > 20) n = 20;
        row.level = n;
    }
    renderCustomSpeciesTab1();
}

//=======================================================================
// LF-Brücken (Klassenbauer-Masken für Bezeichnung / Beschreibung / Optionen)
//=======================================================================

function cspcGetOriginFeatItems() {
    const cat = CSPC_CONFIG.originFeatCategoryNumber;
    const feats = (typeof getEffectiveFeatList === "function")
        ? getEffectiveFeatList()
        : ((typeof featList !== "undefined") ? featList : []);
    return feats.filter(f => Number(f.featCategoryNumber) === cat);
}

function cspcRowToLfSlot(row, index) {
    if (!row.optionsConfig || typeof row.optionsConfig !== "object") row.optionsConfig = {};
    if (row.optionsConfig.predefinedLabel && !row.optionsConfig.preDefinedLabel) {
        row.optionsConfig.preDefinedLabel = row.optionsConfig.predefinedLabel;
    }
    row.names = row.names || { de: "", en: "" };
    row.shortDescriptions = row.shortDescriptions || { de: "", en: "" };
    row.descriptions = row.descriptions || { de: "", en: "" };
    return {
        slotId: `cspc-row-${index}`,
        kind: "free",
        level: row.level || 1,
        payload: {
            featureType: row.kind,
            category: row.category,
            optionsConfig: row.optionsConfig,
            amount: row.amount || 0,
            names: row.names,
            shortDescriptions: row.shortDescriptions,
            descriptions: row.descriptions
        }
    };
}

function cspcLineageSpellToLfSlot(branchIndex, rowIndex) {
    const row = customSpeciesEditorState?.lineages?.[branchIndex]?.spellRows?.[rowIndex];
    if (!row) return null;
    if (!row.optionsConfig || typeof row.optionsConfig !== "object") row.optionsConfig = {};
    return {
        slotId: `cspc-lin-${branchIndex}-${rowIndex}`,
        kind: "free",
        level: parseInt(row.level, 10) || 1,
        payload: {
            featureType: "spellcraft",
            category: row.category || "",
            optionsConfig: row.optionsConfig,
            amount: 0,
            names: { de: "", en: "" },
            shortDescriptions: { de: "", en: "" },
            descriptions: { de: "", en: "" }
        }
    };
}

function cspcGetFeatureShimSlots() {
    return (customSpeciesEditorState?.features || []).map((row, i) => cspcRowToLfSlot(row, i));
}

function cspcGetAllShimSlots() {
    const slots = cspcGetFeatureShimSlots();
    (customSpeciesEditorState?.lineages || []).forEach((b, bi) => {
        (b.spellRows || []).forEach((_, ri) => {
            const slot = cspcLineageSpellToLfSlot(bi, ri);
            if (slot) slots.push(slot);
        });
    });
    return slots;
}

function cspcParseLinSlotId(slotId) {
    const m = String(slotId || "").match(/^cspc-lin-(\d+)-(\d+)$/);
    if (!m) return null;
    return { branchIndex: parseInt(m[1], 10), rowIndex: parseInt(m[2], 10) };
}

function cspcSyncFeatureFromSlot(slot) {
    if (!slot || !String(slot.slotId || "").startsWith("cspc-row-")) return;
    const idx = parseInt(String(slot.slotId).slice(9), 10);
    const row = customSpeciesEditorState?.features?.[idx];
    if (!row) return;
    row.kind = slot.payload.featureType || "";
    row.category = slot.payload.category || "";
    row.amount = parseInt(slot.payload.amount, 10) || 0;
    row.optionsConfig = slot.payload.optionsConfig || {};
    if (row.optionsConfig.preDefinedLabel && !row.optionsConfig.predefinedLabel) {
        row.optionsConfig.predefinedLabel = row.optionsConfig.preDefinedLabel;
    }
    if (row.kind === "simple" && row.category === "free") {
        row.optionsConfig = {};
    }
    if (row.kind === "options" && row.category === "originFeats") {
        row.amount = 1;
    }
    if (row.kind === "options" && row.category === "free" && row.optionsConfig) {
        delete row.optionsConfig.extendsSlotId;
    }
    if (row.kind === "options" && row.category === "skills" && row.optionsConfig?.skillFilter === "base") {
        row.optionsConfig.skillFilter = "all";
    }
}

function cspcSyncLineageFromSlot(slot) {
    const parsed = cspcParseLinSlotId(slot?.slotId);
    if (!parsed) return;
    const row = customSpeciesEditorState?.lineages?.[parsed.branchIndex]?.spellRows?.[parsed.rowIndex];
    if (!row) return;
    row.category = slot.payload.category || "";
    row.optionsConfig = slot.payload.optionsConfig || {};
    row.spellLabel = cspcSpellLabelFromConfig(row.optionsConfig);
}

function cspcOriginFeatsSimpleSpec() {
    return {
        designationLabel: "cbgOriginFeatLabel",
        descMode: "fixed",
        shortKey: "cspcOriginFeatSimpleShortD",
        longKey: null,
        optionsMode: "originFeatsPick",
        optionsIcon: "gear",
        pickMin: 1,
        pickMax: 1
    };
}

function cspcOriginFeatsOptionsSpec() {
    return {
        designationLabel: "cbgOriginFeatLabel",
        descMode: "fixed",
        shortKey: "cspcOriginFeatOptionsShortD",
        longKey: null,
        optionsMode: "originFeatsFilter"
    };
}

function buildCspcSpeciesFreeOptionsMaskHtml(slot) {
    const cfg = slot.payload.optionsConfig || {};
    const choices = Array.isArray(cfg.choices) && cfg.choices.length
        ? cfg.choices
        : [
            { names: { de: "", en: "" }, descriptions: { de: "", en: "" } },
            { names: { de: "", en: "" }, descriptions: { de: "", en: "" } }
        ];
    const max = (typeof CUSTOM_CLASS_LF_CONFIG !== "undefined"
        ? CUSTOM_CLASS_LF_CONFIG.limits?.freeOptionsChoicesMax : 8) || 8;
    const rows = choices.slice(0, max).map((c, i) =>
        (typeof buildLfFreeChoiceRowHtml === "function") ? buildLfFreeChoiceRowHtml(i, c) : ""
    ).join("");
    return `
        <p class="cc-lf-float-context">${typeof tCC === "function" ? tCC("ccLfFreeOptionsHintLabel") : ""}</p>
        <div id="ccLfChoiceList">${rows}</div>
        <button type="button" class="custom-class-add-item-btn" style="margin-top:8px;"
            onclick="addLfFreeChoiceRow()">${typeof tCC === "function" ? tCC("ccLfAddOptionEntryLabel") : "+"}</button>
    `;
}

function buildCspcSpeciesSkillsOptionsMaskHtml(slot) {
    const cfg = slot.payload.optionsConfig || {};
    const min = (typeof CUSTOM_CLASS_LF_CONFIG !== "undefined"
        ? CUSTOM_CLASS_LF_CONFIG.limits?.optionsMinChoices : 2) || 2;
    let filter = cfg.skillFilter || "all";
    if (filter === "base") filter = "all";
    const selected = new Set(cfg.selectedSkills || []);
    const skills = (typeof skillList !== "undefined" ? skillList : []).map(s => s.translationLabel || s);
    const opts = [
        { v: "selection", k: "selectionLabel" },
        { v: "all", k: "allLabel" }
    ];
    const heading = (typeof buildLfOptionsFilterHeadingHtml === "function")
        ? buildLfOptionsFilterHeadingHtml("skillsLabel")
        : `<label class="cc-lf-float-label">${escapeCspcHtml(tCspc("skillsLabel", "Fertigkeiten"))}</label>`;
    const selectHtml = `<select id="ccLfSkillFilter" class="dropdown cc-lf-float-input cc-lf-options-filter"
        onchange="document.getElementById('ccLfSkillSelectWrap').style.display=this.value==='selection'?'block':'none'">
        ${opts.map(o => `<option value="${o.v}" ${filter === o.v ? "selected" : ""}>${typeof tCC === "function" ? tCC(o.k) : o.k}</option>`).join("")}
    </select>`;
    const control = (typeof buildLfControlRowHtml === "function")
        ? buildLfControlRowHtml(heading, selectHtml)
        : `${heading}${selectHtml}`;
    const hint = (typeof formatLfMinOptionsHint === "function") ? formatLfMinOptionsHint(min) : "";
    const grid = (typeof buildLfCheckboxGridHtml === "function")
        ? buildLfCheckboxGridHtml("ccLfSkillAllowList", skills, selected)
        : "";
    return `
        ${control}
        <div id="ccLfSkillSelectWrap" style="display:${filter === "selection" ? "block" : "none"};">
            ${hint ? `<p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${hint}</p>` : ""}
            ${grid}
        </div>
    `;
}

function applyCspcSpeciesSkillsOptionsFromDom(slot, { soft = false } = {}) {
    const min = (typeof CUSTOM_CLASS_LF_CONFIG !== "undefined"
        ? CUSTOM_CLASS_LF_CONFIG.limits?.optionsMinChoices : 2) || 2;
    const skillFilterRaw = (typeof queryActiveLfFloat === "function"
        ? queryActiveLfFloat("#ccLfSkillFilter")
        : document.getElementById("ccLfSkillFilter"))?.value || "all";
    const skillFilter = skillFilterRaw === "base" ? "all" : skillFilterRaw;
    const selectedSkills = Array.from(
        (typeof queryAllActiveLfFloat === "function"
            ? queryAllActiveLfFloat("#ccLfSkillAllowList input:checked")
            : document.querySelectorAll("#ccLfSkillAllowList input:checked"))
    ).map(el => el.value);
    if (!soft && skillFilter === "selection" && selectedSkills.length < min) {
        if (typeof lfFailMinOptions === "function") lfFailMinOptions();
        return false;
    }
    slot.payload.optionsConfig = { skillFilter, selectedSkills };
    return true;
}

function buildCspcOriginFeatsLfMaskHtml(slot) {
    const type = slot.payload.featureType;
    const cfg = slot.payload.optionsConfig || {};
    const items = cspcGetOriginFeatItems();
    const selected = new Set(cfg.selectedFeats || []);
    const heading = (typeof buildLfOptionsGearHeadingHtml === "function")
        ? buildLfOptionsGearHeadingHtml("ccLfFeatCatOriginLabel")
        : `<label class="cc-lf-float-label">${escapeCspcHtml(cspcCategoryLabel("originFeats"))}</label>`;
    if (type === "simple") {
        const spec = cspcOriginFeatsSimpleSpec();
        const hint = (typeof formatLfPickRangeHint === "function")
            ? formatLfPickRangeHint(spec.pickMin, spec.pickMax)
            : "";
        const grid = (typeof buildLfCheckboxGridHtml === "function")
            ? buildLfCheckboxGridHtml("ccLfSimpleOriginFeatList", items, selected, spec.pickMax, {
                lockedSet: cspcGetUsedOriginFeatLabels(slot.slotId),
                onchange: "cspcOnOriginFeatCheckboxChange()"
            })
            : "";
        return `${heading}${hint ? `<p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${hint}</p>` : ""}${grid}`;
    }
    const filter = cfg.featFilter || "all";
    const min = (typeof CUSTOM_CLASS_LF_CONFIG !== "undefined"
        ? CUSTOM_CLASS_LF_CONFIG.limits?.optionsMinChoices : 2) || 2;
    const control = (typeof buildLfControlRowHtml === "function")
        ? buildLfControlRowHtml(
            (typeof buildLfOptionsFilterHeadingHtml === "function")
                ? buildLfOptionsFilterHeadingHtml("ccLfFeatCatOriginLabel")
                : heading,
            `<select id="ccLfOriginFeatFilter" class="dropdown cc-lf-float-input cc-lf-options-filter"
                onchange="document.getElementById('ccLfOriginFeatSelectWrap').style.display=this.value==='selection'?'block':'none'">
                <option value="all" ${filter === "all" ? "selected" : ""}>${tCspc("allLabel", "Alle")}</option>
                <option value="selection" ${filter === "selection" ? "selected" : ""}>${tCspc("selectionLabel", "Auswahl")}</option>
            </select>`
        )
        : "";
    const grid = (typeof buildLfCheckboxGridHtml === "function")
        ? buildLfCheckboxGridHtml("ccLfOriginFeatAllowList", items, selected)
        : "";
    const hint = (typeof formatLfMinOptionsHint === "function") ? formatLfMinOptionsHint(min) : "";
    return `
        ${control}
        <div id="ccLfOriginFeatSelectWrap" style="display:${filter === "selection" ? "block" : "none"};">
            ${hint ? `<p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${hint}</p>` : ""}
            ${grid}
        </div>
    `;
}

function applyCspcOriginFeatsFromDom(slot, { soft = false } = {}) {
    const type = slot.payload.featureType;
    if (type === "simple") {
        const selectedFeats = Array.from(
            (typeof queryAllActiveLfFloat === "function"
                ? queryAllActiveLfFloat("#ccLfSimpleOriginFeatList input:checked")
                : document.querySelectorAll("#ccLfSimpleOriginFeatList input:checked"))
        ).map(el => el.value);
        if (!soft && selectedFeats.length < 1) return false;
        slot.payload.optionsConfig = { selectedFeats: selectedFeats.slice(0, 1) };
        return true;
    }
    const min = (typeof CUSTOM_CLASS_LF_CONFIG !== "undefined"
        ? CUSTOM_CLASS_LF_CONFIG.limits?.optionsMinChoices : 2) || 2;
    const featFilter = (typeof queryActiveLfFloat === "function"
        ? queryActiveLfFloat("#ccLfOriginFeatFilter")
        : document.getElementById("ccLfOriginFeatFilter"))?.value || "all";
    const selectedFeats = Array.from(
        (typeof queryAllActiveLfFloat === "function"
            ? queryAllActiveLfFloat("#ccLfOriginFeatAllowList input:checked")
            : document.querySelectorAll("#ccLfOriginFeatAllowList input:checked"))
    ).map(el => el.value);
    if (!soft && featFilter === "selection" && selectedFeats.length < min) return false;
    slot.payload.optionsConfig = {
        featFilter,
        selectedFeats: featFilter === "selection" ? selectedFeats : []
    };
    return true;
}

function buildCspcSpeciesPreDefinedSelectHtml(slot) {
    const current = slot.payload.optionsConfig?.preDefinedLabel
        || slot.payload.optionsConfig?.predefinedLabel || "";
    const used = new Set();
    (customSpeciesEditorState?.features || []).forEach((row, i) => {
        if (`cspc-row-${i}` === slot.slotId) return;
        const lab = cspcPredefinedLabel(row);
        if (lab) used.add(lab);
    });
    const opts = (CSPC_CONFIG.predefinedTraitLabels || []).map(lab => {
        const selected = lab === current ? "selected" : "";
        const disabled = used.has(lab) && lab !== current ? "disabled" : "";
        return `<option value="${escapeCspcHtml(lab)}" ${selected} ${disabled}>${escapeCspcHtml(tCspc(lab, lab))}</option>`;
    }).join("");
    return `
        <label class="cc-lf-float-label" for="ccLfPreDefinedSelect">${tCspc("ccLfExistingFeaturesLabel", "Vorhandene Merkmale")}</label>
        <select id="ccLfPreDefinedSelect" class="dropdown cc-lf-float-input cc-lf-options-filter"
            onchange="onLfPreDefinedSelectChange()">
            <option value="">${escapeCspcHtml(tCspc("pleaseSelectLabel", "Bitte wählen"))}</option>
            ${opts}
        </select>
    `;
}

function cspcSpeciesTraitDescKeys(label) {
    if (!label || typeof speciesTraitList === "undefined") return { shortKey: null, longKey: null };
    const trait = speciesTraitList.find(t => t.speciesTraitLabel === label);
    if (!trait) return { shortKey: null, longKey: null };
    return {
        shortKey: trait.speciesTraitShortDLabel || null,
        longKey: trait.speciesTraitDLabel || null
    };
}

function closeCspcLfFloat() {
    if (typeof closeLfFloat === "function") {
        closeLfFloat();
        return;
    }
    const overlay = document.getElementById("cspcLfFloatOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
}

function cspcIsLineageSpellSlot(slot) {
    return !!(customSpeciesEditorOpen && String(slot?.slotId || "").startsWith("cspc-lin-"));
}

/** Alle gewählten Zauber-Labels einer Erblinie-Zauberzeile (0–n). */
function cspcLineageSpellLabelsFromConfig(cfg, category) {
    if (!cfg || typeof cfg !== "object") return [];
    if (category === "getCantrip") {
        return (Array.isArray(cfg.selectedSpells) ? cfg.selectedSpells : []).filter(Boolean);
    }
    if (category === "getPreparedSpell") {
        if (Array.isArray(cfg.selectedSpells) && cfg.selectedSpells.some(Boolean)) {
            return cfg.selectedSpells.filter(Boolean);
        }
        const out = [];
        Object.values(cfg.selectedByLevel || {}).forEach(arr => {
            if (!Array.isArray(arr)) return;
            arr.filter(Boolean).forEach(lab => {
                if (!out.includes(lab)) out.push(lab);
            });
        });
        return out;
    }
    return [];
}

function cspcResolveSpellDisplayName(label) {
    if (!label) return "";
    const lang = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    if (typeof resolveLfTranslationLabelText === "function") {
        return resolveLfTranslationLabelText(label, lang) || String(label);
    }
    if (typeof tCC === "function") return tCC(label);
    return String(label);
}

function cspcLineageSpellGearIconHtml() {
    return (typeof getLfGearIconHtml === "function")
        ? getLfGearIconHtml()
        : `<span class="cc-lf-gear-icon" aria-hidden="true">⚙</span>`;
}

/** idle = keine Kategorie | empty = Kategorie ohne Auswahl | filled = Zauber gewählt */
function cspcLineageSpellOptionsState(slot, row) {
    const category = slot?.payload?.category || row?.category || "";
    if (!category) return "idle";
    const labels = cspcLineageSpellLabelsFromConfig(
        slot?.payload?.optionsConfig || {},
        category
    );
    return labels.length ? "filled" : "empty";
}

function buildCspcLineageSpellOptionsCellHtml(slot) {
    const state = cspcLineageSpellOptionsState(slot, { category: slot?.payload?.category });
    if (state === "idle") {
        return `<span class="cspc-lin-spell-gear-placeholder" aria-hidden="true">${cspcLineageSpellGearIconHtml()}</span>`;
    }
    if (typeof canOpenLfOptionsMask === "function" && !canOpenLfOptionsMask(slot)) {
        return `<span class="cspc-lin-spell-gear-placeholder" aria-hidden="true">${cspcLineageSpellGearIconHtml()}</span>`;
    }
    const labels = cspcLineageSpellLabelsFromConfig(
        slot.payload.optionsConfig || {},
        slot.payload.category
    );
    const title = escapeCspcHtml(tCspc("ccLfEditOptionsTitleLabel", "Optionen konfigurieren"));
    if (state === "empty") {
        return `<button type="button" class="cc-lf-chip-btn cc-lf-chip-btn--spell-name cc-lf-chip-btn--spell-empty"
            onclick="openLfFloat('${slot.slotId}', 'options', event)"
            onmousedown="event.stopPropagation()" title="${title}">${cspcLineageSpellGearIconHtml()}</button>`;
    }
    const text = labels.map(l => escapeCspcHtml(cspcResolveSpellDisplayName(l))).join(", ");
    return `<button type="button" class="cc-lf-chip-btn cc-lf-chip-btn--spell-name cc-lf-chip-btn--spell-filled cc-lf-chip-btn--on"
        onclick="openLfFloat('${slot.slotId}', 'options', event)"
        onmousedown="event.stopPropagation()" title="${title}">${text}</button>`;
}

function cspcCountLineagePreparedPicksFromCfg(cfg) {
    if (!cfg || typeof cfg !== "object") return 0;
    if (Array.isArray(cfg.selectedSpells) && cfg.selectedSpells.some(Boolean)) {
        return cfg.selectedSpells.filter(Boolean).length;
    }
    let n = 0;
    Object.values(cfg.selectedByLevel || {}).forEach(arr => {
        if (Array.isArray(arr)) n += arr.filter(Boolean).length;
    });
    return n;
}

function onCspcLineagePreparedSpellPickChange() {
    if (!ccLfFloatContext) return;
    const ctx = (typeof resolveLfSlotContext === "function")
        ? resolveLfSlotContext(ccLfFloatContext.slotId)
        : null;
    const slot = ctx?.slot;
    if (!slot) return;
    applyCspcLineageGetPreparedFromDom(slot, { soft: true });
    softRebuildCspcLineagePreparedMask();
}

function cspcUpdateLineagePreparedSpellPickLimits() {
    const max = CSPC_CONFIG.lineagePreparedSpellPickMax || 2;
    const selects = Array.from(
        (typeof queryAllActiveLfFloat === "function")
            ? queryAllActiveLfFloat("#ccLfScPreparedSections .cc-lf-sc-spell-pick")
            : document.querySelectorAll("#ccLfScPreparedSections .cc-lf-sc-spell-pick")
    );
    const count = selects.filter(el => el.value).length;
    const counter = (typeof queryActiveLfFloat === "function")
        ? queryActiveLfFloat("#ccLfCspcLinPrepCounter")
        : document.getElementById("ccLfCspcLinPrepCounter");
    if (counter) counter.textContent = `${count}/${max}`;
    const atMax = count >= max;
    selects.forEach(sel => {
        sel.disabled = !sel.value && atMax;
    });
}

function softRebuildCspcLineagePreparedMask() {
    if (!ccLfFloatContext?.slotId) return;
    const ctx = (typeof resolveLfSlotContext === "function")
        ? resolveLfSlotContext(ccLfFloatContext.slotId)
        : null;
    if (!ctx?.slot) return;
    applyCspcLineageGetPreparedFromDom(ctx.slot, { soft: true });
    const bodyEl = (typeof getActiveLfFloatBodyEl === "function")
        ? getActiveLfFloatBodyEl()
        : ((typeof queryActiveLfFloat === "function")
            ? queryActiveLfFloat(".cc-lf-float-body")
            : document.querySelector(".cc-lf-float-body"));
    if (!bodyEl) return;
    bodyEl.innerHTML = buildCspcLineageGetPreparedMaskHtml(ctx.slot, ctx.slot.payload.optionsConfig || {});
    if (typeof bindLfSpellcraftMaskHandlers === "function") {
        bindLfSpellcraftMaskHandlers(ctx.slot);
    }
    cspcUpdateLineagePreparedSpellPickLimits();
}

/** Erblinie getPreparedSpell: Standard-Zauberkunst-Maske + X/2-Zähler (wie Unterklassenzauber). */
function buildCspcLineageGetPreparedMaskHtml(slot, cfg) {
    const max = CSPC_CONFIG.lineagePreparedSpellPickMax || 2;
    const totalCount = cspcCountLineagePreparedPicksFromCfg(cfg);
    if (typeof buildLfSpellcraftGetPreparedMaskHtml !== "function") {
        return `<p class="cc-lf-float-hint">${typeof tCC === "function" ? tCC("ccLfSpellcraftSelectLevelsFirstLabel") : "—"}</p>`;
    }
    let html = buildLfSpellcraftGetPreparedMaskHtml(slot, cfg);
    const gearHeading = (typeof buildLfOptionsGearHeadingHtml === "function")
        ? buildLfOptionsGearHeadingHtml("ccLfSpellcraftSpellsPickLabel")
        : "";
    const counterRow = (typeof buildLfControlRowHtml === "function" && gearHeading)
        ? buildLfControlRowHtml(
            gearHeading,
            `<span id="ccLfCspcLinPrepCounter" class="cc-lf-sc-pick-counter cc-lf-sc-pick-counter--gold">${totalCount}/${max}</span>`
        )
        : `<div class="cc-lf-control-row" style="margin-bottom:8px;">
            <span id="ccLfCspcLinPrepCounter" class="cc-lf-sc-pick-counter cc-lf-sc-pick-counter--gold">${totalCount}/${max}</span>
        </div>`;
    if (gearHeading) {
        html = html.replace(gearHeading, counterRow);
    }
    html = html.replace(/onLfSpellcraftPreparedPickChange\(\)/g, "onCspcLineagePreparedSpellPickChange()");
    html = html.replace(/softRebuildLfSpellcraftPreparedMask\(\)/g, "softRebuildCspcLineagePreparedMask()");
    return html;
}

function applyCspcLineageGetPreparedFromDom(slot, { soft = false } = {}) {
    const max = CSPC_CONFIG.lineagePreparedSpellPickMax || 2;
    const listFilter = (typeof applyLfSpellcraftListFilterFromDom === "function")
        ? applyLfSpellcraftListFilterFromDom()
        : { listMode: "all", spellListLabels: [] };
    const listMode = listFilter.listMode || "all";
    const spellListLabels = listFilter.spellListLabels || [];
    const levelFilter = (typeof applyLfSpellcraftLevelFilterFromDom === "function")
        ? applyLfSpellcraftLevelFilterFromDom()
        : { levelMode: "all", levelLabels: [] };
    const levelMode = levelFilter.levelMode || "all";
    const levelLabels = levelFilter.levelLabels || [];
    const activeLevels = levelMode === "all"
        ? ((typeof getLfPreparedSpellLevelLabels === "function")
            ? getLfPreparedSpellLevelLabels()
            : [])
        : levelLabels;
    const dropCount = (typeof getLfSpellcraftGetDropdownCount === "function")
        ? getLfSpellcraftGetDropdownCount(slot)
        : 1;
    const selectedByLevel = {};
    const allFilled = [];
    activeLevels.forEach(lvl => {
        const picks = [];
        for (let i = 0; i < dropCount; i++) {
            const el = (typeof queryActiveLfFloat === "function")
                ? queryActiveLfFloat(`#ccLfScPrep_${lvl}_${i}`)
                : document.getElementById(`ccLfScPrep_${lvl}_${i}`);
            picks.push(el?.value || "");
        }
        selectedByLevel[lvl] = picks;
        picks.filter(Boolean).forEach(lab => allFilled.push(lab));
    });

    if (!soft) {
        if (listMode === "selection" && spellListLabels.length < 1) {
            if (typeof tCC === "function") alert(tCC("ccLfSpellListsHeadingLabel"));
            return false;
        }
        if (levelMode === "selection" && levelLabels.length < 1) {
            if (typeof tCC === "function") alert(tCC("ccLfSpellLevelsHeadingLabel"));
            return false;
        }
        if (!activeLevels.length) {
            if (typeof tCC === "function") alert(tCC("ccLfSpellcraftSelectLevelsFirstLabel"));
            return false;
        }
        if (!allFilled.length) {
            if (typeof tCC === "function") alert(tCC("ccLfSpellcraftSpellsPickLabel"));
            return false;
        }
        if (allFilled.length > max) {
            return false;
        }
        if (new Set(allFilled).size !== allFilled.length) {
            if (typeof tCC === "function") alert(tCC("ccLfSpellcraftDuplicateAlertLabel"));
            return false;
        }
        const used = (typeof getLfUsedSpellcraftSpellLabels === "function")
            ? getLfUsedSpellcraftSpellLabels(getLfSlotsForSlot(slot), slot.slotId)
            : new Set();
        if (allFilled.some(lab => used.has(lab))) {
            if (typeof tCC === "function") alert(tCC("ccLfSpellcraftAlreadyUsedAlertLabel"));
            return false;
        }
    }
    slot.payload.optionsConfig = {
        listMode,
        spellListLabels,
        levelMode,
        levelLabels,
        selectedByLevel,
        selectedSpells: allFilled.slice()
    };
    return true;
}

function cspcInstallLfFloatBridges() {
    if (window._cspcLfBridgesInstalled) return;
    window._cspcLfBridgesInstalled = true;

    const origOverlay = typeof getActiveLfFloatOverlayEl === "function" ? getActiveLfFloatOverlayEl : null;
    getActiveLfFloatOverlayEl = function () {
        if (customSpeciesEditorOpen) {
            const el = document.getElementById("cspcLfFloatOverlay");
            if (el) return el;
        }
        return origOverlay ? origOverlay() : document.getElementById("ccLfFloatOverlay");
    };

    const origResolve = typeof resolveLfSlotContext === "function" ? resolveLfSlotContext : null;
    resolveLfSlotContext = function (slotId) {
        if (String(slotId || "").startsWith("cspc-row-")) {
            const idx = parseInt(String(slotId).slice(9), 10);
            const row = customSpeciesEditorState?.features?.[idx];
            if (!row) return null;
            const slot = cspcRowToLfSlot(row, idx);
            return { slot, slots: cspcGetFeatureShimSlots(), subclass: null, isSubclass: false };
        }
        const lin = cspcParseLinSlotId(slotId);
        if (lin) {
            const slot = cspcLineageSpellToLfSlot(lin.branchIndex, lin.rowIndex);
            if (!slot) return null;
            return { slot, slots: cspcGetAllShimSlots(), subclass: null, isSubclass: false };
        }
        return origResolve ? origResolve(slotId) : null;
    };

    const origSlots = typeof getLfSlotsForSlot === "function" ? getLfSlotsForSlot : null;
    getLfSlotsForSlot = function (slot) {
        const id = String(slot?.slotId || "");
        if (id.startsWith("cspc-row-")) return cspcGetFeatureShimSlots();
        if (id.startsWith("cspc-lin-")) return cspcGetAllShimSlots();
        return origSlots ? origSlots(slot) : [];
    };

    const origLangState = typeof getActiveLfEditorLangState === "function" ? getActiveLfEditorLangState : null;
    getActiveLfEditorLangState = function () {
        if (customSpeciesEditorOpen && customSpeciesEditorState) return customSpeciesEditorState;
        return origLangState ? origLangState() : null;
    };

    const origRerender = typeof rerenderLfOwner === "function" ? rerenderLfOwner : null;
    rerenderLfOwner = function (ctx) {
        if (customSpeciesEditorOpen) {
            const slot = ctx?.slot;
            const id = String(slot?.slotId || "");
            if (id.startsWith("cspc-lin-")) {
                cspcSyncLineageFromSlot(slot);
                renderCustomSpeciesTab3();
            } else {
                cspcSyncFeatureFromSlot(slot);
                renderCustomSpeciesTab1();
            }
            return;
        }
        if (origRerender) origRerender(ctx);
    };

    const origSimpleSpec = typeof getLfSimpleCategorySpec === "function" ? getLfSimpleCategorySpec : null;
    getLfSimpleCategorySpec = function (category) {
        if (customSpeciesEditorOpen && category === "originFeats") return cspcOriginFeatsSimpleSpec();
        if (customSpeciesEditorOpen && category === "free") {
            const base = origSimpleSpec ? origSimpleSpec(category) : null;
            return base ? Object.assign({}, base, { optionsMode: "none" }) : null;
        }
        return origSimpleSpec ? origSimpleSpec(category) : null;
    };

    const origOptionsSpec = typeof getLfOptionsCategorySpec === "function" ? getLfOptionsCategorySpec : null;
    getLfOptionsCategorySpec = function (category) {
        if (customSpeciesEditorOpen && category === "originFeats") return cspcOriginFeatsOptionsSpec();
        return origOptionsSpec ? origOptionsSpec(category) : null;
    };

    const origFixedDesignation = typeof getLfFixedDesignationKey === "function" ? getLfFixedDesignationKey : null;
    getLfFixedDesignationKey = function (slot) {
        if (cspcIsSpeciesFeatureSlot(slot) && slot.payload.category === "originFeats") {
            return "cbgOriginFeatLabel";
        }
        return origFixedDesignation ? origFixedDesignation(slot) : null;
    };

    const origAmount = typeof getLfAmountSemantics === "function" ? getLfAmountSemantics : null;
    getLfAmountSemantics = function (slot) {
        if (customSpeciesEditorOpen
            && slot?.payload?.featureType === "options"
            && slot.payload.category === "originFeats") {
            return {
                labelKey: "ccLfAmountDropdownsLabel",
                hintKey: "cspcOriginFeatAmountContextLabel",
                min: 1,
                maxPerSlot: 1,
                globalMaxKey: null,
                _inlineGlobalMax: null
            };
        }
        return origAmount ? origAmount(slot) : null;
    };

    const origCanOpenAmount = typeof canOpenLfAmountMask === "function" ? canOpenLfAmountMask : null;
    canOpenLfAmountMask = function (slot) {
        if (cspcIsSpeciesFeatureSlot(slot)
            && slot.payload?.featureType === "options"
            && slot.payload.category === "originFeats") {
            return false;
        }
        return origCanOpenAmount ? origCanOpenAmount(slot) : false;
    };

    const origAmountChip = typeof buildLfAmountChipHtml === "function" ? buildLfAmountChipHtml : null;
    buildLfAmountChipHtml = function (slot, slots) {
        if (cspcIsSpeciesFeatureSlot(slot)
            && slot.payload?.featureType === "options"
            && slot.payload.category === "originFeats") {
            return `<span class="cc-lf-chip-btn cc-lf-chip-btn--on" style="pointer-events:none;">×1</span>`;
        }
        return origAmountChip ? origAmountChip(slot, slots) : `<span class="cc-lf-chip-muted">—</span>`;
    };

    const origCanOpenOptions = typeof canOpenLfOptionsMask === "function" ? canOpenLfOptionsMask : null;
    canOpenLfOptionsMask = function (slot) {
        if (cspcIsLineageSpellSlot(slot) && slot.payload?.category) {
            return true;
        }
        if (cspcIsSpeciesFeatureSlot(slot)
            && slot.payload?.featureType === "simple"
            && slot.payload.category === "free") {
            return false;
        }
        return origCanOpenOptions ? origCanOpenOptions(slot) : false;
    };

    const origNameBody = typeof buildLfFloatNameBody === "function" ? buildLfFloatNameBody : null;
    buildLfFloatNameBody = function (slot) {
        if (cspcIsSpeciesFeatureSlot(slot)
            && slot.payload?.featureType === "simple"
            && slot.payload.category === "free") {
            return `
                <div class="cc-lf-float-field-label">${typeof tCC === "function" ? tCC("ccLfColNameLabel") : ""}</div>
                ${typeof renderLfFloatLangFields === "function"
                    ? renderLfFloatLangFields("ccLfName", slot.payload.names, CUSTOM_CLASS_LF_CONFIG.nameMax, false)
                    : ""}`;
        }
        return origNameBody ? origNameBody(slot) : "";
    };

    const origConfigured = typeof isLfOptionsConfigured === "function" ? isLfOptionsConfigured : null;
    isLfOptionsConfigured = function (slot) {
        if (customSpeciesEditorOpen && slot?.payload?.category === "originFeats") {
            const cfg = slot.payload.optionsConfig || {};
            if (slot.payload.featureType === "simple") {
                return Array.isArray(cfg.selectedFeats) && cfg.selectedFeats.length > 0;
            }
            return cfg.featFilter === "all"
                || (Array.isArray(cfg.selectedFeats) && cfg.selectedFeats.length > 0);
        }
        if (cspcIsSpeciesFeatureSlot(slot)
            && slot.payload?.featureType === "options"
            && slot.payload.category === "skills") {
            const cfg = slot.payload.optionsConfig || {};
            if (cfg.skillFilter === "all") return true;
            const min = (typeof CUSTOM_CLASS_LF_CONFIG !== "undefined"
                ? CUSTOM_CLASS_LF_CONFIG.limits?.optionsMinChoices : 2) || 2;
            return Array.isArray(cfg.selectedSkills) && cfg.selectedSkills.length >= min;
        }
        if (cspcIsLineageSpellSlot(slot) && slot.payload?.category === "getPreparedSpell") {
            return cspcLineageSpellLabelsFromConfig(slot.payload.optionsConfig, "getPreparedSpell").length > 0;
        }
        return origConfigured ? origConfigured(slot) : false;
    };

    const origCountOptionsEntries = typeof countLfOptionsEntries === "function" ? countLfOptionsEntries : null;
    countLfOptionsEntries = function (slot) {
        if (customSpeciesEditorOpen
            && slot?.payload?.featureType === "options"
            && slot.payload.category === "originFeats") {
            const cfg = slot.payload.optionsConfig || {};
            if (!cfg.featFilter || cfg.featFilter === "all") {
                return cspcGetOriginFeatItems().length;
            }
            return (cfg.selectedFeats || []).filter(Boolean).length;
        }
        return origCountOptionsEntries ? origCountOptionsEntries(slot) : 0;
    };

    const origOptionsBody = typeof buildLfFloatOptionsBody === "function" ? buildLfFloatOptionsBody : null;
    buildLfFloatOptionsBody = function (slot) {
        if (customSpeciesEditorOpen && slot?.payload?.category === "originFeats") {
            return buildCspcOriginFeatsLfMaskHtml(slot);
        }
        if (cspcIsLineageSpellSlot(slot) && slot.payload?.category === "getPreparedSpell") {
            return buildCspcLineageGetPreparedMaskHtml(slot, slot.payload.optionsConfig || {});
        }
        if (cspcIsSpeciesFeatureSlot(slot)) {
            const type = slot.payload.featureType;
            const cat = slot.payload.category;
            if (type === "options" && cat === "free") {
                return buildCspcSpeciesFreeOptionsMaskHtml(slot);
            }
            if (type === "options" && cat === "skills") {
                return buildCspcSpeciesSkillsOptionsMaskHtml(slot);
            }
        }
        return origOptionsBody ? origOptionsBody(slot) : "<p>—</p>";
    };

    const origApplyOptions = typeof applyLfFloatOptions === "function" ? applyLfFloatOptions : null;
    applyLfFloatOptions = function (slot, opts) {
        if (customSpeciesEditorOpen && slot?.payload?.category === "originFeats") {
            return applyCspcOriginFeatsFromDom(slot, opts || {});
        }
        if (cspcIsLineageSpellSlot(slot) && slot.payload?.category === "getPreparedSpell") {
            return applyCspcLineageGetPreparedFromDom(slot, opts || {});
        }
        if (cspcIsSpeciesFeatureSlot(slot)) {
            const type = slot.payload.featureType;
            const cat = slot.payload.category;
            if (type === "options" && cat === "skills") {
                return applyCspcSpeciesSkillsOptionsFromDom(slot, opts || {});
            }
            if (type === "options" && cat === "free") {
                const ok = origApplyOptions ? origApplyOptions(slot, opts) : true;
                if (ok && slot.payload.optionsConfig) {
                    delete slot.payload.optionsConfig.extendsSlotId;
                }
                return ok;
            }
            if (type === "simple" && cat === "free") {
                return true;
            }
        }
        return origApplyOptions ? origApplyOptions(slot, opts) : true;
    };

    const origBindSpellcraft = typeof bindLfSpellcraftMaskHandlers === "function"
        ? bindLfSpellcraftMaskHandlers : null;
    bindLfSpellcraftMaskHandlers = function (slot) {
        if (cspcIsLineageSpellSlot(slot) && slot.payload?.category === "getPreparedSpell") {
            if (typeof queryAllActiveLfFloat === "function") {
                queryAllActiveLfFloat("#ccLfScSpellLists input, #ccLfScLevels input").forEach(el => {
                    el.onchange = softRebuildCspcLineagePreparedMask;
                });
            }
            cspcUpdateLineagePreparedSpellPickLimits();
            return;
        }
        if (origBindSpellcraft) origBindSpellcraft(slot);
    };

    const origPreDefHtml = typeof buildLfSimplePreDefinedSelectHtml === "function"
        ? buildLfSimplePreDefinedSelectHtml : null;
    buildLfSimplePreDefinedSelectHtml = function (slot) {
        if (customSpeciesEditorOpen && String(slot?.slotId || "").startsWith("cspc-row-")) {
            return buildCspcSpeciesPreDefinedSelectHtml(slot);
        }
        return origPreDefHtml ? origPreDefHtml(slot) : "";
    };

    const origFixedDesc = typeof getLfFixedDescKeys === "function" ? getLfFixedDescKeys : null;
    getLfFixedDescKeys = function (slot) {
        if (cspcIsSpeciesFeatureSlot(slot) && slot.payload.category === "originFeats") {
            if (slot.payload.featureType === "simple") {
                return { shortKey: "cspcOriginFeatSimpleShortD", longKey: null };
            }
            if (slot.payload.featureType === "options") {
                return { shortKey: "cspcOriginFeatOptionsShortD", longKey: null };
            }
        }
        if (customSpeciesEditorOpen
            && slot?.payload?.featureType === "simple"
            && slot.payload.category === "preDefined") {
            const lab = slot.payload.optionsConfig?.preDefinedLabel
                || slot.payload.optionsConfig?.predefinedLabel;
            return cspcSpeciesTraitDescKeys(lab);
        }
        return origFixedDesc ? origFixedDesc(slot) : { shortKey: null, longKey: null };
    };

    const origFixedDescPreview = typeof buildLfFixedDescPreviewBlock === "function"
        ? buildLfFixedDescPreviewBlock : null;
    buildLfFixedDescPreviewBlock = function (labelKey, translationKey, previewOpts) {
        if (customSpeciesEditorOpen && translationKey === "cspcOriginFeatSimpleShortD") {
            const slot = previewOpts?.slot;
            const dynamic = getCspcOriginFeatSimpleShortDescPair(slot);
            if (dynamic) {
                const activeLang = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
                const available = typeof ensureAvailableLanguages === "function"
                    ? ensureAvailableLanguages(getActiveLfEditorLangState())
                    : ["de", "en"];
                const ordered = [activeLang, ...available.filter(l => l !== activeLang)];
                const sections = ordered.map(lang => {
                    const collapsed = lang !== activeLang;
                    const bodyClass = collapsed ? "custom-class-lang-body collapsed" : "custom-class-lang-body";
                    return `
                        <div class="custom-class-lang-block">
                            <div class="custom-class-lang-header" onclick="toggleCcLangHeader(this)">
                                <span>${typeof getCustomClassLangTitle === "function" ? getCustomClassLangTitle(lang) : lang}</span>
                                ${typeof getCcCollapseArrowHtml === "function" ? getCcCollapseArrowHtml(!!collapsed) : ""}
                            </div>
                            <div class="${bodyClass}">
                                <div class="cc-lf-float-preview">${dynamic[lang] || "—"}</div>
                            </div>
                        </div>`;
                }).join("");
                return `
                    <div class="cc-lf-float-field-label">${typeof tCC === "function" ? tCC(labelKey) : labelKey}</div>
                    ${sections}
                `;
            }
        }
        return origFixedDescPreview
            ? origFixedDescPreview(labelKey, translationKey, previewOpts)
            : "";
    };

    const origUsed = typeof getLfUsedSpellcraftSpellLabels === "function"
        ? getLfUsedSpellcraftSpellLabels : null;
    getLfUsedSpellcraftSpellLabels = function (slots, excludeSlotId) {
        if (customSpeciesEditorOpen) {
            const used = new Set();
            (slots || cspcGetAllShimSlots()).forEach(s => {
                if (!s || s.slotId === excludeSlotId) return;
                if (s.payload?.featureType !== "spellcraft") return;
                if (String(s.slotId).startsWith("cspc-lin-")) {
                    cspcLineageSpellLabelsFromConfig(
                        s.payload.optionsConfig || {},
                        s.payload.category
                    ).forEach(lab => used.add(lab));
                } else {
                    const lab = cspcSpellLabelFromConfig(s.payload.optionsConfig || {});
                    if (lab) used.add(lab);
                }
            });
            return used;
        }
        return origUsed ? origUsed(slots, excludeSlotId) : new Set();
    };

    const origSpellSpec = typeof getLfSpellcraftCategorySpec === "function"
        ? getLfSpellcraftCategorySpec : null;
    getLfSpellcraftCategorySpec = function (category) {
        const spec = origSpellSpec ? origSpellSpec(category) : null;
        if (!spec || !customSpeciesEditorOpen) return spec;
        const slotId = typeof ccLfFloatContext !== "undefined" ? (ccLfFloatContext?.slotId || "") : "";
        if (!String(slotId).startsWith("cspc-lin-")) return spec;
        if (category === "getCantrip") {
            return Object.assign({}, spec, { dropdownCount: CSPC_CONFIG.lineageSpellPickMax || 1 });
        }
        if (category === "getPreparedSpell") {
            return Object.assign({}, spec, {
                dropdownCount: CSPC_CONFIG.lineagePreparedSpellDropdownsPerGrade || 2
            });
        }
        return spec;
    };

    const origSpellDropCount = typeof getLfSpellcraftGetDropdownCount === "function"
        ? getLfSpellcraftGetDropdownCount : null;
    getLfSpellcraftGetDropdownCount = function (slot) {
        if (cspcIsLineageSpellSlot(slot)) {
            const cat = slot.payload?.category;
            if (cat === "getPreparedSpell") {
                return CSPC_CONFIG.lineagePreparedSpellDropdownsPerGrade || 2;
            }
            if (cat === "getCantrip") {
                return CSPC_CONFIG.lineageSpellPickMax || 1;
            }
        }
        return origSpellDropCount ? origSpellDropCount(slot) : 1;
    };

    const origOpen = typeof openLfFloat === "function" ? openLfFloat : null;
    if (origOpen) {
        openLfFloat = function (slotId, mode, event) {
            if (customSpeciesEditorOpen && String(slotId || "").startsWith("cspc-")) {
                syncCspcFieldsFromDom();
            }
            origOpen(slotId, mode, event);
            if (customSpeciesEditorOpen && mode === "options") {
                const ctx = (typeof resolveLfSlotContext === "function")
                    ? resolveLfSlotContext(slotId)
                    : null;
                if (cspcIsLineageSpellSlot(ctx?.slot)
                    && ctx.slot.payload?.category === "getPreparedSpell") {
                    cspcUpdateLineagePreparedSpellPickLimits();
                }
            }
        };
    }

    const origApplyPreDef = typeof applyLfSimplePreDefinedFromDom === "function"
        ? applyLfSimplePreDefinedFromDom : null;
    applyLfSimplePreDefinedFromDom = function (slot, opts) {
        if (customSpeciesEditorOpen && String(slot?.slotId || "").startsWith("cspc-row-")) {
            const selectEl = (typeof queryActiveLfFloat === "function")
                ? queryActiveLfFloat("#ccLfPreDefinedSelect")
                : document.getElementById("ccLfPreDefinedSelect");
            if (!selectEl) return true;
            const preDefinedLabel = selectEl.value || "";
            const soft = !!(opts && opts.soft);
            if (!soft && !preDefinedLabel) return false;
            slot.payload.optionsConfig = { preDefinedLabel, predefinedLabel: preDefinedLabel };
            return true;
        }
        return origApplyPreDef ? origApplyPreDef(slot, opts) : true;
    };
}

function buildCspcLabeledFieldHtml(id, label, max, opts) {
    const isArea = !!(opts && opts.textarea);
    const extraClass = (opts && opts.inputClass) ? ` ${opts.inputClass}` : "";
    const fieldClass = (opts && opts.fieldClass) ? ` ${opts.fieldClass}` : "";
    const rows = (opts && opts.rows) || 3;
    const control = isArea
        ? `<textarea id="${id}" maxlength="${max}" rows="${rows}"></textarea>`
        : `<input type="text" id="${id}" class="custom-class-name-input app-small-input${extraClass}" maxlength="${max}">`;
    return `<div class="custom-class-field${fieldClass}">
        <label for="${id}">${escapeCspcHtml(label)}</label>
        ${control}
        <div class="char-counter"><span id="${id}Count">0</span> / ${max}</div>
    </div>`;
}

function cspcGetAvailableLangs() {
    const state = customSpeciesEditorState;
    const active = cspcActiveLang();
    const langs = (state?.availableLanguages || [active]).slice();
    if (!langs.includes(active)) langs.unshift(active);
    return langs;
}

function cspcLocalizedFieldDomId(idBase, lang, multiLang) {
    return multiLang ? `${idBase}_${lang}` : idBase;
}

function toggleCspcFieldLangBlock(idBase, lang, forceCollapse) {
    const body = document.getElementById(`${idBase}_body_${lang}`);
    const indicator = document.getElementById(`${idBase}_toggle_${lang}`);
    if (!body) return;
    let collapsed;
    if (typeof forceCollapse === "boolean") collapsed = forceCollapse;
    else collapsed = !body.classList.contains("collapsed");
    body.classList.toggle("collapsed", collapsed);
    if (indicator) indicator.classList.toggle("is-collapsed", collapsed);
}

function buildCspcLocalizedFieldHtml(idBase, label, max, opts) {
    const available = cspcGetAvailableLangs();
    if (available.length <= 1) {
        return buildCspcLabeledFieldHtml(idBase, label, max, opts);
    }
    const activeLang = cspcActiveLang();
    const isArea = !!(opts && opts.textarea);
    const extraClass = (opts && opts.inputClass) ? ` ${opts.inputClass}` : "";
    const fieldClass = (opts && opts.fieldClass) ? ` ${opts.fieldClass}` : "";
    const rows = (opts && opts.rows) || 3;
    const langBlocks = available.map(lang => {
        const collapsed = lang !== activeLang;
        const collapsedClass = collapsed ? "collapsed" : "";
        const title = (typeof getCustomClassLangTitle === "function")
            ? getCustomClassLangTitle(lang)
            : lang;
        const id = cspcLocalizedFieldDomId(idBase, lang, true);
        const control = isArea
            ? `<textarea id="${id}" maxlength="${max}" rows="${rows}"></textarea>`
            : `<input type="text" id="${id}" class="custom-class-name-input app-small-input${extraClass}" maxlength="${max}">`;
        return `
            <div class="custom-class-lang-block cspc-compact-lang-block" data-lang="${lang}">
                <div class="custom-class-lang-header" onclick="toggleCspcFieldLangBlock('${idBase}', '${lang}')">
                    <span>${title}</span>
                    <span id="${idBase}_toggle_${lang}" class="cc-collapse-arrow${collapsed ? " is-collapsed" : ""}" aria-hidden="true">&#x25BC;</span>
                </div>
                <div id="${idBase}_body_${lang}" class="custom-class-lang-body ${collapsedClass}">
                    ${control}
                    <div class="char-counter"><span id="${id}Count">0</span> / ${max}</div>
                </div>
            </div>`;
    }).join("");
    return `<div class="custom-class-field cspc-localized-field${fieldClass}">
        <div class="cspc-localized-field-label">${escapeCspcHtml(label)}</div>
        ${langBlocks}
    </div>`;
}

function fillCspcLocalizedFieldFromState(idBase, values, max) {
    const available = cspcGetAvailableLangs();
    const multiLang = available.length > 1;
    const activeLang = cspcActiveLang();
    available.forEach(lang => {
        const id = cspcLocalizedFieldDomId(idBase, lang, multiLang);
        const el = document.getElementById(id);
        if (!el) return;
        el.value = values?.[lang] || "";
        cspcBindCharCounter(id, `${id}Count`, max);
        if (multiLang && lang !== activeLang) toggleCspcFieldLangBlock(idBase, lang, true);
    });
}

function syncCspcLocalizedFieldFromDom(idBase, targetObj) {
    if (!targetObj) return;
    const available = cspcGetAvailableLangs();
    const multiLang = available.length > 1;
    available.forEach(lang => {
        const id = cspcLocalizedFieldDomId(idBase, lang, multiLang);
        const el = document.getElementById(id);
        if (el) targetObj[lang] = el.value;
    });
}

function bindCspcLineageNameLiveUpdate(branchIndex, branch) {
    const available = cspcGetAvailableLangs();
    const multiLang = available.length > 1;
    const active = cspcActiveLang();
    const idBase = `cspcLinName_${branchIndex}`;
    available.forEach(lang => {
        const id = cspcLocalizedFieldDomId(idBase, lang, multiLang);
        const n = document.getElementById(id);
        if (!n) return;
        const prevOnInput = n.oninput;
        n.oninput = () => {
            if (typeof prevOnInput === "function") prevOnInput.call(n);
            branch.names[lang] = n.value;
            if (lang === active) {
                const titleEl = document.getElementById(`cspcLinTitle_${branchIndex}`);
                if (titleEl) titleEl.textContent = getCspcLineageDisplayName(branch, branchIndex);
            }
        };
    });
}

function buildCspcLineageSpellTableHtml(branchIndex, spellRows) {
    const headers = [
        tCspc("ccLfColLevelLabel", "Stufe"),
        tCspc("categoryLabel", "Kategorie"),
        tCspc("optionsLabel", "Optionen")
    ];
    const cats = ["getCantrip", "getPreparedSpell"];
    const rows = (spellRows || []).map((row, r) => {
        const slot = cspcLineageSpellToLfSlot(branchIndex, r);
        const empty = !row.category;
        const catOpts = [`<option value="">${escapeCspcHtml(tCspc("pleaseSelectLabel", "Bitte wählen"))}</option>`]
            .concat(cats.map(cat => {
                const sel = row.category === cat ? "selected" : "";
                return `<option value="${cat}" ${sel}>${escapeCspcHtml(cspcCategoryLabel(cat))}</option>`;
            })).join("");
        const optState = (slot && typeof cspcLineageSpellOptionsState === "function")
            ? cspcLineageSpellOptionsState(slot, row)
            : (empty ? "idle" : "empty");
        const optHtml = (slot && typeof buildCspcLineageSpellOptionsCellHtml === "function")
            ? buildCspcLineageSpellOptionsCellHtml(slot)
            : `<span class="cspc-lin-spell-gear-placeholder" aria-hidden="true">${cspcLineageSpellGearIconHtml()}</span>`;
        return `<div class="cc-lf-row cspc-lin-lf-row cc-lf-row--free${empty ? " cc-lf-row--empty" : ""}" role="row">
            <div class="cc-lf-cell cc-lf-cell--center" role="cell">
                <input type="number" id="cspcLinLvl_${branchIndex}_${r}" class="app-small-input cspc-level-input"
                    min="1" max="20" step="1" value="${row.level || ""}"
                    onchange="onCspcLineageSpellRowChange(${branchIndex}, ${r})">
            </div>
            <div class="cc-lf-cell" role="cell">
                <select id="cspcLinCat_${branchIndex}_${r}" class="dropdown cc-lf-select"
                    onchange="onCspcLineageSpellRowChange(${branchIndex}, ${r})">${catOpts}</select>
            </div>
            <div class="cc-lf-cell cc-lf-cell--spell-options cc-lf-cell--spell-options-${optState}" role="cell">${optHtml}</div>
        </div>`;
    }).join("");
    return `<div class="custom-class-field">
        <div class="custom-class-section-title">${escapeCspcHtml(tCspc("ccLfTypeSpellcraftLabel", "Zauberwissen"))}</div>
        <div class="cc-lf-table-wrap">
            <div class="cc-lf-table cspc-lin-lf-table" role="table">
                <div class="cc-lf-header cspc-lin-lf-header" role="row">
                    ${headers.map((h, i) => {
                        const extra = i === 0 ? " cc-lf-cell--center" : "";
                        return `<div class="cc-lf-cell cc-lf-cell--head${extra}" role="columnheader">${escapeCspcHtml(h)}</div>`;
                    }).join("")}
                </div>
                ${rows}
            </div>
        </div>
    </div>`;
}

function onCspcLineageSpellRowChange(branchIndex, rowIndex) {
    const state = customSpeciesEditorState;
    const row = state?.lineages?.[branchIndex]?.spellRows?.[rowIndex];
    if (!row) return;
    const prevCat = row.category || "";
    const catEl = document.getElementById(`cspcLinCat_${branchIndex}_${rowIndex}`);
    const nextCat = catEl ? catEl.value : prevCat;
    if (nextCat !== prevCat) {
        row.category = nextCat;
        row.optionsConfig = {};
        row.spellLabel = "";
    }
    const lvlEl = document.getElementById(`cspcLinLvl_${branchIndex}_${rowIndex}`);
    if (lvlEl) {
        const n = parseInt(lvlEl.value, 10);
        row.level = Number.isFinite(n) ? n : 0;
    }
    syncCspcFieldsFromDom();
    renderCustomSpeciesTab3();
}

//=======================================================================
// Reiter 2 / 3 – Stammbaum
//=======================================================================

function renderCustomSpeciesTab2() {
    const container = document.getElementById("customSpeciesTab2Content");
    const state = customSpeciesEditorState;
    if (!container || !state) return;
    if (state.originBranch !== "ancestry") {
        container.innerHTML = "";
        return;
    }
    const lang = cspcActiveLang();
    const name = (state.names[lang] || state.names.de || state.names.en || "—").trim() || "—";
    const canAdd = state.ancestries.length < CSPC_CONFIG.ancestryMax;
    const canRemove = state.ancestries.length > CSPC_CONFIG.ancestryMin;
    const langHint = cspcGetAvailableLangs().length > 1
        ? `<p class="cspc-origin-hint cspc-origin-lang-hint">${escapeCspcHtml(tCspc("cspcOriginLangHintLabel", ""))}</p>`
        : "";
    container.innerHTML = `
        <div class="cspc-tree cspc-tree--ancestry">
            <div class="cspc-tree-head">
                <div class="cspc-tree-root">${escapeCspcHtml(name)}</div>
                ${buildCspcTreeControlsHtml(canAdd, canRemove, "addCspcAncestryBranch", "removeCspcAncestryBranch")}
            </div>
            ${langHint}
            <div class="cspc-tree-trunk cspc-tree-trunk--to-ancestry-group" aria-hidden="true"></div>
            <div class="cspc-ancestry-group-wrap">
                ${buildCspcLocalizedFieldHtml(
                    "cspcAncestryGroupName",
                    tCspc("cspcAncestryGroupNameLabel", "Bezeichnung (Abstammung)"),
                    CSPC_CONFIG.traitNameMax,
                    { fieldClass: "cspc-compact-field cspc-ancestry-group-field" }
                )}
            </div>
            <div class="cspc-tree-trunk" aria-hidden="true"></div>
            <div class="cspc-tree-bar"></div>
            <div class="cspc-tree-branches">
                ${state.ancestries.map((_, i) => `
                    <div class="cspc-tree-branch">
                        ${buildCspcLocalizedFieldHtml(
                            `cspcAncName_${i}`,
                            tCspc("cspcAncestryPhysicNameLabel", "Bezeichnung (körperliches Merkmal)"),
                            CSPC_CONFIG.ancestryNameMax,
                            { fieldClass: "cspc-compact-field" }
                        )}
                        ${buildCspcLocalizedFieldHtml(
                            `cspcAncDesc_${i}`,
                            tCspc("cspcAncestryAbilityDescLabel", "Beschreibung (Fähigkeit Abstammung)"),
                            CSPC_CONFIG.ancestryDescMax,
                            { textarea: true, rows: 2, fieldClass: "cspc-compact-field" }
                        )}
                    </div>
                `).join("")}
            </div>
        </div>
    `;
    if (!state.ancestryGroupNames) state.ancestryGroupNames = { de: "", en: "" };
    fillCspcLocalizedFieldFromState("cspcAncestryGroupName", state.ancestryGroupNames, CSPC_CONFIG.traitNameMax);
    state.ancestries.forEach((b, i) => {
        if (!b.names) b.names = { de: "", en: "" };
        if (!b.descriptions) b.descriptions = { de: "", en: "" };
        fillCspcLocalizedFieldFromState(`cspcAncName_${i}`, b.names, CSPC_CONFIG.ancestryNameMax);
        fillCspcLocalizedFieldFromState(`cspcAncDesc_${i}`, b.descriptions, CSPC_CONFIG.ancestryDescMax);
    });
}

function addCspcAncestryBranch() {
    const state = customSpeciesEditorState;
    if (!state || state.ancestries.length >= CSPC_CONFIG.ancestryMax) return;
    syncCspcFieldsFromDom();
    state.ancestries.push(createEmptyCspcAncestryBranch());
    renderCustomSpeciesTab2();
}

function removeCspcAncestryBranch() {
    const state = customSpeciesEditorState;
    if (!state || state.ancestries.length <= CSPC_CONFIG.ancestryMin) return;
    syncCspcFieldsFromDom();
    state.ancestries.pop();
    renderCustomSpeciesTab2();
}

function renderCustomSpeciesTab3() {
    const container = document.getElementById("customSpeciesTab3Content");
    const state = customSpeciesEditorState;
    if (!container || !state) return;
    if (state.originBranch !== "lineage") {
        container.innerHTML = "";
        return;
    }
    cspcInstallLfFloatBridges();
    ensureCspcLineageCollapseFlags(state);
    const lang = cspcActiveLang();
    const name = (state.names[lang] || state.names.de || state.names.en || "—").trim() || "—";
    const canAdd = state.lineages.length < CSPC_CONFIG.lineageMax;
    const canRemove = state.lineages.length > CSPC_CONFIG.lineageMin;
    const toggleLabel = tCspc("cspcToggleLineageBranchLabel", "Erblinie auf- oder zuklappen");
    const langHint = cspcGetAvailableLangs().length > 1
        ? `<p class="cspc-origin-hint cspc-origin-lang-hint">${escapeCspcHtml(tCspc("cspcOriginLangHintLabel", ""))}</p>`
        : "";
    container.innerHTML = `
        <div class="cspc-tree cspc-tree--lineage">
            <div class="cspc-tree-head">
                <div class="cspc-tree-root">${escapeCspcHtml(name)}</div>
                ${buildCspcTreeControlsHtml(canAdd, canRemove, "addCspcLineageBranch", "removeCspcLineageBranch")}
            </div>
            ${langHint}
            <div class="cspc-tree-branches">
                ${state.lineages.map((b, i) => {
                    const collapsed = !!b.uiCollapsed;
                    const title = getCspcLineageDisplayName(b, i);
                    return `
                    <div class="cspc-tree-branch cspc-lin-branch cc-sc-box${collapsed ? " cc-sc-box--collapsed is-collapsed" : ""}" data-cspc-lin-index="${i}">
                        <div class="cc-sc-box-header" id="cspcLinHeader_${i}"
                            onclick="toggleCspcLineageBranch(${i})"
                            aria-expanded="${collapsed ? "false" : "true"}"
                            aria-controls="cspcLinBody_${i}"
                            title="${escapeCspcHtml(toggleLabel)}">
                            <span class="cc-sc-box-title" id="cspcLinTitle_${i}">${escapeCspcHtml(title)}</span>
                            <span class="cc-sc-box-actions">
                                <span id="cspcLinToggle_${i}" class="cc-collapse-arrow${collapsed ? " is-collapsed" : ""}" aria-hidden="true">&#x25BC;</span>
                            </span>
                        </div>
                        <div id="cspcLinBody_${i}" class="cc-sc-box-body cspc-lin-branch-body${collapsed ? " collapsed" : ""}">
                            ${buildCspcLocalizedFieldHtml(
                                `cspcLinName_${i}`,
                                tCspc("cspcLineageNameLabel", "Bezeichnung (Erblinie)"),
                                CSPC_CONFIG.lineageNameMax
                            )}
                            ${buildCspcLocalizedFieldHtml(
                                `cspcLinDesc_${i}`,
                                tCspc("cspcLineageDescLabel", "Beschreibung (Erblinie)"),
                                CSPC_CONFIG.lineageDescMax,
                                { textarea: true, rows: 3 }
                            )}
                            ${buildCspcLocalizedFieldHtml(
                                `cspcLinSheet_${i}`,
                                tCspc("cspcLineageAbilityDescLabel", "Beschreibung (Fähigkeit Erblinie)"),
                                CSPC_CONFIG.traitDescMax,
                                { textarea: true, rows: 3 }
                            )}
                            ${buildCspcLineageSpellTableHtml(i, b.spellRows || [])}
                        </div>
                    </div>`;
                }).join("")}
            </div>
        </div>
    `;
    state.lineages.forEach((b, i) => {
        if (!b.names) b.names = { de: "", en: "" };
        if (!b.descriptions) b.descriptions = { de: "", en: "" };
        if (!b.sheetDescriptions) b.sheetDescriptions = { de: "", en: "" };
        fillCspcLocalizedFieldFromState(`cspcLinName_${i}`, b.names, CSPC_CONFIG.lineageNameMax);
        fillCspcLocalizedFieldFromState(`cspcLinDesc_${i}`, b.descriptions, CSPC_CONFIG.lineageDescMax);
        fillCspcLocalizedFieldFromState(`cspcLinSheet_${i}`, b.sheetDescriptions, CSPC_CONFIG.traitDescMax);
        bindCspcLineageNameLiveUpdate(i, b);
    });
}

function getCspcLineageDisplayName(branch, index) {
    const lang = cspcActiveLang();
    const other = lang === "de" ? "en" : "de";
    const multiLang = cspcGetAvailableLangs().length > 1;
    const live = document.getElementById(cspcLocalizedFieldDomId(`cspcLinName_${index}`, lang, multiLang));
    const name = (live?.value || branch?.names?.[lang] || branch?.names?.[other] || "").trim();
    if (name) return name;
    return `${tCspc("lineageLabel", "Erblinie")} ${index + 1}`.trim();
}

function ensureCspcLineageCollapseFlags(state) {
    (state?.lineages || []).forEach((b, i) => {
        if (typeof b.uiCollapsed !== "boolean") b.uiCollapsed = i > 0;
    });
}

function toggleCspcLineageBranch(index) {
    const state = customSpeciesEditorState;
    const branch = state?.lineages?.[index];
    if (!branch) return;
    branch.uiCollapsed = !branch.uiCollapsed;
    const collapsed = !!branch.uiCollapsed;
    const body = document.getElementById(`cspcLinBody_${index}`);
    const arrow = document.getElementById(`cspcLinToggle_${index}`);
    const header = document.getElementById(`cspcLinHeader_${index}`);
    const box = document.querySelector(
        `#customSpeciesTab3Content .cspc-lin-branch[data-cspc-lin-index="${index}"]`
    );
    if (body) body.classList.toggle("collapsed", collapsed);
    if (arrow) arrow.classList.toggle("is-collapsed", collapsed);
    if (header) header.setAttribute("aria-expanded", collapsed ? "false" : "true");
    if (box) {
        box.classList.toggle("is-collapsed", collapsed);
        box.classList.toggle("cc-sc-box--collapsed", collapsed);
    }
}

function addCspcLineageBranch() {
    const state = customSpeciesEditorState;
    if (!state || state.lineages.length >= CSPC_CONFIG.lineageMax) return;
    syncCspcFieldsFromDom();
    const next = createEmptyCspcLineageBranch();
    next.uiCollapsed = true; // Neue Erblinie zugeklappt starten
    state.lineages.push(next);
    renderCustomSpeciesTab3();
}

function removeCspcLineageBranch() {
    const state = customSpeciesEditorState;
    if (!state || state.lineages.length <= CSPC_CONFIG.lineageMin) return;
    syncCspcFieldsFromDom();
    state.lineages.pop();
    renderCustomSpeciesTab3();
}
//=======================================================================
// Sync / Größe
//=======================================================================

function syncCspcFieldsFromDom() {
    const state = customSpeciesEditorState;
    if (!state) return;
    const langs = (typeof getCustomClassSupportedLangs === "function")
        ? getCustomClassSupportedLangs()
        : ["de", "en"];
    langs.forEach(lang => {
        const nameEl = document.getElementById(`cspcName_${lang}`);
        const descEl = document.getElementById(`cspcDesc_${lang}`);
        if (nameEl) state.names[lang] = nameEl.value;
        if (descEl) state.descriptions[lang] = descEl.value;
    });
    if (!state.ancestryGroupNames) state.ancestryGroupNames = { de: "", en: "" };
    syncCspcLocalizedFieldFromDom("cspcAncestryGroupName", state.ancestryGroupNames);
    const ageEl = document.getElementById("cspcAge");
    if (ageEl) {
        const clamped = cspcClampAgeYears(ageEl.value);
        ageEl.value = clamped === "" ? "" : String(clamped);
        state.speciesAge_years = clamped === "" ? "" : clamped;
    }
    const sizeBoxes = Array.from(document.querySelectorAll('input[name="cspcSize"]:checked'));
    if (sizeBoxes.length) state.size = sizeBoxes.map(b => b.value);
    const fromEl = document.getElementById("cspcSizeFrom");
    const toEl = document.getElementById("cspcSizeTo");
    if (fromEl && toEl) {
        let from = Number(fromEl.value);
        let to = Number(toEl.value);
        if (cspcIsDeUi()) {
            from = cspcCmToFt(from);
            to = cspcCmToFt(to);
        }
        state.sizeRange_ft = [cspcRoundFt(from), cspcRoundFt(to)];
    }
    const speedEl = document.getElementById("cspcSpeed");
    if (speedEl) {
        const clamped = cspcClampDisplaySpeed(speedEl.value);
        if (clamped === "") {
            speedEl.value = "";
        } else {
            speedEl.value = String(clamped);
            state.speedFT = cspcRoundFt(cspcDisplaySpeedToFt(clamped));
        }
    }
    const originEl = document.querySelector('input[name="cspcOrigin"]:checked');
    if (originEl) state.originBranch = originEl.value;
    (state.features || []).forEach((row, i) => {
        const lvlEl = document.getElementById(`cspcRowLevel_${i}`);
        if (!lvlEl) return;
        let n = parseInt(lvlEl.value, 10);
        if (!Number.isFinite(n)) return;
        if (n < 1) n = 1;
        if (n > 20) n = 20;
        row.level = n;
    });
    (state.ancestries || []).forEach((b, i) => {
        if (!b.names) b.names = { de: "", en: "" };
        if (!b.descriptions) b.descriptions = { de: "", en: "" };
        syncCspcLocalizedFieldFromDom(`cspcAncName_${i}`, b.names);
        syncCspcLocalizedFieldFromDom(`cspcAncDesc_${i}`, b.descriptions);
    });
    (state.lineages || []).forEach((b, i) => {
        if (!b.names) b.names = { de: "", en: "" };
        if (!b.descriptions) b.descriptions = { de: "", en: "" };
        if (!b.sheetDescriptions) b.sheetDescriptions = { de: "", en: "" };
        syncCspcLocalizedFieldFromDom(`cspcLinName_${i}`, b.names);
        syncCspcLocalizedFieldFromDom(`cspcLinDesc_${i}`, b.descriptions);
        syncCspcLocalizedFieldFromDom(`cspcLinSheet_${i}`, b.sheetDescriptions);
        (b.spellRows || []).forEach((row, r) => {
            const lvl = document.getElementById(`cspcLinLvl_${i}_${r}`);
            const cat = document.getElementById(`cspcLinCat_${i}_${r}`);
            if (lvl) {
                const v = parseInt(lvl.value, 10);
                row.level = Number.isFinite(v) ? v : 0;
            }
            if (cat) row.category = cat.value || "";
            row.spellLabel = cspcSpellLabelFromConfig(row.optionsConfig, row.spellLabel);
        });
    });
}

function buildCspcTreeControlsHtml(canAdd, canRemove, addHandler, removeHandler) {
    return `<div class="cspc-tree-controls">
        <button type="button" class="custom-class-action-btn" ${canAdd ? "" : "disabled"}
            onclick="${addHandler}()">${escapeCspcHtml(tCspc("cspcAddBranchLabel", "+ Ast"))}</button>
        <button type="button" class="custom-class-action-btn" ${canRemove ? "" : "disabled"}
            onclick="${removeHandler}()">${escapeCspcHtml(tCspc("cspcRemoveBranchLabel", "− Ast"))}</button>
    </div>`;
}

function cspcSizeRangeDisplayBounds(unionFt) {
    if (!unionFt) return null;
    if (cspcIsDeUi()) return [cspcFtToCm(unionFt[0]), cspcFtToCm(unionFt[1])];
    return [Number(unionFt[0]), Number(unionFt[1])];
}

function cspcSizeRangeStep() {
    return cspcIsDeUi() ? 1 : 0.1;
}

function cspcFormatSizeRangeDisplay(val) {
    if (cspcIsDeUi()) return String(Math.round(Number(val)));
    return String(cspcRoundFt(val));
}

function applyCspcSizeRangeInputLimits() {
    const state = customSpeciesEditorState;
    const fromEl = document.getElementById("cspcSizeFrom");
    const toEl = document.getElementById("cspcSizeTo");
    if (!fromEl || !toEl) return;
    const union = cspcUnionSizeRangeFt(state?.size || []);
    const bounds = cspcSizeRangeDisplayBounds(union);
    const step = cspcSizeRangeStep();
    if (!bounds) {
        fromEl.disabled = true;
        toEl.disabled = true;
        return;
    }
    fromEl.disabled = false;
    toEl.disabled = false;
    [fromEl, toEl].forEach(el => {
        el.min = String(bounds[0]);
        el.max = String(bounds[1]);
        el.step = String(step);
    });
}

function onCspcSizeRangeInput(which) {
    const el = document.getElementById(which === "from" ? "cspcSizeFrom" : "cspcSizeTo");
    if (!el || el.value === "") return;
    const union = cspcUnionSizeRangeFt(customSpeciesEditorState?.size || []);
    const bounds = cspcSizeRangeDisplayBounds(union);
    if (!bounds) return;
    const v = Number(el.value);
    if (!Number.isFinite(v)) return;
    if (v > bounds[1]) el.value = cspcFormatSizeRangeDisplay(bounds[1]);
}

function onCspcSizeRangeCommit(which) {
    const fromEl = document.getElementById("cspcSizeFrom");
    const toEl = document.getElementById("cspcSizeTo");
    if (!fromEl || !toEl) return;
    const union = cspcUnionSizeRangeFt(customSpeciesEditorState?.size || []);
    const bounds = cspcSizeRangeDisplayBounds(union);
    if (!bounds) return;
    const step = cspcSizeRangeStep();
    let from = fromEl.value === "" ? bounds[0] : Number(fromEl.value);
    let to = toEl.value === "" ? bounds[1] : Number(toEl.value);
    if (!Number.isFinite(from)) from = bounds[0];
    if (!Number.isFinite(to)) to = bounds[1];
    from = Math.min(bounds[1], Math.max(bounds[0], from));
    to = Math.min(bounds[1], Math.max(bounds[0], to));
    if (from >= to) {
        if (which === "from") from = Math.max(bounds[0], to - step);
        else to = Math.min(bounds[1], from + step);
        if (from >= to) {
            from = bounds[0];
            to = Math.min(bounds[1], from + step);
        }
    }
    fromEl.value = cspcFormatSizeRangeDisplay(from);
    toEl.value = cspcFormatSizeRangeDisplay(to);
}

function cspcUnionSizeRangeFt(sizeLabels) {
    const list = typeof sizeList !== "undefined" ? sizeList : [];
    const ranges = list
        .filter(s => sizeLabels.includes(s.sizeCategory))
        .map(s => s.sizeRange_ft);
    if (!ranges.length) return null;
    return [
        Math.min(...ranges.map(r => r[0])),
        Math.max(...ranges.map(r => r[1]))
    ];
}

function cspcSizeRangeValid(state) {
    const union = cspcUnionSizeRangeFt(state.size || []);
    if (!union) return false;
    const from = Number(state.sizeRange_ft?.[0]);
    const to = Number(state.sizeRange_ft?.[1]);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return false;
    const eps = 0.05;
    return from + eps >= union[0] && to - eps <= union[1];
}

//=======================================================================
// Validierung / Compile
//=======================================================================

function validateCustomSpeciesEditorState() {
    const state = customSpeciesEditorState;
    if (!state) return { ok: false, errorKey: "cspcImportInvalidAlertLabel" };
    syncCspcFieldsFromDom();
    if (typeof ensureAvailableLanguages === "function") ensureAvailableLanguages(state);
    const active = cspcActiveLang();
    if (!(state.names[active] || "").trim()) {
        return { ok: false, errorKey: "cspcNameRequiredAlertLabel" };
    }
    if (!(state.descriptions[active] || "").trim()) {
        return { ok: false, errorKey: "cspcDescRequiredAlertLabel" };
    }
    const age = cspcClampAgeYears(state.speciesAge_years);
    if (age === "" || age < 1 || age > 9999) {
        return { ok: false, errorKey: "cspcAgeRequiredAlertLabel" };
    }
    state.speciesAge_years = age;
    if (!Array.isArray(state.size) || !state.size.length) {
        return { ok: false, errorKey: "cspcSizeRequiredAlertLabel" };
    }
    if (!cspcSizeRangeValid(state)) {
        return { ok: false, errorKey: "cspcSizeRangeAlertLabel" };
    }
    const speedDisp = cspcClampDisplaySpeed(cspcFtToDisplaySpeed(state.speedFT));
    if (speedDisp === "" || speedDisp < 0 || speedDisp > 999) {
        return { ok: false, errorKey: "cspcSpeedRequiredAlertLabel" };
    }
    state.speedFT = cspcRoundFt(cspcDisplaySpeedToFt(speedDisp));
    const usedSpellcraft = new Set();
    const usedOnceCats = new Set();
    for (let i = 0; i < (state.features || []).length; i++) {
        const row = state.features[i];
        if (!row.kind) continue;
        if (!row.category) return { ok: false, errorKey: "cspcTraitOptionsRequiredAlertLabel" };
        if (CSPC_SPELLCRAFT_ONCE.includes(row.category)) {
            if (usedSpellcraft.has(row.category)) {
                return { ok: false, errorKey: "cspcSpellcraftOnceAlertLabel" };
            }
            usedSpellcraft.add(row.category);
        }
        const onceCats = CSPC_CONFIG.categoriesOncePerSession || [];
        if (onceCats.includes(row.category) && (row.kind === "simple" || row.kind === "options")) {
            if (usedOnceCats.has(row.category)) {
                return { ok: false, errorKey: "cspcCategoryOnceAlertLabel" };
            }
            usedOnceCats.add(row.category);
        }
        if (row.category === "preDefined") {
            if (!cspcPredefinedLabel(row)) {
                return { ok: false, errorKey: "cspcTraitOptionsRequiredAlertLabel" };
            }
        } else {
            if (cspcRowNeedsCustomName(row) && !(row.names[active] || "").trim()) {
                return { ok: false, errorKey: "cspcTraitNameRequiredAlertLabel" };
            }
            if (cspcRowNeedsCustomShort(row) && !(row.shortDescriptions[active] || "").trim()) {
                return { ok: false, errorKey: "cspcTraitShortRequiredAlertLabel" };
            }
        }
        if (cspcCanOpenOptionsMask(row) && !cspcIsOptionsConfigured(row)) {
            return { ok: false, errorKey: "cspcTraitOptionsRequiredAlertLabel" };
        }
        if (row.kind === "options" && row.category === "originFeats") {
            row.amount = 1;
        }
        if (row.kind === "options"
            && (row.category === "skills" || row.category === "originFeats")
            && !(parseInt(row.amount, 10) > 0)) {
            return { ok: false, errorKey: "cspcTraitOptionsRequiredAlertLabel" };
        }
    }
    if (state.originBranch === "ancestry") {
        const ancGroup = (state.ancestryGroupNames?.[active] || "").trim();
        if (!ancGroup) {
            return { ok: false, errorKey: "cspcAncestryGroupNameRequiredAlertLabel" };
        }
        const named = (state.ancestries || []).filter(b => (b.names[active] || "").trim());
        if (named.length < CSPC_CONFIG.ancestryMin) {
            return { ok: false, errorKey: "cspcAncestryMinAlertLabel" };
        }
    }
    if (state.originBranch === "lineage") {
        const named = (state.lineages || []).filter(b => (b.names[active] || "").trim());
        if (named.length < CSPC_CONFIG.lineageMin) {
            return { ok: false, errorKey: "cspcLineageMinAlertLabel" };
        }
        for (const lin of named) {
            const filled = (lin.spellRows || []).filter(r => {
                return cspcLineageSpellLabelsFromConfig(r.optionsConfig, r.category).length > 0
                    && parseInt(r.level, 10) >= 1;
            });
            for (let i = 1; i < filled.length; i++) {
                if (parseInt(filled[i].level, 10) <= parseInt(filled[i - 1].level, 10)) {
                    return { ok: false, errorKey: "cspcLineageLevelOrderAlertLabel" };
                }
            }
        }
    }
    return { ok: true };
}

function buildCspcStableSlug(state) {
    if (state?.slug && String(state.slug).startsWith("custom_species_")) return state.slug;
    const active = cspcActiveLang();
    const source = state?.names?.[active] || state?.names?.en || state?.names?.de || "species";
    const base = (typeof slugifyClassName === "function")
        ? slugifyClassName(source)
        : String(source).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "species";
    const core = base.startsWith("custom_species_") ? base : `custom_species_${base}`;
    return core.endsWith("Label") ? core : `${core}Label`;
}

function getCspcDateStamp() {
    if (typeof formatCustomClassDate === "function") return formatCustomClassDate(new Date());
    const d = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${String(d.getDate()).padStart(2, "0")}${months[d.getMonth()]}${d.getFullYear()}`;
}

function buildCustomSpeciesFilename(state) {
    const active = cspcActiveLang();
    const other = active === "de" ? "en" : "de";
    const raw = state?.names?.[active] || state?.names?.[other] || "species";
    const nameSlug = (typeof slugifyClassName === "function")
        ? slugifyClassName(raw)
        : String(raw).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "species";
    return `${CSPC_CONFIG.filenamePrefix}_${nameSlug}_${getCspcDateStamp()}.json`;
}

function cspcSkillLabelToNumber(label) {
    if (typeof cffSkillLabelToNumber === "function") return cffSkillLabelToNumber(label);
    const sk = (typeof skillList !== "undefined" ? skillList : []).find(s => s.translationLabel === label);
    return sk ? sk.skillCategoryNumber : NaN;
}

function cspcFeatLabelToId(label) {
    const feats = (typeof getEffectiveFeatList === "function")
        ? getEffectiveFeatList()
        : ((typeof featList !== "undefined") ? featList : []);
    const f = feats.find(x => x.translationLabel === label);
    return f ? f.ID : null;
}

function cspcComputeCharacterSheet(row, hasLongDesc) {
    if (!hasLongDesc) return 0;
    const lvl = Math.max(1, parseInt(row.level, 10) || 1);
    return lvl > 1 ? `1:LEVEL:${lvl}` : 1;
}

/** PHB-Erblinie: Sheet-Fuß mit CHOICE_LIST unter speciesSpellsLabel. */
function cspcLineageSpellChoiceListSuffix(lang) {
    return lang === "en"
        ? "<br><br>You know the following spells:<br>[CHOICE_LIST]preparedSpells.source.name.speciesSpellsLabel[/CHOICE_LIST]"
        : "<br><br>Du beherrscht folgende Zauber:<br>[CHOICE_LIST]preparedSpells.source.name.speciesSpellsLabel[/CHOICE_LIST]";
}

/**
 * Hängt den PHB-analogen Volkszauber-Block an die Erblinien-Sheetbeschreibung an
 * (nur wenn Zauber vorhanden und Tag noch fehlt).
 */
function cspcAppendLineageSpellChoiceList(text, lang) {
    const raw = String(text || "");
    if (/preparedSpells\.source\.name\.speciesSpellsLabel/i.test(raw)) return raw;
    return raw + cspcLineageSpellChoiceListSuffix(lang);
}

function buildCompiledCustomSpecies(state, slug) {
    const traitLabels = [];
    const compiledTraits = [];
    const translationsBlock = { de: {}, en: {} };
    const magicFeatures = [];
    const customGrants = { skillsGet: [], featsGet: [] };
    let hasSpeciesSpells = false;
    let nextTraitCat = 1000;
    let nextMagicId = 1000;

    const putT = (key, de, en) => {
        translationsBlock.de[key] = de || en || "";
        translationsBlock.en[key] = en || de || "";
    };

    putT(slug, state.names.de, state.names.en);
    const dKey = `${slug.replace(/Label$/, "")}D`;
    putT(dKey, state.descriptions.de, state.descriptions.en);

    let ancestryBridgeLabel = null;
    let lineageBridgeLabel = null;
    if (state.originBranch === "ancestry") {
        ancestryBridgeLabel = `${slug.replace(/Label$/, "")}_ancestryLabel`;
        const ancDe = (state.ancestryGroupNames?.de || "").trim() || state.names.de;
        const ancEn = (state.ancestryGroupNames?.en || "").trim() || state.names.en;
        putT(ancestryBridgeLabel, ancDe, ancEn);
        compiledTraits.push({
            speciesTraitCategoryNumber: nextTraitCat++,
            speciesTraitLabel: ancestryBridgeLabel,
            spellLabel: 0,
            skillLabel: 0,
            featLabel: 0,
            characterSheet: "0:ANC",
            speciesTraitDSheet: 0,
            speciesTraitDLabel: 0,
            speciesTraitShortDLabel: "custom_species_ancestryShort",
            isCustom: true
        });
        traitLabels.push(ancestryBridgeLabel);
    }
    if (state.originBranch === "lineage") {
        lineageBridgeLabel = `${slug.replace(/Label$/, "")}_lineageLabel`;
        putT(lineageBridgeLabel, state.names.de, state.names.en);
        compiledTraits.push({
            speciesTraitCategoryNumber: nextTraitCat++,
            speciesTraitLabel: lineageBridgeLabel,
            spellLabel: 0,
            skillLabel: 0,
            featLabel: 0,
            characterSheet: "0:LIN",
            speciesTraitDSheet: 0,
            speciesTraitDLabel: 0,
            speciesTraitShortDLabel: "custom_species_lineageShort",
            isCustom: true
        });
        traitLabels.push(lineageBridgeLabel);
    }

    (state.features || []).forEach((row, i) => {
        if (!row.kind || !row.category) return;
        if (row.category === "preDefined") {
            const lab = cspcPredefinedLabel(row);
            if (lab && !traitLabels.includes(lab)) traitLabels.push(lab);
            return;
        }
        const traitLabel = `${slug.replace(/Label$/, "")}_t${i + 1}Label`;
        const shortKey = `${slug.replace(/Label$/, "")}_t${i + 1}ShortD`;
        const sheetKey = `${slug.replace(/Label$/, "")}_t${i + 1}DSheet`;
        const longKey = `${slug.replace(/Label$/, "")}_t${i + 1}D`;
        const names = cspcCompiledNamePair(row, i);
        const shorts = cspcCompiledShortPair(row, i);
        putT(traitLabel, names.de, names.en);
        putT(shortKey, shorts.de, shorts.en);
        const hasLong = !!(String(row.descriptions?.de || row.descriptions?.en || "").trim());
        if (hasLong) {
            putT(sheetKey, row.descriptions.de, row.descriptions.en);
            putT(longKey, row.descriptions.de, row.descriptions.en);
        }
        let spellLabel = 0;
        let skillLabel = 0;
        let featLabel = 0;
        const cfg = row.optionsConfig || {};
        if (row.category === "skills") {
            if (row.kind === "simple") {
                skillLabel = (cfg.selectedSkills || []).slice();
                skillLabel.forEach(lab => {
                    const n = cspcSkillLabelToNumber(lab);
                    if (Number.isFinite(n) && !customGrants.skillsGet.includes(n)) {
                        customGrants.skillsGet.push(n);
                    }
                });
            } else {
                skillLabel = cfg.skillFilter === "selection" && (cfg.selectedSkills || []).length
                    ? cfg.selectedSkills.slice()
                    : 1;
            }
        }
        if (row.category === "originFeats") {
            if (row.kind === "simple") {
                featLabel = (cfg.selectedFeats || [])[0] || 0;
                const id = cspcFeatLabelToId(featLabel);
                if (id != null) customGrants.featsGet.push(id);
            } else {
                featLabel = cfg.featFilter === "selection" && (cfg.selectedFeats || []).length
                    ? cfg.selectedFeats.slice()
                    : 1;
            }
        }
        let freeChoiceOptions = null;
        let freeChoiceFamilyId = null;
        if (row.kind === "options" && row.category === "free") {
            const choices = Array.isArray(cfg.choices)
                ? cfg.choices.filter(c => {
                    if (typeof lfHasText === "function") return lfHasText(c?.names || c);
                    const n = c?.names || {};
                    return !!(String(n.de || n.en || "").trim());
                })
                : [];
            if (choices.length >= 2) {
                const familyId = `${slug.replace(/Label$/, "")}_fc${i + 1}`;
                freeChoiceFamilyId = familyId;
                freeChoiceOptions = choices.map((c, j) => {
                    const optKey = `${traitLabel.replace(/Label$/, "")}_opt${j + 1}`;
                    const optDescKey = `${optKey}D`;
                    const value = `${familyId}__${j + 1}`;
                    putT(
                        optKey,
                        typeof pickCompiledLocaleText === "function"
                            ? pickCompiledLocaleText(c.names, "de")
                            : (c.names?.de || c.names?.en || ""),
                        typeof pickCompiledLocaleText === "function"
                            ? pickCompiledLocaleText(c.names, "en")
                            : (c.names?.en || c.names?.de || "")
                    );
                    if (typeof lfHasText === "function" && lfHasText(c.descriptions)) {
                        putT(
                            optDescKey,
                            pickCompiledLocaleText(c.descriptions, "de"),
                            pickCompiledLocaleText(c.descriptions, "en")
                        );
                    }
                    return {
                        value,
                        translationLabel: optKey,
                        descriptionLabel: (typeof lfHasText === "function" && lfHasText(c.descriptions))
                            ? optDescKey
                            : 0
                    };
                });
            }
        }
        if (row.kind === "spellcraft") {
            hasSpeciesSpells = true;
            if (row.category === "getCantrip" || row.category === "getPreparedSpell") {
                const spellLabels = cspcLineageSpellLabelsFromConfig(cfg, row.category);
                spellLabel = spellLabels.length === 0
                    ? 0
                    : (spellLabels.length === 1 ? spellLabels[0] : spellLabels);
            } else {
                const pick = Math.max(1, parseInt(cfg.pickCount, 10) || 1);
                magicFeatures.push({
                    ID: nextMagicId++,
                    translationLabel: traitLabel,
                    getSpellList_c: 0,
                    getSpellList_sl: 0,
                    chooseNonSpecificSpell_c: 0,
                    chooseNonSpecificSpell_ss: 0,
                    chooseNonSpecificSpell_sf: 0,
                    chooseNonSpecific_sl: row.category === "chooseCantrip"
                        ? ["cantripLabel"]
                        : ["1stLevelLabel"],
                    chooseNonSpecificSpell_a: pick,
                    getSpecificSpell: 0,
                    chooseType: row.category === "chooseCantrip" ? 1 : 3,
                    isCustom: true,
                    isCustomSpecies: true
                });
            }
        }
        // Sheet: vorbereitete Zauber wählen/erhalten → Auto-CHOICE_LIST (wie Klassenbauer)
        let sheetHasDesc = hasLong;
        let sheetDescKey = hasLong ? sheetKey : 0;
        let longDescKey = hasLong ? longKey : 0;
        if (row.kind === "spellcraft"
            && (row.category === "choosePreparedSpell" || row.category === "getPreparedSpell")
            && typeof formatLfChoosePreparedSpellDesc === "function") {
            putT(
                sheetKey,
                formatLfChoosePreparedSpellDesc(traitLabel, "de"),
                formatLfChoosePreparedSpellDesc(traitLabel, "en")
            );
            sheetHasDesc = true;
            sheetDescKey = sheetKey;
            if (hasLong) {
                putT(longKey, row.descriptions.de, row.descriptions.en);
                longDescKey = longKey;
            } else {
                longDescKey = 0;
            }
        }
        compiledTraits.push({
            speciesTraitCategoryNumber: nextTraitCat++,
            speciesTraitLabel: traitLabel,
            spellLabel,
            skillLabel,
            featLabel,
            characterSheet: cspcComputeCharacterSheet(row, sheetHasDesc),
            speciesTraitDSheet: sheetDescKey,
            speciesTraitDLabel: longDescKey,
            speciesTraitShortDLabel: shortKey,
            isCustom: true,
            customChoiceAmount: (() => {
                if (row.kind === "options" && row.category === "originFeats") return 1;
                if (row.kind === "options" && row.category === "skills") {
                    return parseInt(row.amount, 10) || 1;
                }
                if (row.kind === "options" && row.category === "free" && freeChoiceOptions) {
                    return Math.max(1, parseInt(row.amount, 10) || 1);
                }
                return 0;
            })(),
            freeChoiceOptions: freeChoiceOptions || 0,
            freeChoiceFamilyId: freeChoiceFamilyId || 0
        });
        traitLabels.push(traitLabel);
    });

    const compiledAncestry = [];
    const ancestryLabels = [];
    if (state.originBranch === "ancestry") {
        (state.ancestries || []).forEach((b, i) => {
            if (!(b.names.de || b.names.en || "").trim()) return;
            const aLabel = `${slug.replace(/Label$/, "")}_anc${i + 1}Label`;
            const pLabel = `${slug.replace(/Label$/, "")}_anc${i + 1}PhysicLabel`;
            const dLabel = `${slug.replace(/Label$/, "")}_anc${i + 1}D`;
            putT(aLabel, b.names.de, b.names.en);
            putT(pLabel, b.names.de, b.names.en);
            putT(dLabel, b.descriptions.de, b.descriptions.en);
            ancestryLabels.push(aLabel);
            compiledAncestry.push({
                species: slug,
                speciesTraitLabel: ancestryBridgeLabel,
                ancestryLabel: aLabel,
                physicAncestryLabel: pLabel,
                damageType: 0,
                characterSheet: 1,
                ancestryDLabel: dLabel,
                isCustom: true
            });
        });
    }

    const compiledLineage = [];
    const lineageLabels = [];
    if (state.originBranch === "lineage") {
        (state.lineages || []).forEach((b, i) => {
            if (!(b.names.de || b.names.en || "").trim()) return;
            const lLabel = `${slug.replace(/Label$/, "")}_lin${i + 1}Label`;
            const dLabel = `${slug.replace(/Label$/, "")}_lin${i + 1}D`;
            const tLabel = `${slug.replace(/Label$/, "")}_lin${i + 1}TraitD`;
            const sheetLabel = `${slug.replace(/Label$/, "")}_lin${i + 1}TraitDSheet`;
            putT(lLabel, b.names.de, b.names.en);
            putT(dLabel, b.descriptions.de, b.descriptions.en);
            const filledSpells = (b.spellRows || []).filter(r => {
                return cspcLineageSpellLabelsFromConfig(r.optionsConfig, r.category).length > 0
                    && parseInt(r.level, 10) >= 1;
            });
            const sheetDe = filledSpells.length
                ? cspcAppendLineageSpellChoiceList(b.sheetDescriptions?.de, "de")
                : (b.sheetDescriptions?.de || "");
            const sheetEn = filledSpells.length
                ? cspcAppendLineageSpellChoiceList(b.sheetDescriptions?.en, "en")
                : (b.sheetDescriptions?.en || "");
            // Infobox (Ersteller): nur Nutzertext; Sheet-Key inkl. CHOICE_LIST für Charakterbogen
            putT(tLabel, b.sheetDescriptions?.de || "", b.sheetDescriptions?.en || "");
            putT(sheetLabel, sheetDe, sheetEn);
            lineageLabels.push(lLabel);
            compiledLineage.push({
                level: 1,
                species: slug,
                speciesTraitLabel: lineageBridgeLabel,
                lineageLabel: lLabel,
                lineageDLabel: dLabel,
                spellLabel: 0,
                lineageTraitDLabel: tLabel,
                characterSheet: 1,
                lineageTraitDSheet: sheetLabel,
                isCustom: true
            });
            filledSpells.forEach(r => {
                hasSpeciesSpells = true;
                const lvl = parseInt(r.level, 10);
                const labels = cspcLineageSpellLabelsFromConfig(r.optionsConfig, r.category);
                if (!labels.length) return;
                const spellLabel = labels.length === 1 ? labels[0] : labels;
                if (lvl === 1) {
                    compiledLineage[compiledLineage.length - 1].spellLabel = spellLabel;
                    return;
                }
                compiledLineage.push({
                    level: lvl,
                    species: slug,
                    speciesTraitLabel: lineageBridgeLabel,
                    lineageLabel: lLabel,
                    lineageDLabel: 0,
                    spellLabel,
                    lineageTraitDLabel: 0,
                    characterSheet: 0,
                    lineageTraitDSheet: 0,
                    isCustom: true
                });
            });
        });
    }

    if (compiledTraits.some(t => t.spellLabel && t.spellLabel !== 0)) hasSpeciesSpells = true;

    const entry = {
        ID: CSPC_CONFIG.speciesId,
        translationLabel: slug,
        creatureType: "humanoidLabel",
        speciesAge_years: parseInt(state.speciesAge_years, 10),
        size: state.size.slice(),
        sizeRange_ft: [Number(state.sizeRange_ft[0]), Number(state.sizeRange_ft[1])],
        speedFT: Number(state.speedFT),
        speciesTraitLabel: traitLabels,
        ancestryLabel: ancestryLabels.length ? ancestryLabels : 0,
        lineageLabel: lineageLabels.length ? lineageLabels : 0,
        speciesDLabel: dKey,
        source: (typeof CUSTOM_CONTENT_SOURCE !== "undefined"
            ? CUSTOM_CONTENT_SOURCE.slice()
            : ["dicecharacters"]),
        isCustom: true,
        hasSpeciesSpells,
        customGrants
    };

    return {
        entry,
        traits: compiledTraits,
        ancestries: compiledAncestry,
        lineages: compiledLineage,
        magicFeatures,
        translations: translationsBlock,
        dKey
    };
}

function buildCspcEditorStateSnapshot(state, slug) {
    return {
        slug,
        packageId: state.packageId || null,
        packageCreatedAt: state.packageCreatedAt || null,
        availableLanguages: (state.availableLanguages || []).slice(),
        names: { de: state.names?.de || "", en: state.names?.en || "" },
        descriptions: { de: state.descriptions?.de || "", en: state.descriptions?.en || "" },
        ancestryGroupNames: {
            de: state.ancestryGroupNames?.de || "",
            en: state.ancestryGroupNames?.en || ""
        },
        speciesAge_years: state.speciesAge_years,
        size: (state.size || []).slice(),
        sizeRange_ft: (state.sizeRange_ft || []).slice(),
        speedFT: state.speedFT,
        originBranch: state.originBranch,
        features: (state.features || []).map(r => cspcNormalizeFeatureRow(r)),
        ancestries: (state.ancestries || []).map(b => ({
            names: { de: b.names?.de || "", en: b.names?.en || "" },
            descriptions: { de: b.descriptions?.de || "", en: b.descriptions?.en || "" }
        })),
        lineages: (state.lineages || []).map(b => ({
            names: { de: b.names?.de || "", en: b.names?.en || "" },
            descriptions: { de: b.descriptions?.de || "", en: b.descriptions?.en || "" },
            sheetDescriptions: {
                de: b.sheetDescriptions?.de || "",
                en: b.sheetDescriptions?.en || ""
            },
            spellRows: (b.spellRows || []).map((r, i) => cspcNormalizeSpellRow(r, i))
        }))
    };
}

function buildCustomSpeciesPackageDependencies(state) {
    const scan = {
        spellIds: [],
        featIds: [],
        spellLabels: [],
        featLabels: []
    };
    if (typeof walkDcLfSlotsForCustomRefs === "function") {
        const shimSlots = (typeof cspcGetAllShimSlots === "function")
            ? cspcGetAllShimSlots()
            : [];
        walkDcLfSlotsForCustomRefs(shimSlots, scan);
    }
    (state?.features || []).forEach(row => {
        if (row.category === "originFeats") {
            const cfg = row.optionsConfig || {};
            if (row.kind === "simple") {
                (cfg.selectedFeats || []).filter(Boolean).forEach(l => scan.featLabels.push(String(l)));
            } else if (cfg.featFilter === "selection") {
                (cfg.selectedFeats || []).filter(Boolean).forEach(l => scan.featLabels.push(String(l)));
            }
        }
    });
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

function buildCustomSpeciesExportPayload(state) {
    const slug = buildCspcStableSlug(state);
    state.slug = slug;
    if (!state.packageId && typeof createDcPackageId === "function") {
        state.packageId = createDcPackageId();
        state.packageCreatedAt = new Date().toISOString();
    }
    const compiled = buildCompiledCustomSpecies(state, slug);
    const flatPayload = {
        version: 1,
        type: "customSpecies",
        slug,
        packageId: state.packageId || null,
        availableLanguages: (state.availableLanguages || []).slice(),
        translations: compiled.translations,
        compiledSpeciesListEntry: compiled.entry,
        compiledSpeciesTraitList: compiled.traits,
        compiledAncestryList: compiled.ancestries,
        compiledLineageList: compiled.lineages,
        compiledMagicFeatures: compiled.magicFeatures,
        editorState: buildCspcEditorStateSnapshot(state, slug)
    };
    if (typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined") {
        const dependencies = (typeof buildCustomSpeciesPackageDependencies === "function")
            ? buildCustomSpeciesPackageDependencies(state)
            : [];
        return wrapDcPackage({
            packageType: DC_PACKAGE_TYPE.CUSTOM_SPECIES,
            packageId: state.packageId || undefined,
            createdAt: state.packageCreatedAt || undefined,
            provides: [{ kind: "species", slug, id: CSPC_CONFIG.speciesId }],
            dependencies,
            payload: flatPayload
        });
    }
    return flatPayload;
}

function getCustomSpeciesExportSnapshotString(exportData) {
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

function downloadCspcJson(filename, data) {
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

function saveCustomSpecies() {
    const result = validateCustomSpeciesEditorState();
    if (!result.ok) {
        alert(tCspc(result.errorKey, result.errorKey));
        return;
    }
    const state = customSpeciesEditorState;
    const payload = buildCustomSpeciesExportPayload(state);
    if (payload?.dc?.packageId) {
        state.packageId = payload.dc.packageId;
        state.packageCreatedAt = payload.dc.createdAt || state.packageCreatedAt;
    }
    const currentSnapshot = getCustomSpeciesExportSnapshotString(payload);
    const hasChanges = customSpeciesImportSnapshot === null
        || currentSnapshot !== customSpeciesImportSnapshot;
    if (hasChanges) {
        downloadCspcJson(buildCustomSpeciesFilename(state), payload);
    }
    customSpeciesImportSnapshot = currentSnapshot;
    registerCustomSpeciesInRuntime(payload);
    customSpeciesEditorState = null;
    customSpeciesEditorOpen = false;
    closeCustomSpeciesModal();
}

//=======================================================================
// Runtime
//=======================================================================

function unregisterPreviousCustomSpecies() {
    const oldSlug = registeredCustomSpecies?.translationLabel;
    const oldKeys = registeredCustomSpecies?.translationKeys || [];
    const strip = (arr, pred) => {
        if (!Array.isArray(arr)) return;
        for (let i = arr.length - 1; i >= 0; i--) {
            if (pred(arr[i])) arr.splice(i, 1);
        }
    };
    strip(typeof speciesList !== "undefined" ? speciesList : null, e =>
        e && (e.isCustom || e.ID === CSPC_CONFIG.speciesId || e.translationLabel === oldSlug));
    strip(typeof speciesTraitList !== "undefined" ? speciesTraitList : null, e =>
        e && (e.isCustom || (oldSlug && String(e.speciesTraitLabel || "").startsWith(String(oldSlug).replace(/Label$/, "")))));
    strip(typeof ancestryList !== "undefined" ? ancestryList : null, e =>
        e && (e.isCustom || e.species === oldSlug));
    strip(typeof lineageList !== "undefined" ? lineageList : null, e =>
        e && (e.isCustom || e.species === oldSlug));
    oldKeys.forEach(key => {
        if (translations?.de) delete translations.de[key];
        if (translations?.en) delete translations.en[key];
    });
    const listItem = document.getElementById("customSpeciesListItem");
    const radio = document.getElementById("customSpeciesRadio");
    if (radio) radio.value = "";
    if (listItem) listItem.style.display = "none";
    registeredCustomSpecies = {
        translationLabel: null,
        id: null,
        translationKeys: [],
        compiledSpeciesListEntry: null,
        compiledSpeciesTraitList: [],
        compiledAncestryList: [],
        compiledLineageList: [],
        compiledMagicFeatures: [],
        packageId: null,
        verificationCode: null,
        rawPayload: null,
        envelope: null
    };
}

function clearSpeciesSelectionUI() {
    document.querySelectorAll('input[name="species"]').forEach(r => { r.checked = false; });
    if (typeof character !== "undefined") {
        character.species = null;
        character.lineage = null;
        character.ancestry = null;
        character.feat_species = [];
        character.spellcastingAbility_species = null;
    }
    if (typeof tempLineage !== "undefined") tempLineage = null;
    if (typeof tempAncestry !== "undefined") tempAncestry = null;
    if (typeof tempFeatSpecies !== "undefined") tempFeatSpecies = [];
    if (typeof tempSpellAbilitySpecies !== "undefined") tempSpellAbilitySpecies = null;
    const traits = document.getElementById("speciesTraitsContainer");
    if (traits) traits.style.display = "none";
    const textWrap = document.getElementById("speciesTextContainer");
    if (textWrap) textWrap.style.display = "none";
    document.querySelectorAll(".speciesDLabel").forEach(el => { el.style.display = "none"; });
    const speciesImageBox = document.getElementById("speciesImageBox");
    if (speciesImageBox) {
        speciesImageBox.innerHTML = "";
        speciesImageBox.style.display = "none";
    }
    const lineageDetailBox = document.getElementById("lineageDetailBox");
    if (lineageDetailBox) lineageDetailBox.style.display = "none";
    const lineageImageBox = document.getElementById("lineageImageBox");
    if (lineageImageBox) {
        lineageImageBox.innerHTML = "";
        lineageImageBox.style.display = "none";
    }
    if (typeof updateLineageUI === "function") updateLineageUI();
}

function refreshCustomSpeciesListItemUI() {
    const slug = registeredCustomSpecies?.translationLabel;
    const listItem = document.getElementById("customSpeciesListItem");
    const radio = document.getElementById("customSpeciesRadio");
    const label = document.getElementById("customSpeciesRadioLabel");
    const marker = document.getElementById("customSpeciesContentMarker");
    if (!slug || !listItem || !radio) {
        if (typeof setCustomContentMarkerVisible === "function") {
            setCustomContentMarkerVisible(marker, false);
        }
        return;
    }
    radio.value = slug;
    if (label) {
        const lang = typeof currentLang !== "undefined" ? currentLang : "de";
        label.textContent = (translations?.[lang]?.[slug]) || slug;
    }
    listItem.style.display = "";
    if (typeof setCustomContentMarkerVisible === "function") {
        setCustomContentMarkerVisible(marker, true);
    }
    const dNode = document.getElementById("customSpeciesD");
    const dKey = registeredCustomSpecies.compiledSpeciesListEntry?.speciesDLabel;
    if (dNode && dKey) {
        const lang = typeof currentLang !== "undefined" ? currentLang : "de";
        dNode.textContent = translations?.[lang]?.[dKey] || "";
    }
}

function registerCustomSpeciesInRuntime(rawOrEnvelope) {
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
    if (!payload
        || (payload.type !== "customSpecies" && payload.type !== "customSpeciesRuntime")
        || !payload.compiledSpeciesListEntry
        || !payload.slug) {
        return false;
    }
    unregisterPreviousCustomSpecies();
    clearSpeciesSelectionUI();
    if (payload.translations?.de && typeof translations !== "undefined") {
        Object.assign(translations.de, payload.translations.de);
    }
    if (payload.translations?.en && typeof translations !== "undefined") {
        Object.assign(translations.en, payload.translations.en);
    }
    const entry = Object.assign({}, payload.compiledSpeciesListEntry, {
        ID: CSPC_CONFIG.speciesId,
        isCustom: true
    });
    if (typeof applyCustomContentSource === "function") applyCustomContentSource(entry);
    if (typeof speciesList !== "undefined" && Array.isArray(speciesList)) speciesList.push(entry);
    (payload.compiledSpeciesTraitList || []).forEach(t => {
        if (typeof speciesTraitList !== "undefined") speciesTraitList.push(Object.assign({}, t, { isCustom: true }));
    });
    (payload.compiledAncestryList || []).forEach(a => {
        if (typeof ancestryList !== "undefined") ancestryList.push(Object.assign({}, a, { isCustom: true }));
    });
    (payload.compiledLineageList || []).forEach(l => {
        if (typeof lineageList !== "undefined") lineageList.push(Object.assign({}, l, { isCustom: true }));
    });
    const keys = Object.keys(payload.translations?.de || {});
    registeredCustomSpecies = {
        translationLabel: payload.slug,
        id: CSPC_CONFIG.speciesId,
        translationKeys: keys,
        compiledSpeciesListEntry: entry,
        compiledSpeciesTraitList: payload.compiledSpeciesTraitList || [],
        compiledAncestryList: payload.compiledAncestryList || [],
        compiledLineageList: payload.compiledLineageList || [],
        compiledMagicFeatures: payload.compiledMagicFeatures || [],
        packageId: envelope?.packageId || payload.packageId || null,
        verificationCode: envelope?.verificationCode
            || (envelope?.packageId && typeof buildDcVerificationCode === "function"
                ? buildDcVerificationCode(DC_PACKAGE_TYPE.CUSTOM_SPECIES, envelope.packageId)
                : null),
        rawPayload: payload,
        envelope: envelope || null
    };
    refreshCustomSpeciesListItemUI();
    persistCustomSpeciesRuntimeToLocalStorage();
    if (typeof markDcPackageUserLoaded === "function" && typeof DC_PACKAGE_TYPE !== "undefined") {
        markDcPackageUserLoaded(DC_PACKAGE_TYPE.CUSTOM_SPECIES);
    }
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
    return true;
}

function persistCustomSpeciesRuntimeToLocalStorage() {
    if (!registeredCustomSpecies?.rawPayload) return false;
    const base = registeredCustomSpecies.rawPayload;
    const flat = {
        version: 1,
        type: "customSpeciesRuntime",
        slug: registeredCustomSpecies.translationLabel,
        packageId: registeredCustomSpecies.packageId || base.packageId || null,
        availableLanguages: base.availableLanguages || [],
        translations: base.translations || { de: {}, en: {} },
        compiledSpeciesListEntry: registeredCustomSpecies.compiledSpeciesListEntry,
        compiledSpeciesTraitList: registeredCustomSpecies.compiledSpeciesTraitList,
        compiledAncestryList: registeredCustomSpecies.compiledAncestryList,
        compiledLineageList: registeredCustomSpecies.compiledLineageList,
        compiledMagicFeatures: registeredCustomSpecies.compiledMagicFeatures,
        editorState: base.editorState || null
    };
    try {
        const wrapped = (typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined")
            ? wrapDcPackage({
                packageType: DC_PACKAGE_TYPE.CUSTOM_SPECIES,
                packageId: registeredCustomSpecies.packageId || undefined,
                provides: [{
                    kind: "speciesRuntime",
                    slug: registeredCustomSpecies.translationLabel
                }],
                dependencies: registeredCustomSpecies.envelope?.dependencies || [],
                payload: flat
            })
            : flat;
        localStorage.setItem(CUSTOM_SPECIES_LS_KEY, JSON.stringify(wrapped));
        return true;
    } catch (e) {
        console.warn("customSpeciesRuntime speichern fehlgeschlagen:", e);
        return false;
    }
}

function isRegisteredCustomSpeciesSlug(speciesName) {
    if (!speciesName || !registeredCustomSpecies?.translationLabel) return false;
    return String(speciesName).toLowerCase().trim()
        === String(registeredCustomSpecies.translationLabel).toLowerCase().trim();
}

function applyCspcTranslations() {
    const set = (id, key, fallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = tCspc(key, fallback);
    };
    set("customSpeciesModalTitleLabel", "cspcModalTitleLabel", "Eigenes Volk");
    set("customSpeciesCreateNewBtn", "cspcCreateNewLabel", "Volk erstellen");
    set("customSpeciesUploadBtn", "cspcUploadLabel", "Volk hochladen (.json)");
    set("customSpeciesEditorTitleLabel", "cspcEditorTitleLabel", "Eigenes Volk");
    set("customSpeciesTabStemBtn", "cspcTabStemLabel", "Volksstamm");
    set("customSpeciesTabAncestryBtn", "cspcTabAncestryLabel", "Abstammung");
    set("customSpeciesTabLineageBtn", "cspcTabLineageLabel", "Erblinie");
    set("customSpeciesSaveBtn", "cfSaveLabel", "Speichern");
    const addBtn = document.getElementById("addCustomSpeciesBtn");
    if (addBtn) {
        const label = tCspc("addCustomSpeciesLabel", "Eigenes Volk erstellen");
        addBtn.title = label;
        addBtn.setAttribute("aria-label", label);
    }
    if (registeredCustomSpecies?.translationLabel) refreshCustomSpeciesListItemUI();
}

function selectCustomSpecies() {
    const radio = document.getElementById("customSpeciesRadio");
    const slug = radio?.value || registeredCustomSpecies?.translationLabel;
    if (!slug) return;
    if (radio) {
        radio.value = slug;
        radio.checked = true;
    }
    if (typeof showSpeciesDLabel === "function") showSpeciesDLabel("customSpecies");
}

function clearCustomSpeciesRuntimeCompletely() {
    unregisterPreviousCustomSpecies();
    customSpeciesEditorState = null;
    customSpeciesImportSnapshot = null;
    customSpeciesEditorOpen = false;
    try {
        localStorage.removeItem(CUSTOM_SPECIES_LS_KEY);
    } catch (e) {
        console.warn("customSpeciesRuntime löschen fehlgeschlagen:", e);
    }
    clearSpeciesSelectionUI();
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
    return true;
}

function resetCustomSpeciesRuntimeOnCreatorLoad() {
    // --- LEVEL-UP: Runtime aus Snapshot behalten ---
    if (typeof shouldSkipCreatorRuntimeResetForLevelUp === "function"
        && shouldSkipCreatorRuntimeResetForLevelUp()) {
        return;
    }
    clearCustomSpeciesRuntimeCompletely();
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        resetCustomSpeciesRuntimeOnCreatorLoad();
    });
}

//=======================================================================
// Schritt-3 / Schritt-7 Brücken
//=======================================================================

function cspcGetUsedOriginFeatLabels(excludeSlotId) {
    const used = new Set();
    (customSpeciesEditorState?.features || []).forEach((row, i) => {
        const slotId = `cspc-row-${i}`;
        if (slotId === excludeSlotId) return;
        if (row.category !== "originFeats" || row.kind !== "simple") return;
        const lab = (row.optionsConfig?.selectedFeats || [])[0];
        if (lab) used.add(lab);
    });
    return used;
}

function cspcGetGrantedOriginFeatIds() {
    const ids = new Set();
    const grants = registeredCustomSpecies?.compiledSpeciesListEntry?.customGrants?.featsGet;
    if (Array.isArray(grants)) {
        grants.forEach(id => {
            const n = parseInt(id, 10);
            if (Number.isFinite(n) && n > 0) ids.add(n);
        });
    }
    document.querySelectorAll("#speciesTraitsContent select.cspc-granted-feat-anchor").forEach(anchor => {
        const v = parseInt(anchor.value, 10);
        if (Number.isFinite(v) && v > 0) ids.add(v);
    });
    return ids;
}

function cspcGetUsedOriginFeatIds(excludeSelect) {
    const ids = cspcGetGrantedOriginFeatIds();
    document.querySelectorAll("#speciesTraitsContent select.cspc-feat-select, #versatileDropdown").forEach(sel => {
        if (sel === excludeSelect) return;
        const v = parseInt(sel.value, 10);
        if (Number.isFinite(v) && v > 0) ids.add(v);
    });
    return ids;
}

function cspcUpdateOriginFeatPickLimits(changedSelect) {
    const usedIds = cspcGetUsedOriginFeatIds(changedSelect);
    document.querySelectorAll("#speciesTraitsContent select.cspc-feat-select, #versatileDropdown").forEach(sel => {
        Array.from(sel.options).forEach(opt => {
            if (!opt.value) return;
            const featId = parseInt(opt.value, 10);
            const shouldDisable = usedIds.has(featId) && String(opt.value) !== String(sel.value);
            opt.disabled = shouldDisable;
            const isSmallScreen = window.innerWidth < 1000;
            if (isSmallScreen && shouldDisable && String(opt.value) !== String(sel.value)) {
                if (!opt.text.includes("🔒")) opt.text = "🔒 " + opt.text;
            } else {
                opt.text = opt.text.replace("🔒 ", "");
            }
        });
    });
}

function cspcOnOriginFeatCheckboxChange() {
    if (typeof queryActiveLfFloat !== "function") return;
    const slotId = (typeof ccLfFloatContext !== "undefined" && ccLfFloatContext?.slotId)
        ? ccLfFloatContext.slotId
        : null;
    if (!slotId || !String(slotId).startsWith("cspc-row-")) return;
    const lockedSet = cspcGetUsedOriginFeatLabels(slotId);
    const list = queryActiveLfFloat("#ccLfSimpleOriginFeatList");
    if (!list) return;
    list.querySelectorAll('input[type="checkbox"]').forEach(input => {
        const isLocked = lockedSet.has(input.value);
        if (isLocked && !input.checked) {
            input.disabled = true;
        } else if (!isLocked) {
            input.disabled = false;
        }
    });
}

function cspcApplyGrantedSpeciesFeatDynamics() {
    document.querySelectorAll("#speciesTraitsContent select.cspc-granted-feat-anchor").forEach(anchor => {
        const featID = parseInt(anchor.value, 10);
        if (!Number.isFinite(featID) || featID <= 0) return;
        if (typeof updateFeatDynamicContent === "function") {
            updateFeatDynamicContent(featID, 1, anchor);
        }
    });
}

function normalizeFeatSpeciesIds(value) {
    if (value == null) return [];
    if (Array.isArray(value)) {
        return [...new Set(value.map(v => parseInt(v, 10)).filter(n => Number.isFinite(n) && n > 0))];
    }
    const n = parseInt(value, 10);
    return (Number.isFinite(n) && n > 0) ? [n] : [];
}

function collectSpeciesFeatIds() {
    const ids = [];
    const push = (raw) => {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) ids.push(n);
    };

    const versatile = document.getElementById("versatileDropdown");
    if (versatile?.value) push(versatile.value);

    const root = document.getElementById("speciesTraitsContent");
    if (root) {
        root.querySelectorAll("select.cspc-feat-select").forEach(sel => {
            if (sel.value) push(sel.value);
        });
        root.querySelectorAll("select.cspc-granted-feat-anchor").forEach(sel => {
            if (sel.value) push(sel.value);
        });
    }

    return [...new Set(ids)];
}

/** Schreibt die aktuelle Schritt-3-Talentwahl in tempFeatSpecies (Zwischenspeicher wie tempFeatBackground). */
function syncTempFeatSpecies() {
    if (typeof tempFeatSpecies === "undefined") return;
    tempFeatSpecies = collectSpeciesFeatIds();
}

/**
 * Schritt-3-Fertigkeiten für classForm.skills (PHB skill59–63, Custom skillCspc*, Skilled aus .feat-content).
 * Ausgeschlossen von shouldCollectSelectForClassForm – hier explizite Brücke wie im Backup-Sammelpfad.
 */
function appendSpeciesSkillSelections(skillIds) {
    if (!Array.isArray(skillIds)) return;
    const push = (val) => {
        const v = String(val || "").trim();
        if (v && !skillIds.includes(v)) skillIds.push(v);
    };
    ["skill59", "skill60", "skill61", "skill62", "skill63"].forEach(id => {
        const el = document.getElementById(id);
        if (el?.value) push(el.value);
    });
    const root = document.getElementById("speciesTraitsContent");
    if (!root) return;
    root.querySelectorAll('select[id^="skillCspc"]').forEach(sel => {
        if (sel.value) push(sel.value);
    });
    root.querySelectorAll(".feat-content select").forEach(sel => {
        const id = sel.id || "";
        if (id.startsWith("skill") && sel.value) push(sel.value);
    });
}

/**
 * Talent-Unterauswahlen aus Schritt 3 (Musiker/Handwerker/Skilled-Kette) für classForm.
 */
function appendSpeciesFeatContentProficiencies(tools, instruments, games) {
    if (!Array.isArray(tools) || !Array.isArray(instruments) || !Array.isArray(games)) return;
    document.querySelectorAll("#speciesTraitsContent .feat-content select").forEach(sel => {
        if (!sel.value) return;
        const id = sel.id || "";
        if (id.startsWith("tool")) {
            tools.push(sel.value);
        } else if (id.startsWith("instrument")) {
            instruments.push(sel.value);
        } else if (id.startsWith("game")) {
            games.push(sel.value);
        }
    });
}

function collectSpeciesFreeChoices() {
    const root = document.getElementById("speciesTraitsContent");
    const result = [];
    if (!root) return result;
    root.querySelectorAll('select[id^="speciesFreeChoice"]').forEach(sel => {
        if (sel.value) result.push(sel.value);
    });
    return result;
}

function appendGrantedCustomSpeciesSkillIds(skillIds) {
    if (!Array.isArray(skillIds)) return skillIds;
    const grants = registeredCustomSpecies?.compiledSpeciesListEntry?.customGrants?.skillsGet;
    if (!Array.isArray(grants) || !isRegisteredCustomSpeciesSlug(
        typeof character !== "undefined" ? character.species : null
    )) return skillIds;
    grants.forEach(n => {
        const idStr = String(n);
        if (!skillIds.includes(idStr)) skillIds.push(idStr);
    });
    return skillIds;
}

function getMagicFeaturesFromCustomSpecies(characterObj) {
    const char = characterObj || (typeof character !== "undefined" ? character : null);
    if (!char || !isRegisteredCustomSpeciesSlug(char.species)) return [];
    return (registeredCustomSpecies.compiledMagicFeatures || []).map(f => Object.assign({}, f));
}

function renderCspcCustomTraitChoices(species, trait, traitLabel, elements) {
    let html = "";
    const special = ["keenSensesLabel", "skillfulLabel", "versatileLabel"];
    if (special.includes(traitLabel) || !species?.isCustom) return html;
    if (trait.skillLabel && trait.skillLabel !== 0) {
        const isGrant = Array.isArray(trait.skillLabel) && !(parseInt(trait.customChoiceAmount, 10) > 0);
        if (isGrant) {
            const names = (Array.isArray(trait.skillLabel) ? trait.skillLabel : [])
                .map(lab => elements[lab] || lab).join(", ");
            html += `<li>${elements[traitLabel] || traitLabel}${names ? `: ${names}` : ""}</li>`;
            (Array.isArray(trait.skillLabel) ? trait.skillLabel : []).forEach((lab, i) => {
                const n = cspcSkillLabelToNumber(lab);
                if (!Number.isFinite(n)) return;
                html += `<select id="skillCspcG${trait.speciesTraitCategoryNumber}_${i}" class="cspc-skill-select" style="display:none;">
                    <option value="${n}" selected>${n}</option>
                </select>`;
            });
        } else {
            const nums = trait.skillLabel === 1
                ? (typeof skillList !== "undefined" ? skillList.map(s => s.skillCategoryNumber) : [])
                : (Array.isArray(trait.skillLabel) ? trait.skillLabel.map(cspcSkillLabelToNumber).filter(Number.isFinite) : []);
            const amount = Math.max(1, parseInt(trait.customChoiceAmount, 10) || 1);
            const skillOptions = (typeof createSkillOptions === "function") ? createSkillOptions(nums) : "";
            for (let i = 0; i < amount; i++) {
                const id = `skillCspc${trait.speciesTraitCategoryNumber}_${i}`;
                html += `<li>${elements[traitLabel] || traitLabel} - ${elements.chooseSkillLabel || ""}:
                    <select id="${id}" class="dropdown cspc-skill-select">
                        <option value="">${elements.pleaseSelectLabel || ""}</option>
                        ${skillOptions}
                    </select>
                </li>`;
            }
        }
    }
    if (trait.featLabel && trait.featLabel !== 0) {
        if (typeof trait.featLabel === "string") {
            const feat = ((typeof getEffectiveFeatList === "function")
                ? getEffectiveFeatList()
                : ((typeof featList !== "undefined") ? featList : []))
                .find(f => f.translationLabel === trait.featLabel);
            let featName = feat
                ? (elements[feat.translationLabel] || feat.translationLabel)
                : (elements[trait.featLabel] || trait.featLabel);
            if (feat && typeof isCustomContentFeat === "function" && isCustomContentFeat(feat)
                && typeof getCustomContentMarkerHtml === "function") {
                featName = `${featName}${getCustomContentMarkerHtml()}`;
            }
            html += `<li class="cspc-granted-feat-li" id="cspcGrantedFeatRow_${trait.speciesTraitCategoryNumber}">
                ${elements[traitLabel] || traitLabel}: ${featName}
                <select id="cspcGrantedFeatAnchor_${trait.speciesTraitCategoryNumber}" class="cspc-granted-feat-anchor" aria-hidden="true" tabindex="-1" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;">
                    <option value="${feat ? feat.ID : ""}" selected></option>
                </select>
            </li>`;
        } else {
            // Auswahl-Filter: nur die konfigurierten Labels; sonst alle Herkunftstalente
            const allowedLabels = Array.isArray(trait.featLabel) ? trait.featLabel.filter(Boolean) : [];
            let featOptions = "";
            if (allowedLabels.length) {
                const sourceFeats = (typeof getEffectiveFeatList === "function")
                    ? getEffectiveFeatList()
                    : ((typeof featList !== "undefined") ? featList : []);
                const sorted = (typeof sortTranslatedArray === "function")
                    ? sortTranslatedArray(sourceFeats.filter(f => allowedLabels.includes(f.translationLabel)))
                    : sourceFeats.filter(f => allowedLabels.includes(f.translationLabel));
                featOptions = sorted.map(feat => {
                    const featName = elements[feat.translationLabel] || feat.translationLabel;
                    const customSuffix = (typeof isCustomContentFeat === "function" && isCustomContentFeat(feat)
                        && typeof getCustomContentSelectPrefix === "function")
                        ? String(getCustomContentSelectPrefix() || "").trim()
                        : "";
                    const featDisplayName = customSuffix ? `${featName} ${customSuffix}` : featName;
                    return `<option value="${feat.ID}">${featDisplayName}</option>`;
                }).join("");
            } else {
                const originCat = [CSPC_CONFIG.originFeatCategoryNumber];
                featOptions = (typeof createFeatOptions === "function")
                    ? createFeatOptions(1, originCat)
                    : "";
            }
            html += `<li>${elements[traitLabel] || traitLabel} - ${elements.chooseFeatLabel || ""}:
                <select id="cspcFeatSelect_${trait.speciesTraitCategoryNumber}" class="dropdown cspc-feat-select" name="feat">
                    <option value="">${elements.pleaseSelectLabel || ""}</option>
                    ${featOptions}
                </select>
            </li>`;
        }
    }
    const freeOpts = Array.isArray(trait.freeChoiceOptions) ? trait.freeChoiceOptions : [];
    if (freeOpts.length && parseInt(trait.customChoiceAmount, 10) > 0) {
        const amount = Math.max(1, parseInt(trait.customChoiceAmount, 10) || 1);
        const please = elements.pleaseSelectLabel || "";
        const choose = elements.chooseOptionLabel || "";
        const optionsHtml = freeOpts.map(opt => {
            const label = elements[opt.translationLabel] || opt.translationLabel || opt.value;
            return `<option value="${escapeCspcHtml(String(opt.value != null ? opt.value : ""))}">${escapeCspcHtml(label)}</option>`;
        }).join("");
        for (let i = 0; i < amount; i++) {
            const id = `speciesFreeChoice${trait.speciesTraitCategoryNumber}_${i}`;
            html += `<li>${elements[traitLabel] || traitLabel} - ${choose}:
                <select id="${id}" class="dropdown cspc-species-free-select">
                    <option value="">${escapeCspcHtml(please)}</option>
                    ${optionsHtml}
                </select>
            </li>`;
        }
    }
    return html;
}
