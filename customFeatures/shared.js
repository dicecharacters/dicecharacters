//=======================================================================
// Custom Features – Shared (Ersteller)
//=======================================================================
// Gemeinsame Schalter und Einstiegs-Sichtbarkeit für alle Custom-Builder.
//
// Ordnerstruktur:
//   customFeatures/shared.js           – Flags, Visibility (diese Datei)
//   customFeatures/classBuilder.js     – Custom Class Builder
//   customFeatures/subclassBuilder.js  – Custom Subclass Builder (Standalone)
//   customFeatures/backgroundBuilder.js – Custom Background Builder
//   …
//
// Lade-Reihenfolge in charaktererstellung.html:
//   shared.js → classBuilder.js → subclassBuilder.js → backgroundBuilder.js → …
//
// Charakterbogen-Runtime: customFeatures/customFeaturesSheet.js
// Pakete / Envelope:      dcPackage.js (Projektroot – Ersteller + Bogen)
//
// Shared LF-Masken/Compile liegen vorerst noch in classBuilder.js und werden
// von subclassBuilder.js mitgenutzt; bei weiteren Buildern schrittweise hierher.
//=======================================================================

//=======================================================================
// Feature-Sichtbarkeit (Release-Schalter)
//=======================================================================
// 0 = Feature aus (UI versteckt, Einstieg blockiert)
// 1 = Feature an (Nutzer kann die Funktion nutzen)
// Schalter sind voneinander unabhängig → gestaffelte Updates möglich.
//=======================================================================

const CUSTOM_FEATURE_FLAGS = {
    /** Custom-Klassen-Ersteller: „+“-Button in Schritt 1 */
    customClassBuilder: 0,
    /** Custom-Unterklassen-Ersteller: „+“ in Schritt 6 */
    customSubclassBuilder: 0,
    /** Custom-Hintergrund-Ersteller: „+“ in Schritt 2 */
    customBackgroundBuilder: 0

    // Weitere Schalter (später einkommentieren / auf 1 setzen):
    // customSpeciesBuilder: 0,
    // customFeatsBuilder: 0,
    // customSpellBuilder: 0
};

/**
 * source-Tag für vom Nutzer erstellte Custom-Inhalte (Klasse / UC / Hintergrund).
 * Entspricht dem Array-Format der PHB/SRD-Datenobjekte (z. B. ["phb2024"]).
 */
const CUSTOM_CONTENT_SOURCE = Object.freeze(["dicecharacters"]);

/** source auf ein Custom-Datenobjekt setzen (Compile + Legacy-Import). */
function applyCustomContentSource(entry) {
    if (!entry || typeof entry !== "object") return entry;
    entry.source = CUSTOM_CONTENT_SOURCE.slice();
    return entry;
}

/** true, wenn der genannte Feature-Schalter auf 1 steht */
function isCustomFeatureEnabled(flagKey) {
    return Number(CUSTOM_FEATURE_FLAGS[flagKey]) === 1;
}

/**
 * UI an Feature-Flags anpassen (Buttons/Einstiege ein- oder ausblenden).
 * Bei neuen Custom-Features hier die zugehörigen DOM-Knoten ergänzen.
 * Hinweis: Sichtbarkeit läuft über CSS-Klasse cc-feature-enabled (nicht nur inline),
 * weil .add-custom-class-item sonst per !important wieder eingeblendet wird.
 */
function applyCustomFeatureVisibility() {
    const classBuilderOn = isCustomFeatureEnabled("customClassBuilder");
    const addClassItem = document.getElementById("addCustomClassListItem");
    const addClassBtn = document.getElementById("addCustomClassBtn");
    if (addClassItem) {
        addClassItem.classList.toggle("cc-feature-enabled", classBuilderOn);
        addClassItem.setAttribute("aria-hidden", classBuilderOn ? "false" : "true");
    }
    if (addClassBtn) {
        addClassBtn.disabled = !classBuilderOn;
        addClassBtn.tabIndex = classBuilderOn ? 0 : -1;
    }
    // Modal schließen, falls Feature deaktiviert und Overlay noch offen
    if (!classBuilderOn) {
        const overlay = document.getElementById("customClassOverlay");
        if (overlay && overlay.style.display !== "none" && overlay.style.display !== "") {
            if (typeof closeCustomClassModal === "function") closeCustomClassModal();
        }
    }

    const subclassBuilderOn = isCustomFeatureEnabled("customSubclassBuilder");
    const addScWrap = document.getElementById("addCustomSubclassWrap");
    const addScBtn = document.getElementById("addCustomSubclassBtn");
    if (addScWrap) {
        addScWrap.classList.toggle("cc-feature-enabled", subclassBuilderOn);
        addScWrap.setAttribute("aria-hidden", subclassBuilderOn ? "false" : "true");
    }
    if (addScBtn) {
        addScBtn.disabled = !subclassBuilderOn;
        addScBtn.tabIndex = subclassBuilderOn ? 0 : -1;
    }
    if (!subclassBuilderOn) {
        const scOverlay = document.getElementById("customSubclassOverlay");
        if (scOverlay && scOverlay.style.display !== "none" && scOverlay.style.display !== "") {
            if (typeof closeCustomSubclassModal === "function") closeCustomSubclassModal();
        }
    }

    const backgroundBuilderOn = isCustomFeatureEnabled("customBackgroundBuilder");
    const addBgItem = document.getElementById("addCustomBackgroundListItem");
    const addBgBtn = document.getElementById("addCustomBackgroundBtn");
    if (addBgItem) {
        addBgItem.classList.toggle("cc-feature-enabled", backgroundBuilderOn);
        addBgItem.setAttribute("aria-hidden", backgroundBuilderOn ? "false" : "true");
    }
    if (addBgBtn) {
        addBgBtn.disabled = !backgroundBuilderOn;
        addBgBtn.tabIndex = backgroundBuilderOn ? 0 : -1;
    }
    if (!backgroundBuilderOn) {
        const bgOverlay = document.getElementById("customBackgroundOverlay");
        if (bgOverlay && bgOverlay.style.display !== "none" && bgOverlay.style.display !== "") {
            if (typeof closeCustomBackgroundModal === "function") closeCustomBackgroundModal();
        }
    }

    if (typeof applyCscTranslations === "function") applyCscTranslations();
    if (typeof applyCbgTranslations === "function") applyCbgTranslations();
}

(function scheduleApplyCustomFeatureVisibility() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyCustomFeatureVisibility);
    } else {
        applyCustomFeatureVisibility();
    }
})();

/**
 * Modal-Breite: Chooser schmal (`--chooser`), Editor breit (Default).
 * @param {string|HTMLElement} overlayOrModal Overlay-ID, Overlay-Node oder Modal-Node
 * @param {boolean} isChooser true = Erstellen/Hochladen-Ansicht
 */
function setCustomFeatureModalChooserMode(overlayOrModal, isChooser) {
    let modal = null;
    if (typeof overlayOrModal === "string") {
        const overlay = document.getElementById(overlayOrModal);
        modal = overlay?.querySelector(".custom-class-modal") || null;
    } else if (overlayOrModal?.classList?.contains("custom-class-modal")) {
        modal = overlayOrModal;
    } else if (overlayOrModal?.querySelector) {
        modal = overlayOrModal.querySelector(".custom-class-modal");
    }
    if (!modal) return;
    modal.classList.toggle("custom-class-modal--chooser", !!isChooser);
}
