// newsData.js
const newsUpdates = [
      {
        date: "16.08.2026",
        version: "v1.6",
        content: `
            Bugfixing:
            <ul class="news-list">
                <li>Charakterbogen: Talente werden beim Zurücksetzen bzw. Leeren des Bogens nun vollständig gelöscht.</li>
            </ul>

            Optimierungen:
            <ul class="news-list">
                <li>Startseite: Links zu "Impressum", "Datenschutz" und "Umgang mit KI" wurden ergänzt.</li>
            </ul>
        `
      },
      {
        date: "03.08.2026",
        version: "v1.5",
        content: `
            Bugfixing:
            <ul class="news-list">
                <li>Barbar: Vertauschte Merkmalsbeschreibungen für "Verstärkter Bruter Schlag" auf Stufe 13 und Stufe 17 korrigiert.</li>
                <li>Barbar: Der Falsche Übungsbonus auf Stufe 15 von +5 wurde auf die korrekten +4 angepasst.</li>
                <li>Barde (Schritt 6): Beim Merkmal "Zusätzliches Wissen" (Schule des Wissens) können nun ordnungsgemäß 3 statt 2 Fertigkeiten gewählt werden.</li>
                <li>Kleriker: Die Anzahl der verfügbaren Nutzungen für "Göttliche Macht fokussieren" auf Stufe 7 wurde von 4 auf 3 korrigiert.</li>
                <li>Kleriker (Schritt 7): Auf Stufe 12 beträgt die Anzahl der wählbaren vorbereiteten Zauber nun korrekt 16 (statt 17).</li>
                <li>Kämpfer: Das Merkmal "Zauberwirken" der Unterklasse "Mystischer Ritter" wird nun wieder ordnungsgemäß auf dem Charakterbogen angezeigt.</li>
                <li>Mönch: Fehler in der Beschreibung der "Technik der offenen Hand" (Krieger der offenen Hand) behoben – gewährt nun wie vorgesehen das Unterbinden von Gelegenheitsangriffen (statt Reaktionen).</li>
                <li>Paladin: Zauberprogression bezüglich verfügbarer Zaubergrade und vorbereiteter Zauber auf den Stufen 2 bis 4 korrigiert.</li>
                <li>Waldläufer: Die Merkmale "Grässliche Schläge" (Feenwanderer) und "Defensive Taktiken" (Jäger) werden nun korrekt auf dem Charakterbogen dargestellt.</li>
                <li>Schurke (Schritt 6): "Heilkunde" wurde aus den wählbaren Basisfertigkeiten entfernt.</li>
                <li>Hexenmeister (Schritt 6): Fehler behoben, durch den Talente mit der Bedingung "Zauberwirken/Paktmagie" nicht ausgewählt werden konnten.</li>
                <li>Hintergrund "Handwerker" (Schritt 2): Das fälschlicherweise enthaltene heilige Symbol wurde aus Startausrüstung A entfernt.</li>
                <li>Volk "Goliath": Die Kreaturengröße wurde von "Groß" auf die regelkonforme Größe "Mittel" korrigiert.</li>
                <li>Talente (Schritt 6): Die Attributswerte-Boni für "Schwer gerüstet", "Meister der schweren Rüstungen" und "Berittener Kämpfer" wurden korrigiert.</li>
                <li>Fehlende Zauber ergänzt (Schritt 7): Strahlendes Niederstrecken, Melfs Säurepfeil, Nystuls Magische Aura, Leomunds Winzige Hütte, Leomunds Geheime Truhe, Tensers Schwebende Scheibe, Evards Schwarze Tentakel, Mordenkainens Treuer Hund, Mordenkainens Privates Heiligtum, Otilukes Unverwüstliche Sphäre, Bigbys Hand, Drawmijs Sofortige Herbeizauberung, Heldenmahl, Otilukes Frostsphäre, Ottos Unwiderstehlicher Tanz, Mordenkainens Herrliches Herrenhaus und Mordenkainens Schwert hinzugefügt.</li>
            </ul>

            Optimierungen:
            <ul class="news-list">
                <li>Barbar: Die Merkmalsbeschreibung von "Krieger der Götter" (Pfad des Eiferers) wurde um die Progression der Heilungswürfel (W12) über die Stufen hinweg ergänzt.</li>
                <li>Druide: Die Ausprägung "Naturmagier" des Merkmals "Erzdruide" wurde klarer formuliert (jede Anwendung stellt 2 Zaubergrade wieder her).</li>
                <li>Talente: Beschreibungen präzisiert und Fachbegriffe strikt an das offizielle Spielerhandbuch (2024/5.5e) angepasst.</li>
                <li>Charakterersteller (Schritt 5): Stufen-Eingabefeld inklusive Schriftgröße vergrößert und Stepper-Buttons für eine deutlich bessere mobile Bedienung hinzugefügt.</li>
                <li>Charakterersteller: Die Erklärtexte aller Schritte (1 bis 12) wurden immersiver und ansprechender gestaltet.</li>
            </ul>

            Angepasste Übersetzungen (ans PHB):
            <ul class="news-list">
                <li>Sämtliche Hintergrundbezeichnungen an das deutsche Spielerhandbuch angeglichen.</li>
                <li>Merkmalsbezeichnungen und -beschreibungen aller Völker an das deutsche Spielerhandbuch angeglichen.</li>
                <li>Deutsche Zauberbezeichnungen und Zauberbeschreibungen an das deutsche Spielerhandbuch angeglichen..</li>
            </ul>
        `
    },
    {
        date: "28.07.2026",
        version: "v1.4",
        content: `
            Bugfixing:
            <ul class="news-list">
                <li>Charakterbogen: Die passive Wahrnehmung berücksichtigt nun korrekt den Übungsbonus.</li>
                <li>Kleriker (Domäne des Lebens): Der Zauber "Wunden heilen" wird nun ordnungsgemäß in der Zauberprogression angezeigt.</li>
                <li>Krieger: Darstellungsfehler bei den Merkmalen "Angriffsstudien", "Tatendrang", "Unbeugsamkeit" und "Kampfüberlegenheit" auf dem Charakterbogen behoben.</li>
                <li>Schurke: Fehlende Beschreibungen für die Merkmale "Kletteraffe", "Außerordentliches Schleichen" und "Magischen Gegenstand verwenden" auf dem Charakterbogen hinzugefügt.</li>
                <li>Hexenmeister (Der Große Alte): Das fehlende Merkmal "Gedankenschild" wurde ergänzt.</li>
                <li>Hexenmeister: Die Anzahl der Zaubertricks auf Stufe 4 wurde gemäß PHB von 2 auf 3 korrigiert.</li>
                <li>Magier (Schritt 6): Beim Merkmal "Gelehrter" sind die Expertise-Optionen nun korrekterweise erst ab Stufe 2 (statt Stufe 1) und nur noch für die Regelfeld-Fertigkeiten auswählbar (Arkane Kunde, Geschichte, Heilkunde, Nachforschungen, Naturkunde, Religion).</li>
                <li>Datenbank: Falsche Rettungswürfe des Waldläufers auf Stärke und Geschicklichkeit korrigiert (war fälschlicherweise Geschicklichkeit und Weisheit).</li>
                <li>Mönch (Schritt 8): Bei der Startausrüstung wird nun korrekt nur noch ein Instrument ODER Handwerkszeug gewährt (statt beidem).</li>
            </ul>

            Optimierungen:
            <ul class="news-list">
                <li>Charakterbogen: In den Ausrüstungstabellen für Werkzeuge wurde das entsprechende Attribut-Feld angelegt. Die Typ-Spalte in der Sonstiges-Tabelle wird nun mit Ausrüstungstypen wie "Zauberfokus" oder "Zaubermaterial" befüllt.</li>
                <li>Charakterbogen: Regelabgleich sowie Formulierungs-Optimierungen der Merkmalsbeschreibungen aller Klassen und Unterklassen durchgeführt.</li>
            </ul>

            Angepasste Übersetzungen (ans PHB):
            <ul class="news-list">
                <li>Sämtliche Merkmals-, Unterklassen- und Unterklassenmerkmalsbezeichnungen aller Klassen im Charakterbogen überarbeitet.</li>
            </ul>
        `
    },
    {
        date: "26.05.2026",
        version: "v1.3",
        content: `
            Bugfixing:
            <ul class="news-list">
                <li>Barde: Die Erxpertise-Optionen sind jetzt korrekt auf Stufe 2 verfügbar (nicht bereits auf Stufe 1).</li>
                <li>Hexenmeister: Die schauerliche Anrufung "Durstige KLinge" steht nun in Schritt 5 als Option zur Verfügung.</li>
                <li>In den Waffenmeisterschaften werden der Flegel und der Morgenstern nun als Optionen angezeigt.</li>
            </ul>

            Angepasste Übersetzungen (ans PHB): 
            <ul class="news-list">
                <li>Schauerliche Anrufenen (Hexenmeister)</li>
                <li>Talente (Herkunft, Allgemein, Kampfstile & Gaben)</li>
            </ul>
        `
    },
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