# Guide bêta ManyChat → Angellos pour Nounes

Objectif : connecter un flux Instagram DM ManyChat à Angellos en mode supervisé. Au départ, Angellos génère une réponse proposée dans le CRM ; l’opérateur relit et envoie manuellement. Ne pas activer le full auto avant la fin de la période de supervision.

Aucun secret ne doit être collé dans ce document. Thomas fournit les valeurs webhook/secrets séparément si nécessaire.

## 1. Ce qu’il faut préparer

Côté Thomas / Angellos :
- URL du webhook Angellos de production.
- Secret webhook associé au compte bêta Nounes.
- Accès au dashboard Angellos.
- Le client/compte à tester en premier, par exemple Arthur.

Côté Nounes / ManyChat :
- Compte ManyChat connecté à l’Instagram du client.
- Un flow de test déclenché par un DM Instagram entrant.
- Les champs ManyChat disponibles pour l’identifiant abonné, le username Instagram et le texte du message.

## 2. Créer l’action webhook dans ManyChat

Dans le flow ManyChat du client :

1. Ouvrir le flow Instagram DM à connecter.
2. Ajouter une étape `External Request` / `Webhook` juste après la réception du message entrant.
3. Méthode : `POST`.
4. URL : utiliser l’URL webhook Angellos fournie par Thomas.
5. Header :
   - `Content-Type: application/json`
   - `X-Webhook-Secret: <secret fourni par Thomas>`
6. Body JSON recommandé :

```json
{
  "subscriber_id": "{{subscriber.id}}",
  "username": "{{ig_username}}",
  "display_name": "{{first_name}}",
  "message": "{{last_text_input}}"
}
```

Selon les champs exacts disponibles dans ManyChat, adapter seulement les valeurs entre `{{...}}`. Garder les clés JSON `subscriber_id`, `username`, `display_name`, `message`.

## 3. Réponse ManyChat en mode supervisé

Pendant la bêta supervisée :
- Ne pas envoyer automatiquement la réponse Angellos depuis ManyChat.
- Le webhook doit seulement transmettre le message à Angellos.
- La réponse proposée apparaîtra dans le dashboard Angellos dans la conversation, en `message en attente`.
- L’opérateur copie/ajuste/envoie manuellement depuis Instagram ou ManyChat.

Quand Thomas décide de tester l’auto plus tard, il peut configurer une étape ManyChat qui lit la réponse webhook ou un champ custom `agent_response`, mais ce n’est pas l’état de départ.

## 4. À ne pas toucher

Ne pas modifier :
- Les permissions Instagram / Meta existantes.
- Les tokens ManyChat ou Meta hors du setup validé.
- Les automatisations commerciales principales du client sans sauvegarde.
- Les conversations explicitement mises sur Off dans Angellos : Off est un kill-switch humain.
- Les règles d’envoi Instagram/Meta 24h.

## 5. Checklist de vérification

Après configuration :

1. Envoyer un DM test au compte Instagram du client.
2. Vérifier dans ManyChat que l’étape webhook reçoit un statut 200/2xx.
3. Ouvrir le dashboard Angellos > CRM.
4. Vérifier que la conversation apparaît avec le bon nom/identifiant.
5. Vérifier que le mode est `Supervisé`, pas `Auto`.
6. Vérifier qu’un `message en attente` est généré.
7. Copier le message, vérifier qu’il respecte l’offre et le ton du client.
8. Répondre côté Instagram/ManyChat seulement après validation humaine.
9. Mettre volontairement une conversation sur `Off`, puis utiliser l’action bulk auto plus tard : cette conversation doit rester Off.

## 6. Critères de passage en auto

Passer seulement les conversations éligibles en auto après la période supervisée si :
- Les réponses sont cohérentes avec le client testé.
- Les objections/prix/prochaine étape sont bien traités.
- Les relances sont comprises par l’opérateur.
- Les conversations Off restent Off.
- Le plafond coût bêta est configuré et visible.
