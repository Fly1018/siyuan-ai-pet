const COVERS = [
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 360' width='1200' height='360' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#6a8dff'/><stop offset='1' stop-color='#8b5cf6'/></linearGradient></defs><rect width='1200' height='360' fill='url(#g)'/><circle cx='980' cy='80' r='190' fill='#fff' opacity='.14'/><circle cx='1150' cy='320' r='150' fill='#fff' opacity='.1'/><path d='M0 320 1200 200' stroke='#fff' stroke-width='4' opacity='.16'/></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 360' width='1200' height='360' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#0ea5a4'/><stop offset='1' stop-color='#34d399'/></linearGradient></defs><rect width='1200' height='360' fill='url(#g)'/><rect x='880' y='40' width='220' height='220' rx='40' fill='#fff' opacity='.12' transform='rotate(18 990 150)'/><circle cx='120' cy='120' r='90' fill='#fff' opacity='.1'/></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 360' width='1200' height='360' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f59e0b'/><stop offset='1' stop-color='#ef4444'/></linearGradient></defs><rect width='1200' height='360' fill='url(#g)'/><g fill='#fff' opacity='.1'><rect x='300' y='-60' width='40' height='520' transform='rotate(20 320 200)'/><rect x='820' y='-60' width='60' height='520' transform='rotate(20 850 200)'/><rect x='930' y='-60' width='24' height='520' transform='rotate(20 942 200)'/></g></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 360' width='1200' height='360' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f472b6'/><stop offset='1' stop-color='#a855f7'/></linearGradient></defs><rect width='1200' height='360' fill='url(#g)'/><circle cx='200' cy='70' r='120' fill='#fff' opacity='.12'/><circle cx='1020' cy='290' r='170' fill='#fff' opacity='.12'/><circle cx='700' cy='40' r='70' fill='#fff' opacity='.08'/></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 360' width='1200' height='360' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#1e3a8a'/><stop offset='1' stop-color='#0f172a'/></linearGradient></defs><rect width='1200' height='360' fill='url(#g)'/><g fill='#fff' opacity='.5'><circle cx='180' cy='80' r='2'/><circle cx='320' cy='150' r='1.6'/><circle cx='520' cy='60' r='2'/><circle cx='700' cy='190' r='1.6'/><circle cx='900' cy='90' r='2'/><circle cx='1060' cy='200' r='1.6'/><circle cx='420' cy='270' r='1.6'/><circle cx='820' cy='300' r='2'/></g></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 360' width='1200' height='360' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#0f766e'/><stop offset='1' stop-color='#065f46'/></linearGradient></defs><rect width='1200' height='360' fill='url(#g)'/><path d='M0 260 Q300 120 600 240 T1200 200 L1200 360 L0 360 Z' fill='#fff' opacity='.1'/><circle cx='140' cy='80' r='60' fill='#fff' opacity='.12'/></svg>",
];

function hash(text: string): number {
    const value = String(text || "");
    let result = 0;
    for (let index = 0; index < value.length; index += 1) {
        result = (result * 31 + value.charCodeAt(index)) % 100000;
    }
    return result;
}

export function pickTitleImage(docId: string): string {
    const svg = COVERS[hash(docId) % COVERS.length];
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
