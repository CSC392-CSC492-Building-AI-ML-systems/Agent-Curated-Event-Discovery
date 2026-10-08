import type { EventideEvent } from '../interfaces/interfaces';

// Sample events adapted from Carol's prototype; dates stay upcoming for development.
const skyline = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#2f4fc9"/><stop offset="1" stop-color="#9bd0f2"/></linearGradient></defs><rect width="400" height="260" fill="url(#sky)"/><path d="M250 30h4l8 180h-20z" fill="#fff"/><ellipse cx="252" cy="120" rx="20" ry="8" fill="#fff"/><path d="M0 200h400v60H0z" fill="#7bc653"/><path d="M30 110h65v90H30zm80 30h50v60h-50zm190-40h65v100h-65z" fill="#b9c8de"/></svg>');
const shapes = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><rect width="400" height="260" fill="#f9d3dc"/><circle cx="150" cy="150" r="90" fill="#f6545c"/><circle cx="285" cy="80" r="65" fill="#f7d560"/><path d="M230 180l70-30 60 80-90 20z" fill="#9ccdee"/></svg>');

export function createDiscoverEvents(): EventideEvent[] {
    const samples = [
        ['Toronto Tech Week', 'Meet builders and explore what is next in technology across downtown.', '30 Jane Street', ['tech', 'social', 'AI']],
        ['Toronto Meme Week', 'A playful evening of internet culture, creativity, and new connections.', '250 Queen St W', ['meme', 'social']],
        ['Harbourfront Reading Night', 'Local authors read new work by the water.', '235 Queens Quay W', ['books', 'culture']],
        ['AI Founders Mixer', 'Pitch, meet, and compare notes with early-stage founders.', 'MaRS, 101 College St', ['tech', 'AI', 'social']],
        ['Sunrise Yoga at Trinity Bellwoods', 'A free community class on the lawn. Bring your mat.', '790 Queen St W', ['wellness', 'fitness', 'outdoors']],
        ['Kensington Night Market', 'Street food, vinyl, and vintage finds in the neighbourhood.', 'Kensington Ave', ['food', 'social', 'culture']],
        ['Board Game Social', 'Hundreds of games, snacks, and people to meet.', '600 Bloor St W', ['games', 'social', 'student']],
        ['Contact Photography Walk', 'A guided walk through the Distillery District murals.', '55 Mill St', ['art', 'culture', 'outdoors']],
    ] as const;
    return samples.map(([title, description, address, categories], index) => {
        const date = new Date();
        // Six events tomorrow demonstrate calendar overflow; the others stay on separate days.
        date.setDate(date.getDate() + (index < 6 ? 1 : index - 4));
        date.setHours(index < 6 ? 9 + index * 2 : 18, 0, 0, 0);
        return { key: index + 1, id: index + 1, title, description, address, categories: [...categories], startDate: date.toISOString(), imageUrl: index % 2 ? shapes : skyline };
    });
}
