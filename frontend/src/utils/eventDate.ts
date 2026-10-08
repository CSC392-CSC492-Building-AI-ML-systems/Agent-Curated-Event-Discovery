export function formatEventDate(date?: string) {
    if (!date || Number.isNaN(Date.parse(date))) return 'Date to be announced';
    return new Intl.DateTimeFormat('en-CA', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto',
    }).format(new Date(date));
}

