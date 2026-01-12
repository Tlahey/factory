# Bugs

# Features

- Il faudrait trouver un moyen de récupérer de la roche au départ du jeu sans forcément avoir d'équipement.
  - On pourrait penser à un scénario scripté de départ où une personne nous parle et nous dit ce qu'il faut faire
  - Il partira chercher un peu de roche pour nous et quand on en aura assez il se fera électrocuter par un éclair et mourra.
  - Pour la suite de la partie ça sera son fantome qui nous parlera mais on aura assez de ressource pour commencer.

- les batiments n'ont plus d'onglet d'amélioration, tout passe par le hub

- Les resources doivent avoir un ratio de production qui influe sur les extracteur. Par exemple les roches ont aléatoirement un extraction en *0.5 ou *1. D'autres ressources par la suite pourront avoir du 1.5 etc ...

---

- Ajouter un système quand on hover un élément et on appuie sur la touche "c" ça vient sélectionner l'élément comme si je l'avait fait depuis le menu de construction.

---

- Ajouter une minimap en haut à droite de l'écran qui montre la carte entière avec la position du joueur et des bâtiments construits.
  - La minimap doit être cliquable pour permettre au joueur de se déplacer rapidement sur la carte.

---

Le hub doit avoir un shop

- Le shop permet d'acheter des éléments avec les ressources collectées en jeu. Par exemple, au départ on a une seule foreuse, par la suite, avec les améliorations il sera possible d'en stocker plus, et on pourra en acheter d'autres dans le shop.

- Le but est qu'il est possible de débloquer des buildings sur l'arbre de compétence mais le débloquer ne dit pas qu'on peut le créer.
  Quand on débloque le batiment il devient disponible dans le shop pour l'acheter.
  Chaque achat augmente le prix du même building dans le shop de façon drastique pour éviter d'en acheter trop facilement. Mais ça dépendra des batiments.

Par exemple les extracteurs / containers seront beaucoup plus chère que le reste pour ajouter du challenge.
Où on peut penser à que chaque évolution permet de débloquer l'élément dans le shop.

Pense à rajouter le dialog et le guidance system sur la page pour le shop.

Information importante, le shop se trouve sur le Hub dans un nouvel onglet qui remplace l'arbre d'upgrade au click

---

- Implémenter un building battery qui stocke l'énergie produite par les panneaux solaires et les éoliennes. Cette énergie pourra être utilisée par d'autres bâtiments pour fonctionner plus efficacement.
  - Au click sur la battery, on affiche son taux de charge (en pourcentage) et la quantité d'énergie stockée (en unités d'énergie Kw). Cette batterie pourra être améliorée dans l'arbre de compétences pour augmenter sa capacité de stockage et son taux de charge/décharge.
  - Il faut obligatoirement que la battery soit reliée à au moins un panneau solaire ou une éolienne pour fonctionner.
  - La battery peut avoir un disjoncteur qui permet de couper l'alimentation des bâtiments qui y sont reliés.

---

- Les poteaux électriques ont un nombre limité de connexion qui est de 3. ils pourront être améliorés par la suite pour augmenter ce nombre.

---

Ajouter le système d'input/ output pour les batiments

- Foreuse à une sortie (output) qui envoie les ressources extraites aux convoyeurs
- Le container a une entrée (input) qui reçoit les ressources des convoyeurs et une sortie (output) qui permet de récupérer les ressources stockées dans le container (la sortie est toujours à l'oposé de l'entrée)
- NB: dans le futur, les batiments pourrant avoir plusieurs entrées (qui seront toutes côté à côte sur le batiment) et toujours une seule sortie (à l'opposé des entrées)
- On matérialisera les entrées par une flèche verte et les sorties par une flèche rouge sur le batiment.
- Tout convoyeur qui n'est pas lié à une entrée ou une sortie d'un batiment ne fonctionnera pas

---

- Ajouter dans la configuration de la foreuse une gestion du rate de la foreuse. Par exemple, on pourra améliorer la foreuse pour augmenter sa vitesse de production.

- Au départ le container doit être forcément placé a côté du hub. On ne peut pas le déplacer ailleurs avant d'avoir débloqué une amélioration dans l'arbre de compétence.

- On démarre la partie avec le hub placé au milieu de la carte. Il ne doit pas avoir de roche a proximité immédiate du hub pour forcer le joueur à explorer la carte.
  - Il n'est pas possible de supprimer ou déplacer le hub, il doit aussi disparaitre de la liste des buildings constructibles.

- Implémenté un fourneau. Le fourneau permet de transformer les minerais bruts en lingots. Par exemple, le minerai de fer peut être transformé en lingot de fer. Le fourneau consomme de l'énergie pour fonctionner, et sa vitesse de production peut être améliorée dans l'arbre de compétences. (augmente la vitesse de transformation des minerais en lingots)
  - Le fourneau doit avoir une entrée et une sortie pour les minerais et les lingots respectivement.
  - Le fourneau doit avoir une interface utilisateur qui affiche les minerais en cours de transformation, le temps restant pour chaque transformation, et la quantité de lingots produits.
  - Il doit aussi avoir une file d'attente pour les minerais à transformer. (qui peut augmenter grace à des améliorations dans l'arbre de compétences)
  - Il doit être possible d'améliorer le fourneau pour augmenter sa capacité de transformation simultanée et réduire le temps de transformation.
  - Le fourneau ne démarre pas tant que l'utilisateur n'a pas sélectionné le type de lingot à produire (par exemple, fer, cuivre, or, etc.). On affiche une liste déroulante qui permet de sélectionner le type de lingot à produire. Pour le visuel, on voit la ressource nécessaire en entrée (modèle 3D) une glèche et la ressource produite en sortie (modèle 3D).

- Implémenter sur la carte de départ un gisement de minerai de fer et un gisement de charbon. Ces gisements doivent être placés à des endroits stratégiques pour encourager l'exploration et la planification de la base. (il doit en avoir 1 de chaque au départ)
  - Les gisements de fer et de charbon doivent être en illimité pour permettre aux joueurs de collecter autant de ressources qu'ils le souhaitent.
  - Il doit y avoir des obstacles naturels (comme des rochers ou des arbres) autour des gisements pour rendre l'accès plus difficile.
  - Les gisements doivent être visuellement distincts pour que les joueurs puissent facilement les identifier.

- On ajoutera une amélioration du Hub pour que les panneaux solaires produisent plus d'énergie.

- Ajout d'un building éolienne qui produit de l'énergie en fonction de la vitesse du vent. L'éolienne doit être placée dans des zones spécifiques où le vent est plus fort pour maximiser la production d'énergie.
  - L'éolienne doit avoir une animation qui montre les pales en rotation, avec la vitesse de rotation variant en fonction de la vitesse du vent.
  - L'éolienne doit avoir une interface utilisateur qui affiche la quantité d'énergie produite en temps réel.
  - Il doit être possible d'améliorer l'éolienne dans l'arbre de compétences pour augmenter sa production d'énergie et sa résistance aux conditions météorologiques extrêmes.
- Implémenter un système météorologique dynamique qui affecte la production d'énergie des panneaux
  solaires et des éoliennes. Par exemple, les jours nuageux réduisent la production des panneaux solaires, tandis que les jours venteux augmentent la production des éoliennes.
  - Le système météorologique doit inclure différents types de conditions météorologiques, telles que le soleil, les nuages, la pluie et le vent.
  - Chaque condition météorologique doit avoir un impact spécifique sur la production d'énergie des bâtiments concernés.
  - Le système météorologique doit être visible pour le joueur, avec des effets visuels et sonores appropriés.

- Implémenter un building panneau solaire qui produit de l'énergie en fonction de l'ensoleillement. Le panneau solaire doit être placé dans des zones spécifiques où l'ensoleillement est optimal pour maximiser la production d'énergie.
  - Le panneau solaire doit être relié au réseau pour fournir de l'énergie aux autres bâtiments et le surplus doit être stocké dans les batteries.
  - Le panneau solaire doit avoir une animation qui montre les cellules solaires captant la lumière du soleil.
  - Le panneau solaire doit avoir une interface utilisateur qui affiche la quantité d'énergie produite en temps réel.
  - Il doit être possible d'améliorer le panneau solaire dans l'arbre de compétences pour augmenter sa production d'énergie et sa durabilité.

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

- Implémenter un convoyer souterrain qui permet de transporter des ressources en passant en dessous d'un autre convoyeur.
  - Il partage la même logique que les convoyeurs (mais ils doivent être améliorer de leur côté pour permettre la construction de convoyeurs souterrains)
  - Pour les placer il faut forcément qu'il soit au niveau d'un autre convoyeur à la surface et ils prennent 3 de largeur (1 pour l'entrée 2 pour le passage 3 pour la sortie)
  - En input il prendra le convoyer et en output un autre convoyeur
  - Le sens du flux sera le même que le convoyer et géré de la même façon

- Pour découvrir de nouvelles régions, on va créer un building qui sera une tour de guet qu'on pourra évoluer pour qu'elle puisse découvrir de nouvelles régions.
  - Lors de l'amélioration, un nouveau terrain sera généré à côté du terrain actuel. Et qu'il contiendra de nouvelles ressources

- Il faudra cacher des éléments dans la roche qui quand elle sera totalement consommé rélèvera une nouvelle amélioration.
  - exemple, miner va permettre de débloquer un item spécial qui permettra de faire évoluer la foreuse. On prendra des minéraux rare existants pour faire évoluer les éléments. et il faudra vraiment que ça soit rare ! 0.1% de chance.

---

- Créer un système de trade qui pourra être débloqué dans l'arbre de compétences.
  - Il faudra créer un nouveau building qui sera un marché qui permettra de vendre des ressources et d'acheter des ressources.
  - Par défaut on va pouvoir trade les ressources contre des monnaies
  - Les échanges doivent être débloqués dans l'arbre de compétences
  - Par défaut on peut trade la roche pour des pièces par exemple 10 roches = 1 pièce
  - On pourra acheter par la suite avec les pièces des ressources via un marché géré automatiquement (comme age of empires)
