// Match event cards: calendar dates are interpreted in Toronto's timezone.
export function eventDayKey(date: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(date));
    const value = (type: string) => parts.find(part => part.type === type)?.value;
    return `${value('year')}-${value('month')}-${value('day')}`;
}

export function calendarDays(year: number, month: number): (number | null)[] {
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array.from({ length: first }, () => null);
    for (let day = 1; day <= count; day++) cells.push(day);
    while (cells.length % 7) cells.push(null);
    return cells;
}
