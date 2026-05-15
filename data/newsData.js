// newsData.js
const newsUpdates = [
    {
        date: "15.05.2026",
        version: "v1.2",
        content: `
            Bugfixing:
            <ul class="news-list">
                <li>Tabellen im Zauber-Anhang (Charakterbogen) werden jetzt korrekt formatiert angezeigt.</li>
                <li>Beim aktivieren von Checkboxen der Waffen (Charakterbogen, Seite 2) auf dem Charakterbogen, bleiben jetzt manuelle Eintröge in der Tabelle für Physischen ANgriffe erhalten.</li>
                <li>Manuelle Einträge auf der Zauberliste (Charakterbogen, Seite 5) werden bei Generierung des Zauberanhangs nicht mehr gelöscht.</li>
                <li>Das gewählte Zauberattribut für Volkszauber wird jetzt korrekt auf Seite 5 (Zauberliste) angezeigt.</li>
                <li>Ein Fehler bezüglich der Zaubergrade des Waldläufers in der Datenbank wurde korrigiert.</li>
            </ul>

            Optimierungen:
            <ul class="news-list">
                <li>Auf der Landing-Page wurde diese News-Karte implementiert, damit Interssierte immer sehen könnt was das letzte Update beinhaltet hat.</li>
                <li>Die Dropdown-Optionen im Charakterersteller werden nun alphabetisch sortiert angezeigt.</li>
                <li>Der Link zu - www.dicecharacters.com - wurde in Fusszeile des Charakterbogens eingefügt.</li>
                <li>Schriftgrößen und Formatierung der Zauberliste (Charakterbogen, Seite 5) wurden für bessere Lesbarkeit angepasst.</li>
                <li>Layout, Schriftgrössen und Anordung der Zauberkarten (Charakterbogen, Zauberanhang) wurden optimiert</li>
                <li>Die Buttons des Charakterbogens wurden Re-Designed und in ein Werkbank-Menü eingebettet.</li>
                <li>Dem Werkbank-Menü (Charakterbogen) wurden Funktionen und Buttons für das Speichern (json), Hochladen (json) und Daten leeren hinzugfeürgt. Nun ist es möglich Informationen eines bestehenden Bogens anzupassen, abzuspeichern und wieder abzurufen.</li>
                <li>Von der Landing-Page kann ein leerer Charakterbogen nun direkt über einen neuen Button erreicht werden.</li>
            </ul>
        `
    },
    {
        date: "25.03.2026",
        version: "v1.1",
        content: `
            Optimierung von Charakterbogen der Druckausgabe für Safari (iOS):
            <ul class="news-list">
                <li>Schriftgrößen aus ausgerichtet</li>
                <li>Druckränder für A4 optimiert</li>
            </ul>
        `
    },
    {
        date: "17.03.2026",
        version: "v1.0",
        content: `
            Launch der offiziellen v1.0:
            <ul class="news-list">
                <li>Mobile & Tablet: Verbesserte Touch-Funktionen (wie Drag&Drop) und optimierte Layouts</li>
                <li>PDF-Druck: Der Export wurde generell stabilisiert und optimiert.</li>
                <li>Lizenz: Die Inhalte wurden an die aktuellste Lizenz (SRD_CC_v5.2.1) angenähert und sämtliche lizenzpflichtigen Bilder ersetzt.</li>
                <li>Performance: Deutlich schnellere Ladezeiten von Bilddateien.</li>
                <li>Sprachschliff: Viele Texte und Formulierungen wurden poliert.</li>
            </ul>
        `
    },
    {
        date: "07.03.2026",
        version: "v0.0",
        content: "Launch der Alpha-Version."
    }
];