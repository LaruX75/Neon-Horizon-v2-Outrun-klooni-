
// Physics & Camera
export const FPS = 60;
export const STEP = 1 / FPS;
export const WIDTH = 1024;
export const HEIGHT = 768;
export const ROAD_WIDTH = 2000;
export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const LANES = 3;
export const FIELD_OF_VIEW = 100;
export const CAMERA_HEIGHT = 1000; // Raised slightly for better view of the beach
export const CAMERA_DISTANCE_TO_PLAYER = 400; 
export const CAMERA_DEPTH = 1 / Math.tan((FIELD_OF_VIEW / 2) * Math.PI / 180);
export const DRAW_DISTANCE = 300; 
export const FOG_DENSITY = 5;

// Gameplay - OutRun Specs
export const MAX_SPEED = 12000; // ~293 km/h
export const MAX_SPEED_LOW = 7000; // ~170 km/h (Low Gear)
export const ACCEL = MAX_SPEED / 5;
export const BREAKING = -MAX_SPEED;
export const DECEL = -MAX_SPEED / 5;
export const OFF_ROAD_DECEL = -MAX_SPEED / 2;
export const OFF_ROAD_LIMIT = MAX_SPEED / 4;
export const CENTRIFUGAL = 0.3; 

// Traffic
export const TRAFFIC_COUNT = 20; 
export const TRAFFIC_SPEED = 4000; 

// Game Logic
export const INITIAL_TIME = 75; // More time for the scenic route
export const CHECKPOINT_BONUS = 45; 
export const STAGE_LENGTH = 3000 * SEGMENT_LENGTH; 

// Colors (Palette)
export const COLORS = {
  SKY: {
    // Tropical Blue Gradients
    DAWN: ['#0055ff', '#87CEEB'], 
    DAY: ['#4488ff', '#aaccff'],
    DUSK: ['#224488', '#ff9966'],
    NIGHT: ['#001133', '#000011'],
    // Stage 5 Special
    LAKESIDE: { top: [80, 0, 100], bottom: [255, 100, 50], terrain: [20, 0, 40], cloud: [255, 180, 200] }
  },
  ROAD: {
    // Beach / Sega Arcade Style - Brighter Sand
    LIGHT: { road: '#999999', grass: '#eecfaa', rumble: '#555555', lane: '#CCCCCC' }, 
    DARK: { road: '#888888', grass: '#e4c4a0', rumble: '#bb0000', lane: '#888888' },
    // Keep synthwave for later stages if needed, or make it sunset style
    NIGHT_LIGHT: { road: '#222244', grass: '#000000', rumble: '#00ffff', lane: '#ff00ff' },
    NIGHT_DARK: { road: '#1a1a3a', grass: '#0a0a1a', rumble: '#222244', lane: '#1a1a3a' },
    // Stage 5 Special - Chrome/Purple road
    LAKESIDE_LIGHT: { road: '#332244', grass: '#000000', rumble: '#00ffff', lane: '#ff00ff' }, // Grass is transparent/water
    LAKESIDE_DARK: { road: '#2a1a3a', grass: '#000000', rumble: '#ff00aa', lane: '#553366' }
  }
};

export const RADIO_CHANNELS = [
  { name: "SPLASH WAVE", freq: "88.5 FM", url: "https://larux75.github.io/app-resources/radio1.mp3" }, 
  { name: "MAGICAL SOUND", freq: "92.4 FM", url: "https://larux75.github.io/app-resources/radio2.mp3" }, 
  { name: "PASSING BREEZE", freq: "96.8 FM", url: "https://larux75.github.io/app-resources/radio3.mp3" }, 
  { name: "AI NEWS", freq: "101.2 FM", url: "TTS" }
];

export const TRAFFIC_ANNOUNCEMENTS: Record<number, string> = {
  1: "Rantatiellä on raportoitu hidastelevia matkailuautoja, joten varautukaa nopeisiin ohituksiin keltaisen viivan kohdalla.",
  2: "Aavikon pitkällä suoralla on havaittu hiekan alle hautautuneita esteitä, jotka voivat vaurioittaa alustaa kovassa vauhdissa.",
  3: "Keskustan neonvalojen alla vallitsee kova iltaruuhka, ja taksit vaihtavat kaistaa ilman varoitusta neulansilmämutkissa.",
  4: "Pohjoisella metsätaipaleella on nähty hirviä tien välittömässä läheisyydessä, joten pitäkää katseenne tiukasti horisontissa.",
  5: "Järvenrantatiellä on paikoin öljyä asfaltilla, mikä tekee tiukoista mutkista erittäin vaarallisia jopa kokeneille kuljettajille."
};

export const WEATHER_FORECASTS: Record<number, string> = {
  1: "Rantabulevardilla vallitsee täydellinen kesäsää ja kirkas aurinko paistaa lähes pilvettömältä taivaalta. Kevyt merituuli viilentää mukavasti, mutta muista varoa asfaltille lentänyttä irtosoraa ja hiekkaa mutkissa. Nyt on paras hetki laskea katto alas ja nauttia trooppisesta tunnelmasta kelloa vastaan.",
  2: "Aavikon yllä väreilee polttava helleaalto, joka saa horisontin näyttämään elävältä ja petolliselta. Voimakas puuskittainen tuuli saattaa pöllyttää hiekkaa tielle, mikä heikentää näkyvyyttä ja renkaiden pitoa pitkillä suorilla. Pidä huoli, ettei moottori ylikuumene tässä säälimättömässä kuumuudessa ennen seuraavaa keidasta.",
  3: "Kaupunki on verhoutunut sähköiseen yöilmaan, jossa kirkkaat neonvalot heijastuvat kosteasta asfaltista pienen tihkusateen jälkeen. Ilmanala on tyyni, mutta kapeat kadut ja pilvenpiirtäjien väliset varjot voivat kätkeä yllättäviä lätäköitä. Kaupungin syke ja viileä yöilma tarjoavat optimaaliset olosuhteet huippunopeuden testaamiseen ruuhkasta huolimatta.",
  4: "Pohjoinen sää yllättää kuljettajat matalalta paistavalla syysauringolla, joka häikäisee armottomasti metsätaipaleiden välissä. Tien pinta on paikoin kostea ja tien pientareilla saattaa näkyä varhaista aamukuuraa, mikä tekee neulansilmämutkista erittäin liukkaita. Ole valppaana hirvivaaran vuoksi, sillä hämärä laskeutuu mäntymetsän siimeksessä nopeammin kuin uskotkaan.",
  5: "Järvenrannalla sää on tyyni ja pehmeä usva nousee vedenpinnasta peittäen osan tiestä mystiseen vaippaan. Lämpötila on miellyttävän leuto, mutta kosteus tekee mutkaisista rannikkoteistä haastavia kokeneellekin kuljettajalle. Nauti tyyneydestä ja veden kimalteesta, mutta älä anna rauhallisen maiseman hämätä sinua unohtamaan tiukkoja mutkia."
};

export const NEWS_HEADLINES = [
  "Rannikkotien uusi valtias: Mystinen punainen Testarossa rikkoi Coconut Beachin nopeusennätyksen tänään kello kaksitoista. Todistajien mukaan kuljettaja ei nostanut jalkaa kaasulta kertaakaan edes vaarallisessa neulansilmämutkassa. Poliisi on lopettanut takaa-ajon, sillä auto katosi horisonttiin ennen kuin kukaan ehti lukea rekisterikilpeä.",
  "Keltainen Kupla aiheuttaa kaaosta: Hitaasti etenevä keltainen kakkoskopan Kupla on aiheuttanut kilometrien jonot matkalla kohti Marble Canyonia. Liikennevirasto kehottaa kaikkia kiireisiä kuljettajia tekemään ohitukset vain suorilla tieosuuksilla. Muistakaa, että turvallinen etäisyys on tärkeää, vaikka vauhti olisikin hidasta.",
  "Magical Sound Shower nousee listakärkeen: Paikalliset radiokanavat raportoivat valtavasta määrästä toiveita tämän viikon trooppiselle kasettihitille. Kasettisoittimet laulavat rannikolla, kun kuljettajat nauttivat aurinkoisesta säästä ja tarttuvasta rytmistä. Tämä kappale on virallisesti valittu koko kesän parhaaksi soundtrackiksi.",
  "Helleaalto koettelee autiomaata: Lämpötila on noussut ennätyslukemiin Desert Valleyn pitkillä ja pölyisillä suorilla. Muista tarkistaa autosi jäähdytysnesteet ennen kuin suuntaat kohti polttavaa aavikkoa. Kukaan ei halua jäädä tienposkeen kesken matkan, kun aurinko paahtaa säälimättömästi.",
  "Salaperäinen nainen Ferrarin kyydissä: Kuka on se vaalea nainen, joka on nähty toistuvasti punaisen Ferrarin apukuskin paikalla? Huhujen mukaan hän on alueen nopeimman kuljettajan onnenamuletti ja taitava kartanlukija. Monet yrittävät pysyä auton perässä vain nähdäkseen vilauksen tästä mystisestä parivaljakosta.",
  "Palm Tree Junctionin taukopaikka laajentaa: Rannikon suosituin risteyspaikka tarjoaa nyt kylmää ananasmehua ja uudet renkaat ennätysajassa. Tämä on täydellinen pysähdyspaikka kuljettajille, jotka tarvitsevat nopean virkistyksen ennen reittivalintaa. Muista valita oikea kaista ajoissa, jotta matkasi jatkuu kohti suosikkikohdettasi.",
  "Sumuvahinko Cloud Passin reitillä: Näkyvyys on laskenut lähes nollaan vuoriston korkeimmilla kohdilla sakean sumun vuoksi. Pidä takavalot näkyvissä ja luota vaistoihisi, jos aiot selvitä mutkista hengissä. Vuoristoilma on raikasta, mutta tie on petollisen liukas juuri nyt.",
  "Radioasema ONN etsii uutta ääntä: Haluatko olla koko rannikon tunnetuin ääni ja viihdyttää tuhansia autoilijoita? Etsimme nyt henkilöä, joka tuntee syntetisaattorimusiikin ja osaa lukea tiesää-tiedotteita lennosta. Lähetä näyteäänesi asemallemme heti, jos uskot olevasi uusi radio-ikonimme.",
  "Turbo-Grip renkaiden uusi mainoskampanja: Uusi mainoskampanja lupaa, ettei yksikään mutka ole liian jyrkkä näille kumeille. Kun asfaltti polttaa renkaan alla, Turbo-Grip takaa maksimaalisen pidon ja tyylikkäät drifit. Testaa uusi kumiseos jo tänään lähimmällä huoltoasemallasi.",
  "Auringonlasku kutsuu yöajajia: Illan hämärtyessä hiekkarantojen neonvalot syttyvät ja musiikki muuttuu elektronisemmaksi. On aika vaihtaa kanavaa ja antaa kaupungin valojen ohjata matkaasi kohti kaukaisia tavoitteita. Yöajo on parasta aikaa niille, jotka rakastavat vauhtia ja vapautta.",
  "Kivivyöry Marble Canyonissa puhdistettu: Tie on vihdoin avattu ja kapeat solaosuudet ovat vapaat raskasta rekkaliikenteestä. Nyt on loistava hetki testata autosi kiihtyvyyttä ja jousitusta kapeilla vuoristoteillä. Ole kuitenkin valppaana, sillä irtokiviä saattaa yhä löytyä mutkien takaa.",
  "Retrotyyli valloittaa asfalttitiet: Valkoiset pellavapaidat ja suuret aurinkolasit ovat palanneet rannikon muotiin ryminällä. Tyyli on vähintään puoli voittoa, kun kaartaa voitokkaasti maaliin yleisön kannustaessa. Muista näyttää hyvältä, vaikka vauhtia olisi reilusti yli kaksisataa kilometriä tunnissa.",
  "Ulosajo Gateway-risteyksessä: Upea punainen urheiluauto päätyi hiekalle liiallisen tilannenopeuden ja väärän reittivalinnan vuoksi. Onneksi kuljettaja selvisi säikäyksellä ja auto saatiin hinattua takaisin radalle nopeasti. Muista tehdä päätös seuraavasta suunnasta hyvissä ajoin ennen risteystä.",
  "Uusi huoltoasema avattu autiomaan dyyneille: Saat nyt korkeaoktaanista polttoainetta suoraan hiekkadyynien keskeltä keltaisen teltan alta. Älä anna polttoainemittarin neulan laskea nollaan, tai matkasi katkeaa ennen seuraavaa tarkistuspistettä. Kylmä juoma kuuluu jokaisen tankkauksen hintaan tässä kuumuudessa.",
  "Splash Wave soi jokaisessa radiossa: Surffarit ja autoharrastajat ovat vihdoin yhtä mieltä siitä, mikä on kesän paras kappale. Tämä musiikki saa auton tuntumaan kevyemmältä ja mieli matkaa jo kauas horisonttiin. Laita volumet kaakkoon ja anna rytmin viedä sinut maaliin asti.",
  "Historiallinen linna houkuttelee katsojia: Vanhat rauniot reitin varrella ovat hieno näky, mutta älä unohda seurata tietä. Kapeat kaarteet linnoituksen muurien katveessa vaativat kuljettajalta täydellistä keskittymistä ja taitoa. Monet turistit kuvaavat ohi kiitäviä autoja linna-alueen näköalapaikoilta käsin.",
  "Turbo-buusti on mekaanikkojen puheenaihe: Asiantuntijat väittelevät kiivaasti siitä, voiko oikealla ajoituksella saada moottorista irti uskomattomia tehoja. Jotkut väittävät kokeneen kuljettajan pystyvän ylittämään fysiikan lait vain yhdellä napin painalluksella. Kokeile itse seuraavalla suoralla, jos uskallat haastaa autosi rajat.",
  "Rantatie puhdistettu hiekasta myrskyn jälkeen: Viimeöinen myrsky toi valtavasti hiekkaa asfaltille, mutta aura-autot ovat tehneet hienoa työtä aamun aikana. Tie on nyt puhdas ja valmis uusiin nopeusennätyksiin auringon kimaltaessa meren pinnalla. Pito on hyvä, mutta varo kosteita kohtia varjoisissa paikoissa.",
  "Checkpoint-aika käy vähiin: Kello käy armottomasti ja seuraava tarkistuspiste on saavutettava ennen kuin aika loppuu kokonaan. Vain nopeimmat ja taitavimmat kuljettajat palkitaan lisäajalla ja oikeudella jatkaa tätä upeaa matkaa. Älä viivyttele maisemien katselussa, jos haluat nähdä maalilipun.",
  "Loppusuora ja suuret palkinnot odottavat: Sadat innokkaat katsojat ovat kerääntyneet maaliviivalle odottamaan päivän suurinta sankaritekoa. Kuka kruunataan tänään koko rannikon kiistattomaksi asfalttikuninkaaksi ja saa nimensä tulostaululle? Kaikki ratkeaa viimeisessä mutkassa, joten pysy tiellä ja anna palaa."
];