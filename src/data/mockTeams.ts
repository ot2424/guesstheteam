import type { Team, Formation } from '../types';

export const FORMATIONS: Record<string, Formation> = {
  '4-3-3': {
    name: '4-3-3',
    slots: [
      { slot: 0,  position: 'GK', x: 50, y: 88 },
      { slot: 1,  position: 'RB', x: 82, y: 72 },
      { slot: 2,  position: 'CB', x: 62, y: 72 },
      { slot: 3,  position: 'CB', x: 38, y: 72 },
      { slot: 4,  position: 'LB', x: 18, y: 72 },
      { slot: 5,  position: 'CM', x: 72, y: 50 },
      { slot: 6,  position: 'CM', x: 50, y: 46 },
      { slot: 7,  position: 'CM', x: 28, y: 50 },
      { slot: 8,  position: 'RW', x: 82, y: 26 },
      { slot: 9,  position: 'ST', x: 50, y: 18 },
      { slot: 10, position: 'LW', x: 18, y: 26 },
    ],
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    slots: [
      { slot: 0,  position: 'GK',  x: 50, y: 88 },
      { slot: 1,  position: 'RB',  x: 82, y: 72 },
      { slot: 2,  position: 'CB',  x: 62, y: 72 },
      { slot: 3,  position: 'CB',  x: 38, y: 72 },
      { slot: 4,  position: 'LB',  x: 18, y: 72 },
      { slot: 5,  position: 'CDM', x: 62, y: 54 },
      { slot: 6,  position: 'CDM', x: 38, y: 54 },
      { slot: 7,  position: 'RW',  x: 80, y: 34 },
      { slot: 8,  position: 'CAM', x: 50, y: 34 },
      { slot: 9,  position: 'LW',  x: 20, y: 34 },
      { slot: 10, position: 'ST',  x: 50, y: 16 },
    ],
  },
};

// TUTORIAL TEAM – names included (frontend-only mock)
export const REAL_MADRID_2223: Team = {
  id: 'rm-2223',
  name: 'Real Madrid',
  season: '2022/23',
  league: 'La Liga',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
  formation: '4-3-3',
  players: [
    {
      id: 'p1', name: 'Thibaut Courtois',
      position: 'GK', formationSlot: 0,
      nationality: 'Belgium', nationalityFlag: '🇧🇪',
      career: [
        { clubId: 'genk', clubName: 'Genk', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/6/67/KRC_Genk_logo.png', fromYear: 2009, toYear: 2011 },
        { clubId: 'atletico', clubName: 'Atlético Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg', fromYear: 2011, toYear: 2014 },
        { clubId: 'chelsea', clubName: 'Chelsea', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg', fromYear: 2014, toYear: 2018 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2018, toYear: null },
      ],
    },
    {
      id: 'p2', name: 'Dani Carvajal',
      position: 'RB', formationSlot: 1,
      nationality: 'Spain', nationalityFlag: '🇪🇸',
      career: [
        { clubId: 'real-madrid-b', clubName: 'Real Madrid Castilla', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2010, toYear: 2012 },
        { clubId: 'leverkusen', clubName: 'Bayer Leverkusen', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg', fromYear: 2012, toYear: 2013 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2013, toYear: null },
      ],
    },
    {
      id: 'p3', name: 'Éder Militão',
      position: 'CB', formationSlot: 2,
      nationality: 'Brazil', nationalityFlag: '🇧🇷',
      career: [
        { clubId: 'sao-paulo', clubName: 'São Paulo', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Sao_paulo_fc_logo.png', fromYear: 2016, toYear: 2018 },
        { clubId: 'porto', clubName: 'FC Porto', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/3/3b/FC_Porto.svg', fromYear: 2018, toYear: 2019 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2019, toYear: null },
      ],
    },
    {
      id: 'p4', name: 'David Alaba',
      position: 'CB', formationSlot: 3,
      nationality: 'Austria', nationalityFlag: '🇦🇹',
      career: [
        { clubId: 'man-city', clubName: 'Manchester City', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg', fromYear: 2008, toYear: 2008 },
        { clubId: 'hoffenheim', clubName: 'Hoffenheim', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/64/TSG_Logo_2007.svg', fromYear: 2009, toYear: 2011 },
        { clubId: 'bayern', clubName: 'Bayern München', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', fromYear: 2008, toYear: 2021 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2021, toYear: null },
      ],
    },
    {
      id: 'p5', name: 'Ferland Mendy',
      position: 'LB', formationSlot: 4,
      nationality: 'France', nationalityFlag: '🇫🇷',
      career: [
        { clubId: 'le-havre', clubName: 'Le Havre', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/d/db/Havre_AC_logo.svg', fromYear: 2015, toYear: 2017 },
        { clubId: 'lyon', clubName: 'Olympique Lyon', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e2/Olympique_Lyonnais.svg', fromYear: 2017, toYear: 2019 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2019, toYear: null },
      ],
    },
    {
      id: 'p6', name: 'Toni Kroos',
      position: 'CM', formationSlot: 5,
      nationality: 'Germany', nationalityFlag: '🇩🇪',
      career: [
        { clubId: 'bayer-04', clubName: 'Bayer Leverkusen', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg', fromYear: 2009, toYear: 2010 },
        { clubId: 'bayern', clubName: 'Bayern München', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', fromYear: 2007, toYear: 2014 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2014, toYear: null },
      ],
    },
    {
      id: 'p7', name: 'Luka Modrić',
      position: 'CM', formationSlot: 6,
      nationality: 'Croatia', nationalityFlag: '🇭🇷',
      career: [
        { clubId: 'zrinjski', clubName: 'HŠK Zrinjski', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/8/8e/NK_HASK.svg', fromYear: 2003, toYear: 2004 },
        { clubId: 'inter-zaprešić', clubName: 'Inter Zaprešić', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/8/8e/NK_HASK.svg', fromYear: 2004, toYear: 2005 },
        { clubId: 'dinamo-zagreb', clubName: 'Dinamo Zagreb', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/2/26/GNK_Dinamo_Zagreb_logo.svg', fromYear: 2003, toYear: 2008 },
        { clubId: 'tottenham', clubName: 'Tottenham Hotspur', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg', fromYear: 2008, toYear: 2012 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2012, toYear: null },
      ],
    },
    {
      id: 'p8', name: 'Eduardo Camavinga',
      position: 'CM', formationSlot: 7,
      nationality: 'France', nationalityFlag: '🇫🇷',
      career: [
        { clubId: 'rennes', clubName: 'Stade Rennais', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/9/93/Stade_Rennais_FC.svg', fromYear: 2019, toYear: 2021 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2021, toYear: null },
      ],
    },
    {
      id: 'p9', name: 'Federico Valverde',
      position: 'RW', formationSlot: 8,
      nationality: 'Uruguay', nationalityFlag: '🇺🇾',
      career: [
        { clubId: 'penarol', clubName: 'Peñarol', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Logo_of_Club_Atl%C3%A9tico_Pe%C3%B1arol.svg', fromYear: 2015, toYear: 2016 },
        { clubId: 'celta-vigo', clubName: 'Celta Vigo', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/1/12/RC_Celta_de_Vigo_logo.svg', fromYear: 2017, toYear: 2018 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2016, toYear: null },
      ],
    },
    {
      id: 'p10', name: 'Karim Benzema',
      position: 'ST', formationSlot: 9,
      nationality: 'France', nationalityFlag: '🇫🇷',
      career: [
        { clubId: 'lyon', clubName: 'Olympique Lyon', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e2/Olympique_Lyonnais.svg', fromYear: 2004, toYear: 2009 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2009, toYear: 2023 },
        { clubId: 'al-ittihad', clubName: 'Al-Ittihad', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b6/Ittihad_FC_Logo.svg', fromYear: 2023, toYear: null },
      ],
    },
    {
      id: 'p11', name: 'Vinícius Júnior',
      position: 'LW', formationSlot: 10,
      nationality: 'Brazil', nationalityFlag: '🇧🇷',
      career: [
        { clubId: 'flamengo', clubName: 'Flamengo', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Flamengo_escudo.svg', fromYear: 2017, toYear: 2018 },
        { clubId: 'real-madrid', clubName: 'Real Madrid', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', fromYear: 2018, toYear: null },
      ],
    },
  ],
};

// Additional teams for non-tutorial modes (names omitted – backend would strip them)
export const MOCK_TEAMS: Team[] = [REAL_MADRID_2223];

export const MOCK_SEARCH_PLAYERS = [
  'Thibaut Courtois', 'Dani Carvajal', 'Éder Militão', 'David Alaba',
  'Ferland Mendy', 'Toni Kroos', 'Luka Modrić', 'Eduardo Camavinga',
  'Federico Valverde', 'Karim Benzema', 'Vinícius Júnior',
  'Lionel Messi', 'Cristiano Ronaldo', 'Kylian Mbappé', 'Erling Haaland',
  'Mohamed Salah', 'Robert Lewandowski', 'Kevin De Bruyne', 'Neymar',
  'Pedri', 'Gavi', 'Jude Bellingham',
];
