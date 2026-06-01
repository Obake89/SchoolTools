# Google Apps Script dla zadań

Ten katalog zawiera prosty backend do integracji:

- panel nauczyciela zapisuje konfigurację zadania,
- panel nauczyciela pobiera klasy z arkusza Google,
- uczeń pobiera zadanie po `assignmentId`,
- ukończenie rund zapisuje się do Google Sheets.

## Arkusz

1. Utwórz nowy Google Sheet.
2. Otwórz `Extensions -> Apps Script`.
3. Wklej zawartość [Code.gs](/C:/Users/wojci/Documents/SchoolTools/apps-script/Code.gs).
4. Zapisz projekt.
5. Wdróż jako `Web app`.

## Ustawienia wdrożenia

- Execute as: `Me`
- Who has access: `Anyone with the link`

Po wdrożeniu skopiuj adres `.../exec` i wklej go w panelu nauczyciela.

## Zakładki tworzone automatycznie

- `classes`
- `assignments`
- `students`
- `attempts`
- `linear-equations-tasks`

W nowej wersji zakładka `assignments` zapisuje:

- identyfikator zadania,
- nazwę,
- narzędzie,
- klasę,
- `settingsJson`,
- gotowy link dla ucznia,
- datę utworzenia.

## Jak przygotować klasy

W zakładce `classes` wpisz dane w układzie:

```text
classId | studentName
4A      | Anna Kowalska
4A      | Jan Nowak
5B      | Maria Zielińska
```

Jedna osoba w jednym wierszu.

Panel nauczyciela pokaże dostępne klasy na podstawie tej zakładki.

## Co już obsługuje

- pobieranie klas z arkusza,
- tworzenie zadania dla wybranej klasy,
- listę uczniów przypisaną do zadania na podstawie klasy,
- pobieranie konfiguracji przez link ucznia,
- zapis tylko ukończonych zadań w `attempts`.

## Zakładka `linear-equations-tasks`

W tej zakładce przygotowujesz własne równania do narzędzia równań liniowych.

Układ kolumn:

```text
taskId | difficulty | group | title | sourceEquationLatex | simplifiedLeft | simplifiedRight | tilePool | instructions
```

Przykład:

```text
hard-01 | hard | A | Iloczyn sum | (x+4)(x+1)=(2x+3)(x-x+2)+5 | 2x+8 | 2x+11 | 2x;8;2x;11;x;-3;5 | Najpierw uprość obie strony, potem rozwiąż równanie.
```

Ważne:

- `sourceEquationLatex` wpisujesz jako LaTeX lub prosty zapis matematyczny do wyświetlenia uczniowi,
- `simplifiedLeft` i `simplifiedRight` wpisujesz jako zwykły zapis tekstowy, na przykład `2x+8`, `-3x+5`, `3/2x-4`,
- `tilePool` jest opcjonalne i zawiera własną listę rozsypanych jednomianów oddzielonych `;`, `|` albo nową linią,
- prostsze jednomiany możesz wpisać w `tilePool` bezpośrednio w LaTeX-u, na przykład `\frac{3}{2}x` albo `-\frac{5}{2}`,
- w `tilePool` możesz używać zapisu `to-co-ma-być-widoczne=>wyrażenie`, jeśli chcesz pokazać klocek w LaTeX-u, ale jego wartość podać zwykłym tekstem, na przykład `\frac{3}{2}x=>3/2x` albo `-\frac{5}{2}=>-5/2`,
- jeśli w `tilePool` pominiesz któryś potrzebny jednomian, narzędzie i tak go dopisze, żeby zadanie dało się rozwiązać.

Nie ma sztywnego limitu liczby pozycji w `tilePool`, ale w praktyce warto trzymać się raczej krótszej rozsypanki, żeby zadanie było czytelne na telefonie i tablecie.

## Co można rozwinąć później

- osobne klasy i grupy uczniów,
- dokładniejsze raporty prób błędnych,
- podsumowanie procentowe,
- blokowanie ponownego wykonania po ukończeniu,
- osobne arkusze dla wielu narzędzi.
