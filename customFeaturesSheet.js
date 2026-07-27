//=======================================================================
// Custom Features Sheet
//=======================================================================
// Charakterbogen-seitige Logik für alle Custom Features.
//
// Aufbau (Abschnitte):
//   0. Shared / Hydration-Einstieg
//   1. Custom Class
//   2. Custom Subclass (geplant)
//   3. Custom Background (geplant)
//   4. Custom Species (geplant)
//   5. Custom Feats (geplant)
//   6. Custom Spells (geplant)
//
// Aufgaben: LocalStorage-/Import-Pakete hydratisieren und ClassData /
// Listen / Übersetzungen für den Bogen bereitstellen – ohne PHB-Pfade
// anzufassen. Builder-UI gehört nach customFeaturesBuilder.js.
//=======================================================================

//=======================================================================
// 0. Shared: Hydration-Einstieg
//=======================================================================

/** Fokus-Liste aus CoreTraits normalisieren (Bogen + Ersteller) */
function normalizeSpellcastingFocusList(focus) {
    if (focus == null || focus === 0 || focus === "") return [];
    return (Array.isArray(focus) ? focus : [focus]).filter(v => v && v !== 0);
}

/**
 * Klasse nutzt Magier-Zauberbuch-Mechanik (PHB-Magier oder Custom mit Fokus spellbookLabel).
 * Auf dem Charakterbogen ohne main.js verfügbar.
 */
function characterUsesSpellbook(classNameOrChar) {
    const className = typeof classNameOrChar === "string"
        ? classNameOrChar
        : (classNameOrChar?.class || classNameOrChar?.basic?.class || "");
    if (!className) return false;
    const slug = String(className).toLowerCase();
    if (slug === "wizard") return true;
    const core = (typeof classCoreTraitsList !== "undefined" && Array.isArray(classCoreTraitsList))
        ? classCoreTraitsList.find(c => String(c.translationLabel || "").toLowerCase() === slug)
        : null;
    if (!core) return false;
    return normalizeSpellcastingFocusList(core.spellcastingFocus).includes("spellbookLabel");
}

/**
 * Hydratisiert alle bekannten Custom-Feature-Pakete aus LocalStorage.
 * Reihenfolge: Klasse → (später) Unterklasse → Hintergrund → …
 */
function hydrateAllCustomFeaturesSheetFromStorage() {
    let any = false;
    if (hydrateCustomClassRuntimeFromStorage()) any = true;
    // Platzhalter für spätere Pakete:
    // if (hydrateCustomSubclassRuntimeFromStorage()) any = true;
    // if (hydrateCustomBackgroundRuntimeFromStorage()) any = true;
    // if (hydrateCustomSpeciesRuntimeFromStorage()) any = true;
    // if (hydrateCustomFeatsRuntimeFromStorage()) any = true;
    // if (hydrateCustomSpellRuntimeFromStorage()) any = true;
    return any;
}

/** @deprecated Alias – bitte hydrateAllCustomFeaturesSheetFromStorage nutzen */
function hydrateAllCustomFeaturesSheetRuntimeFromStorage() {
    return hydrateAllCustomFeaturesSheetFromStorage();
}

//=======================================================================
// 1. Custom Class
//=======================================================================

/** Aktuell hydratisierte Custom-Class-Runtime (null = keine / PHB-Klasse) */
let sheetCustomClassRuntime = null;

function getSheetCustomClassRuntime() {
    return sheetCustomClassRuntime;
}

function isSheetCustomClassSlug(className) {
    if (!className || !sheetCustomClassRuntime?.slug) return false;
    return String(className).toLowerCase().trim()
        === String(sheetCustomClassRuntime.slug).toLowerCase().trim();
}

/** ClassData-Array für den Charakterbogen (oder null) */
function getSheetCustomClassData(className) {
    if (!isSheetCustomClassSlug(className)) return null;
    return Array.isArray(sheetCustomClassRuntime.compiledClassData)
        ? sheetCustomClassRuntime.compiledClassData
        : null;
}

/**
 * Charakter-Snapshot für Sheet-Grants.
 * Auf dem Bogen gibt es kein globales `character` (nur im Ersteller) —
 * daher LocalStorage / explizites charData.
 */
function resolveSheetCharacterSnapshot(charData) {
    if (charData && typeof charData === "object") return charData;
    if (typeof loadCharacterDataFromStorage === "function") {
        try {
            return loadCharacterDataFromStorage();
        } catch (e) {
            /* ignore */
        }
    }
    if (typeof character !== "undefined" && character) return character;
    return null;
}

/** Klasse, Stufe und Unterklasse für Custom-Class-Grants auf dem Bogen */
function getSheetCustomClassGrantContext(charData) {
    const snap = resolveSheetCharacterSnapshot(charData);
    const className = snap?.basic?.class || snap?.class || "";
    const level = Number(snap?.basic?.level || snap?.level) || 1;
    const selectedSubclassNumber = parseInt(snap?.classForm?.subclass, 10) || 0;
    return { className, level, selectedSubclassNumber };
}

/** Gewährte Rettungswurf-Labels (Einfach→Rettungswürfe) für den Charakterbogen */
function getGrantedCustomClassSavingThrowLabels(charData) {
    const { className, level, selectedSubclassNumber } = getSheetCustomClassGrantContext(charData);
    if (!className || !isSheetCustomClassSlug(className)) return [];
    const classData = getSheetCustomClassData(className) || [];

    const labels = [];
    classData.forEach(f => {
        if (!f || (Number(f.level) || 1) > level) return;
        const sc = f.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== selectedSubclassNumber) return;
        const granted = f.grantedSavingThrowLabels;
        if (!Array.isArray(granted) || !granted.length) return;
        granted.forEach(lab => {
            if (lab && !labels.includes(lab)) labels.push(lab);
        });
    });
    return labels;
}

/**
 * Gewährte Waffenkategorien aus Custom-Class-Merkmalen (Einfach→Waffenvertrautheit).
 */
function getGrantedCustomClassWeaponCategoryNumbers(charData) {
    const { className, level, selectedSubclassNumber } = getSheetCustomClassGrantContext(charData);
    if (!className || !isSheetCustomClassSlug(className)) return [];
    const classData = getSheetCustomClassData(className) || [];
    const nums = [];
    classData.forEach(f => {
        if (!f || (Number(f.level) || 1) > level) return;
        const sc = f.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== selectedSubclassNumber) return;
        if (f.translationLabel !== "weaponTrainingLabel") return;
        const granted = f.Get_weaponCategoryNumber;
        if (!granted || granted === 0) return;
        const list = Array.isArray(granted) ? granted : [granted];
        list.forEach(n => {
            const id = parseInt(n, 10);
            if (Number.isFinite(id) && id > 0 && !nums.includes(id)) nums.push(id);
        });
    });
    return nums;
}

/** Gewährte Waffeneigenschaften aus Custom-Class-Merkmalen */
function getGrantedCustomClassWeaponPropertyCategoryNumbers(charData) {
    const { className, level, selectedSubclassNumber } = getSheetCustomClassGrantContext(charData);
    if (!className || !isSheetCustomClassSlug(className)) return [];
    const classData = getSheetCustomClassData(className) || [];
    const nums = [];
    classData.forEach(f => {
        if (!f || (Number(f.level) || 1) > level) return;
        const sc = f.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== selectedSubclassNumber) return;
        const granted = f.grantedWeaponPropertyCategoryNumbers;
        if (!granted || granted === 0) return;
        const list = Array.isArray(granted) ? granted : [granted];
        list.forEach(n => {
            const id = parseInt(n, 10);
            if (Number.isFinite(id) && id > 0 && !nums.includes(id)) nums.push(id);
        });
    });
    return nums;
}

/** Gewährte Rüstungskategorien aus Custom-Class-Merkmalen */
function getGrantedCustomClassArmorCategoryNumbers(charData) {
    const { className, level, selectedSubclassNumber } = getSheetCustomClassGrantContext(charData);
    if (!className || !isSheetCustomClassSlug(className)) return [];
    const classData = getSheetCustomClassData(className) || [];
    const nums = [];
    classData.forEach(f => {
        if (!f || (Number(f.level) || 1) > level) return;
        const sc = f.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== selectedSubclassNumber) return;
        if (f.translationLabel !== "armorTrainingLabel") return;
        const granted = f.Get_armorCategoryNumber;
        if (!granted || granted === 0) return;
        const list = Array.isArray(granted) ? granted : [granted];
        list.forEach(n => {
            const id = parseInt(n, 10);
            if (Number.isFinite(id) && id > 0 && !nums.includes(id)) nums.push(id);
        });
    });
    return nums;
}

/** Unterklassenliste für getSubclassTranslation / CHOICE */
function getSheetCustomSubclassList(className) {
    if (!isSheetCustomClassSlug(className)) return null;
    return Array.isArray(sheetCustomClassRuntime.compiledSubclassList)
        ? sheetCustomClassRuntime.compiledSubclassList
        : null;
}

/**
 * Runtime aus LocalStorage (oder Objekt) hydratisieren.
 * Idempotent: vorherige Custom-Core-Traits werden ersetzt.
 * Akzeptiert Envelope ({ dc, payload }) oder Legacy flat customClassRuntime.
 */
function hydrateCustomClassRuntime(raw) {
    let payload = raw;
    let envelope = null;
    if (typeof normalizeDcPackageInput === "function") {
        const norm = normalizeDcPackageInput(raw);
        if (norm.ok && norm.detectedType === (typeof DC_PACKAGE_TYPE !== "undefined"
            ? DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME
            : "customClassRuntime")) {
            payload = norm.payload;
            envelope = norm.envelope;
        } else if (norm.ok && raw?.dc) {
            // Falscher Envelope-Typ
            sheetCustomClassRuntime = null;
            return false;
        }
    }

    if (!payload || payload.type !== "customClassRuntime" || !payload.slug) {
        sheetCustomClassRuntime = null;
        return false;
    }

    // Vorherige Custom-Einträge aus classCoreTraitsList entfernen
    if (typeof classCoreTraitsList !== "undefined") {
        for (let i = classCoreTraitsList.length - 1; i >= 0; i--) {
            if (classCoreTraitsList[i]?.isCustom) classCoreTraitsList.splice(i, 1);
        }
    }

    // Feature-/Klassen-Übersetzungen einspielen (PHB-Keys unberührt lassen, wo möglich)
    if (payload.translations?.de && typeof translations !== "undefined") {
        Object.assign(translations.de, payload.translations.de);
    }
    if (payload.translations?.en && typeof translations !== "undefined") {
        Object.assign(translations.en, payload.translations.en);
    }

    if (payload.coreTraits && typeof classCoreTraitsList !== "undefined") {
        const core = JSON.parse(JSON.stringify(payload.coreTraits));
        core.isCustom = true;
        classCoreTraitsList.push(core);
    }

    const compiledClassData = Array.isArray(payload.compiledClassData)
        ? payload.compiledClassData
        : [];
    if (typeof sanitizeCompiledChoosePreparedSpellSheetFlags === "function") {
        sanitizeCompiledChoosePreparedSpellSheetFlags(compiledClassData, payload.translations);
    }

    const classDep = (envelope?.dependencies || []).find(d =>
        d && d.packageType === (typeof DC_PACKAGE_TYPE !== "undefined"
            ? DC_PACKAGE_TYPE.CUSTOM_CLASS
            : "customClass")
    );

    sheetCustomClassRuntime = {
        slug: payload.slug,
        coreTraits: payload.coreTraits || null,
        compiledClassData,
        compiledSubclassList: Array.isArray(payload.compiledSubclassList)
            ? payload.compiledSubclassList
            : [],
        compiledMagicSkillsList: Array.isArray(payload.compiledMagicSkillsList)
            ? payload.compiledMagicSkillsList
            : [],
        compiledSubclassSpellsList: Array.isArray(payload.compiledSubclassSpellsList)
            ? payload.compiledSubclassSpellsList
            : [],
        compiledSubclassSpellAbilityList: Array.isArray(payload.compiledSubclassSpellAbilityList)
            ? payload.compiledSubclassSpellAbilityList
            : [],
        packageId: envelope?.packageId || null,
        verificationCode: envelope?.verificationCode || null,
        sourceClassPackageId: classDep?.packageId || null
    };
    return true;
}

/** PHB + Custom: Unterklassen-Zauberattribute (z. B. Arcane Trickster) */
function getEffectiveSubclassSpellAbilityList() {
    const base = (typeof subclassSpellAbillityList !== "undefined" && Array.isArray(subclassSpellAbillityList))
        ? subclassSpellAbillityList
        : [];
    const custom = sheetCustomClassRuntime?.compiledSubclassSpellAbilityList;
    if (Array.isArray(custom) && custom.length) return base.concat(custom);
    return base;
}

/** Liest customClassRuntime aus LocalStorage und hydratisiert. */
function hydrateCustomClassRuntimeFromStorage() {
    const raw = localStorage.getItem("customClassRuntime");
    if (!raw) {
        sheetCustomClassRuntime = null;
        return false;
    }
    try {
        const payload = JSON.parse(raw);
        return hydrateCustomClassRuntime(payload);
    } catch (e) {
        console.warn("customClassRuntime ungültig:", e);
        sheetCustomClassRuntime = null;
        return false;
    }
}

//=======================================================================
// 2. Custom Subclass (geplant)
//=======================================================================
// let sheetCustomSubclassRuntime = null;
// function hydrateCustomSubclassRuntime(payload) { … }
// function hydrateCustomSubclassRuntimeFromStorage() { … }
// function getSheetCustomStandaloneSubclassData(…) { … }

//=======================================================================
// 3. Custom Background (geplant)
//=======================================================================
// let sheetCustomBackgroundRuntime = null;
// function hydrateCustomBackgroundRuntime(payload) { … }
// function hydrateCustomBackgroundRuntimeFromStorage() { … }
// function getSheetCustomBackgroundData(…) { … }

//=======================================================================
// 4. Custom Species (geplant)
//=======================================================================
// let sheetCustomSpeciesRuntime = null;
// function hydrateCustomSpeciesRuntime(payload) { … }
// function hydrateCustomSpeciesRuntimeFromStorage() { … }
// function getSheetCustomSpeciesData(…) { … }

//=======================================================================
// 5. Custom Feats (geplant)
//=======================================================================
// let sheetCustomFeatsRuntime = null;
// function hydrateCustomFeatsRuntime(payload) { … }
// function hydrateCustomFeatsRuntimeFromStorage() { … }
// function getSheetCustomFeatData(…) { … }

//=======================================================================
// 6. Custom Spells (geplant)
//=======================================================================
// let sheetCustomSpellRuntime = null;
// function hydrateCustomSpellRuntime(payload) { … }
// function hydrateCustomSpellRuntimeFromStorage() { … }
// function getSheetCustomSpellData(…) { … }
