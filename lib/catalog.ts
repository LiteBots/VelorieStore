// Dane współdzielone przez serwer i klienta (bez sekretów).
export type Plat = 'minecraft' | 'fivem' | 'other';
export type LicId = 'std' | 'pro' | 'net';
export interface Category { id: string; name: string; full: string; plat: Plat; icon: string; sub: string; count: number }
export interface LicenseTier { id: LicId; name: string; mult: number; note: string; perks: string[]; maxServers: number; updatesMonths: number | null }

export const CATS: Category[] = [
  {id:'mc-plugin',name:'Pluginy',full:'Pluginy Minecraft',plat:'minecraft',icon:'cube',sub:'Paper, Spigot, Folia, Velocity',count:1240},
  {id:'mc-map',name:'Mapy i lobby',full:'Mapy Minecraft',plat:'minecraft',icon:'map',sub:'Spawny, lobby, areny, światy',count:386},
  {id:'mc-setup',name:'Gotowe setupy',full:'Setupy Minecraft',plat:'minecraft',icon:'layers',sub:'Kompletne serwery do wdrożenia',count:142},
  {id:'mc-pack',name:'Resource packi',full:'Resource packi',plat:'minecraft',icon:'brush',sub:'Modele 3D, GUI, ikony rang',count:218},
  {id:'fivem-script',name:'Skrypty',full:'Skrypty FiveM',plat:'fivem',icon:'code',sub:'ESX, QBCore, QBox, ox_lib',count:1980},
  {id:'fivem-mlo',name:'Interiory MLO',full:'Interiory MLO',plat:'fivem',icon:'door',sub:'Komisariaty, szpitale, kluby',count:612},
  {id:'fivem-map',name:'Mapy YMAP',full:'Mapy FiveM',plat:'fivem',icon:'city',sub:'Dzielnice, drogi, tory',count:274},
  {id:'fivem-vehicle',name:'Pojazdy',full:'Pojazdy FiveM',plat:'fivem',icon:'car',sub:'Add-on, ELS, handling',count:833},
  {id:'discord',name:'Boty Discord',full:'Boty Discord',plat:'other',icon:'bot',sub:'Tickety, weryfikacja, logi',count:164},
  {id:'web',name:'Strony i panele',full:'Strony WWW',plat:'other',icon:'globe',sub:'Strony serwerów, itemshopy',count:97},
  {id:'gfx',name:'Grafiki',full:'Grafiki i branding',plat:'other',icon:'image',sub:'Loga, banery, ikony',count:255},
];
export const PLATS: Record<Plat, string> = {minecraft:'Minecraft',fivem:'FiveM',other:'Discord i web'};
const LIC_BASE = [
  {id:'std',name:'Standard',mult:1,note:'1 serwer · aktualizacje 12 mies.',perks:['1 serwer (IP lub ID)','Aktualizacje przez 12 miesięcy','Support przez ticket','3 zmiany IP w miesiącu']},
  {id:'pro',name:'Pro',mult:1.6,note:'3 serwery · aktualizacje dożywotnio',perks:['Do 3 serwerów','Aktualizacje dożywotnio','Priorytetowy support','Serwer testowy gratis']},
  {id:'net',name:'Network',mult:2.8,note:'Bez limitu w sieci · kod źródłowy',perks:['Bez limitu serwerów w sieci','Kod źródłowy, jeśli twórca udostępnia','Prawo do modyfikacji na własny użytek','Kanał bezpośrednio z twórcą']},
];
export const LIC: LicenseTier[] = LIC_BASE.map((l) => ({
  ...l,
  id: l.id as LicId,
  maxServers: l.id === 'std' ? 1 : l.id === 'pro' ? 3 : 999,
  updatesMonths: l.id === 'std' ? 12 : null,
}));
export const licOf = (id: string) => LIC.find((l) => l.id === id) || LIC[0];
export const priceFor = (base: number, lic: string) => Math.round(base * licOf(lic).mult);
export const catOf = (id: string) => CATS.find((c) => c.id === id) || CATS[0];

export const QUOTES: [string, string, string, string][] = [
  ['Przenieśliśmy BoxPvP na setup od Velorie i postawiliśmy serwer w jeden wieczór. Gildie działają bez lagów przy 600 graczach.','Kacper','właściciel, BoxCraft.pl','#2f6bff'],
  ['Sprzedaję tu swoje MLO od marca. Wypłaty przychodzą co tydzień, a licencje same pilnują, żeby pliki nie wyciekały.','Mira','twórczyni interiorów','#0ea5e9'],
  ['MDT od Velorie to pierwszy tablet, który nie zabija resmonu. Support odpisał w 20 minut, w niedzielę.','Oskar','zarząd, Warsaw City RP','#6366f1'],
  ['Kupiłem antycheata i lobby w jednym koszyku. Klucze przyszły od razu, a podpięcie licencji zajęło minutę.','Bartek','admin, SkyMC','#38bdf8'],
  ['Panel twórcy pokazuje wszystko: sprzedaż, zwroty, aktywne licencje. Wreszcie nie muszę prowadzić tego w arkuszu.','Zuza','developerka pluginów','#1d4fd8'],
  ['Polish Police Pack to najlepiej oznakowane radiowozy, jakie widziałem. Handling dopracowany pod RP.','Igor','zarząd, Kraków RP','#60a5fa'],
];
export const FAQ: [string, string][] = [
  ['Jak działa licencja po zakupie?','Po płatności dostajesz klucz w formacie VLR-XXXX-XXXX-XXXX. Wpisujesz go w configu pluginu albo w server.cfg. Klucz przypisuje się do IP lub ID serwera przy pierwszym uruchomieniu. IP zmienisz sam w bibliotece zakupów.'],
  ['Czym jest escrow w skryptach FiveM?','Część skryptów jest szyfrowana systemem asset escrow od Cfx.re. Logika jest chroniona, a pliki config.lua i lokalizacje zostają otwarte, więc dostosujesz wszystko do swojego serwera.'],
  ['Czy mogę sprzedawać własne pluginy, skrypty i mapy?','Tak. Zakładasz konto twórcy, przechodzisz weryfikację i wystawiasz produkt. Każdy plik sprawdzamy pod kątem malware i backdoorów przed publikacją. Zatrzymujesz 85% ceny.'],
  ['Jakie metody płatności obsługujecie?','BLIK, Przelewy24, karty Visa i Mastercard, PayPal oraz PaySafeCard. Klucz i pliki dostajesz od razu po zaksięgowaniu płatności.'],
  ['Co jeśli produkt nie działa?','Masz 14 dni na zgłoszenie problemu. Jeśli twórca nie naprawi błędu w ciągu 72 godzin, zwracamy pieniądze.'],
  ['Czy dostanę aktualizacje pod nowe wersje Minecrafta i FiveM?','Tak. Licencja Standard obejmuje 12 miesięcy aktualizacji, a Pro i Network aktualizacje dożywotnio. Nowe wersje pobierasz z biblioteki zakupów.'],
];


export const zl = (n: number) =>
  (Math.round(n * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' zł';
export const plural = (n: number, a: string, b: string, c: string) =>
  n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c;
export const num = (n: number) => (n || 0).toLocaleString('pl-PL');
export const SELLER_SHARE = 0.85;
