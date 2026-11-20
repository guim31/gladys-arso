# ARSO Slovenia

La météo officielle de la **Slovénie** dans Gladys, par l'**ARSO** (Agencija Republike Slovenije
za okolje, l'agence slovène de l'environnement, éditrice de meteo.si) : les mesures de la
**station météo automatique** la plus proche toutes les 10 minutes, les **prévisions
quotidiennes** de sa région, et les **avertissements météo officiels** de sa zone (vent, pluie,
orage, neige, verglas, canicule, grand froid, feux de forêt…).

Données ouvertes : ni compte, ni clé d'API. Cette intégration n'a aucun lien avec l'ARSO.

## Présentation

- **Deux appareils** : la station la plus proche (température, humidité, pression, vent, rafales,
  pluie, hauteur de neige : ce que la station mesure) et votre lieu (prévisions du jour et du
  lendemain, niveaux d'avertissement).
- **Un déclencheur de scène**, « Nouvel avertissement de l'ARSO », dès qu'un avertissement est
  annoncé, souvent un jour ou plus avant son début.
- **Un widget de tableau de bord** avec les mesures, les minimales et maximales des prochains
  jours, les avertissements et les prévisions du jour et du lendemain.
- **Lecture seule** : l'ARSO est une source de données, rien n'est piloté.

## Prérequis

- Gladys **5.3.0** ou plus récent.
- Un lieu en **Slovénie** (ou à moins de 25 km de sa frontière).
- Votre maison Gladys placée sur la carte (**Paramètres → Maisons**), ou des coordonnées saisies
  dans la configuration.
- Gladys doit joindre Internet (`meteo.arso.gov.si`).

## Configuration

Installez l'intégration depuis **Intégrations → Installer depuis GitHub** (ou depuis le store),
puis ouvrez sa configuration. Tous les champs sont facultatifs : par défaut, l'intégration prend la
position de votre première maison placée, la station la plus proche, et se rafraîchit toutes les
10 minutes.

| Champ                              | Usage                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Maison                             | La maison dont la position est utilisée. Vide : la première maison qui a une position.                                             |
| Latitude, Longitude                | Un autre lieu qu'une maison, par exemple `46,05` et `14,51` (le point marche aussi). Les deux, ou aucune.                          |
| Station météo                      | L'identifiant d'une station de l'ARSO, par exemple `LJUBL-ANA_BEZIGRAD` (Ljubljana). Vide : la plus proche.                        |
| Fréquence de rafraîchissement      | 10, 15, 30 ou 60 minutes. La plupart des stations publient toutes les 10 minutes, certaines toutes les 30.                         |
| Langue des noms de fonctionnalités | Langue des noms de fonctionnalités (fixés à la création des appareils) et des textes des événements de scène. Français par défaut. |

La position de la maison est lue grâce à la permission `location` de Gladys, affichée à
l'installation. Elle **ne quitte jamais Gladys** : l'ARSO publie des fichiers complets (toutes les
stations, toutes les régions, toutes les zones d'avertissement), et l'intégration choisit
elle-même les plus proches. Elle n'est jamais écrite dans les journaux non plus.

Ouvrez ensuite l'onglet **Découverte** de l'intégration et ajoutez les deux appareils à Gladys.

## Appareils

### Station

Le nom est « ARSO » suivi du nom de la station. Valeurs de la dernière observation :

| Fonctionnalité              | Unité | Remarque                                                 |
| --------------------------- | ----- | -------------------------------------------------------- |
| Température                 | °C    | Température de l'air, à 2 m                              |
| Point de rosée              | °C    |                                                          |
| Humidité                    | %     |                                                          |
| Pression (niveau de la mer) | hPa   | Pression ramenée au niveau de la mer, comme en prévision |
| Vitesse du vent             | km/h  | Moyenne de l'intervalle                                  |
| Rafales                     | km/h  | Plus forte rafale de l'intervalle                        |
| Direction du vent           | °     | D'où vient le vent : 0 = nord, 90 = est                  |
| Intensité de pluie          | mm/h  | Pluie de l'intervalle (10 ou 30 min), en taux horaire    |
| Hauteur de neige            | cm    |                                                          |

Une station n'a que les fonctionnalités de ce qu'elle mesure (environ la moitié des stations n'ont
ni vent ni pression) : une fonctionnalité ajoutée une fois est gardée, même si la station cesse de
l'envoyer. Une station muette depuis plus de 3 heures n'est plus republiée comme actuelle.

### Lieu

Le nom est « ARSO » suivi du nom de la maison (ou des coordonnées). Les prévisions de la région de
l'ARSO la plus proche du lieu (15 régions, comme « Ljubljana region » ou « Coastal region »), et les
avertissements de sa zone (5 zones : nord-ouest, sud-ouest, centre, nord-est, sud-est) :

| Fonctionnalité              | Unité | Remarque                                                                               |
| --------------------------- | ----- | -------------------------------------------------------------------------------------- |
| Temps aujourd'hui           | texte | Ciel ou phénomène du jour, par exemple « Partiellement nuageux » ou « Pluie (faible) » |
| Minimale aujourd'hui        | °C    | Jours dans le fuseau horaire de Gladys                                                 |
| Maximale aujourd'hui        | °C    |                                                                                        |
| Temps demain                | texte |                                                                                        |
| Minimale demain             | °C    |                                                                                        |
| Maximale demain             | °C    |                                                                                        |
| Rafales demain              | km/h  | Plus forte rafale prévue demain                                                        |
| Niveau d'avertissement      | 0 à 3 | Plus haut niveau en cours : 0 aucun, 1 jaune, 2 orange, 3 rouge                        |
| Avertissement vent          | 0 à 3 | Niveau en cours pour ce type                                                           |
| Avertissement pluie         | 0 à 3 |                                                                                        |
| Avertissement orage         | 0 à 3 |                                                                                        |
| Avertissement neige         | 0 à 3 |                                                                                        |
| Avertissement verglas       | 0 à 3 | Pluie verglaçante et verglas (« poledica/žled » de l'ARSO)                             |
| Avertissement canicule      | 0 à 3 |                                                                                        |
| Avertissement grand froid   | 0 à 3 |                                                                                        |
| Avertissement feux de forêt | 0 à 3 |                                                                                        |
| Avertissements météo        | texte | Les avertissements en cours ou annoncés, par exemple « Jaune · Vent dim. 21:00 → … »   |

Les niveaux sont ceux **en cours** : un avertissement annoncé les relève à son début. Pour agir dès
l'annonce, utilisez le déclencheur de scène. Les autres types d'avertissement de l'ARSO
(brouillard, avalanches, submersion, inondations) comptent dans « Niveau d'avertissement », dans le
texte et dans le déclencheur.

## Widget

**Météo ARSO** affiche, dans la langue et les unités du tableau de bord :

- le nom du lieu (celui donné dans Gladys), puis la température, l'humidité, le vent et les
  rafales de la station ;
- les minimales et maximales des prochains jours (jusqu'à 6) ;
- les avertissements en cours (jusqu'à quand) et annoncés (à partir de quand), ou une ligne verte
  « Aucun » ;
- le temps d'aujourd'hui et de demain, avec leurs minimale et maximale ;
- la source et l'heure de l'observation.

## Déclencheur de scène

**Nouvel avertissement de l'ARSO** se déclenche quand l'ARSO émet un avertissement (jaune, orange ou
rouge) pour la zone du lieu, ou en relève le niveau : une fois par avertissement et par niveau, dès
l'annonce. Un redémarrage ne le redéclenche pas. Le tout premier démarrage prend seulement note des
avertissements déjà émis.

Filtres (vide = tous) : **Types d'avertissement** (vent, pluie, orage, neige, verglas, canicule,
grand froid, feux de forêt, brouillard, avalanche, submersion, inondation) et **Niveaux** (jaune,
orange, rouge).

Informations transmises aux actions de la scène : type d'avertissement, niveau, niveau (1 à 3),
début, fin, déjà en cours, niveau relevé, texte officiel (en anglais, tel que publié par l'ARSO) et
zone d'avertissement. Par exemple, un message : `ARSO : avertissement
{{triggerEvent.data.type_label}} {{triggerEvent.data.level_label}} de
{{triggerEvent.data.starts_at}} à {{triggerEvent.data.ends_at}}`.

## Actions de configuration

- **Lister les stations proches** : les 8 stations les plus proches du lieu, avec leur
  identifiant, leur altitude et leur distance. Copiez un identifiant dans « Station météo » pour en
  choisir une autre (une station de vallée convient souvent mieux qu'une plus proche sur un sommet).
- **Tester la connexion** : lit toutes les sources maintenant et dit ce qui a répondu : la
  température de la station et son heure, la région des prévisions, le nombre d'avertissements de
  la zone. Affiché en rouge si une source a échoué.

## Exemples de scènes

- **Tempête annoncée** : déclencheur « Nouvel avertissement de l'ARSO », types « Vent » et
  « Orage », niveaux « Orange » et « Rouge » → fermer les volets, rentrer le store, envoyer un
  message avec l'heure de début.
- **Journée de canicule** : quand la fonctionnalité « Avertissement canicule » devient supérieure
  ou égale à 2 → fermer les volets côté sud à 10 h et envoyer un rappel pour boire.
- **Gel demain** : chaque soir à 20 h, si « Minimale demain » est sous 0 °C → prévenir de protéger
  les plantes et le pare-brise.

## Dépannage

- **« Aucun lieu »** : aucune maison n'a de position. Placez votre maison sur la carte dans
  **Paramètres → Maisons**, ou saisissez des coordonnées, ou choisissez une station.
- **« Hors de Slovénie »** : le lieu est à plus de 25 km de toutes les zones d'avertissement de
  l'ARSO.
- **« L'ARSO ne répond pas »** : Gladys ne joint pas `meteo.arso.gov.si` ; les valeurs sont mises à
  jour à son retour. Les journaux disent quelle source échoue, une fois, et quand elle remarche.
- **Une fonctionnalité manque sur la station** : la station ne la mesure pas. Choisissez une
  autre station avec **Lister les stations proches**.
- **Plus de détails** : passez la variable `LOG_LEVEL` du conteneur à `debug`.

## Limites

- **Données** : données ouvertes de l'ARSO, libres de réutilisation avec mention de la source
  (« Source : ARSO », affichée par le widget), comme l'exigent les conditions de l'ARSO.
- **Requêtes** : environ 13 par heure au rythme par défaut (observations et avertissements de la
  zone à chaque rafraîchissement, prévisions une fois par heure, les cinq zones une fois par jour).
  Les fichiers sont téléchargés compressés (environ 30 Ko pour toutes les stations).
- Les prévisions sont celles de la **région**, pas du lieu exact, par jour : les fichiers ouverts
  de l'ARSO n'ont pas de prévision horaire. Le rayonnement solaire et les températures du sol ne
  sont pas publiés en fonctionnalités (pas d'unité correspondante dans Gladys).
- Les avertissements de l'ARSO sont aussi relayés par Meteoalarm (l'intégration `gladys-meteoalarm`
  couvre aussi la Slovénie) : celle-ci les lit à la source, avec leurs polygones, et ajoute les
  mesures de la station et les prévisions régionales.
- Un lieu et une station par installation.
- Les noms de fonctionnalités sont fixés à la création des appareils : changer la langue ensuite ne
  les renomme pas.
- L'ARSO publie ces fichiers pour son site : elle peut les modifier sans préavis.
