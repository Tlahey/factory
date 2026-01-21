# Bugs

- Les types onDragStart et onDragEnd doivent implémenter une interface pour les éléments.
  Actuellement si on souhaite appliquer une règle, ça devient complexe. De plus il faudra en faire un type générique <T> pour que le drag and drop se face seulement sur les types qu'on a défini.

- Les ressources peuvent entrer par la sortie (IO) il faudrait éviter ce cas et bloquer.
  - Les ressources peuvent seulement entrer par l'input autrement le convoyeur se stope
  - Les ressources peuvent sortir par l'output autrement rien ne sort

---

- La popup de dialogue s'ouvre toujours quand on ouvre le menu de construction. Elle ne devrait s'ouvrir qu'une seule fois la première fois qu'on l'ouvre.

---

- La battegy ne garde pas dans la sauvegarde la quantité d'énergie qu'elle a.

# Features

- Il faudrait trouver un moyen de récupérer de la roche au départ du jeu sans forcément avoir d'équipement.
  - On pourrait penser à un scénario scripté de départ où une personne nous parle et nous dit ce qu'il faut faire
  - Il partira chercher un peu de roche pour nous et quand on en aura assez il se fera électrocuter par un éclair et mourra.
  - Pour la suite de la partie ça sera son fantome qui nous parlera mais on aura assez de ressource pour commencer.

---

- Les resources doivent avoir un ratio de production qui influe sur les extracteur. Par exemple les roches ont aléatoirement un extraction en *0.5 ou *1. D'autres ressources par la suite pourront avoir du 1.5 etc ...

---

- Ajouter un système quand on hover un élément et on appuie sur la touche "c" ça vient sélectionner l'élément comme si je l'avait fait depuis le menu de construction.

---

- Ajouter une minimap en haut à droite de l'écran qui montre la carte entière avec la position du joueur et des bâtiments construits.
  - La minimap doit être cliquable pour permettre au joueur de se déplacer rapidement sur la carte.

---

Ajouter le système d'input/ output pour les batiments

- Foreuse à une sortie (output) qui envoie les ressources extraites aux convoyeurs
- Le container a une entrée (input) qui reçoit les ressources des convoyeurs et une sortie (output) qui permet de récupérer les ressources stockées dans le container (la sortie est toujours à l'oposé de l'entrée)
- NB: dans le futur, les batiments pourrant avoir plusieurs entrées (qui seront toutes côté à côte sur le batiment) et toujours une seule sortie (à l'opposé des entrées)
- On matérialisera les entrées par une flèche verte et les sorties par une flèche rouge sur le batiment.
- Tout convoyeur qui n'est pas lié à une entrée ou une sortie d'un batiment ne fonctionnera pas

---

- Au départ le container doit être forcément placé a côté du hub. On ne peut pas le déplacer ailleurs avant d'avoir débloqué une amélioration dans l'arbre de compétence.

---

- On démarre la partie avec le hub placé au milieu de la carte. Il ne doit pas avoir de roche a proximité immédiate du hub pour forcer le joueur à explorer la carte.
  - Il n'est pas possible de supprimer ou déplacer le hub, il doit aussi disparaitre de la liste des buildings constructibles.

---

- Implémenté un fourneau. Le fourneau permet de transformer les minerais bruts en lingots. Par exemple, le minerai de fer peut être transformé en lingot de fer. Le fourneau consomme de l'énergie pour fonctionner, et sa vitesse de production peut être améliorée dans l'arbre de compétences. (augmente la vitesse de transformation des minerais en lingots)
  - Le fourneau doit avoir une entrée et une sortie pour les minerais et les lingots respectivement.
  - Le fourneau doit avoir une interface utilisateur qui affiche les minerais en cours de transformation, le temps restant pour chaque transformation, et la quantité de lingots produits.
  - Il doit aussi avoir une file d'attente pour les minerais à transformer. (qui peut augmenter grace à des améliorations dans l'arbre de compétences)
  - Il doit être possible d'améliorer le fourneau pour augmenter sa capacité de transformation simultanée et réduire le temps de transformation.
  - Le fourneau ne démarre pas tant que l'utilisateur n'a pas sélectionné le type de lingot à produire (par exemple, fer, cuivre, or, etc.). On affiche une liste déroulante qui permet de sélectionner le type de lingot à produire. Pour le visuel, on voit la ressource nécessaire en entrée (modèle 3D) une glèche et la ressource produite en sortie (modèle 3D).

---

- Ajouter un système de merge de convoyeur. On peut avoir plusieurs entrées et une seule sortie. Chaque entrée est configurée pour recevoir tous les types de ressources.

---

- Ajouter un système de split où sur les convoyeurs. On a une entrée et on peut avoir plusieurs sorties. Chaque sortie est configurée pour recevoir un type de ressource spécifique.

---

- Implémenter sur la carte de départ un gisement de minerai de fer et un gisement de charbon. Ces gisements doivent être placés à des endroits stratégiques pour encourager l'exploration et la planification de la base. (il doit en avoir 1 de chaque au départ)
  - Les gisements de fer et de charbon doivent être en illimité pour permettre aux joueurs de collecter autant de ressources qu'ils le souhaitent.
  - Il doit y avoir des obstacles naturels (comme des rochers ou des arbres) autour des gisements pour rendre l'accès plus difficile.
  - Les gisements doivent être visuellement distincts pour que les joueurs puissent facilement les identifier.

---

- On ajoutera une amélioration du Hub pour que les panneaux solaires produisent plus d'énergie.

---

- Ajout d'un building éolienne qui produit de l'énergie en fonction de la vitesse du vent. L'éolienne doit être placée dans des zones spécifiques où le vent est plus fort pour maximiser la production d'énergie.
  - L'éolienne doit avoir une animation qui montre les pales en rotation, avec la vitesse de rotation variant en fonction de la vitesse du vent.
  - L'éolienne doit avoir une interface utilisateur qui affiche la quantité d'énergie produite en temps réel.
  - Il doit être possible d'améliorer l'éolienne dans l'arbre de compétences pour augmenter sa production d'énergie et sa résistance aux conditions météorologiques extrêmes.
- Implémenter un système météorologique dynamique qui affecte la production d'énergie des panneaux
  solaires et des éoliennes. Par exemple, les jours nuageux réduisent la production des panneaux solaires, tandis que les jours venteux augmentent la production des éoliennes.
  - Le système météorologique doit inclure différents types de conditions météorologiques, telles que le soleil, les nuages, la pluie et le vent.
  - Chaque condition météorologique doit avoir un impact spécifique sur la production d'énergie des bâtiments concernés.
  - Le système météorologique doit être visible pour le joueur, avec des effets visuels et sonores appropriés.

---

- Implémenter un building panneau solaire qui produit de l'énergie en fonction de l'ensoleillement. Le panneau solaire doit être placé dans des zones spécifiques où l'ensoleillement est optimal pour maximiser la production d'énergie.
  - Le panneau solaire doit être relié au réseau pour fournir de l'énergie aux autres bâtiments et le surplus doit être stocké dans les batteries.
  - Le panneau solaire doit avoir une animation qui montre les cellules solaires captant la lumière du soleil.
  - Le panneau solaire doit avoir une interface utilisateur qui affiche la quantité d'énergie produite en temps réel.
  - Il doit être possible d'améliorer le panneau solaire dans l'arbre de compétences pour augmenter sa production d'énergie et sa durabilité.

---

- Des monstres peuvent arriver et attaquer la base. Il faut des défenses pour les repousser (des tourelles par exemple).
  - Les monstres apparaissent à des intervalles réguliers la nuit. Dans un premier temps, il y aura 1 seul ennemie qui apparaîtra la nuit. Cette fréquence doit être paramétrable et pourra être augmentée dans l'arbre de compétences pour débloquer de nouveaux buildings.
  - Les tourelles peuvent être placées autour de la base pour défendre contre les attaques de monstres.
  - Les tourelles peuvent être améliorées dans l'arbre de compétences pour augmenter leur puissance de feu, leur portée et leur vitesse de tir.
  - Les monstres détruisent les bâtiments s'ils les atteignent.
    - Chaque batiment a une certaine quantité de points de vie.
    - Lorsqu'un monstre attaque un bâtiment, il lui inflige des dégâts à intervalles réguliers.
    - Si la santé d'un bâtiment atteint zéro, le bâtiment est détruit
  - Si un monstre atteint le hub, il inflige des dégâts à la structure du hub. Si la santé du hub atteint zéro, la partie est terminée.
  - Tant qu'il n'y a pas de tourelle, les monstres ignorent les autres bâtiments et se dirigent directement vers le hub.
  - Le hub contient une tourelle de base qui peut tirer sur les monstres à proximité, mais elle a une puissance de feu limitée et une cadence de tir lente.

---

- Implémenter un convoyer souterrain qui permet de transporter des ressources en passant en dessous d'un autre convoyeur.
  - Il partage la même logique que les convoyeurs (mais ils doivent être améliorer de leur côté pour permettre la construction de convoyeurs souterrains)
  - Pour les placer il faut forcément qu'il soit au niveau d'un autre convoyeur à la surface et ils prennent 3 de largeur (1 pour l'entrée 2 pour le passage 3 pour la sortie)
  - En input il prendra le convoyer et en output un autre convoyeur
  - Le sens du flux sera le même que le convoyer et géré de la même façon

---

- Pour découvrir de nouvelles régions, on va créer un building qui sera une tour de guet qu'on pourra évoluer pour qu'elle puisse découvrir de nouvelles régions.
  - Lors de l'amélioration, un nouveau terrain sera généré à côté du terrain actuel. Et qu'il contiendra de nouvelles ressources

---

- Il faudra cacher des éléments dans la roche qui quand elle sera totalement consommé rélèvera une nouvelle amélioration.
  - exemple, miner va permettre de débloquer un item spécial qui permettra de faire évoluer la foreuse. On prendra des minéraux rare existants pour faire évoluer les éléments. et il faudra vraiment que ça soit rare ! 0.1% de chance.

---

- Créer un système de trade qui pourra être débloqué dans l'arbre de compétences.
  - Il faudra créer un nouveau building qui sera un marché qui permettra de vendre des ressources et d'acheter des ressources.
  - Par défaut on va pouvoir trade les ressources contre des monnaies
  - Les échanges doivent être débloqués dans l'arbre de compétences
  - Par défaut on peut trade la roche pour des pièces par exemple 10 roches = 1 pièce
  - On pourra acheter par la suite avec les pièces des ressources via un marché géré automatiquement (comme age of empires)

---

Certain batiments mettent du temps pour être construit. Par exemple la foreuse met 10 secondes à être construite.

- On mettre un effet sur le modèle ou il se construira du bas vers le haut avec des particules qui viennent du haut
- On affichera le % de construction au dessus du batiment
- Il faudra un système générique qui permettra d'appliquer un temps de création dans le fichier de configuration
- Le temps de construction sera affiché dans l'interface utilisateur
- Le temps de construction pourra être modifié dans l'arbre de compétences. Augmenter par au déblocage d'une compétence (comme pour la puissance de la foreuse) ou litéralement une amélioration pour baisser le temps de construction

---

pour la furnace il faut ajouter certaines spécifications:

- Le déblocage de ressources se fait via le HUB dans l'arbre de compétence.
  Par exemple il faut 100 de Iron ore pour débloquer l'iron lingot etc .. pour les autres aussi (les valeurs de base peuvent différer) Donc on ne doit pas afficher dans la liste déroulante de la forge les éléments qu'on a pas encore débloqué
- Pour craft un Iron ingot et les autres, il faut que le nombre de stack en input diffère. Par exemple il faut 5 de iron ore pour faire 1 iton ingot etc ... de même pour les autres. Cette somme pourra évoluer par la suite pour certaines recettes.

- les ressources doivent arrivé par l'input de la forge sinon rien ne se passe (et le convoyeur bloque)
- quand la limite de stack est atteinte dans la forge, le convoyeur bloque
- Les stacks qui ont été craftés sortirons par l'ouput de la forge
- Quand la ressource est consommée, elle disparait et n'est pas réinjectée dans le convoyeur
- C'est la ressource produite qui est réinjecté dans l'output de la forge
- Si la forge n'a pas de convoyeur connecté en output, elle ne fait rien et stack les éléments jusqu'à 20 puis s'arrête
- Tout comme la foreuse, la forge consomme de l'électricité seulement si elle fonctionne (ressource à crafter à l'intérieur)

- génère aussi un modèle pour les ressources qui manques (ajoute un log dans la console pour les modèles 3D manquants)

---

Créer un builing broyeur qui permet de broyer la roche pour extraire les ressources rares

- On pourra mettre de la roche en input de la forge et dans se cas la, il est possible avec un faible taux de drop (qui peut être évoluer par la suite, on compte du 0.1%, pour nos tests on va pouvoir l'augmenter pour tester) de générer des ressources rare par exemple de l'or mais il faudra 10 items de roche pour avoir une change d'avoir ça.
  Donc aléatoirement pour 10 stack :
  - 0.1% d'avoir de l'or
  - 0.2% d'avoir de l'argent
  - 0.3% d'avoir du bronze
  - 0.4% d'avoir du cuivre
  - 0.5% d'avoir du fer
- Pour la roche il faut 10 secondes pour forger l'intérieur
- les ressources doivent arrivé par l'input du broyerr sinon rien ne se passe (et le convoyeur bloque)

---

Ajouter un système qui permet d'utiliser une image en asset pour la preview d'un modèle
Du coup ça fait Image Asset ou 3d Asset
Les assets seront stockés au même niveau que la config avec une fonction pour charger la preview (image ou model3D)

---

Créer un building Constructeur qui permet de construire d'autre items à partir d'autres éléments.
Il faut qu'il ait la même interface que la forge
En donnée il faut une configuration comme la forge
Le modèle du batiment montrera une presse qui tappe vers le sol (TODO: trouver illustration)

- Pour 1 iron Ingot -> 4secondes = 1 Iron Rod
- Les améliorations pourront être acheté dans le HUB pour accélérer le processus
- Des plans pourront être acheté dans le HUB pour avoir plus de possibilité de craft

---

Au hover des batiments qui craft des éléments comme la fournaise, on affiche la ressource en train d'être crafté au hover avec en background la progression (background transition de la gauche vers la droite)

---

Crée un batiment tour qui quand il est placé va augmenter la vision autour de lui sous forme de zone en cercle. Sur cette zone on y génèra des ressources aléatoirement.

- Pour des raisons d'équilibre on ne mettra pas les plus grosses ressources mais d'autres.
- Plus on s'éloignera du HUB de départ, plus on aura des ressources rare.

---

On va essayer une nouvelle méthode pour le drag and drop des convoyeurs.

- L'objectif n'est plus de faire un drag and drop pour placer un ensemble d'un coup mais sur les placer dès lors qu'on reste appuyé sur la souris.
- Exemple, je positionne la souris sur un point, ça crée le convoyeur, je la glisse dans un sens, il me créer les autre convoyeurs directement à la position de la souris et ça en continue.

---

Ajouter le bois en ressource

- Il faut créer un modèle qui ressemble à un arbre (il faudra le faire à la taille par rapport aux reste)
- Un arbre doit être une ressource commune.
- On définira une notion de rareté par rapport aux ressources pour éviter qu'on ait des ressources trop facilement disponibles.
- Les arbres seront récupérable via une scierie (qui n'est pas encore développé)
- Les arbres seront en groupe entre 1 et 3 arbres. On les placera aléatoirement sur la map.
- Le bois est une ressource qui s'épuise progressivement mais la ressource contiendra beaucoup de bois (paramétrable et aléatoire)
- Au fur et à mesure que le bois est récupéré, le modèle de la ressource sera modifié en réduisant sa taille par le haut (gérer via le % restant)

---

Création de la Centrale à Biomasse qui permet de générer de l'énergie grâce à la biomasse.

- On pourra lui donner du bois pour gérer cette ressource.
- Chaque morceau de bois va prendre 5 secondes à se consommer.
- Pour améliorer la centrale, on pourra acheter des améliorations dans le HUB.
- La centrale génèra du courant qu'on va devoir réinjecter dans le réseau grâce à aux câbles
- La centrale aura aussi un bouton on / off pour activer/desactiver la centrale. Et donc ne plus consommer de bois
- La centrale généra une faible quantité d'énergie par seconde (au allentour de 20 et cette valeur fluctura)
- On reprendra le même affichage que pour le HUB pour voir la quantité d'énergie produit

---

Il faudrait à la fin que l'IHM des batiments puissent hériter des types de l'interface du batiments.

- Automatiquement on saura qu'un batiment qui est de type ressource / chargeur / etc ... doivent avoir cette interface
- Tout sera géré de façon automatique. Sauf pour certains batiments tel que le HUB qui seront des exceptions car plus d'informations à l'intérieur.

---

Voir la faisabilité et le gain de passer sur React Three Fiber

- Le gain que ça peut apporter
- ???

---

En mode preview il faudrait que les flèches d'IO ne changement pas de couleur (grise)

- Elles doivent être de la couleur initial sans faire de changements

---

Il faudrait fixer le nombre de FPS à 60
