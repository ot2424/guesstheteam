import { GERMANY_2024 } from './mockTeams';
import type { CareerClub, InternalPlayer, Position, TeamData } from '../types';

type ClubKey =
  | 'al-nassr'
  | 'arsenal'
  | 'aston-villa'
  | 'athletic-bilbao'
  | 'atletico'
  | 'barcelona'
  | 'bayern'
  | 'benfica'
  | 'brighton'
  | 'chelsea'
  | 'crystal-palace'
  | 'everton'
  | 'inter'
  | 'inter-miami'
  | 'juventus'
  | 'leverkusen'
  | 'liverpool'
  | 'man-city'
  | 'man-united'
  | 'milan'
  | 'newcastle'
  | 'psg'
  | 'porto'
  | 'psv'
  | 'rb-leipzig'
  | 'real-madrid'
  | 'real-sociedad'
  | 'sevilla'
  | 'tottenham'
  | 'west-ham';

const CLUBS: Record<ClubKey, CareerClub> = {
  'al-nassr': club('al-nassr', 'Al Nassr', 'https://upload.wikimedia.org/wikipedia/en/a/ac/Al_Nassr_FC_Logo.svg'),
  arsenal: club('arsenal', 'Arsenal', 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg'),
  'aston-villa': club('aston-villa', 'Aston Villa', 'https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg'),
  'athletic-bilbao': club('athletic-bilbao', 'Athletic Bilbao', 'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg'),
  atletico: club('atletico', 'Atletico Madrid', 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg'),
  barcelona: club('barcelona', 'Barcelona', 'https://r2.thesportsdb.com/images/media/team/badge/wq9sir1639406443.png'),
  bayern: club('bayern', 'Bayern Muenchen', 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg'),
  benfica: club('benfica', 'Benfica', 'https://upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg'),
  brighton: club('brighton', 'Brighton', 'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg'),
  chelsea: club('chelsea', 'Chelsea', 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg'),
  'crystal-palace': club('crystal-palace', 'Crystal Palace', 'https://upload.wikimedia.org/wikipedia/en/a/a2/Crystal_Palace_FC_logo_%282022%29.svg'),
  everton: club('everton', 'Everton', 'https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg'),
  inter: club('inter', 'Inter Milan', 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg'),
  'inter-miami': club('inter-miami', 'Inter Miami', 'https://upload.wikimedia.org/wikipedia/en/5/5c/Inter_Miami_CF_logo.svg'),
  juventus: club('juventus', 'Juventus', 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_logo.svg'),
  leverkusen: club('leverkusen', 'Bayer Leverkusen', 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg'),
  liverpool: club('liverpool', 'Liverpool', 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'),
  'man-city': club('man-city', 'Manchester City', 'https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png'),
  'man-united': club('man-united', 'Manchester United', 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg'),
  milan: club('milan', 'AC Milan', 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg'),
  newcastle: club('newcastle', 'Newcastle United', 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg'),
  psg: club('psg', 'Paris Saint-Germain', 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg'),
  porto: club('porto', 'Porto', 'https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg'),
  psv: club('psv', 'PSV', 'https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg'),
  'rb-leipzig': club('rb-leipzig', 'RB Leipzig', 'https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg'),
  'real-madrid': club('real-madrid', 'Real Madrid', 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg'),
  'real-sociedad': club('real-sociedad', 'Real Sociedad', 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg'),
  sevilla: club('sevilla', 'Sevilla', 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg'),
  tottenham: club('tottenham', 'Tottenham Hotspur', 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg'),
  'west-ham': club('west-ham', 'West Ham United', 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg'),
};

export const WORLD_CUP_TEAMS: TeamData[] = [
  {
    ...GERMANY_2024,
    id: 'worldcup-germany-2024',
    league: 'WM-Modus',
  },
  team('worldcup-france-2022', 'Frankreich', '2022', '4-2-3-1', flag('fr'), [
    p('fr-1', 'Hugo Lloris', 'GK', 0, 'France', 'FR', 'tottenham', 2012),
    p('fr-2', 'Jules Kounde', 'RB', 1, 'France', 'FR', 'barcelona', 2022),
    p('fr-3', 'Raphael Varane', 'CB', 2, 'France', 'FR', 'man-united', 2021),
    p('fr-4', 'Dayot Upamecano', 'CB', 3, 'France', 'FR', 'bayern', 2021),
    p('fr-5', 'Theo Hernandez', 'LB', 4, 'France', 'FR', 'milan', 2019),
    p('fr-6', 'Aurelien Tchouameni', 'CDM', 5, 'France', 'FR', 'real-madrid', 2022),
    p('fr-7', 'Adrien Rabiot', 'CM', 6, 'France', 'FR', 'juventus', 2019),
    p('fr-8', 'Ousmane Dembele', 'RW', 7, 'France', 'FR', 'psg', 2023),
    p('fr-9', 'Antoine Griezmann', 'CAM', 8, 'France', 'FR', 'atletico', 2021),
    p('fr-10', 'Kylian Mbappe', 'LW', 9, 'France', 'FR', 'real-madrid', 2024),
    p('fr-11', 'Olivier Giroud', 'ST', 10, 'France', 'FR', 'milan', 2021),
  ]),
  team('worldcup-argentina-2022', 'Argentinien', '2022', '4-3-3', flag('ar'), [
    p('ar-1', 'Emiliano Martinez', 'GK', 0, 'Argentina', 'AR', 'aston-villa', 2020),
    p('ar-2', 'Nahuel Molina', 'RB', 1, 'Argentina', 'AR', 'atletico', 2022),
    p('ar-3', 'Cristian Romero', 'CB', 2, 'Argentina', 'AR', 'tottenham', 2021),
    p('ar-4', 'Nicolas Otamendi', 'CB', 3, 'Argentina', 'AR', 'benfica', 2020),
    p('ar-5', 'Marcos Acuna', 'LB', 4, 'Argentina', 'AR', 'sevilla', 2020),
    p('ar-6', 'Rodrigo De Paul', 'CM', 5, 'Argentina', 'AR', 'atletico', 2021),
    p('ar-7', 'Enzo Fernandez', 'CM', 6, 'Argentina', 'AR', 'chelsea', 2023),
    p('ar-8', 'Alexis Mac Allister', 'CM', 7, 'Argentina', 'AR', 'liverpool', 2023),
    p('ar-9', 'Angel Di Maria', 'RW', 8, 'Argentina', 'AR', 'benfica', 2023),
    p('ar-10', 'Lionel Messi', 'CF', 9, 'Argentina', 'AR', 'inter-miami', 2023),
    p('ar-11', 'Julian Alvarez', 'ST', 10, 'Argentina', 'AR', 'man-city', 2022),
  ]),
  team('worldcup-england-2024', 'England', '2024', '4-2-3-1', flag('gb-eng'), [
    p('en-1', 'Jordan Pickford', 'GK', 0, 'England', 'GB-ENG', 'everton', 2017),
    p('en-2', 'Kyle Walker', 'RB', 1, 'England', 'GB-ENG', 'man-city', 2017),
    p('en-3', 'John Stones', 'CB', 2, 'England', 'GB-ENG', 'man-city', 2016),
    p('en-4', 'Marc Guehi', 'CB', 3, 'England', 'GB-ENG', 'crystal-palace', 2021),
    p('en-5', 'Kieran Trippier', 'LB', 4, 'England', 'GB-ENG', 'newcastle', 2022),
    p('en-6', 'Declan Rice', 'CDM', 5, 'England', 'GB-ENG', 'arsenal', 2023),
    p('en-7', 'Jude Bellingham', 'CM', 6, 'England', 'GB-ENG', 'real-madrid', 2023),
    p('en-8', 'Bukayo Saka', 'RW', 7, 'England', 'GB-ENG', 'arsenal', 2018),
    p('en-9', 'Phil Foden', 'CAM', 8, 'England', 'GB-ENG', 'man-city', 2017),
    p('en-10', 'Cole Palmer', 'LW', 9, 'England', 'GB-ENG', 'chelsea', 2023),
    p('en-11', 'Harry Kane', 'ST', 10, 'England', 'GB-ENG', 'bayern', 2023),
  ]),
  team('worldcup-spain-2024', 'Spanien', '2024', '4-3-3', flag('es'), [
    p('es-1', 'Unai Simon', 'GK', 0, 'Spain', 'ES', 'athletic-bilbao', 2018),
    p('es-2', 'Dani Carvajal', 'RB', 1, 'Spain', 'ES', 'real-madrid', 2013),
    p('es-3', 'Robin Le Normand', 'CB', 2, 'Spain', 'ES', 'real-sociedad', 2016),
    p('es-4', 'Aymeric Laporte', 'CB', 3, 'Spain', 'ES', 'man-city', 2018),
    p('es-5', 'Marc Cucurella', 'LB', 4, 'Spain', 'ES', 'chelsea', 2022),
    p('es-6', 'Rodri', 'CDM', 5, 'Spain', 'ES', 'man-city', 2019),
    p('es-7', 'Fabian Ruiz', 'CM', 6, 'Spain', 'ES', 'psg', 2022),
    p('es-8', 'Pedri', 'CM', 7, 'Spain', 'ES', 'barcelona', 2020),
    p('es-9', 'Lamine Yamal', 'RW', 8, 'Spain', 'ES', 'barcelona', 2023),
    p('es-10', 'Nico Williams', 'LW', 9, 'Spain', 'ES', 'athletic-bilbao', 2021),
    p('es-11', 'Alvaro Morata', 'ST', 10, 'Spain', 'ES', 'atletico', 2020),
  ]),
  team('worldcup-portugal-2024', 'Portugal', '2024', '4-3-3', flag('pt'), [
    p('pt-1', 'Diogo Costa', 'GK', 0, 'Portugal', 'PT', 'porto', 2019),
    p('pt-2', 'Joao Cancelo', 'RB', 1, 'Portugal', 'PT', 'barcelona', 2023),
    p('pt-3', 'Pepe', 'CB', 2, 'Portugal', 'PT', 'porto', 2019),
    p('pt-4', 'Ruben Dias', 'CB', 3, 'Portugal', 'PT', 'man-city', 2020),
    p('pt-5', 'Nuno Mendes', 'LB', 4, 'Portugal', 'PT', 'psg', 2021),
    p('pt-6', 'Joao Palhinha', 'CDM', 5, 'Portugal', 'PT', 'bayern', 2024),
    p('pt-7', 'Vitinha', 'CM', 6, 'Portugal', 'PT', 'psg', 2022),
    p('pt-8', 'Bruno Fernandes', 'CAM', 7, 'Portugal', 'PT', 'man-united', 2020),
    p('pt-9', 'Bernardo Silva', 'RW', 8, 'Portugal', 'PT', 'man-city', 2017),
    p('pt-10', 'Rafael Leao', 'LW', 9, 'Portugal', 'PT', 'milan', 2019),
    p('pt-11', 'Cristiano Ronaldo', 'ST', 10, 'Portugal', 'PT', 'al-nassr', 2023),
  ]),
  team('worldcup-brazil-2022', 'Brasilien', '2022', '4-2-3-1', flag('br'), [
    p('br-1', 'Alisson Becker', 'GK', 0, 'Brazil', 'BR', 'liverpool', 2018),
    p('br-2', 'Danilo', 'RB', 1, 'Brazil', 'BR', 'juventus', 2019),
    p('br-3', 'Thiago Silva', 'CB', 2, 'Brazil', 'BR', 'chelsea', 2020),
    p('br-4', 'Marquinhos', 'CB', 3, 'Brazil', 'BR', 'psg', 2013),
    p('br-5', 'Alex Sandro', 'LB', 4, 'Brazil', 'BR', 'juventus', 2015),
    p('br-6', 'Casemiro', 'CDM', 5, 'Brazil', 'BR', 'man-united', 2022),
    p('br-7', 'Lucas Paqueta', 'CM', 6, 'Brazil', 'BR', 'west-ham', 2022),
    p('br-8', 'Neymar', 'CAM', 7, 'Brazil', 'BR', 'psg', 2017),
    p('br-9', 'Raphinha', 'RW', 8, 'Brazil', 'BR', 'barcelona', 2022),
    p('br-10', 'Vinicius Junior', 'LW', 9, 'Brazil', 'BR', 'real-madrid', 2018),
    p('br-11', 'Richarlison', 'ST', 10, 'Brazil', 'BR', 'tottenham', 2022),
  ]),
  team('worldcup-netherlands-2024', 'Niederlande', '2024', '3-4-2-1', flag('nl'), [
    p('nl-1', 'Bart Verbruggen', 'GK', 0, 'Netherlands', 'NL', 'brighton', 2023),
    p('nl-2', 'Denzel Dumfries', 'RB', 1, 'Netherlands', 'NL', 'inter', 2021),
    p('nl-3', 'Stefan de Vrij', 'CB', 2, 'Netherlands', 'NL', 'inter', 2018),
    p('nl-4', 'Virgil van Dijk', 'CB', 3, 'Netherlands', 'NL', 'liverpool', 2018),
    p('nl-5', 'Nathan Ake', 'LB', 4, 'Netherlands', 'NL', 'man-city', 2020),
    p('nl-6', 'Jerdy Schouten', 'CDM', 5, 'Netherlands', 'NL', 'psv', 2023),
    p('nl-7', 'Tijjani Reijnders', 'CM', 6, 'Netherlands', 'NL', 'milan', 2023),
    p('nl-8', 'Xavi Simons', 'CAM', 7, 'Netherlands', 'NL', 'rb-leipzig', 2023),
    p('nl-9', 'Jeremie Frimpong', 'RM', 8, 'Netherlands', 'NL', 'leverkusen', 2021),
    p('nl-10', 'Cody Gakpo', 'LW', 9, 'Netherlands', 'NL', 'liverpool', 2023),
    p('nl-11', 'Memphis Depay', 'ST', 10, 'Netherlands', 'NL', 'atletico', 2023),
  ]),
];

function team(id: string, name: string, season: string, formation: string, logoUrl: string, players: InternalPlayer[]): TeamData {
  return {
    id,
    name,
    season,
    league: 'WM-Modus',
    logoUrl,
    formation,
    players,
  };
}

function p(
  id: string,
  name: string,
  position: Position,
  formationSlot: number,
  nationality: string,
  nationalityFlag: string,
  clubKey: ClubKey,
  fromYear: number,
): InternalPlayer {
  return {
    id,
    name,
    position,
    nationality,
    nationalityFlag,
    formationSlot,
    career: [{ ...CLUBS[clubKey], fromYear, toYear: null }],
  };
}

function club(clubId: string, clubName: string, logoUrl: string): CareerClub {
  return {
    clubId,
    clubName,
    logoUrl,
    fromYear: 2000,
    toYear: null,
  };
}

function flag(code: string) {
  return `https://flagcdn.com/${code}.svg`;
}
