# AGENTS.md

## Cel projektu

Tworzymy prostą stronę z interaktywnymi narzędziami matematycznymi dla klas 4-8. Projekt ma działać lokalnie w przeglądarce bez frameworków, ale kod ma być od początku uporządkowany i łatwy do późniejszego przeniesienia do React / Next.js.

## Główna zasada

Każde nowe narzędzie ma działać na tej samej zasadzie, co obecne `number-line` i `linear-equations`.

- Jest tryb wolny do samodzielnego ćwiczenia.
- Jest tryb zadania z linku od nauczyciela.
- Nauczyciel generuje link dla konkretnej klasy lub grupy.
- Uczeń po wejściu w link wybiera siebie z listy i wykonuje całe zadanie.
- Wyniki zapisują się do Google Sheets przez Apps Script.

Nie twórz dla każdego narzędzia osobnego systemu. Rozszerzaj istniejący wzorzec.

## Struktura narzędzia

Każde narzędzie powinno mieć osobny katalog:

```text
tools/
  tool-slug/
    index.html
    style.css
    app.js
    math.js
```

## Podział odpowiedzialności

### `math.js`

Tutaj trafia tylko logika matematyczna:

- obliczenia,
- generowanie zadań,
- sprawdzanie odpowiedzi,
- funkcje pomocnicze.

`math.js` nie może korzystać z DOM, `document.querySelector`, `innerHTML`, `alert` ani bezpośrednio sterować widokiem.

### `app.js`

Tutaj trafia:

- pobieranie elementów HTML,
- obsługa kliknięć i formularzy,
- aktualizacja widoku,
- stan narzędzia,
- inicjalizacja JSXGraph,
- renderowanie KaTeX,
- tryb zadania z linku,
- komunikacja z `shared/assignment-api.js`.

## Tryb zadania

Każde nowe narzędzie musi wspierać tryb zadania uruchamiany z linku.

Po wejściu w link:

- aplikacja odczytuje `assignmentId` z query params, np. `?a=...`,
- pobiera konfigurację zadania,
- pokazuje listę uczniów przypisanych do zadania,
- wymaga wyboru ucznia z listy,
- dopiero potem uruchamia właściwe etapy ćwiczenia.

W trybie zadania uczeń nie może:

- wrócić do listy narzędzi,
- wybrać innego narzędzia,
- zmienić typu zadania,
- przełączyć się na tryb wolny,
- ominąć wyboru siebie z listy.

Dlatego w assignment mode:

- ukrywaj linki powrotu,
- ukrywaj toolbar trybu wolnego,
- ukrywaj selektory konfiguracji,
- nie pokazuj nawigacji do innych narzędzi.

## Etapy i postęp

Nowe narzędzia powinny być projektowane etapowo, podobnie do obecnych modułów.

- Uczeń ma wykonać wszystkie wymagane etapy lub rundy.
- Po każdym etapie dostaje jasny feedback.
- Postęp musi być widoczny, np. `1 / 3`.
- Po ukończeniu całości uczeń dostaje czytelny komunikat końcowy.

Jeśli zadanie ma kilka etapów, nie pokazuj wszystkiego naraz, jeśli powoduje to duże scrollowanie.

## Panel nauczyciela i zapis wyników

Nowe narzędzia mają integrować się z istniejącym panelem `teacher/`, a nie tworzyć osobny panel.

Każde nowe narzędzie powinno:

- dać się wybrać w panelu nauczyciela,
- mieć własne ustawienia w `teacher/app.js`,
- generować link do swojego `tools/<slug>/index.html`,
- zapisywać konfigurację zadania w arkuszu,
- korzystać z listy uczniów przypisanej do klasy lub grupy.

Do zapisu danych używaj istniejących plików:

- `shared/config.js`
- `shared/assignment-api.js`
- `apps-script/Code.gs`

Jeśli potrzeba nowych danych lub nowego typu zadania, rozszerzaj istniejący Apps Script zamiast budować osobny backend.

## Interfejs ucznia

Widok ucznia ma być:

- prosty,
- czytelny,
- responsywny,
- przyjazny na telefonie i laptopie,
- możliwie kompaktowy,
- z jak najmniejszą koniecznością scrollowania.

Zasady:

- najważniejsze rzeczy mają być widoczne od razu,
- instrukcja, postęp i feedback mają być blisko części interaktywnej,
- przyciski mają być duże i czytelne,
- nie twórz wysokich sekcji, które spychają zadanie w dół,
- nie zmuszaj ucznia do przewijania, zanim wykona pierwszą akcję.

## Styl kodu

- Nazwy plików, funkcji i zmiennych po angielsku.
- Teksty dla ucznia po polsku.
- Komunikaty mają być wspierające, np. `Jeszcze nie. Spróbuj ponownie.` albo `Dobrze! Świetna robota.`
- Unikaj globalnego bałaganu. Jeśli trzeba przechowywać stan, używaj jednego obiektu `state`.
- Kod ma być prosty i czytelny, bez przesadnie sprytnych rozwiązań.

## Technologie

Używany stack:

- HTML
- CSS
- JavaScript
- JSXGraph
- KaTeX

Jeśli używasz JSXGraph:

- plansza i jej inicjalizacja są w `app.js`,
- obliczenia pozostają w `math.js`.

Jeśli używasz KaTeX:

- wzory renderuj w wyznaczonych elementach HTML,
- nie rozrzucaj logiki wzorów po wielu miejscach.

## Czego nie robić

- Nie mieszaj logiki matematycznej z DOM.
- Nie buduj jednego ogromnego pliku JS.
- Nie wprowadzaj React, Next.js, backendu ani logowania na tym etapie.
- Nie pozwalaj uczniowi przejść do innych narzędzi po wejściu z linku zadania.
- Nie zostawiaj wyników tylko lokalnie, jeśli zadanie ma być raportowane nauczycielowi.

## Kiedy narzędzie jest gotowe

Nowe narzędzie jest gotowe wtedy, gdy:

- działa lokalnie w przeglądarce,
- ma rozdzielone `math.js` i `app.js`,
- wspiera tryb wolny,
- wspiera tryb zadania z linku,
- uczeń wybiera siebie z listy,
- uczeń wykonuje wszystkie wymagane etapy,
- nie może wrócić do listy narzędzi ani zmienić typu zadania w assignment mode,
- wynik zapisuje się do Google Sheets,
- interfejs jest prosty i kompaktowy.
