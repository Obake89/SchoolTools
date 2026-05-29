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
- zapis rozpoczęcia zadania,
- zapis zaliczonej rundy i ukończenia całości.

## Co można rozwinąć później

- osobne klasy i grupy uczniów,
- dokładniejsze raporty prób błędnych,
- podsumowanie procentowe,
- blokowanie ponownego wykonania po ukończeniu,
- osobne arkusze dla wielu narzędzi.
