const zone = 'America/Toronto';
const localParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const offsetParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, timeZoneName: 'shortOffset',
});

function offsetMinutes(timestamp: number): number {
    const name = offsetParts.formatToParts(timestamp).find(part => part.type === 'timeZoneName')?.value;
    if (name === 'GMT') return 0;
    const match = name?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!match) throw new Error('Unable to determine Toronto timezone offset');
    return (Number(match[2]) * 60 + Number(match[3] || 0)) * (match[1] === '-' ? -1 : 1);
}

/** Normalize API dates to an instant, independent of the browser's timezone. */
export function toTorontoTimestamp(value: string): string {
    if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
        const timestamp = Date.parse(value);
        if (!Number.isFinite(timestamp)) throw new Error(`Invalid event timestamp: ${value}`);
        return new Date(timestamp).toISOString();
    }

    // The API's timezone-less DateTime fields are assumed to mean Toronto local time.
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/);
    if (!match) throw new Error(`Invalid event timestamp: ${value}`);
    const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
    const milliseconds = Number((match[7] || '').padEnd(3, '0').slice(0, 3));
    const wallTime = new Date(0);
    wallTime.setUTCFullYear(year, month - 1, day);
    wallTime.setUTCHours(hour, minute, second, milliseconds);
    const wall = wallTime.getTime();
    const expected = [year, month, day, hour, minute, second];

    // Probe either side of a transition rather than hardcoding EST or EDT.
    const offsets = new Set([-86400000, 0, 86400000].map(delta => offsetMinutes(wall + delta)));
    const candidates = [...offsets].map(offset => wall - offset * 60000).filter(timestamp => {
        const parts = localParts.formatToParts(timestamp);
        return ['year', 'month', 'day', 'hour', 'minute', 'second'].every((type, index) =>
            Number(parts.find(part => part.type === type)?.value) === expected[index]);
    });
    if (candidates.length !== 1) {
        // Missing spring-forward times or repeated fall-back times need an API offset.
        throw new Error(`Event timestamp needs an explicit timezone offset: ${value}`);
    }
    return new Date(candidates[0]).toISOString();
}
