//=======================================================================
// Custom Background Builder (customFeatures/backgroundBuilder.js)
//=======================================================================
// Eigenständiger Hintergrund-Ersteller (Schritt 2): Chooser, Editor,
// Compile/Export, Runtime-Registrierung.
//
// Flags / Visibility: customFeatures/shared.js (zuerst laden).
// Shared Utilities:   tCC, renderLangAvailabilityRowHtml, fillAttributeCheckboxes,
//                     limitCheckboxGroup, updateCustomClassCharCounter,
//                     inferEquipmentCategory, buildCategoryOptionsHtml,
//                     buildItemsForCategoryHtml, onCustomEquipCategoryChange,
//                     buildEquipmentExportValue / formatCustomStartingEquipmentLabel (classBuilder.js)
// Bogen-Runtime:      customFeatures/customFeaturesSheet.js
// Pakete:             dcPackage.js (Projektroot)
//=======================================================================

//=======================================================================
// CUSTOM_BACKGROUND_CONFIG – zentrale Schnell-Einstellungen
//=======================================================================
// Hier ID, Limits und Equip-Optionen anpassen.
// Struktur bewusst analog zu CUSTOM_CLASS_CONFIG / CUSTOM_SUBCLASS_CONFIG.
//=======================================================================
const CUSTOM_BACKGROUND_CONFIG = Object.freeze({
    /**
     * Feste ID des einen aktiven Custom-Hintergrunds.
     * PHB-Hintergründe: 1…16; Custom belegt diesen Slot (Default: 100).
     */
    backgroundId: 100,

    /** Max. Zeichen Name (pro Sprache) */
    nameMax: 30,
    /** Max. Zeichen Beschreibung (pro Sprache) */
    descMax: 300,

    /** Genau so viele Attribute wählbar (Punktepool in Schritt 2) */
    abilityCount: 3,
    /** Genau so viele Fertigkeiten */
    skillCount: 2,

    /** Max. Gegenstände pro Startausrüstungs-Option (M3) */
    equipMaxItems: 8,
    /** Max. Stückzahl eines Gegenstands (M3) */
    amountMax: 999,
    /** Max. GP-Feld pro Equip-Option (M3) */
    goldMax: 999,
    /**
     * Nur A/B – bewusst kein Equipment C (Unterschied zum Class Builder).
     * M3 füllt die Equip-UI.
     */
    equipOptionKeys: Object.freeze(["A", "B"]),

    /** Origin-Talente: featCategoryNumber === 1 */
    originFeatCategoryNumber: 1,

    /**
     * Magic-Initiate: erlaubte Klassen-Zauberlisten (Werte = translationLabel).
     * Schreibweise wie in backgroundData.spellList.
     */
    magicInitiateSpellLists: Object.freeze(["cleric", "druid", "wizard"]),

    /**
     * Oberflächen-Werkzeuge → createOptions-String für Schritt 2.
     * (Analog PHB: artisansTools / Instrument / gamingSet)
     */
    toolSurfaceCreateOptions: Object.freeze({
        artisansToolsLabel: "createToolOptions([1,3])",
        musicalInstrumentLabel: "createInstrumentOptions()",
        gamingSetLabel: "createGameOptions()"
    }),

    /** LocalStorage-Schlüssel Runtime (Ersteller → Bogen) */
    lsKey: "customBackgroundRuntime",

    /** Dateiname-Präfix beim Export */
    filenamePrefix: "custom_background"
});

/** Alias → CUSTOM_BACKGROUND_CONFIG (kurze Zugriffe im Builder) */
const CBG_CONFIG = CUSTOM_BACKGROUND_CONFIG;
const CUSTOM_BACKGROUND_ID = CUSTOM_BACKGROUND_CONFIG.backgroundId;
const CUSTOM_BACKGROUND_LS_KEY = CUSTOM_BACKGROUND_CONFIG.lsKey;

//=======================================================================
// State
//=======================================================================

/** Editor offen (Chooser vs. Editor) */
let customBackgroundEditorOpen = false;
/** Editor-State (null = kein aktiver Editor) */
let customBackgroundEditorState = null;
/** Snapshot nach Import – kein Re-Download ohne Änderung */
let customBackgroundImportSnapshot = null;

/** Eine registrierte Custom-Background-Session */
let registeredCustomBackground = {
    translationLabel: null,
    id: null,
    translationKeys: [],
    compiledBackgroundListEntry: null,
    packageId: null,
    verificationCode: null,
    rawPayload: null
};

/** Leerer Editor-State */
function createEmptyCustomBackgroundState() {
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    return {
        packageId: null,
        packageCreatedAt: null,
        availableLanguages: [active],
        names: { de: "", en: "" },
        descriptions: { de: "", en: "" },
        /** Genau abilityCount Attribut-Labels (z. B. wisdomLabel) */
        bgAbilityScores: [],
        /** Genau skillCount skillCategoryNumber-Werte */
        bgSkillProf: [],
        /** Origin-Feat translationLabel */
        bgFeat: "",
        /** 0 oder cleric|druid|wizard */
        spellList: 0,
        /** Tool- oder Oberflächen-Label */
        bgToolProf: "",
        /** 0 oder createToolOptions… – abgeleitet aus bgToolProf */
        createOptions: 0,
        /** M3: Equip A/B */
        equipment: {
            A: { enabled: true, items: [], gp: 0 },
            B: { enabled: true, items: [], gp: 0 }
        }
    };
}

/** createOptions aus Werkzeugwahl ableiten (PHB-kompatibel) */
function deriveCbgCreateOptions(toolLabel) {
    const map = CBG_CONFIG.toolSurfaceCreateOptions || {};
    if (toolLabel && map[toolLabel]) return map[toolLabel];
    return 0;
}

function isCbgToolSurfaceLabel(label) {
    const map = CBG_CONFIG.toolSurfaceCreateOptions || {};
    return !!(label && map[label]);
}

function getCbgOriginFeats() {
    if (typeof featList === "undefined" || !Array.isArray(featList)) return [];
    const cat = CBG_CONFIG.originFeatCategoryNumber;
    return featList.filter(f => Number(f.featCategoryNumber) === cat);
}

//=======================================================================
// UI – Modal
//=======================================================================

function openCustomBackgroundChooser() {
    if (typeof isCustomFeatureEnabled === "function"
        && !isCustomFeatureEnabled("customBackgroundBuilder")) {
        return;
    }
    const overlay = document.getElementById("customBackgroundOverlay");
    if (!overlay) return;
    const chooser = document.getElementById("customBackgroundChooserView");
    const editor = document.getElementById("customBackgroundEditorView");
    if (chooser) chooser.style.display = "";
    if (editor) editor.style.display = "none";
    customBackgroundEditorOpen = false;
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode(overlay, true);
    }
    overlay.style.setProperty("display", "flex", "important");
    applyCbgTranslations();
}

function closeCustomBackgroundModal() {
    const overlay = document.getElementById("customBackgroundOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    customBackgroundEditorOpen = false;
}

function discardCustomBackgroundEditor() {
    customBackgroundEditorState = null;
    customBackgroundImportSnapshot = null;
    customBackgroundEditorOpen = false;
    const content = document.getElementById("customBackgroundEditorContent");
    if (content) content.innerHTML = "";
    closeCustomBackgroundModal();
}

function requestCloseCustomBackgroundModal() {
    if (customBackgroundEditorOpen && customBackgroundEditorState) {
        const msg = (typeof tCC === "function" && tCC("cbgCloseConfirmLabel"))
            || "Ungespeicherte Änderungen am Hintergrund verwerfen?";
        if (!confirm(msg)) return;
        discardCustomBackgroundEditor();
        return;
    }
    closeCustomBackgroundModal();
}

function startCustomBackgroundCreate() {
    customBackgroundEditorState = createEmptyCustomBackgroundState();
    customBackgroundImportSnapshot = null;
    customBackgroundEditorOpen = true;
    const chooser = document.getElementById("customBackgroundChooserView");
    const editor = document.getElementById("customBackgroundEditorView");
    if (chooser) chooser.style.display = "none";
    if (editor) editor.style.display = "";
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode("customBackgroundOverlay", false);
    }
    renderCustomBackgroundEditor();
    applyCbgTranslations();
}

function triggerCustomBackgroundUpload() {
    const input = document.getElementById("customBackgroundFileInput");
    if (input) {
        input.value = "";
        input.click();
    }
}

/** M7: Upload → Validierung → Editor hydratisieren (ohne sofortiges Runtime-Register) */
function handleCustomBackgroundFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const finish = () => {
        if (event.target) event.target.value = "";
    };

    if (typeof readAndValidateDcPackageFile !== "function") {
        alert(tCC("cbgImportInvalidAlertLabel") || "Ungültige Datei.");
        finish();
        return;
    }

    readAndValidateDcPackageFile(file, {
        expectedType: (typeof DC_PACKAGE_TYPE !== "undefined")
            ? DC_PACKAGE_TYPE.CUSTOM_BACKGROUND
            : "customBackground"
    }).then(result => {
        try {
            if (!result.ok) {
                alert(result.message || tCC("cbgImportInvalidAlertLabel") || "Import fehlgeschlagen.");
                return;
            }
            importCustomBackgroundPayload(result.payload, result.envelope);
        } catch (err) {
            console.error(err);
            alert(tCC("cbgImportInvalidAlertLabel") || "Import fehlgeschlagen.");
        } finally {
            finish();
        }
    });
}

/**
 * Feat-Dependencies prüfen (Vorbereitung Custom-Feat-Builder).
 * Bei customFeat-Deps: Hinweis; Import bleibt möglich.
 */
function warnCbgMissingCustomFeatDependencies(envelope, payload) {
    const deps = [
        ...(envelope?.dependencies || []),
        ...(payload?.dependencies || [])
    ];
    const featType = (typeof DC_PACKAGE_TYPE !== "undefined")
        ? DC_PACKAGE_TYPE.CUSTOM_FEAT
        : "customFeat";
    const customFeatDeps = deps.filter(d =>
        d && (d.packageType === featType || d.packageType === "customFeat")
    );
    if (!customFeatDeps.length) return;
    const names = customFeatDeps.map(d => d.slug || d.packageId || "?").join(", ");
    alert((tCC("cbgMissingCustomFeatDepsAlertLabel")
        || "Dieser Hintergrund referenziert Custom-Talente ({feats}). Ein Custom-Talent-Ersteller folgt später – bitte die Talent-Dateien bereithalten.")
        .replace("{feats}", names));
}

function importCustomBackgroundPayload(payload, envelope) {
    if (!payload
        || (payload.type !== "customBackground" && payload.type !== "customBackgroundRuntime")
        || !payload.compiledBackgroundListEntry) {
        alert(tCC("cbgImportInvalidAlertLabel") || "Kein gültiges Custom-Hintergrund-Paket.");
        return;
    }

    warnCbgMissingCustomFeatDependencies(envelope, payload);

    const snap = payload.editorState;
    const entry = payload.compiledBackgroundListEntry;
    const state = createEmptyCustomBackgroundState();

    state.slug = payload.slug || entry.translationLabel || null;
    state.packageId = envelope?.packageId || payload.packageId || null;
    state.packageCreatedAt = envelope?.createdAt || null;

    if (Array.isArray(payload.availableLanguages) && payload.availableLanguages.length) {
        state.availableLanguages = payload.availableLanguages.slice();
    } else if (Array.isArray(snap?.availableLanguages) && snap.availableLanguages.length) {
        state.availableLanguages = snap.availableLanguages.slice();
    }

    if (snap?.names) {
        state.names = { de: snap.names.de || "", en: snap.names.en || "" };
    } else if (payload.translations) {
        const slug = state.slug;
        state.names = {
            de: payload.translations.de?.[slug] || "",
            en: payload.translations.en?.[slug] || ""
        };
    }
    if (snap?.descriptions) {
        state.descriptions = {
            de: snap.descriptions.de || "",
            en: snap.descriptions.en || ""
        };
    } else if (payload.translations && state.slug) {
        const textKey = `${state.slug}Text`;
        state.descriptions = {
            de: payload.translations.de?.[textKey] || "",
            en: payload.translations.en?.[textKey] || ""
        };
    }

    if (snap) {
        state.bgAbilityScores = Array.isArray(snap.bgAbilityScores) ? snap.bgAbilityScores.slice() : [];
        state.bgSkillProf = Array.isArray(snap.bgSkillProf) ? snap.bgSkillProf.slice() : [];
        state.bgFeat = snap.bgFeat || "";
        state.spellList = snap.spellList || 0;
        state.bgToolProf = snap.bgToolProf || "";
        state.createOptions = snap.createOptions != null
            ? snap.createOptions
            : deriveCbgCreateOptions(state.bgToolProf);
        if (snap.equipment) {
            state.equipment = {
                A: {
                    enabled: snap.equipment.A?.enabled !== false,
                    items: (snap.equipment.A?.items || []).map(i => ({ ...i })),
                    gp: snap.equipment.A?.gp || 0
                },
                B: {
                    enabled: snap.equipment.B?.enabled !== false,
                    items: (snap.equipment.B?.items || []).map(i => ({ ...i })),
                    gp: snap.equipment.B?.gp || 0
                }
            };
        }
    } else {
        state.bgAbilityScores = Array.isArray(entry.bgAbilityScores) ? entry.bgAbilityScores.slice() : [];
        state.bgSkillProf = Array.isArray(entry.bgSkillProf) ? entry.bgSkillProf.slice() : [];
        state.bgFeat = entry.bgFeat || "";
        state.spellList = entry.spellList || 0;
        state.bgToolProf = entry.bgToolProf || "";
        state.createOptions = entry.createOptions != null
            ? entry.createOptions
            : deriveCbgCreateOptions(state.bgToolProf);
        if (typeof parseEquipmentConf === "function") {
            state.equipment.A = parseEquipmentConf(entry.bgEquipmentA);
            state.equipment.B = parseEquipmentConf(entry.bgEquipmentB);
            if (state.equipment.A.enabled || (state.equipment.A.items || []).length || state.equipment.A.gp) {
                state.equipment.A.enabled = true;
            }
            if (state.equipment.B.enabled || (state.equipment.B.items || []).length || state.equipment.B.gp) {
                state.equipment.B.enabled = true;
            }
        }
    }

    customBackgroundEditorState = state;
    customBackgroundEditorOpen = true;

    const exportPreview = buildCustomBackgroundExportPayload(state);
    customBackgroundImportSnapshot = getCustomBackgroundExportSnapshotString(exportPreview);

    const chooser = document.getElementById("customBackgroundChooserView");
    const editor = document.getElementById("customBackgroundEditorView");
    if (chooser) chooser.style.display = "none";
    if (editor) editor.style.display = "";
    const overlay = document.getElementById("customBackgroundOverlay");
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode(overlay, false);
    }
    if (overlay) overlay.style.setProperty("display", "flex", "important");

    renderCustomBackgroundEditor();
    applyCbgTranslations();
}

/** true, wenn background-Name die aktuell registrierte Custom-BG ist */
function isRegisteredCustomBackgroundSlug(backgroundName) {
    if (!backgroundName || !registeredCustomBackground?.translationLabel) return false;
    return String(backgroundName).toLowerCase().trim()
        === String(registeredCustomBackground.translationLabel).toLowerCase().trim();
}

//=======================================================================
// Editor – Sync / Render
//=======================================================================

function syncCbgFieldsFromDom() {
    const state = customBackgroundEditorState;
    if (!state) return;

    const langs = (typeof getCustomClassSupportedLangs === "function")
        ? getCustomClassSupportedLangs()
        : ["de", "en"];
    langs.forEach(lang => {
        const nameEl = document.getElementById(`cbgName_${lang}`);
        const descEl = document.getElementById(`cbgDesc_${lang}`);
        if (nameEl) state.names[lang] = nameEl.value.trim().slice(0, CBG_CONFIG.nameMax);
        if (descEl) state.descriptions[lang] = descEl.value.trim().slice(0, CBG_CONFIG.descMax);
    });

    state.bgAbilityScores = Array.from(document.querySelectorAll('input[name="cbgAbility"]:checked'))
        .map(el => el.value);

    state.bgSkillProf = Array.from(document.querySelectorAll('input[name="cbgSkill"]:checked'))
        .map(el => parseInt(el.value, 10))
        .filter(n => Number.isFinite(n));

    const featSel = document.getElementById("cbgFeatSelect");
    state.bgFeat = featSel?.value || "";

    const spellSel = document.getElementById("cbgSpellListSelect");
    if (state.bgFeat === "magicInitiateLabel" && spellSel?.value) {
        state.spellList = spellSel.value;
    } else if (state.bgFeat !== "magicInitiateLabel") {
        state.spellList = 0;
    }

    const toolSel = document.getElementById("cbgToolSelect");
    state.bgToolProf = toolSel?.value || "";
    state.createOptions = deriveCbgCreateOptions(state.bgToolProf);

    syncCbgEquipmentFromDom();
}

/** Equip A/B aus DOM in State (Limits aus CBG_CONFIG) */
function syncCbgEquipmentFromDom() {
    const state = customBackgroundEditorState;
    if (!state) return;
    if (!state.equipment) {
        state.equipment = {
            A: { enabled: true, items: [], gp: 0 },
            B: { enabled: true, items: [], gp: 0 }
        };
    }
    const keys = CBG_CONFIG.equipOptionKeys || ["A", "B"];
    const maxItems = CBG_CONFIG.equipMaxItems;
    const maxAmount = CBG_CONFIG.amountMax;
    const maxGp = CBG_CONFIG.goldMax;
    keys.forEach(key => {
        const enabled = !!document.getElementById(`cbgEquipEnabled_${key}`)?.checked;
        const gp = Math.min(
            maxGp,
            Math.max(0, parseInt(document.getElementById(`cbgEquipGP_${key}`)?.value, 10) || 0)
        );
        const items = [];
        document.querySelectorAll(`#cbgEquipRows_${key} .custom-class-equip-row`).forEach(row => {
            const label = row.querySelector(".cc-equip-item")?.value;
            const category = row.querySelector(".cc-equip-category")?.value || "";
            const amount = Math.min(
                maxAmount,
                Math.max(1, parseInt(row.querySelector(".cc-equip-amount")?.value, 10) || 1)
            );
            if (label) items.push({ label, amount, category });
        });
        state.equipment[key] = { enabled, items: items.slice(0, maxItems), gp };
    });
}

//=======================================================================
// Startausrüstung A/B (Class-UI-Klon, IDs cbgEquip*, Limits CBG_CONFIG)
//=======================================================================

function renderCbgEquipmentOption(optionKey) {
    const titleKey = `cfEquipmentOption${optionKey}Label`;
    const goldMax = CBG_CONFIG.goldMax;
    return `
        <div class="custom-class-equip-option" data-cbg-option="${optionKey}">
            <div class="custom-class-equip-option-header">
                <strong>${tCC(titleKey)}</strong>
                <label>
                    <input type="checkbox" id="cbgEquipEnabled_${optionKey}" onchange="toggleCbgEquipmentOption('${optionKey}')">
                    ${tCC("cfEquipmentEnabledLabel")}
                </label>
            </div>
            <div id="cbgEquipBody_${optionKey}">
                <div class="custom-class-equip-header" id="cbgEquipHeader_${optionKey}" style="display: none;">
                    <span>${tCC("categoryLabel")}</span>
                    <span>${tCC("identifierLabel")}</span>
                    <span>${tCC("amountLabel")}</span>
                    <span></span>
                </div>
                <div class="custom-class-equip-rows" id="cbgEquipRows_${optionKey}"></div>
                <button type="button" id="cbgEquipAddBtn_${optionKey}" class="custom-class-add-item-btn"
                    onclick="addCbgEquipmentRow('${optionKey}')">${tCC("cfAddItemLabel")}</button>
                <div class="custom-class-equip-gp" style="margin-top:10px;">
                    <label for="cbgEquipGP_${optionKey}" class="custom-class-equip-gp-label">${tCC("cfGoldGPLabel")}</label>
                    <input type="number" id="cbgEquipGP_${optionKey}" min="0" max="${goldMax}" step="1" value="0"
                        oninput="clampCustomClassNumberInput(this, 0, ${goldMax})"
                        onblur="finalizeCustomClassNumberInput(this, 0, ${goldMax})">
                </div>
            </div>
        </div>
    `;
}

/** Label-Bereinigung für Kategorie-Erkennung (list_… / Label(1)) */
function normalizeCbgEquipLabelForCategory(label) {
    if (!label || typeof label !== "string") return "";
    let s = label.trim();
    if (s.startsWith("list_")) s = s.slice(5);
    s = s.replace(/\(\d+\)$/, "");
    return s;
}

function addCbgEquipmentRow(optionKey, preset) {
    const rows = document.getElementById(`cbgEquipRows_${optionKey}`);
    if (!rows) return;
    if (rows.children.length >= CBG_CONFIG.equipMaxItems) {
        updateCbgEquipmentAddButtonState(optionKey);
        return;
    }

    const rawLabel = preset && preset.label ? preset.label : "";
    const label = normalizeCbgEquipLabelForCategory(rawLabel) || rawLabel;
    const rawAmount = preset && preset.amount ? preset.amount : 1;
    const amount = Math.min(CBG_CONFIG.amountMax, Math.max(1, rawAmount));
    let category = (preset && preset.category) || "";
    if (!category && typeof inferEquipmentCategory === "function") {
        category = inferEquipmentCategory(label);
    }

    const catHtml = (typeof buildCategoryOptionsHtml === "function")
        ? buildCategoryOptionsHtml(category)
        : `<option value="">${tCC("pleaseSelectLabel")}</option>`;
    const itemHtml = (typeof buildItemsForCategoryHtml === "function")
        ? buildItemsForCategoryHtml(category, label)
        : `<option value="">${tCC("pleaseSelectLabel")}</option>`;

    const row = document.createElement("div");
    row.className = "custom-class-equip-row";
    row.innerHTML = `
        <select class="cc-equip-category dropdown" onchange="onCustomEquipCategoryChange(this)" title="${tCC("categoryLabel")}">
            ${catHtml}
        </select>
        <select class="cc-equip-item dropdown" title="${tCC("identifierLabel")}">
            ${itemHtml}
        </select>
        <input type="number" class="cc-equip-amount" min="1" max="${CBG_CONFIG.amountMax}" step="1" value="${amount}" title="${tCC("amountLabel")}"
            oninput="clampCustomClassNumberInput(this, 1, ${CBG_CONFIG.amountMax})"
            onblur="finalizeCustomClassNumberInput(this, 1, ${CBG_CONFIG.amountMax})">
        <button type="button" class="custom-class-remove-btn" onclick="removeCbgEquipmentRow(this)" aria-label="×">×</button>
    `;
    rows.appendChild(row);
    updateCbgEquipmentHeaderVisibility(optionKey);
    updateCbgEquipmentAddButtonState(optionKey);
}

function removeCbgEquipmentRow(button) {
    const optionBox = button.closest(".custom-class-equip-option");
    const row = button.closest(".custom-class-equip-row");
    if (row) row.remove();
    if (optionBox && optionBox.dataset.cbgOption) {
        updateCbgEquipmentHeaderVisibility(optionBox.dataset.cbgOption);
        updateCbgEquipmentAddButtonState(optionBox.dataset.cbgOption);
    }
}

function updateCbgEquipmentAddButtonState(optionKey) {
    const rows = document.getElementById(`cbgEquipRows_${optionKey}`);
    const btn = document.getElementById(`cbgEquipAddBtn_${optionKey}`);
    if (!rows || !btn) return;
    const atMax = rows.children.length >= CBG_CONFIG.equipMaxItems;
    btn.disabled = atMax;
    btn.classList.toggle("custom-class-add-item-btn--disabled", atMax);
}

function updateCbgEquipmentHeaderVisibility(optionKey) {
    const rows = document.getElementById(`cbgEquipRows_${optionKey}`);
    const header = document.getElementById(`cbgEquipHeader_${optionKey}`);
    if (!rows || !header) return;
    header.style.display = rows.children.length > 0 ? "grid" : "none";
}

function toggleCbgEquipmentOption(optionKey) {
    const enabled = document.getElementById(`cbgEquipEnabled_${optionKey}`)?.checked;
    const body = document.getElementById(`cbgEquipBody_${optionKey}`);
    if (body) body.style.display = enabled ? "block" : "none";
}

function fillCbgEquipmentFromState() {
    const state = customBackgroundEditorState;
    if (!state?.equipment) return;
    const keys = CBG_CONFIG.equipOptionKeys || ["A", "B"];
    keys.forEach(key => {
        const conf = state.equipment[key] || { enabled: true, items: [], gp: 0 };
        const enabledEl = document.getElementById(`cbgEquipEnabled_${key}`);
        const gpEl = document.getElementById(`cbgEquipGP_${key}`);
        const rows = document.getElementById(`cbgEquipRows_${key}`);

        if (enabledEl) enabledEl.checked = !!conf.enabled;
        if (gpEl) {
            gpEl.value = Math.min(CBG_CONFIG.goldMax, Math.max(0, conf.gp || 0));
        }
        if (rows) {
            rows.innerHTML = "";
            (conf.items || []).slice(0, CBG_CONFIG.equipMaxItems).forEach(item => {
                addCbgEquipmentRow(key, item);
            });
            updateCbgEquipmentHeaderVisibility(key);
            updateCbgEquipmentAddButtonState(key);
        }
        toggleCbgEquipmentOption(key);
    });
}

/**
 * Equip-Conf → PHB-kompatibler bgEquipment-Wert (Array / String / 0).
 * Nutzt Shared formatCustomStartingEquipmentLabel (artisansToolsLabel(1) usw.).
 */
function buildCbgEquipmentExportValue(conf) {
    if (typeof buildEquipmentExportValue === "function") {
        return buildEquipmentExportValue(conf);
    }
    if (!conf || !conf.enabled) return 0;
    const parts = [];
    (conf.items || []).forEach(item => {
        if (!item.label) return;
        let exportLabel = item.label;
        if (typeof formatCustomStartingEquipmentLabel === "function") {
            exportLabel = formatCustomStartingEquipmentLabel(item.label);
        }
        if (item.amount > 1) parts.push(`${item.amount}x${exportLabel}`);
        else parts.push(exportLabel);
    });
    if (conf.gp > 0) parts.push(`${conf.gp} GP`);
    if (parts.length === 0) return 0;
    if (parts.length === 1) return parts[0];
    return parts;
}

function onCbgLangAvailabilityChange() {
    if (!customBackgroundEditorState) return;
    syncCbgFieldsFromDom();
    const activeLang = (typeof getActiveUiLang === "function") ? getActiveUiLang() : (currentLang || "de");
    const supported = (typeof getCustomClassSupportedLangs === "function")
        ? getCustomClassSupportedLangs()
        : ["de", "en"];
    const selected = Array.from(document.querySelectorAll('input[name="cbgLangAvail"]:checked'))
        .map(el => el.value)
        .filter(lang => supported.includes(lang));
    if (!selected.includes(activeLang)) selected.unshift(activeLang);
    customBackgroundEditorState.availableLanguages = selected;
    if (typeof ensureAvailableLanguages === "function") {
        ensureAvailableLanguages(customBackgroundEditorState);
    }
    renderCustomBackgroundEditor();
}

function toggleCbgLangBlock(lang, forceCollapse) {
    const body = document.getElementById(`cbgLangBody_${lang}`);
    const indicator = document.getElementById(`cbgLangToggle_${lang}`);
    if (!body) return;
    let collapsed;
    if (typeof forceCollapse === "boolean") {
        collapsed = forceCollapse;
        body.classList.toggle("collapsed", collapsed);
    } else {
        body.classList.toggle("collapsed");
        collapsed = body.classList.contains("collapsed");
    }
    if (indicator) indicator.classList.toggle("is-collapsed", collapsed);
}

function renderCbgLangBlock(lang, collapsed) {
    const title = (typeof getCustomClassLangTitle === "function")
        ? getCustomClassLangTitle(lang)
        : lang;
    const activeLang = (typeof getActiveUiLang === "function") ? getActiveUiLang() : (currentLang || "de");
    const req = lang === activeLang ? ' <span class="custom-class-required">*</span>' : "";
    const collapsedClass = collapsed ? "collapsed" : "";
    return `
        <div class="custom-class-lang-block" data-lang="${lang}">
            <div class="custom-class-lang-header" onclick="toggleCbgLangBlock('${lang}')">
                <span>${title}</span>
                <span id="cbgLangToggle_${lang}" class="cc-collapse-arrow${collapsed ? " is-collapsed" : ""}" aria-hidden="true">&#x25BC;</span>
            </div>
            <div id="cbgLangBody_${lang}" class="custom-class-lang-body ${collapsedClass}">
                <label for="cbgName_${lang}">${tCC("cfNameLabel")}${req}</label>
                <input type="text" id="cbgName_${lang}" class="custom-class-name-input app-small-input" maxlength="${CBG_CONFIG.nameMax}">
                <div class="char-counter"><span id="cbgNameCount_${lang}">0</span> / ${CBG_CONFIG.nameMax}</div>
                <label for="cbgDesc_${lang}" style="margin-top:8px;display:block;">${tCC("cfDescLabel")}</label>
                <textarea id="cbgDesc_${lang}" maxlength="${CBG_CONFIG.descMax}"></textarea>
                <div class="char-counter"><span id="cbgDescCount_${lang}">0</span> / ${CBG_CONFIG.descMax}</div>
            </div>
        </div>
    `;
}

function fillCbgSkillCheckboxes() {
    const container = document.getElementById("cbgSkillGrid");
    const state = customBackgroundEditorState;
    if (!container || !state || typeof skillList === "undefined") return;
    const selected = new Set((state.bgSkillProf || []).map(Number));
    const max = CBG_CONFIG.skillCount;
    const atMax = selected.size >= max;
    container.innerHTML = skillList.map(skill => {
        const id = skill.skillCategoryNumber;
        const isChecked = selected.has(id);
        const checked = isChecked ? "checked" : "";
        const disabled = (atMax && !isChecked) ? "disabled" : "";
        const labelCls = (atMax && !isChecked) ? ' class="cc-check-disabled"' : "";
        const label = tCC(skill.translationLabel, skill.translationLabel);
        return `<label${labelCls}><input type="checkbox" name="cbgSkill" value="${id}" ${checked} ${disabled}
            onchange="limitCheckboxGroup('cbgSkill', ${max})"> ${label}</label>`;
    }).join("");
}

function fillCbgFeatSelect() {
    const select = document.getElementById("cbgFeatSelect");
    const state = customBackgroundEditorState;
    if (!select || !state) return;
    const please = tCC("pleaseSelectLabel") || "-Bitte wählen-";
    const feats = getCbgOriginFeats();
    let html = `<option value="">${please}</option>`;
    feats
        .slice()
        .sort((a, b) => tCC(a.translationLabel).localeCompare(tCC(b.translationLabel), currentLang || "de"))
        .forEach(feat => {
            const sel = state.bgFeat === feat.translationLabel ? "selected" : "";
            html += `<option value="${feat.translationLabel}" ${sel}>${tCC(feat.translationLabel)}</option>`;
        });
    select.innerHTML = html;
    select.onchange = () => {
        syncCbgFieldsFromDom();
        updateCbgMagicInitiateRow();
    };
}

function updateCbgMagicInitiateRow() {
    const wrap = document.getElementById("cbgSpellListWrap");
    const select = document.getElementById("cbgSpellListSelect");
    const state = customBackgroundEditorState;
    if (!wrap || !select || !state) return;
    const isMi = state.bgFeat === "magicInitiateLabel";
    wrap.style.display = isMi ? "" : "none";
    if (!isMi) {
        state.spellList = 0;
        return;
    }
    const please = tCC("pleaseSelectLabel") || "-Bitte wählen-";
    const lists = CBG_CONFIG.magicInitiateSpellLists || [];
    let html = `<option value="">${please}</option>`;
    lists.forEach(slug => {
        const label = tCC(slug) !== slug
            ? tCC(slug)
            : (slug.charAt(0).toUpperCase() + slug.slice(1));
        const sel = state.spellList === slug ? "selected" : "";
        html += `<option value="${slug}" ${sel}>${label}</option>`;
    });
    select.innerHTML = html;
    select.onchange = () => { syncCbgFieldsFromDom(); };
}

function fillCbgToolSelect() {
    const select = document.getElementById("cbgToolSelect");
    const state = customBackgroundEditorState;
    if (!select || !state) return;
    const please = tCC("pleaseSelectLabel") || "-Bitte wählen-";
    const selected = state.bgToolProf || "";
    let html = `<option value="">${please}</option>`;

    const surfaceLabels = Object.keys(CBG_CONFIG.toolSurfaceCreateOptions || {});
    surfaceLabels.forEach(label => {
        const sel = selected === label ? "selected" : "";
        html += `<option value="${label}" ${sel}>${tCC(label)}</option>`;
    });

    if (typeof toolList !== "undefined") {
        const surfaceSet = new Set(surfaceLabels);
        const sorted = [...toolList]
            .filter(t => t.translationLabel && !surfaceSet.has(t.translationLabel))
            .sort((a, b) =>
                tCC(a.translationLabel).localeCompare(tCC(b.translationLabel), currentLang || "de")
            );
        sorted.forEach(tool => {
            const sel = selected === tool.translationLabel ? "selected" : "";
            html += `<option value="${tool.translationLabel}" ${sel}>${tCC(tool.translationLabel)}</option>`;
        });
    }

    select.innerHTML = html;
    select.onchange = () => {
        syncCbgFieldsFromDom();
        updateCbgCreateOptionsHint();
    };
}

/** Hinweistext für Oberflächen-Werkzeuge (Instrument / Handwerkzeug / Spiel) */
function getCbgToolSurfaceHintKey(toolLabel) {
    if (toolLabel === "musicalInstrumentLabel") return "cbgToolSurfaceHintInstrumentLabel";
    if (toolLabel === "artisansToolsLabel") return "cbgToolSurfaceHintArtisanLabel";
    if (toolLabel === "gamingSetLabel") return "cbgToolSurfaceHintGameLabel";
    return "";
}

function updateCbgCreateOptionsHint() {
    const hint = document.getElementById("cbgCreateOptionsHint");
    const state = customBackgroundEditorState;
    if (!hint || !state) return;
    const hintKey = getCbgToolSurfaceHintKey(state.bgToolProf);
    if (hintKey) {
        hint.style.display = "";
        hint.textContent = tCC(hintKey) || "";
    } else {
        hint.style.display = "none";
        hint.textContent = "";
    }
}

function renderCustomBackgroundEditor() {
    const container = document.getElementById("customBackgroundEditorContent");
    const state = customBackgroundEditorState;
    if (!container || !state) return;

    if (typeof ensureAvailableLanguages === "function") {
        ensureAvailableLanguages(state);
    }
    const activeLang = (typeof getActiveUiLang === "function") ? getActiveUiLang() : (currentLang || "de");
    const available = state.availableLanguages || [activeLang];
    const req = `<span class="custom-class-required">*</span>`;
    const abilityMax = CBG_CONFIG.abilityCount;
    const skillMax = CBG_CONFIG.skillCount;

    const langRow = (typeof renderLangAvailabilityRowHtml === "function")
        ? renderLangAvailabilityRowHtml(state, {
            inputName: "cbgLangAvail",
            onChange: "onCbgLangAvailabilityChange()"
        })
        : "";

    container.innerHTML = `
        ${langRow}

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("cfNameLabel")} / ${tCC("cfDescLabel")} ${req}</div>
            ${available.map(lang => renderCbgLangBlock(lang, lang !== activeLang)).join("")}
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("abilitiesLabel")} ${tCC("cbgAbilityPickLabel", `(genau ${abilityMax})`)} ${req}</div>
            <div class="custom-class-check-grid" id="cbgAbilityGrid"></div>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("skillsLabel")} ${tCC("cbgSkillPickLabel", `(genau ${skillMax})`)} ${req}</div>
            <div class="custom-class-check-grid" id="cbgSkillGrid"></div>
        </div>

        <div class="custom-class-field">
            <label for="cbgFeatSelect" class="custom-class-section-title">${tCC("cbgOriginFeatLabel")} ${req}</label>
            <select id="cbgFeatSelect" class="dropdown custom-class-tool-select"></select>
            <div id="cbgSpellListWrap" style="display:none;margin-top:8px;">
                <label for="cbgSpellListSelect">${tCC("spellListLabel")} ${req}</label>
                <select id="cbgSpellListSelect" class="dropdown custom-class-tool-select"></select>
            </div>
        </div>

        <div class="custom-class-field">
            <label for="cbgToolSelect" class="custom-class-section-title">${tCC("toolsLabel")} ${req}</label>
            <select id="cbgToolSelect" class="dropdown custom-class-tool-select"></select>
            <p id="cbgCreateOptionsHint" class="cc-sc-tab-hint" style="display:none;margin-top:6px;"></p>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("cfStartingEquipmentLabel")}</div>
            ${(CBG_CONFIG.equipOptionKeys || ["A", "B"]).map(key => renderCbgEquipmentOption(key)).join("")}
        </div>
    `;

    // Attribute (Shared-Helper aus classBuilder)
    if (typeof fillAttributeCheckboxes === "function") {
        fillAttributeCheckboxes("cbgAbilityGrid", "cbgAbility", state.bgAbilityScores, abilityMax);
    }

    fillCbgSkillCheckboxes();
    fillCbgFeatSelect();
    updateCbgMagicInitiateRow();
    fillCbgToolSelect();
    updateCbgCreateOptionsHint();
    fillCbgEquipmentFromState();

    available.forEach(lang => {
        const nameEl = document.getElementById(`cbgName_${lang}`);
        const descEl = document.getElementById(`cbgDesc_${lang}`);
        if (nameEl) {
            nameEl.value = state.names[lang] || "";
            if (typeof updateCustomClassCharCounter === "function") {
                nameEl.oninput = () => updateCustomClassCharCounter(`cbgName_${lang}`, `cbgNameCount_${lang}`, CBG_CONFIG.nameMax);
                updateCustomClassCharCounter(`cbgName_${lang}`, `cbgNameCount_${lang}`, CBG_CONFIG.nameMax);
            }
        }
        if (descEl) {
            descEl.value = state.descriptions[lang] || "";
            if (typeof updateCustomClassCharCounter === "function") {
                descEl.oninput = () => updateCustomClassCharCounter(`cbgDesc_${lang}`, `cbgDescCount_${lang}`, CBG_CONFIG.descMax);
                updateCustomClassCharCounter(`cbgDesc_${lang}`, `cbgDescCount_${lang}`, CBG_CONFIG.descMax);
            }
        }
        if (lang !== activeLang) toggleCbgLangBlock(lang, true);
    });
}

//=======================================================================
// Validierung (M3: inkl. Equip-Sync) – Compile/Export folgt in M4
//=======================================================================

function validateCustomBackgroundEditorState() {
    const state = customBackgroundEditorState;
    if (!state) return { ok: false, errorKey: "cbgInvalidStateAlertLabel" };

    syncCbgFieldsFromDom();
    if (typeof ensureAvailableLanguages === "function") {
        ensureAvailableLanguages(state);
    }

    const activeLang = (typeof getActiveUiLang === "function") ? getActiveUiLang() : (currentLang || "de");
    const activeName = (state.names[activeLang] || "").trim();
    if (!activeName) {
        return { ok: false, errorKey: "cbgNameRequiredAlertLabel" };
    }

    if (!Array.isArray(state.bgAbilityScores) || state.bgAbilityScores.length !== CBG_CONFIG.abilityCount) {
        return { ok: false, errorKey: "cbgAbilitiesRequiredAlertLabel" };
    }
    if (!Array.isArray(state.bgSkillProf) || state.bgSkillProf.length !== CBG_CONFIG.skillCount) {
        return { ok: false, errorKey: "cbgSkillsRequiredAlertLabel" };
    }
    if (!state.bgFeat) {
        return { ok: false, errorKey: "cbgFeatRequiredAlertLabel" };
    }
    if (state.bgFeat === "magicInitiateLabel") {
        const lists = CBG_CONFIG.magicInitiateSpellLists || [];
        if (!state.spellList || !lists.includes(state.spellList)) {
            return { ok: false, errorKey: "cbgSpellListRequiredAlertLabel" };
        }
    }
    if (!state.bgToolProf) {
        return { ok: false, errorKey: "cbgToolRequiredAlertLabel" };
    }

    state.createOptions = deriveCbgCreateOptions(state.bgToolProf);
    return { ok: true };
}

//=======================================================================
// M4: Compile / Export / Runtime-Registrierung
//=======================================================================

function buildCbgStableSlug(state) {
    if (state?.slug) return state.slug;
    const active = (typeof getActiveUiLang === "function") ? getActiveUiLang() : (currentLang || "de");
    const source = state?.names?.[active] || state?.names?.en || state?.names?.de || "background";
    const base = (typeof slugifyClassName === "function")
        ? slugifyClassName(source)
        : String(source).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "background";
    // Prefix vermeidet Kollision mit PHB-Slugs (acolyte, sage, …)
    return base.startsWith("custom_bg_") ? base : `custom_bg_${base}`;
}

function getCbgDateStamp() {
    if (typeof formatCustomClassDate === "function") {
        return formatCustomClassDate(new Date());
    }
    const d = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${String(d.getDate()).padStart(2, "0")}${months[d.getMonth()]}${d.getFullYear()}`;
}

function buildCustomBackgroundFilename(state) {
    // Wie Custom-Klasse: Prefix + Anzeigename (ohne internes custom_bg_-Slug)
    const active = (typeof getActiveUiLang === "function")
        ? getActiveUiLang()
        : (typeof currentLang !== "undefined" ? currentLang : "de");
    const other = active === "de" ? "en" : "de";
    const raw = state?.names?.[active] || state?.names?.[other] || "background";
    const nameSlug = (typeof slugifyClassName === "function")
        ? slugifyClassName(raw)
        : String(raw).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "background";
    const prefix = CBG_CONFIG.filenamePrefix || "custom_background";
    return `${prefix}_${nameSlug}_${getCbgDateStamp()}.json`;
}

function buildCompiledBackgroundListEntry(state, slug) {
    const spellList = (state.bgFeat === "magicInitiateLabel" && state.spellList)
        ? state.spellList
        : 0;
    return {
        ID: CBG_CONFIG.backgroundId,
        translationLabel: slug,
        bgAbilityScores: (state.bgAbilityScores || []).slice(),
        bgFeat: state.bgFeat,
        spellList,
        bgSkillProf: (state.bgSkillProf || []).slice(),
        bgToolProf: state.bgToolProf,
        createOptions: deriveCbgCreateOptions(state.bgToolProf),
        bgEquipmentA: buildCbgEquipmentExportValue(state.equipment?.A),
        bgEquipmentB: buildCbgEquipmentExportValue(state.equipment?.B),
        bgDLabel: `${slug}Text`,
        isCustom: true,
        // Custom-Hintergründe: Quelle DiceCharacters
        source: (typeof CUSTOM_CONTENT_SOURCE !== "undefined"
            ? CUSTOM_CONTENT_SOURCE.slice()
            : ["dicecharacters"])
    };
}

function buildCbgTranslationsBlock(state, slug) {
    const textKey = `${slug}Text`;
    const block = { de: {}, en: {} };
    ["de", "en"].forEach(lang => {
        block[lang][slug] = (state.names?.[lang] || "").trim();
        block[lang][textKey] = (state.descriptions?.[lang] || "").trim();
    });
    // Aktive Sprache muss Namen haben – Fallback von anderer Sprache
    const active = (typeof getActiveUiLang === "function") ? getActiveUiLang() : (currentLang || "de");
    const other = active === "de" ? "en" : "de";
    if (!block[active][slug] && block[other][slug]) {
        block[active][slug] = block[other][slug];
    }
    return block;
}

/** Editor-Snapshot für Re-Import (M7) – ohne DOM-Refs */
function buildCbgEditorStateSnapshot(state, slug) {
    return {
        slug,
        packageId: state.packageId || null,
        packageCreatedAt: state.packageCreatedAt || null,
        availableLanguages: (state.availableLanguages || []).slice(),
        names: { de: state.names?.de || "", en: state.names?.en || "" },
        descriptions: { de: state.descriptions?.de || "", en: state.descriptions?.en || "" },
        bgAbilityScores: (state.bgAbilityScores || []).slice(),
        bgSkillProf: (state.bgSkillProf || []).slice(),
        bgFeat: state.bgFeat || "",
        spellList: state.spellList || 0,
        bgToolProf: state.bgToolProf || "",
        createOptions: deriveCbgCreateOptions(state.bgToolProf),
        equipment: {
            A: {
                enabled: !!state.equipment?.A?.enabled,
                items: (state.equipment?.A?.items || []).map(i => ({ ...i })),
                gp: state.equipment?.A?.gp || 0
            },
            B: {
                enabled: !!state.equipment?.B?.enabled,
                items: (state.equipment?.B?.items || []).map(i => ({ ...i })),
                gp: state.equipment?.B?.gp || 0
            }
        }
    };
}

function buildCustomBackgroundExportPayload(state) {
    const slug = buildCbgStableSlug(state);
    state.slug = slug;

    if (!state.packageId && typeof createDcPackageId === "function") {
        state.packageId = createDcPackageId();
        state.packageCreatedAt = new Date().toISOString();
    }

    const compiled = buildCompiledBackgroundListEntry(state, slug);
    const translationsBlock = buildCbgTranslationsBlock(state, slug);
    const flatPayload = {
        version: 1,
        type: "customBackground",
        slug,
        packageId: state.packageId || null,
        availableLanguages: (state.availableLanguages || []).slice(),
        translations: translationsBlock,
        compiledBackgroundListEntry: compiled,
        editorState: buildCbgEditorStateSnapshot(state, slug)
    };

    const deps = [];
    // Vorbereitung Custom-Feat-Pipeline (v1: immer PHB-Origin-Feat)
    if (state.bgFeat) {
        deps.push({
            packageType: "phbFeat",
            slug: state.bgFeat,
            required: true
        });
    }

    if (typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined") {
        return wrapDcPackage({
            packageType: DC_PACKAGE_TYPE.CUSTOM_BACKGROUND,
            packageId: state.packageId || undefined,
            createdAt: state.packageCreatedAt || undefined,
            provides: [{ kind: "background", slug, id: CBG_CONFIG.backgroundId }],
            dependencies: deps,
            payload: flatPayload
        });
    }
    return flatPayload;
}

function getCustomBackgroundExportSnapshotString(exportData) {
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

function downloadCbgJson(filename, data) {
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

/** M4: Compile → Download (nur bei Änderung) → Runtime-Register */
function saveCustomBackground() {
    const result = validateCustomBackgroundEditorState();
    if (!result.ok) {
        alert(tCC(result.errorKey) || result.errorKey);
        return;
    }

    const state = customBackgroundEditorState;
    const payload = buildCustomBackgroundExportPayload(state);
    if (payload?.dc?.packageId) {
        state.packageId = payload.dc.packageId;
        state.packageCreatedAt = payload.dc.createdAt || state.packageCreatedAt;
    }

    const currentSnapshot = getCustomBackgroundExportSnapshotString(payload);
    const hasChanges = customBackgroundImportSnapshot === null
        || currentSnapshot !== customBackgroundImportSnapshot;

    if (hasChanges) {
        downloadCbgJson(buildCustomBackgroundFilename(state), payload);
    }
    customBackgroundImportSnapshot = currentSnapshot;

    registerCustomBackgroundInRuntime(payload);
    customBackgroundEditorState = null;
    customBackgroundEditorOpen = false;
    const content = document.getElementById("customBackgroundEditorContent");
    if (content) content.innerHTML = "";
    closeCustomBackgroundModal();
}

function unregisterPreviousCustomBackground() {
    const oldSlug = registeredCustomBackground?.translationLabel;
    const oldKeys = registeredCustomBackground?.translationKeys || [];

    if (typeof backgroundList !== "undefined" && Array.isArray(backgroundList)) {
        for (let i = backgroundList.length - 1; i >= 0; i--) {
            const entry = backgroundList[i];
            if (!entry) continue;
            if (entry.isCustom
                || entry.ID === CBG_CONFIG.backgroundId
                || (oldSlug && entry.translationLabel === oldSlug)) {
                backgroundList.splice(i, 1);
            }
        }
    }

    oldKeys.forEach(key => {
        if (translations?.de) delete translations.de[key];
        if (translations?.en) delete translations.en[key];
    });

    if (oldSlug) {
        const oldText = document.getElementById(`${oldSlug}Text`);
        if (oldText) oldText.remove();
    }

    const listItem = document.getElementById("customBackgroundListItem");
    const radio = document.getElementById("customBackgroundRadio");
    if (radio) radio.value = "";
    if (listItem) listItem.style.display = "none";

    registeredCustomBackground = {
        translationLabel: null,
        id: null,
        translationKeys: [],
        compiledBackgroundListEntry: null,
        packageId: null,
        verificationCode: null,
        rawPayload: null
    };
}

/**
 * Hintergrund-Auswahl zurücksetzen (analog clearClassSelectionUI).
 * Nach Register eines Custom-BG: Radio nicht vorausgewählt → Details dürfen nicht offen bleiben.
 */
function clearBackgroundSelectionUI() {
    document.querySelectorAll('input[name="background"]').forEach(r => {
        r.checked = false;
    });

    if (typeof character !== "undefined") {
        character.background = null;
        character.backgroundAttributeBonuses = {};
        character.feat_background = null;
        character.tool_background = null;
        character.instrument_background = null;
        character.game_background = null;
    }

    if (typeof tempFeatBackground !== "undefined") tempFeatBackground = null;
    if (typeof tempToolBackground !== "undefined") tempToolBackground = null;
    if (typeof tempInstrumentBackground !== "undefined") tempInstrumentBackground = null;
    if (typeof tempGameBackground !== "undefined") tempGameBackground = null;
    if (typeof tempBackgroundSpellcasting !== "undefined") tempBackgroundSpellcasting = null;

    const details = document.getElementById("backgroundDetailsContainer");
    if (details) details.style.display = "none";
    const detailsContent = document.getElementById("backgroundDetailsContent");
    if (detailsContent) detailsContent.innerHTML = "";

    const textWrap = document.getElementById("backgroundTextContainer");
    if (textWrap) textWrap.style.display = "none";
    document.querySelectorAll(".backgroundText").forEach(el => {
        el.style.display = "none";
    });
}

function ensureCustomBackgroundTextNode(slug) {
    const container = document.getElementById("backgroundTextContainer");
    if (!container || !slug) return;
    const id = `${slug}Text`;
    let node = document.getElementById(id);
    if (!node) {
        node = document.createElement("div");
        node.id = id;
        node.className = "backgroundText";
        node.style.display = "none";
        container.appendChild(node);
    }
    const lang = typeof currentLang !== "undefined" ? currentLang : "de";
    const text = (typeof translations !== "undefined" && translations[lang])
        ? (translations[lang][id] || translations[lang][`${slug}Text`] || "")
        : "";
    node.textContent = String(text);
}

function refreshCustomBackgroundListItemUI() {
    const slug = registeredCustomBackground?.translationLabel;
    const listItem = document.getElementById("customBackgroundListItem");
    const radio = document.getElementById("customBackgroundRadio");
    const label = document.getElementById("customBackgroundRadioLabel");
    const marker = document.getElementById("customBackgroundContentMarker");
    if (!slug || !listItem || !radio) {
        if (typeof setCustomContentMarkerVisible === "function") {
            setCustomContentMarkerVisible(marker, false);
        }
        return;
    }

    radio.value = slug;
    radio.checked = false;
    if (label) {
        const lang = typeof currentLang !== "undefined" ? currentLang : "de";
        label.textContent = (translations?.[lang]?.[slug]) || slug;
    }
    listItem.style.display = "";
    if (typeof setCustomContentMarkerVisible === "function") {
        setCustomContentMarkerVisible(marker, true);
    }
    ensureCustomBackgroundTextNode(slug);
}

function registerCustomBackgroundInRuntime(rawOrEnvelope) {
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
        || (payload.type !== "customBackground" && payload.type !== "customBackgroundRuntime")
        || !payload.compiledBackgroundListEntry
        || !payload.slug) {
        return false;
    }

    unregisterPreviousCustomBackground();
    clearBackgroundSelectionUI();

    if (payload.translations?.de && typeof translations !== "undefined") {
        Object.assign(translations.de, payload.translations.de);
    }
    if (payload.translations?.en && typeof translations !== "undefined") {
        Object.assign(translations.en, payload.translations.en);
    }

    const entry = Object.assign({}, payload.compiledBackgroundListEntry, {
        ID: CBG_CONFIG.backgroundId,
        isCustom: true
    });
    if (typeof applyCustomContentSource === "function") applyCustomContentSource(entry);
    if (typeof backgroundList !== "undefined" && Array.isArray(backgroundList)) {
        backgroundList.push(entry);
    }

    const keys = Object.keys(payload.translations?.de || {});
    registeredCustomBackground = {
        translationLabel: payload.slug,
        id: CBG_CONFIG.backgroundId,
        translationKeys: keys,
        compiledBackgroundListEntry: entry,
        packageId: envelope?.packageId || payload.packageId || null,
        verificationCode: envelope?.verificationCode
            || (envelope?.packageId && typeof buildDcVerificationCode === "function"
                ? buildDcVerificationCode(DC_PACKAGE_TYPE.CUSTOM_BACKGROUND, envelope.packageId)
                : null),
        rawPayload: payload,
        envelope: envelope || null
    };

    refreshCustomBackgroundListItemUI();
    persistCustomBackgroundRuntimeToLocalStorage();
    return true;
}

function persistCustomBackgroundRuntimeToLocalStorage() {
    if (!registeredCustomBackground?.rawPayload) return false;
    const base = registeredCustomBackground.rawPayload;
    const flat = {
        version: 1,
        type: "customBackgroundRuntime",
        slug: registeredCustomBackground.translationLabel,
        packageId: registeredCustomBackground.packageId || base.packageId || null,
        availableLanguages: base.availableLanguages || [],
        translations: base.translations || { de: {}, en: {} },
        compiledBackgroundListEntry: registeredCustomBackground.compiledBackgroundListEntry,
        editorState: base.editorState || null
    };
    try {
        const wrapped = (typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined")
            ? wrapDcPackage({
                packageType: DC_PACKAGE_TYPE.CUSTOM_BACKGROUND,
                packageId: registeredCustomBackground.packageId || undefined,
                provides: [{
                    kind: "backgroundRuntime",
                    slug: registeredCustomBackground.translationLabel
                }],
                dependencies: registeredCustomBackground.envelope?.dependencies || [],
                payload: flat
            })
            : flat;
        localStorage.setItem(CUSTOM_BACKGROUND_LS_KEY, JSON.stringify(wrapped));
        return true;
    } catch (e) {
        console.warn("customBackgroundRuntime speichern fehlgeschlagen:", e);
        return false;
    }
}

//=======================================================================
// Translations / Auswahl
//=======================================================================

function applyCbgTranslations() {
    const t = (key, fallback) =>
        (typeof tCC === "function" && tCC(key)) || fallback || key;
    const set = (id, key, fallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = t(key, fallback);
    };
    set("customBackgroundModalTitleLabel", "cbgModalTitleLabel", "Eigener Hintergrund");
    set("customBackgroundCreateNewBtn", "cbgCreateNewLabel", "Hintergrund erstellen");
    set("customBackgroundUploadBtn", "cbgUploadLabel", "Hintergrund hochladen (.json)");
    set("customBackgroundEditorTitleLabel", "cbgEditorTitleLabel", "Eigener Hintergrund");
    set("customBackgroundSaveBtn", "cfSaveLabel", "Speichern");
    const addBtn = document.getElementById("addCustomBackgroundBtn");
    if (addBtn) {
        const label = t("addCustomBackgroundLabel", "Eigenen Hintergrund erstellen");
        addBtn.title = label;
        addBtn.setAttribute("aria-label", label);
    }
    // Registrierten Eintrag in aktueller UI-Sprache aktualisieren
    if (registeredCustomBackground?.translationLabel) {
        refreshCustomBackgroundListItemUI();
    }
}

/** Auswahl des registrierten Custom-Hintergrunds in Schritt 2 */
function selectCustomBackground() {
    const radio = document.getElementById("customBackgroundRadio");
    const slug = radio?.value || registeredCustomBackground?.translationLabel;
    if (!slug) return;
    ensureCustomBackgroundTextNode(slug);
    if (typeof showBackgroundText === "function") showBackgroundText(slug);
    if (typeof updateBackgroundDetails === "function") updateBackgroundDetails(slug);
}

/** Runtime + LocalStorage + UI des Custom-Hintergrunds vollständig entfernen */
function clearCustomBackgroundRuntimeCompletely() {
    unregisterPreviousCustomBackground();
    customBackgroundEditorState = null;
    customBackgroundImportSnapshot = null;
    customBackgroundEditorOpen = false;
    try {
        localStorage.removeItem(CUSTOM_BACKGROUND_LS_KEY);
    } catch (e) {
        console.warn("customBackgroundRuntime löschen fehlgeschlagen:", e);
    }
    clearBackgroundSelectionUI();
    return true;
}

/** Creator-Start / Seiten-Reset: keine Hydration – Custom-BG muss neu gespeichert werden */
function resetCustomBackgroundRuntimeOnCreatorLoad() {
    clearCustomBackgroundRuntimeCompletely();
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        resetCustomBackgroundRuntimeOnCreatorLoad();
    });
}
