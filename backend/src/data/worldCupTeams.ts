import { GERMANY_2024 } from './mockTeams';
import type { CareerClub, InternalPlayer, Position, TeamData } from '../types';

type ClubKey =
  | 'al-nassr'
  | 'ajax'
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
  | 'dortmund'
  | 'everton'
  | 'flamengo'
  | 'galatasaray'
  | 'hamburg'
  | 'inter'
  | 'inter-miami'
  | 'juventus'
  | 'lazio'
  | 'leverkusen'
  | 'liverpool'
  | 'lyon'
  | 'man-city'
  | 'man-united'
  | 'marseille'
  | 'milan'
  | 'monaco'
  | 'napoli'
  | 'newcastle'
  | 'psg'
  | 'roma'
  | 'santos'
  | 'schalke'
  | 'porto'
  | 'psv'
  | 'rb-leipzig'
  | 'real-madrid'
  | 'real-sociedad'
  | 'sevilla'
  | 'southampton'
  | 'sporting'
  | 'tottenham'
  | 'valencia'
  | 'west-ham';

const CLUBS: Record<ClubKey, CareerClub> = {
  'al-nassr': club('al-nassr', 'Al Nassr', 'https://upload.wikimedia.org/wikipedia/en/a/ac/Al_Nassr_FC_Logo.svg'),
  ajax: club('ajax', 'Ajax', 'https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg'),
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
  dortmund: club('dortmund', 'Borussia Dortmund', 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg'),
  everton: club('everton', 'Everton', 'https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg'),
  flamengo: club('flamengo', 'Flamengo', 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg'),
  galatasaray: club('galatasaray', 'Galatasaray', 'https://upload.wikimedia.org/wikipedia/en/0/0b/Galatasaray_Sports_Club_Logo.svg'),
  hamburg: club('hamburg', 'Hamburger SV', 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Hamburger_SV_logo.svg'),
  inter: club('inter', 'Inter Milan', 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg'),
  'inter-miami': club('inter-miami', 'Inter Miami', 'https://upload.wikimedia.org/wikipedia/en/5/5c/Inter_Miami_CF_logo.svg'),
  juventus: club('juventus', 'Juventus', 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_logo.svg'),
  lazio: club('lazio', 'Lazio', 'https://upload.wikimedia.org/wikipedia/en/c/ce/S.S._Lazio_badge.svg'),
  leverkusen: club('leverkusen', 'Bayer Leverkusen', 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg'),
  liverpool: club('liverpool', 'Liverpool', 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'),
  lyon: club('lyon', 'Lyon', 'https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais.svg'),
  'man-city': club('man-city', 'Manchester City', 'https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png'),
  'man-united': club('man-united', 'Manchester United', 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg'),
  marseille: club('marseille', 'Marseille', 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg'),
  milan: club('milan', 'AC Milan', 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg'),
  monaco: club('monaco', 'Monaco', 'https://upload.wikimedia.org/wikipedia/en/b/ba/AS_Monaco_FC.svg'),
  napoli: club('napoli', 'Napoli', 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg'),
  newcastle: club('newcastle', 'Newcastle United', 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg'),
  psg: club('psg', 'Paris Saint-Germain', 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg'),
  porto: club('porto', 'Porto', 'https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg'),
  psv: club('psv', 'PSV', 'https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg'),
  'rb-leipzig': club('rb-leipzig', 'RB Leipzig', 'https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg'),
  'real-madrid': club('real-madrid', 'Real Madrid', 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg'),
  'real-sociedad': club('real-sociedad', 'Real Sociedad', 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg'),
  roma: club('roma', 'Roma', 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg'),
  santos: club('santos', 'Santos', 'https://upload.wikimedia.org/wikipedia/en/3/35/Santos_logo.svg'),
  schalke: club('schalke', 'Schalke 04', 'https://upload.wikimedia.org/wikipedia/commons/6/6d/FC_Schalke_04_Logo.svg'),
  sevilla: club('sevilla', 'Sevilla', 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg'),
  southampton: club('southampton', 'Southampton', 'https://upload.wikimedia.org/wikipedia/en/c/c9/FC_Southampton.svg'),
  sporting: club('sporting', 'Sporting CP', 'https://upload.wikimedia.org/wikipedia/en/e/e1/Sporting_Clube_de_Portugal_%28Logo%29.svg'),
  tottenham: club('tottenham', 'Tottenham Hotspur', 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg'),
  valencia: club('valencia', 'Valencia', 'https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg'),
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
  team('worldcup-germany-2014', 'Deutschland', '2014', '4-2-3-1', flag('de'), [
    p('de14-1', 'Manuel Neuer', 'GK', 0, 'Germany', 'DE', 'bayern', 2011),
    p('de14-2', 'Philipp Lahm', 'RB', 1, 'Germany', 'DE', 'bayern', 2002),
    p('de14-3', 'Mats Hummels', 'CB', 2, 'Germany', 'DE', 'dortmund', 2008),
    p('de14-4', 'Jerome Boateng', 'CB', 3, 'Germany', 'DE', 'bayern', 2011),
    p('de14-5', 'Benedikt Hoewedes', 'LB', 4, 'Germany', 'DE', 'schalke', 2007),
    p('de14-6', 'Bastian Schweinsteiger', 'CM', 5, 'Germany', 'DE', 'bayern', 2002),
    p('de14-7', 'Sami Khedira', 'CM', 6, 'Germany', 'DE', 'real-madrid', 2010),
    p('de14-8', 'Toni Kroos', 'CM', 7, 'Germany', 'DE', 'bayern', 2007),
    p('de14-9', 'Thomas Mueller', 'RW', 8, 'Germany', 'DE', 'bayern', 2008),
    p('de14-10', 'Mesut Oezil', 'CAM', 9, 'Germany', 'DE', 'arsenal', 2013),
    p('de14-11', 'Miroslav Klose', 'ST', 10, 'Germany', 'DE', 'lazio', 2011),
  ]),
  team('worldcup-france-2018', 'Frankreich', '2018', '4-2-3-1', flag('fr'), [
    p('fr18-1', 'Hugo Lloris', 'GK', 0, 'France', 'FR', 'tottenham', 2012),
    p('fr18-2', 'Benjamin Pavard', 'RB', 1, 'France', 'FR', 'bayern', 2019),
    p('fr18-3', 'Raphael Varane', 'CB', 2, 'France', 'FR', 'real-madrid', 2011),
    p('fr18-4', 'Samuel Umtiti', 'CB', 3, 'France', 'FR', 'barcelona', 2016),
    p('fr18-5', 'Lucas Hernandez', 'LB', 4, 'France', 'FR', 'atletico', 2014),
    p('fr18-6', 'N Golo Kante', 'CDM', 5, 'France', 'FR', 'chelsea', 2016),
    p('fr18-7', 'Paul Pogba', 'CM', 6, 'France', 'FR', 'man-united', 2016),
    p('fr18-8', 'Kylian Mbappe', 'RW', 7, 'France', 'FR', 'psg', 2017),
    p('fr18-9', 'Antoine Griezmann', 'CAM', 8, 'France', 'FR', 'atletico', 2014),
    p('fr18-10', 'Blaise Matuidi', 'LM', 9, 'France', 'FR', 'juventus', 2017),
    p('fr18-11', 'Olivier Giroud', 'ST', 10, 'France', 'FR', 'chelsea', 2018),
  ]),
  team('worldcup-france-2016', 'Frankreich', '2016', '4-2-3-1', flag('fr'), [
    p('fr16-1', 'Hugo Lloris', 'GK', 0, 'France', 'FR', 'tottenham', 2012),
    p('fr16-2', 'Bacary Sagna', 'RB', 1, 'France', 'FR', 'man-city', 2014),
    p('fr16-3', 'Laurent Koscielny', 'CB', 2, 'France', 'FR', 'arsenal', 2010),
    p('fr16-4', 'Samuel Umtiti', 'CB', 3, 'France', 'FR', 'lyon', 2012),
    p('fr16-5', 'Patrice Evra', 'LB', 4, 'France', 'FR', 'juventus', 2014),
    p('fr16-6', 'N Golo Kante', 'CDM', 5, 'France', 'FR', 'chelsea', 2016),
    p('fr16-7', 'Paul Pogba', 'CM', 6, 'France', 'FR', 'juventus', 2012),
    p('fr16-8', 'Dimitri Payet', 'LM', 7, 'France', 'FR', 'west-ham', 2015),
    p('fr16-9', 'Antoine Griezmann', 'CAM', 8, 'France', 'FR', 'atletico', 2014),
    p('fr16-10', 'Moussa Sissoko', 'RM', 9, 'France', 'FR', 'newcastle', 2013),
    p('fr16-11', 'Olivier Giroud', 'ST', 10, 'France', 'FR', 'arsenal', 2012),
  ]),
  team('worldcup-argentina-2014', 'Argentinien', '2014', '4-3-3', flag('ar'), [
    p('ar14-1', 'Sergio Romero', 'GK', 0, 'Argentina', 'AR', 'monaco', 2013),
    p('ar14-2', 'Pablo Zabaleta', 'RB', 1, 'Argentina', 'AR', 'man-city', 2008),
    p('ar14-3', 'Ezequiel Garay', 'CB', 2, 'Argentina', 'AR', 'benfica', 2011),
    p('ar14-4', 'Martin Demichelis', 'CB', 3, 'Argentina', 'AR', 'man-city', 2013),
    p('ar14-5', 'Marcos Rojo', 'LB', 4, 'Argentina', 'AR', 'man-united', 2014),
    p('ar14-6', 'Javier Mascherano', 'CDM', 5, 'Argentina', 'AR', 'barcelona', 2010),
    p('ar14-7', 'Lucas Biglia', 'CM', 6, 'Argentina', 'AR', 'lazio', 2013),
    p('ar14-8', 'Angel Di Maria', 'CM', 7, 'Argentina', 'AR', 'real-madrid', 2010),
    p('ar14-9', 'Ezequiel Lavezzi', 'RW', 8, 'Argentina', 'AR', 'psg', 2012),
    p('ar14-10', 'Lionel Messi', 'CF', 9, 'Argentina', 'AR', 'barcelona', 2004),
    p('ar14-11', 'Gonzalo Higuain', 'ST', 10, 'Argentina', 'AR', 'napoli', 2013),
  ]),
  team('worldcup-argentina-2018', 'Argentinien', '2018', '4-3-3', flag('ar'), [
    p('ar18-1', 'Franco Armani', 'GK', 0, 'Argentina', 'AR', 'flamengo', 2018),
    p('ar18-2', 'Gabriel Mercado', 'RB', 1, 'Argentina', 'AR', 'sevilla', 2016),
    p('ar18-3', 'Nicolas Otamendi', 'CB', 2, 'Argentina', 'AR', 'man-city', 2015),
    p('ar18-4', 'Marcos Rojo', 'CB', 3, 'Argentina', 'AR', 'man-united', 2014),
    p('ar18-5', 'Nicolas Tagliafico', 'LB', 4, 'Argentina', 'AR', 'ajax', 2018),
    p('ar18-6', 'Javier Mascherano', 'CDM', 5, 'Argentina', 'AR', 'barcelona', 2010),
    p('ar18-7', 'Ever Banega', 'CM', 6, 'Argentina', 'AR', 'sevilla', 2017),
    p('ar18-8', 'Angel Di Maria', 'LW', 7, 'Argentina', 'AR', 'psg', 2015),
    p('ar18-9', 'Lionel Messi', 'RW', 8, 'Argentina', 'AR', 'barcelona', 2004),
    p('ar18-10', 'Cristian Pavon', 'RM', 9, 'Argentina', 'AR', 'flamengo', 2018),
    p('ar18-11', 'Sergio Aguero', 'ST', 10, 'Argentina', 'AR', 'man-city', 2011),
  ]),
  team('worldcup-england-2018', 'England', '2018', '3-5-2', flag('gb-eng'), [
    p('en18-1', 'Jordan Pickford', 'GK', 0, 'England', 'GB-ENG', 'everton', 2017),
    p('en18-2', 'Kyle Walker', 'CB', 1, 'England', 'GB-ENG', 'man-city', 2017),
    p('en18-3', 'John Stones', 'CB', 2, 'England', 'GB-ENG', 'man-city', 2016),
    p('en18-4', 'Harry Maguire', 'CB', 3, 'England', 'GB-ENG', 'man-united', 2019),
    p('en18-5', 'Kieran Trippier', 'RM', 4, 'England', 'GB-ENG', 'tottenham', 2015),
    p('en18-6', 'Ashley Young', 'LM', 5, 'England', 'GB-ENG', 'man-united', 2011),
    p('en18-7', 'Jordan Henderson', 'CM', 6, 'England', 'GB-ENG', 'liverpool', 2011),
    p('en18-8', 'Dele Alli', 'CM', 7, 'England', 'GB-ENG', 'tottenham', 2015),
    p('en18-9', 'Jesse Lingard', 'CAM', 8, 'England', 'GB-ENG', 'man-united', 2011),
    p('en18-10', 'Raheem Sterling', 'ST', 9, 'England', 'GB-ENG', 'man-city', 2015),
    p('en18-11', 'Harry Kane', 'ST', 10, 'England', 'GB-ENG', 'tottenham', 2011),
  ]),
  team('worldcup-england-2021', 'England', '2021', '4-2-3-1', flag('gb-eng'), [
    p('en21-1', 'Jordan Pickford', 'GK', 0, 'England', 'GB-ENG', 'everton', 2017),
    p('en21-2', 'Kyle Walker', 'RB', 1, 'England', 'GB-ENG', 'man-city', 2017),
    p('en21-3', 'John Stones', 'CB', 2, 'England', 'GB-ENG', 'man-city', 2016),
    p('en21-4', 'Harry Maguire', 'CB', 3, 'England', 'GB-ENG', 'man-united', 2019),
    p('en21-5', 'Luke Shaw', 'LB', 4, 'England', 'GB-ENG', 'man-united', 2014),
    p('en21-6', 'Declan Rice', 'CDM', 5, 'England', 'GB-ENG', 'west-ham', 2017),
    p('en21-7', 'Kalvin Phillips', 'CM', 6, 'England', 'GB-ENG', 'man-city', 2022),
    p('en21-8', 'Bukayo Saka', 'RW', 7, 'England', 'GB-ENG', 'arsenal', 2018),
    p('en21-9', 'Mason Mount', 'CAM', 8, 'England', 'GB-ENG', 'chelsea', 2017),
    p('en21-10', 'Raheem Sterling', 'LW', 9, 'England', 'GB-ENG', 'man-city', 2015),
    p('en21-11', 'Harry Kane', 'ST', 10, 'England', 'GB-ENG', 'tottenham', 2011),
  ]),
  team('worldcup-spain-2010', 'Spanien', '2010', '4-3-3', flag('es'), [
    p('es10-1', 'Iker Casillas', 'GK', 0, 'Spain', 'ES', 'real-madrid', 1999),
    p('es10-2', 'Sergio Ramos', 'RB', 1, 'Spain', 'ES', 'real-madrid', 2005),
    p('es10-3', 'Gerard Pique', 'CB', 2, 'Spain', 'ES', 'barcelona', 2008),
    p('es10-4', 'Carles Puyol', 'CB', 3, 'Spain', 'ES', 'barcelona', 1999),
    p('es10-5', 'Joan Capdevila', 'LB', 4, 'Spain', 'ES', 'valencia', 2011),
    p('es10-6', 'Sergio Busquets', 'CDM', 5, 'Spain', 'ES', 'barcelona', 2008),
    p('es10-7', 'Xabi Alonso', 'CM', 6, 'Spain', 'ES', 'real-madrid', 2009),
    p('es10-8', 'Xavi', 'CM', 7, 'Spain', 'ES', 'barcelona', 1998),
    p('es10-9', 'Andres Iniesta', 'LW', 8, 'Spain', 'ES', 'barcelona', 2002),
    p('es10-10', 'David Villa', 'ST', 9, 'Spain', 'ES', 'barcelona', 2010),
    p('es10-11', 'Pedro', 'RW', 10, 'Spain', 'ES', 'barcelona', 2008),
  ]),
  team('worldcup-spain-2012', 'Spanien', '2012', '4-3-3', flag('es'), [
    p('es12-1', 'Iker Casillas', 'GK', 0, 'Spain', 'ES', 'real-madrid', 1999),
    p('es12-2', 'Alvaro Arbeloa', 'RB', 1, 'Spain', 'ES', 'real-madrid', 2009),
    p('es12-3', 'Sergio Ramos', 'CB', 2, 'Spain', 'ES', 'real-madrid', 2005),
    p('es12-4', 'Gerard Pique', 'CB', 3, 'Spain', 'ES', 'barcelona', 2008),
    p('es12-5', 'Jordi Alba', 'LB', 4, 'Spain', 'ES', 'barcelona', 2012),
    p('es12-6', 'Sergio Busquets', 'CDM', 5, 'Spain', 'ES', 'barcelona', 2008),
    p('es12-7', 'Xabi Alonso', 'CM', 6, 'Spain', 'ES', 'real-madrid', 2009),
    p('es12-8', 'Xavi', 'CM', 7, 'Spain', 'ES', 'barcelona', 1998),
    p('es12-9', 'David Silva', 'RW', 8, 'Spain', 'ES', 'man-city', 2010),
    p('es12-10', 'Andres Iniesta', 'LW', 9, 'Spain', 'ES', 'barcelona', 2002),
    p('es12-11', 'Cesc Fabregas', 'CF', 10, 'Spain', 'ES', 'barcelona', 2011),
  ]),
  team('worldcup-portugal-2016', 'Portugal', '2016', '4-4-2', flag('pt'), [
    p('pt16-1', 'Rui Patricio', 'GK', 0, 'Portugal', 'PT', 'sporting', 2006),
    p('pt16-2', 'Cedric Soares', 'RB', 1, 'Portugal', 'PT', 'southampton', 2015),
    p('pt16-3', 'Pepe', 'CB', 2, 'Portugal', 'PT', 'real-madrid', 2007),
    p('pt16-4', 'Jose Fonte', 'CB', 3, 'Portugal', 'PT', 'southampton', 2010),
    p('pt16-5', 'Raphael Guerreiro', 'LB', 4, 'Portugal', 'PT', 'dortmund', 2016),
    p('pt16-6', 'William Carvalho', 'CDM', 5, 'Portugal', 'PT', 'sporting', 2011),
    p('pt16-7', 'Adrien Silva', 'CM', 6, 'Portugal', 'PT', 'sporting', 2007),
    p('pt16-8', 'Joao Mario', 'RM', 7, 'Portugal', 'PT', 'inter', 2016),
    p('pt16-9', 'Renato Sanches', 'LM', 8, 'Portugal', 'PT', 'bayern', 2016),
    p('pt16-10', 'Nani', 'ST', 9, 'Portugal', 'PT', 'man-united', 2007),
    p('pt16-11', 'Cristiano Ronaldo', 'ST', 10, 'Portugal', 'PT', 'real-madrid', 2009),
  ]),
  team('worldcup-brazil-2014', 'Brasilien', '2014', '4-2-3-1', flag('br'), [
    p('br14-1', 'Julio Cesar', 'GK', 0, 'Brazil', 'BR', 'benfica', 2014),
    p('br14-2', 'Dani Alves', 'RB', 1, 'Brazil', 'BR', 'barcelona', 2008),
    p('br14-3', 'Thiago Silva', 'CB', 2, 'Brazil', 'BR', 'psg', 2012),
    p('br14-4', 'David Luiz', 'CB', 3, 'Brazil', 'BR', 'chelsea', 2011),
    p('br14-5', 'Marcelo', 'LB', 4, 'Brazil', 'BR', 'real-madrid', 2007),
    p('br14-6', 'Luiz Gustavo', 'CDM', 5, 'Brazil', 'BR', 'bayern', 2011),
    p('br14-7', 'Fernandinho', 'CM', 6, 'Brazil', 'BR', 'man-city', 2013),
    p('br14-8', 'Oscar', 'CAM', 7, 'Brazil', 'BR', 'chelsea', 2012),
    p('br14-9', 'Hulk', 'RW', 8, 'Brazil', 'BR', 'porto', 2008),
    p('br14-10', 'Neymar', 'LW', 9, 'Brazil', 'BR', 'barcelona', 2013),
    p('br14-11', 'Fred', 'ST', 10, 'Brazil', 'BR', 'lyon', 2005),
  ]),
  team('worldcup-brazil-2018', 'Brasilien', '2018', '4-3-3', flag('br'), [
    p('br18-1', 'Alisson Becker', 'GK', 0, 'Brazil', 'BR', 'roma', 2016),
    p('br18-2', 'Fagner', 'RB', 1, 'Brazil', 'BR', 'psv', 2007),
    p('br18-3', 'Thiago Silva', 'CB', 2, 'Brazil', 'BR', 'psg', 2012),
    p('br18-4', 'Miranda', 'CB', 3, 'Brazil', 'BR', 'inter', 2015),
    p('br18-5', 'Marcelo', 'LB', 4, 'Brazil', 'BR', 'real-madrid', 2007),
    p('br18-6', 'Casemiro', 'CDM', 5, 'Brazil', 'BR', 'real-madrid', 2013),
    p('br18-7', 'Paulinho', 'CM', 6, 'Brazil', 'BR', 'barcelona', 2017),
    p('br18-8', 'Philippe Coutinho', 'CM', 7, 'Brazil', 'BR', 'barcelona', 2018),
    p('br18-9', 'Willian', 'RW', 8, 'Brazil', 'BR', 'chelsea', 2013),
    p('br18-10', 'Neymar', 'LW', 9, 'Brazil', 'BR', 'psg', 2017),
    p('br18-11', 'Gabriel Jesus', 'ST', 10, 'Brazil', 'BR', 'man-city', 2017),
  ]),
  team('worldcup-netherlands-2010', 'Niederlande', '2010', '4-2-3-1', flag('nl'), [
    p('nl10-1', 'Maarten Stekelenburg', 'GK', 0, 'Netherlands', 'NL', 'ajax', 2002),
    p('nl10-2', 'Gregory van der Wiel', 'RB', 1, 'Netherlands', 'NL', 'ajax', 2007),
    p('nl10-3', 'John Heitinga', 'CB', 2, 'Netherlands', 'NL', 'everton', 2009),
    p('nl10-4', 'Joris Mathijsen', 'CB', 3, 'Netherlands', 'NL', 'hamburg', 2006),
    p('nl10-5', 'Giovanni van Bronckhorst', 'LB', 4, 'Netherlands', 'NL', 'barcelona', 2003),
    p('nl10-6', 'Nigel de Jong', 'CDM', 5, 'Netherlands', 'NL', 'man-city', 2009),
    p('nl10-7', 'Mark van Bommel', 'CM', 6, 'Netherlands', 'NL', 'bayern', 2006),
    p('nl10-8', 'Dirk Kuyt', 'RW', 7, 'Netherlands', 'NL', 'liverpool', 2006),
    p('nl10-9', 'Wesley Sneijder', 'CAM', 8, 'Netherlands', 'NL', 'inter', 2009),
    p('nl10-10', 'Arjen Robben', 'LW', 9, 'Netherlands', 'NL', 'bayern', 2009),
    p('nl10-11', 'Robin van Persie', 'ST', 10, 'Netherlands', 'NL', 'arsenal', 2004),
  ]),
  team('worldcup-netherlands-2014', 'Niederlande', '2014', '3-4-1-2', flag('nl'), [
    p('nl14-1', 'Jasper Cillessen', 'GK', 0, 'Netherlands', 'NL', 'ajax', 2011),
    p('nl14-2', 'Ron Vlaar', 'CB', 1, 'Netherlands', 'NL', 'aston-villa', 2012),
    p('nl14-3', 'Stefan de Vrij', 'CB', 2, 'Netherlands', 'NL', 'lazio', 2014),
    p('nl14-4', 'Bruno Martins Indi', 'CB', 3, 'Netherlands', 'NL', 'porto', 2014),
    p('nl14-5', 'Daryl Janmaat', 'RM', 4, 'Netherlands', 'NL', 'newcastle', 2014),
    p('nl14-6', 'Daley Blind', 'LM', 5, 'Netherlands', 'NL', 'man-united', 2014),
    p('nl14-7', 'Nigel de Jong', 'CDM', 6, 'Netherlands', 'NL', 'milan', 2012),
    p('nl14-8', 'Georginio Wijnaldum', 'CM', 7, 'Netherlands', 'NL', 'psv', 2011),
    p('nl14-9', 'Wesley Sneijder', 'CAM', 8, 'Netherlands', 'NL', 'galatasaray', 2013),
    p('nl14-10', 'Arjen Robben', 'ST', 9, 'Netherlands', 'NL', 'bayern', 2009),
    p('nl14-11', 'Robin van Persie', 'ST', 10, 'Netherlands', 'NL', 'man-united', 2012),
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
