# Guide bêta Nounes — connexion ManyChat / Instagram DM

Objectif : connecter un compte Instagram ManyChat à Angellos en mode supervisé, sans activer l’auto par défaut.

## 1. Valeurs à préparer

Thomas fournit à Nounes :

- URL webhook Angellos ManyChat : `https://<backend-production>/webhook`
- Secret webhook Angellos : fourni séparément, jamais dans ce document
- Compte dashboard Angellos : email + mot de passe bêta

Nounes fournit à Thomas :

- Le compte ManyChat relié à l’Instagram client
- Le nom du client/créateur testé en premier
- La disponibilité du client pour tester une conversation Instagram réelle
- Le process de qualification/relance actuel, à charger dans le Training Center

## 2. Ce qu’il ne faut pas toucher

- Ne pas modifier les conversations mises en `Off` / `disabled` / `paused` : ce sont des kill-switchs.
- Ne pas activer le full auto pendant la période de training supervisé.
- Ne pas coller de clés API ou de secrets dans ManyChat, le dashboard ou un document partagé.
- Ne pas changer les réglages Instagram/Meta existants du client si ManyChat reçoit déjà les DMs.

## 3. Configuration ManyChat

1. Ouvrir ManyChat sur le workspace du client.
2. Vérifier que le canal Instagram est connecté et reçoit les DMs.
3. Créer ou ouvrir le flow qui doit déclencher Angellos sur nouveau message Instagram.
4. Ajouter une action externe / webhook HTTP.
5. Méthode : `POST`.
6. URL : URL webhook Angellos fournie par Thomas.
7. Headers :
   - `Content-Type: application/json`
   - `X-Webhook-Secret: <secret fourni par Thomas>`
8. Body JSON conseillé :

```json
{
  "subscriber_id": "{{subscriber.id}}",
  "username": "{{ig_username}}",
  "message": "{{last_text_input}}"
}
```

Si `{{ig_username}}` n’existe pas dans le workspace, utiliser le champ ManyChat disponible qui contient le handle Instagram. Ne pas remplacer par un nom fixe.

## 4. Mode supervisé attendu

Au début de la bêta :

- Les nouvelles conversations tenant doivent arriver en `Supervisé`.
- Angellos génère une réponse en attente dans le CRM.
- L’opérateur copie/envoie ou ajuste manuellement.
- Le bouton bulk auto ne doit basculer que les conversations `Supervisé` vers `Auto`.
- Les conversations `Off` / `disabled` / `paused` restent inchangées.

## 5. Vérification de bout en bout

Checklist avant de dire à Nounes que c’est prêt :

1. Envoyer un DM test au compte Instagram connecté.
2. Vérifier que le webhook ManyChat répond sans erreur.
3. Ouvrir le dashboard Angellos.
4. Vérifier que la conversation apparaît dans le CRM.
5. Vérifier que le mode est `Supervisé`.
6. Vérifier qu’une `pending_message` est générée ou que le bouton de génération supervisée fonctionne.
7. Vérifier le compteur de coût IA dans le CRM : plafond bêta 50 € par défaut.
8. Vérifier l’onglet Relances : les relances automatiques respectent la fenêtre d’envoi configurée, par défaut 08:00–22:00.
9. Tester le bulk auto uniquement après validation Thomas/Nounes : le résumé doit indiquer combien de conversations ont été basculées et combien ont été ignorées car Off/disabled/paused.

## 6. Procédure si problème

- Pas de conversation dans le CRM : vérifier que ManyChat envoie bien `subscriber_id`, `message` et le header `X-Webhook-Secret`.
- Conversation créée mais pas de réponse en attente : vérifier le mode de conversation et le compteur de coût IA.
- Auto ne part pas : vérifier la fenêtre horaire, le plafond IA, et la fenêtre Meta/ManyChat 24 h.
- Une conversation importante ne doit jamais être touchée : la passer en `Off` avant tout bulk auto.
